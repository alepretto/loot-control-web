"use client";

import React, { useEffect, useState } from "react";
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
  Transaction,
  Tag,
  Category,
  ExchangeRateHistoryItem,
  AssetPriceHistoryItem,
  CdiRateItem,
} from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

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
  for (const p of [...priceHistory].sort((a, b) => a.date.localeCompare(b.date)))
    latestPrice.set(p.symbol.toUpperCase(), { price: p.price, currency: p.currency });

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

    groups.push({
      tagName,
      isFixedIncome,
      rows,
      totalAporte,
      totalCarteira,
      retornoBrl,
      retornoPct,
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
};
const AXIS_STYLE = {
  ticks: { color: "#8b949e", font: { size: 10 } },
  grid: { color: "#20282F" },
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  const openRows = rows.filter((r) => !isClosedRow(r, true));
  const closedRows = rows.filter((r) => isClosedRow(r, true));

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-border">
          {["Ativo", "Aporte", "Atual", "Retorno"].map((h, i) => (
            <th
              key={h}
              className={`px-3 py-2 text-xs uppercase tracking-wider text-muted font-medium ${i === 0 ? "text-left" : "text-right"}`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {openRows.map((row) => {
          const rend = row.carteiraBrl - row.aporteBrl;
          const retPct = row.aporteBrl > 0 ? (rend / row.aporteBrl) * 100 : 0;
          const isOpen = expanded === row.symbol;
          return (
            <React.Fragment key={row.symbol}>
              <tr
                className="border-b border-border hover:bg-surface-2 transition-colors cursor-pointer"
                onClick={() => setExpanded(isOpen ? null : row.symbol)}
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold text-primary">
                      {row.symbol}
                    </span>
                    {row.details.length > 0 && (
                      <span className="text-[10px] text-muted">
                        {isOpen ? "▲" : "▼"} {row.details.length} aporte
                        {row.details.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-sm font-mono text-right text-text-primary">
                  {formatCurrency(row.aporteBrl, "BRL")}
                </td>
                <td className="px-3 py-2.5 text-sm font-mono text-right font-semibold text-text-primary">
                  {formatCurrency(row.carteiraBrl, "BRL")}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <RetornoBadge pct={retPct} />
                </td>
              </tr>

              {isOpen && row.details.length > 0 && (
                <tr className="border-b border-border bg-surface-2/50">
                  <td colSpan={4} className="px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted mb-2">
                      Detalhes por aporte
                    </p>
                    <table className="w-full">
                      <thead>
                        <tr>
                          {[
                            "Data",
                            "Índice",
                            "Principal",
                            "Atual",
                            "Ganho",
                            "Retorno",
                          ].map((h, i) => (
                            <th
                              key={h}
                              className={`text-[11px] uppercase tracking-wider text-muted font-medium pb-1 ${i === 0 ? "text-left" : "text-right"}`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {row.details.map((d) => (
                          <tr key={d.tx.id}>
                            <td className="py-1.5 text-xs font-mono text-muted">
                              {formatDate(d.tx.date_transaction)}
                            </td>
                            <td className="py-1.5 text-xs text-right text-text-secondary">
                              {d.tx.index ?? "—"}
                              {d.tx.index_rate ? ` ${d.tx.index_rate}%` : ""}
                            </td>
                            <td className="py-1.5 text-xs font-mono text-right text-text-primary">
                              {formatCurrency(d.principalBrl, "BRL")}
                            </td>
                            <td className="py-1.5 text-xs font-mono text-right text-accent">
                              {formatCurrency(d.currentBrl, "BRL")}
                            </td>
                            <td className="py-1.5 text-xs font-mono text-right text-accent">
                              +
                              {formatCurrency(
                                d.currentBrl - d.principalBrl,
                                "BRL",
                              )}
                            </td>
                            <td className="py-1.5 text-right">
                              <RetornoBadge pct={d.returnPct} />
                            </td>
                          </tr>
                        ))}
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
            <tr
              className="border-t border-border cursor-pointer hover:bg-surface-2 transition-colors"
              onClick={() => setShowClosed((v) => !v)}
            >
              <td colSpan={4} className="px-3 py-2 text-xs text-muted">
                {showClosed ? "▼" : "▶"} {closedRows.length} encerrada{closedRows.length > 1 ? "s" : ""}
              </td>
            </tr>
            {showClosed && closedRows.map((row) => {
              const resultado = row.carteiraBrl - row.aporteBrl;
              return (
                <tr key={row.symbol} className="border-b border-border/50 opacity-50">
                  <td className="px-3 py-2 text-sm font-mono font-semibold text-muted">{row.symbol}</td>
                  <td className="px-3 py-2 text-sm font-mono text-right text-muted">{formatCurrency(row.aporteBrl, "BRL")}</td>
                  <td className="px-3 py-2 text-sm font-mono text-right text-muted">—</td>
                  <td className="px-3 py-2 text-sm font-mono text-right">
                    <span className={resultado >= 0 ? "text-accent" : "text-danger"}>
                      {resultado >= 0 ? "+" : ""}{formatCurrency(resultado, "BRL")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </>
        )}
        <tr className="border-t border-border bg-surface-2">
          <td className="px-3 py-2 text-xs font-semibold text-muted uppercase">
            Total
          </td>
          <td className="px-3 py-2 text-sm font-mono text-right font-semibold text-text-primary">
            {formatCurrency(
              openRows.reduce((s, r) => s + r.aporteBrl, 0),
              "BRL",
            )}
          </td>
          <td className="px-3 py-2 text-sm font-mono text-right font-semibold text-text-primary">
            {formatCurrency(
              openRows.reduce((s, r) => s + r.carteiraBrl, 0),
              "BRL",
            )}
          </td>
          <td />
        </tr>
      </tfoot>
    </table>
  );
}

// ─── Market asset table (crypto / stocks) ─────────────────────────────────────

function MarketTable({ group }: { group: TagGroup }) {
  const [showClosed, setShowClosed] = useState(false);

  const openRows = group.rows.filter((r) => r.qty > 0);
  // Flatten all closed cycles from all rows, preserving symbol
  const allClosed = group.rows.flatMap((r) =>
    r.closedCycles.map((c) => ({ symbol: r.symbol, ...c })),
  );
  const usd = group.rows.some((r) => r.priceCurrency === "USD");

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-border">
          {[
            "Símbolo",
            usd ? "Preço (USD)" : "Preço",
            "Qtd",
            "Aporte (R$)",
            "Carteira (R$)",
            "Retorno",
            "Peso",
          ].map((h, i) => (
            <th
              key={h}
              className={`px-3 py-2 text-xs uppercase tracking-wider text-muted font-medium ${i === 0 ? "text-left" : "text-right"}`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {openRows.map((row) => {
          const retPct =
            row.aporteBrl > 0
              ? ((row.carteiraBrl - row.aporteBrl) / row.aporteBrl) * 100
              : 0;
          const peso =
            group.totalCarteira > 0
              ? (row.carteiraBrl / group.totalCarteira) * 100
              : 0;
          return (
            <tr key={row.symbol} className="hover:bg-surface-2 transition-colors">
              <td className="px-3 py-2.5 text-sm font-mono font-semibold text-primary">
                {row.symbol}
              </td>
              <td className="px-3 py-2.5 text-sm font-mono text-right text-muted">
                {row.currentPrice !== null
                  ? row.priceCurrency === "USD"
                    ? `$${row.currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : formatCurrency(row.currentPrice, "BRL")
                  : "—"}
              </td>
              <td className="px-3 py-2.5 text-sm font-mono text-right text-muted">
                {row.qty % 1 === 0
                  ? row.qty.toLocaleString("pt-BR")
                  : row.qty.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 5 })}
              </td>
              <td className="px-3 py-2.5 text-sm font-mono text-right text-text-primary">
                {formatCurrency(row.aporteBrl, "BRL")}
              </td>
              <td className="px-3 py-2.5 text-sm font-mono text-right text-text-primary">
                {row.carteiraBrl > 0 ? formatCurrency(row.carteiraBrl, "BRL") : "—"}
              </td>
              <td className="px-3 py-2.5 text-right">
                {row.carteiraBrl > 0 ? <RetornoBadge pct={retPct} /> : <span className="text-xs text-muted">—</span>}
              </td>
              <td className="px-3 py-2.5 text-sm font-mono text-right text-muted">
                {row.carteiraBrl > 0 ? `${Math.round(peso)}%` : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        {allClosed.length > 0 && (
          <>
            <tr
              className="border-t border-border cursor-pointer hover:bg-surface-2 transition-colors"
              onClick={() => setShowClosed((v) => !v)}
            >
              <td colSpan={7} className="px-3 py-2 text-xs text-muted">
                {showClosed ? "▼" : "▶"} {allClosed.length} encerrada{allClosed.length > 1 ? "s" : ""}
              </td>
            </tr>
            {showClosed && (
              <>
                <tr className="bg-surface-2/50">
                  {["Símbolo", "Compra", "Venda", "Resultado", "%", "", ""].map((h, i) => (
                    <td key={i} className={`px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted ${i > 0 ? "text-right" : ""}`}>
                      {h}
                    </td>
                  ))}
                </tr>
                {allClosed.map((c, i) => (
                  <tr key={i} className="border-b border-border/50 opacity-60">
                    <td className="px-3 py-2 text-sm font-mono font-semibold text-muted">{c.symbol}</td>
                    <td className="px-3 py-2 text-sm font-mono text-right text-muted">{formatCurrency(c.buysTotal, "BRL")}</td>
                    <td className="px-3 py-2 text-sm font-mono text-right text-muted">{formatCurrency(c.sellsTotal, "BRL")}</td>
                    <td className="px-3 py-2 text-sm font-mono text-right">
                      <span className={c.result >= 0 ? "text-accent" : "text-danger"}>
                        {c.result >= 0 ? "+" : ""}{formatCurrency(c.result, "BRL")}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <RetornoBadge pct={c.resultPct} />
                    </td>
                    <td colSpan={2} />
                  </tr>
                ))}
              </>
            )}
          </>
        )}
        <tr className="border-t border-border bg-surface-2">
          <td colSpan={3} className="px-3 py-2 text-xs font-semibold text-muted uppercase">Total</td>
          <td className="px-3 py-2 text-sm font-mono text-right font-semibold text-text-primary">
            {formatCurrency(openRows.reduce((s, r) => s + r.aporteBrl, 0), "BRL")}
          </td>
          <td className="px-3 py-2 text-sm font-mono text-right font-semibold text-text-primary">
            {formatCurrency(openRows.reduce((s, r) => s + r.carteiraBrl, 0), "BRL")}
          </td>
          <td colSpan={2} />
        </tr>
      </tfoot>
    </table>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvestmentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rateHistory, setRateHistory] = useState<ExchangeRateHistoryItem[]>([]);
  const [priceHistory, setPriceHistory] = useState<AssetPriceHistoryItem[]>([]);
  const [cdiRates, setCdiRates] = useState<CdiRateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
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

      // CDI: from earliest transaction to today
      const allTxs = txData.items.filter((tx) => tx.index);
      if (allTxs.length > 0) {
        const earliest = allTxs
          .map((tx) => tx.date_transaction.slice(0, 10))
          .sort()[0];
        const today = new Date().toISOString().slice(0, 10);
        try {
          const cdi = await marketDataApi.cdiHistory(earliest, today);
          setCdiRates(cdi.sort((a, b) => a.date.localeCompare(b.date)));
        } catch {
          /* BCB offline - CDI optional */
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  const [chartTagFilter, setChartTagFilter] = useState<string[]>([]);

  const investmentTxs = transactions.filter((tx) => tx.symbol || tx.index);
  const sortedRates = buildSortedRates(rateHistory);
  const groups = buildGroups(
    investmentTxs,
    tags,
    categories,
    sortedRates,
    priceHistory,
    cdiRates,
  );

  const saldoTotal = groups.reduce((s, g) => s + g.totalCarteira, 0);
  const totalAporte = groups.reduce((s, g) => s + g.totalAporte, 0);
  const retornoTotal = saldoTotal - totalAporte;
  const retornoPct = totalAporte > 0 ? (retornoTotal / totalAporte) * 100 : 0;
  const latestUsd = sortedRates[sortedRates.length - 1]?.USD ?? null;

  const chartTxs =
    chartTagFilter.length === 0
      ? investmentTxs
      : investmentTxs.filter((tx) => {
          const tag = tags.find((t) => t.id === tx.tag_id);
          const cat = categories.find((c) => c.id === tag?.category_id);
          const groupName = cat?.name ?? tag?.name ?? "—";
          return chartTagFilter.includes(groupName);
        });

  const portfolioPoints = buildPortfolioChart(
    chartTxs,
    tags,
    sortedRates,
    priceHistory,
    cdiRates,
  );
  const monthlyFlow = buildMonthlyFlow(investmentTxs, tags, sortedRates);

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
              backgroundColor: "rgba(34,197,94,0.08)",
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
      legend: { labels: { color: "#8b949e", font: { size: 11 } } },
      tooltip: {
        ...TOOLTIP_STYLE,
        mode: "index" as const,
        intersect: false,
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
            ` ${ctx.dataset.label ?? ""}: ${formatCurrency(ctx.parsed.y ?? 0, "BRL")}`,
        },
      },
    },
    hover: { mode: "index" as const, intersect: false },
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
            ` ${ctx.label}: ${formatCurrency(ctx.parsed, "BRL")}`,
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
      legend: { labels: { color: "#8b949e", font: { size: 11 } } },
      tooltip: {
        ...TOOLTIP_STYLE,
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
            ` ${ctx.dataset.label ?? ""}: ${formatCurrency(ctx.parsed.y ?? 0, "BRL")}`,
        },
      },
    },
    scales: {
      x: { ...AXIS_STYLE, ticks: { ...AXIS_STYLE.ticks, maxTicksLimit: 18 } },
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

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-muted text-sm animate-pulse">
        Carregando dados...
      </div>
    );

  return (
    <div className="px-6 py-5 space-y-6">
      <h1 className="text-lg font-semibold text-text-primary">Investimentos</h1>

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Dólar (BRL)",
            value: latestUsd ? formatCurrency(latestUsd, "BRL") : "—",
            color: "text-text-primary",
            badge: null,
          },
          {
            label: "Saldo Total",
            value: formatCurrency(saldoTotal, "BRL"),
            color: saldoTotal >= totalAporte ? "text-accent" : "text-danger",
            badge: <RetornoBadge pct={retornoPct} />,
          },
          {
            label: "Valor Investido",
            value: formatCurrency(totalAporte, "BRL"),
            color: "text-text-primary",
            badge: null,
          },
          {
            label: "Retorno (R$)",
            value: `${retornoTotal >= 0 ? "+" : ""}${formatCurrency(retornoTotal, "BRL")}`,
            color: retornoTotal >= 0 ? "text-accent" : "text-danger",
            badge: null,
          },
        ].map(({ label, value, color, badge }) => (
          <div
            key={label}
            className="bg-surface border border-border rounded-xl p-4 space-y-1"
          >
            <p className="text-xs uppercase tracking-wider text-muted">
              {label}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
              {badge}
            </div>
          </div>
        ))}
      </div>

      {investmentTxs.length === 0 ? (
        <div className="text-center py-24 text-sm text-muted">
          Nenhuma transação de investimento encontrada.
        </div>
      ) : (
        <>
          {/* ── Charts ────────────────────────────────────────────────────── */}
          <div className="space-y-5">
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <p className="text-xs uppercase tracking-wider text-muted">
                  Carteira vs Investido (histórico)
                </p>
                {groups.length > 1 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {groups.map((g, i) => {
                      const active = chartTagFilter.includes(g.tagName);
                      return (
                        <button
                          key={g.tagName}
                          onClick={() =>
                            setChartTagFilter((prev) =>
                              active
                                ? prev.filter((n) => n !== g.tagName)
                                : [...prev, g.tagName],
                            )
                          }
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                            active || chartTagFilter.length === 0
                              ? "border-transparent text-[#070B11]"
                              : "border-border bg-transparent text-muted hover:text-text-primary"
                          }`}
                          style={
                            active || chartTagFilter.length === 0
                              ? {
                                  backgroundColor:
                                    GROUP_COLORS[i % GROUP_COLORS.length],
                                }
                              : {}
                          }
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              background:
                                active || chartTagFilter.length === 0
                                  ? "#070B11"
                                  : GROUP_COLORS[i % GROUP_COLORS.length],
                            }}
                          />
                          {g.tagName}
                        </button>
                      );
                    })}
                    {chartTagFilter.length > 0 && (
                      <button
                        onClick={() => setChartTagFilter([])}
                        className="px-2 py-1 text-xs text-muted hover:text-text-primary transition-colors"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div style={{ height: 280 }}>
                {lineData ? (
                  <Line data={lineData} options={lineOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted">
                    Execute a carga histórica para gerar o gráfico.
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[38%_62%] gap-5">
              <div className="bg-surface border border-border rounded-xl p-5">
                <p className="text-xs uppercase tracking-wider text-muted mb-4">
                  Distribuição dos Pesos
                </p>
                <div className="flex items-center gap-6 flex-wrap">
                  <div
                    className="relative flex-shrink-0"
                    style={{ width: 180, height: 180 }}
                  >
                    <Doughnut data={donutData} options={donutOptions} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] uppercase tracking-wider text-muted">
                        Total
                      </span>
                      <span className="text-sm font-bold font-mono text-text-primary mt-0.5">
                        {formatCurrency(saldoTotal, "BRL")}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-1 min-w-[140px]">
                    {groups.map((g, i) => {
                      const pct =
                        saldoTotal > 0
                          ? ((g.totalCarteira / saldoTotal) * 100).toFixed(1)
                          : "0.0";
                      return (
                        <div
                          key={g.tagName}
                          className="flex items-center gap-2"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{
                              background: GROUP_COLORS[i % GROUP_COLORS.length],
                            }}
                          />
                          <span className="text-xs text-muted flex-1">
                            {g.tagName}
                          </span>
                          <span className="text-xs font-mono text-muted w-10 text-right">
                            {pct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-5">
                <p className="text-xs uppercase tracking-wider text-muted mb-4">
                  Aportes vs Resgates por Mês
                </p>
                <div style={{ height: 220 }}>
                  {monthlyFlow.length > 0 ? (
                    <Bar data={barData} options={barOptions} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-muted">
                      Sem dados.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Tables (2 per row) ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {groups.map((group) => (
              <div
                key={group.tagName}
                className="bg-surface border border-border rounded-xl overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 bg-surface-2 border-b border-border">
                  <span className="text-sm font-semibold text-text-primary">
                    {group.tagName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-mono font-semibold ${group.retornoBrl >= 0 ? "text-accent" : "text-danger"}`}
                    >
                      {group.retornoBrl >= 0 ? "+" : ""}
                      {formatCurrency(group.retornoBrl, "BRL")}
                    </span>
                    <RetornoBadge pct={group.retornoPct} />
                  </div>
                </div>
                {group.isFixedIncome ? (
                  <FixedIncomeTable rows={group.rows} />
                ) : (
                  <MarketTable group={group} />
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
