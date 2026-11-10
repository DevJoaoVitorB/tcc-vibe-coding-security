import bcrypt from 'bcryptjs';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { config } from './config.js';
import { ApiError } from './errors.js';
import { prisma } from './prisma.js';

type TokenPayload = JwtPayload & { sub: string; sid: string; typ: 'access' | 'refresh' };

function signAccessToken(userId: string, sessionId: string): string {
  return jwt.sign({ sid: sessionId, typ: 'access' }, config.JWT_ACCESS_SECRET, {
    subject: userId, expiresIn: config.accessTokenTtl, jwtid: randomUUID(), algorithm: 'HS256'
  });
}

function signRefreshToken(userId: string, sessionId: string): string {
  return jwt.sign({ sid: sessionId, typ: 'refresh' }, config.JWT_REFRESH_SECRET, {
    subject: userId, expiresIn: `${config.refreshTokenTtlDays}d`, jwtid: randomUUID(), algorithm: 'HS256'
  });
}

function verify(token: string, secret: string, type: TokenPayload['typ']): TokenPayload {
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || decoded.typ !== type || !decoded.sub || typeof decoded.sid !== 'string') throw new Error('Invalid token');
    return decoded as TokenPayload;
  } catch {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  }
}

export async function createSession(userId: string) {
  const sessionId = randomUUID();
  const refreshToken = signRefreshToken(userId, sessionId);
  const refreshTokenHash = await bcrypt.hash(refreshToken, config.bcryptRounds);
  await prisma.session.create({ data: {
    id: sessionId, userId, refreshTokenHash,
    expiresAt: new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000)
  }});
  return { accessToken: signAccessToken(userId, sessionId), refreshToken };
}

export async function authenticateAccessToken(token: string) {
  const payload = verify(token, config.JWT_ACCESS_SECRET, 'access');
  const session = await prisma.session.findUnique({ where: { id: payload.sid }, select: { userId: true, revokedAt: true, expiresAt: true } });
  if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt <= new Date()) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  }
  return { userId: session.userId, sessionId: payload.sid };
}

export async function rotateRefreshToken(token: string) {
  const payload = verify(token, config.JWT_REFRESH_SECRET, 'refresh');
  const session = await prisma.session.findUnique({ where: { id: payload.sid } });
  const valid = session && session.userId === payload.sub && !session.revokedAt && session.expiresAt > new Date()
    && await bcrypt.compare(token, session.refreshTokenHash);
  if (!valid || !session) throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.');

  // Rotation makes a stolen or replayed refresh token unusable after its first use.
  await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
  return createSession(session.userId);
}

export async function revokeSession(sessionId: string) {
  await prisma.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, config.bcryptRounds);
}

export async function passwordMatches(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
