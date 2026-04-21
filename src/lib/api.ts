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

export type Currency = "BRL" | "USD" | "EUR";
export type TagNature = "fixed_expense" | "variable_expense" | "income" | "investment";
export type IncomeType = "active" | "passive" | "sporadic";
export type CategoryType = "outcome" | "income";

// ─── Tag Families ─────────────────────────────────────────────────────────────
export interface TagFamily {
  id: string;
  user_id: string;
  name: string;
  nature: TagNature | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Categories ───────────────────────────────────────────────────────────────
export interface Category {
  id: string;
  user_id: string;
  family_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

// ─── Tags ─────────────────────────────────────────────────────────────────────
export interface Tag {
  id: string;
  user_id: string;
  category_id: string;
  type?: "outcome" | "income"; // legacy — kept for backward compat
  income_type: IncomeType | null;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Payment Methods ──────────────────────────────────────────────────────────
export type PaymentMethodType = "debit" | "credit" | "benefit";
// keep legacy alias
export type PaymentMethodCategory = PaymentMethodType;

export interface PaymentMethod {
  id: string;
  user_id: string;
  name: string;
  type: PaymentMethodType;
  account_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Accounts ─────────────────────────────────────────────────────────────────
export type AccountType = "checking" | "savings" | "digital" | "broker" | "wallet" | "benefit" | "credit_card";
export type BalanceMode = "calculated" | "manual";

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  institution: string | null;
  currency: Currency;
  balance_mode: BalanceMode;
  manual_balance: number | null;
  credit_limit: number | null;
  closing_day: number | null;
  due_day: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  balance?: number;
  holdings?: Record<string, number>;
  statement_url?: string;
}

// ─── Invoices ─────────────────────────────────────────────────────────────────
export type InvoiceStatus = "open" | "closed" | "paid";

export interface Invoice {
  id: string;
  user_id: string;
  credit_card_id: string;
  reference_month: string;
  closing_date: string | null;
  due_date: string | null;
  total_amount: number;
  paid_at: string | null;
  status: InvoiceStatus;
  created_at: string;
  updated_at: string;
}

// ─── Transactions ─────────────────────────────────────────────────────────────
export interface Transaction {
  id: string;
  user_id: string;
  tag_id: string;
  account_id: string;
  date_transaction: string;
  value: number;
  currency: Currency;
  description: string | null;
  invoice_id: string | null;
  recurrence_id: string | null;
  is_recurring: boolean;
  quantity: number | null;
  symbol: string | null;
  index_rate: number | null;
  index: string | null;
  index_percentage: number | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedTransactions {
  items: Transaction[];
  total: number;
  page: number;
  page_size: number;
}

export interface TransactionFilter {
  tag_id?: string;
  category_id?: string;
  family_id?: string;
  nature?: TagNature;
  account_id?: string;
  invoice_id?: string;
  currency?: Currency;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

// ─── Liabilities ──────────────────────────────────────────────────────────────
export type LiabilityType = "mortgage" | "vehicle" | "personal_loan" | "student_loan" | "other";

export interface Liability {
  id: string;
  user_id: string;
  name: string;
  type: LiabilityType;
  institution: string | null;
  original_amount: number;
  outstanding_balance: number;
  monthly_payment: number | null;
  interest_rate: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Recurrence Rules ─────────────────────────────────────────────────────────
export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface RecurrenceRule {
  id: string;
  user_id: string;
  name: string;
  tag_id: string;
  account_id: string | null;
  value: number;
  currency: Currency;
  frequency: RecurrenceFrequency;
  interval: number;
  start_date: string;
  end_date: string | null;
  next_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Budgets ──────────────────────────────────────────────────────────────────
export type BudgetScope = "family" | "category";

export interface Budget {
  id: string;
  user_id: string;
  name: string;
  scope: BudgetScope;
  family_id: string | null;
  category_id: string | null;
  amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetProgress extends Omit<Budget, "id"> {
  budget_id: string;
  spent: number;
  remaining: number;
  usage_pct: number;
}

// ─── Net Worth ────────────────────────────────────────────────────────────────
export interface NetWorthHistoryResponse {
  snapshots: NetWorthSnapshot[];
}

export interface NetWorthSnapshot {
  id: string;
  user_id: string;
  date: string;
  financial_assets: number;
  investment_assets: number;
  liabilities_credit: number;
  liabilities_long_term: number;
  net_worth: number;
  created_at: string;
}

export interface NetWorthCurrent {
  financial_assets: number;
  investment_assets: number;
  liabilities_credit: number;
  liabilities_long_term: number;
  net_worth: number;
  as_of: string;
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
  list: (params?: { nature?: TagNature }) => {
    const q = new URLSearchParams();
    if (params?.nature) q.set("nature", params.nature);
    return request<TagFamily[]>(`/finance/tag-families/?${q}`);
  },
  create: (data: { name: string; nature?: TagNature | null }) =>
    request<TagFamily>("/finance/tag-families/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ name: string; nature: TagNature | null; is_active: boolean }>) =>
    request<TagFamily>(`/finance/tag-families/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/finance/tag-families/${id}`, { method: "DELETE" }),
};

// ─── Categories ───────────────────────────────────────────────────────────────
export const categoriesApi = {
  list: (params?: { family_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.family_id) q.set("family_id", params.family_id);
    return request<Category[]>(`/finance/categories/?${q}`);
  },
  create: (data: { name: string; family_id?: string }) =>
    request<Category>("/finance/categories/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ name: string; family_id: string | null }>) =>
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
  create: (data: { name: string; category_id: string; income_type?: IncomeType | null }) =>
    request<Tag>("/finance/tags/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ name: string; income_type: IncomeType | null; is_active: boolean; category_id: string }>) =>
    request<Tag>(`/finance/tags/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/finance/tags/${id}`, { method: "DELETE" }),
};

// ─── Payment Methods ──────────────────────────────────────────────────────────
export const paymentMethodsApi = {
  list: (params?: { is_active?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.is_active !== undefined) q.set("is_active", String(params.is_active));
    return request<PaymentMethod[]>(`/finance/payment-methods/?${q}`);
  },
  create: (data: { name: string; type: PaymentMethodType; account_id: string }) =>
    request<PaymentMethod>("/finance/payment-methods/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ name: string; type: PaymentMethodType; is_active: boolean }>) =>
    request<PaymentMethod>(`/finance/payment-methods/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/finance/payment-methods/${id}`, { method: "DELETE" }),
};

// ─── Credit Cards ───────────────────────────────────────────────────────────────
export interface CreditCard {
  id: string;
  payment_method_id: string;
  user_id: string;
  name: string;
  limit_amount: number;
  due_day: number;
  closing_offset: number;
  current_balance: number;
  is_active: boolean;
  closing_day: number;
  created_at: string;
  updated_at: string;
}

export const creditCardsApi = {
  list: (params?: { is_active?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.is_active !== undefined) q.set("is_active", String(params.is_active));
    return request<CreditCard[]>(`/finance/credit-cards/?${q}`);
  },
  get: (id: string) => request<CreditCard>(`/finance/credit-cards/${id}`),
  create: (data: { payment_method_id: string; name: string; limit_amount: number; due_day: number; closing_offset?: number }) =>
    request<CreditCard>("/finance/credit-cards/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ name: string; limit_amount: number; due_day: number; closing_offset: number; is_active: boolean }>) =>
    request<CreditCard>(`/finance/credit-cards/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/finance/credit-cards/${id}`, { method: "DELETE" }),
};

// ─── Accounts ─────────────────────────────────────────────────────────────────
export const accountsApi = {
  list: (params?: { is_active?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.is_active !== undefined) q.set("is_active", String(params.is_active));
    return request<Account[]>(`/finance/accounts/?${q}`);
  },
  get: (id: string) => request<Account>(`/finance/accounts/${id}`),
  create: (data: {
    name: string;
    type: AccountType;
    institution?: string | null;
    currency?: Currency;
    balance_mode?: BalanceMode;
    manual_balance?: number | null;
    credit_limit?: number | null;
    closing_day?: number | null;
    due_day?: number | null;
  }) => request<Account>("/finance/accounts/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Omit<Account, "id" | "user_id" | "created_at" | "updated_at" | "balance">>) =>
    request<Account>(`/finance/accounts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/finance/accounts/${id}`, { method: "DELETE" }),
  statement: (id: string, params?: { date_from?: string; date_to?: string }) => {
    const q = new URLSearchParams();
    if (params?.date_from) q.set("date_from", params.date_from);
    if (params?.date_to) q.set("date_to", params.date_to);
    return request<Transaction[]>(`/finance/accounts/${id}/statement?${q}`);
  },
};

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const invoicesApi = {
  list: (params?: { credit_card_id?: string; status?: InvoiceStatus }) => {
    const q = new URLSearchParams();
    if (params?.credit_card_id) q.set("credit_card_id", params.credit_card_id);
    if (params?.status) q.set("status", params.status);
    return request<Invoice[]>(`/finance/invoices/?${q}`);
  },
  get: (id: string) => request<Invoice & { transactions: Transaction[] }>(`/finance/invoices/${id}`),
  current: (credit_card_id: string) =>
    request<Invoice | null>(`/finance/invoices/current?credit_card_id=${credit_card_id}`),
  create: (data: { credit_card_id: string; reference_month: string; closing_date?: string; due_date?: string }) =>
    request<Invoice>("/finance/invoices/", { method: "POST", body: JSON.stringify(data) }),
  pay: (id: string, data: { payment_account_id: string }) =>
    request<Invoice>(`/finance/invoices/${id}/pay`, { method: "POST", body: JSON.stringify(data) }),
};

// ─── Monthly Summary ───────────────────────────────────────────────────
export interface MonthlySummary {
  month: number;
  year: number;
  total_income: number;
  total_fixed_expense: number;
  total_variable_expense: number;
  total_investment: number;
  total_expense: number;
  balance: number;
  saving_rate: number;
  income_by_type: { active?: number; passive?: number; sporadic?: number };
  by_family: { family_name: string; nature: string; total: number }[];
  top_tags: { tag_name: string; category_name: string; family_name: string; total: number }[];
  has_foreign_currency: boolean;
}

// ─── Transactions ─────────────────────────────────────────────────────────────
export const transactionsApi = {
  list: (params?: {
    tag_id?: string;
    category_id?: string;
    family_id?: string;
    nature?: TagNature;
    account_id?: string;
    invoice_id?: string;
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
    if (params?.nature) q.set("nature", params.nature);
    if (params?.account_id) q.set("account_id", params.account_id);
    if (params?.invoice_id) q.set("invoice_id", params.invoice_id);
    if (params?.currency) q.set("currency", params.currency);
    if (params?.date_from) q.set("date_from", params.date_from);
    if (params?.date_to) q.set("date_to", params.date_to);
    if (params?.page) q.set("page", String(params.page));
    if (params?.page_size) q.set("page_size", String(params.page_size));
    return request<PaginatedTransactions>(`/finance/transactions/?${q}`);
  },
  summary: (month?: string) => {
    const url = month ? `/finance/transactions/summary?month=${month}` : "/finance/transactions/summary";
    return request<MonthlySummary>(url);
  },
  create: (data: {
    tag_id: string;
    account_id?: string | null;
    date_transaction: string;
    value: number;
    currency: Currency;
    description?: string | null;
    quantity?: number;
    symbol?: string;
    index_rate?: number;
    index?: string;
    index_percentage?: number;
    is_recurring?: boolean;
  }) =>
    request<Transaction>("/finance/transactions/", { method: "POST", body: JSON.stringify(data) }),
  get: (id: string) => request<Transaction>(`/finance/transactions/${id}`),
  update: (id: string, data: Partial<Omit<Transaction, "id" | "user_id" | "created_at" | "updated_at">>) =>
    request<Transaction>(`/finance/transactions/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/finance/transactions/${id}`, { method: "DELETE" }),
};

// ─── Liabilities ──────────────────────────────────────────────────────────────
export const liabilitiesApi = {
  list: (params?: { is_active?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.is_active !== undefined) q.set("is_active", String(params.is_active));
    return request<Liability[]>(`/finance/liabilities/?${q}`);
  },
  get: (id: string) => request<Liability>(`/finance/liabilities/${id}`),
  create: (data: {
    name: string;
    type: LiabilityType;
    institution?: string | null;
    original_amount: number;
    outstanding_balance: number;
    monthly_payment?: number | null;
    interest_rate?: number | null;
    start_date?: string | null;
    end_date?: string | null;
  }) => request<Liability>("/finance/liabilities/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Omit<Liability, "id" | "user_id" | "created_at" | "updated_at">>) =>
    request<Liability>(`/finance/liabilities/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/finance/liabilities/${id}`, { method: "DELETE" }),
};

// ─── Recurrence Rules ─────────────────────────────────────────────────────────
export const recurrencesApi = {
  list: (params?: { is_active?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.is_active !== undefined) q.set("is_active", String(params.is_active));
    return request<RecurrenceRule[]>(`/finance/recurrences/?${q}`);
  },
  get: (id: string) => request<RecurrenceRule>(`/finance/recurrences/${id}`),
  create: (data: {
    name: string;
    tag_id: string;
    account_id?: string | null;
    value: number;
    currency?: Currency;
    frequency: RecurrenceFrequency;
    interval?: number;
    start_date: string;
    end_date?: string | null;
  }) => request<RecurrenceRule>("/finance/recurrences/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Omit<RecurrenceRule, "id" | "user_id" | "created_at" | "updated_at">>) =>
    request<RecurrenceRule>(`/finance/recurrences/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/finance/recurrences/${id}`, { method: "DELETE" }),
};

// ─── Budgets ──────────────────────────────────────────────────────────────────
export const budgetsApi = {
  list: (params?: { is_active?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.is_active !== undefined) q.set("is_active", String(params.is_active));
    return request<Budget[]>(`/finance/budgets/?${q}`);
  },
  progress: (month: string) =>
    request<BudgetProgress[]>(`/finance/budgets/progress?month=${month}`),
  create: (data: { name: string; scope: BudgetScope; family_id?: string | null; category_id?: string | null; amount: number }) =>
    request<Budget>("/finance/budgets/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Omit<Budget, "id" | "user_id" | "created_at" | "updated_at">>) =>
    request<Budget>(`/finance/budgets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/finance/budgets/${id}`, { method: "DELETE" }),
};

// ─── Net Worth ────────────────────────────────────────────────────────────────
export const netWorthApi = {
  current: () => request<NetWorthCurrent>("/finance/net-worth/current"),
  history: (months?: number) =>
    request<NetWorthHistoryResponse>(`/finance/net-worth/history?months=${months ?? 12}`),
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
