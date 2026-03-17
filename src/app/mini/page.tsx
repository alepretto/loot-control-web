"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  transactionsApi,
  tagsApi,
  categoriesApi,
  marketDataApi,
  miniApi,
  usersApi,
  Transaction,
  Tag,
  Category,
  ExchangeRates,
} from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function monthBounds(year: number, month: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return {
    date_from: `${year}-${pad(month)}-01`,
    date_to: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

function toBRL(value: number, currency: string, rates: ExchangeRates): number {
  if (currency === "USD" && rates.USD) return value * rates.USD;
  if (currency === "EUR" && rates.EUR) return value * rates.EUR;
  return value;
}

export default function MiniHomePage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rates, setRates] = useState<ExchangeRates>({ USD: null, EUR: null });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    usersApi.me().then((u) => setIsAdmin(u.role === "admin")).catch(() => {});
  }, []);

  // Link Telegram account on first open
  useEffect(() => {
    try {
      const initData = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData;
      if (initData) {
        miniApi.linkTelegram(initData).catch(() => {});
      }
    } catch {
      // Outside Telegram
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const bounds = monthBounds(year, month);
      const [txData, tagList, catList, ratesData] = await Promise.all([
        transactionsApi.list({ ...bounds, page_size: 2000 }),
        tagsApi.list(),
        categoriesApi.list(),
        marketDataApi.exchangeRates().catch(() => ({ USD: null, EUR: null })),
      ]);
      setTransactions(txData.items);
      setTags(tagList);
      setCategories(catList);
      setRates(ratesData);
      setLoading(false);
    }
    load();
  }, [year, month]);

  function resolveTag(tx: Transaction): Tag | undefined {
    return tags.find((t) => t.id === tx.tag_id);
  }

  // Exclude investment transactions
  const nonInvestment = transactions.filter((tx) => !tx.symbol && !tx.index);

  const totalIncome = nonInvestment
    .filter((tx) => resolveTag(tx)?.type === "income")
    .reduce((s, tx) => s + toBRL(tx.value, tx.currency, rates), 0);

  const totalOutcome = nonInvestment
    .filter((tx) => resolveTag(tx)?.type === "outcome")
    .reduce((s, tx) => s + toBRL(tx.value, tx.currency, rates), 0);

  const balance = totalIncome - totalOutcome;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalOutcome) / totalIncome) * 100 : 0;

  // Last 5 transactions (sorted desc)
  const recent = [...transactions]
    .sort((a, b) => b.date_transaction.localeCompare(a.date_transaction))
    .slice(0, 5);

  function getTagName(tx: Transaction): string {
    const tag = tags.find((t) => t.id === tx.tag_id);
    const cat = categories.find((c) => c.id === tag?.category_id);
    return tag?.name ?? cat?.name ?? "—";
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Loot Control</h1>
          <p className="text-sm text-muted">{MONTHS[month - 1]} {year}</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-surface-2 border border-border flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-muted">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
      </div>

      {/* KPI Cards row 1 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface border border-border rounded-2xl p-4 space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted">Entradas</p>
          <p className={`text-xl font-bold font-mono text-accent ${loading ? "opacity-30" : ""}`}>
            {loading ? "—" : formatCurrency(totalIncome, "BRL")}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-4 space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted">Saídas</p>
          <p className={`text-xl font-bold font-mono text-danger ${loading ? "opacity-30" : ""}`}>
            {loading ? "—" : formatCurrency(totalOutcome, "BRL")}
          </p>
        </div>
      </div>

      {/* Saldo + Saving Rate */}
      <div className="bg-surface border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted mb-1">Saldo</p>
            <p className={`text-2xl font-bold font-mono ${balance >= 0 ? "text-accent" : "text-danger"} ${loading ? "opacity-30" : ""}`}>
              {loading ? "—" : formatCurrency(balance, "BRL")}
            </p>
          </div>
          {!loading && totalIncome > 0 && (
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted mb-1">Poupança</span>
              <span className={`text-lg font-bold font-mono ${savingsRate >= 0 ? "text-accent" : "text-danger"}`}>
                {savingsRate.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-text-primary">Lançamentos recentes</p>
          <Link href="/mini/transactions" className="text-xs text-primary">
            Ver todos
          </Link>
        </div>

        {loading ? (
          <p className="text-muted text-sm text-center py-8">Carregando...</p>
        ) : recent.length === 0 ? (
          <p className="text-muted text-sm text-center py-8">Nenhuma transação este mês.</p>
        ) : (
          <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
            {recent.map((tx) => {
              const tag = resolveTag(tx);
              const isIncome = tag?.type === "income";
              return (
                <div key={tx.id} className="flex items-center justify-between px-4 py-3 min-h-[52px]">
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm text-text-primary truncate">{getTagName(tx)}</span>
                    <span className="text-xs text-muted">{formatDate(tx.date_transaction)}</span>
                  </div>
                  <span className={`text-sm font-mono font-semibold flex-shrink-0 ml-2 ${isIncome ? "text-accent" : "text-text-primary"}`}>
                    {isIncome ? "+" : "-"}{formatCurrency(tx.value, tx.currency)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/mini/tags"
          className="flex items-center gap-3 bg-surface border border-border rounded-2xl px-4 py-3 active:bg-surface-2 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-muted flex-shrink-0">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          <span className="text-sm text-text-secondary">Gerenciar tags</span>
        </Link>
        {isAdmin && (
          <Link
            href="/mini/admin"
            className="flex items-center gap-3 bg-surface border border-primary/30 rounded-2xl px-4 py-3 active:bg-surface-2 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-primary flex-shrink-0">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
            </svg>
            <span className="text-sm text-primary">Admin</span>
          </Link>
        )}
      </div>

      {/* FAB */}
      <Link
        href="/mini/transactions/new"
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary hover:bg-primary-hover text-white rounded-full flex items-center justify-center shadow-lg z-40 transition-colors"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </Link>
    </div>
  );
}
