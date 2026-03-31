"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  ArcElement,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import {
  transactionsApi,
  tagsApi,
  categoriesApi,
  marketDataApi,
  adminApi,
  Transaction,
  Tag,
  Category,
  ExchangeRateHistoryItem,
  AssetPriceHistoryItem,
  CdiRateItem,
} from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { ChartFullscreen } from "@/components/ui/ChartFullscreen";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  ArcElement,
  BarElement,
  Tooltip,
  Legend,
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface RateEntry {
  USD: number;
  EUR: number;
}

interface TxDetail {
  tx: Transaction;
  principalBrl: number;
  currentBrl: number;
  returnPct: number;
}

interface ClosedCycle {
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
  details: TxDetail[]; // for fixed-income drill-down
  closedCycles: ClosedCycle[];
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
}

// ─── CDI helpers ──────────────────────────────────────────────────────────────

function buildCdiMap(rates: CdiRateItem[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rates) m.set(r.date, r.rate_pct);
  return m;
}

/** Accumulate CDI from fromDate to toDate inclusive, applying indexRate% of CDI.
 *  indexRate = 100 → 100% CDI, 110 → 110% CDI, etc. */
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

/** Accumulate fixed annual rate (non-CDI). rate_pct = annual % e.g. 12.5 */
function accumulateFixed(
  principal: number,
  annualPct: number,
  fromDate: string,
  toDate: string,
): number {
  const msPerDay = 86_400_000;
  const days = Math.max(
    0,
    (new Date(toDate).getTime() - new Date(fromDate).getTime()) / msPerDay,
  );
  return principal * Math.pow(1 + annualPct / 100, days / 365);
}

// ─── Rate helpers ─────────────────────────────────────────────────────────────

function buildSortedRates(
  history: ExchangeRateHistoryItem[],
): { date: string; USD: number; EUR: number }[] {
  return [...history]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      date: r.date,
      USD: r.USD ?? 5.0,
      EUR: r.EUR ?? 5.5,
    }));
}

function getRateForDate(
  sorted: { date: string; USD: number; EUR: number }[],
  dateStr: string,
): RateEntry {
  const d = dateStr.slice(0, 10);
  let best = sorted[0] ?? { date: "", USD: 5.0, EUR: 5.5 };
  for (const r of sorted) {
    if (r.date <= d) best = r;
    else break;
  }
  return { USD: best.USD, EUR: best.EUR };
}

function convertToBrl(
  value: number,
  currency: string,
  rate: RateEntry,
): number {
  if (currency === "USD") return value * rate.USD;
  if (currency === "EUR") return value * rate.EUR;
  return value;
}

// ─── Cycle splitter ───────────────────────────────────────────────────────────

function splitCycles(
  txs: Transaction[],
  tags: Tag[],
  sortedRates: { date: string; USD: number; EUR: number }[],
): { closed: ClosedCycle[]; activeTxs: Transaction[] } {
  const sorted = [...txs].sort((a, b) =>
    a.date_transaction.localeCompare(b.date_transaction),
  );
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

// ─── Group builder ────────────────────────────────────────────────────────────

const ORDER = ["Crypto", "Ações", "Stocks", "Renda Fixa"];

function buildGroups(
  txs: Transaction[],
  tags: Tag[],
  categories: Category[],
  sortedRates: { date: string; USD: number; EUR: number }[],
  priceHistory: AssetPriceHistoryItem[],
  sortedCdi: CdiRateItem[],
): TagGroup[] {
  const latestPrice = new Map<string, { price: number; currency: string }>();
  const lastUpdateBySymbol = new Map<string, string>();
  for (const p of [...priceHistory].sort((a, b) => a.date.localeCompare(b.date))) {
    latestPrice.set(p.symbol.toUpperCase(), { price: p.price, currency: p.currency });
    lastUpdateBySymbol.set(p.symbol.toUpperCase(), p.date);
  }

  const latestRate = sortedRates[sortedRates.length - 1] ?? {
    USD: 5.0,
    EUR: 5.5,
  };
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
      {
        aporteBrl: number;
        rendimentoBrl: number;
        qty: number;
        txList: Transaction[];
        closedCycles: ClosedCycle[];
      }
    >();

    if (!isFixedIncome) {
      // Collect txs per symbol, then split into cycles
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
        if (isIncome) { agg.qty -= tx.quantity ?? 0; agg.aporteBrl -= valBrl; }
        else { agg.qty += tx.quantity ?? 0; agg.aporteBrl += valBrl; }
      }
    }

    const rows: SymbolRow[] = [];

    for (const [sym, agg] of bySymbol) {
      const priceEntry = latestPrice.get(sym.toUpperCase());
      const currentPrice = priceEntry?.price ?? null;
      const priceCurrency = priceEntry?.currency ?? "BRL";

      // Per-transaction detail for fixed income
      const details: TxDetail[] = [];
      if (isFixedIncome) {
        for (const tx of agg.txList) {
          const tag = tags.find((t) => t.id === tx.tag_id);
          const isIncome = tag?.type === "income";
          if (isIncome) continue; // skip resgates in drill-down (shown as net)
          const rate = getRateForDate(sortedRates, tx.date_transaction);
          const princBrl = convertToBrl(tx.value, tx.currency, rate);
          const txDate = tx.date_transaction.slice(0, 10);
          let curBrl: number;

          if (tx.index?.toUpperCase() === "CDI" && sortedCdi.length > 0) {
            curBrl = accumulateCdi(
              princBrl,
              tx.index_rate ?? 100,
              sortedCdi,
              txDate,
              todayStr,
            );
          } else if (tx.index_rate) {
            curBrl = accumulateFixed(princBrl, tx.index_rate, txDate, todayStr);
          } else {
            curBrl = princBrl;
          }

          const returnPct =
            princBrl > 0 ? ((curBrl - princBrl) / princBrl) * 100 : 0;
          details.push({
            tx,
            principalBrl: princBrl,
            currentBrl: curBrl,
            returnPct,
          });
        }
      }

      let carteiraBrl: number;
      if (isFixedIncome) {
        if (agg.aporteBrl <= 0) {
          // Fully resgated — position closed
          carteiraBrl = 0;
        } else if (details.length > 0) {
          // Scale CDI-accumulated value by remaining invested ratio
          const originalAporte = details.reduce((s, d) => s + d.principalBrl, 0);
          const cdiAccumulated = details.reduce((s, d) => s + d.currentBrl, 0);
          const ratio = originalAporte > 0 ? Math.min(1, agg.aporteBrl / originalAporte) : 1;
          carteiraBrl = cdiAccumulated * ratio;
        } else {
          carteiraBrl = agg.aporteBrl;
        }
      } else if (currentPrice !== null && agg.qty > 0) {
        carteiraBrl = convertToBrl(
          agg.qty * currentPrice,
          priceCurrency,
          latestRate,
        );
      } else {
        carteiraBrl = 0;
      }

      rows.push({
        symbol: sym,
        qty: agg.qty,
        aporteBrl: agg.aporteBrl,
        carteiraBrl,
        currentPrice,
        priceCurrency,
        details,
        closedCycles: agg.closedCycles,
      });
    }

    rows.sort((a, b) => b.aporteBrl - a.aporteBrl);

    const totalAporte = rows.reduce((s, r) => s + r.aporteBrl, 0);
    const totalCarteira = rows.reduce((s, r) => s + r.carteiraBrl, 0);
    const retornoBrl = totalCarteira - totalAporte;
    const retornoPct = totalAporte > 0 ? (retornoBrl / totalAporte) * 100 : 0;

    let oldestLastUpdate: string | null = null;
    if (!isFixedIncome) {
      for (const row of rows) {
        const lu = lastUpdateBySymbol.get(row.symbol.toUpperCase());
        if (lu !== undefined) {
          if (oldestLastUpdate === null || lu < oldestLastUpdate) oldestLastUpdate = lu;
        }
      }
    }

    groups.push({
      tagName,
      isFixedIncome,
      rows,
      totalAporte,
      totalCarteira,
      retornoBrl,
      retornoPct,
      oldestLastUpdate,
    });
  }

  groups.sort((a, b) => {
    const ia = ORDER.indexOf(a.tagName),
      ib = ORDER.indexOf(b.tagName);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });

  return groups;
}

// ─── Chart builders ───────────────────────────────────────────────────────────

function buildPortfolioChart(
  txs: Transaction[],
  tags: Tag[],
  sortedRates: { date: string; USD: number; EUR: number }[],
  priceHistory: AssetPriceHistoryItem[],
  sortedCdi: CdiRateItem[],
) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const hasMarket = priceHistory.length > 0;
  // tx.index is the authoritative flag for fixed income — regardless of symbol
  const fixedIncomeTxs = txs.filter((tx) => tx.index);
  const hasFixedIncome = fixedIncomeTxs.length > 0;

  if (!hasMarket && !hasFixedIncome) return null;

  let rawDates: string[];
  if (hasMarket) {
    rawDates = [...new Set(priceHistory.map((p) => p.date))].sort();
  } else {
    // Generate monthly dates from earliest fixed income tx to today
    const earliest = fixedIncomeTxs
      .map((tx) => tx.date_transaction.slice(0, 7))
      .sort()[0];
    const [ey, em] = earliest.split("-").map(Number);
    const [ty, tm] = todayStr.split("-").map(Number);
    const monthly: string[] = [];
    let y = ey,
      m = em;
    while (y < ty || (y === ty && m <= tm)) {
      monthly.push(`${y}-${String(m).padStart(2, "0")}-15`);
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    rawDates = monthly;
  }

  // Always extend to today so recent transactions are reflected
  const dates =
    rawDates[rawDates.length - 1] < todayStr
      ? [...rawDates, todayStr]
      : rawDates;

  const priceByDateSym = new Map<
    string,
    Map<string, { price: number; currency: string }>
  >();
  for (const p of priceHistory) {
    if (!priceByDateSym.has(p.date)) priceByDateSym.set(p.date, new Map());
    priceByDateSym
      .get(p.date)!
      .set(p.symbol.toUpperCase(), { price: p.price, currency: p.currency });
  }

  const sortedTxs = [...txs].sort((a, b) =>
    a.date_transaction.localeCompare(b.date_transaction),
  );
  const points: { date: string; value: number; invested: number }[] = [];

  // Carry-forward: keep last known price per symbol so weekend gaps don't drop to 0
  const lastKnownPrice = new Map<string, { price: number; currency: string }>();
  const cumulativeQtys = new Map<string, number>();
  let cumulativeInvested = 0;
  let txCursor = 0;

  for (const date of dates) {
    // Update last-known prices for this date
    const dayPrices = priceByDateSym.get(date);
    if (dayPrices) {
      for (const [sym, pe] of dayPrices) lastKnownPrice.set(sym, pe);
    }

    // Absorb all transactions up to and including this date
    while (txCursor < sortedTxs.length) {
      const tx = sortedTxs[txCursor];
      if (tx.date_transaction.slice(0, 10) > date) break;
      txCursor++;
      const tag = tags.find((t) => t.id === tx.tag_id);
      const isIncome = tag?.type === "income";
      const rate = getRateForDate(sortedRates, tx.date_transaction);
      const valueBrl = convertToBrl(tx.value, tx.currency, rate);
      // Track invested for ALL txs (market + fixed income)
      cumulativeInvested += isIncome ? -valueBrl : valueBrl;
      // Track market qty only for symbol-based txs WITHOUT index (pure market assets)
      if (tx.symbol && !tx.index) {
        const symUpper = tx.symbol.toUpperCase();
        const prev = cumulativeQtys.get(symUpper) ?? 0;
        cumulativeQtys.set(
          symUpper,
          isIncome ? prev - (tx.quantity ?? 0) : prev + (tx.quantity ?? 0),
        );
      }
    }

    // Market value: qty × current price
    const rate = getRateForDate(sortedRates, date);
    let totalValue = 0;
    for (const [sym, qty] of cumulativeQtys) {
      if (qty <= 0) continue;
      const pe = lastKnownPrice.get(sym);
      if (!pe) continue;
      totalValue += convertToBrl(qty * pe.price, pe.currency, rate);
    }

    // Fixed income value: accumulate each aporte to this date, subtract resgates
    if (hasFixedIncome) {
      let fixedAccum = 0;
      let fixedResgates = 0;
      for (const tx of fixedIncomeTxs) {
        const txDate = tx.date_transaction.slice(0, 10);
        if (txDate > date) continue;
        const tag = tags.find((t) => t.id === tx.tag_id);
        const isIncome = tag?.type === "income";
        const txRate = getRateForDate(sortedRates, tx.date_transaction);
        const valBrl = convertToBrl(tx.value, tx.currency, txRate);
        if (isIncome) {
          fixedResgates += valBrl;
        } else if (tx.index?.toUpperCase() === "CDI" && sortedCdi.length > 0) {
          fixedAccum += accumulateCdi(
            valBrl,
            tx.index_rate ?? 100,
            sortedCdi,
            txDate,
            date,
          );
        } else if (tx.index_rate) {
          fixedAccum += accumulateFixed(valBrl, tx.index_rate, txDate, date);
        } else {
          fixedAccum += valBrl;
        }
      }
      totalValue += Math.max(0, fixedAccum - fixedResgates);
    }

    if (totalValue > 0 || cumulativeInvested > 0)
      points.push({ date, value: totalValue, invested: cumulativeInvested });
  }
  return points;
}

function buildMonthlyFlow(
  txs: Transaction[],
  tags: Tag[],
  sortedRates: { date: string; USD: number; EUR: number }[],
) {
  const byMonth = new Map<string, { aportes: number; resgates: number }>();
  for (const tx of txs) {
    const month = tx.date_transaction.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, { aportes: 0, resgates: 0 });
    const tag = tags.find((t) => t.id === tx.tag_id);
    const isIncome = tag?.type === "income";
    const rate = getRateForDate(sortedRates, tx.date_transaction);
    const val = convertToBrl(tx.value, tx.currency, rate);
    const m = byMonth.get(month)!;
    if (isIncome) m.resgates += val;
    else m.aportes += val;
  }
  return [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  backgroundColor: "#141A22",
  borderColor: "#20282F",
  borderWidth: 1,
  titleColor: "#e6edf3",
  bodyColor: "#8b949e",
  padding: 10,
};
const AXIS_STYLE = {
  ticks: { color: "#8b949e", font: { size: 10 } },
  grid: { color: "#20282F99" },
  border: { display: false },
};
const GROUP_COLORS = [
  "#2563eb",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#38bdf8",
  "#f97316",
];

function RetornoBadge({ pct }: { pct: number }) {
  const c = pct >= 0 ? "bg-accent/15 text-accent" : "bg-danger/15 text-danger";
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${c}`}
    >
      {pct >= 0 ? "+" : ""}
      {pct.toFixed(2)}%
    </span>
  );
}

// ─── Closed position helper ───────────────────────────────────────────────────

function isClosedRow(row: SymbolRow, isFixedIncome: boolean): boolean {
  return isFixedIncome ? row.carteiraBrl <= 0 : row.qty <= 0;
}

// ─── Fixed income table with drill-down ───────────────────────────────────────

function FixedIncomeTable({ rows }: { rows: SymbolRow[] }) {
  const { fmtDisplay } = useSettings();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  const openRows = rows.filter((r) => !isClosedRow(r, true));
  const closedRows = rows.filter((r) => isClosedRow(r, true));

  const totalAporte = openRows.reduce((s, r) => s + r.aporteBrl, 0);
  const totalCarteira = openRows.reduce((s, r) => s + r.carteiraBrl, 0);

  return (
    <div>
      {/* ── Mobile: card list ────────────────────────────────────────── */}
      <div className="md:hidden divide-y divide-border">
        {openRows.map((row) => {
          const retPct = row.aporteBrl > 0 ? ((row.carteiraBrl - row.aporteBrl) / row.aporteBrl) * 100 : 0;
          const isOpen = expanded === row.symbol;
          return (
            <div key={row.symbol}>
              <button
                className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-surface-2 transition-colors"
                onClick={() => setExpanded(isOpen ? null : row.symbol)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold text-primary">{row.symbol}</span>
                    {row.details.length > 0 && (
                      <span className="text-[10px] text-muted">{isOpen ? "▲" : "▼"} {row.details.length} aporte{row.details.length > 1 ? "s" : ""}</span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-1">
                    <div>
                      <span className="text-[9px] text-muted uppercase tracking-wide">Aporte</span>
                      <p className="text-xs font-mono text-text-secondary">{fmtDisplay(row.aporteBrl, "BRL")}</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted uppercase tracking-wide">Atual</span>
                      <p className="text-xs font-mono font-semibold text-text-primary">{fmtDisplay(row.carteiraBrl, "BRL")}</p>
                    </div>
                  </div>
                </div>
                <RetornoBadge pct={retPct} />
              </button>
              {isOpen && row.details.length > 0 && (
                <div className="bg-surface-2/50 px-4 py-3 border-t border-border/50">
                  <p className="text-[10px] uppercase tracking-wider text-muted mb-2">Aportes</p>
                  <div className="space-y-2">
                    {row.details.map((d) => (
                      <div key={d.tx.id} className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-mono text-muted">{formatDate(d.tx.date_transaction)}</p>
                          <p className="text-[10px] text-muted">{d.tx.index ?? "—"}{d.tx.index_rate ? ` ${d.tx.index_rate}%` : ""}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono text-accent">{fmtDisplay(d.currentBrl, "BRL")}</p>
                          <RetornoBadge pct={d.returnPct} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {closedRows.length > 0 && (
          <button className="w-full px-4 py-2.5 text-left text-xs text-muted hover:bg-surface-2 transition-colors"
            onClick={() => setShowClosed(v => !v)}>
            {showClosed ? "▼" : "▶"} {closedRows.length} encerrada{closedRows.length > 1 ? "s" : ""}
          </button>
        )}
        {showClosed && closedRows.map((row) => {
          const resultado = row.carteiraBrl - row.aporteBrl;
          return (
            <div key={row.symbol} className="px-4 py-3 opacity-50 flex items-center justify-between">
              <span className="text-sm font-mono font-semibold text-muted">{row.symbol}</span>
              <span className={`text-sm font-mono ${resultado >= 0 ? "text-accent" : "text-danger"}`}>
                {resultado >= 0 ? "+" : ""}{fmtDisplay(resultado, "BRL")}
              </span>
            </div>
          );
        })}
        <div className="px-4 py-3 bg-surface-2 flex items-center justify-between border-t border-border">
          <span className="text-xs font-semibold text-muted uppercase">Total</span>
          <div className="text-right">
            <p className="text-xs font-mono text-text-secondary">{fmtDisplay(totalAporte, "BRL")} aportado</p>
            <p className="text-sm font-mono font-semibold text-text-primary">{fmtDisplay(totalCarteira, "BRL")}</p>
          </div>
        </div>
      </div>

      {/* ── Desktop: table ────────────────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-2/60 border-b border-border">
              {["Ativo", "Aporte", "Atual", "Ganho", "Retorno"].map((h, i) => (
                <th key={h} className={`px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted font-semibold ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {openRows.map((row) => {
              const ganho = row.carteiraBrl - row.aporteBrl;
              const retPct = row.aporteBrl > 0 ? (ganho / row.aporteBrl) * 100 : 0;
              const isOpen = expanded === row.symbol;
              const profitable = ganho >= 0;
              return (
                <React.Fragment key={row.symbol}>
                  <tr
                    className="border-b border-border hover:bg-surface-2 transition-colors cursor-pointer group"
                    onClick={() => setExpanded(isOpen ? null : row.symbol)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-mono font-bold text-primary">{row.symbol}</span>
                        {row.details.length > 0 && (
                          <span className="text-[10px] text-muted bg-surface-3 px-1.5 py-0.5 rounded">
                            {isOpen ? "▲" : "▼"} {row.details.length}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-right text-muted">{fmtDisplay(row.aporteBrl, "BRL")}</td>
                    <td className="px-4 py-3 text-sm font-mono text-right font-semibold text-text-primary">{fmtDisplay(row.carteiraBrl, "BRL")}</td>
                    <td className={`px-4 py-3 text-sm font-mono text-right font-medium ${profitable ? "text-accent" : "text-danger"}`}>
                      {profitable ? "+" : ""}{fmtDisplay(ganho, "BRL")}
                    </td>
                    <td className="px-4 py-3 text-right"><RetornoBadge pct={retPct} /></td>
                  </tr>
                  {isOpen && row.details.length > 0 && (
                    <tr className="border-b border-border">
                      <td colSpan={5} className="px-4 py-4 bg-surface-2/40">
                        <p className="text-[10px] uppercase tracking-wider text-muted mb-3">Detalhes por aporte</p>
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border/50">
                              {["Data", "Índice", "Principal", "Atual", "Ganho", "Retorno"].map((h, i) => (
                                <th key={h} className={`pb-2 text-[10px] uppercase tracking-wider text-muted font-semibold ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {row.details.map((d) => {
                              const g = d.currentBrl - d.principalBrl;
                              return (
                                <tr key={d.tx.id}>
                                  <td className="py-2 text-xs font-mono text-muted">{d.tx.date_transaction.slice(0, 10).split("-").reverse().join("/")}</td>
                                  <td className="py-2 text-xs text-right text-text-secondary">
                                    <span className="bg-surface-3 px-1.5 py-0.5 rounded text-[10px]">{d.tx.index ?? "—"}{d.tx.index_rate ? ` ${d.tx.index_rate}%` : ""}</span>
                                  </td>
                                  <td className="py-2 text-xs font-mono text-right text-text-secondary">{fmtDisplay(d.principalBrl, "BRL")}</td>
                                  <td className="py-2 text-xs font-mono text-right font-semibold text-text-primary">{fmtDisplay(d.currentBrl, "BRL")}</td>
                                  <td className="py-2 text-xs font-mono text-right text-accent">+{fmtDisplay(g, "BRL")}</td>
                                  <td className="py-2 text-right"><RetornoBadge pct={d.returnPct} /></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            {closedRows.length > 0 && (
              <>
                <tr className="border-t border-border cursor-pointer hover:bg-surface-2 transition-colors" onClick={() => setShowClosed((v) => !v)}>
                  <td colSpan={5} className="px-4 py-2.5 text-xs text-muted">
                    {showClosed ? "▼" : "▶"} {closedRows.length} posição{closedRows.length > 1 ? "s" : ""} encerrada{closedRows.length > 1 ? "s" : ""}
                  </td>
                </tr>
                {showClosed && closedRows.map((row) => {
                  const resultado = row.carteiraBrl - row.aporteBrl;
                  return (
                    <tr key={row.symbol} className="border-b border-border/40 opacity-50">
                      <td className="px-4 py-2 text-sm font-mono font-semibold text-muted">{row.symbol}</td>
                      <td className="px-4 py-2 text-sm font-mono text-right text-muted">{fmtDisplay(row.aporteBrl, "BRL")}</td>
                      <td className="px-4 py-2 text-sm font-mono text-right text-muted">—</td>
                      <td className={`px-4 py-2 text-sm font-mono text-right ${resultado >= 0 ? "text-accent" : "text-danger"}`}>{resultado >= 0 ? "+" : ""}{fmtDisplay(resultado, "BRL")}</td>
                      <td className="px-4 py-2" />
                    </tr>
                  );
                })}
              </>
            )}
            <tr className="border-t-2 border-border bg-surface-2">
              <td className="px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">Total</td>
              <td className="px-4 py-3 text-sm font-mono text-right text-muted">{fmtDisplay(totalAporte, "BRL")}</td>
              <td className="px-4 py-3 text-sm font-mono text-right font-bold text-text-primary">{fmtDisplay(totalCarteira, "BRL")}</td>
              <td className={`px-4 py-3 text-sm font-mono text-right font-bold ${totalCarteira >= totalAporte ? "text-accent" : "text-danger"}`}>
                {totalCarteira >= totalAporte ? "+" : ""}{fmtDisplay(totalCarteira - totalAporte, "BRL")}
              </td>
              <td className="px-4 py-3 text-right">
                {totalAporte > 0 && <RetornoBadge pct={(totalCarteira - totalAporte) / totalAporte * 100} />}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Market asset table (crypto / stocks) ─────────────────────────────────────

function MarketTable({ group }: { group: TagGroup }) {
  const { fmtDisplay } = useSettings();
  const [showClosed, setShowClosed] = useState(false);

  const openRows = group.rows.filter((r) => r.qty > 0);
  const allClosed = group.rows.flatMap((r) =>
    r.closedCycles.map((c) => ({ symbol: r.symbol, ...c })),
  );
  const usd = group.rows.some((r) => r.priceCurrency === "USD");

  const totalAporte = openRows.reduce((s, r) => s + r.aporteBrl, 0);
  const totalCarteira = openRows.reduce((s, r) => s + r.carteiraBrl, 0);

  return (
    <div>
      {/* ── Mobile: card list ─────────────────────────────────────── */}
      <div className="md:hidden divide-y divide-border">
        {openRows.map((row) => {
          const retPct = row.aporteBrl > 0 ? ((row.carteiraBrl - row.aporteBrl) / row.aporteBrl) * 100 : 0;
          const peso = group.totalCarteira > 0 ? (row.carteiraBrl / group.totalCarteira) * 100 : 0;
          const priceStr = row.currentPrice !== null
            ? row.priceCurrency === "USD"
              ? `$${row.currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : fmtDisplay(row.currentPrice, "BRL")
            : "—";
          const qtyStr = row.qty % 1 === 0
            ? row.qty.toLocaleString("pt-BR")
            : row.qty.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 5 });
          return (
            <div key={row.symbol} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-primary text-sm">{row.symbol}</span>
                {row.carteiraBrl > 0 ? <RetornoBadge pct={retPct} /> : <span className="text-xs text-muted">—</span>}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                <div>
                  <span className="text-[9px] text-muted uppercase tracking-wider">Aporte</span>
                  <p className="text-xs font-mono text-text-secondary">{fmtDisplay(row.aporteBrl, "BRL")}</p>
                </div>
                <div>
                  <span className="text-[9px] text-muted uppercase tracking-wider">Carteira</span>
                  <p className="text-xs font-mono font-semibold text-text-primary">{row.carteiraBrl > 0 ? fmtDisplay(row.carteiraBrl, "BRL") : "—"}</p>
                </div>
                <div>
                  <span className="text-[9px] text-muted uppercase tracking-wider">{usd ? "Preço (USD)" : "Preço"}</span>
                  <p className="text-xs font-mono text-muted">{priceStr}</p>
                </div>
                <div>
                  <span className="text-[9px] text-muted uppercase tracking-wider">Qtd · Peso</span>
                  <p className="text-xs font-mono text-muted">{qtyStr}{row.carteiraBrl > 0 ? ` · ${Math.round(peso)}%` : ""}</p>
                </div>
              </div>
            </div>
          );
        })}
        {allClosed.length > 0 && (
          <>
            <button
              onClick={() => setShowClosed((v) => !v)}
              className="w-full px-4 py-2.5 text-left text-xs text-muted hover:bg-surface-2 transition-colors"
            >
              {showClosed ? "▼" : "▶"} {allClosed.length} encerrada{allClosed.length > 1 ? "s" : ""}
            </button>
            {showClosed && allClosed.map((c, i) => (
              <div key={i} className="px-4 py-3 opacity-60">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-muted text-sm">{c.symbol}</span>
                  <RetornoBadge pct={c.resultPct} />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                  <div>
                    <span className="text-[9px] text-muted uppercase tracking-wider">Compra</span>
                    <p className="text-xs font-mono text-muted">{fmtDisplay(c.buysTotal, "BRL")}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted uppercase tracking-wider">Venda</span>
                    <p className="text-xs font-mono text-muted">{fmtDisplay(c.sellsTotal, "BRL")}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted uppercase tracking-wider">Resultado</span>
                    <p className={`text-xs font-mono ${c.result >= 0 ? "text-accent" : "text-danger"}`}>
                      {c.result >= 0 ? "+" : ""}{fmtDisplay(c.result, "BRL")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
        <div className="px-4 py-2.5 border-t border-border bg-surface-2 flex justify-between items-center">
          <span className="text-xs font-semibold text-muted uppercase">Total</span>
          <div className="flex gap-4 text-xs font-mono font-semibold text-text-primary">
            <span>{fmtDisplay(totalAporte, "BRL")}</span>
            <span>{fmtDisplay(totalCarteira, "BRL")}</span>
          </div>
        </div>
      </div>

      {/* ── Desktop: full table ───────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-2/60 border-b border-border">
              {[
                "Símbolo",
                usd ? "Preço (USD)" : "Preço",
                "Qtd",
                "Aporte",
                "Carteira",
                "Ganho",
                "Retorno",
                "Peso",
              ].map((h, i) => (
                <th key={h} className={`px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted font-semibold ${i === 0 ? "text-left" : "text-right"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {openRows.map((row) => {
              const ganho = row.carteiraBrl - row.aporteBrl;
              const retPct = row.aporteBrl > 0 ? (ganho / row.aporteBrl) * 100 : 0;
              const peso = group.totalCarteira > 0 ? (row.carteiraBrl / group.totalCarteira) * 100 : 0;
              const profitable = row.carteiraBrl > 0 && ganho >= 0;
              const priceStr = row.currentPrice !== null
                ? row.priceCurrency === "USD"
                  ? `$${row.currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : fmtDisplay(row.currentPrice, "BRL")
                : "—";
              const qtyStr = row.qty % 1 === 0
                ? row.qty.toLocaleString("pt-BR")
                : row.qty.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 5 });
              return (
                <tr key={row.symbol} className="hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono font-bold text-primary">{row.symbol}</td>
                  <td className="px-4 py-3 text-sm font-mono text-right text-muted">{priceStr}</td>
                  <td className="px-4 py-3 text-sm font-mono text-right text-muted">{qtyStr}</td>
                  <td className="px-4 py-3 text-sm font-mono text-right text-muted">{fmtDisplay(row.aporteBrl, "BRL")}</td>
                  <td className="px-4 py-3 text-sm font-mono text-right font-semibold text-text-primary">
                    {row.carteiraBrl > 0 ? fmtDisplay(row.carteiraBrl, "BRL") : "—"}
                  </td>
                  <td className={`px-4 py-3 text-sm font-mono text-right font-medium ${row.carteiraBrl > 0 ? (profitable ? "text-accent" : "text-danger") : "text-muted"}`}>
                    {row.carteiraBrl > 0 ? `${profitable ? "+" : ""}${fmtDisplay(ganho, "BRL")}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.carteiraBrl > 0 ? <RetornoBadge pct={retPct} /> : <span className="text-xs text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {row.carteiraBrl > 0 ? (
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs font-mono text-muted w-8 text-right">{Math.round(peso)}%</span>
                        <div className="w-14 h-1.5 rounded-full bg-surface-3 overflow-hidden">
                          <div className="h-full rounded-full bg-primary/70 transition-all" style={{ width: `${peso}%` }} />
                        </div>
                      </div>
                    ) : <span className="block text-right text-xs text-muted">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            {allClosed.length > 0 && (
              <>
                <tr className="border-t border-border cursor-pointer hover:bg-surface-2 transition-colors" onClick={() => setShowClosed((v) => !v)}>
                  <td colSpan={8} className="px-4 py-2.5 text-xs text-muted">
                    {showClosed ? "▼" : "▶"} {allClosed.length} posição{allClosed.length > 1 ? "s" : ""} encerrada{allClosed.length > 1 ? "s" : ""}
                  </td>
                </tr>
                {showClosed && (
                  <>
                    <tr className="bg-surface-2/40 border-b border-border/50">
                      {["Símbolo", "", "", "Compra", "Venda", "Resultado", "%", ""].map((h, i) => (
                        <td key={i} className={`px-4 py-1.5 text-[10px] uppercase tracking-wider text-muted font-semibold ${i > 0 ? "text-right" : ""}`}>{h}</td>
                      ))}
                    </tr>
                    {allClosed.map((c, i) => (
                      <tr key={i} className="border-b border-border/40 opacity-55">
                        <td className="px-4 py-2 text-sm font-mono font-bold text-muted">{c.symbol}</td>
                        <td colSpan={2} />
                        <td className="px-4 py-2 text-sm font-mono text-right text-muted">{fmtDisplay(c.buysTotal, "BRL")}</td>
                        <td className="px-4 py-2 text-sm font-mono text-right text-muted">{fmtDisplay(c.sellsTotal, "BRL")}</td>
                        <td className={`px-4 py-2 text-sm font-mono text-right ${c.result >= 0 ? "text-accent" : "text-danger"}`}>
                          {c.result >= 0 ? "+" : ""}{fmtDisplay(c.result, "BRL")}
                        </td>
                        <td className="px-4 py-2 text-right"><RetornoBadge pct={c.resultPct} /></td>
                        <td />
                      </tr>
                    ))}
                  </>
                )}
              </>
            )}
            <tr className="border-t-2 border-border bg-surface-2">
              <td colSpan={3} className="px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">Total</td>
              <td className="px-4 py-3 text-sm font-mono text-right text-muted">{fmtDisplay(totalAporte, "BRL")}</td>
              <td className="px-4 py-3 text-sm font-mono text-right font-bold text-text-primary">{fmtDisplay(totalCarteira, "BRL")}</td>
              <td className={`px-4 py-3 text-sm font-mono text-right font-bold ${totalCarteira >= totalAporte ? "text-accent" : "text-danger"}`}>
                {totalCarteira >= totalAporte ? "+" : ""}{fmtDisplay(totalCarteira - totalAporte, "BRL")}
              </td>
              <td className="px-4 py-3 text-right">
                {totalAporte > 0 && <RetornoBadge pct={(totalCarteira - totalAporte) / totalAporte * 100} />}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvestmentsPage() {
  const { fmtDisplay, displayCurrency } = useSettings();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rateHistory, setRateHistory] = useState<ExchangeRateHistoryItem[]>([]);
  const [priceHistory, setPriceHistory] = useState<AssetPriceHistoryItem[]>([]);
  const [cdiRates, setCdiRates] = useState<CdiRateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<"idle" | "done" | "error">("idle");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [txData, tagList, catList, rateHist, priceHist] = await Promise.all([
      transactionsApi.list({ page_size: 2000 }),
      tagsApi.list(),
      categoriesApi.list(),
      marketDataApi.exchangeRateHistory(),
      marketDataApi.assetPriceHistory(),
    ]);
    setTransactions(txData.items);
    setTags(tagList);
    setCategories(catList);
    setRateHistory(rateHist);
    setPriceHistory(priceHist);

    const allTxs = txData.items.filter((tx) => tx.index);
    if (allTxs.length > 0) {
      const earliest = allTxs.map((tx) => tx.date_transaction.slice(0, 10)).sort()[0];
      const today = new Date().toISOString().slice(0, 10);
      try {
        const cdi = await marketDataApi.cdiHistory(earliest, today);
        setCdiRates(cdi.sort((a, b) => a.date.localeCompare(b.date)));
      } catch {
        /* BCB offline - CDI optional */
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshStatus("idle");
    try {
      await adminApi.runJob("exchange_rates");
      await adminApi.runJob("asset_prices");
      await loadData();
      setRefreshStatus("done");
      setTimeout(() => setRefreshStatus("idle"), 3000);
    } catch {
      setRefreshStatus("error");
      setTimeout(() => setRefreshStatus("idle"), 3000);
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const [chartTagFilter, setChartTagFilter] = useState<string[]>([]);
  const [portfolioFullscreen, setPortfolioFullscreen] = useState(false);

  const investmentTxs = useMemo(
    () => transactions.filter((tx) => tx.symbol || tx.index),
    [transactions]
  );
  const sortedRates = useMemo(() => buildSortedRates(rateHistory), [rateHistory]);
  const groups = useMemo(
    () => buildGroups(investmentTxs, tags, categories, sortedRates, priceHistory, cdiRates),
    [investmentTxs, tags, categories, sortedRates, priceHistory, cdiRates]
  );

  const saldoTotal = groups.reduce((s, g) => s + g.totalCarteira, 0);
  const totalAporte = groups.reduce((s, g) => s + g.totalAporte, 0);
  const retornoTotal = saldoTotal - totalAporte;
  const retornoPct = totalAporte > 0 ? (retornoTotal / totalAporte) * 100 : 0;
  const latestUsd = sortedRates[sortedRates.length - 1]?.USD ?? null;
  const activePositions = groups.reduce((s, g) => {
    if (g.isFixedIncome) return s + g.rows.filter(r => r.carteiraBrl > 0).length;
    return s + g.rows.filter(r => r.qty > 0).length;
  }, 0);

  const chartTxs = useMemo(
    () =>
      chartTagFilter.length === 0
        ? investmentTxs
        : investmentTxs.filter((tx) => {
            const tag = tags.find((t) => t.id === tx.tag_id);
            const cat = categories.find((c) => c.id === tag?.category_id);
            const groupName = cat?.name ?? tag?.name ?? "—";
            return chartTagFilter.includes(groupName);
          }),
    [chartTagFilter, investmentTxs, tags, categories]
  );

  const portfolioPoints = useMemo(
    () => buildPortfolioChart(chartTxs, tags, sortedRates, priceHistory, cdiRates),
    [chartTxs, tags, sortedRates, priceHistory, cdiRates]
  );
  const monthlyFlow = useMemo(
    () => buildMonthlyFlow(investmentTxs, tags, sortedRates),
    [investmentTxs, tags, sortedRates]
  );

  // ── TWR: accumulated return % and daily return %, excluding cash flows ──────
  const { twrPoints, dailyReturns } = useMemo(() => {
    if (!portfolioPoints || portfolioPoints.length < 2)
      return { twrPoints: [] as { date: string; twr: number }[], dailyReturns: [] as { date: string; ret: number }[] };
    const twrPoints: { date: string; twr: number }[] = [{ date: portfolioPoints[0].date, twr: 0 }];
    const dailyReturns: { date: string; ret: number }[] = [];
    let factor = 1;
    for (let i = 1; i < portfolioPoints.length; i++) {
      const prev = portfolioPoints[i - 1];
      const curr = portfolioPoints[i];
      const cf = curr.invested - prev.invested;
      const r = prev.value > 0 ? (curr.value - prev.value - cf) / prev.value : 0;
      factor *= 1 + r;
      twrPoints.push({ date: curr.date, twr: (factor - 1) * 100 });
      dailyReturns.push({ date: curr.date, ret: r * 100 });
    }
    return { twrPoints, dailyReturns };
  }, [portfolioPoints]);

  // ── Chart data ────────────────────────────────────────────────────────────

  const lineData =
    portfolioPoints && portfolioPoints.length > 0
      ? {
          labels: portfolioPoints.map((p) => {
            const [y, m, d] = p.date.split("-");
            return `${d}/${m}/${y.slice(2)}`; // ex: 08/03/26
          }),
          datasets: [
            {
              label: "Carteira",
              data: portfolioPoints.map((p) => p.value),
              borderColor: "#22c55e",
              backgroundColor: "rgba(34,197,94,0.13)",
              fill: true,
              tension: 0.3,
              pointRadius: 0,
              pointHoverRadius: 6,
              pointBackgroundColor: "#22c55e",
              borderWidth: 2,
            },
            {
              label: "Investido",
              data: portfolioPoints.map((p) => p.invested),
              borderColor: "#2563eb",
              backgroundColor: "transparent",
              fill: false,
              tension: 0.3,
              pointRadius: 0,
              pointHoverRadius: 6,
              pointBackgroundColor: "#2563eb",
              borderWidth: 1.5,
              borderDash: [4, 4],
            },
          ],
        }
      : null;

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#8b949e", font: { size: 11 }, boxWidth: 20 } },
      tooltip: {
        ...TOOLTIP_STYLE,
        mode: "index" as const,
        intersect: false,
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
            ` ${ctx.dataset.label ?? ""}: ${fmtDisplay(ctx.parsed.y ?? 0, "BRL")}`,
        },
      },
    },
    hover: { mode: "index" as const, intersect: false },
    scales: {
      x: { ...AXIS_STYLE, ticks: { ...AXIS_STYLE.ticks, maxTicksLimit: 6 } },
      y: {
        ...AXIS_STYLE,
        ticks: {
          ...AXIS_STYLE.ticks,
          callback: (v: number | string) =>
            `R$${(Number(v) / 1000).toFixed(0)}k`,
        },
      },
    },
  };

  const donutData = {
    labels: groups.map((g) => g.tagName),
    datasets: [
      {
        data: groups.map((g) => g.totalCarteira),
        backgroundColor: groups.map(
          (_, i) => GROUP_COLORS[i % GROUP_COLORS.length],
        ),
        borderColor: "#0E1218",
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };
  const donutOptions = {
    cutout: "65%",
    plugins: {
      legend: { display: false },
      tooltip: {
        ...TOOLTIP_STYLE,
        callbacks: {
          label: (ctx: { label: string; parsed: number }) =>
            ` ${ctx.label}: ${fmtDisplay(ctx.parsed, "BRL")}`,
        },
      },
    },
  };

  const barData = {
    labels: monthlyFlow.map(([m]) => {
      const [y, mo] = m.split("-");
      return `${mo}/${y.slice(2)}`;
    }),
    datasets: [
      {
        label: "Aportes",
        data: monthlyFlow.map(([, v]) => v.aportes),
        backgroundColor: "rgba(37,99,235,0.75)",
        borderRadius: 4,
      },
      {
        label: "Resgates",
        data: monthlyFlow.map(([, v]) => v.resgates),
        backgroundColor: "rgba(239,68,68,0.65)",
        borderRadius: 4,
      },
    ],
  };
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#8b949e", font: { size: 11 }, boxWidth: 20 } },
      tooltip: {
        ...TOOLTIP_STYLE,
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
            ` ${ctx.dataset.label ?? ""}: ${fmtDisplay(ctx.parsed.y ?? 0, "BRL")}`,
        },
      },
    },
    scales: {
      x: { ...AXIS_STYLE, ticks: { ...AXIS_STYLE.ticks, maxTicksLimit: 12 } },
      y: {
        ...AXIS_STYLE,
        ticks: {
          ...AXIS_STYLE.ticks,
          callback: (v: number | string) =>
            `R$${(Number(v) / 1000).toFixed(0)}k`,
        },
      },
    },
  };

  const lastTwr = twrPoints[twrPoints.length - 1]?.twr ?? 0;
  const twrColor = lastTwr >= 0 ? "#22c55e" : "#ef4444";
  const twrLineData = twrPoints.length > 1 ? {
    labels: twrPoints.map(p => { const [y, m, d] = p.date.split("-"); return `${d}/${m}/${y.slice(2)}`; }),
    datasets: [{
      label: "Rentabilidade Acumulada",
      data: twrPoints.map(p => p.twr),
      borderColor: twrColor,
      backgroundColor: lastTwr >= 0 ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)",
      fill: "origin" as const,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointBackgroundColor: twrColor,
      borderWidth: 2,
    }],
  } : null;

  const twrOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...TOOLTIP_STYLE,
        mode: "index" as const,
        intersect: false,
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
            ` ${ctx.dataset.label ?? ""}: ${(ctx.parsed.y ?? 0) >= 0 ? "+" : ""}${(ctx.parsed.y ?? 0).toFixed(2)}%`,
        },
      },
    },
    hover: { mode: "index" as const, intersect: false },
    scales: {
      x: { ...AXIS_STYLE, ticks: { ...AXIS_STYLE.ticks, maxTicksLimit: 6 } },
      y: {
        ...AXIS_STYLE,
        ticks: {
          ...AXIS_STYLE.ticks,
          callback: (v: number | string) => `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(1)}%`,
        },
      },
    },
  };

  const dailyReturnBarData = dailyReturns.length > 0 ? {
    labels: dailyReturns.map(p => { const [y, m, d] = p.date.split("-"); return `${d}/${m}/${y.slice(2)}`; }),
    datasets: [{
      label: "Retorno Diário",
      data: dailyReturns.map(p => p.ret),
      backgroundColor: dailyReturns.map(p => p.ret >= 0 ? "rgba(34,197,94,0.75)" : "rgba(239,68,68,0.65)"),
      borderRadius: 2,
    }],
  } : null;

  const dailyReturnOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...TOOLTIP_STYLE,
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
            ` Retorno: ${(ctx.parsed.y ?? 0) >= 0 ? "+" : ""}${(ctx.parsed.y ?? 0).toFixed(3)}%`,
        },
      },
    },
    scales: {
      x: { ...AXIS_STYLE, ticks: { ...AXIS_STYLE.ticks, maxTicksLimit: 8 } },
      y: {
        ...AXIS_STYLE,
        ticks: {
          ...AXIS_STYLE.ticks,
          callback: (v: number | string) => `${Number(v).toFixed(2)}%`,
        },
      },
    },
  };

  if (loading)
    return (
      <div className="px-4 md:px-6 py-5 space-y-6 animate-pulse">
        <div className="space-y-1">
          <div className="h-5 bg-surface-3 rounded w-40" />
          <div className="h-3 bg-surface-3 rounded w-28" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-2">
              <div className="h-2.5 bg-surface-3 rounded w-2/3" />
              <div className="h-6 bg-surface-3 rounded w-3/4" />
            </div>
          ))}
        </div>
        <div className="bg-surface border border-border rounded-xl p-5 h-80" />
      </div>
    );

  return (
    <div className="px-4 md:px-6 py-5 space-y-5">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Investimentos</h1>
          <p className="text-xs text-muted mt-0.5">
            {activePositions > 0 ? `${activePositions} posição${activePositions > 1 ? "ões ativas" : " ativa"} · ` : ""}
            {groups.length > 0 ? `${groups.length} classe${groups.length > 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Botão atualizar preços — útil no mobile quando Fly.io está dormindo */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Atualizar cotações e preços de mercado"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              refreshStatus === "done"
                ? "border-accent/40 text-accent bg-accent/10"
                : refreshStatus === "error"
                ? "border-danger/40 text-danger bg-danger/10"
                : "border-border text-muted hover:text-text-primary hover:bg-surface-2 active:scale-95"
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {refreshing ? (
              <svg className="animate-spin w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
              </svg>
            ) : refreshStatus === "done" ? (
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : refreshStatus === "error" ? (
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
            )}
            <span className="hidden sm:inline">
              {refreshing ? "Atualizando..." : refreshStatus === "done" ? "Atualizado!" : refreshStatus === "error" ? "Erro" : "Atualizar"}
            </span>
          </button>

          {saldoTotal > 0 && (
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold font-mono ${saldoTotal >= totalAporte ? "text-accent" : "text-danger"}`}>
                {fmtDisplay(saldoTotal, "BRL")}
              </span>
              <RetornoBadge pct={retornoPct} />
            </div>
          )}
        </div>
      </div>

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`bg-surface border border-border border-l-2 ${saldoTotal >= totalAporte ? "border-l-accent/40" : "border-l-danger/40"} rounded-xl p-4`}>
          <p className="text-xs uppercase tracking-wider text-muted">Carteira Atual</p>
          <p className={`text-xl font-bold font-mono mt-0.5 ${saldoTotal >= totalAporte ? "text-accent" : "text-danger"}`}>
            {fmtDisplay(saldoTotal, "BRL")}
          </p>
          <p className="text-[11px] text-muted mt-1">vs. {fmtDisplay(totalAporte, "BRL")} investido</p>
        </div>
        <div className="bg-surface border border-border border-l-2 border-l-primary/40 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-muted">Total Investido</p>
          <p className="text-xl font-bold font-mono mt-0.5 text-text-primary">{fmtDisplay(totalAporte, "BRL")}</p>
          <p className="text-[11px] text-muted mt-1">{activePositions} posição{activePositions !== 1 ? "ões" : ""} ativa{activePositions !== 1 ? "s" : ""}</p>
        </div>
        <div className={`bg-surface border border-border border-l-2 ${retornoTotal >= 0 ? "border-l-accent/40" : "border-l-danger/40"} rounded-xl p-4`}>
          <p className="text-xs uppercase tracking-wider text-muted">Retorno</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className={`text-xl font-bold font-mono ${retornoTotal >= 0 ? "text-accent" : "text-danger"}`}>
              {retornoTotal >= 0 ? "+" : ""}{fmtDisplay(retornoTotal, "BRL")}
            </p>
            {totalAporte > 0 && <RetornoBadge pct={retornoPct} />}
          </div>
        </div>
        <div className="bg-surface border border-border border-l-2 border-l-border rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-muted">Dólar (BRL)</p>
          <p className="text-xl font-bold font-mono mt-0.5 text-text-primary">{latestUsd ? fmtDisplay(latestUsd, "BRL") : "—"}</p>
          <p className="text-[11px] text-muted mt-1">{groups.length} classe{groups.length !== 1 ? "s" : ""} de ativos</p>
        </div>
      </div>

      {investmentTxs.length === 0 ? (
        <div className="text-center py-24 text-sm text-muted">
          Nenhuma transação de investimento encontrada.
        </div>
      ) : (
        <>
          {/* ── Charts: linha do tempo + donut lado a lado no desktop ─────── */}
          <div className="grid grid-cols-1 lg:grid-cols-[62%_38%] gap-5 items-start">

            {/* Linha do tempo */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 shrink-0">
                  <p className="text-xs uppercase tracking-wider text-muted">Evolução da Carteira</p>
                  <button
                    onClick={() => setPortfolioFullscreen(true)}
                    className="text-muted hover:text-text-primary p-0.5 rounded transition-colors"
                    title="Fullscreen"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </svg>
                  </button>
                </div>
                {groups.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 min-w-0">
                    {groups.map((g, i) => {
                      const active = chartTagFilter.includes(g.tagName);
                      return (
                        <button
                          key={g.tagName}
                          onClick={() =>
                            setChartTagFilter((prev) =>
                              active ? prev.filter((n) => n !== g.tagName) : [...prev, g.tagName]
                            )
                          }
                          className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                            active || chartTagFilter.length === 0
                              ? "border-transparent text-[#070B11]"
                              : "border-border bg-transparent text-muted hover:text-text-primary"
                          }`}
                          style={active || chartTagFilter.length === 0 ? { backgroundColor: GROUP_COLORS[i % GROUP_COLORS.length] } : {}}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: active || chartTagFilter.length === 0 ? "#070B11" : GROUP_COLORS[i % GROUP_COLORS.length] }}
                          />
                          {g.tagName}
                        </button>
                      );
                    })}
                    {chartTagFilter.length > 0 && (
                      <button onClick={() => setChartTagFilter([])} className="shrink-0 px-2 py-1 text-xs text-muted hover:text-text-primary transition-colors">
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="h-[220px] md:h-[300px]">
                {lineData ? (
                  <Line data={lineData} options={lineOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted">
                    Execute a carga histórica para gerar o gráfico.
                  </div>
                )}
              </div>
              {portfolioFullscreen && lineData && (
                <ChartFullscreen
                  title="Evolução da Carteira"
                  onClose={() => setPortfolioFullscreen(false)}
                >
                  <Line data={lineData} options={lineOptions} />
                </ChartFullscreen>
              )}
            </div>

            {/* Donut — alocação */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs uppercase tracking-wider text-muted mb-4">Alocação</p>
              <div className="flex flex-col items-center gap-5">
                <div className="relative" style={{ width: 172, height: 172 }}>
                  <Doughnut data={donutData} options={donutOptions} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] uppercase tracking-wider text-muted">Carteira</span>
                    <span className="text-sm font-bold font-mono text-text-primary mt-0.5">{fmtDisplay(saldoTotal, "BRL")}</span>
                    {totalAporte > 0 && <RetornoBadge pct={retornoPct} />}
                  </div>
                </div>
                <div className="w-full space-y-3">
                  {groups.map((g, i) => {
                    const pct = saldoTotal > 0 ? ((g.totalCarteira / saldoTotal) * 100) : 0;
                    const color = GROUP_COLORS[i % GROUP_COLORS.length];
                    return (
                      <div key={g.tagName}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                          <span className="text-xs text-text-secondary flex-1 truncate">{g.tagName}</span>
                          <span className="text-xs font-mono text-muted">{pct.toFixed(1)}%</span>
                          <span className="text-xs font-mono font-medium text-text-primary">{fmtDisplay(g.totalCarteira, "BRL")}</span>
                        </div>
                        <div className="h-1 rounded-full bg-surface-3 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Rentabilidade Acumulada + Retorno Diário ──────────────────── */}
          {(twrLineData || dailyReturnBarData) && (
            <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-5">

              {/* Rentabilidade Acumulada (TWR) */}
              {twrLineData && (
                <div className="bg-surface border border-border rounded-xl p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted">Rentabilidade Acumulada</p>
                      <p className="text-[11px] text-muted mt-0.5">Retorno real excluindo aportes (TWR)</p>
                    </div>
                    {twrPoints.length > 0 && (
                      <span className={`text-sm font-mono font-bold ${lastTwr >= 0 ? "text-accent" : "text-danger"}`}>
                        {lastTwr >= 0 ? "+" : ""}{lastTwr.toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <div className="h-[200px] md:h-[240px]">
                    <Line data={twrLineData} options={twrOptions} />
                  </div>
                </div>
              )}

              {/* Retorno Diário */}
              {dailyReturnBarData && (
                <div className="bg-surface border border-border rounded-xl p-5">
                  <div className="mb-4">
                    <p className="text-xs uppercase tracking-wider text-muted">Retorno Diário</p>
                    <p className="text-[11px] text-muted mt-0.5">Variação diária excluindo aportes</p>
                  </div>
                  <div className="h-[200px] md:h-[240px]">
                    <Bar data={dailyReturnBarData} options={dailyReturnOptions} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Bar: aportes vs resgates ──────────────────────────────────── */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <p className="text-xs uppercase tracking-wider text-muted mb-4">Aportes vs Resgates por Mês</p>
            <div className="h-[160px] md:h-[200px]">
              {monthlyFlow.length > 0 ? (
                <Bar data={barData} options={barOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted">Sem dados.</div>
              )}
            </div>
          </div>

          {/* ── Tables ────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {groups.map((group, i) => {
              const color = GROUP_COLORS[i % GROUP_COLORS.length];
              const openCount = group.isFixedIncome
                ? group.rows.filter(r => r.carteiraBrl > 0).length
                : group.rows.filter(r => r.qty > 0).length;
              return (
              <div key={group.tagName} className="bg-surface border border-border rounded-xl overflow-hidden" style={{ borderLeft: `3px solid ${color}` }}>
                <div
                  className="flex items-center justify-between px-4 py-3 border-b border-border"
                  style={{ background: color + "0D" }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-sm font-semibold text-text-primary truncate">{group.tagName}</span>
                    <span className="text-xs text-muted shrink-0">{openCount} ativo{openCount !== 1 ? "s" : ""}</span>
                    {group.oldestLastUpdate && (
                      <span className="text-xs text-muted shrink-0 hidden sm:inline">· {group.oldestLastUpdate.split("-").reverse().join("/")}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-mono font-semibold ${group.retornoBrl >= 0 ? "text-accent" : "text-danger"}`}>
                      {group.retornoBrl >= 0 ? "+" : ""}{fmtDisplay(group.retornoBrl, "BRL")}
                    </span>
                    <RetornoBadge pct={group.retornoPct} />
                  </div>
                </div>
                {group.isFixedIncome ? <FixedIncomeTable rows={group.rows} /> : <MarketTable group={group} />}
              </div>
            );
          })}
          </div>
        </>
      )}
    </div>
  );
}
