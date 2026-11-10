import 'dotenv/config';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV !== 'test') {
  throw new Error('JWT_SECRET deve ser definido no ambiente. Consulte .env.example.');
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: jwtSecret ?? 'test-only-secret',
  accessTokenTtl: '15m' as const,
  refreshTokenTtlMs: 7 * 24 * 60 * 60 * 1000
};
