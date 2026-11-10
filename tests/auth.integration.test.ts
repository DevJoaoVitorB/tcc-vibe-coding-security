import { DatabaseSync } from 'node:sqlite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.DATABASE_URL = 'file:./test.db';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-longer-than-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-longer-than-32-characters';
process.env.NODE_ENV = 'test';

let closeServer: () => void;
let baseUrl: string;
let disconnect: () => Promise<void>;

beforeAll(async () => {
  const db = new DatabaseSync('prisma/test.db');
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS User (id TEXT NOT NULL PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, passwordHash TEXT NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL);
    CREATE TABLE IF NOT EXISTS Session (id TEXT NOT NULL PRIMARY KEY, userId TEXT NOT NULL, refreshTokenHash TEXT NOT NULL, expiresAt DATETIME NOT NULL, revokedAt DATETIME, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE ON UPDATE CASCADE);
    CREATE UNIQUE INDEX IF NOT EXISTS User_email_key ON User(email);
    CREATE INDEX IF NOT EXISTS Session_userId_idx ON Session(userId);
    DELETE FROM Session; DELETE FROM User;`);
  db.close();
  const { app } = await import('../src/app.js');
  const { prisma } = await import('../src/prisma.js');
  disconnect = () => prisma.$disconnect();
  await new Promise<void>((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Could not start test server.');
      baseUrl = `http://127.0.0.1:${address.port}`;
      closeServer = () => server.close();
      resolve();
    });
  });
});

afterAll(async () => { closeServer(); await disconnect(); });

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { 'content-type': 'application/json', ...init.headers } });
  return { status: response.status, body: response.status === 204 ? undefined : await response.json() };
}

describe('authentication API', () => {
  it('registers, authenticates, refreshes, protects ownership, and revokes a session', async () => {
    const registered = await request('/auth/register', { method: 'POST', body: JSON.stringify({ name: 'Alice', email: 'alice@example.test', password: 'StrongPass123' }) });
    expect(registered.status).toBe(201);

    const login = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'alice@example.test', password: 'StrongPass123' }) });
    expect(login.status).toBe(200);
    const tokens = login.body as { accessToken: string; refreshToken: string };

    expect((await request('/users/me', { headers: { authorization: `Bearer ${tokens.accessToken}` } })).status).toBe(200);
    expect((await request('/users/another-user', { headers: { authorization: `Bearer ${tokens.accessToken}` } })).status).toBe(403);

    const refreshed = await request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: tokens.refreshToken }) });
    expect(refreshed.status).toBe(200);
    const rotated = refreshed.body as { accessToken: string; refreshToken: string };
    expect((await request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: tokens.refreshToken }) })).status).toBe(401);

    expect((await request('/auth/logout', { method: 'POST', headers: { authorization: `Bearer ${rotated.accessToken}` } })).status).toBe(204);
    expect((await request('/users/me', { headers: { authorization: `Bearer ${rotated.accessToken}` } })).status).toBe(401);
  });
});
