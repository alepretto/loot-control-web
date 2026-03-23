"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";

// ─── Fake data ────────────────────────────────────────────────────────────────

const MONTH = "Março 2026";

const KPI_RESUMO = [
  { label: "Entradas", value: 8500, currency: "BRL", color: "text-accent", sign: "+" },
  { label: "Saídas", value: 4230, currency: "BRL", color: "text-danger", sign: "-" },
  { label: "Investido", value: 2000, currency: "BRL", color: "text-primary", sign: "-" },
  { label: "Saldo", value: 2270, currency: "BRL", color: "text-text-primary", sign: "+" },
  { label: "Poupança", value: null, pct: "26,7%", color: "text-accent" },
];

const FAMILIES: {
  name: string;
  outcome: number;
  pct: number;
  color: string;
  categories: { name: string; value: number }[];
  tags: { name: string; paid: boolean }[];
}[] = [
  {
    name: "Moradia",
    outcome: 2780,
    pct: 65.7,
    color: "#2563eb",
    categories: [{ name: "Aluguel", value: 2500 }, { name: "Contas", value: 280 }],
    tags: [
      { name: "Mensalidade Aluguel", paid: true },
      { name: "Conta de Luz", paid: true },
      { name: "Internet", paid: true },
    ],
  },
  {
    name: "Alimentação",
    outcome: 1200,
    pct: 28.4,
    color: "#22c55e",
    categories: [{ name: "Mercado", value: 750 }, { name: "Restaurantes", value: 450 }],
    tags: [
      { name: "Mercado", paid: true },
      { name: "Restaurante", paid: true },
    ],
  },
  {
    name: "Saúde",
    outcome: 120,
    pct: 2.8,
    color: "#f59e0b",
    categories: [{ name: "Academia", value: 120 }],
    tags: [
      { name: "Academia", paid: true },
      { name: "Farmácia", paid: true },
    ],
  },
  {
    name: "Lazer",
    outcome: 80,
    pct: 1.9,
    color: "#8b5cf6",
    categories: [{ name: "Streaming", value: 80 }],
    tags: [
      { name: "Netflix", paid: true },
      { name: "Spotify", paid: true },
    ],
  },
  {
    name: "Transporte",
    outcome: 50,
    pct: 1.2,
    color: "#8b949e",
    categories: [{ name: "Uber", value: 50 }],
    tags: [
      { name: "Uber", paid: false },
    ],
  },
];

const TOP_CATEGORIES = [
  { name: "Aluguel", value: 2500, max: 2500 },
  { name: "Mercado", value: 750, max: 2500 },
  { name: "Restaurantes", value: 450, max: 2500 },
  { name: "Contas", value: 280, max: 2500 },
  { name: "Academia", value: 120, max: 2500 },
  { name: "Streaming", value: 80, max: 2500 },
  { name: "Transporte", value: 50, max: 2500 },
];

const TRANSACTIONS = [
  {
    date: "21 mar", items: [
      { time: "09:15", tag: "Salário CLT", breadcrumb: "Renda · Salário", value: 8500, income: true },
    ],
  },
  {
    date: "20 mar", items: [
      { time: "14:30", tag: "Mensalidade Aluguel", breadcrumb: "Moradia · Aluguel", value: 2500, income: false },
      { time: "10:20", tag: "Conta de Luz", breadcrumb: "Moradia · Contas", value: 150, income: false },
      { time: "09:00", tag: "Aporte Ações", breadcrumb: "Investimentos · Ações", value: 1000, income: false, investment: true },
    ],
  },
  {
    date: "18 mar", items: [
      { time: "19:30", tag: "Feira da semana", breadcrumb: "Alimentação · Mercado", value: 380, income: false },
      { time: "13:00", tag: "Almoço", breadcrumb: "Alimentação · Restaurantes", value: 45, income: false },
    ],
  },
  {
    date: "15 mar", items: [
      { time: "20:00", tag: "Netflix", breadcrumb: "Lazer · Streaming", value: 39.90, income: false },
      { time: "08:00", tag: "Academia", breadcrumb: "Saúde · Academia", value: 120, income: false },
      { time: "07:30", tag: "Aporte Cripto", breadcrumb: "Investimentos · Cripto", value: 1000, income: false, investment: true },
    ],
  },
  {
    date: "12 mar", items: [
      { time: "18:30", tag: "Mercado semanal", breadcrumb: "Alimentação · Mercado", value: 370, income: false },
    ],
  },
  {
    date: "10 mar", items: [
      { time: "21:00", tag: "Jantar fora", breadcrumb: "Alimentação · Restaurantes", value: 180, income: false },
      { time: "09:00", tag: "Internet", breadcrumb: "Moradia · Contas", value: 99, income: false },
    ],
  },
  {
    date: "05 mar", items: [
      { time: "17:00", tag: "Farmácia", breadcrumb: "Saúde · Farmácia", value: 80, income: false },
      { time: "08:00", tag: "Spotify", breadcrumb: "Lazer · Streaming", value: 21.90, income: false },
    ],
  },
  {
    date: "01 mar", items: [
      { time: "22:00", tag: "Uber", breadcrumb: "Transporte · Transporte", value: 35, income: false },
      { time: "11:00", tag: "Mercado", breadcrumb: "Alimentação · Mercado", value: 200, income: false },
    ],
  },
];

const INVESTMENT_KPIS = [
  { label: "Total Aportado", value: "R$ 38.700", sub: "desde set/2024" },
  { label: "Ativos", value: "8", sub: "em carteira" },
  { label: "Classes", value: "4", sub: "diversificado" },
];

const ALLOCATION = [
  { name: "Ações BR", value: 15000, pct: 40.9, color: "#2563eb" },
  { name: "Cripto", value: 11000, pct: 30.0, color: "#f59e0b" },
  { name: "Renda Fixa", value: 7700, pct: 21.0, color: "#22c55e" },
  { name: "Stocks EUA", value: 3000, pct: 8.1, color: "#8b5cf6" },
];

const APORTES_MONTHS = ["Set", "Out", "Nov", "Dez", "Jan", "Fev", "Mar"];
const APORTES_VALUES = [3000, 4500, 5000, 4000, 5500, 6200, 8500];
const APORTES_MAX = Math.max(...APORTES_VALUES);

const BR_STOCKS = [
  { symbol: "PETR4", qty: 200, price: 38.40, total: 7680 },
  { symbol: "VALE3", qty: 100, price: 65.20, total: 6520 },
  { symbol: "ITUB4", qty: 150, price: 35.60, total: 5340 },
];
const CRYPTO = [
  { symbol: "BTC", qty: 0.18, price: 340000, total: 61200, currency: "BRL" },
  { symbol: "ETH", qty: 1.5, price: 16500, total: 24750, currency: "BRL" },
];
const RF = [
  { name: "CDB Nubank 120% CDI", value: 5000, index: "CDI", rate: 120 },
  { name: "Tesouro Selic 2029", value: 2700, index: "SELIC", rate: 100 },
];

type Tab = "resumo" | "transacoes" | "investimentos";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const [tab, setTab] = useState<Tab>("resumo");
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col">

      {/* ── Demo banner ───────────────────────────────────────────────────── */}
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-primary font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Demonstração · Dados fictícios
        </div>
        <Link
          href="/login"
          className="bg-primary hover:bg-primary-hover text-white font-semibold px-3 py-1 rounded-lg transition-colors text-xs"
        >
          Criar conta grátis →
        </Link>
      </div>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="border-b border-border bg-surface sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/nav-icon.png" alt="Loot Control" width={28} height={28} className="rounded-lg" />
            <span className="text-sm font-semibold text-text-primary hidden sm:block">Loot Control</span>
          </Link>

          {/* Tabs */}
          <nav className="flex items-center gap-1">
            {([
              { id: "resumo", label: "Gastos" },
              { id: "transacoes", label: "Transações" },
              { id: "investimentos", label: "Investimentos" },
            ] as { id: Tab; label: string }[]).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  tab === t.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:text-text-primary hover:bg-surface-2"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <Link
            href="/login"
            className="text-xs text-primary hover:text-primary-hover font-medium transition-colors shrink-0"
          >
            Entrar →
          </Link>
        </div>
      </header>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">

        {/* ────────────────────────── RESUMO ────────────────────────────── */}
        {tab === "resumo" && (
          <div className="space-y-5">
            {/* Month selector */}
            <div className="flex items-center gap-3">
              <button className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted hover:text-text-primary hover:bg-surface-2 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <span className="text-sm font-semibold text-text-primary min-w-[120px] text-center">{MONTH}</span>
              <button className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted hover:text-text-primary hover:bg-surface-2 transition-colors opacity-40 cursor-not-allowed">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>

            {/* KPIs — 5 cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {KPI_RESUMO.map((k) => (
                <div key={k.label} className="bg-surface border border-border rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">{k.label}</p>
                  <p className={`text-xl font-bold font-mono mt-1 ${k.color}`}>
                    {k.pct ? k.pct : `${k.sign}${formatCurrency(k.value!, "BRL")}`}
                  </p>
                </div>
              ))}
            </div>

            {/* Two columns: chart + family cards */}
            <div className="grid lg:grid-cols-[55%_45%] gap-5">

              {/* Left: donut + top categories bar */}
              <div className="space-y-4">
                {/* Donut visual */}
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-border bg-surface-2">
                    <h2 className="text-sm font-semibold text-text-primary">Gastos por família</h2>
                  </div>
                  <div className="p-5 flex items-center gap-6">
                    <div className="relative w-28 h-28 shrink-0">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        {(() => {
                          let offset = 0;
                          return FAMILIES.map((f) => {
                            const dash = f.pct;
                            const el = (
                              <circle
                                key={f.name}
                                cx="18" cy="18" r="15.9"
                                fill="none"
                                stroke={f.color}
                                strokeWidth="3.2"
                                strokeDasharray={`${dash} ${100 - dash}`}
                                strokeDashoffset={-offset}
                                strokeLinecap="butt"
                              />
                            );
                            offset += dash;
                            return el;
                          });
                        })()}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[9px] text-muted">Total</span>
                        <span className="text-[11px] font-bold font-mono text-danger">-R$4.230</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      {FAMILIES.map((f) => (
                        <div key={f.name} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: f.color }} />
                          <span className="text-xs text-text-secondary flex-1">{f.name}</span>
                          <span className="text-[11px] font-mono text-muted">{f.pct}%</span>
                          <span className="text-[11px] font-mono text-text-primary w-20 text-right">{formatCurrency(f.outcome, "BRL")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top categories horizontal bars */}
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-border bg-surface-2">
                    <h2 className="text-sm font-semibold text-text-primary">Top categorias</h2>
                  </div>
                  <div className="p-5 space-y-2.5">
                    {TOP_CATEGORIES.map((c) => (
                      <div key={c.name} className="flex items-center gap-3">
                        <span className="text-xs text-text-secondary w-24 shrink-0 truncate">{c.name}</span>
                        <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/60 rounded-full"
                            style={{ width: `${(c.value / c.max) * 100}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono text-muted w-20 text-right shrink-0">{formatCurrency(c.value, "BRL")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: family cards with tag checklist */}
              <div className="space-y-2">
                {FAMILIES.map((f) => {
                  const isExpanded = expandedFamily === f.name;
                  return (
                    <div key={f.name} className="bg-surface border border-border rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedFamily(isExpanded ? null : f.name)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{isExpanded ? "▼" : "▶"}</span>
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: f.color }} />
                          <span className="text-sm font-medium text-text-primary">{f.name}</span>
                          <span className="text-[10px] text-muted bg-surface-3 px-1.5 py-0.5 rounded font-mono">{f.pct}%</span>
                        </div>
                        <span className="text-sm font-mono font-semibold text-danger">-{formatCurrency(f.outcome, "BRL")}</span>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-border">
                          {/* Category breakdown */}
                          <div className="divide-y divide-border/60">
                            {f.categories.map((c) => (
                              <div key={c.name} className="flex items-center justify-between px-4 py-2">
                                <span className="text-xs text-muted">{c.name}</span>
                                <span className="text-xs font-mono text-text-secondary">-{formatCurrency(c.value, "BRL")}</span>
                              </div>
                            ))}
                          </div>
                          {/* Tag checklist */}
                          <div className="px-4 py-3 border-t border-border/40 space-y-1.5">
                            {f.tags.map((t) => (
                              <div key={t.name} className="flex items-center gap-2">
                                <span className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${
                                  t.paid
                                    ? "bg-accent/15 border-accent/40"
                                    : "bg-surface-3 border-border"
                                }`}>
                                  {t.paid && (
                                    <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-accent" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="1.5 5 4 7.5 8.5 2.5" />
                                    </svg>
                                  )}
                                </span>
                                <span className={`text-xs ${t.paid ? "text-text-secondary" : "text-muted"}`}>{t.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────── TRANSAÇÕES ──────────────────────────── */}
        {tab === "transacoes" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-text-primary">Transações</h1>
              <span className="text-xs text-muted bg-surface border border-border rounded-lg px-3 py-1.5">{MONTH}</span>
            </div>

            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              {TRANSACTIONS.map((group, gi) => {
                const net = group.items.reduce((s, t) => s + (t.income ? t.value : -t.value), 0);
                return (
                  <div key={group.date}>
                    {/* Date header */}
                    <div className="sticky top-[104px] z-10 bg-background/98 backdrop-blur-sm px-4 pt-4 pb-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-text-primary whitespace-nowrap tracking-tight">{group.date}</span>
                        <div className="flex-1 h-px bg-border/60" />
                        <span className={`text-xs font-mono font-semibold tabular-nums shrink-0 ${net >= 0 ? "text-accent" : "text-danger"}`}>
                          {net >= 0 ? "+" : ""}{formatCurrency(Math.abs(net), "BRL")}
                        </span>
                      </div>
                    </div>

                    {/* Transactions */}
                    {group.items.map((tx, ti) => (
                      <div
                        key={ti}
                        className={`flex items-center gap-3 px-4 py-3 hover:bg-surface-2/60 transition-colors ${
                          gi < TRANSACTIONS.length - 1 || ti < group.items.length - 1 ? "border-b border-border/60" : ""
                        }`}
                      >
                        <span className={`shrink-0 w-2 h-2 rounded-full ${
                          tx.income ? "bg-accent" : ("investment" in tx && tx.investment) ? "bg-primary" : "bg-danger"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-text-primary truncate">{tx.tag}</div>
                          <div className="text-xs text-muted mt-0.5">{tx.breadcrumb}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-sm font-mono font-semibold ${
                            tx.income ? "text-accent" : ("investment" in tx && tx.investment) ? "text-primary" : "text-text-primary"
                          }`}>
                            {tx.income ? "+" : "-"}{formatCurrency(tx.value, "BRL")}
                          </div>
                          <div className="text-[10px] font-mono text-muted mt-0.5">{tx.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ──────────────────── INVESTIMENTOS ──────────────────────────── */}
        {tab === "investimentos" && (
          <div className="space-y-6">
            <h1 className="text-lg font-semibold text-text-primary">Investimentos</h1>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
              {INVESTMENT_KPIS.map((k) => (
                <div key={k.label} className="bg-surface border border-border rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">{k.label}</p>
                  <p className="text-xl font-bold font-mono mt-1 text-text-primary">{k.value}</p>
                  <p className="text-xs text-muted mt-0.5">{k.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Monthly aportes bar chart (CSS) */}
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-surface-2">
                  <h2 className="text-sm font-semibold text-text-primary">Aportes mensais</h2>
                </div>
                <div className="p-5">
                  <div className="flex items-end gap-2 h-32">
                    {APORTES_MONTHS.map((m, i) => {
                      const h = (APORTES_VALUES[i] / APORTES_MAX) * 100;
                      const isLast = i === APORTES_MONTHS.length - 1;
                      return (
                        <div key={m} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full flex items-end justify-center" style={{ height: "100px" }}>
                            <div
                              className={`w-full rounded-t-sm transition-all ${isLast ? "bg-primary" : "bg-primary/30"}`}
                              style={{ height: `${h}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-muted">{m}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Allocation */}
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-surface-2">
                  <h2 className="text-sm font-semibold text-text-primary">Alocação por classe</h2>
                </div>
                <div className="p-5 space-y-3">
                  {ALLOCATION.map((a) => (
                    <div key={a.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: a.color }} />
                          <span className="text-xs text-text-secondary">{a.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-muted">{a.pct}%</span>
                          <span className="text-xs font-mono text-text-primary">{formatCurrency(a.value, "BRL")}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${a.pct}%`, background: a.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tables */}
            <div className="space-y-4">
              {/* Ações BR */}
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-surface-2 flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-primary">Ações BR</span>
                  <span className="text-[10px] text-muted bg-surface-3 border border-border px-1.5 py-0.5 rounded">{BR_STOCKS.length} ativos</span>
                </div>
                <div className="divide-y divide-border">
                  {BR_STOCKS.map((s) => (
                    <div key={s.symbol} className="flex items-center justify-between px-5 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-semibold text-text-primary w-16">{s.symbol}</span>
                        <span className="text-xs text-muted">{s.qty} cotas</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono text-text-primary">{formatCurrency(s.total, "BRL")}</div>
                        <div className="text-[10px] text-muted font-mono">@ {formatCurrency(s.price, "BRL")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cripto */}
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-surface-2 flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-primary">Cripto</span>
                  <span className="text-[10px] text-muted bg-surface-3 border border-border px-1.5 py-0.5 rounded">{CRYPTO.length} ativos</span>
                </div>
                <div className="divide-y divide-border">
                  {CRYPTO.map((s) => (
                    <div key={s.symbol} className="flex items-center justify-between px-5 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-semibold text-text-primary w-16">{s.symbol}</span>
                        <span className="text-xs text-muted">{s.qty} unid.</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono text-text-primary">{formatCurrency(s.total, "BRL")}</div>
                        <div className="text-[10px] text-muted font-mono">@ {formatCurrency(s.price, "BRL")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Renda Fixa */}
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-surface-2 flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-primary">Renda Fixa</span>
                  <span className="text-[10px] text-muted bg-surface-3 border border-border px-1.5 py-0.5 rounded">{RF.length} ativos</span>
                </div>
                <div className="divide-y divide-border">
                  {RF.map((r) => (
                    <div key={r.name} className="flex items-center justify-between px-5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-text-primary truncate">{r.name}</div>
                        <div className="text-[10px] text-muted font-mono">{r.index} {r.rate}%</div>
                      </div>
                      <div className="text-xs font-mono text-text-primary ml-4">{formatCurrency(r.value, "BRL")}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer CTA ────────────────────────────────────────────────────── */}
      <div className="border-t border-border bg-surface px-4 py-6 text-center">
        <p className="text-sm text-muted mb-3">Pronto para usar com os seus dados reais?</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all"
        >
          Criar conta grátis →
        </Link>
      </div>
    </div>
  );
}
