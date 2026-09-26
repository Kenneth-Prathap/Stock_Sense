import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getAdjustments(req: AuthRequest, res: Response) {
  try {
    const { warehouseId, productId, reason } = req.query;

    const where: any = {};
    if (warehouseId && typeof warehouseId === 'string' && warehouseId !== 'ALL') {
      where.warehouseId = warehouseId;
    }
    if (productId && typeof productId === 'string') {
      where.productId = productId;
    }
    if (reason && typeof reason === 'string' && reason !== 'ALL') {
      where.reason = reason;
    }

    const adjustments = await prisma.stockAdjustment.findMany({
      where,
      include: {
        warehouse: true,
        location: true,
        product: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(adjustments);
  } catch (error: any) {
    console.error('Error fetching adjustments:', error);
    res.status(500).json({ error: 'Failed to fetch stock adjustments' });
  }
}

/**
 * Creates and immediately executes a physical count adjustment in an atomic transaction:
 * Recorded = 100, Physical = 97 => Adjustment = -3 => Final stock = 97
 * Updates stock location & writes to immutable StockLedger
 */
export async function createAdjustment(req: AuthRequest, res: Response) {
  try {
    const { warehouseId, locationId, productId, physicalQty, reason, notes } = req.body;

    if (!warehouseId || !locationId || !productId || physicalQty === undefined) {
      res.status(400).json({
        error: 'Warehouse, location, product, and physical quantity are required',
      });
      return;
    }

    const targetPhysicalQty = Math.max(0, parseInt(physicalQty, 10));

    // Execute atomic adjustment transaction
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error('Product not found');

      const warehouse = await tx.warehouse.findUnique({ where: { id: warehouseId } });
      if (!warehouse) throw new Error('Warehouse not found');

      const location = await tx.location.findUnique({ where: { id: locationId } });
      if (!location) throw new Error('Location not found');

      let stockLoc = await tx.stockLocation.findUnique({
        where: {
          productId_locationId: {
            productId,
            locationId,
          },
        },
      });

      const recordedQty = stockLoc ? stockLoc.quantity : 0;
      const differenceQty = targetPhysicalQty - recordedQty; // e.g. 97 - 100 = -3

      // Update or create stock location
      if (stockLoc) {
        await tx.stockLocation.update({
          where: { id: stockLoc.id },
          data: { quantity: targetPhysicalQty },
        });
      } else {
        await tx.stockLocation.create({
          data: {
            productId,
            locationId,
            quantity: targetPhysicalQty,
          },
        });
      }

      // Generate reference number e.g. ADJ-2026-0001
      const count = await tx.stockAdjustment.count();
      const referenceNumber = `ADJ-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      // Create StockAdjustment record
      const adjustment = await tx.stockAdjustment.create({
        data: {
          referenceNumber,
          warehouseId,
          locationId,
          productId,
          recordedQty,
          physicalQty: targetPhysicalQty,
          differenceQty,
          reason: reason || 'AUDIT_COUNT',
          notes: notes?.trim() || '',
          createdById: req.user?.id || 'system',
        },
        include: {
          warehouse: true,
          location: true,
          product: true,
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      // Create immutable StockLedger entry
      await tx.stockLedger.create({
        data: {
          productId: product.id,
          sku: product.sku,
          productName: product.name,
          movementType: 'ADJUSTMENT',
          referenceNumber,
          sourceWarehouse: differenceQty < 0 ? warehouse.name : null,
          sourceLocation: differenceQty < 0 ? location.name : null,
          destWarehouse: differenceQty > 0 ? warehouse.name : null,
          destLocation: differenceQty > 0 ? location.name : null,
          quantity: differenceQty,
          beforeStock: recordedQty,
          afterStock: targetPhysicalQty,
          userId: req.user?.id || 'system',
          userName: req.user?.name || 'Audit Officer',
          notes: `Reason: ${reason || 'Physical inventory audit'}${notes ? ' - ' + notes : ''}`,
        },
      });

      return adjustment;
    });

    res.status(201).json({
      message: 'Stock adjustment applied and ledger updated successfully!',
      adjustment: result,
    });
  } catch (error: any) {
    console.error('Create adjustment error:', error);
    res.status(400).json({ error: error.message || 'Failed to apply stock adjustment' });
  }
}
