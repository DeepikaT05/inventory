import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { HttpError, notFound } from '../http.js';
import { requireAdminToken, signAdminToken } from '../middleware/adminAuth.js';

export const adminRouter = Router();

// --- Admin Login -------------------------------------------------------------

adminRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }).parse(req.body);

    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (!admin) throw new HttpError(401, 'Invalid email or password');

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) throw new HttpError(401, 'Invalid email or password');

    const token = signAdminToken({ sub: admin.id, email: admin.email });
    res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email } });
  } catch (err) { next(err); }
});

// --- Admin Profile ------------------------------------------------------------

adminRouter.get('/me', requireAdminToken, async (req, res, next) => {
  try {
    const { sub } = (req as any).admin;
    const admin = await prisma.adminUser.findUnique({ where: { id: sub }, select: { id: true, name: true, email: true, createdAt: true } });
    if (!admin) throw notFound('Admin');
    res.json(admin);
  } catch (err) { next(err); }
});

// --- Stores -------------------------------------------------------------------

const StoreInput = z.object({
  name: z.string().trim().min(1, 'Store name is required'),
  ownerName: z.string().trim().nullish().transform(v => v || ''),
  address: z.string().trim().nullish().transform(v => v || ''),
  city: z.string().trim().nullish().transform(v => v || ''),
  phone: z.string().trim().nullish().transform(v => v || ''),
  gstNote: z.string().trim().nullish().transform(v => v || ''),
  billLanguage: z.enum(['ENGLISH', 'HINDI', 'BOTH']).optional(),
  lowStockGrams: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

adminRouter.get('/stores', requireAdminToken, async (_req, res, next) => {
  try {
    const stores = await prisma.store.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, items: true, bills: true } },
      },
    });
    res.json(stores);
  } catch (err) { next(err); }
});

adminRouter.post('/stores', requireAdminToken, async (req, res, next) => {
  try {
    const data = StoreInput.parse(req.body);
    const store = await prisma.store.create({ data });
    res.status(201).json(store);
  } catch (err) { next(err); }
});

adminRouter.patch('/stores/:id', requireAdminToken, async (req, res, next) => {
  try {
    const data = StoreInput.partial().parse(req.body);
    const store = await prisma.store.update({ where: { id: req.params.id as string }, data });
    res.json(store);
  } catch (err) { next(err); }
});

adminRouter.delete('/stores/:id', requireAdminToken, async (req, res, next) => {
  try {
    await prisma.store.delete({ where: { id: req.params.id as string } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// --- Store Users --------------------------------------------------------------

const UserInput = z.object({
  name: z.string().trim().min(1),
  email: z.string().email().trim(),
  password: z.string().min(6),
  role: z.enum(['OWNER', 'STAFF']).optional(),
  active: z.boolean().optional(),
});

adminRouter.get('/stores/:storeId/users', requireAdminToken, async (req, res, next) => {
  try {
    const users = await prisma.storeUser.findMany({
      where: { storeId: req.params.storeId as string },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    res.json(users);
  } catch (err) { next(err); }
});

adminRouter.post('/stores/:storeId/users', requireAdminToken, async (req, res, next) => {
  try {
    const { password, ...rest } = UserInput.parse(req.body);
    const store = await prisma.store.findUnique({ where: { id: req.params.storeId as string } });
    if (!store) throw notFound('Store');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.storeUser.create({
      data: { storeId: req.params.storeId as string, passwordHash, ...rest },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (err) { next(err); }
});

adminRouter.patch('/stores/:storeId/users/:userId', requireAdminToken, async (req, res, next) => {
  try {
    const body = UserInput.partial().parse(req.body);
    const updateData: any = { ...body };
    if (body.password) {
      updateData.passwordHash = await bcrypt.hash(body.password, 10);
      delete updateData.password;
    }
    const user = await prisma.storeUser.update({
      where: { id: req.params.userId as string },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    res.json(user);
  } catch (err) { next(err); }
});

adminRouter.delete('/stores/:storeId/users/:userId', requireAdminToken, async (req, res, next) => {
  try {
    await prisma.storeUser.delete({ where: { id: req.params.userId as string } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// --- Dashboard Stats ---------------------------------------------------------

adminRouter.get('/stats', requireAdminToken, async (_req, res, next) => {
  try {
    const [totalStores, activeStores, totalUsers] = await Promise.all([
      prisma.store.count(),
      prisma.store.count({ where: { active: true } }),
      prisma.storeUser.count(),
    ]);
    res.json({ totalStores, activeStores, totalUsers });
  } catch (err) { next(err); }
});
