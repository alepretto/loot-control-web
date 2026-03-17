"use client";

import { useEffect, useState } from "react";
import {
  transactionsApi,
  tagsApi,
  categoriesApi,
  marketDataApi,
  Transaction,
  Tag,
  Category,
  ExchangeRateHistoryItem,
  AssetPriceItem,
  CdiRateItem,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

// ─── Helpers (same logic as web investments page) ─────────────────────────────

function buildSortedRates(history: ExchangeRateHistoryItem[]) {
  return [...history].sort((a, b) => a.date.localeCompare(b.date));
}

function getRateForDate(sorted: ExchangeRateHistoryItem[], dateStr: string) {
  const d = dateStr.slice(0, 10);
  let best = sorted[0] ?? { date: "", USD: 5.0, EUR: 5.5 };
  for (const r of sorted) {
    if (r.date <= d) best = r;
    else break;
  }
  return { USD: best.USD ?? 5.0, EUR: best.EUR ?? 5.5 };
}

function convertToBrl(value: number, currency: string, rate: { USD: number; EUR: number }): number {
  if (currency === "USD") return value * rate.USD;
  if (currency === "EUR") return value * rate.EUR;
  return value;
}

function accumulateCdi(
  principal: number,
  indexRate: number,
  sortedCdi: CdiRateItem[],
  fromDate: string,
  toDate: string,
): number {
  const from = fromDate.slice(0, 10);
  const to = toDate.slice(0, 10);
  let factor = 1;
  for (const r of sortedCdi) {
    if (r.date < from) continue;
    if (r.date > to) break;
    factor *= 1 + (r.rate_pct * (indexRate / 100)) / 100;
  }
  return principal * factor;
}

function accumulateFixed(principal: number, annualPct: number, fromDate: string, toDate: string): number {
  const msPerDay = 86_400_000;
  const days = Math.max(0, (new Date(toDate).getTime() - new Date(fromDate).getTime()) / msPerDay);
  return principal * Math.pow(1 + annualPct / 100, days / 365);
}

interface ClosedCycle {
  symbol: string;
  buysTotal: number;
  sellsTotal: number;
  result: number;
  resultPct: number;
}

interface SymbolRow {
  symbol: string;
  qty: number;
  aporteBrl: number;
  carteiraBrl: number;
  currentPrice: number | null;
  priceCurrency: string;
  closedCycles: ClosedCycle[];
  // fixed income detail
  details: { date: string; index: string | null; indexRate: number | null; principalBrl: number; currentBrl: number; returnPct: number }[];
}

interface TagGroup {
  tagName: string;
  isFixedIncome: boolean;
  rows: SymbolRow[];
  totalAporte: number;
  totalCarteira: number;
  retornoBrl: number;
  retornoPct: number;
  oldestLastUpdate: string | null;
  allocationPct: number; // filled after all groups are built
}

function splitCycles(
  txs: Transaction[],
  tags: Tag[],
  sortedRates: ExchangeRateHistoryItem[],
): { closed: ClosedCycle[]; activeTxs: Transaction[] } {
  const sorted = [...txs].sort((a, b) => a.date_transaction.localeCompare(b.date_transaction));
  const closed: ClosedCycle[] = [];
  let buys = 0, sells = 0, qty = 0, activeStart = 0;
  for (let i = 0; i < sorted.length; i++) {
    const tx = sorted[i];
    const tag = tags.find((t) => t.id === tx.tag_id);
    const isIncome = tag?.type === "income";
    const rate = getRateForDate(sortedRates, tx.date_transaction);
    const valBrl = convertToBrl(tx.value, tx.currency, rate);
    if (isIncome) { sells += valBrl; qty -= tx.quantity ?? 0; }
    else { buys += valBrl; qty += tx.quantity ?? 0; }
    if (qty <= 0.00001 && buys > 0) {
      closed.push({
        symbol: tx.symbol ?? "",
        buysTotal: buys,
        sellsTotal: sells,
        result: sells - buys,
        resultPct: buys > 0 ? ((sells - buys) / buys) * 100 : 0,
      });
      buys = 0; sells = 0; qty = 0; activeStart = i + 1;
    }
  }
  return { closed, activeTxs: sorted.slice(activeStart) };
}

function buildGroups(
  txs: Transaction[],
  tags: Tag[],
  categories: Category[],
  sortedRates: ExchangeRateHistoryItem[],
  latestPrices: AssetPriceItem[],
  sortedCdi: CdiRateItem[],
): TagGroup[] {
  const latestPrice = new Map<string, { price: number; currency: string }>();
  for (const p of latestPrices) {
    latestPrice.set(p.symbol, { price: p.price, currency: p.currency });
  }

  const _lr = sortedRates[sortedRates.length - 1];
  const latestRate = { USD: _lr?.USD ?? 5.0, EUR: _lr?.EUR ?? 5.5 };
  const todayStr = new Date().toISOString().slice(0, 10);

  const byTag = new Map<string, Transaction[]>();
  for (const tx of txs) {
    const tag = tags.find((t) => t.id === tx.tag_id);
    const cat = categories.find((c) => c.id === tag?.category_id);
    const name = cat?.name ?? tag?.name ?? "—";
    if (!byTag.has(name)) byTag.set(name, []);
    byTag.get(name)!.push(tx);
  }

  const groups: TagGroup[] = [];

  for (const [tagName, tagTxs] of byTag) {
    const isFixedIncome = tagTxs.some((tx) => tx.index);

    const bySymbol = new Map<
      string,
      { aporteBrl: number; rendimentoBrl: number; qty: number; txList: Transaction[]; closedCycles: ClosedCycle[] }
    >();

    if (!isFixedIncome) {
      const txsBySymbol = new Map<string, Transaction[]>();
      for (const tx of tagTxs) {
        const sym = tx.symbol ?? tagName;
        if (!txsBySymbol.has(sym)) txsBySymbol.set(sym, []);
        txsBySymbol.get(sym)!.push(tx);
      }
      for (const [sym, symTxs] of txsBySymbol) {
        const { closed, activeTxs } = splitCycles(symTxs, tags, sortedRates);
        let aporteBrl = 0, qty = 0;
        for (const tx of activeTxs) {
          const tag = tags.find((t) => t.id === tx.tag_id);
          const isIncome = tag?.type === "income";
          const rate = getRateForDate(sortedRates, tx.date_transaction);
          const valBrl = convertToBrl(tx.value, tx.currency, rate);
          if (isIncome) { qty -= tx.quantity ?? 0; aporteBrl -= valBrl; }
          else { qty += tx.quantity ?? 0; aporteBrl += valBrl; }
        }
        bySymbol.set(sym, { aporteBrl, rendimentoBrl: 0, qty, txList: activeTxs, closedCycles: closed });
      }
    } else {
      for (const tx of tagTxs) {
        const tag = tags.find((t) => t.id === tx.tag_id);
        const isIncome = tag?.type === "income";
        const sym = tx.symbol ?? tx.index ?? tagName;
        if (!bySymbol.has(sym))
          bySymbol.set(sym, { aporteBrl: 0, rendimentoBrl: 0, qty: 0, txList: [], closedCycles: [] });
        const agg = bySymbol.get(sym)!;
        const rate = getRateForDate(sortedRates, tx.date_transaction);
        const valBrl = convertToBrl(tx.value, tx.currency, rate);
        agg.txList.push(tx);
        if (isIncome) { agg.qty -= tx.quantity ?? 0; agg.rendimentoBrl += valBrl; }
        else { agg.qty += tx.quantity ?? 0; agg.aporteBrl += valBrl; }
      }
    }

    const rows: SymbolRow[] = [];

    for (const [sym, agg] of bySymbol) {
      const priceEntry = latestPrice.get(sym);
      const currentPrice = priceEntry?.price ?? null;
      const priceCurrency = priceEntry?.currency ?? "BRL";

      const details: SymbolRow["details"] = [];
      if (isFixedIncome) {
        for (const tx of agg.txList) {
          const tag = tags.find((t) => t.id === tx.tag_id);
          if (tag?.type === "income") continue;
          const rate = getRateForDate(sortedRates, tx.date_transaction);
          const princBrl = convertToBrl(tx.value, tx.currency, rate);
          const txDate = tx.date_transaction.slice(0, 10);
          let curBrl: number;
          if (tx.index?.toUpperCase() === "CDI" && sortedCdi.length > 0) {
            curBrl = accumulateCdi(princBrl, tx.index_rate ?? 100, sortedCdi, txDate, todayStr);
          } else if (tx.index_rate) {
            curBrl = accumulateFixed(princBrl, tx.index_rate, txDate, todayStr);
          } else {
            curBrl = princBrl;
          }
          details.push({
            date: tx.date_transaction.slice(0, 10),
            index: tx.index ?? null,
            indexRate: tx.index_rate ?? null,
            principalBrl: princBrl,
            currentBrl: curBrl,
            returnPct: princBrl > 0 ? ((curBrl - princBrl) / princBrl) * 100 : 0,
          });
        }
      }

      let carteiraBrl: number;
      if (isFixedIncome) {
        carteiraBrl =
          details.length > 0
            ? details.reduce((s, d) => s + d.currentBrl, 0) + agg.rendimentoBrl
            : agg.aporteBrl + agg.rendimentoBrl;
      } else if (currentPrice !== null && agg.qty > 0) {
        carteiraBrl = convertToBrl(agg.qty * currentPrice, priceCurrency, latestRate);
      } else {
        carteiraBrl = 0;
      }

      rows.push({ symbol: sym, qty: agg.qty, aporteBrl: agg.aporteBrl, carteiraBrl, currentPrice, priceCurrency, closedCycles: agg.closedCycles, details });
    }

    rows.sort((a, b) => b.aporteBrl - a.aporteBrl);

    const totalAporte = rows.reduce((s, r) => s + r.aporteBrl, 0);
    const totalCarteira = rows.reduce((s, r) => s + r.carteiraBrl, 0);
    const retornoBrl = totalCarteira - totalAporte;
    const retornoPct = totalAporte > 0 ? (retornoBrl / totalAporte) * 100 : 0;

    groups.push({ tagName, isFixedIncome, rows, totalAporte, totalCarteira, retornoBrl, retornoPct, oldestLastUpdate: null, allocationPct: 0 });
  }

  const ORDER = ["Crypto", "Ações", "Stocks", "Renda Fixa"];
  groups.sort((a, b) => {
    const ia = ORDER.indexOf(a.tagName), ib = ORDER.indexOf(b.tagName);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });

  // Fill allocation %
  const totalAll = groups.reduce((s, g) => s + (g.totalCarteira || g.totalAporte), 0);
  for (const g of groups) {
    g.allocationPct = totalAll > 0 ? ((g.totalCarteira || g.totalAporte) / totalAll) * 100 : 0;
  }

  return groups;
}

// ─── UI ───────────────────────────────────────────────────────────────────────

function RetornoBadge({ pct }: { pct: number }) {
  return (
    <span className={`text-xs font-mono font-semibold ${pct >= 0 ? "text-accent" : "text-danger"}`}>
      {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
    </span>
  );
}

function GroupCard({ group }: { group: TagGroup }) {
  const [open, setOpen] = useState(false);
  const [showClosed, setShowClosed] = useState(false);

  const openRows = group.isFixedIncome
    ? group.rows.filter((r) => r.carteiraBrl > 0)
    : group.rows.filter((r) => r.qty > 0);

  const allClosed = group.isFixedIncome
    ? group.rows.filter((r) => r.carteiraBrl <= 0)
    : group.rows.flatMap((r) => r.closedCycles);

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 min-h-[52px] active:bg-surface-2 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-xs transition-transform flex-shrink-0 ${open ? "rotate-90" : ""}`}>▶</span>
          <span className="text-sm font-semibold text-text-primary">{group.tagName}</span>
          <span className="text-xs text-muted flex-shrink-0">({openRows.length})</span>
          {group.allocationPct > 0 && (
            <span className="text-[10px] text-muted bg-surface-3 px-1.5 py-0.5 rounded-full flex-shrink-0">
              {group.allocationPct.toFixed(0)}%
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0 ml-2">
          <span className="text-sm font-mono text-text-primary">
            {group.totalCarteira > 0 ? formatCurrency(group.totalCarteira, "BRL") : formatCurrency(group.totalAporte, "BRL")}
          </span>
          <div className="flex items-center gap-1.5">
            {group.totalCarteira > 0 && <RetornoBadge pct={group.retornoPct} />}
            {group.oldestLastUpdate && (
              <span className="text-[10px] text-muted">
                {group.oldestLastUpdate.split("-").reverse().join("/")}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Rows */}
      {open && (
        <div className="border-t border-border divide-y divide-border">
          {openRows.map((row) => {
            const retPct = row.aporteBrl > 0 ? ((row.carteiraBrl - row.aporteBrl) / row.aporteBrl) * 100 : 0;
            return (
              <div key={row.symbol} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-semibold text-primary truncate">{row.symbol}</p>
                    {!group.isFixedIncome && row.qty > 0 && (
                      <p className="text-xs text-muted mt-0.5">
                        {row.qty % 1 === 0
                          ? row.qty.toLocaleString("pt-BR")
                          : row.qty.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 5 })} unid.
                        {row.currentPrice !== null && (
                          <span className="ml-1">
                            · {row.priceCurrency === "USD"
                              ? `$${row.currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : formatCurrency(row.currentPrice, "BRL")}
                          </span>
                        )}
                      </p>
                    )}
                    {group.isFixedIncome && row.details.length > 0 && (
                      <p className="text-xs text-muted mt-0.5">
                        {row.details[0].index ?? "—"}{row.details[0].indexRate ? ` ${row.details[0].indexRate}%` : ""}
                        {row.details.length > 1 && ` · ${row.details.length} aportes`}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end shrink-0 gap-0.5">
                    <span className="text-sm font-mono text-text-primary">
                      {row.carteiraBrl > 0 ? formatCurrency(row.carteiraBrl, "BRL") : formatCurrency(row.aporteBrl, "BRL")}
                    </span>
                    {row.carteiraBrl > 0 && <RetornoBadge pct={retPct} />}
                    <span className="text-xs text-muted">aporte {formatCurrency(row.aporteBrl, "BRL")}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Closed positions */}
          {allClosed.length > 0 && (
            <div>
              <button
                onClick={() => setShowClosed((v) => !v)}
                className="w-full px-4 py-2 text-xs text-muted text-left active:bg-surface-2 transition-colors"
              >
                {showClosed ? "▼" : "▶"} {allClosed.length} encerrada{allClosed.length > 1 ? "s" : ""}
              </button>
              {showClosed && (
                <div className="divide-y divide-border/50 opacity-60">
                  {group.isFixedIncome
                    ? (allClosed as SymbolRow[]).map((row) => (
                        <div key={row.symbol} className="flex items-center justify-between px-4 py-2">
                          <span className="text-sm font-mono text-muted">{row.symbol}</span>
                          <span className={`text-xs font-mono ${(row.carteiraBrl - row.aporteBrl) >= 0 ? "text-accent" : "text-danger"}`}>
                            {(row.carteiraBrl - row.aporteBrl) >= 0 ? "+" : ""}{formatCurrency(row.carteiraBrl - row.aporteBrl, "BRL")}
                          </span>
                        </div>
                      ))
                    : (allClosed as ClosedCycle[]).map((c, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-2">
                          <span className="text-sm font-mono text-muted">{c.symbol}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted">{formatCurrency(c.buysTotal, "BRL")} → {formatCurrency(c.sellsTotal, "BRL")}</span>
                            <span className={`text-xs font-mono ${c.result >= 0 ? "text-accent" : "text-danger"}`}>
                              {c.result >= 0 ? "+" : ""}{formatCurrency(c.result, "BRL")}
                            </span>
                          </div>
                        </div>
                      ))}
                </div>
              )}
            </div>
          )}

          {/* Group total */}
          <div className="flex items-center justify-between px-4 py-2 bg-surface-2">
            <span className="text-xs text-muted uppercase font-semibold">Total</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">{formatCurrency(group.totalAporte, "BRL")}</span>
              <span className="text-sm font-mono font-semibold text-text-primary">
                {group.totalCarteira > 0 ? formatCurrency(group.totalCarteira, "BRL") : "—"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MiniInvestmentsPage() {
  const [groups, setGroups] = useState<TagGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [txData, tagList, catList, rateHist, pricesRes] = await Promise.all([
          transactionsApi.list({ page_size: 2000 }),
          tagsApi.list(),
          categoriesApi.list(),
          marketDataApi.exchangeRateHistory().catch(() => [] as ExchangeRateHistoryItem[]),
          marketDataApi.assetPrices().catch(() => ({ prices: [] as AssetPriceItem[] })),
        ]);

        const investmentTxs = txData.items.filter((tx) => tx.symbol || tx.index);
        const sortedRates = buildSortedRates(rateHist);

        // CDI: from earliest fixed-income tx to today (with 8s timeout)
        let cdiRates: CdiRateItem[] = [];
        const fixedTxs = investmentTxs.filter((tx) => tx.index);
        if (fixedTxs.length > 0) {
          const earliest = fixedTxs.map((tx) => tx.date_transaction.slice(0, 10)).sort()[0];
          const today = new Date().toISOString().slice(0, 10);
          try {
            const timeout = new Promise<never>((_, r) => setTimeout(() => r(new Error("timeout")), 8000));
            const cdi = await Promise.race([marketDataApi.cdiHistory(earliest, today), timeout]);
            cdiRates = cdi.sort((a, b) => a.date.localeCompare(b.date));
          } catch { /* BCB offline — CDI optional */ }
        }

        const built = buildGroups(investmentTxs, tagList, catList, sortedRates, pricesRes.prices, cdiRates);
        setGroups(built);
      } catch {
        setError("Erro ao carregar investimentos.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalAporte = groups.reduce((s, g) => s + g.totalAporte, 0);
  const totalCarteira = groups.reduce((s, g) => s + g.totalCarteira, 0);
  const retornoTotal = totalCarteira - totalAporte;
  const retornoPct = totalAporte > 0 ? (retornoTotal / totalAporte) * 100 : 0;

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      <h1 className="text-lg font-bold text-text-primary">Investimentos</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface border border-border rounded-2xl p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted">Aportado</p>
          <p className={`text-sm font-bold font-mono text-primary ${loading ? "opacity-30" : ""}`}>
            {loading ? "—" : formatCurrency(totalAporte, "BRL")}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted">Carteira</p>
          <p className={`text-sm font-bold font-mono text-text-primary ${loading ? "opacity-30" : ""}`}>
            {loading ? "—" : totalCarteira > 0 ? formatCurrency(totalCarteira, "BRL") : "—"}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted">Retorno</p>
          <p className={`text-sm font-bold font-mono ${retornoTotal >= 0 ? "text-accent" : "text-danger"} ${loading ? "opacity-30" : ""}`}>
            {loading ? "—" : totalCarteira > 0 ? `${retornoPct >= 0 ? "+" : ""}${retornoPct.toFixed(1)}%` : "—"}
          </p>
        </div>
      </div>

      {/* Total result card */}
      {!loading && totalCarteira > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted mb-1">Resultado</p>
            <p className={`text-2xl font-bold font-mono ${retornoTotal >= 0 ? "text-accent" : "text-danger"}`}>
              {retornoTotal >= 0 ? "+" : ""}{formatCurrency(retornoTotal, "BRL")}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted mb-1">vs aportado</span>
            <RetornoBadge pct={retornoPct} />
          </div>
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
          {groups.map((group) => (
            <GroupCard key={group.tagName} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
