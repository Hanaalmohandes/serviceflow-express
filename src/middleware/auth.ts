import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../auth.js';
import { logger } from '../logger.js';

export type AuthUser = {
  userId: string;
  isHost: boolean;
  tenantId?: string;
  departmentId?: string;
  role?: string;
};

export function getAuthUser(req: Request): AuthUser {
  return (req as Request & { user: AuthUser }).user;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    logger.warn('auth.missing_access_token', { path: req.path });
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  try {
    (req as Request & { user: AuthUser }).user = verifyAccessToken(header.slice(7)) as AuthUser;
    next();
  } catch {
    logger.warn('auth.invalid_access_token', { path: req.path });
    res.status(401).json({ error: 'Invalid or expired access token' });
  }
}

export function requireHost(req: Request, res: Response, next: NextFunction) {
  if (!getAuthUser(req)?.isHost) {
    logger.warn('authorization.host_access_denied', { path: req.path });
    res.status(403).json({ error: 'Host access required' });
    return;
  }
  next();
}
