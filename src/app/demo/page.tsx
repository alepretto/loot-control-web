"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Chart as ChartJS,
  ArcElement,
  DoughnutController,
  BarElement,
  BarController,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import { formatCurrency } from "@/lib/utils";

ChartJS.register(
  ArcElement, DoughnutController,
  BarElement, BarController,
  CategoryScale, LinearScale,
  Tooltip, Legend
);

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "gastos" | "transacoes" | "investimentos" | "tags";

// ─── Fake data ────────────────────────────────────────────────────────────────

const MONTH = "Março 2026";

const FAMILIES = [
  { name: "Moradia",     outcome: 2780, color: "#2563eb" },
  { name: "Alimentação", outcome: 1200, color: "#22c55e" },
  { name: "Saúde",       outcome: 120,  color: "#f59e0b" },
  { name: "Lazer",       outcome: 80,   color: "#8b5cf6" },
  { name: "Transporte",  outcome: 50,   color: "#8b949e" },
];

const TOTAL_OUTCOME = FAMILIES.reduce((s, f) => s + f.outcome, 0);

const FAMILY_CARDS: {
  name: string; outcome: number; color: string;
  categories: { name: string; value: number }[];
  tags: { name: string; paid: boolean }[];
}[] = [
  {
    name: "Moradia", outcome: 2780, color: "#2563eb",
    categories: [{ name: "Aluguel", value: 2500 }, { name: "Contas", value: 280 }],
    tags: [{ name: "Mensalidade Aluguel", paid: true }, { name: "Conta de Luz", paid: true }, { name: "Internet", paid: true }],
  },
  {
    name: "Alimentação", outcome: 1200, color: "#22c55e",
    categories: [{ name: "Mercado", value: 750 }, { name: "Restaurantes", value: 450 }],
    tags: [{ name: "Mercado", paid: true }, { name: "Restaurante", paid: true }],
  },
  {
    name: "Saúde", outcome: 120, color: "#f59e0b",
    categories: [{ name: "Academia", value: 120 }],
    tags: [{ name: "Academia", paid: true }, { name: "Farmácia", paid: false }],
  },
  {
    name: "Lazer", outcome: 80, color: "#8b5cf6",
    categories: [{ name: "Streaming", value: 80 }],
    tags: [{ name: "Netflix", paid: true }, { name: "Spotify", paid: true }],
  },
  {
    name: "Transporte", outcome: 50, color: "#8b949e",
    categories: [{ name: "Uber", value: 50 }],
    tags: [{ name: "Uber", paid: false }],
  },
];

const TOP_CATS = ["Aluguel", "Mercado", "Restaurantes", "Contas", "Academia", "Streaming", "Transporte"];
const TOP_VALS = [2500, 750, 450, 280, 120, 80, 50];

const TRANSACTIONS = [
  { date: "21 mar", items: [{ time: "09:15", tag: "Salário CLT",          breadcrumb: "Renda · Salário",             value: 8500,   income: true }] },
  { date: "20 mar", items: [
    { time: "14:30", tag: "Mensalidade Aluguel",  breadcrumb: "Moradia · Aluguel",           value: 2500,   income: false },
    { time: "10:20", tag: "Conta de Luz",          breadcrumb: "Moradia · Contas",            value: 150,    income: false },
    { time: "09:00", tag: "Aporte Ações",          breadcrumb: "Investimentos · Ações",       value: 1000,   income: false, investment: true },
  ]},
  { date: "18 mar", items: [
    { time: "19:30", tag: "Feira da semana",        breadcrumb: "Alimentação · Mercado",       value: 380,    income: false },
    { time: "13:00", tag: "Almoço",                 breadcrumb: "Alimentação · Restaurantes",  value: 45,     income: false },
  ]},
  { date: "15 mar", items: [
    { time: "20:00", tag: "Netflix",                breadcrumb: "Lazer · Streaming",           value: 39.90,  income: false },
    { time: "08:00", tag: "Academia",               breadcrumb: "Saúde · Academia",            value: 120,    income: false },
    { time: "07:30", tag: "Aporte Cripto",          breadcrumb: "Investimentos · Cripto",      value: 1000,   income: false, investment: true },
  ]},
  { date: "10 mar", items: [
    { time: "21:00", tag: "Jantar fora",            breadcrumb: "Alimentação · Restaurantes",  value: 180,    income: false },
    { time: "09:00", tag: "Internet",               breadcrumb: "Moradia · Contas",            value: 99,     income: false },
  ]},
  { date: "05 mar", items: [
    { time: "17:00", tag: "Farmácia",               breadcrumb: "Saúde · Farmácia",            value: 80,     income: false },
    { time: "08:00", tag: "Spotify",                breadcrumb: "Lazer · Streaming",           value: 21.90,  income: false },
  ]},
  { date: "01 mar", items: [
    { time: "22:00", tag: "Uber",                   breadcrumb: "Transporte · Transporte",     value: 35,     income: false },
    { time: "11:00", tag: "Mercado",                breadcrumb: "Alimentação · Mercado",       value: 200,    income: false },
  ]},
];

const INVESTMENT_KPIS = [
  { label: "Total Aportado", value: "R$ 38.700", sub: "desde set/2024" },
  { label: "Ativos",         value: "8",          sub: "em carteira" },
  { label: "Classes",        value: "4",          sub: "diversificado" },
];
const ALLOCATION = [
  { name: "Ações BR",    value: 15000, pct: 40.9, color: "#2563eb" },
  { name: "Cripto",      value: 11000, pct: 30.0, color: "#f59e0b" },
  { name: "Renda Fixa",  value: 7700,  pct: 21.0, color: "#22c55e" },
  { name: "Stocks EUA",  value: 3000,  pct: 8.1,  color: "#8b5cf6" },
];
const APORTES_MONTHS = ["Set", "Out", "Nov", "Dez", "Jan", "Fev", "Mar"];
const APORTES_VALUES = [3000, 4500, 5000, 4000, 5500, 6200, 8500];
const BR_STOCKS = [
  { symbol: "PETR4", qty: 200, price: 38.40,  total: 7680  },
  { symbol: "VALE3", qty: 100, price: 65.20,  total: 6520  },
  { symbol: "ITUB4", qty: 150, price: 35.60,  total: 5340  },
];
const CRYPTO = [
  { symbol: "BTC", qty: 0.18, price: 340000, total: 61200 },
  { symbol: "ETH", qty: 1.5,  price: 16500,  total: 24750 },
];
const RF = [
  { name: "CDB Nubank 120% CDI", value: 5000, index: "CDI",   rate: 120 },
  { name: "Tesouro Selic 2029",  value: 2700, index: "SELIC", rate: 100 },
];

const TAG_TREE: {
  family: string;
  categories: { name: string; tags: { name: string; type: "income" | "outcome"; active: boolean }[] }[];
}[] = [
  { family: "Renda",         categories: [{ name: "Salário",    tags: [{ name: "Salário CLT", type: "income", active: true }, { name: "Freelance", type: "income", active: true }] }] },
  { family: "Moradia",       categories: [
    { name: "Aluguel",    tags: [{ name: "Mensalidade", type: "outcome", active: true }] },
    { name: "Contas",     tags: [{ name: "Luz", type: "outcome", active: true }, { name: "Internet", type: "outcome", active: true }, { name: "Água", type: "outcome", active: true }] },
  ]},
  { family: "Alimentação",   categories: [
    { name: "Mercado",    tags: [{ name: "Mercado", type: "outcome", active: true }] },
    { name: "Restaurantes", tags: [{ name: "Restaurante", type: "outcome", active: true }] },
  ]},
  { family: "Saúde",         categories: [
    { name: "Academia",   tags: [{ name: "Academia", type: "outcome", active: true }] },
    { name: "Farmácia",   tags: [{ name: "Farmácia", type: "outcome", active: true }] },
  ]},
  { family: "Lazer",         categories: [{ name: "Streaming", tags: [{ name: "Netflix", type: "outcome", active: true }, { name: "Spotify", type: "outcome", active: true }] }] },
  { family: "Transporte",    categories: [{ name: "Transporte", tags: [{ name: "Uber", type: "outcome", active: true }] }] },
  { family: "Investimentos", categories: [
    { name: "Ações",      tags: [{ name: "Aporte Ações", type: "outcome", active: true }] },
    { name: "Cripto",     tags: [{ name: "Aporte Cripto", type: "outcome", active: true }] },
    { name: "Renda Fixa", tags: [{ name: "Aporte RF", type: "outcome", active: true }] },
  ]},
];

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "gastos", label: "Gastos", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
      <path d="M3 3v18h18" /><path d="M7 16v-4M11 16V9M15 16V5M19 16v-2" />
    </svg>
  )},
  { id: "investimentos", label: "Investimentos", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
    </svg>
  )},
  { id: "transacoes", label: "Transações", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
      <rect x="5" y="2" width="14" height="20" rx="2" /><path d="M9 7h6M9 11h6M9 15h4" />
    </svg>
  )},
  { id: "tags", label: "Tags", icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  )},
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const [tab, setTab] = useState<Tab>("gastos");
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);
  const [expandedTagFamily, setExpandedTagFamily] = useState<string | null>("Moradia");
  const [expandedTagCat, setExpandedTagCat] = useState<string | null>("Contas");

  // ── ChartJS data ──────────────────────────────────────────────────────────

  const donutData = {
    labels: FAMILIES.map((f) => f.name),
    datasets: [{
      data: FAMILIES.map((f) => f.outcome),
      backgroundColor: FAMILIES.map((f) => f.color),
      borderColor: "#0E1218",
      borderWidth: 2,
      hoverBorderColor: "#0E1218",
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
      },
    },
    animation: { duration: 600 },
  };

  const barData = {
    labels: TOP_CATS,
    datasets: [{
      data: TOP_VALS,
      backgroundColor: "rgba(37,99,235,0.55)",
      hoverBackgroundColor: "rgba(37,99,235,0.85)",
      borderRadius: 4,
      borderSkipped: false as const,
    }],
  };

  const barOptions = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#141A22",
        borderColor: "#20282F",
        borderWidth: 1,
        titleColor: "#e6edf3",
        bodyColor: "#8b949e",
        callbacks: {
          label: (ctx: { parsed: { x: number | null } }) =>
            ` ${formatCurrency(ctx.parsed.x ?? 0, "BRL")}`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#8b949e",
          font: { size: 10 },
          callback: (v: number | string) => {
            const n = Number(v);
            return n >= 1000 ? `R$${(n / 1000).toFixed(0)}k` : `R$${n.toFixed(0)}`;
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

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary">

      {/* ── Demo Banner ─────────────────────────────────────────────────────── */}
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between gap-4 text-xs shrink-0 z-30">
        <div className="flex items-center gap-2 text-primary font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
          Demonstração · Dados fictícios · Funcionalidades reais
        </div>
        <Link href="/login" className="bg-primary hover:bg-primary-hover text-white font-semibold px-3 py-1 rounded-lg transition-colors whitespace-nowrap">
          Criar conta grátis →
        </Link>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ───────────────────────────────────────────────────────── */}
        <aside
          className="hidden md:flex w-52 shrink-0 flex-col border-r border-border"
          style={{ background: "linear-gradient(180deg, #0E1218 0%, #0A0F16 100%)" }}
        >
          {/* Logo */}
          <div className="border-b border-border">
            <div className="flex flex-col items-center px-3 pt-4 pb-3 gap-1.5">
              <Image src="/logo.png" alt="Loot Control" width={120} height={120} className="rounded-2xl w-full" />
              <span className="text-xs font-semibold text-muted tracking-widest uppercase">Loot Control</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 py-3 space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  tab === item.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-surface-2 hover:text-text-primary"
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Bottom */}
          <div className="px-2 py-3 border-t border-border">
            <Link
              href="/login"
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-all duration-150 w-full"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              <span>Entrar / Criar conta</span>
            </Link>
          </div>
        </aside>

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">

          {/* ── GASTOS ────────────────────────────────────────────────────── */}
          {tab === "gastos" && (
            <div className="p-6 space-y-5 max-w-5xl">
              {/* Month selector */}
              <div className="flex items-center gap-3">
                <button className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted hover:text-text-primary hover:bg-surface-2 transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <span className="text-sm font-semibold text-text-primary min-w-[120px] text-center">{MONTH}</span>
                <button className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted opacity-40 cursor-not-allowed">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>

              {/* 5 KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  { label: "Entradas",   value: "+R$ 8.500,00",  cls: "text-accent" },
                  { label: "Saídas",     value: "-R$ 4.230,00",  cls: "text-danger" },
                  { label: "Investido",  value: "-R$ 2.000,00",  cls: "text-primary" },
                  { label: "Saldo",      value: "+R$ 2.270,00",  cls: "text-text-primary" },
                  { label: "Poupança",   value: "26,7%",          cls: "text-accent" },
                ].map((k) => (
                  <div key={k.label} className="bg-surface border border-border rounded-xl p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">{k.label}</p>
                    <p className={`text-lg font-bold font-mono mt-1 ${k.cls}`}>{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Two columns */}
              <div className="grid lg:grid-cols-[55%_45%] gap-5">

                {/* Left: charts */}
                <div className="space-y-4">

                  {/* Donut */}
                  <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-border bg-surface-2">
                      <h2 className="text-sm font-semibold text-text-primary">Gastos por família</h2>
                    </div>
                    <div className="p-5 flex items-center gap-5">
                      <div className="relative w-32 h-32 shrink-0">
                        <Doughnut data={donutData} options={donutOptions} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[9px] text-muted">Total</span>
                          <span className="text-[11px] font-bold font-mono text-danger">
                            -{formatCurrency(TOTAL_OUTCOME, "BRL")}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        {FAMILIES.map((f) => (
                          <div key={f.name} className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: f.color }} />
                            <span className="text-xs text-text-secondary flex-1">{f.name}</span>
                            <span className="text-[10px] text-muted">{((f.outcome / TOTAL_OUTCOME) * 100).toFixed(1)}%</span>
                            <span className="text-xs font-mono text-text-primary w-20 text-right">{formatCurrency(f.outcome, "BRL")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Top categories horizontal bar */}
                  <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-border bg-surface-2">
                      <h2 className="text-sm font-semibold text-text-primary">Top categorias</h2>
                    </div>
                    <div className="p-5">
                      <div style={{ height: 200 }}>
                        <Bar data={barData} options={barOptions} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: family cards with checklist */}
                <div className="space-y-2">
                  {FAMILY_CARDS.map((f) => {
                    const isExpanded = expandedFamily === f.name;
                    return (
                      <div key={f.name} className="bg-surface border border-border rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedFamily(isExpanded ? null : f.name)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted">{isExpanded ? "▼" : "▶"}</span>
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: f.color }} />
                            <span className="text-sm font-medium text-text-primary">{f.name}</span>
                          </div>
                          <span className="text-sm font-mono font-semibold text-danger">
                            -{formatCurrency(f.outcome, "BRL")}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-border">
                            <div className="divide-y divide-border/60">
                              {f.categories.map((c) => (
                                <div key={c.name} className="flex items-center justify-between px-4 py-2">
                                  <span className="text-xs text-muted">{c.name}</span>
                                  <span className="text-xs font-mono text-text-secondary">-{formatCurrency(c.value, "BRL")}</span>
                                </div>
                              ))}
                            </div>
                            <div className="px-4 py-3 border-t border-border/40 space-y-1.5">
                              {f.tags.map((t) => (
                                <div key={t.name} className="flex items-center gap-2">
                                  <span className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${
                                    t.paid ? "bg-accent/15 border-accent/40" : "bg-surface-3 border-border"
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

          {/* ── TRANSAÇÕES ────────────────────────────────────────────────── */}
          {tab === "transacoes" && (
            <div className="p-6 space-y-4 max-w-3xl">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-text-primary">Transações</h1>
                <span className="text-xs text-muted bg-surface border border-border rounded-lg px-3 py-1.5">{MONTH}</span>
              </div>
              <p className="text-xs text-muted">Double-click em qualquer linha para editar inline.</p>

              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                {TRANSACTIONS.map((group, gi) => {
                  const net = group.items.reduce((s, t) => s + (t.income ? t.value : -t.value), 0);
                  return (
                    <div key={group.date}>
                      <div className="sticky top-0 z-10 bg-background/98 backdrop-blur-sm px-4 pt-4 pb-1.5">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-text-primary tracking-tight">{group.date}</span>
                          <div className="flex-1 h-px bg-border/60" />
                          <span className={`text-xs font-mono font-semibold ${net >= 0 ? "text-accent" : "text-danger"}`}>
                            {net >= 0 ? "+" : ""}{formatCurrency(Math.abs(net), "BRL")}
                          </span>
                        </div>
                      </div>
                      {group.items.map((tx, ti) => (
                        <div
                          key={ti}
                          className={`flex items-center gap-3 px-4 py-3 hover:bg-surface-2/60 transition-colors cursor-default ${
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

          {/* ── INVESTIMENTOS ─────────────────────────────────────────────── */}
          {tab === "investimentos" && (
            <div className="p-6 space-y-5 max-w-5xl">
              <h1 className="text-lg font-semibold text-text-primary">Investimentos</h1>

              <div className="grid grid-cols-3 gap-3">
                {INVESTMENT_KPIS.map((k) => (
                  <div key={k.label} className="bg-surface border border-border rounded-xl p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">{k.label}</p>
                    <p className="text-xl font-bold font-mono mt-1 text-text-primary">{k.value}</p>
                    <p className="text-xs text-muted mt-0.5">{k.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                {/* Aportes mensais */}
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-border bg-surface-2">
                    <h2 className="text-sm font-semibold text-text-primary">Aportes mensais</h2>
                  </div>
                  <div className="p-5">
                    <div className="flex items-end gap-2 h-32">
                      {APORTES_MONTHS.map((m, i) => {
                        const h = (APORTES_VALUES[i] / Math.max(...APORTES_VALUES)) * 100;
                        const isLast = i === APORTES_MONTHS.length - 1;
                        return (
                          <div key={m} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex items-end justify-center" style={{ height: "100px" }}>
                              <div className={`w-full rounded-t-sm ${isLast ? "bg-primary" : "bg-primary/30"}`} style={{ height: `${h}%` }} />
                            </div>
                            <span className="text-[9px] text-muted">{m}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Alocação */}
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
              <div className="grid md:grid-cols-2 gap-5">
                <AssetTable title="Ações BR" count={BR_STOCKS.length}>
                  {BR_STOCKS.map((s) => (
                    <div key={s.symbol} className="flex items-center justify-between px-5 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-semibold text-text-primary w-14">{s.symbol}</span>
                        <span className="text-xs text-muted">{s.qty} cotas</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono text-text-primary">{formatCurrency(s.total, "BRL")}</div>
                        <div className="text-[10px] text-muted font-mono">@ {formatCurrency(s.price, "BRL")}</div>
                      </div>
                    </div>
                  ))}
                </AssetTable>
                <AssetTable title="Cripto" count={CRYPTO.length}>
                  {CRYPTO.map((s) => (
                    <div key={s.symbol} className="flex items-center justify-between px-5 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-semibold text-text-primary w-14">{s.symbol}</span>
                        <span className="text-xs text-muted">{s.qty} unid.</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono text-text-primary">{formatCurrency(s.total, "BRL")}</div>
                        <div className="text-[10px] text-muted font-mono">@ {formatCurrency(s.price, "BRL")}</div>
                      </div>
                    </div>
                  ))}
                </AssetTable>
                <AssetTable title="Renda Fixa" count={RF.length}>
                  {RF.map((r) => (
                    <div key={r.name} className="flex items-center justify-between px-5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-text-primary truncate">{r.name}</div>
                        <div className="text-[10px] text-muted font-mono">{r.index} {r.rate}%</div>
                      </div>
                      <div className="text-xs font-mono text-text-primary ml-4">{formatCurrency(r.value, "BRL")}</div>
                    </div>
                  ))}
                </AssetTable>
              </div>
            </div>
          )}

          {/* ── TAGS ──────────────────────────────────────────────────────── */}
          {tab === "tags" && (
            <div className="p-6 space-y-4 max-w-3xl">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-text-primary">Tags</h1>
                <span className="text-xs text-muted bg-surface border border-border rounded-lg px-3 py-1.5">
                  {TAG_TREE.length} famílias
                </span>
              </div>
              <p className="text-xs text-muted">Hierarquia: Família → Categoria → Tag (com tipo de transação)</p>

              <div className="space-y-2">
                {TAG_TREE.map((family) => {
                  const isFamilyOpen = expandedTagFamily === family.family;
                  const totalTags = family.categories.reduce((s, c) => s + c.tags.length, 0);
                  return (
                    <div key={family.family} className="bg-surface border border-border rounded-xl overflow-hidden">
                      {/* Family header */}
                      <button
                        onClick={() => setExpandedTagFamily(isFamilyOpen ? null : family.family)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted w-3">{isFamilyOpen ? "▼" : "▶"}</span>
                          <span className="text-sm font-semibold text-text-primary">{family.family}</span>
                          <span className="text-[10px] text-muted bg-surface-3 px-1.5 py-0.5 rounded font-mono">
                            {family.categories.length} cat · {totalTags} tags
                          </span>
                        </div>
                      </button>

                      {isFamilyOpen && (
                        <div className="border-t border-border divide-y divide-border/50">
                          {family.categories.map((cat) => {
                            const catKey = `${family.family}/${cat.name}`;
                            const isCatOpen = expandedTagCat === catKey;
                            return (
                              <div key={cat.name}>
                                {/* Category row */}
                                <button
                                  onClick={() => setExpandedTagCat(isCatOpen ? null : catKey)}
                                  className="w-full flex items-center justify-between px-4 py-2.5 pl-8 hover:bg-surface-2/60 transition-colors text-left"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-muted w-3">{isCatOpen ? "▼" : "▶"}</span>
                                    <span className="text-xs font-medium text-text-secondary">{cat.name}</span>
                                    <span className="text-[10px] text-muted">{cat.tags.length} tags</span>
                                  </div>
                                </button>

                                {/* Tags */}
                                {isCatOpen && (
                                  <div className="bg-surface-2/30 divide-y divide-border/30">
                                    {cat.tags.map((tag) => (
                                      <div key={tag.name} className="flex items-center justify-between px-4 py-2 pl-16">
                                        <div className="flex items-center gap-2">
                                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-muted shrink-0">
                                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                                            <circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" />
                                          </svg>
                                          <span className="text-xs text-text-primary">{tag.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                            tag.type === "income"
                                              ? "text-accent bg-accent/10 border-accent/30"
                                              : "text-danger bg-danger/10 border-danger/30"
                                          }`}>
                                            {tag.type === "income" ? "receita" : "gasto"}
                                          </span>
                                          <span className="w-1.5 h-1.5 rounded-full bg-accent/60" title="ativa" />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ── Footer CTA ────────────────────────────────────────────────────── */}
      <div className="border-t border-border bg-surface px-4 py-5 text-center shrink-0">
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

// ─── Helper ───────────────────────────────────────────────────────────────────

function AssetTable({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-surface-2 flex items-center gap-2">
        <span className="text-xs font-semibold text-text-primary">{title}</span>
        <span className="text-[10px] text-muted bg-surface-3 border border-border px-1.5 py-0.5 rounded">{count} ativos</span>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}
