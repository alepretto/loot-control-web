"use client";

import { useCallback, useEffect, useMemo, useState, use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Category, Currency, PaginatedTransactions, Tag, TagNature, TagFamily, Transaction, PaymentMethod, MonthlySummary, Account, CreditCard, Invoice,
  categoriesApi, tagsApi, tagFamiliesApi, transactionsApi, paymentMethodsApi, accountsApi, creditCardsApi, invoicesApi,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { TransactionRow, TX_GRID } from "@/components/transactions/TransactionRow";
import { AddTransactionModal } from "@/components/transactions/AddTransactionModal";
import { EditTransactionModal } from "@/components/transactions/EditTransactionModal";
import { ImportModal } from "@/components/transactions/ImportModal";

// ─── Date grouping helpers ────────────────────────────────────────────────────
const MONTHS_PT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

function localDateKey(dateStr: string, tz: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(dateStr));
}

function dateLabel(key: string, tz: string): string {
  const today = localDateKey(new Date().toISOString(), tz);
  const yesterday = localDateKey(new Date(Date.now() - 86400000).toISOString(), tz);
  if (key === today) return "Hoje";
  if (key === yesterday) return "Ontem";
  const [year, month, day] = key.split("-").map(Number);
  const currentYear = new Date().getFullYear();
  return year === currentYear
    ? `${day} ${MONTHS_PT[month - 1]}`
    : `${day} ${MONTHS_PT[month - 1]} ${year}`;
}

interface DateGroup {
  key: string;
  label: string;
  items: Transaction[];
  net: number;
}

function buildGroups(
  items: Transaction[],
  tags: Tag[],
  categories: Category[],
  families: TagFamily[],
  tz: string,
  convertToDisplay: (value: number, fromCurrency: string) => number,
): DateGroup[] {
  const map = new Map<string, Transaction[]>();
  for (const tx of items) {
    const k = localDateKey(tx.date_transaction, tz);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(tx);
  }
  return Array.from(map.entries()).map(([key, txs]) => {
    const net = txs.reduce((acc, tx) => {
      const tag = tags.find(t => t.id === tx.tag_id);
      const cat = categories.find(c => c.id === tag?.category_id);
      const family = families.find(f => f.id === cat?.family_id);
      const sign = family?.nature === "income" ? 1 : -1;
      return acc + sign * convertToDisplay(tx.value, tx.currency);
    }, 0);
    return { key, label: dateLabel(key, tz), items: txs, net };
  });
}

// ─── Filter bottom sheet ──────────────────────────────────────────────────────
function FilterSheet({ open, onClose, filters, families, filteredCategories, filteredTags, onFilter, onClear }: {
  open: boolean; onClose: () => void; filters: Record<string, string>;
  families: TagFamily[]; filteredCategories: Category[]; filteredTags: Tag[];
  onFilter: (key: string, val: string) => void; onClear: () => void;
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const selectCls = "w-full bg-surface border border-border rounded-xl px-3.5 py-3 text-sm text-text-primary focus:outline-none focus:border-primary/60 transition-all";
  const labelCls = "block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2";
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <>
      <div className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose} />
      <div className={`fixed bottom-0 inset-x-0 z-[60] transition-transform duration-300 ease-out ${open ? "translate-y-0" : "translate-y-full"}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="bg-surface-2 rounded-t-2xl border-t border-border">
          <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-border" /></div>
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-base font-semibold text-text-primary">Filtros</h2>
            {hasFilters && (
              <button onClick={() => { onClear(); onClose(); }} className="text-xs text-danger hover:text-danger/80 transition-colors">Limpar todos</button>
            )}
          </div>
          <div className="px-5 pb-6 space-y-4">
            <div>
              <label className={labelCls}>Natureza</label>
              <select value={filters.nature} onChange={e => onFilter("nature", e.target.value)} className={selectCls}>
                <option value="">Todas</option>
                <option value="income">Receita</option>
                <option value="fixed_expense">Custo Fixo</option>
                <option value="variable_expense">Custo Variável</option>
                <option value="investment">Investimento</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Família</label>
              <select value={filters.family_id} onChange={e => onFilter("family_id", e.target.value)} className={selectCls}>
                <option value="">Todas</option>
                {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Categoria</label>
              <select value={filters.category_id} onChange={e => onFilter("category_id", e.target.value)} className={selectCls}>
                <option value="">Todas</option>
                {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Tag</label>
              <select value={filters.tag_id} onChange={e => onFilter("tag_id", e.target.value)} className={selectCls}>
                <option value="">Todas</option>
                {filteredTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Moeda</label>
              <select value={filters.currency} onChange={e => onFilter("currency", e.target.value)} className={selectCls}>
                <option value="">Todas</option><option>BRL</option><option>USD</option><option>EUR</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Período</label>
              <div className="flex items-center gap-2">
                <input type="date" value={filters.date_from} onChange={e => onFilter("date_from", e.target.value)} className={`${selectCls} flex-1 [color-scheme:dark]`} />
                <span className="text-muted text-xs shrink-0">até</span>
                <input type="date" value={filters.date_to} onChange={e => onFilter("date_to", e.target.value)} className={`${selectCls} flex-1 [color-scheme:dark]`} />
              </div>
            </div>
            <button onClick={onClose} className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-colors mt-2">Aplicar filtros</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { timezone, displayCurrency, convertToDisplay } = useSettings();
  const [data, setData] = useState<PaginatedTransactions | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [families, setFamilies] = useState<TagFamily[]>([]);
  const [page, setPage] = useState(1);
  const [showImport, setShowImport] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    nature: "", currency: "", date_from: "", date_to: "",
    family_id: "", category_id: "", tag_id: "", account_id: "",
  });
  
  // Read account_id from query params on mount
  useEffect(() => {
    const accountId = searchParams.get("account_id");
    if (accountId) {
      setFilters(prev => ({ ...prev, account_id: accountId }));
    }
  }, [searchParams]);

  // Carrega tudo (uso inicial)
  const load = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        transactionsApi.list({
          page, page_size: 20,
          nature: (filters.nature as TagNature) || undefined,
          currency: (filters.currency as Currency) || undefined,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to ? `${filters.date_to}T23:59:59` : undefined,
          family_id: filters.family_id || undefined,
          category_id: filters.category_id || undefined,
          tag_id: filters.tag_id || undefined,
          account_id: filters.account_id || undefined,
        }),
        categoriesApi.list(),
        tagsApi.list(),
        tagFamiliesApi.list(),
        accountsApi.list({ is_active: true }),
        paymentMethodsApi.list(),
        creditCardsApi.list({ is_active: true }),
        transactionsApi.summary(),
        invoicesApi.list(),
      ]);
      const txData = results[0].status === "fulfilled" ? results[0].value : { items: [] };
      const cats = results[1].status === "fulfilled" ? results[1].value : [];
      const tagList = results[2].status === "fulfilled" ? results[2].value : [];
      const familyList = results[3].status === "fulfilled" ? results[3].value : [];
      const acctList = results[4].status === "fulfilled" ? results[4].value : [];
      const pmList = results[5].status === "fulfilled" ? results[5].value : [];
      const ccList = results[6].status === "fulfilled" ? results[6].value : [];
      const summ = results[7].status === "fulfilled" ? results[7].value : null;
      const invList = results[8].status === "fulfilled" ? results[8].value : [];
      setData(txData as PaginatedTransactions);
      setCategories(cats as Category[]);
      setTags(tagList as Tag[]);
      setFamilies(familyList as TagFamily[]);
      setAccounts(acctList as Account[]);
      setPaymentMethods(pmList as PaymentMethod[]);
      setCreditCards(ccList as CreditCard[]);
      setInvoices(invList as Invoice[]);
      setSummary(summ as MonthlySummary | null);
    } catch (e) {
      console.error("load error:", e);
    }
  }, [page, filters]);

  // Carrega só transações e faturas (após save - muito mais rápido!)
  const loadTransactionsOnly = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        transactionsApi.list({
          page, page_size: 20,
          nature: (filters.nature as TagNature) || undefined,
          currency: (filters.currency as Currency) || undefined,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to ? `${filters.date_to}T23:59:59` : undefined,
          family_id: filters.family_id || undefined,
          category_id: filters.category_id || undefined,
          tag_id: filters.tag_id || undefined,
          account_id: filters.account_id || undefined,
        }),
        transactionsApi.summary(),
        invoicesApi.list(),
      ]);
      const txData = results[0].status === "fulfilled" ? results[0].value : { items: [] };
      const summ = results[1].status === "fulfilled" ? results[1].value : null;
      const invList = results[2].status === "fulfilled" ? results[2].value : [];
      setData(txData as PaginatedTransactions);
      setInvoices(invList as Invoice[]);
      setSummary(summ as MonthlySummary | null);
    } catch (e) {
      console.error("loadTransactionsOnly error:", e);
    }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  function setFilter(key: string, value: string) {
    setFilters(prev => {
      const next = { ...prev, [key]: value };
      if (key === "nature") { next.family_id = ""; next.category_id = ""; next.tag_id = ""; }
      if (key === "family_id") { next.category_id = ""; next.tag_id = ""; }
      if (key === "category_id") next.tag_id = "";
      return next;
    });
    setPage(1);
  }

  function clearFilters() {
    setFilters({ nature: "", currency: "", date_from: "", date_to: "", family_id: "", category_id: "", tag_id: "", account_id: "" });
    setSearch("");
    setPage(1);
  }

  // Client-side search filter
  const filteredItems = useMemo(() => {
    if (!data?.items || !search.trim()) return data?.items ?? [];
    const q = search.toLowerCase();
    const tagMap = new Map(tags.map(t => [t.id, t]));
    const catMap = new Map(categories.map(c => [c.id, c]));
    const famMap = new Map(families.map(f => [f.id, f]));
    return data.items.filter(tx => {
      if (tx.description?.toLowerCase().includes(q)) return true;
      const tag = tagMap.get(tx.tag_id);
      if (tag?.name.toLowerCase().includes(q)) return true;
      if (tag) {
        const cat = catMap.get(tag.category_id);
        if (cat?.name.toLowerCase().includes(q)) return true;
        if (cat?.family_id) {
          const fam = famMap.get(cat.family_id);
          if (fam?.name.toLowerCase().includes(q)) return true;
        }
      }
      const acct = accounts.find(a => a.id === tx.account_id);
      if (acct?.name.toLowerCase().includes(q)) return true;
      if (tx.symbol?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [data?.items, search, tags, categories, families, accounts]);

  const totalPages = data ? Math.ceil(data.total / 20) : 1;
  const hasFilters = Object.values(filters).some(Boolean) || search.trim() !== "";
  const activeFilterCount = Object.values(filters).filter(Boolean).length + (search.trim() ? 1 : 0);

  const filteredCategories = filters.family_id
    ? categories.filter(c => c.family_id === filters.family_id)
    : categories;
  const filteredTags = filters.category_id
    ? tags.filter(t => t.category_id === filters.category_id)
    : filters.family_id
    ? tags.filter(t => filteredCategories.some(c => c.id === t.category_id))
    : tags;

  const groups = buildGroups(filteredItems, tags, categories, families, timezone, convertToDisplay);

  const selectCls = (active: boolean) =>
    `bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors ${
      active ? "border-primary/60 text-primary" : "border-border text-text-secondary hover:border-surface-3"
    }`;

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-surface shrink-0">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Lançamentos</h1>
            <p className="text-xs text-muted mt-0.5 font-mono">
              {data ? `${data.total} registros` : "Carregando…"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilterSheet(true)}
              className={`md:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                hasFilters ? "bg-primary/10 border-primary/30 text-primary" : "bg-surface-2 border-border text-text-secondary"
              }`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              {activeFilterCount > 0 && <span className="text-xs font-bold">{activeFilterCount}</span>}
            </button>
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-surface-2 border border-border rounded-lg text-sm text-muted hover:text-text-primary hover:bg-surface-3 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="hidden sm:inline">Importar</span>
            </button>
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Novo
            </button>
          </div>
        </div>

        {/* Summary bar */}
        {summary && (
          <div className="grid grid-cols-5 divide-x divide-border border-t border-border mx-5 mt-3 mb-3 rounded-xl overflow-hidden">
            <div className="px-3 py-2">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-muted">Receita</div>
              <div className="font-mono text-[13px] font-semibold text-accent">+{formatCurrency(summary.total_income, "BRL")}</div>
            </div>
            <div className="px-3 py-2">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-muted">Custo Fixo</div>
              <div className="font-mono text-[13px] font-semibold text-orange-500">-{formatCurrency(summary.total_fixed_expense, "BRL")}</div>
            </div>
            <div className="px-3 py-2">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-muted">Custo Var.</div>
              <div className="font-mono text-[13px] font-semibold text-danger">-{formatCurrency(summary.total_variable_expense, "BRL")}</div>
            </div>
            <div className="px-3 py-2">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-muted">Investido</div>
              <div className="font-mono text-[13px] font-semibold text-primary">-{formatCurrency(summary.total_investment, "BRL")}</div>
            </div>
            <div className="px-3 py-2">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-muted">Saldo</div>
              <div className={`font-mono text-[13px] font-semibold ${summary.balance >= 0 ? "text-accent" : "text-danger"}`}>
                {summary.balance >= 0 ? "+" : ""}{formatCurrency(summary.balance, "BRL")}
              </div>
            </div>
          </div>
        )}

        {/* Desktop filter bar */}
        <div className="hidden md:flex px-5 pb-4 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
            </span>
            <input type="text" placeholder="Buscar por descrição, tag, família, conta…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-surface border border-border rounded-lg px-9 py-2 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-primary/60 transition-all" />
          </div>
          <div className="flex bg-surface-2 border border-border rounded-lg overflow-hidden">
            {[
              ["", "Todos"],
              ["income", "Receita"],
              ["fixed_expense", "Fixo"],
              ["variable_expense", "Variável"],
              ["investment", "Investimento"],
            ].map(([k, l]) => (
              <button key={k} onClick={() => setFilter("nature", k)}
                className={`px-3 py-2 text-[11px] font-medium transition-colors ${filters.nature === k ? "bg-primary/10 text-primary border-l border-border" : "text-text-secondary hover:text-text-primary hover:bg-surface-3"}`}>
                {l}
              </button>
            ))}
          </div>
          <select value={filters.family_id} onChange={e => setFilter("family_id", e.target.value)} className={selectCls(!!filters.family_id)}>
            <option value="">Família</option>
            {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select value={filters.category_id} onChange={e => setFilter("category_id", e.target.value)} className={selectCls(!!filters.category_id)}>
            <option value="">Categoria</option>
            {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.currency} onChange={e => setFilter("currency", e.target.value)} className={selectCls(!!filters.currency)}>
            <option value="">Moeda</option>
            <option>BRL</option><option>USD</option><option>EUR</option>
          </select>
          <div className="flex items-center gap-2">
            <input type="date" value={filters.date_from} onChange={e => setFilter("date_from", e.target.value)} className={`${selectCls(!!filters.date_from)} [color-scheme:dark] w-32`} />
            <span className="text-muted text-sm">—</span>
            <input type="date" value={filters.date_to} onChange={e => setFilter("date_to", e.target.value)} className={`${selectCls(!!filters.date_to)} [color-scheme:dark] w-32`} />
          </div>
          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-danger border border-transparent hover:border-danger/30 rounded-lg transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* ── List ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {/* Desktop: tabela com margens */}
        <div className="hidden md:block px-6 py-4">
          {/* Container da tabela com borda e arredondamento */}
          <div className="border border-border rounded-lg overflow-hidden bg-surface">
            {/* Header */}
            <div className={`grid ${TX_GRID} border-b border-border bg-surface-2/60`}>
              {(["Data", "Natureza", "Descrição", "Taxonomia", "Conta · Método", "Valor", ""] as const).map((col, i) => (
                <div key={i} className={`py-2.5 text-[10px] uppercase tracking-wider font-semibold text-text-secondary ${i === 0 ? "pl-4 pr-2" : i === 1 ? "px-1" : i === 5 ? "text-right pr-2" : i === 6 ? "px-0 flex justify-center" : "px-2"}`}>
                  {col}
                </div>
              ))}
            </div>

            {data && filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-8">
                <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-muted">
                    <rect x="5" y="2" width="14" height="20" rx="2" />
                    <path d="M9 7h6M9 11h6M9 15h4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Nenhuma transação</p>
                  <p className="text-xs text-muted mt-1">
                    {hasFilters ? "Nenhum resultado para os filtros aplicados." : "Adicione sua primeira transação."}
                  </p>
                </div>
                {hasFilters && (
                  <button onClick={clearFilters} className="text-xs text-primary hover:text-primary-hover transition-colors">Limpar filtros</button>
                )}
              </div>
            ) : (
              <>
                {groups.map((group, groupIndex) => (
                  <div key={group.key}>
                    {/* Date group header */}
                    <div className="bg-surface-2/60 border-b border-border px-4 py-1.5 flex items-center gap-3">
                      <span className="text-xs font-bold text-text-primary whitespace-nowrap tracking-tight">{group.label}</span>
                      <div className="flex-1 h-px bg-border/60" />
                      <span className={`text-xs font-mono font-semibold tabular-nums shrink-0 ${group.net >= 0 ? "text-accent" : "text-danger"}`}>
                        {group.net >= 0 ? "+" : ""}{formatCurrency(Math.abs(group.net), displayCurrency)}
                      </span>
                    </div>

                    {/* Rows */}
                    <div>
                      {group.items.map((tx, txIndex) => (
                        <div 
                          key={tx.id} 
                          className={`${txIndex === group.items.length - 1 && groupIndex === groups.length - 1 ? '' : 'border-b border-border/40'} hover:bg-surface-2/30 transition-colors`}
                        >
                          <TransactionRow
                            transaction={tx}
                            families={families}
                            categories={categories}
                            tags={tags}
                            accounts={accounts}
                            paymentMethods={paymentMethods}
                            creditCards={creditCards}
                            invoices={invoices}
                            grouped
                            onUpdated={loadTransactionsOnly}
                            onDeleted={loadTransactionsOnly}
                            onEditRequest={() => setEditingTx(tx)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Mobile list */}
        <div className="md:hidden">
          {data && filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-8">
              <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-muted">
                  <rect x="5" y="2" width="14" height="20" rx="2" />
                  <path d="M9 7h6M9 11h6M9 15h4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Nenhuma transação</p>
                <p className="text-xs text-muted mt-1">
                  {hasFilters ? "Nenhum resultado para os filtros aplicados." : "Adicione sua primeira transação."}
                </p>
              </div>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-primary hover:text-primary-hover transition-colors">Limpar filtros</button>
              )}
            </div>
          ) : (
            <div className="pb-8">
              {groups.map(group => (
                <div key={group.key}>
                  {/* Date group header */}
                  <div className="sticky top-0 z-10 bg-background/98 backdrop-blur-sm px-4 pt-4 pb-1.5">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-text-primary whitespace-nowrap tracking-tight">{group.label}</span>
                      <div className="flex-1 h-px bg-border/60" />
                      <span className={`text-xs font-mono font-semibold tabular-nums shrink-0 ${group.net >= 0 ? "text-accent" : "text-danger"}`}>
                        {group.net >= 0 ? "+" : ""}{formatCurrency(Math.abs(group.net), displayCurrency)}
                      </span>
                    </div>
                  </div>

                  {group.items.map(tx => (
                    <TransactionRow
                      key={tx.id}
                      transaction={tx}
                      families={families}
                      categories={categories}
                      tags={tags}
                      accounts={accounts}
                      paymentMethods={paymentMethods}
                      creditCards={creditCards}
                      invoices={invoices}
                      grouped
                      onUpdated={loadTransactionsOnly}
                      onDeleted={loadTransactionsOnly}
                      onEditRequest={() => setEditingTx(tx)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-3 border-t border-border shrink-0 bg-surface">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}
            className="px-4 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            ← Anterior
          </button>
          <span className="text-xs text-muted font-mono tabular-nums">{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(page + 1)}
            className="px-4 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Próxima →
          </button>
        </div>
      )}

      {/* ── Modals / Sheets ───────────────────────────────────────────────── */}
      <AddTransactionModal
        open={showAddModal} onClose={() => setShowAddModal(false)} onCreated={loadTransactionsOnly}
      />

      {editingTx && (
        <EditTransactionModal
          open={true}
          transaction={editingTx}
          families={families}
          categories={categories}
          tags={tags}
          accounts={accounts}
          paymentMethods={paymentMethods}
          creditCards={creditCards}
          invoices={invoices}
          onClose={() => setEditingTx(null)}
          onUpdated={() => { setEditingTx(null); loadTransactionsOnly(); }}
          onDeleted={() => { setEditingTx(null); loadTransactionsOnly(); }}
        />
      )}

      <FilterSheet
        open={showFilterSheet} onClose={() => setShowFilterSheet(false)}
        filters={filters} families={families}
        filteredCategories={filteredCategories} filteredTags={filteredTags}
        onFilter={setFilter} onClear={clearFilters}
      />

      {showImport && (
        <ImportModal categories={categories} tags={tags} onImported={load} onClose={() => setShowImport(false)} />
      )}
    </div>
  );
}
