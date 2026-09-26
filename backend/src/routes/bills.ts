import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { HttpError, notFound } from '../http.js';
import { addDays, parseDay, startOfDay } from '../time.js';

export const billsRouter = Router();

const BillInput = z.object({
  paymentMode: z.enum(['CASH', 'UPI', 'CREDIT']),
  customerId: z.string().min(1).nullish(),
  lines: z.array(z.object({
    itemId: z.string().min(1),
    grams: z.number().int().positive(),
  })).min(1, 'Add at least one item'),
});

const include = { customer: true, lines: { include: { item: true } } } as const;

billsRouter.get('/', async (req, res) => {
  const from = typeof req.query.date === 'string' ? parseDay(req.query.date) : startOfDay();
  res.json(await prisma.bill.findMany({
    where: { createdAt: { gte: from, lt: addDays(from, 1) } },
    orderBy: { createdAt: 'desc' },
    include,
  }));
});

billsRouter.get('/:id', async (req, res) => {
  const bill = await prisma.bill.findUnique({ where: { id: req.params.id }, include });
  if (!bill) throw notFound('Bill');
  res.json(bill);
});

// Save a bill. Prices come from the server's current rates, never from the client.
billsRouter.post('/', async (req, res) => {
  const input = BillInput.parse(req.body);
  if (input.paymentMode === 'CREDIT' && !input.customerId) throw new HttpError(400, 'Pick a khata name');

  const bill = await prisma.$transaction(async (tx) => {
    const shop = await tx.shop.update({ where: { id: 1 }, data: { nextBillNo: { increment: 1 } } })
      .catch(() => { throw new HttpError(400, 'Set up the shop first'); });
    const number = shop.nextBillNo - 1;

    if (input.customerId) {
      const c = await tx.customer.findUnique({ where: { id: input.customerId } });
      if (!c) throw notFound('Customer');
    }

    const items = await tx.item.findMany({ where: { id: { in: input.lines.map((l) => l.itemId) } } });
    const byId = new Map(items.map((i) => [i.id, i]));
    const lines = input.lines.map((l) => {
      const item = byId.get(l.itemId);
      if (!item || !item.active) throw new HttpError(400, `Unknown item ${l.itemId}`);
      return {
        itemId: l.itemId,
        grams: l.grams,
        ratePaise: item.sellRatePaise,
        costRatePaise: item.costRatePaise,
        amountPaise: Math.round((item.sellRatePaise * l.grams) / 1000),
      };
    });

    // Deduct stock; never below zero (loose weight sold can exceed the book count).
    const soldByItem = new Map<string, number>();
    for (const l of lines) soldByItem.set(l.itemId, (soldByItem.get(l.itemId) ?? 0) + l.grams);
    for (const [itemId, grams] of soldByItem) {
      const item = byId.get(itemId)!;
      await tx.item.update({ where: { id: itemId }, data: { stockGrams: Math.max(0, item.stockGrams - grams) } });
    }

    const totalPaise = lines.reduce((a, l) => a + l.amountPaise, 0);
    const created = await tx.bill.create({
      data: {
        number,
        paymentMode: input.paymentMode,
        customerId: input.customerId ?? null,
        totalPaise,
        totalGrams: lines.reduce((a, l) => a + l.grams, 0),
        costPaise: lines.reduce((a, l) => a + Math.round((l.costRatePaise * l.grams) / 1000), 0),
        lines: { create: lines },
      },
    });

    if (input.paymentMode === 'CREDIT' && input.customerId) {
      await tx.khataEntry.create({
        data: { customerId: input.customerId, type: 'SALE', amountPaise: totalPaise, billId: created.id },
      });
      await tx.customer.update({ where: { id: input.customerId }, data: { balancePaise: { increment: totalPaise } } });
    }

    return tx.bill.findUniqueOrThrow({ where: { id: created.id }, include });
  });
  res.status(201).json(bill);
});
