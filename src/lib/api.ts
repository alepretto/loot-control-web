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

// Credit Cards
export async function getCreditCards(): Promise<import('$lib/types/credit_card').CreditCard[]> {
	return request<import('$lib/types/credit_card').CreditCard[]>('/credit-cards');
}

export async function getCreditCard(id: string): Promise<import('$lib/types/credit_card').CreditCard> {
	return request<import('$lib/types/credit_card').CreditCard>(`/credit-cards/${id}`);
}

export async function createCreditCard(data: import('$lib/types/credit_card').CreditCardCreate): Promise<import('$lib/types/credit_card').CreditCard> {
	return request<import('$lib/types/credit_card').CreditCard>('/credit-cards', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

export async function updateCreditCard(id: string, data: import('$lib/types/credit_card').CreditCardUpdate): Promise<import('$lib/types/credit_card').CreditCard> {
	return request<import('$lib/types/credit_card').CreditCard>(`/credit-cards/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(data)
	});
}

export async function deleteCreditCard(id: string): Promise<void> {
	await request(`/credit-cards/${id}`, { method: 'DELETE' });
}

// Credit Card Statements
export async function getCreditCardStatements(): Promise<import('$lib/types/credit_card_statement').CreditCardStatement[]> {
	return request<import('$lib/types/credit_card_statement').CreditCardStatement[]>('/credit-card-statements');
}

export async function getCreditCardStatement(id: string): Promise<import('$lib/types/credit_card_statement').CreditCardStatement> {
	return request<import('$lib/types/credit_card_statement').CreditCardStatement>(`/credit-card-statements/${id}`);
}

export async function createCreditCardStatement(data: import('$lib/types/credit_card_statement').CreditCardStatementCreate): Promise<import('$lib/types/credit_card_statement').CreditCardStatement> {
	return request<import('$lib/types/credit_card_statement').CreditCardStatement>('/credit-card-statements', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

export async function updateCreditCardStatement(id: string, data: import('$lib/types/credit_card_statement').CreditCardStatementUpdate): Promise<import('$lib/types/credit_card_statement').CreditCardStatement> {
	return request<import('$lib/types/credit_card_statement').CreditCardStatement>(`/credit-card-statements/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(data)
	});
}

export async function deleteCreditCardStatement(id: string): Promise<void> {
	await request(`/credit-card-statements/${id}`, { method: 'DELETE' });
}

// Transactions
export async function getTransactions(params?: { account_id?: string; statement_id?: string }): Promise<import('$lib/types/transaction').Transaction[]> {
	let path = '/transactions';
	if (params) {
		const search = new URLSearchParams();
		if (params.account_id) search.set('account_id', params.account_id);
		if (params.statement_id) search.set('statement_id', params.statement_id);
		const qs = search.toString();
		if (qs) path += '?' + qs;
	}
	return request<import('$lib/types/transaction').Transaction[]>(path);
}

export async function getTransaction(id: string): Promise<import('$lib/types/transaction').Transaction> {
	return request<import('$lib/types/transaction').Transaction>(`/transactions/${id}`);
}

export async function createTransaction(data: import('$lib/types/transaction').TransactionCreate): Promise<import('$lib/types/transaction').Transaction> {
	return request<import('$lib/types/transaction').Transaction>('/transactions', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

export async function updateTransaction(id: string, data: import('$lib/types/transaction').TransactionUpdate): Promise<import('$lib/types/transaction').Transaction> {
	return request<import('$lib/types/transaction').Transaction>(`/transactions/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(data)
	});
}

export async function deleteTransaction(id: string): Promise<void> {
	await request(`/transactions/${id}`, { method: 'DELETE' });
}

// Investments
export async function getInvestments(): Promise<import('$lib/types/investment').Investment[]> {
	return request<import('$lib/types/investment').Investment[]>('/investments');
}

export async function getInvestment(id: string): Promise<import('$lib/types/investment').Investment> {
	return request<import('$lib/types/investment').Investment>(`/investments/${id}`);
}

export async function createInvestment(data: import('$lib/types/investment').InvestmentCreate): Promise<import('$lib/types/investment').Investment> {
	return request<import('$lib/types/investment').Investment>('/investments', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

export async function updateInvestment(id: string, data: import('$lib/types/investment').InvestmentUpdate): Promise<import('$lib/types/investment').Investment> {
	return request<import('$lib/types/investment').Investment>(`/investments/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(data)
	});
}

export async function deleteInvestment(id: string): Promise<void> {
	await request(`/investments/${id}`, { method: 'DELETE' });
}

// Portfolio
export async function getPortfolio(): Promise<import('$lib/types/investment').PortfolioSummary> {
	return request<import('$lib/types/investment').PortfolioSummary>('/investments/portfolio');
}

export async function getPortfolioTimeline(start_date?: string, end_date?: string): Promise<import('$lib/types/investment').TimelineEntry[]> {
	let path = '/investments/portfolio/timeline';
	const params: string[] = [];
	if (start_date) params.push(`start_date=${encodeURIComponent(start_date)}`);
	if (end_date) params.push(`end_date=${encodeURIComponent(end_date)}`);
	if (params.length) path += '?' + params.join('&');
	return request<import('$lib/types/investment').TimelineEntry[]>(path);
}

// Asset Prices
export async function getAssetPrices(symbol?: string): Promise<import('$lib/types/asset_price').AssetPrice[]> {
	let path = '/asset-prices';
	if (symbol) path += `?symbol=${encodeURIComponent(symbol)}`;
	return request<import('$lib/types/asset_price').AssetPrice[]>(path);
}

export async function getLatestAssetPrice(symbol: string): Promise<import('$lib/types/asset_price').AssetPrice> {
	return request<import('$lib/types/asset_price').AssetPrice>(`/asset-prices/latest?symbol=${encodeURIComponent(symbol)}`);
}

export async function createAssetPrice(data: import('$lib/types/asset_price').AssetPriceCreate): Promise<import('$lib/types/asset_price').AssetPrice> {
	return request<import('$lib/types/asset_price').AssetPrice>('/asset-prices', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

// Exchange Rates
export async function getExchangeRates(from_currency?: string, to_currency?: string): Promise<import('$lib/types/exchange_rate').ExchangeRate[]> {
	const params: string[] = [];
	if (from_currency) params.push(`from_currency=${encodeURIComponent(from_currency)}`);
	if (to_currency) params.push(`to_currency=${encodeURIComponent(to_currency)}`);
	const path = '/exchange-rates' + (params.length ? '?' + params.join('&') : '');
	return request<import('$lib/types/exchange_rate').ExchangeRate[]>(path);
}

export async function getLatestExchangeRate(from_currency: string, to_currency: string = 'BRL'): Promise<import('$lib/types/exchange_rate').ExchangeRate> {
	return request<import('$lib/types/exchange_rate').ExchangeRate>(`/exchange-rates/latest?from_currency=${encodeURIComponent(from_currency)}&to_currency=${encodeURIComponent(to_currency)}`);
}

export async function getExchangeRateOnDate(from_currency: string, to_currency: string, date: string): Promise<import('$lib/types/exchange_rate').ExchangeRate> {
	return request<import('$lib/types/exchange_rate').ExchangeRate>(`/exchange-rates/on-date?from_currency=${encodeURIComponent(from_currency)}&to_currency=${encodeURIComponent(to_currency)}&date=${encodeURIComponent(date)}`);
}

export async function createExchangeRate(data: import('$lib/types/exchange_rate').ExchangeRateCreate): Promise<import('$lib/types/exchange_rate').ExchangeRate> {
	return request<import('$lib/types/exchange_rate').ExchangeRate>('/exchange-rates', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

// User Preferences
export async function updateUserPreferences(data: import('$lib/types/auth').UserPreferencesUpdate): Promise<import('$lib/types/auth').AuthUser> {
	return request<import('$lib/types/auth').AuthUser>('/users/me/preferences', {
		method: 'PATCH',
		body: JSON.stringify(data)
	});
}

// Admin
export async function updateExchangeRates(data: import('$lib/types/auth').UpdateExchangeRatesRequest): Promise<import('$lib/types/auth').UpdateExchangeRatesResponse> {
	return request<import('$lib/types/auth').UpdateExchangeRatesResponse>('/admin/update-exchange-rates', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

export { getToken, setToken, clearToken };