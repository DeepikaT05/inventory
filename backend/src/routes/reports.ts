import { Router } from 'express';
import { prisma } from '../db.js';
import { addDays, dayKey, startOfDay } from '../time.js';

export const reportsRouter = Router();

// Last 7 days including today: daily totals, profit and per-item sales.
reportsRouter.get('/week', async (_req, res) => {
  const today = startOfDay();
  const since = addDays(today, -6);

  const [bills, perItem, items] = await Promise.all([
    prisma.bill.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, totalPaise: true, costPaise: true },
    }),
    prisma.billLine.groupBy({
      by: ['itemId'],
      where: { bill: { createdAt: { gte: since } } },
      _sum: { grams: true, amountPaise: true },
    }),
    prisma.item.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
  ]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const start = addDays(since, i);
    return { date: dayKey(start), totalPaise: 0 };
  });
  const idx = new Map(days.map((d, i) => [d.date, i]));
  let totalPaise = 0;
  let costPaise = 0;
  for (const b of bills) {
    const i = idx.get(dayKey(b.createdAt));
    if (i !== undefined) days[i].totalPaise += b.totalPaise;
    totalPaise += b.totalPaise;
    costPaise += b.costPaise;
  }

  const sums = new Map(perItem.map((p) => [p.itemId, p._sum]));
  res.json({
    days,
    totalPaise,
    profitPaise: totalPaise - costPaise,
    items: items.map((i) => ({
      id: i.id, nameEn: i.nameEn, nameHi: i.nameHi, color: i.color,
      grams: sums.get(i.id)?.grams ?? 0,
      amountPaise: sums.get(i.id)?.amountPaise ?? 0,
    })),
  });
});
