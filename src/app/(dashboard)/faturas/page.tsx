"use client";

import { useEffect, useState } from "react";
import {
  invoicesApi, creditCardsApi, accountsApi,
  Invoice, InvoiceStatus, CreditCard, Account,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

// ─── Icons ────────────────────────────────────────────────────────────────────

const CreditCardIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const CheckIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ChevronDown = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const ChevronRight = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const CalendarIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const MoneyIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const config = {
    open: { label: "Aberta", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
    closed: { label: "Fechada", className: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
    paid: { label: "Paga", className: "bg-green-500/15 text-green-500 border-green-500/30" },
  };
  const { label, className } = config[status];
  return (
    <span className={`px-2 py-0.5 text-[10px] font-medium rounded border ${className}`}>
      {label}
    </span>
  );
}

// ─── Invoice Card ─────────────────────────────────────────────────────────────

function InvoiceCard({
  invoice,
  creditCard,
  isExpanded,
  onToggle,
  onPay,
  accounts,
  paying,
}: {
  invoice: Invoice;
  creditCard: CreditCard | undefined;
  isExpanded: boolean;
  onToggle: () => void;
  onPay: (accountId: string) => void;
  accounts: Account[];
  paying: boolean;
}) {
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>("");

  const isPaid = invoice.status === "paid";
  const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && !isPaid;

  const handlePay = () => {
    if (selectedAccount) {
      onPay(selectedAccount);
      setShowPayModal(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-surface-2/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span className="text-muted transition-transform duration-200">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
          <div className="flex items-center gap-2">
            <CreditCardIcon className="w-4 h-4 text-muted" />
            <span className="text-sm font-medium">{creditCard?.name ?? "Cartão"}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={invoice.status} />
          <span className={`text-sm font-mono font-semibold ${isOverdue ? "text-danger" : ""}`}>
            {formatCurrency(invoice.total_amount, "BRL")}
          </span>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {/* Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted text-xs block mb-1">Mês de Referência</span>
              <span className="font-medium">{invoice.reference_month}</span>
            </div>
            <div>
              <span className="text-muted text-xs block mb-1">Vencimento</span>
              <span className={`font-medium ${isOverdue ? "text-danger" : ""}`}>
                {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("pt-BR") : "—"}
                {isOverdue && " (Vencida)"}
              </span>
            </div>
            <div>
              <span className="text-muted text-xs block mb-1">Fechamento</span>
              <span className="font-medium">
                {invoice.closing_date ? new Date(invoice.closing_date).toLocaleDateString("pt-BR") : "—"}
              </span>
            </div>
            {invoice.paid_at && (
              <div>
                <span className="text-muted text-xs block mb-1">Paga em</span>
                <span className="font-medium text-accent">
                  {new Date(invoice.paid_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          {!isPaid && (
            <div className="pt-2 border-t border-border">
              {!showPayModal ? (
                <button
                  onClick={() => setShowPayModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-accent/15 text-accent border border-accent/30 rounded-lg text-xs font-medium hover:bg-accent/25 transition-colors"
                >
                  <CheckIcon className="w-3.5 h-3.5" />
                  Marcar como Paga
                </button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted block mb-1.5">Conta para débito</label>
                    <select
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                      className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/60"
                    >
                      <option value="">Selecione uma conta...</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatCurrency(acc.balance ?? 0, acc.currency)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPayModal(false)}
                      className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-xs font-medium text-muted hover:text-text-primary transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handlePay}
                      disabled={!selectedAccount || paying}
                      className="flex-1 px-3 py-2 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
                    >
                      {paying ? "Processando..." : "Confirmar Pagamento"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FaturasPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "closed" | "paid">("all");

  useEffect(() => {
    Promise.all([
      invoicesApi.list().catch(() => []),
      creditCardsApi.list({ is_active: true }).catch(() => []),
      accountsApi.list({ is_active: true }).catch(() => []),
    ]).then(([invs, ccs, accs]) => {
      setInvoices(invs as Invoice[]);
      setCreditCards(ccs as CreditCard[]);
      setAccounts(accs as Account[]);
      setLoading(false);
    });
  }, []);

  const handlePay = async (invoiceId: string, accountId: string) => {
    setPayingId(invoiceId);
    try {
      await invoicesApi.pay(invoiceId, { payment_account_id: accountId });
      // Refresh invoices after payment
      const updated = await invoicesApi.list();
      setInvoices(updated);
    } catch (error) {
      alert("Erro ao processar pagamento. Tente novamente.");
    } finally {
      setPayingId(null);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (filter === "all") return true;
    return inv.status === filter;
  });

  // Sort by due date (most recent first for open, oldest first for paid)
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    if (a.status === "open" && b.status !== "open") return -1;
    if (b.status === "open" && a.status !== "open") return 1;
    return (b.due_date ?? "").localeCompare(a.due_date ?? "");
  });

  // Group by credit card
  const invoicesByCard = sortedInvoices.reduce((acc, inv) => {
    const cardId = inv.credit_card_id;
    if (!acc[cardId]) acc[cardId] = [];
    acc[cardId].push(inv);
    return acc;
  }, {} as Record<string, Invoice[]>);

  // Summary calculations
  const totalOpen = invoices
    .filter((i) => i.status === "open")
    .reduce((sum, i) => sum + i.total_amount, 0);
  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.total_amount, 0);
  const totalUnpaid = invoices
    .filter((i) => i.status === "open" || i.status === "closed")
    .reduce((sum, i) => sum + i.total_amount, 0);

  if (loading) {
    return (
      <div className="px-4 md:px-6 py-5 space-y-5 animate-pulse">
        <div className="h-24 bg-surface border border-border rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-surface border border-border rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-5 space-y-5">
      <h1 className="text-lg font-semibold text-text-primary">Faturas</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted text-xs uppercase tracking-wider mb-2">
            <CalendarIcon className="w-3.5 h-3.5" />
            Faturas Abertas
          </div>
          <div className="text-2xl font-mono font-semibold text-amber-500">
            {formatCurrency(totalOpen, "BRL")}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted text-xs uppercase tracking-wider mb-2">
            <MoneyIcon className="w-3.5 h-3.5" />
            Total Não Pago
          </div>
          <div className="text-2xl font-mono font-semibold text-danger">
            {formatCurrency(totalUnpaid, "BRL")}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted text-xs uppercase tracking-wider mb-2">
            <CheckIcon className="w-3.5 h-3.5" />
            Total Pago (mês)
          </div>
          <div className="text-2xl font-mono font-semibold text-green-500">
            {formatCurrency(totalPaid, "BRL")}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: "all", label: "Todas" },
          { key: "open", label: "Abertas" },
          { key: "closed", label: "Fechadas" },
          { key: "paid", label: "Pagas" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              filter === f.key
                ? "bg-primary text-white"
                : "bg-surface border border-border text-muted hover:text-text-primary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Invoices List */}
      <div className="space-y-3">
        {sortedInvoices.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <CreditCardIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma fatura encontrada.</p>
            <p className="text-xs mt-1">
              As faturas são criadas automaticamente quando você adiciona transações em cartões de crédito.
            </p>
          </div>
        ) : (
          sortedInvoices.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              creditCard={creditCards.find((cc) => cc.id === invoice.credit_card_id)}
              isExpanded={expandedId === invoice.id}
              onToggle={() => setExpandedId(expandedId === invoice.id ? null : invoice.id)}
              onPay={(accountId) => handlePay(invoice.id, accountId)}
              accounts={accounts}
              paying={payingId === invoice.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
