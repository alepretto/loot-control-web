import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    await supabase.auth.signOut();
    window.location.href = "/login";
    return {};
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...headers, ...options.headers },
  });

  if (res.status === 401) {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobStatus {
  id: string;
  name: string;
  description: string;
  schedule: string;
  next_run_time: string | null;
  last_run_date: string | null;
}

export type CategoryType = "outcome" | "income";
export type Currency = "BRL" | "USD" | "EUR";

export interface TagFamily {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  family_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  category_id: string;
  type: CategoryType;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  tag_id: string;
  date_transaction: string;
  value: number;
  currency: Currency;
  payment_method_id: string | null;
  quantity: number | null;
  symbol: string | null;
  index_rate: number | null;
  index: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Payment Methods ──────────────────────────────────────────────────────────
export type PaymentMethodCategory = "money" | "benefit";

export interface PaymentMethod {
  id: string;
  user_id: string;
  name: string;
  category: PaymentMethodCategory;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const paymentMethodsApi = {
  list: (params?: { is_active?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.is_active !== undefined) q.set("is_active", String(params.is_active));
    return request<PaymentMethod[]>(`/finance/payment-methods/?${q}`);
  },
  create: (data: { name: string; category: PaymentMethodCategory }) =>
    request<PaymentMethod>("/finance/payment-methods/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ name: string; category: PaymentMethodCategory; is_active: boolean }>) =>
    request<PaymentMethod>(`/finance/payment-methods/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/finance/payment-methods/${id}`, { method: "DELETE" }),
};

export interface PaginatedTransactions {
  items: Transaction[];
  total: number;
  page: number;
  page_size: number;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  first_name: string;
  last_name: string;
  telegram_id: string | null;
  created_at: string;
  updated_at: string;
}

export const usersApi = {
  create: (data: { email: string; username: string; first_name: string; last_name: string }) =>
    request<User>("/users/", { method: "POST", body: JSON.stringify(data) }),
  me: () => request<User>("/users/me"),
  update: (data: Partial<{ first_name: string; last_name: string; username: string }>) =>
    request<User>("/users/me", { method: "PATCH", body: JSON.stringify(data) }),
};

// ─── Tag Families ─────────────────────────────────────────────────────────────
export const tagFamiliesApi = {
  list: () => request<TagFamily[]>("/finance/tag-families/"),
  create: (data: { name: string }) =>
    request<TagFamily>("/finance/tag-families/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ name: string }>) =>
    request<TagFamily>(`/finance/tag-families/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/finance/tag-families/${id}`, { method: "DELETE" }),
};

// ─── Categories ───────────────────────────────────────────────────────────────
export const categoriesApi = {
  list: () => request<Category[]>("/finance/categories/"),
  create: (data: { name: string; family_id?: string }) =>
    request<Category>("/finance/categories/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ name: string; family_id: string | null }>) =>
    request<Category>(`/finance/categories/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/finance/categories/${id}`, { method: "DELETE" }),
};

// ─── Tags ─────────────────────────────────────────────────────────────────────
export const tagsApi = {
  list: (params?: { category_id?: string; type?: CategoryType; is_active?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.category_id) q.set("category_id", params.category_id);
    if (params?.type) q.set("type", params.type);
    if (params?.is_active !== undefined) q.set("is_active", String(params.is_active));
    return request<Tag[]>(`/finance/tags/?${q}`);
  },
  create: (data: { name: string; category_id: string; type: CategoryType }) =>
    request<Tag>("/finance/tags/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ name: string; type: CategoryType; is_active: boolean; category_id: string }>) =>
    request<Tag>(`/finance/tags/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/finance/tags/${id}`, { method: "DELETE" }),
};

// ─── Transactions ─────────────────────────────────────────────────────────────
export const transactionsApi = {
  list: (params?: {
    tag_id?: string;
    category_id?: string;
    family_id?: string;
    currency?: Currency;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.tag_id) q.set("tag_id", params.tag_id);
    if (params?.category_id) q.set("category_id", params.category_id);
    if (params?.family_id) q.set("family_id", params.family_id);
    if (params?.currency) q.set("currency", params.currency);
    if (params?.date_from) q.set("date_from", params.date_from);
    if (params?.date_to) q.set("date_to", params.date_to);
    if (params?.page) q.set("page", String(params.page));
    if (params?.page_size) q.set("page_size", String(params.page_size));
    return request<PaginatedTransactions>(`/finance/transactions/?${q}`);
  },
  create: (data: {
    tag_id: string;
    date_transaction: string;
    value: number;
    currency: Currency;
    payment_method_id?: string | null;
    quantity?: number;
    symbol?: string;
    index_rate?: number;
    index?: string;
  }) =>
    request<Transaction>("/finance/transactions/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Omit<Transaction, "id" | "user_id" | "created_at" | "updated_at">>) =>
    request<Transaction>(`/finance/transactions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) => request<void>(`/finance/transactions/${id}`, { method: "DELETE" }),
};

// ─── Market Data ──────────────────────────────────────────────────────────────
export interface ExchangeRates {
  USD: number | null;
  EUR: number | null;
}

export interface AssetPriceItem {
  symbol: string;
  price: number;
  currency: string;
}

export interface ExchangeRateHistoryItem {
  date: string;
  USD: number | null;
  EUR: number | null;
}

export interface AssetPriceHistoryItem {
  date: string;
  symbol: string;
  price: number;
  currency: string;
}

export interface CdiRateItem {
  date: string;
  rate_pct: number;
}

export const marketDataApi = {
  exchangeRates: () => request<ExchangeRates>("/finance/market-data/exchange-rates/latest"),
  assetPrices: () => request<{ prices: AssetPriceItem[] }>("/finance/market-data/asset-prices/latest"),
  exchangeRateHistory: () => request<ExchangeRateHistoryItem[]>("/finance/market-data/exchange-rates/history"),
  assetPriceHistory: () => request<AssetPriceHistoryItem[]>("/finance/market-data/asset-prices/history"),
  cdiHistory: (dateFrom: string, dateTo: string) =>
    request<CdiRateItem[]>(`/finance/market-data/cdi/history?date_from=${dateFrom}&date_to=${dateTo}`),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export interface HistoricalLoadResult {
  exchange_rates: { loaded: number; pairs: string[] };
  crypto:         { loaded: number; symbols: string[] };
  br_stocks:      { loaded: number; tickers: string[] };
  us_stocks:      { loaded: number; tickers: string[] };
}

// ─── Mini App ─────────────────────────────────────────────────────────────────
export const miniApi = {
  linkTelegram: (initData: string) =>
    request<{ linked: boolean; telegram_id: string }>("/mini/auth/telegram", {
      method: "POST",
      body: JSON.stringify({ init_data: initData }),
    }),
};

// ─── Agent ────────────────────────────────────────────────────────────────────
export const agentApi = {
  chat: (message: string) =>
    request<{ response: string }>("/agent/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminApi = {
  listJobs: () => request<{ jobs: JobStatus[] }>("/admin/jobs"),
  runJob: (jobId: string) =>
    request<{ job_id: string; status: string; message: string }>(`/admin/jobs/${jobId}/run`, { method: "POST" }),
  historicalLoad: (dateFrom: string, dateTo: string) =>
    request<HistoricalLoadResult>("/admin/historical-load", {
      method: "POST",
      body: JSON.stringify({ date_from: dateFrom, date_to: dateTo }),
    }),
};
