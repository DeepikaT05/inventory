import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from '../http.js';

export interface AdminTokenPayload {
  sub: string;
  email: string;
  type: 'admin';
}

export interface StoreTokenPayload {
  sub: string;
  email: string;
  storeId: string;
  role: string;
  type: 'store';
}

function jwtSecret(): string {
  return process.env.JWT_SECRET ?? 'change-me-in-production';
}

export function signAdminToken(payload: Omit<AdminTokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'admin' }, jwtSecret(), { expiresIn: '24h' });
}

export function signStoreToken(payload: Omit<StoreTokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'store' }, jwtSecret(), { expiresIn: '12h' });
}

export const requireAdminToken: RequestHandler = (req, res, next) => {
  const auth = req.header('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) { next(new HttpError(401, 'Missing token')); return; }
  try {
    const payload = jwt.verify(token, jwtSecret()) as AdminTokenPayload;
    if (payload.type !== 'admin') { next(new HttpError(403, 'Admin token required')); return; }
    (req as any).admin = payload;
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired token'));
  }
};

export const requireStoreToken: RequestHandler = (req, res, next) => {
  const auth = req.header('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) { next(new HttpError(401, 'Missing token')); return; }
  try {
    const payload = jwt.verify(token, jwtSecret()) as StoreTokenPayload;
    if (payload.type !== 'store') { next(new HttpError(403, 'Store token required')); return; }
    (req as any).storeUser = payload;
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired token'));
  }
};
