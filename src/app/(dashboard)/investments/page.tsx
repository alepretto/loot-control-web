"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import { transactionsApi, Transaction } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  ArcElement,
  Tooltip,
  Legend,
);

// ─── Asset class config ───────────────────────────────────────────────────────

const ASSET_CLASSES: Record<string, { label: string; color: string; keywords: string[] }> = {
  crypto:       { label: "Crypto",      color: "#2563eb", keywords: ["BTC", "ETH", "SOL", "BITCOIN", "ETHEREUM"] },
  stocks_br:    { label: "Ações BR",    color: "#22c55e", keywords: ["PETR4", "VALE3", "ITUB4", "BBDC4"] },
  fixed_income: { label: "Renda Fixa",  color: "#f59e0b", keywords: ["CDB", "LCI", "LCA", "TESOURO", "CDI"] },
  stocks_us:    { label: "Stocks EUA",  color: "#38bdf8", keywords: ["AAPL", "TSLA", "NVDA", "AMZN"] },
};

const OUTROS_COLOR = "#8b949e";

function classifyAsset(symbol: string | null, index: string | null): string {
  const str = `${symbol ?? ""} ${index ?? ""}`.toUpperCase();
  for (const [key, { keywords }] of Object.entries(ASSET_CLASSES)) {
    if (keywords.some((kw) => str.includes(kw))) return key;
  }
  return "outros";
}

function getClassColor(cls: string): string {
  return ASSET_CLASSES[cls]?.color ?? OUTROS_COLOR;
}

function getClassLabel(cls: string): string {
  return ASSET_CLASSES[cls]?.label ?? "Outros";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InvestmentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading,      setLoading]      = useState(true);
  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await transactionsApi.list({ page_size: 1000 });
      setTransactions(data.items);
      setLoading(false);
    }
    load();
  }, []);

  // Filter investment transactions
  const investmentTxs = transactions.filter((tx) => tx.symbol || tx.index);

  // Group by asset class
  const byClass = investmentTxs.reduce<Record<string, Transaction[]>>((acc, tx) => {
    const cls = classifyAsset(tx.symbol, tx.index);
    if (!acc[cls]) acc[cls] = [];
    acc[cls].push(tx);
    return acc;
  }, {});

  // KPI values
  const totalAportado = investmentTxs.reduce((s, tx) => s + tx.value, 0);
  const numAtivos = new Set(
    investmentTxs.map((tx) => tx.symbol ?? tx.index ?? "—")
  ).size;
  const numClasses = Object.keys(byClass).length;

  // Accumulated line chart data
  const dailyMap = investmentTxs.reduce<Record<string, number>>((acc, tx) => {
    const date = tx.date_transaction.slice(0, 10);
    acc[date] = (acc[date] ?? 0) + tx.value;
    return acc;
  }, {});

  const linePoints = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce<{ date: string; acumulado: number }[]>((arr, [date, value]) => {
      const prev = arr[arr.length - 1]?.acumulado ?? 0;
      arr.push({ date, acumulado: prev + value });
      return arr;
    }, []);

  const lineData = {
    labels: linePoints.map((p) => {
      const [, m, d] = p.date.split("-");
      return `${d}/${m}`;
    }),
    datasets: [
      {
        label: "Aportes Acumulados",
        data: linePoints.map((p) => p.acumulado),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37,99,235,0.12)",
        fill: true,
        tension: 0.4,
        pointRadius: linePoints.length > 30 ? 0 : 3,
        pointHoverRadius: 5,
        borderWidth: 2,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { y: number } }) =>
            ` ${formatCurrency(ctx.parsed.y, "BRL")}`,
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
        ticks: { color: "#8b949e", font: { size: 10 }, maxTicksLimit: 10 },
        grid: { color: "#20282F" },
      },
      y: {
        ticks: {
          color: "#8b949e",
          font: { size: 10 },
          callback: (v: number | string) =>
            `R$ ${(Number(v) / 1000).toFixed(0)}k`,
        },
        grid: { color: "#20282F" },
      },
    },
  };

  // Doughnut chart (allocation by class)
  const allClassKeys = Object.keys(byClass);
  const donutValues  = allClassKeys.map((cls) =>
    byClass[cls].reduce((s, tx) => s + tx.value, 0)
  );
  const donutColors  = allClassKeys.map((cls) => getClassColor(cls));
  const donutTotal   = donutValues.reduce((a, b) => a + b, 0);

  const donutData = {
    labels: allClassKeys.map(getClassLabel),
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

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="px-6 py-5 space-y-6">

      {/* Header + KPIs */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <h1 className="text-lg font-semibold text-text-primary">Investimentos</h1>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            label:  "Total Aportado",
            value:  loading ? "—" : formatCurrency(totalAportado, "BRL"),
            color:  "text-accent",
          },
          {
            label:  "Nº de Ativos",
            value:  loading ? "—" : String(numAtivos),
            color:  "text-primary",
          },
          {
            label:  "Classes",
            value:  loading ? "—" : String(numClasses),
            color:  "text-text-primary",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4 space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
            <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <span className="text-sm text-muted animate-pulse">Carregando dados...</span>
        </div>
      ) : investmentTxs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-2">
          <p className="text-sm text-muted">Nenhuma transação de investimento encontrada.</p>
          <p className="text-xs text-muted">Adicione transações com símbolo ou índice.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-6 items-start">

          {/* ── Left: Charts ──────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Line chart */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs uppercase tracking-wider text-muted mb-1">
                Evolução dos Aportes (acumulado)
              </p>
              <p className="text-xs text-muted mb-4">
                {linePoints.length} pontos · {linePoints[0]?.date ?? ""} → {linePoints[linePoints.length - 1]?.date ?? ""}
              </p>
              <div style={{ height: 260 }}>
                {linePoints.length > 0 ? (
                  <Line data={lineData} options={lineOptions} />
                ) : (
                  <p className="text-sm text-muted text-center pt-10">Sem dados.</p>
                )}
              </div>
            </div>

            {/* Doughnut chart */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs uppercase tracking-wider text-muted mb-4">
                Alocação por Classe
              </p>
              <div className="flex items-center gap-8 flex-wrap">
                {/* Chart */}
                <div className="relative flex-shrink-0" style={{ width: 200, height: 200 }}>
                  <Doughnut data={donutData} options={donutOptions} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] uppercase tracking-wider text-muted">Total</span>
                    <span className="text-sm font-bold font-mono text-text-primary mt-0.5">
                      {formatCurrency(donutTotal, "BRL")}
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-col gap-2.5 flex-1 min-w-[160px]">
                  {allClassKeys.map((cls, i) => {
                    const val = donutValues[i];
                    const pct = donutTotal > 0 ? ((val / donutTotal) * 100).toFixed(1) : "0.0";
                    return (
                      <div key={cls} className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: donutColors[i] }}
                        />
                        <span className="text-sm text-muted flex-1">{getClassLabel(cls)}</span>
                        <span className="text-xs font-mono text-text-primary">
                          {formatCurrency(val, "BRL")}
                        </span>
                        <span className="text-xs font-mono text-muted w-12 text-right">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Asset class tables ─────────────────────────────────── */}
          <div className="space-y-4">
            {Object.entries(byClass)
              .sort(([, a], [, b]) =>
                b.reduce((s, tx) => s + tx.value, 0) - a.reduce((s, tx) => s + tx.value, 0)
              )
              .map(([cls, txs]) => {
                const total    = txs.reduce((s, tx) => s + tx.value, 0);
                const color    = getClassColor(cls);
                const label    = getClassLabel(cls);

                const bySymbol = txs.reduce<Record<string, { qty: number; value: number }>>(
                  (acc, tx) => {
                    const sym = tx.symbol ?? tx.index ?? "—";
                    if (!acc[sym]) acc[sym] = { qty: 0, value: 0 };
                    acc[sym].qty   += tx.quantity ?? 0;
                    acc[sym].value += tx.value;
                    return acc;
                  },
                  {}
                );

                return (
                  <div key={cls} className="bg-surface border border-border rounded-xl overflow-hidden">
                    {/* Card header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-surface-2 border-b border-border">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: color }}
                        />
                        <span className="text-sm font-semibold text-text-primary">{label}</span>
                        <span className="text-xs text-muted">
                          {txs.length} {txs.length === 1 ? "aporte" : "aportes"}
                        </span>
                      </div>
                      <span className="text-sm font-mono font-semibold text-text-primary">
                        {formatCurrency(total, "BRL")}
                      </span>
                    </div>

                    {/* Table */}
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-muted font-medium">
                            Símbolo
                          </th>
                          <th className="text-right px-4 py-2 text-xs uppercase tracking-wider text-muted font-medium">
                            Qtd
                          </th>
                          <th className="text-right px-4 py-2 text-xs uppercase tracking-wider text-muted font-medium">
                            Aportado
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {Object.entries(bySymbol)
                          .sort(([, a], [, b]) => b.value - a.value)
                          .map(([sym, data]) => (
                            <tr key={sym} className="hover:bg-surface-2 transition-colors">
                              <td className="px-4 py-2.5 text-sm font-mono font-semibold text-primary">
                                {sym}
                              </td>
                              <td className="px-4 py-2.5 text-sm font-mono text-right text-muted">
                                {data.qty > 0 ? data.qty.toFixed(4) : "—"}
                              </td>
                              <td className="px-4 py-2.5 text-sm font-mono text-right text-text-primary">
                                {formatCurrency(data.value, "BRL")}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
