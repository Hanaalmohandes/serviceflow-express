import jwt from 'jsonwebtoken';
import type { Handle } from '@sveltejs/kit';
import { JWT_ACCESS_SECRET } from '$env/static/private';

const API_URL = 'https://localhost:3001';

export const handle: Handle = async ({ event, resolve }) => {
  let accessToken = event.cookies.get('accessToken');

  if (!accessToken) {
    event.locals.user = null;
    return resolve(event);
  }

  try {
    const decoded = jwt.verify(accessToken, JWT_ACCESS_SECRET) as {
      userId: string;
      isHost: boolean;
      tenantId?: string;
      departmentId?: string;
      role?: string;
      language?: string;
      tokenType?: string;
    };

    if (decoded.tokenType !== 'access') {
      throw new Error('Invalid access token');
    }

    event.locals.user = decoded;
  } catch (err: any) {
    if (err instanceof jwt.TokenExpiredError) {
      const refreshToken = event.cookies.get('refreshToken');

      if (!refreshToken) {
        event.cookies.delete('accessToken', { path: '/' });
        event.cookies.delete('refreshToken', { path: '/' });
        event.locals.user = null;
        return resolve(event);
      }

      try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refreshToken })
        });

        if (!response.ok) {
          throw new Error('Refresh failed');
        }

        const result = await response.json();

        if (typeof result.accessToken !== 'string' || result.accessToken.length === 0) {
          throw new Error('Authentication response did not include an access token');
        }

        const accessToken = result.accessToken;
        const refreshedToken = result.refreshToken;

        event.cookies.set('accessToken', accessToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 60
        });

        if (typeof refreshedToken === 'string' && refreshedToken.length > 0) {
          event.cookies.set('refreshToken', refreshedToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 10 * 60
          });
        }

        event.locals.user = {
          userId: result.userId,
          isHost: result.isHost,
          tenantId: result.tenantId,
          departmentId: result.departmentId,
          role: result.role,
          language: result.language
        };

        if (typeof result.language === 'string') {
          event.cookies.set('language', result.language, {
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 365
          });
        }
      } catch {
        event.cookies.delete('accessToken', { path: '/' });
        event.cookies.delete('refreshToken', { path: '/' });
        event.locals.user = null;
      }
    } else {
      event.cookies.delete('accessToken', { path: '/' });
      event.locals.user = null;
    }
  }

  return resolve(event);
};
