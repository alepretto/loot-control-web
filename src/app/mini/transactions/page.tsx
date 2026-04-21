"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  transactionsApi,
  tagsApi,
  categoriesApi,
  tagFamiliesApi,
  Transaction,
  Tag,
  Category,
  TagFamily,
} from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function MiniTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [families, setFamilies] = useState<TagFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [txData, tagList, catList, famList] = await Promise.all([
        transactionsApi.list({ page_size: 30 }),
        tagsApi.list(),
        categoriesApi.list(),
        tagFamiliesApi.list(),
      ]);
      setTransactions(txData.items);
      setTags(tagList);
      setCategories(catList);
      setFamilies(famList);
    } catch {
      setError("Erro ao carregar transações.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function getTagName(tx: Transaction): string {
    const tag = tags.find((t) => t.id === tx.tag_id);
    return tag?.name ?? "—";
  }

  function getCategoryName(tx: Transaction): string {
    const tag = tags.find((t) => t.id === tx.tag_id);
    const cat = categories.find((c) => c.id === tag?.category_id);
    return cat?.name ?? "—";
  }

  function resolveType(tx: Transaction): "income" | "outcome" | null {
    const tag = tags.find((t) => t.id === tx.tag_id);
    if (!tag) return null;
    const cat = categories.find((c) => c.id === tag.category_id);
    if (!cat) return null;
    const family = families.find((f) => f.id === cat.family_id);
    if (!family?.nature) return null;
    return family.nature === "income" ? "income" : "outcome";
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-text-primary">Transações</h1>
        <Link
          href="/mini/transactions/new"
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors min-h-[40px]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Novo
        </Link>
      </div>

      <p className="text-xs text-muted">Últimos 30 lançamentos</p>

      {loading ? (
        <p className="text-muted text-sm text-center py-8">Carregando...</p>
      ) : error ? (
        <p className="text-danger text-sm text-center py-4">{error}</p>
      ) : transactions.length === 0 ? (
        <p className="text-muted text-sm text-center py-8">Nenhuma transação encontrada.</p>
      ) : (
        <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {transactions.map((tx) => {
            const type = resolveType(tx);
            const isIncome = type === "income";
            const tagName = getTagName(tx);
            const catName = getCategoryName(tx);

            return (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3 min-h-[60px]">
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isIncome ? "bg-accent" : "bg-danger"}`} />
                    <span className="text-sm font-medium text-text-primary truncate">{tagName}</span>
                  </div>
                  <span className="text-xs text-muted ml-4 mt-0.5">{catName} · {formatDate(tx.date_transaction)}</span>
                  {tx.symbol && (
                    <span className="text-xs font-mono text-primary ml-4">{tx.symbol}</span>
                  )}
                </div>
                <div className="flex flex-col items-end ml-2 flex-shrink-0">
                  <span className={`text-sm font-mono font-semibold ${isIncome ? "text-accent" : "text-text-primary"}`}>
                    {isIncome ? "+" : "-"}{formatCurrency(tx.value, tx.currency)}
                  </span>
                  {tx.currency !== "BRL" && (
                    <span className="text-xs text-muted">{tx.currency}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
