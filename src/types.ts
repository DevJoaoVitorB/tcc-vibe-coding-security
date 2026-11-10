import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  auth?: { userId: string; sessionId: string };
}
