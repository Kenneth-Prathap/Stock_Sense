import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getDashboardMetrics(req: AuthRequest, res: Response) {
  try {
    const { warehouseId, categoryId, status, docType } = req.query;

    // 1. Fetch products with stocks
    const productWhere: any = {};
    if (categoryId && typeof categoryId === 'string' && categoryId !== 'ALL') {
      productWhere.categoryId = categoryId;
    }

    const products = await prisma.product.findMany({
      where: productWhere,
      include: {
        stocks: {
          include: {
            location: true,
          },
        },
        category: true,
      },
    });

    let totalStockUnits = 0;
    let inStockProductsCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const categoryMap: Record<string, { name: string; count: number; totalUnits: number }> = {};

    products.forEach((prod) => {
      let filteredStocks = prod.stocks;
      if (warehouseId && typeof warehouseId === 'string' && warehouseId !== 'ALL') {
        filteredStocks = prod.stocks.filter((s) => s.location.warehouseId === warehouseId);
      }

      const totalStock = filteredStocks.reduce((sum, s) => sum + s.quantity, 0);
      totalStockUnits += totalStock;

      if (totalStock === 0) {
        outOfStockCount++;
      } else {
        inStockProductsCount++;
        if (totalStock <= prod.minStock) {
          lowStockCount++;
        }
      }

      const catName = prod.category.name;
      if (!categoryMap[catName]) {
        categoryMap[catName] = { name: catName, count: 0, totalUnits: 0 };
      }
      categoryMap[catName].count++;
      categoryMap[catName].totalUnits += totalStock;
    });

    // 2. Fetch pending document counts
    const receiptWhere: any = {
      status: { in: ['DRAFT', 'WAITING', 'READY'] },
    };
    if (warehouseId && typeof warehouseId === 'string' && warehouseId !== 'ALL') {
      receiptWhere.warehouseId = warehouseId;
    }
    const pendingReceipts = await prisma.receipt.count({ where: receiptWhere });

    const deliveryWhere: any = {
      status: { in: ['DRAFT', 'WAITING', 'PICKED', 'PACKED'] },
    };
    if (warehouseId && typeof warehouseId === 'string' && warehouseId !== 'ALL') {
      deliveryWhere.warehouseId = warehouseId;
    }
    const pendingDeliveries = await prisma.deliveryOrder.count({ where: deliveryWhere });

    const transferWhere: any = {
      status: { in: ['DRAFT', 'WAITING', 'READY'] },
    };
    if (warehouseId && typeof warehouseId === 'string' && warehouseId !== 'ALL') {
      transferWhere.OR = [
        { sourceWarehouseId: warehouseId },
        { destWarehouseId: warehouseId },
      ];
    }
    const internalTransfersScheduled = await prisma.internalTransfer.count({ where: transferWhere });

    // 3. Document filter queries if user requests filtered documents overview
    let filteredDocuments: any[] = [];
    const docStatusFilter = status && typeof status === 'string' && status !== 'ALL' ? status : undefined;

    if (!docType || docType === 'ALL' || docType === 'RECEIPT') {
      const docs = await prisma.receipt.findMany({
        where: {
          ...(docStatusFilter ? { status: docStatusFilter } : {}),
          ...(warehouseId && warehouseId !== 'ALL' ? { warehouseId: warehouseId as string } : {}),
        },
        include: { warehouse: true, location: true, createdBy: true },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      filteredDocuments.push(...docs.map(d => ({ ...d, type: 'RECEIPT', title: `Receipt ${d.referenceNumber}` })));
    }

    if (!docType || docType === 'ALL' || docType === 'DELIVERY') {
      const docs = await prisma.deliveryOrder.findMany({
        where: {
          ...(docStatusFilter ? { status: docStatusFilter } : {}),
          ...(warehouseId && warehouseId !== 'ALL' ? { warehouseId: warehouseId as string } : {}),
        },
        include: { warehouse: true, location: true, createdBy: true },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      filteredDocuments.push(...docs.map(d => ({ ...d, type: 'DELIVERY', title: `Delivery ${d.referenceNumber}` })));
    }

    if (!docType || docType === 'ALL' || docType === 'TRANSFER') {
      const docs = await prisma.internalTransfer.findMany({
        where: {
          ...(docStatusFilter ? { status: docStatusFilter } : {}),
          ...(warehouseId && warehouseId !== 'ALL' ? {
            OR: [
              { sourceWarehouseId: warehouseId as string },
              { destWarehouseId: warehouseId as string }
            ]
          } : {}),
        },
        include: { sourceWarehouse: true, destWarehouse: true, createdBy: true },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      filteredDocuments.push(...docs.map(d => ({ ...d, type: 'TRANSFER', title: `Transfer ${d.referenceNumber}` })));
    }

    if (!docType || docType === 'ALL' || docType === 'ADJUSTMENT') {
      const docs = await prisma.stockAdjustment.findMany({
        where: {
          ...(warehouseId && warehouseId !== 'ALL' ? { warehouseId: warehouseId as string } : {}),
        },
        include: { warehouse: true, location: true, product: true, createdBy: true },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      filteredDocuments.push(...docs.map(d => ({ ...d, type: 'ADJUSTMENT', status: 'DONE', title: `Adjustment ${d.referenceNumber}` })));
    }

    // Sort combined filtered documents by createdAt desc
    filteredDocuments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 4. Recent activity log (latest 10 ledger moves)
    const recentActivity = await prisma.stockLedger.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    res.json({
      kpis: {
        totalProductsCount: products.length,
        inStockProductsCount,
        totalStockUnits,
        lowStockCount,
        outOfStockCount,
        pendingReceipts,
        pendingDeliveries,
        internalTransfersScheduled,
      },
      categoryDistribution: Object.values(categoryMap),
      recentActivity,
      filteredDocuments: filteredDocuments.slice(0, 15),
    });
  } catch (error: any) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
}
