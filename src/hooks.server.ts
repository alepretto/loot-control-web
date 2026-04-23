import type { Handle } from '@sveltejs/kit';
import { auth } from '$lib/stores/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('access_token') || event.request.headers.get('authorization')?.replace('Bearer ', '');

	if (token) {
		try {
			const response = await fetch('http://localhost:8000/users/me', {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (response.ok) {
				const user = await response.json();
				event.locals.user = user;
			}
		} catch {
			// Token invalid, continue without user
		}
	}

	return resolve(event);
};