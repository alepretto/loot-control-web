"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { transactionsApi, tagsApi, categoriesApi, Transaction, Tag, Category } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const ASSET_CLASSES: Record<string, { label: string; color: string; keywords: string[] }> = {
  crypto: { label: "Crypto", color: "#6366f1", keywords: ["BTC", "ETH", "SOL", "BITCOIN", "ETHEREUM"] },
  stocks_br: { label: "Ações BR", color: "#10b981", keywords: ["PETR4", "VALE3", "ITUB4", "BBDC4"] },
  fixed_income: { label: "Renda Fixa", color: "#f59e0b", keywords: ["CDB", "LCI", "LCA", "TESOURO", "CDI"] },
  stocks_us: { label: "Stocks EUA", color: "#3b82f6", keywords: ["AAPL", "TSLA", "NVDA", "AMZN"] },
};

function classifyAsset(symbol: string | null, index: string | null): string {
  const str = `${symbol ?? ""} ${index ?? ""}`.toUpperCase();
  for (const [key, { keywords }] of Object.entries(ASSET_CLASSES)) {
    if (keywords.some((kw) => str.includes(kw))) return key;
  }
  return "outros";
}

export default function InvestmentsPage() {
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

  const investmentTxs = transactions.filter((tx) => tx.symbol || tx.index);

  const byClass = investmentTxs.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const cls = classifyAsset(tx.symbol, tx.index);
    if (!acc[cls]) acc[cls] = [];
    acc[cls].push(tx);
    return acc;
  }, {});

  const pieData = Object.entries(byClass).map(([key, txs]) => ({
    name: ASSET_CLASSES[key]?.label ?? key,
    value: txs.reduce((s, tx) => s + tx.value, 0),
    color: ASSET_CLASSES[key]?.color ?? "#6b7280",
  }));

  const dailyMap = investmentTxs.reduce<Record<string, number>>((acc, tx) => {
    const date = tx.date_transaction.slice(0, 10);
    acc[date] = (acc[date] ?? 0) + tx.value;
    return acc;
  }, {});
  const lineData = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce<{ date: string; aporte: number; acumulado: number }[]>((arr, [date, value]) => {
      const prev = arr[arr.length - 1]?.acumulado ?? 0;
      arr.push({ date, aporte: value, acumulado: prev + value });
      return arr;
    }, []);

  const tooltipStyle = {
    contentStyle: { background: "#1a1d2e", border: "1px solid #2d3154", fontSize: 12 },
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-lg font-semibold">Investimentos</h1>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#1a1d2e] border border-[#2d3154] rounded-xl p-4">
          <p className="text-xs text-[#94a3b8] uppercase tracking-wider mb-4">Aportes Acumulados</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3154" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => formatCurrency(v, "BRL")} />
              <Line type="monotone" dataKey="acumulado" stroke="#6366f1" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1a1d2e] border border-[#2d3154] rounded-xl p-4">
          <p className="text-xs text-[#94a3b8] uppercase tracking-wider mb-4">Alocação por Classe</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} formatter={(v: number) => formatCurrency(v, "BRL")} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
                <span className="text-xs text-[#94a3b8]">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per class */}
      {Object.entries(byClass).map(([cls, txs]) => {
        const config = ASSET_CLASSES[cls];
        const total = txs.reduce((s, tx) => s + tx.value, 0);
        const bySymbol = txs.reduce<Record<string, { qty: number; value: number }>>((acc, tx) => {
          const sym = tx.symbol ?? tx.index ?? "—";
          if (!acc[sym]) acc[sym] = { qty: 0, value: 0 };
          acc[sym].qty += tx.quantity ?? 0;
          acc[sym].value += tx.value;
          return acc;
        }, {});

        return (
          <div key={cls} className="bg-[#1a1d2e] border border-[#2d3154] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-[#252840] border-b border-[#2d3154]">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: config?.color ?? "#6b7280" }}
                />
                <span className="text-sm font-medium">{config?.label ?? cls}</span>
              </div>
              <span className="text-sm font-mono">{formatCurrency(total, "BRL")}</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2d3154]">
                  <th className="text-left px-4 py-2 text-xs text-[#94a3b8] font-medium">Símbolo</th>
                  <th className="text-right px-4 py-2 text-xs text-[#94a3b8] font-medium">Quantidade</th>
                  <th className="text-right px-4 py-2 text-xs text-[#94a3b8] font-medium">
                    Total Aportado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d3154]">
                {Object.entries(bySymbol).map(([sym, data]) => (
                  <tr key={sym}>
                    <td className="px-4 py-2 text-sm font-mono text-indigo-400">{sym}</td>
                    <td className="px-4 py-2 text-sm font-mono text-right text-[#94a3b8]">
                      {data.qty > 0 ? data.qty.toFixed(4) : "—"}
                    </td>
                    <td className="px-4 py-2 text-sm font-mono text-right">
                      {formatCurrency(data.value, "BRL")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {investmentTxs.length === 0 && (
        <p className="text-center text-[#6b7280] py-12 text-sm">
          Nenhuma transação de investimento encontrada. Adicione transações com símbolo ou índice.
        </p>
      )}
    </div>
  );
}
