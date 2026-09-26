import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';

export const dealersRouter = Router();

const DealerInput = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().default(''),
});

dealersRouter.get('/', async (_req, res) => {
  res.json(await prisma.dealer.findMany({ orderBy: { name: 'asc' } }));
});

dealersRouter.post('/', async (req, res) => {
  res.status(201).json(await prisma.dealer.create({ data: DealerInput.parse(req.body) }));
});

dealersRouter.patch('/:id', async (req, res) => {
  res.json(await prisma.dealer.update({ where: { id: req.params.id }, data: DealerInput.partial().parse(req.body) }));
});
