import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import type { AuthUser, AuthToken, LoginRequest, SignupRequest } from '$lib/types/auth';

const API_BASE = 'http://localhost:8000';

function getToken(): string | null {
	if (!browser) return null;
	return localStorage.getItem('access_token');
}

function setToken(token: string): void {
	if (!browser) return;
	localStorage.setItem('access_token', token);
}

function clearToken(): void {
	if (!browser) return;
	localStorage.removeItem('access_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	const token = getToken();
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...(options.headers as Record<string, string> ?? {})
	};

	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}

	const response = await fetch(`${API_BASE}${path}`, {
		...options,
		headers
	});

	if (response.status === 401) {
		clearToken();
		if (browser) goto('/login');
		throw new Error('Unauthorized');
	}

	if (!response.ok) {
		const error = await response.json().catch(() => ({ detail: response.statusText }));
		throw new Error(error.detail || 'Request failed');
	}

	return response.json();
}

// Auth
export async function signup(data: SignupRequest): Promise<AuthUser> {
	return request<AuthUser>('/signup', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

export async function login(data: LoginRequest): Promise<AuthToken> {
	const response = await fetch(`${API_BASE}/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data)
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ detail: response.statusText }));
		throw new Error(error.detail || 'Invalid credentials');
	}

	const token: AuthToken = await response.json();
	setToken(token.access_token);
	return token;
}

export async function getMe(): Promise<AuthUser> {
	return request<AuthUser>('/users/me');
}

export function logout(): void {
	clearToken();
	if (browser) goto('/login');
}

// Accounts
export async function getAccounts(): Promise<import('$lib/types/account').Account[]> {
	return request<import('$lib/types/account').Account[]>('/accounts');
}

export async function getAccount(id: string): Promise<import('$lib/types/account').Account> {
	return request<import('$lib/types/account').Account>(`/accounts/${id}`);
}

export async function createAccount(data: import('$lib/types/account').AccountCreate): Promise<import('$lib/types/account').Account> {
	return request<import('$lib/types/account').Account>('/accounts', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

export async function updateAccount(id: string, data: import('$lib/types/account').AccountUpdate): Promise<import('$lib/types/account').Account> {
	return request<import('$lib/types/account').Account>(`/accounts/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(data)
	});
}

export async function deleteAccount(id: string): Promise<void> {
	await request(`/accounts/${id}`, { method: 'DELETE' });
}

// Categories
export async function getCategories(): Promise<import('$lib/types/category').Category[]> {
	return request<import('$lib/types/category').Category[]>('/categories');
}

export async function createCategory(data: import('$lib/types/category').CategoryCreate): Promise<import('$lib/types/category').Category> {
	return request<import('$lib/types/category').Category>('/categories', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

export async function updateCategory(id: string, data: import('$lib/types/category').CategoryUpdate): Promise<import('$lib/types/category').Category> {
	return request<import('$lib/types/category').Category>(`/categories/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(data)
	});
}

export async function deleteCategory(id: string): Promise<void> {
	await request(`/categories/${id}`, { method: 'DELETE' });
}

// Subcategories
export async function getSubcategories(): Promise<import('$lib/types/subcategory').Subcategory[]> {
	return request<import('$lib/types/subcategory').Subcategory[]>('/subcategories');
}

export async function createSubcategory(data: import('$lib/types/subcategory').SubcategoryCreate): Promise<import('$lib/types/subcategory').Subcategory> {
	return request<import('$lib/types/subcategory').Subcategory>('/subcategories', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

export async function updateSubcategory(id: string, data: import('$lib/types/subcategory').SubcategoryUpdate): Promise<import('$lib/types/subcategory').Subcategory> {
	return request<import('$lib/types/subcategory').Subcategory>(`/subcategories/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(data)
	});
}

export async function deleteSubcategory(id: string): Promise<void> {
	await request(`/subcategories/${id}`, { method: 'DELETE' });
}

// Currencies
export async function getCurrencies(): Promise<import('$lib/types/currency').Currency[]> {
	return request<import('$lib/types/currency').Currency[]>('/currencies');
}

export async function createCurrency(data: import('$lib/types/currency').CurrencyCreate): Promise<import('$lib/types/currency').Currency> {
	return request<import('$lib/types/currency').Currency>('/currencies', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

export async function updateCurrency(id: string, data: import('$lib/types/currency').CurrencyUpdate): Promise<import('$lib/types/currency').Currency> {
	return request<import('$lib/types/currency').Currency>(`/currencies/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(data)
	});
}

export async function deleteCurrency(id: string): Promise<void> {
	await request(`/currencies/${id}`, { method: 'DELETE' });
}

export { getToken, setToken, clearToken };