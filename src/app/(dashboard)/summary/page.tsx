"use client";

import { useEffect, useState, useMemo } from "react";
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
  ArcElement,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  transactionsApi,
  categoriesApi,
  tagsApi,
  tagFamiliesApi,
  paymentMethodsApi,
  Transaction,
  Category,
  Tag,
  TagFamily,
  PaymentMethod,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { ChartFullscreen } from "@/components/ui/ChartFullscreen";

ChartJS.register(Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler, Title, BarElement, BarController, ArcElement);

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
  padding: 10,
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
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [expandedFamilies,   setExpandedFamilies]   = useState<Set<string>>(new Set());
  const [selectedFamilyId,   setSelectedFamilyId]   = useState<string | null>(null); // "__none__" = sem família
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTagId,      setSelectedTagId]      = useState<string | null>(null);
  const [trendFullscreen, setTrendFullscreen] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setHistoryTxs([]);
      setPrevTransactions([]);
      const curr = monthBounds(selectedYear, selectedMonth);

      // Phase 1: current month data only — shows UI fast
      const [currTxData, cats, tagList, familyList, pmList] = await Promise.all([
        transactionsApi.list({ ...curr, page_size: 1000 }),
        categoriesApi.list(),
        tagsApi.list(),
        tagFamiliesApi.list(),
        paymentMethodsApi.list(),
      ]);
      if (cancelled) return;
      setTransactions(currTxData.items);
      setCategories(cats);
      setTags(tagList);
      setFamilies(familyList);
      setPaymentMethods(pmList);
      setLoading(false);

      // Phase 2: load 5 months of history in background (non-blocking)
      const histBounds = Array.from({ length: 5 }, (_, i) => {
        const { year: hy, month: hm } = navigateMonth(selectedYear, selectedMonth, -(i + 1));
        return { bounds: monthBounds(hy, hm), label: MONTHS_SHORT[hm - 1] };
      });
      const histResults = await Promise.all(
        histBounds.map(h => transactionsApi.list({ ...h.bounds, page_size: 1000 }))
      );
      if (cancelled) return;
      setPrevTransactions(histResults[0].items);
      setHistoryTxs(histBounds.map((h, i) => ({ label: h.label, txs: histResults[i].items })));
    }
    load();
    return () => { cancelled = true; };
  }, [selectedYear, selectedMonth]);

  function prevMonth() {
    const { year, month } = navigateMonth(selectedYear, selectedMonth, -1);
    setSelectedYear(year); setSelectedMonth(month);
    setSelectedPaymentMethodId(null);
  }
  function nextMonth() {
    const { year, month } = navigateMonth(selectedYear, selectedMonth, 1);
    setSelectedYear(year); setSelectedMonth(month);
    setSelectedPaymentMethodId(null);
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

  function resolveNature(tx: Transaction) {
    const tag = tags.find(t => t.id === tx.tag_id);
    const cat = categories.find(c => c.id === tag?.category_id);
    const fam = families.find(f => f.id === cat?.family_id);
    return fam?.nature ?? null;
  }

  // Compute income/outcome/invested totals for any tx list (V2: uses family.nature)
  function computeTotals(txList: Transaction[]) {
    let income = 0, outcome = 0, invested = 0;
    for (const tx of txList) {
      const v = convertToDisplay(tx.value, tx.currency);
      const nature = resolveNature(tx);
      if (nature === "income") income += v;
      else if (nature === "fixed_expense" || nature === "variable_expense") outcome += v;
      else if (nature === "investment" || tx.symbol || tx.index) invested += v;
    }
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

  // Family group aggregation (expense only — excludes income and investments)
  function buildFamilyMap(txList: Transaction[]): Record<string, number> {
    const map: Record<string, number> = {};
    for (const tx of txList) {
      const nature = resolveNature(tx);
      if (nature === "income" || nature === "investment") continue;
      if (!nature && (tx.symbol || tx.index)) continue;
      const { familyId } = resolveFamily(tx);
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
      const nature = resolveNature(tx);
      if (nature === "income" || nature === "investment") continue;
      const { cat } = resolveFamily(tx);
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
    const nature = resolveNature(tx);
    if (nature !== "income") continue;
    const { cat } = resolveFamily(tx);
    const name = cat?.name ?? "—";
    incomeByCategory[name] = (incomeByCategory[name] ?? 0) + convertToDisplay(tx.value, tx.currency);
  }
  const incomeCats = Object.entries(incomeByCategory).sort(([, a], [, b]) => b - a);

  // ── Chart data ─────────────────────────────────────────────────────────────

  const resolvedSelectedFamilyId = selectedFamilyId === "__none__" ? null : selectedFamilyId;

  // Category bar chart (filtered by selected family, expense only)
  const categoryBarItems = categories
    .filter(cat => selectedFamilyId === null || cat.family_id === resolvedSelectedFamilyId)
    .map((cat, i) => ({
      id: cat.id,
      name: cat.name,
      value: transactions
        .filter(tx => {
          const nature = resolveNature(tx);
          const tag = tags.find(t => t.id === tx.tag_id);
          return (nature === "fixed_expense" || nature === "variable_expense") && tag?.category_id === cat.id;
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
      maxBarThickness: 22,
    }],
  };

  // Tag bar chart (filtered by selected category and/or family, expense only)
  const tagBarItems = tags
    .filter(t => {
      const cat = categories.find(c => c.id === t.category_id);
      const fam = families.find(f => f.id === cat?.family_id);
      const nature = fam?.nature;
      if (nature !== "fixed_expense" && nature !== "variable_expense") return false;
      if (selectedCategoryId) return t.category_id === selectedCategoryId;
      if (selectedFamilyId) return (cat?.family_id ?? null) === resolvedSelectedFamilyId;
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
      maxBarThickness: 22,
    }],
  };

  // Trend line (6 months)
  const currSym = displayCurrency === "BRL" ? "R$" : displayCurrency === "USD" ? "$" : "€";
  const trendChartData = {
    labels: trendMonths.map(m => m.label),
    datasets: [
      {
        label: "Entradas",
        data: trendMonths.map(m => m.income),
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.13)",
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
        backgroundColor: "rgba(239,68,68,0.08)",
        fill: true,
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

  const paymentBreakdown = { debit: 0, benefit: 0 };
  const hasPaymentMethods = false;

  // Payment method breakdown not available (Transaction no longer carries payment_method_id)
  const paymentMethodItems: { pm: (typeof paymentMethods)[0]; value: number }[] = [];

  // Payment type donut (Dinheiro vs Benefício)
  const pmTypeDonutData = {
    labels: ["Débito", "Benefício"],
    datasets: [{
      data: [paymentBreakdown.debit, paymentBreakdown.benefit],
      backgroundColor: [
        selectedPaymentMethodId === null || selectedPaymentMethodId === "__debit__" ? "#2563ebCC" : "#2563eb33",
        selectedPaymentMethodId === null || selectedPaymentMethodId === "__benefit__" ? "#22c55eCC" : "#22c55e33",
      ],
      borderColor: ["#2563eb", "#22c55e"],
      borderWidth: 2,
      hoverOffset: 6,
    }],
  };
  const pmTypeDonutOptions = {
    cutout: "65%",
    plugins: {
      legend: { display: false },
      tooltip: {
        ...TOOLTIP_STYLE,
        callbacks: {
          label: (ctx: { label: string; parsed: number }) =>
            ` ${ctx.label}: ${formatCurrency(ctx.parsed, displayCurrency)}`,
        },
      },
    },
    onClick: (_evt: unknown, elements: Array<{ index: number }>) => {
      if (!elements.length) { setSelectedPaymentMethodId(null); return; }
      const types = ["__debit__", "__benefit__"] as const;
      const type = types[elements[0].index];
      setSelectedPaymentMethodId(selectedPaymentMethodId === type ? null : type);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onHover: (evt: any, elements: any[]) => {
      const canvas = evt?.native?.target as HTMLCanvasElement | null;
      if (canvas) canvas.style.cursor = elements.length ? "pointer" : "default";
    },
  };

  // Per-method bar chart
  const pmBarChartData = {
    labels: paymentMethodItems.map(x => x.pm.name),
    datasets: [{
      data: paymentMethodItems.map(x => x.value),
      backgroundColor: paymentMethodItems.map(x => {
        const color = x.pm.type === "debit" ? "#2563eb" : "#22c55e";
        if (selectedPaymentMethodId === null) return color + "CC";
        if (selectedPaymentMethodId === "__debit__" && x.pm.type === "debit") return color + "FF";
        if (selectedPaymentMethodId === "__benefit__" && x.pm.type === "benefit") return color + "FF";
        if (selectedPaymentMethodId === x.pm.id) return color + "FF";
        return color + "33";
      }),
      borderColor: paymentMethodItems.map(x => x.pm.type === "debit" ? "#2563eb" : "#22c55e"),
      borderWidth: 1,
      borderRadius: 4,
      maxBarThickness: 22,
    }],
  };
  const pmBarOptions = makeBarOptions((_evt, elements) => {
    if (!elements.length) return;
    const item = paymentMethodItems[elements[0].index];
    if (!item) return;
    setSelectedPaymentMethodId(selectedPaymentMethodId === item.pm.id ? null : item.pm.id);
  });

  // ── Donut: gastos por família ──────────────────────────────────────────────

  const donutExpenseData = {
    labels: familyGroups.map(g => g.familyName),
    datasets: [{
      data: familyGroups.map(g => g.outcome),
      backgroundColor: familyGroups.map((_, i) => DONUT_COLORS[i % DONUT_COLORS.length]),
      borderColor: "#0E1218",
      borderWidth: 2,
      hoverOffset: 8,
    }],
  };
  const donutExpenseOptions = {
    cutout: "68%",
    plugins: {
      legend: { display: false },
      tooltip: {
        ...TOOLTIP_STYLE,
        callbacks: {
          label: (ctx: { label: string; parsed: number }) =>
            ` ${ctx.label}: ${formatCurrency(ctx.parsed, displayCurrency)}`,
        },
      },
    },
  };

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
          {kpis.map(({ label, value, color, accent, avg, trendUp, goodWhenUp }, idx) => {
            const isGood   = trendUp === null ? null : (goodWhenUp ? trendUp : !trendUp);
            const trendColor = isGood === null ? "" : isGood ? "text-accent" : "text-danger";
            const trendIcon  = trendUp === null ? null : trendUp ? "▲" : "▼";
            return (
              <div key={label} className={`bg-surface border border-border border-l-2 ${accent} rounded-xl p-4 ${idx === 4 ? "col-span-2 lg:col-span-1" : ""}`}>
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

      {/* Payment method breakdown */}
      {!loading && hasPaymentMethods && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Donut: por tipo */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-wider text-muted">Por Tipo de Pagamento</p>
              {(selectedPaymentMethodId === "__debit__" || selectedPaymentMethodId === "__benefit__") && (
                <button onClick={() => setSelectedPaymentMethodId(null)} className="text-xs text-muted hover:text-text-primary transition-colors">✕ limpar</button>
              )}
            </div>
            <div className="flex items-center gap-5">
              <div className="relative shrink-0" style={{ width: 110, height: 110 }}>
                <Doughnut data={pmTypeDonutData} options={pmTypeDonutOptions} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] uppercase tracking-wider text-muted">Total</span>
                  <span className="text-xs font-bold font-mono text-text-primary mt-0.5">
                    {formatCurrency(paymentBreakdown.debit + paymentBreakdown.benefit, displayCurrency)}
                  </span>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                {[
                  { label: "Débito", value: paymentBreakdown.debit, color: "#2563eb", type: "__debit__" as const },
                  { label: "Benefício", value: paymentBreakdown.benefit, color: "#22c55e", type: "__benefit__" as const },
                ].map(({ label, value, color, type }) => {
                  const total = paymentBreakdown.debit + paymentBreakdown.benefit;
                  const pct = total > 0 ? (value / total) * 100 : 0;
                  const isSelected = selectedPaymentMethodId === type;
                  return (
                    <div
                      key={type}
                      className="cursor-pointer group"
                      onClick={() => setSelectedPaymentMethodId(isSelected ? null : type)}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                          <span className={`text-xs transition-colors ${isSelected ? "text-text-primary font-medium" : "text-text-secondary group-hover:text-text-primary"}`}>{label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-muted">{pct.toFixed(0)}%</span>
                          <span className="text-xs font-mono font-medium text-text-primary">{formatCurrency(value, displayCurrency)}</span>
                        </div>
                      </div>
                      <div className="h-1 rounded-full bg-surface-3 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${isSelected ? "opacity-100" : "opacity-70 group-hover:opacity-90"}`} style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bar: por método */}
          {paymentMethodItems.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs uppercase tracking-wider text-muted">Por Método</p>
                {selectedPaymentMethodId && selectedPaymentMethodId !== "__debit__" && selectedPaymentMethodId !== "__benefit__" && (
                  <button onClick={() => setSelectedPaymentMethodId(null)} className="text-xs text-muted hover:text-text-primary transition-colors">✕ limpar</button>
                )}
              </div>
              <div style={{ height: Math.max(100, paymentMethodItems.length * 30 + 24) }}>
                <Bar data={pmBarChartData} options={pmBarOptions} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      {loading ? (
        <div className="space-y-5 animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-5">
            <div className="space-y-5">
              <div className="bg-surface border border-border rounded-xl p-5 h-52" />
              <div className="bg-surface border border-border rounded-xl p-5 h-48" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-surface border border-border rounded-xl h-16" />
              ))}
            </div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5 h-56" />
        </div>
      ) : (
        <>
        {/* Tendência — full width, primeiro */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <p className="text-xs uppercase tracking-wider text-muted">Entradas vs Saídas — últimos 6 meses</p>
            {!trendMonths.every(m => m.income === 0 && m.outcome === 0) && (
              <button
                onClick={() => setTrendFullscreen(true)}
                className="text-muted hover:text-text-primary p-0.5 rounded transition-colors"
                title="Fullscreen"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </button>
            )}
          </div>
          {trendMonths.every(m => m.income === 0 && m.outcome === 0) ? (
            <div className="flex items-center justify-center py-10">
              <p className="text-sm text-muted">Aguardando histórico...</p>
            </div>
          ) : (
            <div className="h-[200px] md:h-[240px]">
              <Line data={trendChartData} options={trendOptions} />
            </div>
          )}
          {trendFullscreen && (
            <ChartFullscreen
              title="Entradas vs Saídas — últimos 6 meses"
              onClose={() => setTrendFullscreen(false)}
            >
              <Line data={trendChartData} options={trendOptions} />
            </ChartFullscreen>
          )}
        </div>

        {/* Grid principal: gráficos (esq) + cards de família (dir) */}
        <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-5">

          {/* ── Left: donut + categoria + tag ─────────────────────────── */}
          <div className="space-y-5">

            {/* Donut: Gastos por Família */}
            {familyGroups.length > 0 && (
              <div className="bg-surface border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs uppercase tracking-wider text-muted">Gastos por Família</p>
                  {selectedFamilyId !== null && (
                    <button
                      onClick={() => { setSelectedFamilyId(null); setSelectedCategoryId(null); setSelectedTagId(null); }}
                      className="text-xs text-muted hover:text-text-primary transition-colors"
                    >
                      ✕ limpar filtro
                    </button>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                  <div className="relative shrink-0" style={{ width: 144, height: 144 }}>
                    <Doughnut data={donutExpenseData} options={donutExpenseOptions} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] uppercase tracking-wider text-muted">Total</span>
                      <span className="text-sm font-bold font-mono text-text-primary mt-0.5">
                        {formatCurrency(totalOutcome, displayCurrency)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2.5 min-w-0">
                    {familyGroups.map((g, i) => {
                      const pct = totalOutcome > 0 ? (g.outcome / totalOutcome) * 100 : 0;
                      const color = DONUT_COLORS[i % DONUT_COLORS.length];
                      const key = g.familyId ?? "__none__";
                      const isSelected = selectedFamilyId === key;
                      return (
                        <div
                          key={key}
                          className="cursor-pointer group"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedFamilyId(null); setSelectedCategoryId(null); setSelectedTagId(null);
                            } else {
                              setSelectedFamilyId(key); setSelectedCategoryId(null); setSelectedTagId(null);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                              <span className={`text-xs truncate transition-colors ${isSelected ? "text-text-primary font-medium" : "text-text-secondary group-hover:text-text-primary"}`}>
                                {g.familyName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] font-mono text-muted">{pct.toFixed(0)}%</span>
                              <span className="text-xs font-mono font-medium text-text-primary">
                                {formatCurrency(g.outcome, displayCurrency)}
                              </span>
                            </div>
                          </div>
                          <div className="h-1 rounded-full bg-surface-3 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isSelected ? "opacity-100" : "opacity-70 group-hover:opacity-90"}`}
                              style={{ width: `${pct}%`, background: color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

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
                    <button onClick={() => { setSelectedCategoryId(null); setSelectedTagId(null); }} className="text-xs text-muted hover:text-text-primary transition-colors">✕</button>
                  )}
                </div>
                <div style={{ height: Math.max(120, categoryBarItems.length * 26 + 32) }}>
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
                    <button onClick={() => setSelectedTagId(null)} className="text-xs text-muted hover:text-text-primary transition-colors">✕</button>
                  )}
                </div>
                <div style={{ height: Math.max(120, tagBarItems.length * 26 + 32) }}>
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
              const pctOfTotal   = totalOutcome > 0
                ? (group.outcome / totalOutcome) * 100
                : 0;
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
                  className="bg-surface border border-border rounded-xl overflow-hidden transition-all"
                  style={{ borderLeft: `${isSelected ? 4 : 3}px solid ${familyColor}` }}
                >
                  {/* Header: zona esquerda filtra, zona direita expande */}
                  <div
                    className="flex items-center select-none transition-colors"
                    style={{ background: isSelected ? familyColor + "15" : "#141A22" }}
                  >
                    {/* Zona esquerda — clique filtra */}
                    <div
                      className="flex items-center gap-2 flex-1 min-w-0 px-4 py-3 cursor-pointer hover:bg-surface-3/50 transition-colors"
                      onClick={handleSelectFamily}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: familyColor }} />
                      <span className="text-sm font-semibold text-text-primary flex-1 truncate">
                        {group.familyName}
                      </span>

                      {isSpike && (
                        <span className="text-[10px] font-semibold text-danger bg-danger/10 border border-danger/20 px-1.5 py-0.5 rounded-full shrink-0">
                          ↑ alto
                        </span>
                      )}

                      {/* % renda — hidden on mobile to prevent overflow */}
                      {pctOfIncome !== null && (
                        <span className="hidden sm:inline text-[11px] text-muted shrink-0">
                          {pctOfIncome}% renda
                        </span>
                      )}

                      {variationPct !== null && (
                        <span className={`text-[11px] font-medium shrink-0 ${variation > 0 ? "text-danger" : "text-accent"}`}>
                          <span className="sm:hidden">{variation > 0 ? "▲" : "▼"}</span>
                          <span className="hidden sm:inline">{variation > 0 ? "▲" : "▼"} {Math.abs(Number(variationPct))}%</span>
                        </span>
                      )}
                    </div>

                    {/* Zona direita — clique expande (alvo grande) */}
                    <button
                      className="flex items-center gap-2 px-4 py-3 shrink-0 cursor-pointer hover:bg-surface-3/50 transition-colors border-l border-border/40"
                      onClick={() => toggleFamily(key)}
                    >
                      <span className="text-sm font-mono font-semibold" style={{ color: familyColor }}>
                        {formatCurrency(group.outcome, displayCurrency)}
                      </span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-muted shrink-0">
                        {isExpanded ? <path d="M18 15l-6-6-6 6" /> : <path d="M6 9l6 6 6-6" />}
                      </svg>
                    </button>
                  </div>

                  {/* Progress bar: % of total expenses */}
                  {pctOfTotal > 0 && (
                    <div className="h-0.5 bg-surface-3">
                      <div className="h-full transition-all duration-500" style={{ width: `${Math.min(100, pctOfTotal)}%`, background: familyColor + "80" }} />
                    </div>
                  )}

                  {/* Expanded: categories + tag checklist */}
                  {isExpanded && (
                    <div className="divide-y divide-border border-t border-border">
                      {group.categoryBreakdown.map((cat) => {
                        const catTags = tags.filter(
                          (t) => t.category_id === cat.catId && t.is_active && t.type !== "income"
                        );
                        return (
                          <div key={cat.catId} className="px-4 py-2.5">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs uppercase tracking-wider text-muted font-medium">{cat.name}</span>
                              <span className="text-xs font-mono text-text-secondary">{formatCurrency(cat.value, displayCurrency)}</span>
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
                                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${paid ? "bg-accent" : "bg-border"}`} />
                                      <span className={`text-[12px] truncate ${paid ? "text-text-secondary" : "text-muted opacity-50"}`}>
                                        {tag.name}
                                      </span>
                                    </div>
                                    <span className={`text-[12px] font-mono flex-shrink-0 ${paid ? "text-text-secondary" : "text-muted opacity-40"}`}>
                                      {paid ? formatCurrency(tagTotal, displayCurrency) : "—"}
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
                  {!isExpanded && group.categoryBreakdown.length > 0 && (
                    <div className="divide-y divide-border border-t border-border">
                      {group.categoryBreakdown.map((item) => (
                        <div key={item.catId} className="flex items-center justify-between px-4 py-1.5">
                          <span className="text-sm text-muted">{item.name}</span>
                          <span className="text-sm font-mono text-text-secondary">{formatCurrency(item.value, displayCurrency)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Entradas card */}
            {totalIncome > 0 && (
              <div className="bg-surface border border-border border-l-[3px] border-l-accent/60 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-surface-2 border-b border-border">
                  <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                  <span className="text-sm font-semibold flex-1 text-text-primary">Entradas</span>
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

        </>
      )}
    </div>
  );
}
