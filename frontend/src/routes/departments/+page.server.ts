import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const API_URL = 'https://localhost:3001';

export const load: PageServerLoad = async ({ locals, cookies, fetch }) => {
  if (!locals.user || (!locals.user.isHost && locals.user.role !== 'Admin')) {
    throw redirect(303, '/requests');
  }
  const token = cookies.get('accessToken');
  if (!token) throw redirect(303, '/login');
  const [departmentsResponse, tenantsResponse] = await Promise.all([
    fetch(`${API_URL}/departments`, { headers: { Authorization: `Bearer ${token}` } }),
    locals.user.isHost
      ? fetch(`${API_URL}/tenants`, { headers: { Authorization: `Bearer ${token}` } })
      : Promise.resolve(null)
  ]);
  return {
    departments: departmentsResponse.ok ? await departmentsResponse.json() : [],
    tenants: tenantsResponse?.ok ? await tenantsResponse.json() : [],
    isHost: locals.user.isHost
  };
};

export const actions: Actions = {
  create: async ({ request, cookies, fetch }) => {
    const token = cookies.get('accessToken');
    if (!token) throw redirect(303, '/login');
    const data = await request.formData();
    const response = await fetch(`${API_URL}/departments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: data.get('name'), tenantId: data.get('tenantId') })
    });
    if (!response.ok) return fail(response.status, { error: (await response.json()).error || 'Could not create department.' });
    throw redirect(303, '/departments');
  },
  toggle: async ({ request, cookies, fetch }) => {
    const token = cookies.get('accessToken');
    if (!token) throw redirect(303, '/login');
    const data = await request.formData();
    const id = data.get('id');
    const response = await fetch(`${API_URL}/departments/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isActive: data.get('isActive') === 'true' })
    });
    if (!response.ok) return fail(response.status, { error: (await response.json()).error || 'Could not update department.' });
    throw redirect(303, '/departments');
  }
};
