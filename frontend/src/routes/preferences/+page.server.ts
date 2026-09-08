import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const API_URL = 'https://localhost:3001';

export const load: PageServerLoad = async ({ locals, cookies, fetch }) => {
  if (!locals.user) throw redirect(303, '/login');

  const token = cookies.get('accessToken');
  if (!token) throw redirect(303, '/login');

  const response = await fetch(`${API_URL}/users/me/preferences`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    return { language: 'en', error: 'Could not load preferences.' };
  }

  return response.json();
};

export const actions: Actions = {
  default: async ({ request, cookies, fetch }) => {
    const token = cookies.get('accessToken');
    if (!token) throw redirect(303, '/login');

    const language = (await request.formData()).get('language');
    const response = await fetch(`${API_URL}/users/me/preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ language })
    });

    if (!response.ok) {
      const body = await response.json();
      return fail(response.status, { error: body.error || 'Could not save preferences.' });
    }

    const result = await response.json();
    cookies.set('language', result.language, {
      path: '/',
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365
    });

    throw redirect(303, '/notifications');
  }
};
