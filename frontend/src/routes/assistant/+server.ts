import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { API_URL } from '$lib/server/api';

function publicFailure(status: number) {
	if (status === 400) return 'Your message is invalid. Please check it and try again.';
	if (status === 401) return 'Your session has expired. Please sign in again.';
	if (status === 503) return 'The AI assistant is unavailable right now. Please try again shortly.';
	if (status === 504) return 'The AI assistant took too long to respond. Please try again.';
	return 'The AI assistant could not respond. Please try again.';
}

export const POST: RequestHandler = async ({ request, cookies, fetch }) => {
	const token = cookies.get('accessToken');
	if (!token) return json({ error: publicFailure(401) }, { status: 401 });

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: publicFailure(400) }, { status: 400 });
	}

	try {
		const response = await fetch(`${API_URL}/assistant`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body),
			signal: request.signal
		});

		if (!response.ok) return json({ error: publicFailure(response.status) }, { status: response.status });

		return new Response(response.body, {
			status: response.status,
			headers: {
				'Content-Type': response.headers.get('Content-Type') ?? 'text/plain; charset=utf-8',
				'Cache-Control': 'no-store'
			}
		});
	} catch {
		return json({ error: publicFailure(502) }, { status: 502 });
	}
};
