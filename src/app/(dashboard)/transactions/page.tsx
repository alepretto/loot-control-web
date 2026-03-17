"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Category,
  Currency,
  PaginatedTransactions,
  Tag,
  TagFamily,
  categoriesApi,
  tagsApi,
  tagFamiliesApi,
  transactionsApi,
} from "@/lib/api";
import { TransactionRow } from "@/components/transactions/TransactionRow";
import { AddTransactionRow } from "@/components/transactions/AddTransactionRow";
import { ImportModal } from "@/components/transactions/ImportModal";

export default function TransactionsPage() {
  const [data, setData] = useState<PaginatedTransactions | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [families, setFamilies] = useState<TagFamily[]>([]);
  const [page, setPage] = useState(1);
  const [showImport, setShowImport] = useState(false);
  const [filters, setFilters] = useState({
    currency: "",
    date_from: "",
    date_to: "",
    family_id: "",
    category_id: "",
    tag_id: "",
  });

  const load = useCallback(async () => {
    const [txData, cats, tagList, familyList] = await Promise.all([
      transactionsApi.list({
        page,
        page_size: 20,
        currency: (filters.currency as Currency) || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        family_id: filters.family_id || undefined,
        category_id: filters.category_id || undefined,
        tag_id: filters.tag_id || undefined,
      }),
      categoriesApi.list(),
      tagsApi.list(),
      tagFamiliesApi.list(),
    ]);
    setData(txData);
    setCategories(cats);
    setTags(tagList);
    setFamilies(familyList);
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  function setFilter(key: string, value: string) {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "family_id") {
        next.category_id = "";
        next.tag_id = "";
      }
      if (key === "category_id") next.tag_id = "";
      return next;
    });
    setPage(1);
  }

  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  const filteredCategories = filters.family_id
    ? categories.filter((c) => c.family_id === filters.family_id)
    : categories;

  const filteredTags = filters.category_id
    ? tags.filter((t) => t.category_id === filters.category_id)
    : filters.family_id
      ? tags.filter((t) =>
          filteredCategories.some((c) => c.id === t.category_id),
        )
      : tags;

  const hasFilters = Object.values(filters).some(Boolean);

  const selectCls = (active: boolean) =>
    `bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors ${
      active
        ? "border-primary/60 text-primary"
        : "border-border text-text-secondary hover:border-surface-3"
    }`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-surface shrink-0">
        {/* Title row */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Transações</h1>
            <p className="text-sm text-muted mt-1">
              {data ? `${data.total} registros` : "Carregando…"}
            </p>
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-2 border border-border rounded-lg text-sm text-text-primary hover:bg-surface-3 transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Importar CSV
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-6 pb-4 flex items-center gap-2 flex-wrap">
          <select
            value={filters.family_id}
            onChange={(e) => setFilter("family_id", e.target.value)}
            className={selectCls(!!filters.family_id)}
          >
            <option value="">Família</option>
            {families.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          <select
            value={filters.category_id}
            onChange={(e) => setFilter("category_id", e.target.value)}
            className={selectCls(!!filters.category_id)}
          >
            <option value="">Categoria</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filters.tag_id}
            onChange={(e) => setFilter("tag_id", e.target.value)}
            className={selectCls(!!filters.tag_id)}
          >
            <option value="">Tag</option>
            {filteredTags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            value={filters.currency}
            onChange={(e) => setFilter("currency", e.target.value)}
            className={selectCls(!!filters.currency)}
          >
            <option value="">Moeda</option>
            <option>BRL</option>
            <option>USD</option>
            <option>EUR</option>
          </select>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilter("date_from", e.target.value)}
              className={selectCls(!!filters.date_from)}
            />
            <span className="text-muted text-sm">—</span>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilter("date_to", e.target.value)}
              className={selectCls(!!filters.date_to)}
            />
          </div>

          {hasFilters && (
            <button
              onClick={() => {
                setFilters({
                  currency: "",
                  date_from: "",
                  date_to: "",
                  family_id: "",
                  category_id: "",
                  tag_id: "",
                });
                setPage(1);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-danger border border-transparent hover:border-danger/30 rounded-lg transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 pt-6 pb-8">
          <AddTransactionRow
            families={families}
            categories={categories}
            tags={tags}
            onCreated={load}
          />
          <div className="space-y-2 mt-2">
            {data?.items.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                families={families}
                categories={categories}
                tags={tags}
                onUpdated={load}
                onDeleted={load}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-3 border-t border-border shrink-0 bg-surface">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-sm text-muted tabular-nums">
            {page} <span className="text-border">/</span> {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Próxima →
          </button>
        </div>
      )}

      {showImport && (
        <ImportModal
          categories={categories}
          tags={tags}
          onImported={load}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
