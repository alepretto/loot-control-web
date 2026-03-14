"use client";

import { useEffect, useState } from "react";
import {
  transactionsApi,
  tagsApi,
  Transaction,
  Tag,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const CRYPTO_KEYWORDS = ["BTC", "ETH", "SOL", "BNB", "ADA", "DOT", "AVAX", "MATIC", "XRP", "DOGE", "LINK", "UNI", "ATOM", "LTC"];

function classifySymbol(tx: Transaction): string {
  // Fixed income: tx.index is the definitive flag
  if (tx.index) return "Renda Fixa";
  if (!tx.symbol) return "Outros";

  const sym = tx.symbol.toUpperCase();

  // Crypto: known symbols or ends with common crypto suffixes
  if (CRYPTO_KEYWORDS.includes(sym) || sym.endsWith("-USD") || sym.endsWith("USDT")) {
    return "Crypto";
  }

  // BR Stocks: symbol ends with a digit (e.g. PETR4, VALE3)
  if (/\d$/.test(sym)) {
    return "Ações BR";
  }

  return "Stocks EUA";
}

interface AssetRow {
  symbol: string;
  class: string;
  totalInvested: number;
  totalQty: number | null;
  currency: string;
}

interface ClassGroup {
  className: string;
  assets: AssetRow[];
  totalInvested: number;
}

const CLASS_ORDER = ["Crypto", "Ações BR", "Renda Fixa", "Stocks EUA", "Outros"];

export default function MiniInvestmentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [txData, tagList] = await Promise.all([
          transactionsApi.list({ page_size: 2000 }),
          tagsApi.list(),
        ]);
        // Only keep investment transactions (have symbol or index)
        const investmentTxs = txData.items.filter((tx) => tx.symbol || tx.index);
        setTransactions(investmentTxs);
        setTags(tagList);
      } catch {
        setError("Erro ao carregar investimentos.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Aggregate by symbol + class
  const assetMap = new Map<string, AssetRow>();
  for (const tx of transactions) {
    const tag = tags.find((t) => t.id === tx.tag_id);
    const isIncome = tag?.type === "income"; // income = resgate (sell)
    const key = tx.symbol ?? tx.index ?? "—";
    const assetClass = classifySymbol(tx);

    if (!assetMap.has(key)) {
      assetMap.set(key, {
        symbol: key,
        class: assetClass,
        totalInvested: 0,
        totalQty: tx.quantity !== null ? 0 : null,
        currency: tx.currency,
      });
    }

    const row = assetMap.get(key)!;
    if (isIncome) {
      row.totalInvested -= tx.value;
      if (tx.quantity !== null && row.totalQty !== null) {
        row.totalQty -= tx.quantity;
      }
    } else {
      row.totalInvested += tx.value;
      if (tx.quantity !== null && row.totalQty !== null) {
        row.totalQty += tx.quantity;
      }
    }
  }

  // Group by class
  const classMap = new Map<string, ClassGroup>();
  for (const asset of assetMap.values()) {
    if (!classMap.has(asset.class)) {
      classMap.set(asset.class, { className: asset.class, assets: [], totalInvested: 0 });
    }
    const group = classMap.get(asset.class)!;
    group.assets.push(asset);
    group.totalInvested += asset.totalInvested;
  }

  const groups = Array.from(classMap.values()).sort((a, b) => {
    const ia = CLASS_ORDER.indexOf(a.className);
    const ib = CLASS_ORDER.indexOf(b.className);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });

  const totalAportado = groups.reduce((s, g) => s + g.totalInvested, 0);
  const numAssets = assetMap.size;
  const numClasses = classMap.size;

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      {/* Header */}
      <h1 className="text-lg font-bold text-text-primary">Investimentos</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface border border-border rounded-2xl p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted">Total</p>
          <p className={`text-sm font-bold font-mono text-primary ${loading ? "opacity-30" : ""}`}>
            {loading ? "—" : formatCurrency(totalAportado, "BRL")}
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

      {loading ? (
        <p className="text-muted text-sm text-center py-8">Carregando...</p>
      ) : error ? (
        <p className="text-danger text-sm text-center py-4">{error}</p>
      ) : groups.length === 0 ? (
        <p className="text-muted text-sm text-center py-8">Nenhum investimento encontrado.</p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.className} className="space-y-2">
              {/* Class header */}
              <div className="flex items-center justify-between px-1">
                <p className="text-sm font-semibold text-text-primary">{group.className}</p>
                <span className="text-sm font-mono text-muted">{formatCurrency(group.totalInvested, "BRL")}</span>
              </div>

              {/* Asset rows */}
              <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
                {group.assets
                  .sort((a, b) => b.totalInvested - a.totalInvested)
                  .map((asset) => (
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
                        {asset.currency !== "BRL" && (
                          <span className="text-xs text-muted">{asset.currency}</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
