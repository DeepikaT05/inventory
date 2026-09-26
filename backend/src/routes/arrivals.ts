import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { HttpError, notFound } from '../http.js';
import { addDays, startOfDay } from '../time.js';

export const arrivalsRouter = Router();

const ArrivalInput = z.object({
  dealerId: z.string().min(1),
  slipNo: z.string().trim().default(''),
  note: z.string().trim().default(''),
  receivedAt: z.coerce.date().optional(),
  lines: z.array(z.object({
    itemId: z.string().min(1),
    packets: z.number().int().positive(),
    gramsEach: z.number().int().positive(),
    // Purchase rate per kg from the dealer slip. Falls back to the item's last cost.
    costRatePaise: z.number().int().min(0).optional(),
  })).min(1, 'Add at least one packet'),
});

const include = { dealer: true, lines: { include: { item: true } } } as const;

// Consignments for the last N days (default 7), newest first.
arrivalsRouter.get('/', async (req, res) => {
  const days = Math.min(90, Math.max(1, Number(req.query.days ?? 7)));
  const since = addDays(startOfDay(), -(days - 1));
  res.json(await prisma.arrival.findMany({
    where: { receivedAt: { gte: since } },
    orderBy: { receivedAt: 'desc' },
    include,
  }));
});

arrivalsRouter.post('/', async (req, res) => {
  const input = ArrivalInput.parse(req.body);
  const arrival = await prisma.$transaction(async (tx) => {
    const dealer = await tx.dealer.findUnique({ where: { id: input.dealerId } });
    if (!dealer) throw notFound('Dealer');
    const items = await tx.item.findMany({ where: { id: { in: input.lines.map((l) => l.itemId) } } });
    const byId = new Map(items.map((i) => [i.id, i]));

    const lines = input.lines.map((l) => {
      const item = byId.get(l.itemId);
      if (!item) throw new HttpError(400, `Unknown item ${l.itemId}`);
      const totalGrams = l.packets * l.gramsEach;
      const costRatePaise = l.costRatePaise ?? item.costRatePaise;
      return { ...l, totalGrams, costRatePaise, amountPaise: Math.round((costRatePaise * totalGrams) / 1000) };
    });

    for (const l of lines) {
      await tx.item.update({
        where: { id: l.itemId },
        data: { stockGrams: { increment: l.totalGrams }, costRatePaise: l.costRatePaise },
      });
    }

    return tx.arrival.create({
      data: {
        dealerId: input.dealerId,
        slipNo: input.slipNo,
        note: input.note,
        receivedAt: input.receivedAt,
        costPaise: lines.reduce((a, l) => a + l.amountPaise, 0),
        lines: { create: lines },
      },
      include,
    });
  });
  res.status(201).json(arrival);
});
