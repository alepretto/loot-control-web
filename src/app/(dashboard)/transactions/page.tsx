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
import { Button } from "@/components/ui/Button";

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
        page_size: 50,
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
      if (key === "family_id") { next.category_id = ""; next.tag_id = ""; }
      if (key === "category_id") next.tag_id = "";
      return next;
    });
    setPage(1);
  }

  const totalPages = data ? Math.ceil(data.total / 50) : 1;

  const filteredCategories = filters.family_id
    ? categories.filter((c) => c.family_id === filters.family_id)
    : categories;

  const filteredTags = filters.category_id
    ? tags.filter((t) => t.category_id === filters.category_id)
    : filters.family_id
    ? tags.filter((t) => filteredCategories.some((c) => c.id === t.category_id))
    : tags;

  const controlCls =
    "bg-background border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none";

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-surface shrink-0 flex-wrap">
        <span className="text-sm font-medium mr-1">Transações</span>

        <select
          value={filters.family_id}
          onChange={(e) => setFilter("family_id", e.target.value)}
          className={controlCls}
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
          className={controlCls}
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
          className={controlCls}
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
          className={controlCls}
        >
          <option value="">Moeda</option>
          <option>BRL</option>
          <option>USD</option>
          <option>EUR</option>
        </select>

        <input
          type="date"
          value={filters.date_from}
          onChange={(e) => setFilter("date_from", e.target.value)}
          className={controlCls}
        />
        <span className="text-muted text-xs">até</span>
        <input
          type="date"
          value={filters.date_to}
          onChange={(e) => setFilter("date_to", e.target.value)}
          className={controlCls}
        />

        <div className="ml-auto flex items-center gap-2">
          {data && (
            <span className="text-xs text-muted">{data.total} registros</span>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowImport(true)}>
            Importar
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="sheet-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Família</th>
              <th>Categoria</th>
              <th>Tag</th>
              <th className="text-right">Valor</th>
              <th>Moeda</th>
              <th className="text-right">Qtd</th>
              <th>Symbol</th>
              <th className="text-right">Index Rate</th>
              <th>Index</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            <AddTransactionRow families={families} categories={categories} tags={tags} onCreated={load} />
            {data?.items.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                categories={categories}
                tags={tags}
                onUpdated={load}
                onDeleted={load}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-2 border-t border-border shrink-0 bg-surface">
          <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            ← Anterior
          </Button>
          <span className="text-xs text-muted">
            {page} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Próxima →
          </Button>
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
