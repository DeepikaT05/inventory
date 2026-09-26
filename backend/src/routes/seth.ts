import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { HttpError, notFound } from '../http.js';

export const sethRouter = Router();

const SethItemInput = z.object({
  itemId: z.string().optional().nullable(),
  itemName: z.string().min(1, 'Item name is required'),
  itemColor: z.string().default('#c67139'),
  boraCount: z.number().int().min(0).default(0),
  totalGrams: z.number().int().min(0),
  ratePaise: z.number().int().min(0),
  weightsJson: z.string().default('[]'),
});

const CreateConsignmentInput = z.object({
  sethName: z.string().trim().min(1, 'Seth / Vyapari name is required'),
  sethPhone: z.string().trim().default(''),
  challanNo: z.string().trim().default(''),
  note: z.string().trim().default(''),
  advancePercent: z.number().min(0).max(100).default(0),
  advancePaise: z.number().int().min(0).default(0),
  deductionsPaise: z.number().int().min(0).default(0),
  receivedAt: z.coerce.date().optional(),
  addToStock: z.boolean().default(true),
  items: z.array(SethItemInput).min(1, 'Add at least one item'),
});

// GET /api/seth - list all consignments with summary statistics
sethRouter.get('/', async (req, res) => {
  const sethFilter = typeof req.query.seth === 'string' ? req.query.seth.trim() : '';
  const statusFilter = typeof req.query.status === 'string' ? req.query.status.trim() : '';

  const where: any = {};
  if (sethFilter) {
    where.sethName = { contains: sethFilter, mode: 'insensitive' };
  }
  if (statusFilter && statusFilter !== 'ALL') {
    where.status = statusFilter;
  }

  const consignments = await prisma.sethConsignment.findMany({
    where,
    orderBy: { receivedAt: 'desc' },
    include: {
      items: true,
    },
  });

  // Calculate aggregated stats
  const allConsignments = await prisma.sethConsignment.findMany({
    select: {
      sethName: true,
      grossAmountPaise: true,
      advancePaise: true,
      deductionsPaise: true,
      netPayablePaise: true,
      paidPaise: true,
      status: true,
    },
  });

  const uniqueSeths = new Set(allConsignments.map((c) => c.sethName.toLowerCase()));
  const totalGross = allConsignments.reduce((acc, c) => acc + c.grossAmountPaise, 0);
  const totalAdvance = allConsignments.reduce((acc, c) => acc + c.advancePaise, 0);
  const totalNetPayable = allConsignments.reduce((acc, c) => acc + c.netPayablePaise, 0);
  const totalPaid = allConsignments.reduce((acc, c) => acc + c.paidPaise, 0);
  const pendingLots = allConsignments.filter((c) => c.status !== 'SETTLED').length;

  res.json({
    consignments,
    summary: {
      sethCount: uniqueSeths.size,
      totalGrossPaise: totalGross,
      totalAdvancePaise: totalAdvance,
      totalNetPayablePaise: totalNetPayable,
      totalPaidPaise: totalPaid,
      balanceDuePaise: Math.max(0, totalNetPayable - totalPaid),
      pendingLots,
    },
  });
});

// GET /api/seth/list-names - get unique seth names for quick autocomplete
sethRouter.get('/list-names', async (_req, res) => {
  const consignments = await prisma.sethConsignment.findMany({
    select: { sethName: true, sethPhone: true },
    distinct: ['sethName'],
    orderBy: { sethName: 'asc' },
  });
  res.json(consignments);
});

// GET /api/seth/:id - get specific consignment details
sethRouter.get('/:id', async (req, res) => {
  const consignment = await prisma.sethConsignment.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  });
  if (!consignment) throw notFound('Seth Consignment');
  res.json(consignment);
});

// POST /api/seth - create a new bulk consignment with variable bora weights
sethRouter.post('/', async (req, res) => {
  const input = CreateConsignmentInput.parse(req.body);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Calculate items amounts
    let grossAmountPaise = 0;
    const itemsToCreate = input.items.map((it) => {
      // Amount = (rate per kg in paise * weight in grams) / 1000
      const totalAmountPaise = Math.round((it.ratePaise * it.totalGrams) / 1000);
      grossAmountPaise += totalAmountPaise;

      return {
        itemId: it.itemId || null,
        itemName: it.itemName.trim(),
        itemColor: it.itemColor || '#c67139',
        boraCount: it.boraCount,
        totalGrams: it.totalGrams,
        ratePaise: it.ratePaise,
        totalAmountPaise,
        weightsJson: it.weightsJson || '[]',
      };
    });

    // 2. Calculate advance if given as % or fixed
    let advancePaise = input.advancePaise;
    if (input.advancePercent > 0 && (!advancePaise || advancePaise === 0)) {
      advancePaise = Math.round((grossAmountPaise * input.advancePercent) / 100);
    }
    const netPayablePaise = Math.max(0, grossAmountPaise - advancePaise - input.deductionsPaise);

    // 3. Create consignment in DB
    const consignment = await tx.sethConsignment.create({
      data: {
        sethName: input.sethName,
        sethPhone: input.sethPhone,
        challanNo: input.challanNo,
        note: input.note,
        advancePercent: input.advancePercent,
        advancePaise,
        deductionsPaise: input.deductionsPaise,
        grossAmountPaise,
        netPayablePaise,
        paidPaise: 0,
        status: 'IN_STOCK',
        receivedAt: input.receivedAt || new Date(),
        items: {
          create: itemsToCreate,
        },
      },
      include: { items: true },
    });

    // 4. Update stock if requested
    if (input.addToStock) {
      for (const it of input.items) {
        if (it.itemId) {
          await tx.item.update({
            where: { id: it.itemId },
            data: {
              stockGrams: { increment: it.totalGrams },
              costRatePaise: it.ratePaise,
            },
          });
        } else {
          // If no itemId provided, search by name or create new Item so it shows in stock
          const existing = await tx.item.findFirst({
            where: {
              nameEn: { equals: it.itemName.toLowerCase(), mode: 'insensitive' },
            },
          });
          if (existing) {
            await tx.item.update({
              where: { id: existing.id },
              data: {
                stockGrams: { increment: it.totalGrams },
                costRatePaise: it.ratePaise,
              },
            });
          } else {
            await tx.item.create({
              data: {
                nameEn: it.itemName,
                color: it.itemColor || '#c67139',
                sellRatePaise: Math.round(it.ratePaise * 1.25), // reasonable default margin
                costRatePaise: it.ratePaise,
                stockGrams: it.totalGrams,
                capacityGrams: Math.max(100000, it.totalGrams * 2),
                packetGrams: it.boraCount > 0 ? Math.round(it.totalGrams / it.boraCount) : 10000,
              },
            });
          }
        }
      }
    }

    return consignment;
  });

  res.status(201).json(result);
});

// PATCH /api/seth/:id/status - mark as SOLD or SETTLED with payment details
sethRouter.patch('/:id/status', async (req, res) => {
  const StatusSchema = z.object({
    status: z.enum(['IN_STOCK', 'STOCK_SOLD', 'SETTLED']),
    paidPaise: z.number().int().min(0).optional(),
    paymentMode: z.string().optional(),
    paymentRef: z.string().optional(),
  });

  const input = StatusSchema.parse(req.body);
  const current = await prisma.sethConsignment.findUnique({ where: { id: req.params.id } });
  if (!current) throw notFound('Seth Consignment');

  const updateData: any = {
    status: input.status,
  };

  if (input.status === 'SETTLED') {
    updateData.paidPaise = input.paidPaise ?? current.netPayablePaise;
    updateData.settledAt = new Date();
    if (input.paymentMode) updateData.paymentMode = input.paymentMode;
    if (input.paymentRef) updateData.paymentRef = input.paymentRef;
  } else if (input.paidPaise !== undefined) {
    updateData.paidPaise = input.paidPaise;
  }

  const updated = await prisma.sethConsignment.update({
    where: { id: req.params.id },
    data: updateData,
    include: { items: true },
  });

  res.json(updated);
});

// DELETE /api/seth/:id - delete consignment
sethRouter.delete('/:id', async (req, res) => {
  await prisma.sethConsignment.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
