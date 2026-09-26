import { Router } from 'express';
import { prisma } from '../db.js';
import { startOfDay } from '../time.js';

export const dashboardRouter = Router();

// Everything the Home and Inventory screens need in one call.
dashboardRouter.get('/', async (_req, res) => {
  const today = startOfDay();
  const [shop, items, byMode, soldToday, recentBills] = await Promise.all([
    prisma.shop.findUnique({ where: { id: 1 } }),
    prisma.item.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
    prisma.bill.groupBy({
      by: ['paymentMode'],
      where: { createdAt: { gte: today } },
      _sum: { totalPaise: true },
      _count: true,
    }),
    prisma.billLine.groupBy({
      by: ['itemId'],
      where: { bill: { createdAt: { gte: today } } },
      _sum: { grams: true },
    }),
    prisma.bill.findMany({
      where: { customerId: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { customer: true, lines: { include: { item: true } } },
    }),
  ]);

  // Latest arrival line per item, for "In today · Jaiswal".
  const lastIn = await Promise.all(items.map((i) => prisma.arrivalLine.findFirst({
    where: { itemId: i.id },
    orderBy: { arrival: { receivedAt: 'desc' } },
    select: { arrival: { select: { receivedAt: true, dealer: { select: { name: true } } } } },
  })));

  const sold = new Map(soldToday.map((s) => [s.itemId, s._sum.grams ?? 0]));
  const modeSum = (m: 'CASH' | 'UPI' | 'CREDIT') => byMode.find((b) => b.paymentMode === m)?._sum.totalPaise ?? 0;

  const recentCustomers: typeof recentBills = [];
  for (const b of recentBills) {
    if (recentCustomers.length >= 3) break;
    if (!recentCustomers.some((r) => r.customerId === b.customerId)) recentCustomers.push(b);
  }

  const threshold = shop?.lowStockGrams ?? 0;
  const lowest = [...items].sort((a, b) => a.stockGrams - b.stockGrams)[0];

  res.json({
    today: {
      totalPaise: modeSum('CASH') + modeSum('UPI') + modeSum('CREDIT'),
      cashPaise: modeSum('CASH'),
      upiPaise: modeSum('UPI'),
      creditPaise: modeSum('CREDIT'),
      bills: byMode.reduce((a, b) => a + b._count, 0),
    },
    items: items.map((i, idx) => ({
      ...i,
      soldTodayGrams: sold.get(i.id) ?? 0,
      lastArrival: lastIn[idx]
        ? { at: lastIn[idx]!.arrival.receivedAt, dealer: lastIn[idx]!.arrival.dealer.name }
        : null,
    })),
    lowStock: shop?.lowStockAlert && lowest && lowest.stockGrams < threshold
      ? { itemId: lowest.id, nameEn: lowest.nameEn, stockGrams: lowest.stockGrams }
      : null,
    recentCustomers: recentCustomers.map((b) => ({
      customerId: b.customerId!,
      name: b.customer!.name,
      lines: b.lines.map((l) => ({ itemId: l.itemId, nameEn: l.item.nameEn, grams: l.grams })),
    })),
  });
});
