import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getReceipts(req: AuthRequest, res: Response) {
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
        { supplier: { contains: search } },
      ];
    }

    const receipts = await prisma.receipt.findMany({
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

    res.json(receipts);
  } catch (error: any) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
}

export async function getReceiptById(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id as string;
    const receipt = await prisma.receipt.findUnique({
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

    if (!receipt) {
      res.status(404).json({ error: 'Receipt not found' });
      return;
    }

    res.json(receipt);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch receipt details' });
  }
}

export async function createReceipt(req: AuthRequest, res: Response) {
  try {
    const { supplier, warehouseId, locationId, notes, items } = req.body;

    if (!supplier || !warehouseId || !locationId || !items || !items.length) {
      res.status(400).json({ error: 'Supplier, warehouse, location, and at least one item are required' });
      return;
    }

    // Generate unique reference number e.g. REC-2026-0001
    const count = await prisma.receipt.count();
    const referenceNumber = `REC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const receipt = await prisma.receipt.create({
      data: {
        referenceNumber,
        supplier: supplier.trim(),
        warehouseId,
        locationId,
        notes: notes?.trim() || '',
        status: 'DRAFT', // Draft receipts MUST NOT change stock
        createdById: req.user?.id || 'system',
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            expectedQty: Number(item.expectedQty) || 1,
            receivedQty: Number(item.receivedQty || item.expectedQty) || 1,
            unitCost: Number(item.unitCost) || 0,
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

    res.status(201).json(receipt);
  } catch (error: any) {
    console.error('Create receipt error:', error);
    res.status(500).json({ error: 'Failed to create receipt', details: error.message });
  }
}

export async function updateReceiptStatus(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    const receipt = await prisma.receipt.findUnique({ where: { id } });
    if (!receipt) {
      res.status(404).json({ error: 'Receipt not found' });
      return;
    }

    if (receipt.status === 'DONE') {
      res.status(400).json({ error: 'Validated receipts cannot be modified' });
      return;
    }

    // If status is DONE, direct them to use validateReceipt
    if (status === 'DONE') {
      res.status(400).json({ error: 'Use the validate endpoint to complete a receipt and update stock' });
      return;
    }

    const updated = await prisma.receipt.update({
      where: { id },
      data: { status },
      include: { items: { include: { product: true } } },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update receipt status' });
  }
}

/**
 * Validates a receipt in an atomic transaction:
 * Stock increases in destination location: beforeStock + receivedQty = afterStock
 * Creates immutable StockLedger record for each product
 */
export async function validateReceipt(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id as string;

    const result = await prisma.$transaction(async (tx) => {
      const receipt = await tx.receipt.findUnique({
        where: { id },
        include: {
          warehouse: true,
          location: true,
          items: {
            include: { product: true },
          },
        },
      });

      if (!receipt) {
        throw new Error('Receipt not found');
      }

      if (receipt.status === 'DONE') {
        throw new Error('This receipt has already been validated and processed into stock.');
      }

      if (receipt.status === 'CANCELED') {
        throw new Error('Canceled receipts cannot be validated.');
      }

      // Process each item
      for (const item of receipt.items) {
        const qtyToReceive = item.receivedQty > 0 ? item.receivedQty : item.expectedQty;

        // Query or create stock location
        let stockLoc = await tx.stockLocation.findUnique({
          where: {
            productId_locationId: {
              productId: item.productId,
              locationId: receipt.locationId,
            },
          },
        });

        const beforeStock = stockLoc ? stockLoc.quantity : 0;
        const afterStock = beforeStock + qtyToReceive;

        if (stockLoc) {
          await tx.stockLocation.update({
            where: { id: stockLoc.id },
            data: { quantity: afterStock },
          });
        } else {
          await tx.stockLocation.create({
            data: {
              productId: item.productId,
              locationId: receipt.locationId,
              quantity: afterStock,
            },
          });
        }

        // Create immutable StockLedger entry
        await tx.stockLedger.create({
          data: {
            productId: item.productId,
            sku: item.product.sku,
            productName: item.product.name,
            movementType: 'RECEIPT',
            referenceNumber: receipt.referenceNumber,
            destWarehouse: receipt.warehouse.name,
            destLocation: receipt.location.name,
            quantity: qtyToReceive,
            beforeStock,
            afterStock,
            userId: req.user?.id || 'system',
            userName: req.user?.name || 'Inventory Officer',
            notes: `Received from supplier ${receipt.supplier}`,
          },
        });
      }

      // Mark receipt as DONE
      const updatedReceipt = await tx.receipt.update({
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

      return updatedReceipt;
    });

    res.json({
      message: 'Receipt successfully validated! Inventory has been updated and logged.',
      receipt: result,
    });
  } catch (error: any) {
    console.error('Validate receipt error:', error);
    res.status(400).json({ error: error.message || 'Failed to validate receipt' });
  }
}
