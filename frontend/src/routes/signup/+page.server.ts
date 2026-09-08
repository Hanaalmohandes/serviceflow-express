import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, fetch }) => {
    const data = await request.formData();
    const name = data.get('name');
    const email = data.get('email');
    const password = data.get('password');
    const tenantName = data.get('tenantName');
    const tenantSlug = data.get('tenantSlug');
    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string' || typeof tenantSlug !== 'string') {
      return fail(400, { error: 'Please complete your name, email, password, and organization slug.' });
    }
    const response = await fetch('https://localhost:3001/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, tenantName: typeof tenantName === 'string' ? tenantName.trim() : '', tenantSlug })
    });
    if (!response.ok) {
      const body = await response.json();
      return fail(response.status, { error: body.error || 'Could not create your account.' });
    }
    throw redirect(303, '/login');
  }
};
