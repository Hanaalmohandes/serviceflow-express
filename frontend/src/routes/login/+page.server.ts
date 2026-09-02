import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, cookies, fetch }) => {
    const data = await request.formData();
    const email = data.get('email');
    const password = data.get('password');

    const response = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const body = await response.json();
      return fail(response.status, { error: body.error || 'Login failed' });
    }

    const result = await response.json();

    cookies.set('token', result.token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60,
    });

    if (result.isHost) {
      throw redirect(303, '/tenants');
    }
    throw redirect(303, '/requests');
  },
};