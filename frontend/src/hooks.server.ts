// src/hooks.server.ts
import jwt from 'jsonwebtoken';
import type { Handle } from '@sveltejs/kit';
import { JWT_SECRET } from '$env/static/private';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('token');

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      event.locals.user = decoded as { userId: string; isHost: boolean; tenantId?: string; role?: string };
    } catch (err) {
      event.locals.user = null;
    }
  } else {
    event.locals.user = null;
  }

  return resolve(event);
};