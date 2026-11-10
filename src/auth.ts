import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { prisma } from './prisma.js';

export type AuthenticatedRequest = Request & { auth?: { userId: string; sessionId: string } };

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function newRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

export function createAccessToken(userId: string, sessionId: string): string {
  return jwt.sign({ sub: userId, sid: sessionId }, config.jwtSecret, { expiresIn: config.accessTokenTtl });
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const [scheme, token] = req.header('authorization')?.split(' ') ?? [];
  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Token Bearer ausente ou inválido.' });
    return;
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') throw new Error('payload inválido');
    const session = await prisma.session.findUnique({ where: { id: payload.sid }, select: { userId: true, revokedAt: true, expiresAt: true } });
    if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt <= new Date()) throw new Error('sessão inválida');
    req.auth = { userId: payload.sub, sessionId: payload.sid };
    next();
  } catch {
    res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Token inválido, expirado ou sessão encerrada.' });
  }
}
