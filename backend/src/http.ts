import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const notFound = (what: string) => new HttpError(404, `${what} not found`);

export const requireApiKey: RequestHandler = (req, res, next) => {
  const key = process.env.API_KEY;
  if (!key || req.header('x-api-key') === key) return next();
  res.status(401).json({ error: 'Invalid API key' });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Invalid request', issues: err.issues });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'Already exists' }); return; }
    if (err.code === 'P2025') { res.status(404).json({ error: 'Not found' }); return; }
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
};
