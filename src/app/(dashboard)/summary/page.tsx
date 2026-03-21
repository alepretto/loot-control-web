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
import { formatCurrency } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

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
  const { displayCurrency, convertToDisplay } = useSettings();
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

  // Total investido no mês (aportes outcome; resgates income reduzem o valor)
  const totalInvested = transactions
    .filter((tx) => tx.symbol || tx.index)
    .reduce((s, tx) => {
      const { tag } = resolveFamily(tx);
      const v = convertToDisplay(tx.value, tx.currency);
      return tag?.type === "outcome" ? s + v : s - v;
    }, 0);

  // KPI totals
  const totalIncome = nonInvestmentTxs
    .filter((tx) => resolveFamily(tx).tag?.type === "income")
    .reduce((s, tx) => s + convertToDisplay(tx.value, tx.currency), 0);

  const totalOutcome = nonInvestmentTxs
    .filter((tx) => resolveFamily(tx).tag?.type === "outcome")
    .reduce((s, tx) => s + convertToDisplay(tx.value, tx.currency), 0);

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
      map[key] = (map[key] ?? 0) + convertToDisplay(tx.value, tx.currency);
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
      map[catId].value += convertToDisplay(tx.value, tx.currency);
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
    incomeByCategory[name] = (incomeByCategory[name] ?? 0) + convertToDisplay(tx.value, tx.currency);
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
            ` ${ctx.label}: ${formatCurrency(ctx.parsed, displayCurrency)}`,
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
    catSpending[name] = (catSpending[name] ?? 0) + convertToDisplay(tx.value, tx.currency);
  }
  const top10Cats = Object.entries(catSpending)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const barColors = top10Cats.map((_, i) => DONUT_COLORS[i % DONUT_COLORS.length]);

  const barData = {
    labels: top10Cats.map(([name]) => name),
    datasets: [{
      label: "Gasto",
      data: top10Cats.map(([, v]) => v),
      backgroundColor: barColors.map((c) => c + "99"),
      borderColor: barColors,
      borderWidth: 2,
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  const maxBarValue = Math.max(...top10Cats.map(([, v]) => v), 1);

  const barOptions = {
    indexAxis: "y" as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { x: number | null } }) =>
            ` ${formatCurrency(ctx.parsed.x ?? 0, displayCurrency)}`,
        },
        backgroundColor: "#141A22",
        borderColor: "#20282F",
        borderWidth: 1,
        titleColor: "#e6edf3",
        bodyColor: "#8b949e",
        padding: 10,
      },
    },
    scales: {
      x: {
        max: maxBarValue * 1.15,
        ticks: {
          color: "#8b949e",
          font: { size: 10 },
          callback: (v: number | string) => {
            const n = Number(v);
            if (n === 0) return "0";
            const sym = displayCurrency === "BRL" ? "R$" : displayCurrency === "USD" ? "$" : "€";
            if (n >= 1000) return `${sym}${(n / 1000).toFixed(0)}k`;
            return `${sym}${n.toFixed(0)}`;
          },
        },
        grid: { color: "#20282F44" },
        border: { display: false },
      },
      y: {
        ticks: { color: "#e6edf3", font: { size: 12 } },
        grid: { display: false },
        border: { display: false },
      },
    },
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const kpis = [
    { label: "Entradas",         value: formatCurrency(totalIncome, displayCurrency),              color: "text-accent",   accent: "border-accent/40" },
    { label: "Saídas",           value: formatCurrency(totalOutcome, displayCurrency),             color: "text-danger",   accent: "border-danger/40" },
    { label: "Investido",        value: formatCurrency(Math.max(0, totalInvested), displayCurrency), color: "text-primary", accent: "border-primary/40" },
    { label: "Saldo",            value: formatCurrency(balance, displayCurrency),                   color: balance >= 0 ? "text-accent" : "text-danger", accent: balance >= 0 ? "border-accent/40" : "border-danger/40" },
    { label: "Taxa de Poupança", value: `${savingsRate.toFixed(1)}%`,                               color: "text-primary",  accent: "border-primary/40" },
  ];

  return (
    <div className="px-4 md:px-6 py-5 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Resumo Financeiro</h1>
          <p className="text-xs text-muted mt-0.5">
            {MONTHS[selectedMonth - 1]} {selectedYear}
          </p>
        </div>

        {/* Month navigator */}
        <div className="flex items-center bg-surface border border-border rounded-xl overflow-hidden">
          <button
            onClick={prevMonth}
            className="px-3 py-2 text-muted hover:text-text-primary hover:bg-surface-2 transition-colors border-r border-border"
            title="Mês anterior"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex items-center gap-1 px-1">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-sm text-text-primary focus:outline-none py-2 px-2 cursor-pointer appearance-none"
            >
              {MONTHS.map((name, i) => (
                <option key={i + 1} value={i + 1} className="bg-surface">{name}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-sm text-muted focus:outline-none py-2 pr-2 cursor-pointer appearance-none"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y} className="bg-surface">{y}</option>
              ))}
            </select>
          </div>
          <button
            onClick={nextMonth}
            className="px-3 py-2 text-muted hover:text-text-primary hover:bg-surface-2 transition-colors border-l border-border"
            title="Próximo mês"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* KPI row */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-2 animate-pulse">
              <div className="h-2.5 bg-surface-3 rounded w-2/3" />
              <div className="h-6 bg-surface-3 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {kpis.map(({ label, value, color, accent }) => (
            <div key={label} className={`bg-surface border border-border border-l-2 ${accent} rounded-xl p-4 space-y-1`}>
              <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
              <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-6 items-start animate-pulse">
          <div className="space-y-5">
            <div className="bg-surface border border-border rounded-xl p-5 h-80" />
            <div className="bg-surface border border-border rounded-xl p-5 h-64" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface border border-border rounded-xl h-14" />
            ))}
          </div>
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
                        {formatCurrency(totalOutcome, displayCurrency)}
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
                          {formatCurrency(g.outcome, displayCurrency)}
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
                <div style={{ height: Math.max(200, top10Cats.length * 44) }}>
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

            {familyGroups.map((group, i) => {
              const key         = group.familyId ?? "__none__";
              const isExpanded  = expandedFamilies.has(key);
              const familyColor = DONUT_COLORS[i % DONUT_COLORS.length];
              const variation   = group.outcome - group.prevOutcome;
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
                  style={{ borderLeft: `3px solid ${familyColor}` }}
                >
                  {/* Family header — clickable to expand */}
                  <button
                    className="w-full flex items-center gap-2 px-4 py-3 bg-surface-2 border-b border-border hover:bg-surface-3 transition-colors text-left"
                    onClick={() => toggleFamily(key)}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: familyColor }}
                    />
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

                    <span className="text-sm font-mono font-semibold" style={{ color: familyColor }}>
                      -{formatCurrency(group.outcome, displayCurrency)}
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
                                -{formatCurrency(cat.value, displayCurrency)}
                              </span>
                            </div>

                            {/* Tag checklist */}
                            <div className="space-y-1 pl-2">
                              {catTags.map((tag) => {
                                const paid = transactions.some((tx) => tx.tag_id === tag.id);
                                const tagTotal = transactions
                                  .filter((tx) => tx.tag_id === tag.id)
                                  .reduce((s, tx) => s + convertToDisplay(tx.value, tx.currency), 0);

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
                                      {paid ? `-${formatCurrency(tagTotal, displayCurrency)}` : "—"}
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
                            -{formatCurrency(item.value, displayCurrency)}
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
                    +{formatCurrency(totalIncome, displayCurrency)}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {incomeCats.map(([name, value]) => (
                    <div key={name} className="flex items-center justify-between px-4 py-1.5">
                      <span className="text-sm text-muted">{name}</span>
                      <span className="text-sm font-mono text-accent">
                        +{formatCurrency(value, displayCurrency)}
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
    </div>
  );
}
