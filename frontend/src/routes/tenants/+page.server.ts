import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, cookies, fetch }) => {
  if (!locals.user) {
    throw redirect(303, '/login');
  }
  if (!locals.user.isHost) {
    throw redirect(303, '/requests');
  }

  const token = cookies.get('token');
  const response = await fetch('http://localhost:3001/tenants', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const tenants = await response.json();

  return { tenants };
};

export const actions: Actions = {
  create: async ({ request, cookies, fetch }) => {
    const token = cookies.get('token');
    const data = await request.formData();
    const name = data.get('name');
    const slug = data.get('slug');

    const response = await fetch('http://localhost:3001/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, slug }),
    });

    if (!response.ok) {
      const body = await response.json();
      return fail(response.status, { error: body.error });
    }
    return { success: true };
  },

  edit: async ({ request, cookies, fetch }) => {
    const token = cookies.get('token');
    const data = await request.formData();
    const id = data.get('id');
    const name = data.get('name');
    const slug = data.get('slug');
    const rawIsActive = data.get('is_active');

    if (!id) {
      return fail(400, { error: 'Tenant ID is required' });
    }

    const payload = {
      name,
      slug,
      isActive: rawIsActive === 'true'
    };

    console.log('Sending payload to backend API:', payload);

    const response = await fetch(`http://localhost:3001/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.json();
      console.error('Backend returned error:', body);
      return fail(response.status, { error: body?.error || 'Failed to update tenant' });
    }

    return { success: true };
  },

  delete: async ({ request, cookies, fetch }) => {
    const token = cookies.get('token');
    const data = await request.formData();
    const id = data.get('id');

    const response = await fetch(`http://localhost:3001/tenants/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const body = await response.json();
      return fail(response.status, { error: body.error });
    }
    return { success: true };
  }
};