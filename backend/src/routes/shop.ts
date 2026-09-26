import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';

export const shopRouter = Router();

const ShopInput = z.object({
  name: z.string().trim().min(1, 'Shop name is required'),
  ownerName: z.string().trim().nullish().transform(v => v || ''),
  address: z.string().trim().nullish().transform(v => v || ''),
  phone: z.string().trim().nullish().transform(v => v || ''),
  gstNote: z.string().trim().nullish().transform(v => v || ''),
  billLanguage: z.enum(['ENGLISH', 'HINDI', 'BOTH']).optional(),
  lowStockGrams: z.number().int().min(0).optional(),
  printerEnabled: z.boolean().optional(),
  printerName: z.string().trim().nullish().transform(v => v || ''),
  whatsappEnabled: z.boolean().optional(),
  lowStockAlert: z.boolean().optional(),
});

// Returns null until the shop has been set up in the app.
shopRouter.get('/', async (_req, res) => {
  res.json(await prisma.shop.findUnique({ where: { id: 1 } }));
});

shopRouter.put('/', async (req, res) => {
  const existing = await prisma.shop.findUnique({ where: { id: 1 } });
  const data = existing ? ShopInput.partial().parse(req.body) : ShopInput.parse(req.body);
  const shop = existing
    ? await prisma.shop.update({ where: { id: 1 }, data })
    : await prisma.shop.create({ data: { id: 1, ...(data as z.infer<typeof ShopInput>) } });
  res.json(shop);
});
