"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Category,
  Currency,
  PaginatedTransactions,
  Tag,
  categoriesApi,
  tagsApi,
  transactionsApi,
} from "@/lib/api";
import { TransactionRow } from "@/components/transactions/TransactionRow";
import { AddTransactionRow } from "@/components/transactions/AddTransactionRow";
import { Button } from "@/components/ui/Button";

export default function TransactionsPage() {
  const [data, setData] = useState<PaginatedTransactions | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ currency: "", date_from: "", date_to: "" });

  const load = useCallback(async () => {
    const [txData, cats, tagList] = await Promise.all([
      transactionsApi.list({
        page,
        page_size: 50,
        currency: (filters.currency as Currency) || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
      }),
      categoriesApi.list(),
      tagsApi.list(),
    ]);
    setData(txData);
    setCategories(cats);
    setTags(tagList);
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = data ? Math.ceil(data.total / 50) : 1;

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[#2d3154] bg-[#1a1d2e] shrink-0">
        <span className="text-sm font-medium mr-2">Transações</span>
        <select
          value={filters.currency}
          onChange={(e) => { setFilters({ ...filters, currency: e.target.value }); setPage(1); }}
          className="bg-[#252840] border border-[#2d3154] rounded px-2 py-1 text-xs text-[#f1f5f9] focus:outline-none focus:border-indigo-500"
        >
          <option value="">Moeda</option>
          <option>BRL</option>
          <option>USD</option>
          <option>EUR</option>
        </select>
        <input
          type="date"
          value={filters.date_from}
          onChange={(e) => { setFilters({ ...filters, date_from: e.target.value }); setPage(1); }}
          className="bg-[#252840] border border-[#2d3154] rounded px-2 py-1 text-xs text-[#f1f5f9] focus:outline-none focus:border-indigo-500"
        />
        <span className="text-[#6b7280] text-xs">até</span>
        <input
          type="date"
          value={filters.date_to}
          onChange={(e) => { setFilters({ ...filters, date_to: e.target.value }); setPage(1); }}
          className="bg-[#252840] border border-[#2d3154] rounded px-2 py-1 text-xs text-[#f1f5f9] focus:outline-none focus:border-indigo-500"
        />
        {data && (
          <span className="ml-auto text-xs text-[#6b7280]">{data.total} registros</span>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="sheet-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
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
            <AddTransactionRow categories={categories} tags={tags} onCreated={load} />
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
        <div className="flex items-center justify-center gap-2 py-2 border-t border-[#2d3154] shrink-0 bg-[#1a1d2e]">
          <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            ← Anterior
          </Button>
          <span className="text-xs text-[#6b7280]">
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
    </div>
  );
}
