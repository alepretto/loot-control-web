"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  accountsApi, budgetsApi, invoicesApi, netWorthApi, transactionsApi,
  tagFamiliesApi, tagsApi, categoriesApi, recurrencesApi, creditCardsApi,
  Account, BudgetProgress, Invoice, MonthlySummary, NetWorthSnapshot, Transaction,
  TagFamily, Tag, Category, RecurrenceRule, CreditCard,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const NATURE_LABELS: Record<string, { label: string; short: string; hue: number; color: string }> = {
  income:           { label: "Receita",       short: "REC", hue: 150, color: "#22c55e" },
  fixed_expense:    { label: "Custo Fixo",    short: "FIX", hue: 25,  color: "#f97316" },
  variable_expense: { label: "Custo Variável",short: "VAR", hue: 10,  color: "#ef4444" },
  investment:       { label: "Investimento",  short: "INV", hue: 220, color: "#2563eb" },
};

const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmtCompact(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e6) return `R$\u00a0${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1000) return `R$\u00a0${(abs / 1000).toFixed(1)}k`;
  return `R$\u00a0${abs.toFixed(0)}`;
}

function monthBounds(year: number, month: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return { date_from: `${year}-${pad(month)}-01`, date_to: `${year}-${pad(month)}-${pad(lastDay)}` };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCell({
  label, value, sub, color, big,
}: {
  label: string; value: string; sub?: string; color?: string; big?: boolean;
}) {
  return (
    <div className="bg-surface border-r border-border last:border-r-0 px-4 py-3.5 flex-1">
      <div className="text-[9px] font-semibold uppercase tracking-widest text-muted mb-1.5">{label}</div>
      <div className={`font-mono font-semibold ${big ? "text-[18px]" : "text-[15px]"}`} style={{ color: color ?? "inherit" }}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-muted mt-1 truncate">{sub}</div>}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface border border-border rounded-xl ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({
  title, sub, right,
}: {
  title: string; sub?: string; right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between px-4 py-3 border-b border-border">
      <div>
        <div className="text-[9px] font-semibold uppercase tracking-widest text-muted">{title}</div>
        {sub && <div className="text-[11px] text-muted mt-0.5">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

// ─── Mini line chart ──────────────────────────────────────────────────────────

function MiniChart({ data, color = "#2563eb" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const W = 300, H = 60, P = 4;
  const min = Math.min(...data) * 0.9;
  const max = Math.max(...data) * 1.05;
  const y = (v: number) => P + (H - 2 * P) - ((v - min) / (max - min)) * (H - 2 * P);
  const x = (i: number) => P + (i / (data.length - 1)) * (W - 2 * P);
  const path = data.map((v, i) => (i === 0 ? "M" : "L") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
  const area = path + ` L${x(data.length - 1).toFixed(1)} ${H} L${x(0).toFixed(1)} ${H} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block">
      <defs>
        <linearGradient id="mini-g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#mini-g)" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, max, height = 4 }: { value: number; max: number; height?: number }) {
  const pct = Math.min(1, Math.max(0, value / (max || 1)));
  const over = value > max;
  const color = over ? "#ef4444" : pct > 0.8 ? "#f97316" : "#2563eb";
  return (
    <div style={{ height, background: "#1C2330", borderRadius: 1, overflow: "hidden" }}>
      <div style={{ width: `${pct * 100}%`, height: "100%", background: color, transition: "width 200ms" }} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PainelPage() {
  const { convertToDisplay } = useSettings();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<BudgetProgress[]>([]);
  const [nwHistory, setNwHistory] = useState<NetWorthSnapshot[]>([]);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const [families, setFamilies] = useState<TagFamily[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [upcomingInvoices, setUpcomingInvoices] = useState<Invoice[]>([]);
  const [recurrences, setRecurrences] = useState<RecurrenceRule[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    const bounds = monthBounds(year, month);

    Promise.all([
      accountsApi.list({ is_active: true }).catch(() => []),
      budgetsApi.progress(monthStr).catch(() => []),
      netWorthApi.history(12).then(r => r.snapshots).catch(() => []),
      transactionsApi.list({ ...bounds, page_size: 50 }).catch(() => ({ items: [] })),
      tagFamiliesApi.list().catch(() => []),
      tagsApi.list().catch(() => []),
      categoriesApi.list().catch(() => []),
      invoicesApi.list({ status: "open" }).catch(() => []),
      recurrencesApi.list({ is_active: true }).catch(() => []),
      creditCardsApi.list({ is_active: true }).catch(() => []),
      transactionsApi.summary(monthStr).catch(() => null),
    ]).then(([accts, bdg, nw, txData, fams, tgs, cs, invs, recs, ccs, summ]) => {
      setAccounts(accts as Account[]);
      setBudgets(bdg as BudgetProgress[]);
      setNwHistory(nw as NetWorthSnapshot[]);
      setRecentTxs((txData as { items: Transaction[] }).items);
      setFamilies(fams as TagFamily[]);
      setTags(tgs as Tag[]);
      setCats(cs as Category[]);
      setUpcomingInvoices((invs as Invoice[]).slice(0, 5));
      setRecurrences(recs as RecurrenceRule[]);
      setCreditCards(ccs as CreditCard[]);
      setMonthlySummary(summ as MonthlySummary | null);
      setLoading(false);
    });
  }, [year, month]);

  // ── KPI calculation — from summary API ──────────────────────────────────────
  const natureTotals = {
    income:           monthlySummary?.total_income ?? 0,
    fixed_expense:    monthlySummary?.total_fixed_expense ?? 0,
    variable_expense: monthlySummary?.total_variable_expense ?? 0,
    investment:       monthlySummary?.total_investment ?? 0,
  };
  const balance = monthlySummary?.balance ?? 0;
  const savingsRate = monthlySummary?.saving_rate ?? 0;

  // ── Net worth ────────────────────────────────────────────────────────────────
  const lastNw = nwHistory[nwHistory.length - 1];
  const prevNw = nwHistory[nwHistory.length - 2];
  const nwDelta = lastNw && prevNw ? lastNw.net_worth - prevNw.net_worth : 0;
  const nwSparkData = nwHistory.map(r => r.net_worth);

  // ── Budget alerts ────────────────────────────────────────────────────────────
  const alertBudgets = [...budgets].sort((a, b) => b.usage_pct - a.usage_pct).filter(b => b.usage_pct >= 70);

  // ── Upcoming ─────────────────────────────────────────────────────────────────
  const upcomingItems: Array<{ id: string; label: string; date: string | null; amount: number; type: "invoice" | "recurrence" }> = [
    ...upcomingInvoices.map(inv => ({
      id: inv.id,
      label: `Fatura ${creditCards.find(cc => cc.id === inv.credit_card_id)?.name ?? "Cartão"}`,
      date: inv.due_date,
      amount: inv.total_amount,
      type: "invoice" as const,
    })),
    ...recurrences
      .filter(r => r.next_date)
      .map(r => ({
        id: r.id,
        label: r.name,
        date: r.next_date,
        amount: r.value,
        type: "recurrence" as const,
      })),
  ]
    .sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    })
    .slice(0, 5);

  // ── Non credit-card accounts ─────────────────────────────────────────────────
  const debitAccounts = accounts;

  if (loading) {
    return (
      <div className="px-4 md:px-6 py-5 space-y-5 animate-pulse">
        <div className="h-[72px] bg-surface border border-border rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-64 bg-surface border border-border rounded-xl" />
          <div className="space-y-4">
            <div className="h-32 bg-surface border border-border rounded-xl" />
            <div className="h-24 bg-surface border border-border rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-5 space-y-5">
      {/* ── KPI strip ──────────────────────────────────────────────── */}
      <div className="flex border border-border divide-x divide-border overflow-x-auto rounded-xl">
        <KpiCell
          label="Receita"
          value={fmtCompact(natureTotals.income)}
          color="#22c55e"
        />
        <KpiCell
          label="Custo Fixo"
          value={fmtCompact(natureTotals.fixed_expense)}
        />
        <KpiCell
          label="Custo Variável"
          value={fmtCompact(natureTotals.variable_expense)}
        />
        <KpiCell
          label="Investido"
          value={fmtCompact(natureTotals.investment)}
          color="#2563eb"
        />
        <KpiCell
          label="Saldo do mês"
          value={fmtCompact(balance)}
          sub={`Taxa de poupança ${(savingsRate * 100).toFixed(1)}%`}
          color={balance >= 0 ? "#22c55e" : "#ef4444"}
          big
        />
      </div>

      {/* ── Main grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">

        {/* Net Worth card */}
        {lastNw ? (
          <Card>
            <CardHeader
              title="Patrimônio Líquido"
              right={
                <Link href="/patrimonio" className="text-[11px] text-muted hover:text-text-primary flex items-center gap-1">
                  Ver detalhes
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M9 18l6-6-6-6" /></svg>
                </Link>
              }
            />
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-baseline gap-3">
                <span className="text-[28px] font-mono font-semibold">
                  {formatCurrency(lastNw.net_worth, "BRL")}
                </span>
                <span className={`text-[12px] font-mono font-medium ${nwDelta >= 0 ? "text-accent" : "text-danger"}`}>
                  {nwDelta >= 0 ? "+" : ""}{fmtCompact(nwDelta)}
                </span>
              </div>
              <div className="text-[10px] text-muted mt-1">vs. mês anterior · série 12m</div>
            </div>
            <div className="px-2 pb-2">
              <MiniChart data={nwSparkData} color="#2563eb" />
            </div>
            <div className="grid grid-cols-2 border-t border-border divide-x divide-border rounded-b-xl">
              <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-[9px] font-semibold uppercase tracking-widest text-muted">Ativos</span>
          </div>
                <div className="text-[16px] font-mono font-semibold">
                  {fmtCompact(lastNw.financial_assets + lastNw.investment_assets)}
                </div>
                <div className="text-[10px] text-muted mt-1 font-mono">
                  Fin {fmtCompact(lastNw.financial_assets)} · Inv {fmtCompact(lastNw.investment_assets)}
                </div>
              </div>
              <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
            <span className="text-[9px] font-semibold uppercase tracking-widest text-muted">Passivos</span>
          </div>
                <div className="text-[16px] font-mono font-semibold">
                  {fmtCompact(lastNw.liabilities_credit + lastNw.liabilities_long_term)}
                </div>
                <div className="text-[10px] text-muted mt-1 font-mono">
                  CC {fmtCompact(lastNw.liabilities_credit)} · LP {fmtCompact(lastNw.liabilities_long_term)}
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <CardHeader title="Patrimônio Líquido" />
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted">Configure suas contas para ver o patrimônio.</p>
            </div>
          </Card>
        )}

        {/* Right column */}
        <div className="space-y-4">

          {/* Budget alerts */}
          <Card>
            <CardHeader
              title="Orçamentos em alerta"
              sub={`${alertBudgets.length} de ${budgets.length} próximos do limite`}
              right={
                <Link href="/orcamentos" className="text-[11px] text-muted hover:text-text-primary flex items-center gap-1">
                  Ver
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M9 18l6-6-6-6" /></svg>
                </Link>
              }
            />
            {alertBudgets.length === 0 ? (
              <div className="px-4 py-4 text-[12px] text-muted">Nenhum orçamento em alerta.</div>
            ) : (
              alertBudgets.slice(0, 4).map(b => {
                const usagePct = b.usage_pct;
                const pctColor = usagePct >= 100 ? "#ef4444" : usagePct > 80 ? "#f97316" : "#7d8590";
                return (
                  <div key={b.budget_id} className="px-4 py-2.5 border-b border-border last:border-b-0">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-[12px] font-medium">{b.name}</span>
                      <span className="text-[11px] text-muted font-mono">
                        {fmtCompact(b.spent)} / {fmtCompact(b.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1"><ProgressBar value={b.spent} max={b.amount} /></div>
                      <span className="text-[10px] font-mono font-semibold w-9 text-right" style={{ color: pctColor }}>
                        {usagePct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </Card>

          {/* Upcoming */}
          <Card>
            <CardHeader title="Próximos a vencer" />
            {upcomingItems.length === 0 ? (
              <div className="px-4 py-4 text-[12px] text-muted">Sem vencimentos próximos.</div>
            ) : (
              upcomingItems.map(u => (
                <div key={u.id} className="px-4 py-2.5 flex items-center justify-between border-b border-border last:border-b-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-surface-2 flex items-center justify-center"
                      style={{ color: u.type === "invoice" ? "#f97316" : "#2563eb" }}>
                      {u.type === "invoice" ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5"><path d="M2 8h20M2 14h20M4 5h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2z" /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                      )}
                    </div>
                    <div>
                      <div className="text-[12px] font-medium">{u.label}</div>
                      {u.date && (
                        <div className="text-[10px] text-muted font-mono">
                          {new Date(u.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[12px] font-mono font-medium text-danger">
                    -{fmtCompact(u.amount)}
                  </span>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>

      {/* ── Bottom row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">

        {/* Recent transactions */}
        <Card>
          <CardHeader
            title="Lançamentos recentes"
            right={
              <Link href="/transactions" className="text-[11px] text-muted hover:text-text-primary flex items-center gap-1">
                Ver todos
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M9 18l6-6-6-6" /></svg>
              </Link>
            }
          />
          {recentTxs.length === 0 ? (
            <div className="px-4 py-6 text-[12px] text-muted text-center">Nenhum lançamento este mês.</div>
          ) : (
            recentTxs.map(tx => {
              const tag = tags.find(t => t.id === tx.tag_id);
              const cat = cats.find(c => c.id === tag?.category_id);
              const fam = families.find(f => f.id === cat?.family_id);
              const nature = fam?.nature ?? "variable_expense";
              const natInfo = NATURE_LABELS[nature];
              const val = convertToDisplay(tx.value, tx.currency);
              const isIncome = nature === "income";
              return (
                <div key={tx.id} className="px-4 py-2 flex items-center gap-3 border-b border-border last:border-b-0 text-[12px]">
                  <span className="text-[10px] font-mono text-muted w-12 shrink-0">
                    {new Date(tx.date_transaction).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </span>
                  <span className="flex-1 truncate text-text-secondary">
                    {tx.description ?? tag?.name ?? "—"}
                  </span>
                  <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 font-mono shrink-0"
                    style={{
                      background: `oklch(0.26 0.06 ${natInfo.hue} / 0.7)`,
                      color: `oklch(0.88 0.12 ${natInfo.hue})`,
                      border: `1px solid oklch(0.42 0.12 ${natInfo.hue} / 0.4)`,
                    }}>
                    {natInfo.short}
                  </span>
                  <span className={`font-mono font-medium shrink-0 ${isIncome ? "text-accent" : "text-text-primary"}`}>
                    {isIncome ? "+" : "-"}{fmtCompact(val)}
                  </span>
                </div>
              );
            })
          )}
        </Card>

        {/* Accounts */}
        <Card>
          <CardHeader
            title="Contas"
            right={
              <Link href="/contas" className="text-[11px] text-muted hover:text-text-primary flex items-center gap-1">
                Gerenciar
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M9 18l6-6-6-6" /></svg>
              </Link>
            }
          />
          {debitAccounts.length === 0 ? (
            <div className="px-4 py-6 text-[12px] text-muted text-center">Nenhuma conta cadastrada.</div>
          ) : (
            debitAccounts.map(a => {
              const typeColors: Record<string, string> = {
                checking: "#2563eb", savings: "#22c55e", broker: "#f59e0b",
                digital: "#8b5cf6", other: "#7d8590",
              };
              const color = typeColors[a.type] ?? "#7d8590";
              const balance = a.balance ?? a.manual_balance ?? 0;
              return (
                <div key={a.id} className="px-4 py-2.5 flex items-center justify-between border-b border-border last:border-b-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1 h-7 shrink-0" style={{ background: color }} />
                    <div>
                      <div className="text-[12px] font-medium">{a.name}</div>
                      <div className="text-[10px] text-muted font-mono uppercase tracking-wide">
                        {a.type.replace("_", " ")} · {a.currency}
                      </div>
                    </div>
                  </div>
                  <span className="text-[13px] font-mono font-medium">
                    {formatCurrency(balance, a.currency)}
                  </span>
                </div>
              );
            })
          )}
        </Card>
      </div>
    </div>
  );
}
