"use client";

import { useEffect, useState } from "react";
import {
  accountsApi, paymentMethodsApi, creditCardsApi,
  Account, AccountType, BalanceMode, Currency,
  PaymentMethod, PaymentMethodType,
  CreditCard,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: "Conta Corrente",
  savings: "Poupança",
  digital: "Conta Digital",
  broker: "Corretora",
  wallet: "Carteira Crypto",
  benefit: "Vale Refeição/Alimentação",
  credit_card: "Cartão de Crédito",
};

const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  checking: "#2563eb",
  savings: "#22c55e",
  digital: "#8b5cf6",
  broker: "#f59e0b",
  wallet: "#f97316",
  benefit: "#14b8a6",
  credit_card: "#ef4444",
};

const BALANCE_MODE_LABELS: Record<BalanceMode, string> = {
  calculated: "Automático",
  manual: "Manual",
};

const PM_TYPE_LABELS: Record<PaymentMethodType, string> = {
  debit: "Débito",
  credit: "Crédito",
  benefit: "Benefício",
};

const PM_TYPE_COLORS: Record<PaymentMethodType, string> = {
  debit: "text-primary border-primary/30 bg-primary/10",
  credit: "text-orange-500 border-orange-500/30 bg-orange-500/10",
  benefit: "text-accent border-accent/30 bg-accent/10",
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const PlusIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
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
const PencilIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
);
const XIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const CreditCardIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);
const FileTextIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-2 border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-surface-3">
            <XIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const modalInputCls =
  "w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all";
const modalSelectCls =
  "w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/60 transition-all";

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">{label}</label>
      {children}
    </div>
  );
}

function ModalActions({ onClose, loading, label }: { onClose: () => void; loading: boolean; label: string }) {
  return (
    <div className="flex gap-2 pt-1">
      <button type="button" onClick={onClose}
        className="flex-1 py-2.5 text-sm font-medium text-muted bg-surface border border-border rounded-xl hover:bg-surface-2 hover:text-text-primary transition-colors">
        Cancelar
      </button>
      <button type="submit" disabled={loading}
        className="flex-1 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-50 rounded-xl transition-colors">
        {loading ? "Salvando…" : label}
      </button>
    </div>
  );
}

// ─── Account Modal ────────────────────────────────────────────────────────────

function AccountModal({ initial, accounts, onSave, onClose }: {
  initial?: Account;
  accounts: Account[];
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<AccountType>(initial?.type ?? "checking");
  const [institution, setInstitution] = useState(initial?.institution ?? "");
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "BRL");
  const [balanceMode, setBalanceMode] = useState<BalanceMode>(initial?.balance_mode ?? "calculated");
  const [manualBalance, setManualBalance] = useState(initial?.manual_balance?.toString() ?? "");
  const [creditLimit, setCreditLimit] = useState(initial?.credit_limit?.toString() ?? "");
  const [closingDay, setClosingDay] = useState(initial?.closing_day?.toString() ?? "");
  const [dueDay, setDueDay] = useState(initial?.due_day?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const isCreditCard = type === "credit_card";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        name,
        type,
        institution: institution || null,
        currency,
        balance_mode: balanceMode,
        manual_balance: balanceMode === "manual" ? parseFloat(manualBalance) : null,
        credit_limit: isCreditCard ? (creditLimit ? parseFloat(creditLimit) : null) : null,
        closing_day: isCreditCard ? (closingDay ? parseInt(closingDay) : null) : null,
        due_day: isCreditCard ? (dueDay ? parseInt(dueDay) : null) : null,
      });
      onClose();
    } catch (err) {
      alert(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={initial ? "Editar conta" : "Nova conta"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ModalField label="Nome">
          <input autoFocus value={name} onChange={e => setName(e.target.value)} required
            placeholder="ex: Nubank, Itaú, Inter…"
            className={modalInputCls} />
        </ModalField>
        <ModalField label="Tipo">
          <select value={type} onChange={e => setType(e.target.value as AccountType)} className={modalSelectCls}>
            {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </ModalField>
        <ModalField label="Instituição">
          <input value={institution} onChange={e => setInstitution(e.target.value)}
            placeholder="Nubank, Itaú, Banco do Brasil…"
            className={modalInputCls} />
        </ModalField>
        <ModalField label="Moeda">
          <select value={currency} onChange={e => setCurrency(e.target.value as Currency)} className={modalSelectCls}>
            <option value="BRL">BRL</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </ModalField>
        {!isCreditCard && (
          <>
            <ModalField label="Modo de saldo">
              <select value={balanceMode} onChange={e => setBalanceMode(e.target.value as BalanceMode)} className={modalSelectCls}>
                <option value="calculated">Calculado (automático)</option>
                <option value="manual">Manual (informado)</option>
              </select>
            </ModalField>
            {balanceMode === "manual" && (
              <ModalField label="Saldo manual">
                <input value={manualBalance} onChange={e => setManualBalance(e.target.value)} type="number" step="0.01"
                  className={modalInputCls} />
              </ModalField>
            )}
          </>
        )}
        {isCreditCard && (
          <>
            <ModalField label="Limite">
              <input value={creditLimit} onChange={e => setCreditLimit(e.target.value)} type="number" step="0.01"
                placeholder="ex: 5000.00"
                className={modalInputCls} />
            </ModalField>
            <div className="grid grid-cols-2 gap-3">
              <ModalField label="Dia fechamento">
                <input value={closingDay} onChange={e => setClosingDay(e.target.value)} type="number" min="1" max="31"
                  placeholder="ex: 3"
                  className={modalInputCls} />
              </ModalField>
              <ModalField label="Dia vencimento">
                <input value={dueDay} onChange={e => setDueDay(e.target.value)} type="number" min="1" max="31"
                  placeholder="ex: 10"
                  className={modalInputCls} />
              </ModalField>
            </div>
          </>
        )}
        <ModalActions onClose={onClose} loading={saving} label={initial ? "Salvar" : "Criar conta"} />
      </form>
    </Modal>
  );
}

// ─── Payment Method Row ───────────────────────────────────────────────────────

function PaymentMethodRow({ pm, account, onUpdate, onDelete }: {
  pm: PaymentMethod;
  account: Account;
  onUpdate: (id: string, data: Partial<PaymentMethod>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(pm.name);
  const [pendingDelete, setPendingDelete] = useState(false);

  async function handleRename() {
    if (!draft.trim() || draft.trim() === pm.name) { setRenaming(false); return; }
    await onUpdate(pm.id, { name: draft.trim() });
    setRenaming(false);
  }

  async function handleDelete() {
    if (!pendingDelete) { setPendingDelete(true); return; }
    await onDelete(pm.id);
  }

  async function handleToggle() {
    await onUpdate(pm.id, { is_active: !pm.is_active });
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 ${!pm.is_active ? "opacity-50" : ""}`}>
      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${PM_TYPE_COLORS[pm.type]}`}>
        {PM_TYPE_LABELS[pm.type]}
      </span>
      {renaming ? (
        <input
          autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setRenaming(false); }}
          onBlur={handleRename}
          onClick={e => e.stopPropagation()}
          className="flex-1 bg-background border border-primary/50 rounded px-2 py-0.5 text-sm text-text-primary focus:outline-none"
        />
      ) : (
        <span className="flex-1 text-sm truncate">{pm.name}</span>
      )}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={handleToggle}
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded border transition-all ${
            pm.is_active ? "text-muted border-border hover:text-text-primary" : "text-accent border-accent/30 hover:bg-accent/10"
          }`}>
          {pm.is_active ? "Desativar" : "Ativar"}
        </button>
        <button onClick={() => { setRenaming(true); setDraft(pm.name); }}
          className="p-1 rounded hover:bg-surface-3 text-muted hover:text-text-primary transition-colors">
          <PencilIcon className="w-3 h-3" />
        </button>
        <button onClick={handleDelete}
          className={`p-1 rounded transition-all text-xs font-medium ${
            pendingDelete ? "bg-danger/15 text-danger border border-danger/30 px-1.5" : "hover:bg-surface-3 text-muted hover:text-danger"
          }`}>
          {pendingDelete ? "Confirmar?" : <TrashIcon className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}

// ─── Credit Card Inline ───────────────────────────────────────────────────────

function CreditCardInline({ card, onUpdate, onDelete }: {
  card: CreditCard;
  onUpdate: (id: string, data: Partial<CreditCard>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [name, setName] = useState(card.name);
  const [limit, setLimit] = useState(card.limit_amount.toString());
  const [dueDay, setDueDay] = useState(card.due_day.toString());
  const [closingOffset, setClosingOffset] = useState(card.closing_offset.toString());

  async function handleSave() {
    await onUpdate(card.id, {
      name: name.trim() || card.name,
      limit_amount: parseFloat(limit) || card.limit_amount,
      due_day: parseInt(dueDay) || card.due_day,
      closing_offset: parseInt(closingOffset) || card.closing_offset,
    });
    setEditing(false);
  }

  async function handleDelete() {
    if (!pendingDelete) { setPendingDelete(true); return; }
    await onDelete(card.id);
  }

  const available = card.limit_amount - card.current_balance;
  const pct = card.limit_amount > 0 ? Math.min(1, card.current_balance / card.limit_amount) : 0;
  const barColor = pct > 0.8 ? "#f97316" : "#2563eb";

  if (editing) {
    return (
      <div className="px-3 py-3 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted uppercase font-semibold block mb-1">Nome</label>
            <input value={name} onChange={e => setName(e.target.value)} className={modalInputCls} />
          </div>
          <div>
            <label className="text-[10px] text-muted uppercase font-semibold block mb-1">Limite</label>
            <input value={limit} onChange={e => setLimit(e.target.value)} type="number" step="0.01" className={modalInputCls} />
          </div>
          <div>
            <label className="text-[10px] text-muted uppercase font-semibold block mb-1">Vencimento</label>
            <input value={dueDay} onChange={e => setDueDay(e.target.value)} type="number" min="1" max="31" className={modalInputCls} />
          </div>
          <div>
            <label className="text-[10px] text-muted uppercase font-semibold block mb-1">Fechamento (dias antes)</label>
            <input value={closingOffset} onChange={e => setClosingOffset(e.target.value)} type="number" min="1" max="30" className={modalInputCls} />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(false)} className="flex-1 py-2 text-sm text-muted border border-border rounded-lg hover:bg-surface-2">Cancelar</button>
          <button onClick={handleSave} className="flex-1 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover">Salvar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCardIcon className="w-4 h-4 text-muted" />
          <span className="text-sm font-medium">{card.name}</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${card.is_active ? "text-accent border-accent/30" : "text-muted border-border"}`}>
            {card.is_active ? "Ativo" : "Inativo"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-surface-3 text-muted hover:text-text-primary transition-colors">
            <PencilIcon className="w-3 h-3" />
          </button>
          <button onClick={handleDelete}
            className={`p-1 rounded transition-all text-xs font-medium ${
              pendingDelete ? "bg-danger/15 text-danger border border-danger/30 px-1.5" : "hover:bg-surface-3 text-muted hover:text-danger"
            }`}>
            {pendingDelete ? "Confirmar?" : <TrashIcon className="w-3 h-3" />}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <span className="text-muted block">Limite</span>
          <span className="font-medium">{formatCurrency(card.limit_amount, "BRL")}</span>
        </div>
        <div>
          <span className="text-muted block">Usado</span>
          <span className="font-medium">{formatCurrency(card.current_balance, "BRL")}</span>
        </div>
        <div>
          <span className="text-muted block">Disponível</span>
          <span className="font-medium text-accent">{formatCurrency(available, "BRL")}</span>
        </div>
      </div>
      <div className="h-1 bg-surface-3 overflow-hidden">
        <div style={{ width: `${pct * 100}%`, background: barColor }} className="h-full transition-all duration-200" />
      </div>
      <div className="flex justify-between text-[10px] text-muted">
        <span>Vencimento: dia {card.due_day}</span>
        <span>Fechamento: dia {card.closing_day}</span>
      </div>
    </div>
  );
}

// ─── Create Credit Card Modal ──────────────────────────────────────────────────

function CreateCreditCardModal({ accountName, onSave, onClose }: {
  accountName: string;
  onSave: (data: { name: string; limit_amount: number; due_day: number; closing_offset: number }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(accountName);
  const [limit, setLimit] = useState("5000");
  const [dueDay, setDueDay] = useState("10");
  const [closingOffset, setClosingOffset] = useState("3");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        name: name.trim() || accountName,
        limit_amount: parseFloat(limit) || 5000,
        due_day: parseInt(dueDay) || 10,
        closing_offset: parseInt(closingOffset) || 3,
      });
    } catch {
      setSaving(false);
    }
  }

  return (
    <Modal title="Novo Cartão de Crédito" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ModalField label="Nome do cartão">
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            placeholder={accountName}
            className={modalInputCls} />
        </ModalField>
        <ModalField label="Limite (R$)">
          <input value={limit} onChange={e => setLimit(e.target.value)} type="number" step="0.01" min="0"
            placeholder="5000"
            className={modalInputCls} />
        </ModalField>
        <div className="grid grid-cols-2 gap-3">
          <ModalField label="Dia do vencimento">
            <input value={dueDay} onChange={e => setDueDay(e.target.value)} type="number" min="1" max="31"
              placeholder="10"
              className={modalInputCls} />
          </ModalField>
          <ModalField label="Fechamento (dias antes)">
            <input value={closingOffset} onChange={e => setClosingOffset(e.target.value)} type="number" min="0" max="30"
              placeholder="3"
              className={modalInputCls} />
          </ModalField>
        </div>
        <ModalActions onClose={onClose} loading={saving} label="Criar cartão" />
      </form>
    </Modal>
  );
}

// ─── Account Card ─────────────────────────────────────────────────────────────

function AccountCard({ account, pms, creditCard, onAccountUpdate, onAccountDelete, onPmCreate, onPmUpdate, onPmDelete, onCcCreate, onCcUpdate, onCcDelete }: {
  account: Account & { holdings?: Record<string, number> };
  pms: PaymentMethod[];
  creditCard?: CreditCard;
  onAccountUpdate: (data: any) => Promise<void>;
  onAccountDelete: () => Promise<void>;
  onPmCreate: (data: { name: string; type: PaymentMethodType; account_id: string }) => Promise<void>;
  onPmUpdate: (id: string, data: Partial<PaymentMethod>) => Promise<void>;
  onPmDelete: (id: string) => Promise<void>;
  onCcCreate: (data: { payment_method_id: string; name: string; limit_amount: number; due_day: number; closing_offset?: number }) => Promise<void>;
  onCcUpdate: (id: string, data: Partial<CreditCard>) => Promise<void>;
  onCcDelete: (id: string) => Promise<void>;
}) {
  const { fmtDisplay } = useSettings();
  const [expanded, setExpanded] = useState(false);
  const [editAccount, setEditAccount] = useState(false);
  const [showCcModal, setShowCcModal] = useState(false);
  const [ccPmId, setCcPmId] = useState<string | null>(null);
  const [pendingAccountDelete, setPendingAccountDelete] = useState(false);
  const color = ACCOUNT_TYPE_COLORS[account.type];
  
  // Health indicators
  const isNegative = (account.balance ?? 0) < 0;
  const isInactive = !account.is_active;
  const isForeignCurrency = account.currency !== "BRL";
  const isCryptoAccount = account.type === "wallet" || account.type === "broker";

  function openCcModal(pm: PaymentMethod) {
    setCcPmId(pm.id);
    setShowCcModal(true);
  }

  return (
    <>
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-surface-2/50 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-muted transition-transform duration-200">
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </span>
            <span className="w-1 h-6 rounded-full shrink-0" style={{ background: color }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{account.name}</span>
                {/* Status badges */}
                <div className="flex items-center gap-1 shrink-0">
                  {isInactive && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-surface-3 text-muted border border-border">
                      Inativo
                    </span>
                  )}
                  {isForeignCurrency && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-surface-3 text-muted border border-border">
                      {account.currency}
                    </span>
                  )}
                  {account.balance_mode === "manual" && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-surface-3 text-muted border border-border">
                      Manual
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                {account.institution && <span>{account.institution}</span>}
                {account.institution && account.type !== "credit_card" && <span>•</span>}
                {account.type !== "credit_card" && (
                  <span>{BALANCE_MODE_LABELS[account.balance_mode]}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className={`text-sm font-medium ${isNegative ? "text-danger" : "text-text-primary"}`}>
                {fmtDisplay(account.balance ?? 0, account.currency)}
              </div>
              <div className="text-[10px] text-muted">{ACCOUNT_TYPE_LABELS[account.type]}</div>
            </div>
            {/* Statement button for crypto/broker accounts */}
            {isCryptoAccount && (
              <a
                href={`/transactions?account_id=${account.id}`}
                onClick={(e) => e.stopPropagation()}
                className="p-1 text-muted hover:text-primary transition-colors"
                title="Ver extrato/transações"
              >
                <FileTextIcon className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setEditAccount(true); }}
              className="p-1 text-muted hover:text-text-primary transition-colors">
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); if (!pendingAccountDelete) { setPendingAccountDelete(true); } else { onAccountDelete(); } }}
              className={`p-1 transition-all text-xs font-medium ${
                pendingAccountDelete ? "bg-danger/15 text-danger rounded px-1.5" : "text-muted hover:text-danger"
              }`}>
              {pendingAccountDelete ? "Confirmar?" : <TrashIcon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="border-t border-border">
            {/* Account Info Grid */}
            <div className="px-4 py-3 bg-surface-2/30">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold mb-0.5">Tipo</span>
                  <span className="font-medium text-text-primary">{ACCOUNT_TYPE_LABELS[account.type]}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold mb-0.5">Moeda</span>
                  <span className="font-medium text-text-primary">{account.currency}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold mb-0.5">Saldo</span>
                  <span className="font-medium text-text-primary">{BALANCE_MODE_LABELS[account.balance_mode]}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-semibold mb-0.5">Status</span>
                  <span className={`font-medium ${account.is_active ? "text-accent" : "text-muted"}`}>
                    {account.is_active ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>
              {/* Alert for negative balance */}
              {isNegative && (
                <div className="mt-3 flex items-center gap-2 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>Saldo negativo de {fmtDisplay(account.balance ?? 0, account.currency)}</span>
                </div>
              )}
              {/* Holdings display for crypto/broker accounts */}
              {isCryptoAccount && account.holdings && Object.keys(account.holdings).length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">Ativos</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(account.holdings).map(([symbol, qty]) => (
                      <div
                        key={symbol}
                        className="bg-surface-3 border border-border rounded px-2 py-1 text-xs"
                      >
                        <span className="font-medium text-text-primary">{qty.toFixed(6)}</span>
                        <span className="text-muted ml-1">{symbol}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Payment Methods */}
            <div className="px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Métodos de Pagamento</span>
              </div>

              {pms.length > 0 && (
                <div className="divide-y divide-border/50">
                  {pms.map(pm => (
                    <div key={pm.id} className="group">
                      <PaymentMethodRow
                        pm={pm}
                        account={account}
                        onUpdate={onPmUpdate}
                        onDelete={onPmDelete}
                      />
                      {/* Show "criar cartão" button for credit PMs without a card */}
                      {pm.type === "credit" && !creditCard && (
                        <div className="px-3 pb-1">
                          <button
                            onClick={() => openCcModal(pm)}
                            className="text-[10px] text-primary hover:text-primary-hover transition-colors">
                            + Vincular cartão
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {pms.length === 0 && (
                <div className="text-xs text-muted py-2">Nenhum método de pagamento.</div>
              )}

              {/* Add PM dropdown */}
              <select
                className="mt-2 w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-muted focus:outline-none cursor-pointer"
                defaultValue=""
                onChange={e => {
                  if (e.target.value) {
                    onPmCreate({ name: PM_TYPE_LABELS[e.target.value as PaymentMethodType], type: e.target.value as PaymentMethodType, account_id: account.id });
                    e.target.value = "";
                  }
                }}
              >
                <option value="" disabled>+ Adicionar método de pagamento</option>
                <option value="debit">Débito</option>
                <option value="credit">Crédito</option>
                <option value="benefit">Benefício</option>
              </select>
            </div>

            {/* Credit Card section */}
            {creditCard && (
              <div className="border-t border-border">
                <div className="px-3 py-2">
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Cartão de Crédito</span>
                </div>
                <CreditCardInline
                  card={creditCard}
                  onUpdate={onCcUpdate}
                  onDelete={onCcDelete}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {editAccount && (
        <AccountModal
          initial={account}
          accounts={[]}
          onSave={onAccountUpdate}
          onClose={() => setEditAccount(false)}
        />
      )}

      {showCcModal && ccPmId && (
        <CreateCreditCardModal
          accountName={account.name}
          onSave={async (data) => {
            await onCcCreate({ payment_method_id: ccPmId, ...data });
            setShowCcModal(false);
            setCcPmId(null);
          }}
          onClose={() => { setShowCcModal(false); setCcPmId(null); }}
        />
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContasPage() {
  const { fmtDisplay, convertToDisplay, displayCurrency: settingsDisplayCurrency } = useSettings();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [groupByInstitution, setGroupByInstitution] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [accs, pms, ccs] = await Promise.all([
        accountsApi.list(),
        paymentMethodsApi.list(),
        creditCardsApi.list(),
      ]);
      setAccounts(accs as Account[]);
      setPaymentMethods(pms as PaymentMethod[]);
      setCreditCards(ccs as CreditCard[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreateAccount(data: any) {
    await accountsApi.create(data);
    await load();
  }

  async function handleUpdateAccount(id: string, data: any) {
    await accountsApi.update(id, data);
    await load();
  }

  async function handleDeleteAccount(id: string) {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    await accountsApi.delete(id);
    await load();
  }

  async function handleCreatePm(data: { name: string; type: PaymentMethodType; account_id: string }) {
    await paymentMethodsApi.create(data);
    await load();
  }

  async function handleUpdatePm(id: string, data: Partial<PaymentMethod>) {
    await paymentMethodsApi.update(id, data);
    await load();
  }

  async function handleDeletePm(id: string) {
    await paymentMethodsApi.delete(id);
    await load();
  }

  async function handleCreateCc(data: Parameters<typeof creditCardsApi.create>[0]) {
    await creditCardsApi.create(data);
    await load();
  }

  async function handleUpdateCc(id: string, data: Partial<CreditCard>) {
    await creditCardsApi.update(id, data);
    await load();
  }

  async function handleDeleteCc(id: string) {
    await creditCardsApi.delete(id);
    await load();
  }

  // Group accounts by type
  const groupedByType = accounts.reduce((acc, a) => {
    const t = a.type;
    if (!acc[t]) acc[t] = [];
    acc[t].push(a);
    return acc;
  }, {} as Record<string, Account[]>);

  // Group accounts by institution
  const groupedByInstitution = accounts.reduce((acc, a) => {
    const key = a.institution || "Outros";
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {} as Record<string, Account[]>);

  const typeOrder: AccountType[] = ["checking", "savings", "digital", "broker", "wallet", "benefit", "credit_card"];
  
  // Calculate totals for summary strip (all converted to BRL first, then to display currency)
  const totalsByType = typeOrder.reduce((acc, type) => {
    const accountsOfType = groupedByType[type] || [];
    // Convert each account balance to display currency before summing
    acc[type] = accountsOfType.reduce((sum, a) => {
      const converted = convertToDisplay(a.balance ?? 0, a.currency);
      return sum + converted;
    }, 0);
    return acc;
  }, {} as Record<string, number>);

  // Total balance converted to display currency
  const totalBalance = accounts.reduce((sum, a) => {
    const converted = convertToDisplay(a.balance ?? 0, a.currency);
    return sum + converted;
  }, 0);
  
  const negativeAccounts = accounts.filter(a => (a.balance ?? 0) < 0).length;
  const inactiveAccounts = accounts.filter(a => !a.is_active).length;

  return (
    <div className="p-4 md:px-6 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">Contas</h1>
        <div className="flex items-center gap-2">
          {/* Group by toggle */}
          <button
            onClick={() => setGroupByInstitution(!groupByInstitution)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              groupByInstitution
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-surface border-border text-muted hover:text-text-primary"
            }`}
          >
            {groupByInstitution ? "Agrupado por instituição" : "Agrupado por tipo"}
          </button>
          <button onClick={() => setShowNewAccount(true)} className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-sm rounded-lg">
            + Nova
          </button>
        </div>
      </div>

      {/* Summary strip with enhanced info */}
      {!loading && accounts.length > 0 && (
        <>
          <div className="flex border border-border divide-x divide-border overflow-x-auto rounded-xl">
            {typeOrder.filter(t => groupedByType[t] && groupedByType[t].length > 0).map(type => (
              <div key={type} className="flex-1 min-w-[120px] px-4 py-3">
                <div className="text-[10px] text-muted uppercase font-semibold">{ACCOUNT_TYPE_LABELS[type as AccountType]}</div>
                <div className="text-sm font-medium mt-0.5" style={{ color: ACCOUNT_TYPE_COLORS[type as AccountType] }}>
                  {formatCurrency(totalsByType[type], settingsDisplayCurrency)}
                </div>
              </div>
            ))}
          </div>
          
          {/* Health indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-surface border border-border rounded-xl px-4 py-3">
              <div className="text-[10px] text-muted uppercase font-semibold">Saldo Total</div>
              <div className={`text-lg font-semibold mt-1 ${totalBalance >= 0 ? "text-accent" : "text-danger"}`}>
                {formatCurrency(totalBalance, settingsDisplayCurrency)}
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl px-4 py-3">
              <div className="text-[10px] text-muted uppercase font-semibold">Total de Contas</div>
              <div className="text-lg font-semibold mt-1 text-text-primary">{accounts.length}</div>
            </div>
            <div className="bg-surface border border-border rounded-xl px-4 py-3">
              <div className="text-[10px] text-muted uppercase font-semibold">Saldo Negativo</div>
              <div className={`text-lg font-semibold mt-1 ${negativeAccounts > 0 ? "text-danger" : "text-accent"}`}>
                {negativeAccounts}
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl px-4 py-3">
              <div className="text-[10px] text-muted uppercase font-semibold">Inativas</div>
              <div className={`text-lg font-semibold mt-1 ${inactiveAccounts > 0 ? "text-muted" : "text-accent"}`}>
                {inactiveAccounts}
              </div>
            </div>
          </div>
        </>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted">Carregando…</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12 text-muted">
          <p>Nenhuma conta ainda</p>
          <p className="text-sm mt-2">Crie uma conta para começar a gerenciar seus métodos de pagamento</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Group by Type */}
          {!groupByInstitution && typeOrder.filter(t => groupedByType[t]).map(type => (
            <div key={type}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  style={{ borderColor: ACCOUNT_TYPE_COLORS[type as AccountType], color: ACCOUNT_TYPE_COLORS[type as AccountType] }}>
                  {ACCOUNT_TYPE_LABELS[type as AccountType]}
                </span>
                <span className="text-xs text-muted">{groupedByType[type].length}</span>
                <span className="text-xs text-muted">•</span>
                <span className="text-xs font-medium" style={{ color: ACCOUNT_TYPE_COLORS[type as AccountType] }}>
                  {formatCurrency(totalsByType[type], settingsDisplayCurrency)}
                </span>
              </div>
              <div className="space-y-2">
                {groupedByType[type].map(account => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    pms={paymentMethods.filter(pm => pm.account_id === account.id)}
                    creditCard={creditCards.find(cc => {
                      const ccPm = paymentMethods.find(pm => pm.id === cc.payment_method_id);
                      return ccPm?.account_id === account.id;
                    })}
                    onAccountUpdate={(data) => handleUpdateAccount(account.id, data)}
                    onAccountDelete={() => handleDeleteAccount(account.id)}
                    onPmCreate={handleCreatePm}
                    onPmUpdate={handleUpdatePm}
                    onPmDelete={handleDeletePm}
                    onCcCreate={handleCreateCc}
                    onCcUpdate={handleUpdateCc}
                    onCcDelete={handleDeleteCc}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Group by Institution */}
          {groupByInstitution && Object.entries(groupedByInstitution).sort((a, b) => {
            // Sort: institutions with names first, then "Outros"
            if (a[0] === "Outros") return 1;
            if (b[0] === "Outros") return -1;
            return a[0].localeCompare(b[0]);
          }).map(([institution, institutionAccounts]) => {
            const institutionTotal = institutionAccounts.reduce((sum, a) => {
              const converted = convertToDisplay(a.balance ?? 0, a.currency);
              return sum + converted;
            }, 0);
            return (
              <div key={institution}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-border text-text-primary">
                    {institution}
                  </span>
                  <span className="text-xs text-muted">{institutionAccounts.length}</span>
                  <span className="text-xs text-muted">•</span>
                  <span className={`text-xs font-medium ${institutionTotal >= 0 ? "text-accent" : "text-danger"}`}>
                    {formatCurrency(institutionTotal, settingsDisplayCurrency)}
                  </span>
                </div>
                <div className="space-y-2">
                  {institutionAccounts.map(account => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      pms={paymentMethods.filter(pm => pm.account_id === account.id)}
                      creditCard={creditCards.find(cc => {
                        const ccPm = paymentMethods.find(pm => pm.id === cc.payment_method_id);
                        return ccPm?.account_id === account.id;
                      })}
                      onAccountUpdate={(data) => handleUpdateAccount(account.id, data)}
                      onAccountDelete={() => handleDeleteAccount(account.id)}
                      onPmCreate={handleCreatePm}
                      onPmUpdate={handleUpdatePm}
                      onPmDelete={handleDeletePm}
                      onCcCreate={handleCreateCc}
                      onCcUpdate={handleUpdateCc}
                      onCcDelete={handleDeleteCc}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNewAccount && (
        <AccountModal
          accounts={accounts}
          onSave={handleCreateAccount}
          onClose={() => setShowNewAccount(false)}
        />
      )}
    </div>
  );
}
