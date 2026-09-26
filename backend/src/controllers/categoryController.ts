import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getCategories(req: AuthRequest, res: Response) {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(categories);
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
}

export async function createCategory(req: AuthRequest, res: Response) {
  try {
    const { name, description } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Category name is required' });
      return;
    }

    const existing = await prisma.category.findUnique({ where: { name: name.trim() } });
    if (existing) {
      res.status(409).json({ error: 'Category with this name already exists' });
      return;
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim() || '',
      },
    });

    res.status(201).json(category);
  } catch (error: any) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category', details: error.message });
  }
}
