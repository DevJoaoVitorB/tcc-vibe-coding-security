import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { ZodError, z } from 'zod';
import { authenticateAccessToken, createSession, hashPassword, passwordMatches, revokeSession, rotateRefreshToken } from './auth.js';
import { ApiError } from './errors.js';
import { openapi } from './openapi.js';
import { prisma } from './prisma.js';
import type { AuthenticatedRequest } from './types.js';

const password = z.string().min(12).max(128)
  .regex(/[a-z]/, 'Password must contain a lowercase letter.')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
  .regex(/[0-9]/, 'Password must contain a number.');
const registerInput = z.object({ name: z.string().trim().min(1).max(100), email: z.string().trim().email().max(254), password }).strict();
const loginInput = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) }).strict();
const refreshInput = z.object({ refreshToken: z.string().min(1).max(4096) }).strict();

const userSelect = { id: true, name: true, email: true } as const;
const normalizeEmail = (email: string) => email.toLowerCase();

function asyncRoute(handler: (req: any, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => { void handler(req, res, next).catch(next); };
}

const requireAuth = asyncRoute(async (req: AuthenticatedRequest, _res, next) => {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ') || header.length < 9) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  req.auth = await authenticateAccessToken(header.slice(7));
  next();
});

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '16kb', type: 'application/json' }));

app.get('/openapi.json', (_req, res) => res.status(200).json(openapi));

app.post('/auth/register', asyncRoute(async (req, res) => {
  const input = registerInput.parse(req.body);
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new ApiError(409, 'REGISTRATION_FAILED', 'Unable to create account with the provided information.');
  const user = await prisma.user.create({ data: { name: input.name, email, passwordHash: await hashPassword(input.password) }, select: userSelect });
  res.status(201).json({ user });
}));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many authentication attempts. Please try again later.' } } });
app.post('/auth/login', loginLimiter, asyncRoute(async (req, res) => {
  const input = loginInput.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(input.email) } });
  if (!user || !(await passwordMatches(input.password, user.passwordHash))) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }
  res.status(200).json(await createSession(user.id));
}));

app.post('/auth/refresh', asyncRoute(async (req, res) => {
  const { refreshToken } = refreshInput.parse(req.body);
  res.status(200).json(await rotateRefreshToken(refreshToken));
}));

app.post('/auth/logout', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  await revokeSession(req.auth!.sessionId);
  res.status(204).send();
}));

app.get('/users/me', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId }, select: userSelect });
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  res.status(200).json({ user });
}));

app.get('/users/:id', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  if (req.params.id !== req.auth!.userId) throw new ApiError(403, 'FORBIDDEN', 'You cannot access this resource.');
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId }, select: userSelect });
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  res.status(200).json({ user });
}));

app.use((_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'Resource not found.')));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ZodError) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request input.' } });
  if (error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request input.' } });
  }
  if (error instanceof ApiError) return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
});
