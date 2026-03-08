import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...headers, ...options.headers },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type CategoryType = "outcome" | "income";
export type Currency = "BRL" | "USD" | "EUR";

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  category_id: string;
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
  quantity: number | null;
  symbol: string | null;
  index_rate: number | null;
  index: string | null;
  created_at: string;
  updated_at: string;
}

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
};

// ─── Categories ───────────────────────────────────────────────────────────────
export const categoriesApi = {
  list: (type?: CategoryType) =>
    request<Category[]>(`/finance/categories/${type ? `?type=${type}` : ""}`),
  create: (data: { name: string; type: CategoryType }) =>
    request<Category>("/finance/categories/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ name: string; type: CategoryType }>) =>
    request<Category>(`/finance/categories/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/finance/categories/${id}`, { method: "DELETE" }),
};

// ─── Tags ─────────────────────────────────────────────────────────────────────
export const tagsApi = {
  list: (params?: { category_id?: string; is_active?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.category_id) q.set("category_id", params.category_id);
    if (params?.is_active !== undefined) q.set("is_active", String(params.is_active));
    return request<Tag[]>(`/finance/tags/?${q}`);
  },
  create: (data: { name: string; category_id: string }) =>
    request<Tag>("/finance/tags/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ name: string; is_active: boolean }>) =>
    request<Tag>(`/finance/tags/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/finance/tags/${id}`, { method: "DELETE" }),
};

// ─── Transactions ─────────────────────────────────────────────────────────────
export const transactionsApi = {
  list: (params?: {
    tag_id?: string;
    currency?: Currency;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.tag_id) q.set("tag_id", params.tag_id);
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
