import bcrypt from 'bcryptjs';
import express, { type NextFunction, type Request, type Response } from 'express';
import { ZodError, z } from 'zod';
import { createAccessToken, hashToken, newRefreshToken, requireAuth, type AuthenticatedRequest } from './auth.js';
import { config } from './config.js';
import { openapi } from './openapi.js';
import { prisma } from './prisma.js';

const registrationSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(128)
});
const loginSchema = registrationSchema.pick({ email: true, password: true });
const refreshSchema = z.object({ refreshToken: z.string().min(1) });
const publicUser = (user: { id: string; name: string; email: string }) => ({ id: user.id, name: user.name, email: user.email });

async function issueTokens(userId: string, sessionId?: string) {
  const refreshToken = newRefreshToken();
  const session = sessionId
    ? await prisma.session.update({ where: { id: sessionId }, data: { refreshTokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + config.refreshTokenTtlMs), revokedAt: null } })
    : await prisma.session.create({ data: { userId, refreshTokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + config.refreshTokenTtlMs) } });
  return { accessToken: createAccessToken(userId, session.id), refreshToken };
}

export const app = express();
app.use(express.json({ limit: '16kb' }));

app.get('/openapi.json', (_req, res) => res.json(openapi));

app.post('/auth/register', async (req, res, next) => {
  try {
    const input = registrationSchema.parse(req.body);
    const { password, ...userInput } = input;
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { ...userInput, passwordHash } });
    res.status(201).json(publicUser(user));
  } catch (error) { next(error); }
});

app.post('/auth/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos.' });
      return;
    }
    res.json(await issueTokens(user.id));
  } catch (error) { next(error); }
});

app.post('/auth/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const session = await prisma.session.findUnique({ where: { refreshTokenHash: hashToken(refreshToken) } });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      res.status(401).json({ error: 'INVALID_REFRESH_TOKEN', message: 'Refresh token inválido ou expirado.' });
      return;
    }
    res.json(await issueTokens(session.userId, session.id));
  } catch (error) { next(error); }
});

app.post('/auth/logout', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await prisma.session.update({ where: { id: req.auth!.sessionId }, data: { revokedAt: new Date() } });
    res.status(204).send();
  } catch (error) { next(error); }
});

app.get('/me', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.userId } });
    res.json(publicUser(user));
  } catch (error) { next(error); }
});

app.get('/users/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (req.params.id !== req.auth!.userId) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Você só pode consultar o próprio perfil.' });
      return;
    }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth!.userId } });
    res.json(publicUser(user));
  } catch (error) { next(error); }
});

app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND', message: 'Rota não encontrada.' }));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Dados de entrada inválidos.', details: error.flatten() });
    return;
  }
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
    res.status(409).json({ error: 'EMAIL_ALREADY_REGISTERED', message: 'Este e-mail já está cadastrado.' });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' });
});
