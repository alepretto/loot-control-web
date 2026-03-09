"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  transactionsApi,
  categoriesApi,
  tagsApi,
  tagFamiliesApi,
  Transaction,
  Category,
  Tag,
  TagFamily,
} from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface FamilyGroup {
  familyId: string | null;
  familyName: string;
  outcome: number;
  prevOutcome: number;
  categoryBreakdown: { catId: string; name: string; value: number }[];
}

function navigateMonth(year: number, month: number, delta: number) {
  let m = month + delta;
  let y = year;
  if (m > 12) { m = 1; y += 1; }
  if (m < 1)  { m = 12; y -= 1; }
  return { year: y, month: m };
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function buildYearOptions(currentYear: number): number[] {
  const years: number[] = [];
  for (let y = currentYear + 1; y >= currentYear - 5; y--) years.push(y);
  return years;
}

function monthBounds(year: number, month: number) {
  // Use local date parts to avoid UTC shift (e.g. 2025-02-28 23:59 BR = 2025-03-01 02:59 UTC)
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return {
    date_from: `${year}-${pad(month)}-01`,
    date_to:   `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

const DONUT_COLORS = [
  "#2563eb", "#22c55e", "#f59e0b", "#ef4444",
  "#8b5cf6", "#38bdf8", "#f97316",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SummaryPage() {
  const now = new Date();
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const yearOptions = buildYearOptions(now.getFullYear());

  const [transactions,     setTransactions]     = useState<Transaction[]>([]);
  const [prevTransactions, setPrevTransactions] = useState<Transaction[]>([]);
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [tags,        setTags]        = useState<Tag[]>([]);
  const [families,    setFamilies]    = useState<TagFamily[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  const [showTxList, setShowTxList] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const curr = monthBounds(selectedYear, selectedMonth);
      const { year: py, month: pm } = navigateMonth(selectedYear, selectedMonth, -1);
      const prev = monthBounds(py, pm);

      const [currTx, prevTx, cats, tagList, familyList] = await Promise.all([
        transactionsApi.list({ ...curr, page_size: 1000 }),
        transactionsApi.list({ date_from: prev.date_from, date_to: prev.date_to, page_size: 1000 }),
        categoriesApi.list(),
        tagsApi.list(),
        tagFamiliesApi.list(),
      ]);
      setTransactions(currTx.items);
      setPrevTransactions(prevTx.items);
      setCategories(cats);
      setTags(tagList);
      setFamilies(familyList);
      setLoading(false);
    }
    load();
  }, [selectedYear, selectedMonth]);

  function prevMonth() {
    const { year, month } = navigateMonth(selectedYear, selectedMonth, -1);
    setSelectedYear(year); setSelectedMonth(month);
  }
  function nextMonth() {
    const { year, month } = navigateMonth(selectedYear, selectedMonth, 1);
    setSelectedYear(year); setSelectedMonth(month);
  }

  function toggleFamily(key: string) {
    setExpandedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  // tx → tag → category → family resolution
  function resolveFamily(tx: Transaction) {
    const tag = tags.find((t) => t.id === tx.tag_id);
    const cat = categories.find((c) => c.id === tag?.category_id);
    return { tag, cat, familyId: cat?.family_id ?? null };
  }

  // Investimentos ficam na aba de Investimentos — excluir do Resumo
  const nonInvestmentTxs = transactions.filter((tx) => !tx.symbol && !tx.index);

  // KPI totals
  const totalIncome = nonInvestmentTxs
    .filter((tx) => resolveFamily(tx).tag?.type === "income")
    .reduce((s, tx) => s + tx.value, 0);

  const totalOutcome = nonInvestmentTxs
    .filter((tx) => resolveFamily(tx).tag?.type === "outcome")
    .reduce((s, tx) => s + tx.value, 0);

  const balance = totalIncome - totalOutcome;
  const savingsRate = totalIncome > 0
    ? (((totalIncome - totalOutcome) / totalIncome) * 100)
    : 0;

  // Family group aggregation (excluindo investimentos)
  function buildFamilyMap(txList: Transaction[]): Record<string, number> {
    const map: Record<string, number> = {};
    for (const tx of txList) {
      if (tx.symbol || tx.index) continue;
      const { tag, familyId } = resolveFamily(tx);
      if (tag?.type === "income") continue;
      const key = familyId ?? "__none__";
      map[key] = (map[key] ?? 0) + tx.value;
    }
    return map;
  }

  const currByFamily = buildFamilyMap(transactions);
  const prevByFamily = buildFamilyMap(prevTransactions);

  function buildCatBreakdown(txList: Transaction[], familyId: string | null) {
    const map: Record<string, { catId: string; name: string; value: number }> = {};
    for (const tx of txList) {
      const { tag, cat } = resolveFamily(tx);
      if (tag?.type === "income") continue;
      if ((cat?.family_id ?? null) !== familyId) continue;
      const catId = cat?.id ?? "__no_cat__";
      if (!map[catId]) map[catId] = { catId, name: cat?.name ?? "—", value: 0 };
      map[catId].value += tx.value;
    }
    return Object.values(map).sort((a, b) => b.value - a.value);
  }

  const familyIds = new Set([
    ...Object.keys(currByFamily),
    ...Object.keys(prevByFamily),
  ]);

  const familyGroups: FamilyGroup[] = Array.from(familyIds).map((key) => {
    const familyId = key === "__none__" ? null : key;
    const family   = families.find((f) => f.id === familyId);
    return {
      familyId,
      familyName:        family?.name ?? "Sem Família",
      outcome:           currByFamily[key] ?? 0,
      prevOutcome:       prevByFamily[key] ?? 0,
      categoryBreakdown: buildCatBreakdown(transactions, familyId),
    };
  }).sort((a, b) => b.outcome - a.outcome);

  // Income by category (excluindo investimentos)
  const incomeByCategory: Record<string, number> = {};
  for (const tx of nonInvestmentTxs) {
    const { tag, cat } = resolveFamily(tx);
    if (tag?.type !== "income") continue;
    const name = cat?.name ?? "—";
    incomeByCategory[name] = (incomeByCategory[name] ?? 0) + tx.value;
  }
  const incomeCats = Object.entries(incomeByCategory)
    .sort(([, a], [, b]) => b - a);

  // Donut chart data (outcome by family)
  const donutLabels = familyGroups.map((g) => g.familyName);
  const donutValues = familyGroups.map((g) => g.outcome);
  const donutColors = familyGroups.map((_, i) => DONUT_COLORS[i % DONUT_COLORS.length]);

  const donutData = {
    labels: donutLabels,
    datasets: [{
      data: donutValues,
      backgroundColor: donutColors,
      borderColor: "#0E1218",
      borderWidth: 2,
      hoverOffset: 6,
    }],
  };

  const donutOptions = {
    cutout: "68%",
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { label: string; parsed: number }) =>
            ` ${ctx.label}: ${formatCurrency(ctx.parsed, "BRL")}`,
        },
        backgroundColor: "#141A22",
        borderColor: "#20282F",
        borderWidth: 1,
        titleColor: "#e6edf3",
        bodyColor: "#8b949e",
      },
    },
  };

  // Bar chart (top 10 categories by outcome — excluindo investimentos)
  const catSpending: Record<string, number> = {};
  for (const tx of nonInvestmentTxs) {
    const { tag, cat } = resolveFamily(tx);
    if (tag?.type === "income") continue;
    const name = cat?.name ?? "—";
    catSpending[name] = (catSpending[name] ?? 0) + tx.value;
  }
  const top10Cats = Object.entries(catSpending)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const barData = {
    labels: top10Cats.map(([name]) => name),
    datasets: [{
      label: "Gasto (BRL)",
      data: top10Cats.map(([, v]) => v),
      backgroundColor: "rgba(37,99,235,0.7)",
      borderColor: "#2563eb",
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const barOptions = {
    indexAxis: "y" as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { x: number } }) =>
            ` ${formatCurrency(ctx.parsed.x, "BRL")}`,
        },
        backgroundColor: "#141A22",
        borderColor: "#20282F",
        borderWidth: 1,
        titleColor: "#e6edf3",
        bodyColor: "#8b949e",
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#8b949e",
          font: { size: 10 },
          callback: (v: number | string) =>
            formatCurrency(Number(v), "BRL").replace("R$\u00a0", "R$ "),
        },
        grid: { color: "#20282F" },
      },
      y: {
        ticks: { color: "#8b949e", font: { size: 11 } },
        grid: { color: "transparent" },
      },
    },
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="px-6 py-5 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-semibold text-text-primary">Resumo Financeiro</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="text-muted hover:text-text-primary transition-colors p-1.5 rounded hover:bg-surface-2"
            title="Mês anterior"
          >
            ←
          </button>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-surface border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-primary"
          >
            {MONTHS.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-surface border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-primary"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={nextMonth}
            className="text-muted hover:text-text-primary transition-colors p-1.5 rounded hover:bg-surface-2"
            title="Próximo mês"
          >
            →
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Entradas",
            value: formatCurrency(totalIncome, "BRL"),
            color: "text-accent",
            sub: null,
          },
          {
            label: "Total Saídas",
            value: formatCurrency(totalOutcome, "BRL"),
            color: "text-danger",
            sub: null,
          },
          {
            label: "Saldo",
            value: formatCurrency(balance, "BRL"),
            color: balance >= 0 ? "text-accent" : "text-danger",
            sub: null,
          },
          {
            label: "Taxa de Poupança",
            value: `${savingsRate.toFixed(1)}%`,
            color: "text-primary",
            sub: "(income − saídas) / income",
          },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4 space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
            <p className={`text-xl font-bold font-mono ${color}`}>{loading ? "—" : value}</p>
            {sub && <p className="text-[10px] text-muted">{sub}</p>}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <span className="text-sm text-muted animate-pulse">Carregando dados...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-6 items-start">

          {/* ── Left column: Charts ────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Donut — Gastos por Família */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs uppercase tracking-wider text-muted mb-4">Gastos por Família</p>
              {familyGroups.length === 0 ? (
                <p className="text-sm text-muted text-center py-10">Sem dados de saída.</p>
              ) : (
                <>
                  {/* Chart + center text */}
                  <div className="relative mx-auto" style={{ maxWidth: 280, height: 280 }}>
                    <Doughnut data={donutData} options={donutOptions} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] uppercase tracking-wider text-muted">Total</span>
                      <span className="text-base font-bold font-mono text-danger mt-0.5">
                        {formatCurrency(totalOutcome, "BRL")}
                      </span>
                    </div>
                  </div>

                  {/* Custom legend */}
                  <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
                    {familyGroups.map((g, i) => (
                      <div key={g.familyId ?? "__none__"} className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                        />
                        <span className="text-xs text-muted truncate">{g.familyName}</span>
                        <span className="text-xs font-mono text-text-primary ml-auto">
                          {formatCurrency(g.outcome, "BRL")}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Bar — Top Categorias */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs uppercase tracking-wider text-muted mb-4">Top Categorias</p>
              {top10Cats.length === 0 ? (
                <p className="text-sm text-muted text-center py-10">Sem dados.</p>
              ) : (
                <div style={{ height: Math.max(180, top10Cats.length * 34) }}>
                  <Bar
                    data={barData}
                    options={{
                      ...barOptions,
                      responsive: true,
                      maintainAspectRatio: false,
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Right column: Family cards ─────────────────────────────────── */}
          <div className="space-y-3">
            {familyGroups.length === 0 && (
              <p className="text-sm text-muted text-center py-8">
                Nenhuma transação neste mês.
              </p>
            )}

            {familyGroups.map((group) => {
              const key        = group.familyId ?? "__none__";
              const isExpanded = expandedFamilies.has(key);
              const variation  = group.outcome - group.prevOutcome;
              const variationPct =
                group.prevOutcome > 0
                  ? ((variation / group.prevOutcome) * 100).toFixed(1)
                  : null;
              const pctOfIncome =
                totalIncome > 0
                  ? ((group.outcome / totalIncome) * 100).toFixed(1)
                  : null;

              return (
                <div
                  key={key}
                  className="bg-surface border border-border rounded-xl overflow-hidden"
                >
                  {/* Family header — clickable to expand */}
                  <button
                    className="w-full flex items-center gap-2 px-4 py-3 bg-surface-2 border-b border-border hover:bg-surface-3 transition-colors text-left"
                    onClick={() => toggleFamily(key)}
                  >
                    <span className="text-sm font-semibold text-text-primary flex-1 text-left">
                      {group.familyName}
                    </span>

                    {pctOfIncome !== null && (
                      <span className="text-[11px] text-muted bg-surface-3 border border-border px-2 py-0.5 rounded-full">
                        {pctOfIncome}% renda
                      </span>
                    )}

                    {variationPct !== null && (
                      <span
                        className={`text-[11px] font-medium ${
                          variation > 0 ? "text-danger" : "text-accent"
                        }`}
                      >
                        {variation > 0 ? "▲" : "▼"} {Math.abs(Number(variationPct))}%
                      </span>
                    )}

                    <span className="text-sm font-mono font-semibold text-danger">
                      -{formatCurrency(group.outcome, "BRL")}
                    </span>
                    <span className="text-muted text-xs ml-1">{isExpanded ? "▲" : "▼"}</span>
                  </button>

                  {/* Expanded: categories + tag checklist */}
                  {isExpanded && (
                    <div className="divide-y divide-border">
                      {group.categoryBreakdown.map((cat) => {
                        // Tags belonging to this category
                        const catTags = tags.filter(
                          (t) => t.category_id === cat.catId && t.is_active && t.type !== "income"
                        );

                        return (
                          <div key={cat.catId} className="px-4 py-2">
                            {/* Category row */}
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs uppercase tracking-wider text-muted font-medium">
                                {cat.name}
                              </span>
                              <span className="text-xs font-mono text-text-secondary">
                                -{formatCurrency(cat.value, "BRL")}
                              </span>
                            </div>

                            {/* Tag checklist */}
                            <div className="space-y-1 pl-2">
                              {catTags.map((tag) => {
                                const paid = transactions.some((tx) => tx.tag_id === tag.id);
                                const tagTotal = transactions
                                  .filter((tx) => tx.tag_id === tag.id)
                                  .reduce((s, tx) => s + tx.value, 0);

                                return (
                                  <div
                                    key={tag.id}
                                    className="flex items-center justify-between gap-2"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                          paid ? "bg-accent" : "bg-muted opacity-40"
                                        }`}
                                      />
                                      <span
                                        className={`text-[12px] truncate ${
                                          paid ? "text-text-secondary" : "text-muted opacity-60"
                                        }`}
                                      >
                                        {tag.name}
                                      </span>
                                    </div>
                                    <span
                                      className={`text-[12px] font-mono flex-shrink-0 ${
                                        paid ? "text-text-secondary" : "text-muted opacity-40"
                                      }`}
                                    >
                                      {paid ? `-${formatCurrency(tagTotal, "BRL")}` : "—"}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Collapsed: just summary rows */}
                  {!isExpanded && (
                    <div className="divide-y divide-border">
                      {group.categoryBreakdown.map((item) => (
                        <div
                          key={item.catId}
                          className="flex items-center justify-between px-4 py-1.5"
                        >
                          <span className="text-sm text-muted">{item.name}</span>
                          <span className="text-sm font-mono text-text-primary">
                            -{formatCurrency(item.value, "BRL")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Entradas card */}
            {totalIncome > 0 && (
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-surface-2 border-b border-border">
                  <span className="text-sm font-semibold flex-1 text-accent">Entradas</span>
                  <span className="text-sm font-mono font-semibold text-accent">
                    +{formatCurrency(totalIncome, "BRL")}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {incomeCats.map(([name, value]) => (
                    <div key={name} className="flex items-center justify-between px-4 py-1.5">
                      <span className="text-sm text-muted">{name}</span>
                      <span className="text-sm font-mono text-accent">
                        +{formatCurrency(value, "BRL")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Transaction list ──────────────────────────────────────────────── */}
      {!loading && transactions.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setShowTxList((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-surface-2 hover:bg-surface-3 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">Transações do mês</span>
              <span className="text-xs text-muted">({transactions.length})</span>
            </div>
            <span className="text-muted text-xs">{showTxList ? "▲" : "▼"}</span>
          </button>

          {showTxList && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-muted font-medium">Data</th>
                    <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-muted font-medium">Família</th>
                    <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-muted font-medium">Categoria</th>
                    <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-muted font-medium">Tag</th>
                    <th className="text-right px-4 py-2 text-xs uppercase tracking-wider text-muted font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...transactions]
                    .sort((a, b) => b.date_transaction.localeCompare(a.date_transaction))
                    .map((tx) => {
                      const { tag, cat, familyId } = resolveFamily(tx);
                      const family = families.find((f) => f.id === familyId);
                      const isIncome = tag?.type === "income";
                      return (
                        <tr key={tx.id} className="hover:bg-surface-2 transition-colors">
                          <td className="px-4 py-2 text-xs font-mono text-muted whitespace-nowrap">
                            {formatDate(tx.date_transaction)}
                          </td>
                          <td className="px-4 py-2 text-sm text-text-secondary">{family?.name ?? "—"}</td>
                          <td className="px-4 py-2 text-sm text-text-secondary">{cat?.name ?? "—"}</td>
                          <td className="px-4 py-2 text-sm text-muted">
                            {tag?.name ?? "—"}
                            {tx.symbol && <span className="ml-1 text-xs font-mono text-primary">{tx.symbol}</span>}
                          </td>
                          <td className={`px-4 py-2 text-sm font-mono text-right ${isIncome ? "text-accent" : "text-text-primary"}`}>
                            {isIncome ? "+" : "-"}{formatCurrency(tx.value, tx.currency)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
