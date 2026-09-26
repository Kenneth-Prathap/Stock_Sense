import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getLedger(req: AuthRequest, res: Response) {
  try {
    const {
      search,
      movementType,
      productId,
      startDate,
      endDate,
      limit = '100',
      page = '1',
    } = req.query;

    const where: any = {};

    if (search && typeof search === 'string') {
      where.OR = [
        { sku: { contains: search } },
        { productName: { contains: search } },
        { referenceNumber: { contains: search } },
        { userName: { contains: search } },
      ];
    }

    if (movementType && typeof movementType === 'string' && movementType !== 'ALL') {
      where.movementType = movementType;
    }

    if (productId && typeof productId === 'string' && productId !== 'ALL') {
      where.productId = productId;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate && typeof startDate === 'string') {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate && typeof endDate === 'string') {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.timestamp.lte = end;
      }
    }

    const take = parseInt(limit as string, 10) || 100;
    const skip = (Math.max(1, parseInt(page as string, 10)) - 1) * take;

    const [total, records] = await Promise.all([
      prisma.stockLedger.count({ where }),
      prisma.stockLedger.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              uom: true,
              category: { select: { name: true } },
            },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { timestamp: 'desc' },
        take,
        skip,
      }),
    ]);

    res.json({
      total,
      page: parseInt(page as string, 10) || 1,
      totalPages: Math.ceil(total / take),
      records,
    });
  } catch (error: any) {
    console.error('Error fetching stock ledger:', error);
    res.status(500).json({ error: 'Failed to fetch stock ledger' });
  }
}
