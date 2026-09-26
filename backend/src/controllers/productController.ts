import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getProducts(req: AuthRequest, res: Response) {
  try {
    const { search, categoryId, stockStatus, warehouseId } = req.query;

    const where: any = {};

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (categoryId && typeof categoryId === 'string' && categoryId !== 'ALL') {
      where.categoryId = categoryId;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        stocks: {
          include: {
            location: {
              include: {
                warehouse: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute dynamic stock levels and filter by stockStatus if needed
    const formattedProducts = products.map((prod) => {
      let filteredStocks = prod.stocks;
      if (warehouseId && typeof warehouseId === 'string' && warehouseId !== 'ALL') {
        filteredStocks = prod.stocks.filter((s) => s.location.warehouseId === warehouseId);
      }

      const totalStock = filteredStocks.reduce((sum, s) => sum + s.quantity, 0);
      const isOutOfStock = totalStock === 0;
      const isLowStock = totalStock > 0 && totalStock <= prod.minStock;

      return {
        id: prod.id,
        sku: prod.sku,
        name: prod.name,
        description: prod.description,
        categoryId: prod.categoryId,
        category: prod.category,
        uom: prod.uom,
        minStock: prod.minStock,
        maxStock: prod.maxStock,
        reorderQty: prod.reorderQty,
        costPrice: prod.costPrice,
        sellingPrice: prod.sellingPrice,
        totalStock,
        isLowStock,
        isOutOfStock,
        status: isOutOfStock ? 'OUT_OF_STOCK' : isLowStock ? 'LOW_STOCK' : 'IN_STOCK',
        stocks: filteredStocks.map((s) => ({
          id: s.id,
          locationId: s.locationId,
          locationName: s.location.name,
          locationCode: s.location.code,
          warehouseId: s.location.warehouseId,
          warehouseName: s.location.warehouse.name,
          warehouseCode: s.location.warehouse.code,
          rack: s.location.rack,
          aisle: s.location.aisle,
          quantity: s.quantity,
        })),
        createdAt: prod.createdAt,
        updatedAt: prod.updatedAt,
      };
    });

    let results = formattedProducts;
    if (stockStatus === 'low') {
      results = results.filter((p) => p.isLowStock);
    } else if (stockStatus === 'out') {
      results = results.filter((p) => p.isOutOfStock);
    } else if (stockStatus === 'in') {
      results = results.filter((p) => !p.isOutOfStock && !p.isLowStock);
    }

    res.json(results);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products', details: error.message });
  }
}

export async function getProductById(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id as string;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stocks: {
          include: {
            location: {
              include: {
                warehouse: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const totalStock = product.stocks.reduce((sum, s) => sum + s.quantity, 0);

    // Fetch recent ledger logs for this product
    const recentLogs = await prisma.stockLedger.findMany({
      where: { productId: id },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    res.json({
      ...product,
      totalStock,
      isLowStock: totalStock > 0 && totalStock <= product.minStock,
      isOutOfStock: totalStock === 0,
      recentLogs,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
}

export async function createProduct(req: AuthRequest, res: Response) {
  try {
    const {
      name,
      sku,
      description,
      categoryId,
      uom,
      minStock,
      maxStock,
      reorderQty,
      costPrice,
      sellingPrice,
      initialStock,
      initialLocationId,
    } = req.body;

    if (!name || !sku || !categoryId) {
      res.status(400).json({ error: 'Product Name, SKU, and Category are required' });
      return;
    }

    // Check SKU uniqueness
    const existing = await prisma.product.findUnique({ where: { sku: sku.toUpperCase().trim() } });
    if (existing) {
      res.status(409).json({ error: `SKU '${sku}' is already in use` });
      return;
    }

    const createdProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: name.trim(),
          sku: sku.toUpperCase().trim(),
          description: description?.trim() || '',
          categoryId,
          uom: uom || 'Units',
          minStock: Number(minStock) || 10,
          maxStock: Number(maxStock) || 500,
          reorderQty: Number(reorderQty) || 50,
          costPrice: Number(costPrice) || 0,
          sellingPrice: Number(sellingPrice) || 0,
        },
      });

      // If initial stock was provided, assign it to the designated location atomically
      const initQty = Number(initialStock) || 0;
      if (initQty > 0 && initialLocationId) {
        const location = await tx.location.findUnique({
          where: { id: initialLocationId },
          include: { warehouse: true },
        });

        if (location) {
          await tx.stockLocation.create({
            data: {
              productId: product.id,
              locationId: location.id,
              quantity: initQty,
            },
          });

          // Create ledger entry for initial stock allocation
          await tx.stockLedger.create({
            data: {
              productId: product.id,
              sku: product.sku,
              productName: product.name,
              movementType: 'RECEIPT',
              referenceNumber: `INIT-${product.sku}`,
              destWarehouse: location.warehouse.name,
              destLocation: location.name,
              quantity: initQty,
              beforeStock: 0,
              afterStock: initQty,
              userId: req.user?.id || 'system',
              userName: req.user?.name || 'Administrator',
              notes: 'Initial stock on product creation',
            },
          });
        }
      }

      return product;
    });

    res.status(201).json(createdProduct);
  } catch (error: any) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product', details: error.message });
  }
}

export async function updateProduct(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id as string;
    const {
      name,
      description,
      categoryId,
      uom,
      minStock,
      maxStock,
      reorderQty,
      costPrice,
      sellingPrice,
    } = req.body;

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(uom ? { uom } : {}),
        ...(minStock !== undefined ? { minStock: Number(minStock) } : {}),
        ...(maxStock !== undefined ? { maxStock: Number(maxStock) } : {}),
        ...(reorderQty !== undefined ? { reorderQty: Number(reorderQty) } : {}),
        ...(costPrice !== undefined ? { costPrice: Number(costPrice) } : {}),
        ...(sellingPrice !== undefined ? { sellingPrice: Number(sellingPrice) } : {}),
      },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product', details: error.message });
  }
}

export async function deleteProduct(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id as string;

    // Check if product has non-zero stock
    const stocks = await prisma.stockLocation.findMany({ where: { productId: id } });
    const totalStock = stocks.reduce((sum, s) => sum + s.quantity, 0);

    if (totalStock > 0) {
      res.status(400).json({
        error: `Cannot delete product with active stock (${totalStock} units remaining). Adjust stock to 0 first.`,
      });
      return;
    }

    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete product', details: error.message });
  }
}
