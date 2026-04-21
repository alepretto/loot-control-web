"use client";

import { useState } from "react";
import { Transaction, Category, Tag, TagFamily, Account, PaymentMethod, CreditCard, Invoice } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

interface Props {
  transaction: Transaction;
  families: TagFamily[];
  categories: Category[];
  tags: Tag[];
  accounts?: Account[];
  paymentMethods?: PaymentMethod[];
  creditCards?: CreditCard[];
  invoices?: Invoice[];
  grouped?: boolean;
  onUpdated: () => void;
  onDeleted: () => void;
  onEditRequest?: () => void;
}

const MONTHS_PT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

function localTime(dateStr: string, tz: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(dateStr));
}

function localDate(dateStr: string, tz: string) {
  const d = new Date(dateStr);
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    day: "2-digit", month: "numeric",
  }).formatToParts(d);
  const day = parts.find(p => p.type === "day")?.value ?? "";
  const month = parseInt(parts.find(p => p.type === "month")?.value ?? "1") - 1;
  return `${day} ${MONTHS_PT[month]}`;
}

// Layout tabela tradicional: Data | Nature | Descrição | Taxonomia | Conta/Método | Valor | Ações
export const TX_GRID = "grid-cols-[100px_85px_minmax(180px,1.2fr)_minmax(120px,1fr)_minmax(140px,1fr)_110px_44px]";

const NATURE_INFO: Record<string, { color: string; label: string; short: string }> = {
  income: { color: "#22c55e", label: "Receita", short: "REC" },
  fixed_expense: { color: "#f97316", label: "Custo Fixo", short: "FIX" },
  variable_expense: { color: "#ef4444", label: "Custo Variável", short: "VAR" },
  investment: { color: "#2563eb", label: "Investimento", short: "INV" },
};

const PM_TYPE_LABELS: Record<string, string> = {
  debit: "Débito",
  credit: "Crédito",
  benefit: "Benefício",
};

export function TransactionRow({
  transaction, families, categories, tags, accounts = [], paymentMethods = [], creditCards = [], invoices = [],
  grouped = false, onUpdated, onDeleted, onEditRequest,
}: Props) {
  const { timezone, displayCurrency, fmtDisplay } = useSettings();
  const [pendingDelete, setPendingDelete] = useState(false);

  const tag      = tags.find(t => t.id === transaction.tag_id);
  const category = categories.find(c => c.id === tag?.category_id);
  const family   = families.find(f => f.id === category?.family_id);
  const isIncome = family?.nature === "income";
  const nature = family?.nature ?? "unknown";
  const natureInfo = NATURE_INFO[nature] ?? NATURE_INFO.variable_expense;
  const account = transaction.account_id ? accounts.find(acc => acc.id === transaction.account_id) : null;

  const pm = account?.id
    ? paymentMethods.find(p => p.account_id === account.id && p.is_active)
    : null;

  const breadcrumb = [family?.name, category?.name].filter(Boolean).join(" › ");
  const timeStr = grouped
    ? localTime(transaction.date_transaction, timezone)
    : localDate(transaction.date_transaction, timezone);

  // Valor com sinal explícito e cor por natureza
  const sign = isIncome ? "+" : "−";
  const nativeValue = `${sign}${formatCurrency(transaction.value, transaction.currency)}`;
  const convertedValue = transaction.currency !== displayCurrency
    ? `≈ ${fmtDisplay(transaction.value, transaction.currency)}`
    : null;
  
  // Cor do valor baseada na natureza
  const valueColor = nature === "income" 
    ? "#22c55e" 
    : nature === "investment" 
    ? "#2563eb" 
    : "#ef4444";
  
  // Resolver cartão de crédito a partir do invoice_id
  const invoice = transaction.invoice_id 
    ? invoices.find(inv => inv.id === transaction.invoice_id) 
    : null;
  const creditCard = invoice?.credit_card_id 
    ? creditCards.find(cc => cc.id === invoice.credit_card_id) 
    : null;

  const investBadge = transaction.symbol
    ? `${transaction.symbol}${transaction.quantity != null ? ` · ${transaction.quantity}` : ""}`
    : transaction.index
    ? `${transaction.index}${transaction.index_rate != null ? ` ${transaction.index_rate}%` : ""}`
    : null;

  async function handleDelete() {
    if (!pendingDelete) { setPendingDelete(true); return; }
    const { transactionsApi } = await import("@/lib/api");
    await transactionsApi.delete(transaction.id);
    onDeleted();
  }

  return (
    <>
      {/* ─── Mobile ────────────────────────────────────────────── */}
      <div
        onClick={() => onEditRequest?.()}
        className="md:hidden flex items-start gap-3 px-4 py-3.5 border-b border-border/60 active:bg-surface-2 transition-colors cursor-pointer"
      >
        <div className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: natureInfo.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-text-primary truncate">{tag?.name ?? "—"}</span>
            <span className="text-sm font-mono font-semibold tabular-nums shrink-0" style={{ color: isIncome ? "#22c55e" : "var(--text-primary)" }}>
              {nativeValue}
            </span>
          </div>
          {transaction.description && <div className="text-xs text-muted truncate mt-0.5">{transaction.description}</div>}
          <div className="flex items-center gap-2 text-xs text-muted mt-1">
            {breadcrumb && <span>{breadcrumb}</span>}
            {account && <span>· {account.name}</span>}
          </div>
        </div>
      </div>

      {/* ─── Desktop ───────────────────────────────────────────── */}
      <div
        onClick={() => onEditRequest?.()}
        className={`hidden md:grid ${TX_GRID} items-center py-1.5 hover:bg-surface-2/60 transition-colors cursor-pointer group`}
      >
        {/* Data — compacta */}
        <div className="pl-4 pr-2 py-1">
          <span className="text-[12px] font-mono text-text-secondary tabular-nums">{timeStr}</span>
        </div>

        {/* Natureza — badge compacto */}
        <div className="px-1 py-1 flex items-center">
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded border shrink-0"
            style={{ backgroundColor: `${natureInfo.color}15`, borderColor: `${natureInfo.color}30`, color: natureInfo.color }}
          >
            {natureInfo.label}
          </span>
        </div>

        {/* Descrição — mais compacto */}
        <div className="min-w-0 pr-3 py-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-text-primary truncate">{tag?.name ?? category?.name ?? "—"}</span>
            {investBadge && (
              <span className="shrink-0 text-[9px] font-mono bg-surface-3 border border-border px-1 py-0 rounded text-muted">
                {investBadge}
              </span>
            )}
          </div>
          {transaction.description && (
            <div className="text-[10px] text-muted truncate">{transaction.description}</div>
          )}
        </div>

        {/* Taxonomia */}
        <div className="min-w-0 pr-3 py-1 flex items-center">
          {family ? (
            <span className="text-[11px] text-muted truncate">
              {family.name}
              {category && <> · {category.name}</>}
            </span>
          ) : (
            <span className="text-[11px] text-muted">—</span>
          )}
        </div>

        {/* Conta · Método */}
        <div className="min-w-0 pr-3 py-1 flex items-center">
          {account ? (
            <span className="text-[12px] text-text-secondary truncate">
              {account.name}
              {pm && <> <span className="text-muted">·</span> <span className="text-[10px]">{PM_TYPE_LABELS[pm.type] ?? pm.type}</span></>}
              {creditCard && <> <span className="text-muted">·</span> <span className="text-[10px]">{creditCard.name}</span></>}
            </span>
          ) : (
            <span className="text-[12px] text-muted">—</span>
          )}
        </div>

        {/* Valor */}
        <div className="pr-2 py-1 text-right">
          <div className="text-[13px] font-mono font-medium tabular-nums" style={{ color: valueColor }}>
            {nativeValue}
          </div>
          {convertedValue && (
            <div className="text-[9px] text-muted text-right font-mono tabular-nums">{convertedValue}</div>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center justify-center py-1 pr-2">
          <div className="relative group/actions">
            <button 
              onClick={e => { e.stopPropagation(); }}
              className="p-1 rounded hover:bg-surface-3 text-muted transition-colors"
              title="Ações"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <circle cx="12" cy="6" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="18" r="1.5" />
              </svg>
            </button>
            <div className="absolute right-0 top-full mt-1 w-28 bg-surface border border-border rounded-lg shadow-lg opacity-0 invisible group-hover/actions:opacity-100 group-hover/actions:visible transition-all z-10">
              <button 
                onClick={e => { e.stopPropagation(); onEditRequest?.(); }}
                className="w-full px-2.5 py-1.5 text-left text-[11px] text-text-primary hover:bg-surface-3 first:rounded-t-lg transition-colors flex items-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Editar
              </button>
              <button 
                onClick={e => { e.stopPropagation(); handleDelete(); }}
                className={`w-full px-2.5 py-1.5 text-left text-[11px] last:rounded-b-lg transition-colors flex items-center gap-1.5 ${
                  pendingDelete ? "bg-danger/15 text-danger" : "text-danger hover:bg-danger/10"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
                {pendingDelete ? "Confirmar" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
