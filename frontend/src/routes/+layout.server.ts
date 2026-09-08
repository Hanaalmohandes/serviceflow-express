import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url, cookies }) => {
  if (!locals.user && !['/login', '/signup'].includes(url.pathname)) {
    throw redirect(303, '/login');
  }
  return { user: locals.user, language: cookies.get('language') ?? locals.user?.language ?? 'en' };
};
