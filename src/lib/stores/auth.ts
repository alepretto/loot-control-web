import { writable, derived } from 'svelte/store';
import { getMe, getToken } from '$lib/api';
import type { AuthUser } from '$lib/types/auth';

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthUser | null>(null);
	const loading = writable(true);

	async function load(): Promise<void> {
		const token = getToken();
		if (!token) {
			set(null);
			loading.set(false);
			return;
		}
		try {
			const user = await getMe();
			set(user);
		} catch {
			set(null);
		} finally {
			loading.set(false);
		}
	}

	function setUser(user: AuthUser): void {
		set(user);
		loading.set(false);
	}

	function clear(): void {
		set(null);
	}

	return {
		subscribe,
		loading: { subscribe: loading.subscribe },
		load,
		setUser,
		clear
	};
}

export const auth = createAuthStore();

export const isAuthenticated = derived(auth, ($auth) => $auth !== null);
export const isAdmin = derived(auth, ($auth) => $auth?.role === 'admin');