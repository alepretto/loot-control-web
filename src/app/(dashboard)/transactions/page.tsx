"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Category, Currency, PaginatedTransactions, Tag, TagFamily, Transaction, PaymentMethod,
  categoriesApi, tagsApi, tagFamiliesApi, transactionsApi, paymentMethodsApi,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { TransactionRow, TX_GRID } from "@/components/transactions/TransactionRow";
import { AddTransactionRow } from "@/components/transactions/AddTransactionRow";
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
  net: number; // in displayCurrency
}

function buildGroups(
  items: Transaction[],
  tags: Tag[],
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
      const sign = tag?.type === "income" ? 1 : -1;
      return acc + sign * convertToDisplay(tx.value, tx.currency);
    }, 0);
    return { key, label: dateLabel(key, tz), items: txs, net };
  });
}

// ─── Filter bottom sheet ──────────────────────────────────────────────────────
interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  filters: Record<string, string>;
  families: TagFamily[];
  categories: Category[];
  tags: Tag[];
  filteredCategories: Category[];
  filteredTags: Tag[];
  onFilter: (key: string, val: string) => void;
  onClear: () => void;
}

function FilterSheet({ open, onClose, filters, families, filteredCategories, filteredTags, onFilter, onClear }: FilterSheetProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const selectCls = "w-full bg-surface border border-border rounded-xl px-3.5 py-3 text-sm text-text-primary focus:outline-none focus:border-primary/60 transition-all";
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <>
      <div className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose} />
      <div className={`fixed bottom-0 inset-x-0 z-[60] transition-transform duration-300 ease-out ${open ? "translate-y-0" : "translate-y-full"}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="bg-surface-2 rounded-t-2xl border-t border-border">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-base font-semibold text-text-primary">Filtros</h2>
            {hasFilters && (
              <button onClick={() => { onClear(); onClose(); }}
                className="text-xs text-danger hover:text-danger/80 transition-colors">
                Limpar todos
              </button>
            )}
          </div>
          <div className="px-5 pb-6 space-y-4">
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
                <option value="">Todas</option>
                <option>BRL</option><option>USD</option><option>EUR</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Período</label>
              <div className="flex items-center gap-2">
                <input type="date" value={filters.date_from} onChange={e => onFilter("date_from", e.target.value)}
                  className={`${selectCls} flex-1 [color-scheme:dark]`} />
                <span className="text-muted text-xs shrink-0">até</span>
                <input type="date" value={filters.date_to} onChange={e => onFilter("date_to", e.target.value)}
                  className={`${selectCls} flex-1 [color-scheme:dark]`} />
              </div>
            </div>
            <button onClick={onClose}
              className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-colors mt-2">
              Aplicar filtros
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const labelCls = "block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2";

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const { timezone, displayCurrency, convertToDisplay } = useSettings();
  const [data, setData] = useState<PaginatedTransactions | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [families, setFamilies] = useState<TagFamily[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [page, setPage] = useState(1);
  const [showImport, setShowImport] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState({
    currency: "", date_from: "", date_to: "",
    family_id: "", category_id: "", tag_id: "",
  });

  const load = useCallback(async () => {
    const [txData, cats, tagList, familyList, pmList] = await Promise.all([
      transactionsApi.list({
        page, page_size: 20,
        currency: (filters.currency as Currency) || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to ? `${filters.date_to}T23:59:59` : undefined,
        family_id: filters.family_id || undefined,
        category_id: filters.category_id || undefined,
        tag_id: filters.tag_id || undefined,
      }),
      categoriesApi.list(),
      tagsApi.list(),
      tagFamiliesApi.list(),
      paymentMethodsApi.list(),
    ]);
    setData(txData); setCategories(cats); setTags(tagList); setFamilies(familyList); setPaymentMethods(pmList);
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  function setFilter(key: string, value: string) {
    setFilters(prev => {
      const next = { ...prev, [key]: value };
      if (key === "family_id") { next.category_id = ""; next.tag_id = ""; }
      if (key === "category_id") next.tag_id = "";
      return next;
    });
    setPage(1);
  }

  function clearFilters() {
    setFilters({ currency: "", date_from: "", date_to: "", family_id: "", category_id: "", tag_id: "" });
    setPage(1);
  }

  const totalPages = data ? Math.ceil(data.total / 20) : 1;
  const hasFilters = Object.values(filters).some(Boolean);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const filteredCategories = filters.family_id
    ? categories.filter(c => c.family_id === filters.family_id)
    : categories;
  const filteredTags = filters.category_id
    ? tags.filter(t => t.category_id === filters.category_id)
    : filters.family_id
    ? tags.filter(t => filteredCategories.some(c => c.id === t.category_id))
    : tags;

  const groups = buildGroups(data?.items ?? [], tags, timezone, convertToDisplay);

  const selectCls = (active: boolean) =>
    `bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors ${
      active ? "border-primary/60 text-primary" : "border-border text-text-secondary hover:border-surface-3"
    }`;

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-surface shrink-0">
        <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Transações</h1>
            <p className="text-xs text-muted mt-0.5 font-mono">
              {data ? `${data.total} registros` : "Carregando…"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile filter button */}
            <button onClick={() => setShowFilterSheet(true)}
              className={`md:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                hasFilters
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-surface-2 border-border text-text-secondary"
              }`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              {activeFilterCount > 0 && (
                <span className="text-xs font-bold">{activeFilterCount}</span>
              )}
            </button>

            <button onClick={() => setShowImport(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-surface-2 border border-border rounded-lg text-sm text-text-primary hover:bg-surface-3 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Importar CSV
            </button>
          </div>
        </div>

        {/* Desktop filter bar */}
        <div className="hidden md:flex px-5 pb-4 items-center gap-2 flex-wrap">
          <select value={filters.family_id} onChange={e => setFilter("family_id", e.target.value)} className={selectCls(!!filters.family_id)}>
            <option value="">Família</option>
            {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select value={filters.category_id} onChange={e => setFilter("category_id", e.target.value)} className={selectCls(!!filters.category_id)}>
            <option value="">Categoria</option>
            {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.tag_id} onChange={e => setFilter("tag_id", e.target.value)} className={selectCls(!!filters.tag_id)}>
            <option value="">Tag</option>
            {filteredTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={filters.currency} onChange={e => setFilter("currency", e.target.value)} className={selectCls(!!filters.currency)}>
            <option value="">Moeda</option>
            <option>BRL</option><option>USD</option><option>EUR</option>
          </select>
          <div className="flex items-center gap-2">
            <input type="date" value={filters.date_from} onChange={e => setFilter("date_from", e.target.value)} className={`${selectCls(!!filters.date_from)} [color-scheme:dark] w-36`} />
            <span className="text-muted text-sm">—</span>
            <input type="date" value={filters.date_to} onChange={e => setFilter("date_to", e.target.value)} className={`${selectCls(!!filters.date_to)} [color-scheme:dark] w-36`} />
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
        {/* Desktop: add row */}
        <div className="hidden md:block px-6 pt-4 pb-2 max-w-7xl mx-auto">
          <AddTransactionRow families={families} categories={categories} tags={tags} paymentMethods={paymentMethods} onCreated={load} />
        </div>

        {/* Desktop: column header */}
        <div className={`hidden md:grid ${TX_GRID} max-w-7xl mx-auto px-0 border-b border-border bg-surface-2/60 sticky top-0 z-10`}>
          {(["Tipo", "Tag", "Família · Categoria", "Valor", "Moeda", "Hora", ""] as const).map((col, i) => (
            <div key={i} className={`py-2 px-2 text-[10px] uppercase tracking-wider font-semibold text-text-secondary ${i === 3 || i === 4 || i === 5 ? "text-right" : ""} ${i === 4 || i === 5 ? "text-center" : ""}`}>
              {col}
            </div>
          ))}
        </div>

        {data && data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
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
              <button onClick={clearFilters} className="text-xs text-primary hover:text-primary-hover transition-colors">
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto pb-8">
            {groups.map(group => (
              <div key={group.key}>
                {/* Date group header */}
                <div className="sticky top-0 z-10 bg-background/98 backdrop-blur-sm px-4 pt-4 pb-1.5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-text-primary whitespace-nowrap tracking-tight">
                      {group.label}
                    </span>
                    <div className="flex-1 h-px bg-border/60" />
                    <span className={`text-xs font-mono font-semibold tabular-nums shrink-0 ${
                      group.net >= 0 ? "text-accent" : "text-danger"
                    }`}>
                      {group.net >= 0 ? "+" : ""}
                      {formatCurrency(Math.abs(group.net), displayCurrency)}
                    </span>
                  </div>
                </div>

                {/* Transactions in this group */}
                {group.items.map(tx => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    families={families}
                    categories={categories}
                    tags={tags}
                    paymentMethods={paymentMethods}
                    grouped
                    onUpdated={load}
                    onDeleted={load}
                    onEditRequest={() => setEditingTx(tx)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-3 border-t border-border shrink-0 bg-surface">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}
            className="px-4 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            ← Anterior
          </button>
          <span className="text-xs text-muted font-mono tabular-nums">
            {page} / {totalPages}
          </span>
          <button disabled={page === totalPages} onClick={() => setPage(page + 1)}
            className="px-4 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Próxima →
          </button>
        </div>
      )}

      {/* ── Mobile FAB ───────────────────────────────────────────────────── */}
      <button onClick={() => setShowAddModal(true)} aria-label="Nova transação"
        className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 bg-accent hover:bg-accent/90 text-background rounded-full shadow-lg shadow-accent/30 flex items-center justify-center transition-all duration-150 active:scale-95"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* ── Modals / Sheets ───────────────────────────────────────────────── */}
      <AddTransactionModal
        families={families} categories={categories} tags={tags} paymentMethods={paymentMethods}
        open={showAddModal} onClose={() => setShowAddModal(false)} onCreated={load}
      />

      {editingTx && (
        <EditTransactionModal
          transaction={editingTx}
          families={families} categories={categories} tags={tags} paymentMethods={paymentMethods}
          open={!!editingTx}
          onClose={() => setEditingTx(null)}
          onUpdated={() => { load(); setEditingTx(null); }}
          onDeleted={() => { load(); setEditingTx(null); }}
        />
      )}

      <FilterSheet
        open={showFilterSheet} onClose={() => setShowFilterSheet(false)}
        filters={filters} families={families} categories={categories} tags={tags}
        filteredCategories={filteredCategories} filteredTags={filteredTags}
        onFilter={setFilter} onClear={clearFilters}
      />

      {showImport && (
        <ImportModal categories={categories} tags={tags} onImported={load} onClose={() => setShowImport(false)} />
      )}
    </div>
  );
}
