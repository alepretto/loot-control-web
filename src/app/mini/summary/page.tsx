"use client";

import { useEffect, useState } from "react";
import {
  transactionsApi,
  tagsApi,
  categoriesApi,
  tagFamiliesApi,
  Transaction,
  Tag,
  Category,
  TagFamily,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function navigateMonth(year: number, month: number, delta: number) {
  let m = month + delta;
  let y = year;
  if (m > 12) { m = 1; y += 1; }
  if (m < 1) { m = 12; y -= 1; }
  return { year: y, month: m };
}

function monthBounds(year: number, month: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return {
    date_from: `${year}-${pad(month)}-01`,
    date_to: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

export default function MiniSummaryPage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [families, setFamilies] = useState<TagFamily[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const bounds = monthBounds(selectedYear, selectedMonth);
      const [txData, tagList, catList, famList] = await Promise.all([
        transactionsApi.list({ ...bounds, page_size: 2000 }),
        tagsApi.list(),
        categoriesApi.list(),
        tagFamiliesApi.list(),
      ]);
      setTransactions(txData.items);
      setTags(tagList);
      setCategories(catList);
      setFamilies(famList);
      setLoading(false);
    }
    load();
  }, [selectedYear, selectedMonth]);

  function resolveTag(tx: Transaction): Tag | undefined {
    return tags.find((t) => t.id === tx.tag_id);
  }

  // Exclude investments
  const nonInvestment = transactions.filter((tx) => !tx.symbol && !tx.index);

  const totalIncome = nonInvestment
    .filter((tx) => resolveTag(tx)?.type === "income")
    .reduce((s, tx) => s + tx.value, 0);

  const totalOutcome = nonInvestment
    .filter((tx) => resolveTag(tx)?.type === "outcome")
    .reduce((s, tx) => s + tx.value, 0);

  const balance = totalIncome - totalOutcome;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalOutcome) / totalIncome) * 100 : 0;

  // Breakdown by family (outcome only)
  const familyMap: Record<string, number> = {};
  for (const tx of nonInvestment) {
    const tag = resolveTag(tx);
    if (tag?.type !== "outcome") continue;
    const cat = categories.find((c) => c.id === tag?.category_id);
    const famId = cat?.family_id ?? "__none__";
    familyMap[famId] = (familyMap[famId] ?? 0) + tx.value;
  }

  const familyBreakdown = Object.entries(familyMap)
    .map(([famId, value]) => {
      const fam = families.find((f) => f.id === famId);
      return { name: fam?.name ?? "Sem Família", value };
    })
    .sort((a, b) => b.value - a.value);

  // Top 5 tags by outcome
  const tagMap: Record<string, number> = {};
  for (const tx of nonInvestment) {
    const tag = resolveTag(tx);
    if (tag?.type !== "outcome") continue;
    const name = tag.name;
    tagMap[name] = (tagMap[name] ?? 0) + tx.value;
  }
  const top5Tags = Object.entries(tagMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  function prevMonth() {
    const { year, month } = navigateMonth(selectedYear, selectedMonth, -1);
    setSelectedYear(year);
    setSelectedMonth(month);
  }

  function nextMonth() {
    const { year, month } = navigateMonth(selectedYear, selectedMonth, 1);
    setSelectedYear(year);
    setSelectedMonth(month);
  }

  const kpis = [
    { label: "Entradas", value: totalIncome, color: "text-accent" },
    { label: "Saídas", value: totalOutcome, color: "text-danger" },
    { label: "Saldo", value: balance, color: balance >= 0 ? "text-accent" : "text-danger" },
    { label: "Poupança", value: null, pct: savingsRate, color: "text-primary" },
  ];

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      {/* Header + month nav */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-text-primary">Resumo</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-muted hover:text-text-primary transition-colors min-h-[44px] min-w-[44px]"
          >
            ←
          </button>
          <span className="text-sm text-text-primary font-medium min-w-[120px] text-center">
            {MONTHS[selectedMonth - 1]} {selectedYear}
          </span>
          <button
            onClick={nextMonth}
            className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-muted hover:text-text-primary transition-colors min-h-[44px] min-w-[44px]"
          >
            →
          </button>
        </div>
      </div>

      {/* KPI 2x2 grid */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map(({ label, value, pct, color }) => (
          <div key={label} className="bg-surface border border-border rounded-2xl p-4 space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
            <p className={`text-lg font-bold font-mono ${color} ${loading ? "opacity-30" : ""}`}>
              {loading
                ? "—"
                : pct !== undefined
                ? `${pct.toFixed(1)}%`
                : formatCurrency(value!, "BRL")}
            </p>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-muted text-sm text-center py-8">Carregando...</p>
      ) : (
        <>
          {/* Breakdown by family */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-text-primary">Gastos por Família</p>
            {familyBreakdown.length === 0 ? (
              <p className="text-muted text-sm text-center py-4">Sem gastos neste mês.</p>
            ) : (
              <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
                {familyBreakdown.map(({ name, value }) => (
                  <div key={name} className="flex items-center justify-between px-4 py-3 min-h-[48px]">
                    <span className="text-sm text-text-primary">{name}</span>
                    <span className="text-sm font-mono text-danger">-{formatCurrency(value, "BRL")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top 5 tags */}
          {top5Tags.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-text-primary">Top Tags (Gastos)</p>
              <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
                {top5Tags.map(([name, value], i) => (
                  <div key={name} className="flex items-center justify-between px-4 py-3 min-h-[48px]">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted w-4">{i + 1}</span>
                      <span className="text-sm text-text-primary">{name}</span>
                    </div>
                    <span className="text-sm font-mono text-text-primary">-{formatCurrency(value, "BRL")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
