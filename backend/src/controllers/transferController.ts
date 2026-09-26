import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getTransfers(req: AuthRequest, res: Response) {
  try {
    const { status, sourceWarehouseId, destWarehouseId, search } = req.query;

    const where: any = {};
    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status;
    }
    if (sourceWarehouseId && typeof sourceWarehouseId === 'string' && sourceWarehouseId !== 'ALL') {
      where.sourceWarehouseId = sourceWarehouseId;
    }
    if (destWarehouseId && typeof destWarehouseId === 'string' && destWarehouseId !== 'ALL') {
      where.destWarehouseId = destWarehouseId;
    }
    if (search && typeof search === 'string') {
      where.referenceNumber = { contains: search };
    }

    const transfers = await prisma.internalTransfer.findMany({
      where,
      include: {
        sourceWarehouse: true,
        sourceLocation: true,
        destWarehouse: true,
        destLocation: true,
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

    res.json(transfers);
  } catch (error: any) {
    console.error('Error fetching internal transfers:', error);
    res.status(500).json({ error: 'Failed to fetch internal transfers' });
  }
}

export async function getTransferById(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id as string;
    const transfer = await prisma.internalTransfer.findUnique({
      where: { id },
      include: {
        sourceWarehouse: true,
        sourceLocation: true,
        destWarehouse: true,
        destLocation: true,
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

    if (!transfer) {
      res.status(404).json({ error: 'Transfer not found' });
      return;
    }

    res.json(transfer);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch transfer details' });
  }
}

export async function createTransfer(req: AuthRequest, res: Response) {
  try {
    const {
      sourceWarehouseId,
      sourceLocationId,
      destWarehouseId,
      destLocationId,
      notes,
      items,
    } = req.body;

    if (!sourceWarehouseId || !sourceLocationId || !destWarehouseId || !destLocationId || !items || !items.length) {
      res.status(400).json({
        error: 'Source warehouse/location, destination warehouse/location, and items are required',
      });
      return;
    }

    if (sourceLocationId === destLocationId) {
      res.status(400).json({ error: 'Source and destination locations cannot be identical' });
      return;
    }

    // Generate unique reference number e.g. INT-2026-0001
    const count = await prisma.internalTransfer.count();
    const referenceNumber = `INT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const transfer = await prisma.internalTransfer.create({
      data: {
        referenceNumber,
        sourceWarehouseId,
        sourceLocationId,
        destWarehouseId,
        destLocationId,
        notes: notes?.trim() || '',
        status: 'DRAFT', // Draft transfers do NOT change stock
        createdById: req.user?.id || 'system',
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: Number(item.quantity) || 1,
          })),
        },
      },
      include: {
        sourceWarehouse: true,
        sourceLocation: true,
        destWarehouse: true,
        destLocation: true,
        items: {
          include: { product: true },
        },
      },
    });

    res.status(201).json(transfer);
  } catch (error: any) {
    console.error('Create transfer error:', error);
    res.status(500).json({ error: 'Failed to create internal transfer', details: error.message });
  }
}

export async function updateTransferStatus(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    const transfer = await prisma.internalTransfer.findUnique({ where: { id } });
    if (!transfer) {
      res.status(404).json({ error: 'Transfer not found' });
      return;
    }

    if (transfer.status === 'DONE') {
      res.status(400).json({ error: 'Validated transfers cannot be modified' });
      return;
    }

    if (status === 'DONE') {
      res.status(400).json({ error: 'Use the validate endpoint to process the transfer' });
      return;
    }

    const updated = await prisma.internalTransfer.update({
      where: { id },
      data: { status },
      include: { items: { include: { product: true } } },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update transfer status' });
  }
}

/**
 * Validates an internal transfer in an atomic transaction:
 * Transfers stock from source location to destination location.
 * Invariant: Source quantity decreases, destination quantity increases; total company stock is unchanged!
 * Logs entry in StockLedger.
 */
export async function validateTransfer(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id as string;

    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.internalTransfer.findUnique({
        where: { id },
        include: {
          sourceWarehouse: true,
          sourceLocation: true,
          destWarehouse: true,
          destLocation: true,
          items: {
            include: { product: true },
          },
        },
      });

      if (!transfer) {
        throw new Error('Internal transfer not found');
      }

      if (transfer.status === 'DONE') {
        throw new Error('This transfer has already been completed.');
      }

      if (transfer.status === 'CANCELED') {
        throw new Error('Canceled transfers cannot be validated.');
      }

      // Check stock at source location for all items
      for (const item of transfer.items) {
        const sourceStock = await tx.stockLocation.findUnique({
          where: {
            productId_locationId: {
              productId: item.productId,
              locationId: transfer.sourceLocationId,
            },
          },
        });

        const available = sourceStock ? sourceStock.quantity : 0;
        if (available < item.quantity) {
          throw new Error(
            `Insufficient stock for '${item.product.name}' at source location (${transfer.sourceLocation.name}). Available: ${available}, Required: ${item.quantity}.`
          );
        }
      }

      // Execute transfer for each item
      for (const item of transfer.items) {
        // Decrement source
        const sourceStock = await tx.stockLocation.findUnique({
          where: {
            productId_locationId: {
              productId: item.productId,
              locationId: transfer.sourceLocationId,
            },
          },
        });

        const sourceBefore = sourceStock!.quantity;
        const sourceAfter = sourceBefore - item.quantity;

        await tx.stockLocation.update({
          where: { id: sourceStock!.id },
          data: { quantity: sourceAfter },
        });

        // Increment destination
        let destStock = await tx.stockLocation.findUnique({
          where: {
            productId_locationId: {
              productId: item.productId,
              locationId: transfer.destLocationId,
            },
          },
        });

        const destBefore = destStock ? destStock.quantity : 0;
        const destAfter = destBefore + item.quantity;

        if (destStock) {
          await tx.stockLocation.update({
            where: { id: destStock.id },
            data: { quantity: destAfter },
          });
        } else {
          await tx.stockLocation.create({
            data: {
              productId: item.productId,
              locationId: transfer.destLocationId,
              quantity: destAfter,
            },
          });
        }

        // Create immutable StockLedger entry
        await tx.stockLedger.create({
          data: {
            productId: item.productId,
            sku: item.product.sku,
            productName: item.product.name,
            movementType: 'TRANSFER',
            referenceNumber: transfer.referenceNumber,
            sourceWarehouse: transfer.sourceWarehouse.name,
            sourceLocation: transfer.sourceLocation.name,
            destWarehouse: transfer.destWarehouse.name,
            destLocation: transfer.destLocation.name,
            quantity: item.quantity,
            beforeStock: sourceBefore,
            afterStock: sourceAfter,
            userId: req.user?.id || 'system',
            userName: req.user?.name || 'Warehouse Operator',
            notes: `Internal transfer from ${transfer.sourceLocation.name} to ${transfer.destLocation.name}`,
          },
        });
      }

      // Mark transfer as DONE
      const updatedTransfer = await tx.internalTransfer.update({
        where: { id },
        data: {
          status: 'DONE',
          validatedAt: new Date(),
        },
        include: {
          sourceWarehouse: true,
          sourceLocation: true,
          destWarehouse: true,
          destLocation: true,
          items: { include: { product: true } },
        },
      });

      return updatedTransfer;
    });

    res.json({
      message: 'Internal transfer completed successfully! Stock relocated.',
      transfer: result,
    });
  } catch (error: any) {
    console.error('Validate transfer error:', error);
    res.status(400).json({ error: error.message || 'Failed to validate transfer' });
  }
}
