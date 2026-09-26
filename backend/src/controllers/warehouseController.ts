import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getWarehouses(req: AuthRequest, res: Response) {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        locations: {
          include: {
            stocks: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formatted = warehouses.map((wh) => {
      let totalItems = 0;
      let totalStockUnits = 0;

      wh.locations.forEach((loc) => {
        loc.stocks.forEach((s) => {
          totalStockUnits += s.quantity;
          if (s.quantity > 0) totalItems++;
        });
      });

      return {
        ...wh,
        totalLocations: wh.locations.length,
        totalItems,
        totalStockUnits,
      };
    });

    res.json(formatted);
  } catch (error: any) {
    console.error('Error fetching warehouses:', error);
    res.status(500).json({ error: 'Failed to fetch warehouses' });
  }
}

export async function createWarehouse(req: AuthRequest, res: Response) {
  try {
    const { name, code, address } = req.body;

    if (!name || !code) {
      res.status(400).json({ error: 'Warehouse name and code are required' });
      return;
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        address: address?.trim() || '',
        // Automatically create a default general receiving location
        locations: {
          create: [
            {
              name: 'General Storage (Bay 01)',
              code: `${code.trim().toUpperCase()}-BAY-01`,
              type: 'INTERNAL',
              aisle: 'Aisle 1',
              rack: 'Rack A',
            },
            {
              name: 'Receiving Dock',
              code: `${code.trim().toUpperCase()}-RCV`,
              type: 'RECEIVING',
              aisle: 'Dock 1',
            },
          ],
        },
      },
      include: { locations: true },
    });

    res.status(201).json(warehouse);
  } catch (error: any) {
    console.error('Create warehouse error:', error);
    res.status(500).json({ error: 'Failed to create warehouse', details: error.message });
  }
}

export async function createLocation(req: AuthRequest, res: Response) {
  try {
    const { warehouseId, name, code, type, rack, aisle } = req.body;

    if (!warehouseId || !name || !code) {
      res.status(400).json({ error: 'Warehouse ID, location name, and location code are required' });
      return;
    }

    const location = await prisma.location.create({
      data: {
        warehouseId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type: type || 'INTERNAL',
        rack: rack?.trim() || null,
        aisle: aisle?.trim() || null,
      },
      include: { warehouse: true },
    });

    res.status(201).json(location);
  } catch (error: any) {
    console.error('Create location error:', error);
    res.status(500).json({ error: 'Failed to create location', details: error.message });
  }
}
