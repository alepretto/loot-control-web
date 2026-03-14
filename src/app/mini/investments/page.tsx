"use client";

import { useEffect, useState } from "react";
import {
  transactionsApi,
  tagsApi,
  marketDataApi,
  Transaction,
  Tag,
  ExchangeRates,
  AssetPriceItem,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const CRYPTO_KEYWORDS = ["BTC", "ETH", "SOL", "BNB", "ADA", "DOT", "AVAX", "MATIC", "XRP", "DOGE", "LINK", "UNI", "ATOM", "LTC"];

function classifySymbol(tx: Transaction): string {
  if (tx.index) return "Renda Fixa";
  if (!tx.symbol) return "Outros";

  const sym = tx.symbol.toUpperCase();

  if (CRYPTO_KEYWORDS.includes(sym) || sym.endsWith("-USD") || sym.endsWith("USDT")) {
    return "Crypto";
  }

  if (/\d$/.test(sym)) {
    return "Ações BR";
  }

  return "Stocks EUA";
}

function toBRL(value: number, currency: string, rates: ExchangeRates): number {
  if (currency === "USD" && rates.USD) return value * rates.USD;
  if (currency === "EUR" && rates.EUR) return value * rates.EUR;
  return value;
}

interface AssetRow {
  symbol: string;
  class: string;
  totalInvested: number;
  investedBRL: number;
  totalQty: number | null;
  currency: string;
}

interface ClassGroup {
  className: string;
  assets: AssetRow[];
  totalInvestedBRL: number;
}

const CLASS_ORDER = ["Crypto", "Ações BR", "Renda Fixa", "Stocks EUA", "Outros"];

export default function MiniInvestmentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [rates, setRates] = useState<ExchangeRates>({ USD: null, EUR: null });
  const [prices, setPrices] = useState<AssetPriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [txData, tagList, ratesData, pricesData] = await Promise.all([
          transactionsApi.list({ page_size: 2000 }),
          tagsApi.list(),
          marketDataApi.exchangeRates().catch(() => ({ USD: null, EUR: null })),
          marketDataApi.assetPrices().catch(() => ({ prices: [] })),
        ]);
        const investmentTxs = txData.items.filter((tx) => tx.symbol || tx.index);
        setTransactions(investmentTxs);
        setTags(tagList);
        setRates(ratesData);
        setPrices(pricesData.prices);
      } catch {
        setError("Erro ao carregar investimentos.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function toggleGroup(className: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(className)) {
        next.delete(className);
      } else {
        next.add(className);
      }
      return next;
    });
  }

  // Aggregate by symbol + class
  const assetMap = new Map<string, AssetRow>();
  for (const tx of transactions) {
    const tag = tags.find((t) => t.id === tx.tag_id);
    const isIncome = tag?.type === "income";
    const key = tx.symbol ?? tx.index ?? "—";
    const assetClass = classifySymbol(tx);

    if (!assetMap.has(key)) {
      assetMap.set(key, {
        symbol: key,
        class: assetClass,
        totalInvested: 0,
        investedBRL: 0,
        totalQty: tx.quantity !== null ? 0 : null,
        currency: tx.currency,
      });
    }

    const row = assetMap.get(key)!;
    const sign = isIncome ? -1 : 1;
    row.totalInvested += sign * tx.value;
    row.investedBRL += sign * toBRL(tx.value, tx.currency, rates);
    if (tx.quantity !== null && row.totalQty !== null) {
      row.totalQty += sign * tx.quantity;
    }
  }

  // Group by class
  const classMap = new Map<string, ClassGroup>();
  for (const asset of assetMap.values()) {
    if (!classMap.has(asset.class)) {
      classMap.set(asset.class, { className: asset.class, assets: [], totalInvestedBRL: 0 });
    }
    const group = classMap.get(asset.class)!;
    group.assets.push(asset);
    group.totalInvestedBRL += asset.investedBRL;
  }

  const groups = Array.from(classMap.values()).sort((a, b) => {
    const ia = CLASS_ORDER.indexOf(a.className);
    const ib = CLASS_ORDER.indexOf(b.className);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });

  const totalAportadoBRL = groups.reduce((s, g) => s + g.totalInvestedBRL, 0);
  const numAssets = assetMap.size;
  const numClasses = classMap.size;

  // P&L per asset
  function getAssetPnL(asset: AssetRow): number | null {
    if (asset.totalQty === null || asset.totalQty <= 0) return null;
    const priceData = prices.find((p) => p.symbol.toUpperCase() === asset.symbol.toUpperCase());
    if (!priceData) return null;
    const currentValueBRL = asset.totalQty * toBRL(priceData.price, priceData.currency, rates);
    return currentValueBRL - asset.investedBRL;
  }

  // Total P&L across all assets with price data
  let totalPnL: number | null = null;
  for (const asset of assetMap.values()) {
    const pnl = getAssetPnL(asset);
    if (pnl !== null) {
      totalPnL = (totalPnL ?? 0) + pnl;
    }
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      {/* Header */}
      <h1 className="text-lg font-bold text-text-primary">Investimentos</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface border border-border rounded-2xl p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted">Aportado</p>
          <p className={`text-sm font-bold font-mono text-primary ${loading ? "opacity-30" : ""}`}>
            {loading ? "—" : formatCurrency(totalAportadoBRL, "BRL")}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted">Ativos</p>
          <p className={`text-sm font-bold font-mono text-text-primary ${loading ? "opacity-30" : ""}`}>
            {loading ? "—" : numAssets}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted">Classes</p>
          <p className={`text-sm font-bold font-mono text-text-primary ${loading ? "opacity-30" : ""}`}>
            {loading ? "—" : numClasses}
          </p>
        </div>
      </div>

      {/* Total P&L card (only if we have any price data) */}
      {!loading && totalPnL !== null && (
        <div className="bg-surface border border-border rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted mb-1">Resultado (preço atual)</p>
            <p className={`text-2xl font-bold font-mono ${totalPnL >= 0 ? "text-accent" : "text-danger"}`}>
              {totalPnL >= 0 ? "+" : ""}{formatCurrency(totalPnL, "BRL")}
            </p>
          </div>
          {totalAportadoBRL > 0 && (
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted mb-1">Retorno</span>
              <span className={`text-lg font-bold font-mono ${totalPnL >= 0 ? "text-accent" : "text-danger"}`}>
                {((totalPnL / totalAportadoBRL) * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-muted text-sm text-center py-8">Carregando...</p>
      ) : error ? (
        <p className="text-danger text-sm text-center py-4">{error}</p>
      ) : groups.length === 0 ? (
        <p className="text-muted text-sm text-center py-8">Nenhum investimento encontrado.</p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const isOpen = openGroups.has(group.className);
            const groupPnL = group.assets.reduce<number | null>((acc, asset) => {
              const pnl = getAssetPnL(asset);
              if (pnl === null) return acc;
              return (acc ?? 0) + pnl;
            }, null);

            return (
              <div key={group.className} className="bg-surface border border-border rounded-2xl overflow-hidden">
                {/* Class header — tap to toggle */}
                <button
                  onClick={() => toggleGroup(group.className)}
                  className="w-full flex items-center justify-between px-4 py-3 min-h-[52px] active:bg-surface-2 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs transition-transform ${isOpen ? "rotate-90" : ""}`}>▶</span>
                    <span className="text-sm font-semibold text-text-primary">{group.className}</span>
                    <span className="text-xs text-muted">({group.assets.length})</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-mono text-text-primary">
                      {formatCurrency(group.totalInvestedBRL, "BRL")}
                    </span>
                    {groupPnL !== null && (
                      <span className={`text-xs font-mono ${groupPnL >= 0 ? "text-accent" : "text-danger"}`}>
                        {groupPnL >= 0 ? "+" : ""}{formatCurrency(groupPnL, "BRL")}
                      </span>
                    )}
                  </div>
                </button>

                {/* Asset rows — only when open */}
                {isOpen && (
                  <div className="divide-y divide-border border-t border-border">
                    {group.assets
                      .sort((a, b) => b.investedBRL - a.investedBRL)
                      .map((asset) => {
                        const pnl = getAssetPnL(asset);
                        return (
                          <div key={asset.symbol} className="flex items-center justify-between px-4 py-3 min-h-[52px]">
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-mono font-semibold text-primary">{asset.symbol}</span>
                              {asset.totalQty !== null && asset.totalQty > 0 && (
                                <span className="text-xs text-muted">
                                  {asset.totalQty % 1 === 0
                                    ? asset.totalQty.toFixed(0)
                                    : asset.totalQty.toFixed(6).replace(/0+$/, "")}{" "}
                                  unid.
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-mono text-text-primary">
                                {formatCurrency(asset.totalInvested, asset.currency)}
                              </span>
                              {pnl !== null && (
                                <span className={`text-xs font-mono ${pnl >= 0 ? "text-accent" : "text-danger"}`}>
                                  {pnl >= 0 ? "+" : ""}{formatCurrency(pnl, "BRL")}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
