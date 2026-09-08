import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const API_URL = 'https://localhost:3001';

export const load: PageServerLoad = async ({ locals, cookies, fetch }) => {
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  const token = cookies.get('accessToken');

  if (!token) {
    throw redirect(303, '/login');
  }

  const response = await fetch(`${API_URL}/requests`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw redirect(303, '/login');
    }

    const body = await response.json();
    return {
      requests: [],
      user: locals.user,
      language: cookies.get('language') ?? 'en',
      error: body.error || 'Failed to load requests'
    };
  }

  const requests = await response.json();
  const departmentsResponse = await fetch(`${API_URL}/departments`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const departments = departmentsResponse.ok ? await departmentsResponse.json() : [];

  for (const req of requests) {
    const commentsRes = await fetch(
      `${API_URL}/requests/${req.id}/comments`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    req.comments = commentsRes.ok
      ? await commentsRes.json()
      : [];
  }

  return {
    requests,
    departments,
    user: locals.user,
    language: cookies.get('language') ?? 'en'
  };
};

export const actions: Actions = {
  create: async ({ request, cookies, fetch }) => {
    const token = cookies.get('accessToken');

    if (!token) {
      throw redirect(303, '/login');
    }

    const data = await request.formData();
    const title = data.get('title');
    const description = data.get('description');
    const departmentId = data.get('departmentId');

    const response = await fetch(`${API_URL}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title,
        description,
        departmentId
      })
    });

    if (!response.ok) {
      const body = await response.json();

      return fail(response.status, {
        error: body.error || 'Failed to create request'
      });
    }

    return {
      success: true
    };
  },

  edit: async ({ request, cookies, fetch }) => {
    const token = cookies.get('accessToken');

    if (!token) {
      throw redirect(303, '/login');
    }

    const data = await request.formData();
    const id = data.get('id');
    const title = data.get('title');
    const description = data.get('description');
    const priority = data.get('priority');

    if (!id) {
      return fail(400, {
        error: 'Request ID is required'
      });
    }

    const response = await fetch(
      `${API_URL}/requests/${id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          priority
        })
      }
    );

    if (!response.ok) {
      const body = await response.json();

      return fail(response.status, {
        error: body?.error || 'Failed to update request'
      });
    }

    return {
      success: true
    };
  },

  delete: async ({ request, cookies, fetch }) => {
    const token = cookies.get('accessToken');

    if (!token) {
      throw redirect(303, '/login');
    }

    const data = await request.formData();
    const id = data.get('id');

    if (!id) {
      return fail(400, {
        error: 'Request ID is required'
      });
    }

    const response = await fetch(
      `${API_URL}/requests/${id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      const body = await response.json();

      return fail(response.status, {
        error: body.error || 'Failed to delete request'
      });
    }

    return {
      success: true
    };
  },

  changeStatus: async ({ request, cookies, fetch }) => {
    const token = cookies.get('accessToken');

    if (!token) {
      throw redirect(303, '/login');
    }

    const data = await request.formData();
    const id = data.get('id');
    const status = data.get('status');

    if (!id) {
      return fail(400, {
        error: 'Request ID is required'
      });
    }

    const response = await fetch(
      `${API_URL}/requests/${id}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status
        })
      }
    );

    if (!response.ok) {
      const body = await response.json();

      return fail(response.status, {
        error: body.error || 'Failed to change status'
      });
    }

    return {
      success: true
    };
  },

  addComment: async ({ request, cookies, fetch }) => {
    const token = cookies.get('accessToken');

    if (!token) {
      throw redirect(303, '/login');
    }

    const data = await request.formData();
    const id = data.get('id');
    const content = data.get('content');

    if (!id) {
      return fail(400, {
        error: 'Request ID is required'
      });
    }

    const response = await fetch(
      `${API_URL}/requests/${id}/comments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          content
        })
      }
    );

    if (!response.ok) {
      const body = await response.json();

      return fail(response.status, {
        error: body.error || 'Failed to add comment'
      });
    }

    return {
      success: true
    };
  }
};
