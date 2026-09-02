import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, cookies, fetch }) => {
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  const token = cookies.get('token');
  const response = await fetch('http://localhost:3001/requests', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const requests = await response.json();

  for (const req of requests) {
    const commentsRes = await fetch(`http://localhost:3001/requests/${req.id}/comments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    req.comments = await commentsRes.json();
  }

  return { requests, user: locals.user };
};

export const actions: Actions = {
  create: async ({ request, cookies, fetch }) => {
    const token = cookies.get('token');
    const data = await request.formData();
    const title = data.get('title');
    const description = data.get('description');

    const response = await fetch('http://localhost:3001/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, description }),
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
    const title = data.get('title');
    const description = data.get('description');
    const priority = data.get('priority');

    if (!id) {
      return fail(400, { error: 'Request ID is required' });
    }

    // Sends title, description, and priority updates to your backend API
    const response = await fetch(`http://localhost:3001/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, description, priority }),
    });

    if (!response.ok) {
      const body = await response.json();
      return fail(response.status, { error: body?.error || 'Failed to update request' });
    }
    return { success: true };
  },

  delete: async ({ request, cookies, fetch }) => {
    const token = cookies.get('token');
    const data = await request.formData();
    const id = data.get('id');

    const response = await fetch(`http://localhost:3001/requests/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const body = await response.json();
      return fail(response.status, { error: body.error });
    }
    return { success: true };
  },

  changeStatus: async ({ request, cookies, fetch }) => {
    const token = cookies.get('token');
    const data = await request.formData();
    const id = data.get('id');
    const status = data.get('status');

    const response = await fetch(`http://localhost:3001/requests/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const body = await response.json();
      return fail(response.status, { error: body.error });
    }
    return { success: true };
  },

  addComment: async ({ request, cookies, fetch }) => {
    const token = cookies.get('token');
    const data = await request.formData();
    const id = data.get('id');
    const content = data.get('content');

    const response = await fetch(`http://localhost:3001/requests/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const body = await response.json();
      return fail(response.status, { error: body.error });
    }
    return { success: true };
  }
};