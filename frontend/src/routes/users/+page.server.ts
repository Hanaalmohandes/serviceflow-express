import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const API_URL = 'https://localhost:3001';

export const load: PageServerLoad = async ({ locals, cookies, fetch }) => {
  if (!locals.user?.isHost) throw redirect(303, '/requests');

  const token = cookies.get('accessToken');
  if (!token) throw redirect(303, '/login');

  const [response, departmentsResponse] = await Promise.all([
    fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } }),
    fetch(`${API_URL}/departments`, { headers: { Authorization: `Bearer ${token}` } })
  ]);

  if (!response.ok) {
    return { users: [], departments: [], error: 'Could not load users.' };
  }

  return { users: await response.json(), departments: departmentsResponse.ok ? await departmentsResponse.json() : [] };
};

export const actions: Actions = {
  updateRole: async ({ request, cookies, fetch }) => {
    const token = cookies.get('accessToken');
    if (!token) throw redirect(303, '/login');

    const data = await request.formData();
    const membershipId = data.get('membershipId');
    const role = data.get('role');
    const departmentId = data.get('departmentId');
    if (typeof membershipId !== 'string' || !['Admin', 'Employee'].includes(String(role))) {
      return fail(400, { error: 'Choose a valid role.' });
    }

    const response = await fetch(`${API_URL}/memberships/${membershipId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ role, departmentId })
    });

    if (!response.ok) {
      const body = await response.json();
      return fail(response.status, { error: body.error || 'Could not update the user role.' });
    }

    throw redirect(303, '/users');
  },

  deleteUser: async ({ request, cookies, fetch }) => {
    const token = cookies.get('accessToken');
    if (!token) throw redirect(303, '/login');

    const userId = (await request.formData()).get('userId');
    if (typeof userId !== 'string') {
      return fail(400, { error: 'User ID is required.' });
    }

    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      const body = await response.json();
      return fail(response.status, { error: body.error || 'Could not delete the user.' });
    }

    throw redirect(303, '/users');
  }
};
