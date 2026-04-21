"use client";

import { useEffect, useState } from "react";
import { accountsApi, liabilitiesApi, netWorthApi, creditCardsApi, invoicesApi, Account, Liability, NetWorthSnapshot, CreditCard, Invoice } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

function fmtCompact(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1e6) return `R$\u00a0${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1000) return `R$\u00a0${(abs / 1000).toFixed(1)}k`;
  return `R$\u00a0${abs.toFixed(0)}`;
}

function fmtMonth(iso: string) {
  const [y, m] = iso.split("-");
  const months = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  return `${months[+m - 1]}/${y.slice(2)}`;
}

// ─── Stacked area chart ───────────────────────────────────────────────────────

function StackedChart({ data }: { data: NetWorthSnapshot[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length < 2) return <div className="h-48 flex items-center justify-center text-sm text-muted">Sem histórico suficiente.</div>;

  const W = 1000, H = 240, P = { l: 52, r: 12, t: 20, b: 28 };
  const iw = W - P.l - P.r, ih = H - P.t - P.b;

  const maxA = Math.max(...data.map(r => r.financial_assets + r.investment_assets));
  const maxL = Math.max(...data.map(r => r.liabilities_credit + r.liabilities_long_term));
  const maxAll = Math.max(maxA, maxL) * 1.1 || 1;
  const mid = P.t + ih / 2;

  const yUp = (v: number) => mid - (v / maxAll) * (ih / 2);
  const yDn = (v: number) => mid + (v / maxAll) * (ih / 2);
  const x = (i: number) => P.l + (i / (data.length - 1)) * iw;

  const finTop = data.map((r, i) => [x(i), yUp(r.financial_assets)]);
  const invTop = data.map((r, i) => [x(i), yUp(r.financial_assets + r.investment_assets)]);
  const ccTop = data.map((r, i) => [x(i), yDn(r.liabilities_credit)]);
  const ltTop = data.map((r, i) => [x(i), yDn(r.liabilities_credit + r.liabilities_long_term)]);

  const nwPath = data.map((r, i) => {
    const ny = mid - (r.net_worth / maxAll) * (ih / 2);
    return (i === 0 ? "M" : "L") + x(i).toFixed(1) + " " + ny.toFixed(1);
  }).join(" ");

  const toArea = (top: number[][], baseY: number) => {
    const up = top.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    return up + ` L${x(data.length - 1).toFixed(1)} ${baseY} L${x(0).toFixed(1)} ${baseY} Z`;
  };
  const areaBetween = (top: number[][], bottom: number[][]) => {
    const up = top.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const dn = bottom.slice().reverse().map(p => "L" + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    return up + " " + dn + " Z";
  };

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block" onMouseLeave={() => setHover(null)}>
      {/* Mid line */}
      <line x1={P.l} x2={W - P.r} y1={mid} y2={mid} stroke="#20282F" strokeWidth="1" />
      {/* Areas */}
      <path d={toArea(finTop, mid)} fill="oklch(0.7 0.12 220 / 0.35)" />
      <path d={areaBetween(invTop, finTop)} fill="oklch(0.7 0.12 50 / 0.3)" />
      <path d={toArea(ccTop, mid)} fill="oklch(0.68 0.18 10 / 0.3)" />
      <path d={areaBetween(ltTop, ccTop)} fill="oklch(0.55 0.16 290 / 0.32)" />
      {/* NW line */}
      <path d={nwPath} fill="none" stroke="#2563eb" strokeWidth="2" />
      {/* X labels */}
      {data.map((r, i) => (
        <text key={i} x={x(i)} y={H - 6} fontSize="9" fill="#7d8590" textAnchor="middle" fontFamily="monospace">
          {fmtMonth(r.date)}
        </text>
      ))}
      {/* Y axis */}
      {[-0.75, -0.25, 0.25, 0.75].map((f, i) => {
        const yl = mid - f * (ih / 2);
        return (
          <g key={i}>
            <line x1={P.l} x2={W - P.r} y1={yl} y2={yl} stroke="#20282F" strokeWidth="0.5" strokeDasharray="2,3" />
            <text x={P.l - 6} y={yl + 3} fontSize="9" fill="#7d8590" textAnchor="end" fontFamily="monospace">
              {((f * maxAll) / 1000).toFixed(0)}k
            </text>
          </g>
        );
      })}
      {/* Hover zone */}
      {data.map((_, i) => (
        <rect key={i} x={x(i) - iw / (data.length * 2)} y={P.t} width={iw / data.length} height={ih}
          fill="transparent" onMouseEnter={() => setHover(i)} />
      ))}
      {hover != null && (
        <g>
          <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={P.t + ih} stroke="#2563eb" strokeDasharray="2,3" opacity="0.6" />
          <g transform={`translate(${x(hover) + (hover > data.length / 2 ? -185 : 10)}, ${P.t + 8})`}>
            <rect width="178" height="108" fill="#0E1218" stroke="#20282F" />
            <text x="10" y="16" fontSize="10" fill="#7d8590" fontFamily="monospace">{fmtMonth(data[hover].date)}</text>
            <text x="10" y="34" fontSize="13" fontWeight="600" fill="#2563eb" fontFamily="monospace">
              PL {fmtCompact(data[hover].net_worth)}
            </text>
            <text x="10" y="52" fontSize="10" fill="#22c55e" fontFamily="monospace">
              Ativos {fmtCompact(data[hover].financial_assets + data[hover].investment_assets)}
            </text>
            <text x="10" y="66" fontSize="9" fill="#7d8590" fontFamily="monospace">
              Fin {fmtCompact(data[hover].financial_assets)} · Inv {fmtCompact(data[hover].investment_assets)}
            </text>
            <text x="10" y="84" fontSize="10" fill="#ef4444" fontFamily="monospace">
              Passivos {fmtCompact(data[hover].liabilities_credit + data[hover].liabilities_long_term)}
            </text>
            <text x="10" y="98" fontSize="9" fill="#7d8590" fontFamily="monospace">
              CC {fmtCompact(data[hover].liabilities_credit)} · LP {fmtCompact(data[hover].liabilities_long_term)}
            </text>
          </g>
        </g>
      )}
      {/* Legend */}
      <g transform={`translate(${P.l}, 6)`}>
        {([
          ["Patrimônio Líquido", "#2563eb", "line"],
          ["Financeiro", "oklch(0.7 0.12 220)", "box"],
          ["Investimentos", "oklch(0.7 0.12 50)", "box"],
          ["Cartões", "oklch(0.68 0.18 10)", "box"],
          ["Longo prazo", "oklch(0.55 0.16 290)", "box"],
        ] as [string, string, string][]).map(([l, c, k], i) => (
          <g key={i} transform={`translate(${i * 130}, 0)`}>
            {k === "line"
              ? <line x1="0" x2="14" y1="4" y2="4" stroke={c} strokeWidth="2" />
              : <rect x="0" y="0" width="10" height="8" fill={c} opacity="0.6" />}
            <text x="18" y="8" fontSize="9" fill="#7d8590">{l}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

// ─── Breakdown row ────────────────────────────────────────────────────────────

function BreakdownRow({
  label, inst, value, total, hue, sub, nob,
}: {
  label: string; inst?: string; value: number; total: number; hue?: number; sub?: boolean; nob?: boolean;
}) {
  const pct = total > 0 ? value / total : 0;
  return (
    <div className={`flex items-center gap-3 ${sub ? "px-4 py-1.5 pl-7" : "px-4 py-3"} ${nob ? "" : "border-b border-border"} ${sub ? "" : "bg-surface-3/30"}`}>
      {!sub && hue && <div className="w-1 h-5 shrink-0 rounded-sm" style={{ background: `oklch(0.7 0.12 ${hue})` }} />}
      <div className="flex-1 min-w-0">
        <div className={`${sub ? "text-[11px]" : "text-[12px] font-semibold"} truncate`}>{label}</div>
        {inst && <div className="text-[10px] text-muted">{inst}</div>}
      </div>
      <div className="w-16">
        <div className="h-1 bg-surface-3 overflow-hidden">
          <div className="h-full bg-primary/60" style={{ width: `${Math.min(100, pct * 100)}%` }} />
        </div>
      </div>
      <span className="text-[10px] text-muted font-mono w-8 text-right">{(pct * 100).toFixed(0)}%</span>
      <span className={`font-mono ${sub ? "text-[11px]" : "text-[13px] font-semibold"} w-28 text-right`}>
        {formatCurrency(value, "BRL")}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PatrimonioPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [nwHistory, setNwHistory] = useState<NetWorthSnapshot[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      accountsApi.list({ is_active: true }).catch(() => []),
      liabilitiesApi.list({ is_active: true }).catch(() => []),
      netWorthApi.history(12).then(r => r.snapshots).catch(() => []),
      creditCardsApi.list({ is_active: true }).catch(() => []),
      invoicesApi.list().catch(() => []),
    ]).then(([accts, liabs, nw, ccs, invs]) => {
      setAccounts(accts as Account[]);
      setLiabilities(liabs as Liability[]);
      setNwHistory(nw as NetWorthSnapshot[]);
      setCreditCards(ccs as CreditCard[]);
      setInvoices(invs as Invoice[]);
      setLoading(false);
    });
  }, []);

  const last = nwHistory[nwHistory.length - 1];
  const prev = nwHistory[nwHistory.length - 2];
  const first = nwHistory[0];
  const delta = last && prev ? last.net_worth - prev.net_worth : 0;
  const yearDelta = last && first ? last.net_worth - first.net_worth : 0;
  const yearPct = first && first.net_worth > 0 ? yearDelta / first.net_worth : 0;

  const debitAccounts = accounts;
  const brokerAccounts = accounts.filter(a => a.type === "broker");

  // Calculate real-time unpaid invoices total (open + closed, not paid)
  const unpaidInvoices = invoices.filter(i => i.status === "open" || i.status === "closed");
  const totalUnpaidInvoices = unpaidInvoices.reduce((sum, i) => sum + i.total_amount, 0);
  const openInvoicesCount = invoices.filter(i => i.status === "open").length;

  const totalAssets = last ? last.financial_assets + last.investment_assets : 0;
  const totalLiab = last ? totalUnpaidInvoices + last.liabilities_long_term : 0;

  if (loading) {
    return (
      <div className="px-4 md:px-6 py-5 space-y-5 animate-pulse">
        <div className="h-24 bg-surface border border-border rounded-xl" />
        <div className="h-52 bg-surface border border-border rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48 bg-surface border border-border rounded-xl" />
          <div className="h-48 bg-surface border border-border rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-5 space-y-5">
      <h1 className="text-lg font-semibold text-text-primary">Patrimônio</h1>

      {/* Hero */}
      <div className="bg-surface border border-border rounded-xl">
        <div className="flex items-start justify-between px-5 py-4 border-b border-border">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-widest text-muted mb-2">Patrimônio Líquido</div>
            <div className="text-[40px] font-mono font-semibold leading-none">
              {last ? formatCurrency(last.net_worth, "BRL") : "—"}
            </div>
            <div className="flex gap-4 mt-2">
              <span className="text-[11px] text-muted font-mono">
                vs. mês ant.{" "}
                <span className={delta >= 0 ? "text-accent" : "text-danger"}>
                  {delta >= 0 ? "+" : ""}{fmtCompact(delta)}
                </span>
              </span>
              <span className="text-[11px] text-muted font-mono">
                12m{" "}
                <span className={yearDelta >= 0 ? "text-accent" : "text-danger"}>
                  {yearDelta >= 0 ? "+" : ""}{fmtCompact(yearDelta)} ({yearPct >= 0 ? "+" : ""}{(yearPct * 100).toFixed(1)}%)
                </span>
              </span>
            </div>
          </div>
        </div>
        <div className="px-3 py-3">
          <StackedChart data={nwHistory} />
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Assets */}
        <div className="bg-surface border border-border rounded-xl">
          <div className="flex items-baseline justify-between px-4 py-3 border-b border-border">
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-widest text-muted mb-1">Ativos</div>
              <div className="text-[20px] font-mono font-semibold">{fmtCompact(totalAssets)}</div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 font-mono"
              style={{ background: "oklch(0.26 0.06 150 / 0.7)", color: "oklch(0.88 0.12 150)", border: "1px solid oklch(0.42 0.12 150 / 0.4)" }}>
              {totalAssets + totalLiab > 0 ? ((totalAssets / (totalAssets + totalLiab)) * 100).toFixed(0) : 0}%
            </span>
          </div>

          <BreakdownRow label="Contas financeiras" value={last?.financial_assets ?? 0} total={totalAssets} hue={220} />
          {debitAccounts.map(a => (
            <BreakdownRow key={a.id} sub label={a.name} inst={a.institution ?? undefined} value={a.balance ?? a.manual_balance ?? 0} total={last?.financial_assets ?? 1} />
          ))}

          <BreakdownRow label="Carteira de investimentos" value={last?.investment_assets ?? 0} total={totalAssets} hue={50} />
          {brokerAccounts.map(a => (
            <BreakdownRow key={a.id} sub label={a.name} inst={a.institution ?? undefined} value={a.balance ?? a.manual_balance ?? 0} total={last?.investment_assets ?? 1} nob />
          ))}
        </div>

        {/* Liabilities */}
        <div className="bg-surface border border-border rounded-xl">
          <div className="flex items-baseline justify-between px-4 py-3 border-b border-border">
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-widest text-muted mb-1">Passivos</div>
              <div className="text-[20px] font-mono font-semibold">{fmtCompact(totalLiab)}</div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 font-mono"
              style={{ background: "oklch(0.26 0.06 25 / 0.7)", color: "oklch(0.88 0.12 25)", border: "1px solid oklch(0.42 0.12 25 / 0.4)" }}>
              {totalAssets + totalLiab > 0 ? ((totalLiab / (totalAssets + totalLiab)) * 100).toFixed(0) : 0}%
            </span>
          </div>

          <BreakdownRow label="Faturas de cartão (não pagas)" value={totalUnpaidInvoices} total={totalLiab} hue={10} />
          {unpaidInvoices.length > 0 ? (
            unpaidInvoices.slice(0, 5).map(inv => {
              const cc = creditCards.find(c => c.id === inv.credit_card_id);
              return (
                <BreakdownRow 
                  key={inv.id} 
                  sub 
                  label={`${cc?.name ?? "Cartão"} - ${inv.reference_month}`} 
                  value={inv.total_amount} 
                  total={totalUnpaidInvoices || 1} 
                />
              );
            })
          ) : (
            <div className="px-4 py-2 text-[11px] text-muted">Nenhuma fatura pendente.</div>
          )}
          {unpaidInvoices.length > 5 && (
            <div className="px-4 py-2 text-[11px] text-primary">
              <a href="/faturas" className="hover:underline">+ {unpaidInvoices.length - 5} faturas não pagas</a>
            </div>
          )}

          <BreakdownRow label="Passivos de longo prazo" value={last?.liabilities_long_term ?? 0} total={totalLiab} hue={280} />
          {liabilities.map(l => (
            <BreakdownRow key={l.id} sub label={l.name} inst={l.institution ?? undefined} value={l.outstanding_balance} total={last?.liabilities_long_term ?? 1}
              nob />
          ))}
          {liabilities.length === 0 && (
            <div className="px-4 py-4 text-[12px] text-muted">Nenhum passivo cadastrado.</div>
          )}
        </div>
      </div>
    </div>
  );
}
