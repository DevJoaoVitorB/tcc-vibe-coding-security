import 'dotenv/config';
import { z } from 'zod';

const environment = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development')
}).parse(process.env);

export const config = {
  ...environment,
  accessTokenTtl: '15m',
  refreshTokenTtlDays: 7,
  bcryptRounds: 12
} as const;
