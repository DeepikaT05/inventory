import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { HttpError, notFound } from '../http.js';

export const customersRouter = Router();

const CustomerInput = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().default(''),
});

// Khata list: balance, bill count and last bill date per customer.
customersRouter.get('/', async (_req, res) => {
  const customers = await prisma.customer.findMany({
    orderBy: [{ balancePaise: 'desc' }, { name: 'asc' }],
    include: {
      _count: { select: { bills: true } },
      bills: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
    },
  });
  res.json(customers.map(({ _count, bills, ...c }) => ({
    ...c, billCount: _count.bills, lastBillAt: bills[0]?.createdAt ?? null,
  })));
});

customersRouter.post('/', async (req, res) => {
  res.status(201).json(await prisma.customer.create({ data: CustomerInput.parse(req.body) }));
});

customersRouter.patch('/:id', async (req, res) => {
  res.json(await prisma.customer.update({ where: { id: req.params.id }, data: CustomerInput.partial().parse(req.body) }));
});

customersRouter.get('/:id/entries', async (req, res) => {
  res.json(await prisma.khataEntry.findMany({
    where: { customerId: req.params.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  }));
});

// Lines of the customer's most recent bill, priced at today's rates — for "Repeat".
customersRouter.get('/:id/last-order', async (req, res) => {
  const bill = await prisma.bill.findFirst({
    where: { customerId: req.params.id },
    orderBy: { createdAt: 'desc' },
    include: { lines: { include: { item: true } } },
  });
  if (!bill) throw notFound('Previous order');
  res.json(bill.lines.filter((l) => l.item.active).map((l) => ({ itemId: l.itemId, grams: l.grams })));
});

// Record a payment. Without an amount, the full balance is settled ("Mark paid").
customersRouter.post('/:id/payments', async (req, res) => {
  const { amountPaise, note } = z.object({
    amountPaise: z.number().int().positive().optional(),
    note: z.string().trim().default(''),
  }).parse(req.body ?? {});

  const customer = await prisma.$transaction(async (tx) => {
    const c = await tx.customer.findUnique({ where: { id: req.params.id } });
    if (!c) throw notFound('Customer');
    const amount = amountPaise ?? c.balancePaise;
    if (amount <= 0) throw new HttpError(400, 'Nothing is due');
    await tx.khataEntry.create({ data: { customerId: c.id, type: 'PAYMENT', amountPaise: amount, note } });
    return tx.customer.update({ where: { id: c.id }, data: { balancePaise: { decrement: amount } } });
  });
  res.json(customer);
});
