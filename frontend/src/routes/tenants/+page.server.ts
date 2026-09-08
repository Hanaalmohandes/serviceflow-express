import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const API_URL = 'https://localhost:3001';

export const load: PageServerLoad = async ({ locals, cookies, fetch }) => {
  if (!locals.user) throw redirect(303, '/login');
  if (!locals.user.isHost) throw redirect(303, '/requests');
  const token = cookies.get('accessToken');
  if (!token) throw redirect(303, '/login');
  const response = await fetch(`${API_URL}/tenants`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    if (response.status === 401) throw redirect(303, '/login');
    const body = await response.json();
    return { tenants: [], error: body.error || 'Failed to load tenants' };
  }
  return { tenants: await response.json() };
};

export const actions: Actions = {
  create: async ({ request, cookies, fetch }) => {
    const token = cookies.get('accessToken');
    if (!token) throw redirect(303, '/login');
    const data = await request.formData();
    const response = await fetch(`${API_URL}/tenants`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: data.get('name'), slug: data.get('slug') }) });
    if (!response.ok) return fail(response.status, { error: (await response.json()).error || 'Failed to create tenant' });
    return { success: true };
  },
  edit: async ({ request, cookies, fetch }) => {
    const token = cookies.get('accessToken');
    if (!token) throw redirect(303, '/login');
    const data = await request.formData();
    const id = data.get('id');
    if (!id) return fail(400, { error: 'Tenant ID is required' });
    const response = await fetch(`${API_URL}/tenants/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: data.get('name'), slug: data.get('slug'), isActive: data.get('is_active') === 'true' }) });
    if (!response.ok) return fail(response.status, { error: (await response.json())?.error || 'Failed to update tenant' });
    return { success: true };
  },
  delete: async ({ request, cookies, fetch }) => {
    const token = cookies.get('accessToken');
    if (!token) throw redirect(303, '/login');
    const id = (await request.formData()).get('id');
    if (!id) return fail(400, { error: 'Tenant ID is required' });
    const response = await fetch(`${API_URL}/tenants/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return fail(response.status, { error: (await response.json()).error || 'Failed to delete tenant' });
    return { success: true };
  }
};
