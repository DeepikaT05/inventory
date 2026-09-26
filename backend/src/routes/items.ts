import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';

export const itemsRouter = Router();

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a #rrggbb colour');

const ItemInput = z.object({
  nameEn: z.string().trim().min(1),
  nameHi: z.string().trim().default(''),
  color: hex.default('#c67139'),
  sellRatePaise: z.number().int().positive(),
  costRatePaise: z.number().int().min(0).default(0),
  stockGrams: z.number().int().min(0).default(0),
  capacityGrams: z.number().int().positive().default(100000),
  packetGrams: z.number().int().positive().default(10000),
  sortOrder: z.number().int().default(0),
});

itemsRouter.get('/', async (req, res) => {
  const includeInactive = req.query.all === '1';
  res.json(await prisma.item.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  }));
});

itemsRouter.post('/', async (req, res) => {
  const data = ItemInput.parse(req.body);
  const item = await prisma.item.create({
    data: { ...data, rateChanges: { create: { sellRatePaise: data.sellRatePaise } } },
  });
  res.status(201).json(item);
});

// Edit item details. Stock is changed only through arrivals, bills or an explicit adjustment.
itemsRouter.patch('/:id', async (req, res) => {
  const data = ItemInput.omit({ stockGrams: true, sellRatePaise: true }).partial()
    .extend({ active: z.boolean().optional() }).parse(req.body);
  res.json(await prisma.item.update({ where: { id: req.params.id }, data }));
});

itemsRouter.put('/:id/rate', async (req, res) => {
  const { sellRatePaise } = z.object({ sellRatePaise: z.number().int().positive() }).parse(req.body);
  const item = await prisma.item.update({
    where: { id: req.params.id },
    data: { sellRatePaise, rateChanges: { create: { sellRatePaise } } },
  });
  res.json(item);
});

// Physical stock count correction.
itemsRouter.put('/:id/stock', async (req, res) => {
  const { stockGrams } = z.object({ stockGrams: z.number().int().min(0) }).parse(req.body);
  res.json(await prisma.item.update({ where: { id: req.params.id }, data: { stockGrams } }));
});

itemsRouter.delete('/:id', async (req, res) => {
  await prisma.item.update({ where: { id: req.params.id }, data: { active: false } });
  res.status(204).end();
});
