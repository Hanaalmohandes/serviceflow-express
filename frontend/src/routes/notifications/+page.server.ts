import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const API_URL = 'https://localhost:3001';

export const load: PageServerLoad = async ({ locals, cookies, fetch }) => {
  if (!locals.user) throw redirect(303, '/login');

  const token = cookies.get('accessToken');
  if (!token) throw redirect(303, '/login');

  const response = await fetch(`${API_URL}/notifications`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    return { notifications: [], language: cookies.get('language') ?? 'en', error: 'Could not load notifications.' };
  }

  return { notifications: await response.json(), language: cookies.get('language') ?? 'en' };
};
