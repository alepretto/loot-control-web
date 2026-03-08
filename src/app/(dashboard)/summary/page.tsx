"use client";

import { useEffect, useState } from "react";
import { transactionsApi, categoriesApi, tagsApi, Transaction, Category, Tag } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface MonthGroup {
  label: string;
  income: number;
  outcome: number;
  items: { category: string; value: number; type: "income" | "outcome" }[];
}

export default function SummaryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    async function load() {
      const [txData, cats, tagList] = await Promise.all([
        transactionsApi.list({ page_size: 200 }),
        categoriesApi.list(),
        tagsApi.list(),
      ]);
      setTransactions(txData.items);
      setCategories(cats);
      setTags(tagList);
    }
    load();
  }, []);

  const monthGroups = transactions.reduce<Record<string, MonthGroup>>((acc, tx) => {
    const date = new Date(tx.date_transaction);
    const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!acc[label]) acc[label] = { label, income: 0, outcome: 0, items: [] };
    const tag = tags.find((t) => t.id === tx.tag_id);
    const cat = categories.find((c) => c.id === tag?.category_id);
    const type = cat?.type ?? "outcome";
    if (type === "income") acc[label].income += tx.value;
    else acc[label].outcome += tx.value;
    acc[label].items.push({ category: cat?.name ?? "—", value: tx.value, type });
    return acc;
  }, {});

  const months = Object.values(monthGroups).sort((a, b) => b.label.localeCompare(a.label));
  const totalIncome = months.reduce((s, m) => s + m.income, 0);
  const totalOutcome = months.reduce((s, m) => s + m.outcome, 0);
  const balance = totalIncome - totalOutcome;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-lg font-semibold">Resumo Financeiro</h1>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Entradas", value: totalIncome, color: "text-emerald-400" },
          { label: "Total Saídas", value: totalOutcome, color: "text-red-400" },
          {
            label: "Saldo",
            value: balance,
            color: balance >= 0 ? "text-emerald-400" : "text-red-400",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#1a1d2e] border border-[#2d3154] rounded-xl p-4">
            <p className="text-xs text-[#94a3b8] uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{formatCurrency(value, "BRL")}</p>
          </div>
        ))}
      </div>

      {/* Monthly breakdown */}
      <div className="space-y-4">
        {months.map((month) => (
          <div
            key={month.label}
            className="bg-[#1a1d2e] border border-[#2d3154] rounded-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2 bg-[#252840] border-b border-[#2d3154]">
              <span className="text-sm font-medium">
                {new Date(month.label + "-02").toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <div className="flex gap-4 text-xs">
                <span className="text-emerald-400">+{formatCurrency(month.income, "BRL")}</span>
                <span className="text-red-400">-{formatCurrency(month.outcome, "BRL")}</span>
                <span
                  className={`font-medium ${
                    month.income - month.outcome >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  = {formatCurrency(month.income - month.outcome, "BRL")}
                </span>
              </div>
            </div>
            <div className="divide-y divide-[#2d3154]">
              {month.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-1.5">
                  <span className="text-sm text-[#94a3b8]">{item.category}</span>
                  <span
                    className={`text-sm font-mono ${
                      item.type === "income" ? "text-emerald-400" : "text-[#f1f5f9]"
                    }`}
                  >
                    {item.type === "income" ? "+" : "-"}
                    {formatCurrency(item.value, "BRL")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
