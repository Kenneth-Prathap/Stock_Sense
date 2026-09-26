import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getDeliveries(req: AuthRequest, res: Response) {
  try {
    const { status, warehouseId, search } = req.query;

    const where: any = {};
    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status;
    }
    if (warehouseId && typeof warehouseId === 'string' && warehouseId !== 'ALL') {
      where.warehouseId = warehouseId;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { referenceNumber: { contains: search } },
        { customer: { contains: search } },
      ];
    }

    const deliveries = await prisma.deliveryOrder.findMany({
      where,
      include: {
        warehouse: true,
        location: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(deliveries);
  } catch (error: any) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch delivery orders' });
  }
}

export async function getDeliveryById(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id as string;
    const delivery = await prisma.deliveryOrder.findUnique({
      where: { id },
      include: {
        warehouse: true,
        location: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!delivery) {
      res.status(404).json({ error: 'Delivery order not found' });
      return;
    }

    res.json(delivery);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch delivery order details' });
  }
}

export async function createDelivery(req: AuthRequest, res: Response) {
  try {
    const { customer, warehouseId, locationId, notes, items } = req.body;

    if (!customer || !warehouseId || !locationId || !items || !items.length) {
      res.status(400).json({ error: 'Customer, warehouse, location, and at least one item are required' });
      return;
    }

    // Generate unique reference number e.g. DEL-2026-0001
    const count = await prisma.deliveryOrder.count();
    const referenceNumber = `DEL-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const delivery = await prisma.deliveryOrder.create({
      data: {
        referenceNumber,
        customer: customer.trim(),
        warehouseId,
        locationId,
        notes: notes?.trim() || '',
        status: 'DRAFT', // Draft delivery orders do NOT change stock
        createdById: req.user?.id || 'system',
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            requestedQty: Number(item.requestedQty) || 1,
            deliveredQty: Number(item.deliveredQty || item.requestedQty) || 1,
            unitPrice: Number(item.unitPrice) || 0,
          })),
        },
      },
      include: {
        warehouse: true,
        location: true,
        items: {
          include: { product: true },
        },
      },
    });

    res.status(201).json(delivery);
  } catch (error: any) {
    console.error('Create delivery error:', error);
    res.status(500).json({ error: 'Failed to create delivery order', details: error.message });
  }
}

/**
 * Progress status: DRAFT -> WAITING -> PICKED -> PACKED
 */
export async function updateDeliveryStatus(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    const delivery = await prisma.deliveryOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!delivery) {
      res.status(404).json({ error: 'Delivery order not found' });
      return;
    }

    if (delivery.status === 'DONE') {
      res.status(400).json({ error: 'Validated deliveries cannot be modified' });
      return;
    }

    if (status === 'DONE') {
      res.status(400).json({ error: 'Use the validate endpoint to dispatch items and update stock' });
      return;
    }

    const updated = await prisma.deliveryOrder.update({
      where: { id },
      data: { status },
      include: { items: { include: { product: true } } },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update delivery status' });
  }
}

/**
 * Validates a delivery order in an atomic transaction:
 * Strict check: Never allow delivery beyond available stock!
 * Stock decreases in source location: beforeStock - deliveredQty = afterStock
 * Creates immutable StockLedger record for each product
 */
export async function validateDelivery(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id as string;

    const result = await prisma.$transaction(async (tx) => {
      const delivery = await tx.deliveryOrder.findUnique({
        where: { id },
        include: {
          warehouse: true,
          location: true,
          items: {
            include: { product: true },
          },
        },
      });

      if (!delivery) {
        throw new Error('Delivery order not found');
      }

      if (delivery.status === 'DONE') {
        throw new Error('This delivery order has already been validated and dispatched.');
      }

      if (delivery.status === 'CANCELED') {
        throw new Error('Canceled delivery orders cannot be validated.');
      }

      // Check stock availability for ALL items before deducting anything
      for (const item of delivery.items) {
        const qtyToDeliver = item.deliveredQty > 0 ? item.deliveredQty : item.requestedQty;

        const stockLoc = await tx.stockLocation.findUnique({
          where: {
            productId_locationId: {
              productId: item.productId,
              locationId: delivery.locationId,
            },
          },
        });

        const availableQty = stockLoc ? stockLoc.quantity : 0;

        if (availableQty < qtyToDeliver) {
          throw new Error(
            `Insufficient stock for '${item.product.name}' (SKU: ${item.product.sku}) at ${delivery.location.name}. Available: ${availableQty}, Requested: ${qtyToDeliver}. Delivery beyond available stock is prohibited.`
          );
        }
      }

      // Deduct stock and record ledger
      for (const item of delivery.items) {
        const qtyToDeliver = item.deliveredQty > 0 ? item.deliveredQty : item.requestedQty;

        const stockLoc = await tx.stockLocation.findUnique({
          where: {
            productId_locationId: {
              productId: item.productId,
              locationId: delivery.locationId,
            },
          },
        });

        const beforeStock = stockLoc!.quantity;
        const afterStock = beforeStock - qtyToDeliver;

        await tx.stockLocation.update({
          where: { id: stockLoc!.id },
          data: { quantity: afterStock },
        });

        // Create immutable StockLedger entry
        await tx.stockLedger.create({
          data: {
            productId: item.productId,
            sku: item.product.sku,
            productName: item.product.name,
            movementType: 'DELIVERY',
            referenceNumber: delivery.referenceNumber,
            sourceWarehouse: delivery.warehouse.name,
            sourceLocation: delivery.location.name,
            quantity: qtyToDeliver,
            beforeStock,
            afterStock,
            userId: req.user?.id || 'system',
            userName: req.user?.name || 'Dispatch Officer',
            notes: `Dispatched to customer ${delivery.customer}`,
          },
        });
      }

      // Mark delivery order as DONE
      const updatedDelivery = await tx.deliveryOrder.update({
        where: { id },
        data: {
          status: 'DONE',
          validatedAt: new Date(),
        },
        include: {
          warehouse: true,
          location: true,
          items: { include: { product: true } },
        },
      });

      return updatedDelivery;
    });

    res.json({
      message: 'Delivery order successfully validated and dispatched! Inventory updated.',
      delivery: result,
    });
  } catch (error: any) {
    console.error('Validate delivery error:', error);
    res.status(400).json({ error: error.message || 'Failed to validate delivery order' });
  }
}
