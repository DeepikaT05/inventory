import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { HttpError } from '../http.js';
import { signStoreToken } from '../middleware/adminAuth.js';

export const authRouter = Router();

// Store-user login — returns a JWT scoped to a store
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }).parse(req.body);

    const user = await prisma.storeUser.findUnique({
      where: { email },
      include: { store: { select: { id: true, name: true, active: true } } },
    });
    if (!user || !user.active) throw new HttpError(401, 'Invalid email or password');
    if (!user.store.active) throw new HttpError(403, 'This store has been deactivated');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new HttpError(401, 'Invalid email or password');

    const token = signStoreToken({
      sub: user.id,
      email: user.email,
      storeId: user.storeId,
      role: user.role,
    });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      store: user.store,
    });
  } catch (err) { next(err); }
});
