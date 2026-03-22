"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  BarElement,
  BarController,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
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

ChartJS.register(Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler, Title, BarElement, BarController);

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
const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function buildYearOptions(currentYear: number): number[] {
  const years: number[] = [];
  for (let y = currentYear + 1; y >= currentYear - 5; y--) years.push(y);
  return years;
}

function monthBounds(year: number, month: number) {
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

const TOOLTIP_STYLE = {
  backgroundColor: "#141A22",
  borderColor: "#20282F",
  borderWidth: 1,
  titleColor: "#e6edf3",
  bodyColor: "#8b949e",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SummaryPage() {
  const { displayCurrency, convertToDisplay } = useSettings();
  const now = new Date();
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const yearOptions = buildYearOptions(now.getFullYear());

  const [transactions,     setTransactions]     = useState<Transaction[]>([]);
  const [prevTransactions, setPrevTransactions] = useState<Transaction[]>([]);
  const [historyTxs, setHistoryTxs] = useState<{ label: string; txs: Transaction[] }[]>([]);
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [tags,        setTags]        = useState<Tag[]>([]);
  const [families,    setFamilies]    = useState<TagFamily[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [expandedFamilies,   setExpandedFamilies]   = useState<Set<string>>(new Set());
  const [selectedFamilyId,   setSelectedFamilyId]   = useState<string | null>(null); // "__none__" = sem família
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTagId,      setSelectedTagId]      = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const curr = monthBounds(selectedYear, selectedMonth);

      // Build 5 previous months (newest first: -1, -2, -3, -4, -5)
      const histBounds = Array.from({ length: 5 }, (_, i) => {
        const { year: hy, month: hm } = navigateMonth(selectedYear, selectedMonth, -(i + 1));
        return { bounds: monthBounds(hy, hm), label: MONTHS_SHORT[hm - 1] };
      });

      const [currTxData, cats, tagList, familyList, ...histResults] = await Promise.all([
        transactionsApi.list({ ...curr, page_size: 1000 }),
        categoriesApi.list(),
        tagsApi.list(),
        tagFamiliesApi.list(),
        ...histBounds.map(h => transactionsApi.list({ ...h.bounds, page_size: 1000 })),
      ]);

      setTransactions(currTxData.items);
      setPrevTransactions(histResults[0].items);  // month -1 for MoM comparison
      setHistoryTxs(histBounds.map((h, i) => ({ label: h.label, txs: histResults[i].items })));
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

  // Compute income/outcome/invested totals for any tx list
  function computeTotals(txList: Transaction[]) {
    const nonInv = txList.filter(tx => !tx.symbol && !tx.index);
    const income = nonInv
      .filter(tx => tags.find(t => t.id === tx.tag_id)?.type === "income")
      .reduce((s, tx) => s + convertToDisplay(tx.value, tx.currency), 0);
    const outcome = nonInv
      .filter(tx => tags.find(t => t.id === tx.tag_id)?.type === "outcome")
      .reduce((s, tx) => s + convertToDisplay(tx.value, tx.currency), 0);
    const invested = txList
      .filter(tx => tx.symbol || tx.index)
      .reduce((s, tx) => {
        const tag = tags.find(t => t.id === tx.tag_id);
        const v = convertToDisplay(tx.value, tx.currency);
        return tag?.type === "outcome" ? s + v : s - v;
      }, 0);
    return { income, outcome, invested: Math.max(0, invested) };
  }

  // Current month
  const nonInvestmentTxs = transactions.filter((tx) => !tx.symbol && !tx.index);
  const { income: totalIncome, outcome: totalOutcome, invested: totalInvested } = computeTotals(transactions);
  const balance    = totalIncome - totalOutcome;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalOutcome) / totalIncome) * 100 : 0;

  // 6-month trend: historyTxs is [month-1, -2, -3, -4, -5], reverse → oldest first, then append current
  const historyData = historyTxs.map(({ label, txs }) => ({ label, ...computeTotals(txs) }));
  const trendMonths = [
    ...historyData.slice().reverse(),
    { label: MONTHS_SHORT[selectedMonth - 1], income: totalIncome, outcome: totalOutcome, invested: totalInvested },
  ];

  // 3-month averages (months -1, -2, -3 = historyData[0..2])
  const avg3M = historyData.length >= 3 ? {
    income:      (historyData[0].income  + historyData[1].income  + historyData[2].income)  / 3,
    outcome:     (historyData[0].outcome + historyData[1].outcome + historyData[2].outcome) / 3,
    invested:    (historyData[0].invested + historyData[1].invested + historyData[2].invested) / 3,
    balance:     ([0,1,2].reduce((s,i) => s + historyData[i].income - historyData[i].outcome, 0)) / 3,
    savingsRate: ([0,1,2].reduce((s,i) => {
      const m = historyData[i];
      return s + (m.income > 0 ? (m.income - m.outcome) / m.income * 100 : 0);
    }, 0)) / 3,
  } : null;

  // Family group aggregation
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

  const familyIds = new Set([...Object.keys(currByFamily), ...Object.keys(prevByFamily)]);
  const familyGroups: FamilyGroup[] = Array.from(familyIds).map((key) => {
    const familyId = key === "__none__" ? null : key;
    return {
      familyId,
      familyName:        families.find((f) => f.id === familyId)?.name ?? "Sem Família",
      outcome:           currByFamily[key] ?? 0,
      prevOutcome:       prevByFamily[key] ?? 0,
      categoryBreakdown: buildCatBreakdown(transactions, familyId),
    };
  }).sort((a, b) => b.outcome - a.outcome);

  // Income by category
  const incomeByCategory: Record<string, number> = {};
  for (const tx of nonInvestmentTxs) {
    const { tag, cat } = resolveFamily(tx);
    if (tag?.type !== "income") continue;
    const name = cat?.name ?? "—";
    incomeByCategory[name] = (incomeByCategory[name] ?? 0) + convertToDisplay(tx.value, tx.currency);
  }
  const incomeCats = Object.entries(incomeByCategory).sort(([, a], [, b]) => b - a);

  // ── Chart data ─────────────────────────────────────────────────────────────

  const resolvedSelectedFamilyId = selectedFamilyId === "__none__" ? null : selectedFamilyId;

  // Category bar chart (filtered by selected family)
  const categoryBarItems = categories
    .filter(cat => selectedFamilyId === null || cat.family_id === resolvedSelectedFamilyId)
    .map((cat, i) => ({
      id: cat.id,
      name: cat.name,
      value: transactions
        .filter(tx => !tx.symbol && !tx.index)
        .filter(tx => {
          const tag = tags.find(t => t.id === tx.tag_id);
          return tag?.type === "outcome" && tag?.category_id === cat.id;
        })
        .reduce((s, tx) => s + convertToDisplay(tx.value, tx.currency), 0),
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }))
    .filter(x => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);

  const categoryBarChartData = {
    labels: categoryBarItems.map(x => x.name),
    datasets: [{
      data: categoryBarItems.map(x => x.value),
      backgroundColor: categoryBarItems.map(x =>
        selectedCategoryId === null
          ? x.color + "CC"
          : selectedCategoryId === x.id ? x.color + "FF" : x.color + "33"
      ),
      borderColor: categoryBarItems.map(x => x.color),
      borderWidth: 1,
      borderRadius: 4,
      barThickness: 22,
    }],
  };

  // Tag bar chart (filtered by selected category and/or family)
  const tagBarItems = tags
    .filter(t => {
      if (t.type !== "outcome") return false;
      if (selectedCategoryId) return t.category_id === selectedCategoryId;
      if (selectedFamilyId) {
        const cat = categories.find(c => c.id === t.category_id);
        return (cat?.family_id ?? null) === resolvedSelectedFamilyId;
      }
      return true;
    })
    .map((tag, i) => ({
      id: tag.id,
      name: tag.name,
      value: transactions
        .filter(tx => !tx.symbol && !tx.index && tx.tag_id === tag.id)
        .reduce((s, tx) => s + convertToDisplay(tx.value, tx.currency), 0),
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }))
    .filter(x => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);

  const tagBarChartData = {
    labels: tagBarItems.map(x => x.name),
    datasets: [{
      data: tagBarItems.map(x => x.value),
      backgroundColor: tagBarItems.map(x =>
        selectedTagId === null
          ? x.color + "CC"
          : selectedTagId === x.id ? x.color + "FF" : x.color + "33"
      ),
      borderColor: tagBarItems.map(x => x.color),
      borderWidth: 1,
      borderRadius: 4,
      barThickness: 22,
    }],
  };

  // Filtered transactions for the list
  const filteredTxs = transactions
    .filter(tx => !tx.symbol && !tx.index)
    .filter(tx => {
      const tag = tags.find(t => t.id === tx.tag_id);
      const cat = categories.find(c => c.id === tag?.category_id);
      if (selectedTagId && tx.tag_id !== selectedTagId) return false;
      if (selectedCategoryId && tag?.category_id !== selectedCategoryId) return false;
      if (selectedFamilyId && (cat?.family_id ?? null) !== resolvedSelectedFamilyId) return false;
      return true;
    })
    .slice(0, 30);

  // Trend line (6 months)
  const currSym = displayCurrency === "BRL" ? "R$" : displayCurrency === "USD" ? "$" : "€";
  const trendChartData = {
    labels: trendMonths.map(m => m.label),
    datasets: [
      {
        label: "Entradas",
        data: trendMonths.map(m => m.income),
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.07)",
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: "#22c55e",
        borderWidth: 2,
      },
      {
        label: "Saídas",
        data: trendMonths.map(m => m.outcome),
        borderColor: "#ef4444",
        backgroundColor: "transparent",
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: "#ef4444",
        borderWidth: 2,
      },
      {
        label: "Investido",
        data: trendMonths.map(m => m.invested),
        borderColor: "#2563eb",
        backgroundColor: "transparent",
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: "#2563eb",
        borderWidth: 1.5,
        borderDash: [4, 4],
      },
    ],
  };
  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#8b949e", font: { size: 11 }, boxWidth: 24 } },
      tooltip: {
        ...TOOLTIP_STYLE,
        mode: "index" as const,
        intersect: false,
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
            ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y ?? 0, displayCurrency)}`,
        },
      },
    },
    hover: { mode: "index" as const, intersect: false },
    scales: {
      x: { ticks: { color: "#8b949e", font: { size: 11 } }, grid: { color: "#20282F44" }, border: { display: false } },
      y: {
        ticks: {
          color: "#8b949e",
          font: { size: 10 },
          callback: (v: number | string) => {
            const n = Number(v);
            if (n >= 1000) return `${currSym}${(n / 1000).toFixed(0)}k`;
            return `${currSym}${n.toFixed(0)}`;
          },
        },
        grid: { color: "#20282F44" },
        border: { display: false },
      },
    },
  };

  // Shared bar options factory
  function makeBarOptions(
    onClickFn: (_evt: unknown, elements: Array<{ index: number }>) => void,
    showPointer = true,
  ) {
    return {
      indexAxis: "y" as const,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...TOOLTIP_STYLE,
          callbacks: {
            label: (ctx: { parsed: { x: number | null } }) =>
              ` ${formatCurrency(ctx.parsed.x ?? 0, displayCurrency)}`,
          },
        },
      },
      onClick: onClickFn,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onHover: (evt: any, elements: any[]) => {
        const canvas = evt?.native?.target as HTMLCanvasElement | null;
        if (canvas) canvas.style.cursor = elements.length && showPointer ? "pointer" : "default";
      },
      scales: {
        x: {
          ticks: {
            color: "#8b949e",
            font: { size: 10 },
            callback: (v: number | string) => {
              const n = Number(v);
              if (n >= 1000) return `${currSym}${(n / 1000).toFixed(0)}k`;
              return `${currSym}${n.toFixed(0)}`;
            },
          },
          grid: { color: "#20282F44" },
          border: { display: false },
        },
        y: {
          ticks: { color: "#8b949e", font: { size: 11 } },
          grid: { display: false },
          border: { display: false },
        },
      },
    };
  }

  const categoryBarOptions = makeBarOptions((_evt, elements) => {
    if (!elements.length) return;
    const item = categoryBarItems[elements[0].index];
    if (!item) return;
    if (selectedCategoryId === item.id) {
      setSelectedCategoryId(null); setSelectedTagId(null);
    } else {
      setSelectedCategoryId(item.id); setSelectedTagId(null);
    }
  });

  const tagBarOptions = makeBarOptions((_evt, elements) => {
    if (!elements.length) return;
    const item = tagBarItems[elements[0].index];
    if (!item) return;
    setSelectedTagId(selectedTagId === item.id ? null : item.id);
  });

  // ── KPIs with 3M context ───────────────────────────────────────────────────

  const kpis = [
    {
      label: "Entradas",
      value: formatCurrency(totalIncome, displayCurrency),
      color: "text-accent",
      accent: "border-accent/40",
      avg: avg3M ? formatCurrency(avg3M.income, displayCurrency) : null,
      // Entradas: acima da média é bom
      trendUp: avg3M ? totalIncome > avg3M.income : null,
      goodWhenUp: true,
    },
    {
      label: "Saídas",
      value: formatCurrency(totalOutcome, displayCurrency),
      color: "text-danger",
      accent: "border-danger/40",
      avg: avg3M ? formatCurrency(avg3M.outcome, displayCurrency) : null,
      // Saídas: abaixo da média é bom
      trendUp: avg3M ? totalOutcome > avg3M.outcome : null,
      goodWhenUp: false,
    },
    {
      label: "Investido",
      value: formatCurrency(Math.max(0, totalInvested), displayCurrency),
      color: "text-primary",
      accent: "border-primary/40",
      avg: avg3M ? formatCurrency(avg3M.invested, displayCurrency) : null,
      trendUp: avg3M ? totalInvested > avg3M.invested : null,
      goodWhenUp: true,
    },
    {
      label: "Saldo",
      value: formatCurrency(balance, displayCurrency),
      color: balance >= 0 ? "text-accent" : "text-danger",
      accent: balance >= 0 ? "border-accent/40" : "border-danger/40",
      avg: avg3M ? formatCurrency(avg3M.balance, displayCurrency) : null,
      trendUp: avg3M ? balance > avg3M.balance : null,
      goodWhenUp: true,
    },
    {
      label: "Taxa de Poupança",
      value: `${savingsRate.toFixed(1)}%`,
      color: "text-primary",
      accent: "border-primary/40",
      avg: avg3M ? `${avg3M.savingsRate.toFixed(1)}%` : null,
      trendUp: avg3M ? savingsRate > avg3M.savingsRate : null,
      goodWhenUp: true,
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 md:px-6 py-5 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Resumo Financeiro</h1>
          <p className="text-xs text-muted mt-0.5">{MONTHS[selectedMonth - 1]} {selectedYear}</p>
        </div>
        <div className="flex items-center bg-surface border border-border rounded-xl overflow-hidden">
          <button onClick={prevMonth} className="px-3 py-2 text-muted hover:text-text-primary hover:bg-surface-2 transition-colors border-r border-border" title="Mês anterior">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div className="flex items-center gap-1 px-1">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-transparent text-sm text-text-primary focus:outline-none py-2 px-2 cursor-pointer appearance-none">
              {MONTHS.map((name, i) => <option key={i + 1} value={i + 1} className="bg-surface">{name}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-transparent text-sm text-muted focus:outline-none py-2 pr-2 cursor-pointer appearance-none">
              {yearOptions.map((y) => <option key={y} value={y} className="bg-surface">{y}</option>)}
            </select>
          </div>
          <button onClick={nextMonth} className="px-3 py-2 text-muted hover:text-text-primary hover:bg-surface-2 transition-colors border-l border-border" title="Próximo mês">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
      </div>

      {/* KPIs */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4 space-y-2 animate-pulse">
              <div className="h-2.5 bg-surface-3 rounded w-2/3" />
              <div className="h-6 bg-surface-3 rounded w-3/4" />
              <div className="h-2 bg-surface-3 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {kpis.map(({ label, value, color, accent, avg, trendUp, goodWhenUp }) => {
            const isGood   = trendUp === null ? null : (goodWhenUp ? trendUp : !trendUp);
            const trendColor = isGood === null ? "" : isGood ? "text-accent" : "text-danger";
            const trendIcon  = trendUp === null ? null : trendUp ? "▲" : "▼";
            return (
              <div key={label} className={`bg-surface border border-border border-l-2 ${accent} rounded-xl p-4`}>
                <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
                <p className={`text-xl font-bold font-mono mt-0.5 ${color}`}>{value}</p>
                {avg && (
                  <p className="text-[11px] text-muted mt-1.5 flex items-center gap-1">
                    <span>Média 3M: {avg}</span>
                    {trendIcon && <span className={`font-bold ${trendColor}`}>{trendIcon}</span>}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Main content */}
      {loading ? (
        <div className="space-y-5 animate-pulse">
          <div className="bg-surface border border-border rounded-xl p-5 h-64" />
          <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-6">
            <div className="space-y-5">
              <div className="bg-surface border border-border rounded-xl p-5 h-48" />
              <div className="bg-surface border border-border rounded-xl p-5 h-48" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-surface border border-border rounded-xl h-14" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
        {/* Tendência — full width */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-muted mb-4">Tendência — últimos 6 meses</p>
          {trendMonths.every(m => m.income === 0 && m.outcome === 0) ? (
            <p className="text-sm text-muted text-center py-10">Sem histórico suficiente.</p>
          ) : (
            <div style={{ height: 220 }}>
              <Line data={trendChartData} options={trendOptions} />
            </div>
          )}
        </div>

        {/* Grid principal: gráficos (esq) + cards de família (dir) */}
        <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-6">

          {/* ── Left: categoria + tag empilhados ─────────────────────────── */}
          <div className="space-y-5">

            {/* Por Categoria */}
            {categoryBarItems.length > 0 && (
              <div className="bg-surface border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <p className="text-xs uppercase tracking-wider text-muted">Por Categoria</p>
                    {selectedFamilyId !== null && (
                      <span className="text-xs text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                        {families.find(f => f.id === resolvedSelectedFamilyId)?.name ?? "Sem Família"}
                      </span>
                    )}
                  </div>
                  {selectedCategoryId !== null && (
                    <button onClick={() => { setSelectedCategoryId(null); setSelectedTagId(null); }} className="text-xs text-muted hover:text-text-primary">✕</button>
                  )}
                </div>
                <div style={{ height: Math.max(140, categoryBarItems.length * 32 + 40) }}>
                  <Bar data={categoryBarChartData} options={categoryBarOptions} />
                </div>
              </div>
            )}

            {/* Por Tag */}
            {tagBarItems.length > 0 && (
              <div className="bg-surface border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <p className="text-xs uppercase tracking-wider text-muted">Por Tag</p>
                    {selectedCategoryId !== null && (
                      <span className="text-xs text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                        {categories.find(c => c.id === selectedCategoryId)?.name ?? "—"}
                      </span>
                    )}
                  </div>
                  {selectedTagId !== null && (
                    <button onClick={() => setSelectedTagId(null)} className="text-xs text-muted hover:text-text-primary">✕</button>
                  )}
                </div>
                <div style={{ height: Math.max(140, tagBarItems.length * 32 + 40) }}>
                  <Bar data={tagBarChartData} options={tagBarOptions} />
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Family cards — clicar seleciona, seta expande ─────── */}
          <div className="space-y-3">
            {familyGroups.length === 0 && (
              <p className="text-sm text-muted text-center py-8">Nenhuma transação neste mês.</p>
            )}

            {familyGroups.map((group, i) => {
              const key          = group.familyId ?? "__none__";
              const isExpanded   = expandedFamilies.has(key);
              const isSelected   = selectedFamilyId === key;
              const familyColor  = DONUT_COLORS[i % DONUT_COLORS.length];
              const variation    = group.outcome - group.prevOutcome;
              const variationPct = group.prevOutcome > 0
                ? ((variation / group.prevOutcome) * 100).toFixed(1)
                : null;
              const pctOfIncome  = totalIncome > 0
                ? ((group.outcome / totalIncome) * 100).toFixed(1)
                : null;
              const isSpike = variationPct !== null && Number(variationPct) > 20 && variation > 0;

              function handleSelectFamily() {
                if (isSelected) {
                  setSelectedFamilyId(null); setSelectedCategoryId(null); setSelectedTagId(null);
                } else {
                  setSelectedFamilyId(key); setSelectedCategoryId(null); setSelectedTagId(null);
                }
              }

              return (
                <div
                  key={key}
                  className="bg-surface border border-border rounded-xl overflow-hidden transition-shadow"
                  style={{ borderLeft: `${isSelected ? 4 : 3}px solid ${familyColor}` }}
                >
                  {/* Header: click seleciona, seta expande */}
                  <div
                    className="flex items-center gap-2 px-4 py-3 border-b border-border cursor-pointer select-none transition-colors hover:bg-surface-3"
                    style={{ background: isSelected ? familyColor + "18" : "#141A22" }}
                    onClick={handleSelectFamily}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: familyColor }} />
                    <span className="text-sm font-semibold text-text-primary flex-1 truncate">
                      {group.familyName}
                    </span>

                    {isSpike && (
                      <span className="text-[10px] font-semibold text-danger bg-danger/10 border border-danger/20 px-1.5 py-0.5 rounded-full shrink-0">
                        ⚠ alto
                      </span>
                    )}

                    {pctOfIncome !== null && (
                      <span className="text-[11px] text-muted bg-surface-3 border border-border px-2 py-0.5 rounded-full shrink-0">
                        {pctOfIncome}% renda
                      </span>
                    )}

                    {variationPct !== null && (
                      <span className={`text-[11px] font-medium shrink-0 ${variation > 0 ? "text-danger" : "text-accent"}`}>
                        {variation > 0 ? "▲" : "▼"} {Math.abs(Number(variationPct))}%
                      </span>
                    )}

                    <span className="text-sm font-mono font-semibold shrink-0" style={{ color: familyColor }}>
                      -{formatCurrency(group.outcome, displayCurrency)}
                    </span>
                    <button
                      className="text-muted text-xs hover:text-text-primary shrink-0 px-1"
                      onClick={(e) => { e.stopPropagation(); toggleFamily(key); }}
                    >
                      {isExpanded ? "▲" : "▼"}
                    </button>
                  </div>

                  {/* Expanded: categories + tag checklist */}
                  {isExpanded && (
                    <div className="divide-y divide-border">
                      {group.categoryBreakdown.map((cat) => {
                        const catTags = tags.filter(
                          (t) => t.category_id === cat.catId && t.is_active && t.type !== "income"
                        );
                        return (
                          <div key={cat.catId} className="px-4 py-2">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs uppercase tracking-wider text-muted font-medium">{cat.name}</span>
                              <span className="text-xs font-mono text-text-secondary">-{formatCurrency(cat.value, displayCurrency)}</span>
                            </div>
                            <div className="space-y-1 pl-2">
                              {catTags.map((tag) => {
                                const paid = transactions.some((tx) => tx.tag_id === tag.id);
                                const tagTotal = transactions
                                  .filter((tx) => tx.tag_id === tag.id)
                                  .reduce((s, tx) => s + convertToDisplay(tx.value, tx.currency), 0);
                                return (
                                  <div key={tag.id} className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${paid ? "bg-accent" : "bg-muted opacity-40"}`} />
                                      <span className={`text-[12px] truncate ${paid ? "text-text-secondary" : "text-muted opacity-60"}`}>
                                        {tag.name}
                                      </span>
                                    </div>
                                    <span className={`text-[12px] font-mono flex-shrink-0 ${paid ? "text-text-secondary" : "text-muted opacity-40"}`}>
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

                  {/* Collapsed: category rows */}
                  {!isExpanded && (
                    <div className="divide-y divide-border">
                      {group.categoryBreakdown.map((item) => (
                        <div key={item.catId} className="flex items-center justify-between px-4 py-1.5">
                          <span className="text-sm text-muted">{item.name}</span>
                          <span className="text-sm font-mono text-text-primary">-{formatCurrency(item.value, displayCurrency)}</span>
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
                  <span className="text-sm font-mono font-semibold text-accent">+{formatCurrency(totalIncome, displayCurrency)}</span>
                </div>
                <div className="divide-y divide-border">
                  {incomeCats.map(([name, value]) => (
                    <div key={name} className="flex items-center justify-between px-4 py-1.5">
                      <span className="text-sm text-muted">{name}</span>
                      <span className="text-sm font-mono text-accent">+{formatCurrency(value, displayCurrency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Transações filtradas */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-surface-2 border-b border-border">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs uppercase tracking-wider text-muted">Transações</p>
              {selectedFamilyId !== null && selectedCategoryId === null && selectedTagId === null && (
                <span className="text-xs text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                  {families.find(f => f.id === resolvedSelectedFamilyId)?.name ?? "Sem Família"}
                </span>
              )}
              {selectedCategoryId !== null && selectedTagId === null && (
                <span className="text-xs text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                  {categories.find(c => c.id === selectedCategoryId)?.name ?? "—"}
                </span>
              )}
              {selectedTagId !== null && (
                <span className="text-xs text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                  {tags.find(t => t.id === selectedTagId)?.name ?? "—"}
                </span>
              )}
            </div>
            <span className="text-xs text-muted">{filteredTxs.length} registros</span>
          </div>

          {filteredTxs.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">Nenhuma transação.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-2 text-xs uppercase tracking-wider text-muted font-medium">Data</th>
                    <th className="px-4 py-2 text-xs uppercase tracking-wider text-muted font-medium">Tag</th>
                    <th className="px-4 py-2 text-xs uppercase tracking-wider text-muted font-medium">Categoria</th>
                    <th className="px-4 py-2 text-xs uppercase tracking-wider text-muted font-medium">Família</th>
                    <th className="px-4 py-2 text-xs uppercase tracking-wider text-muted font-medium text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTxs.map(tx => {
                    const tag = tags.find(t => t.id === tx.tag_id);
                    const cat = categories.find(c => c.id === tag?.category_id);
                    const fam = families.find(f => f.id === cat?.family_id);
                    const isIncome = tag?.type === "income";
                    const d = new Date(tx.date_transaction);
                    const dateStr = `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
                    return (
                      <tr key={tx.id} className="hover:bg-surface-2 transition-colors">
                        <td className="px-4 py-2 font-mono text-xs text-muted">{dateStr}</td>
                        <td className="px-4 py-2 text-text-secondary">{tag?.name ?? "—"}</td>
                        <td className="px-4 py-2 text-text-secondary">{cat?.name ?? "—"}</td>
                        <td className="px-4 py-2 text-muted">{fam?.name ?? "—"}</td>
                        <td className={`px-4 py-2 font-mono text-right font-medium ${isIncome ? "text-accent" : "text-danger"}`}>
                          {isIncome ? "+" : "-"}{formatCurrency(convertToDisplay(tx.value, tx.currency), displayCurrency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
}
