"use client";

import { useEffect, useMemo, useState } from "react";
import { Account, Category, Tag, TagFamily, transactionsApi, Currency, PaymentMethod, CreditCard } from "@/lib/api";

interface Props {
  families: TagFamily[];
  categories: Category[];
  tags: Tag[];
  accounts?: Account[];
  paymentMethods?: PaymentMethod[];
  creditCards?: CreditCard[];
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function brazilDatetime(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

const PM_TYPE_LABELS: Record<string, string> = {
  debit: "Débito / Pix",
  credit: "Crédito",
  benefit: "Benefício",
};

export function AddTransactionModal({ families, categories, tags, accounts = [], paymentMethods = [], creditCards = [], open, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    date_transaction: brazilDatetime(),
    family_id: "",
    category_id: "",
    tag_id: "",
    account_id: "",
    payment_method_id: "",
    credit_card_id: "",
    value: "",
    currency: "BRL" as Currency,
    description: "",
    quantity: "",
    symbol: "",
    index_rate: "",
    index: "",
    index_percentage: "",
  });
  const [saving, setSaving] = useState(false);
  const [showInvestment, setShowInvestment] = useState(false);
  const [direction, setDirection] = useState<"in" | "out">("out");

  useEffect(() => {
    if (open) {
      setForm({
        date_transaction: brazilDatetime(),
        family_id: "",
        category_id: "",
        tag_id: "",
        account_id: "",
        payment_method_id: "",
        credit_card_id: "",
        value: "",
        currency: "BRL",
        description: "",
        quantity: "",
        symbol: "",
        index_rate: "",
        index: "",
        index_percentage: "",
      });
      setShowInvestment(false);
      setDirection("out");
    }
  }, [open]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Filter families by direction
  const visibleFamilies = families?.filter(f => {
    if (direction === "in") return f.nature === "income";
    return f.nature !== "income";
  }) ?? [];

  const filteredCategories = categories?.filter(
    (c) => form.family_id === "" || c.family_id === form.family_id,
  );
  const filteredTags = tags?.filter(
    (t) => form.category_id === "" || t.category_id === form.category_id,
  );

  const selectedFamily = families?.find(f => f.id === form.family_id);
  const isInvestment = selectedFamily?.nature === "investment";

  useEffect(() => {
    if (isInvestment) setShowInvestment(true);
  }, [isInvestment]);

  // Filter payment methods by direction
  const visiblePaymentMethods = useMemo(() => {
    return paymentMethods?.filter(pm => {
      if (!pm.is_active) return false;
      if (direction === "in") return pm.type === "debit";
      return true;
    }) ?? [];
  }, [paymentMethods, direction]);

  // Get selected account
  const selectedAccount = accounts.find(a => a.id === form.account_id);
  
  // Filter payment methods by selected account and direction
  const availablePaymentMethods = useMemo(() => {
    if (!form.account_id) return [];
    return paymentMethods.filter(pm => {
      if (!pm.is_active) return false;
      if (pm.account_id !== form.account_id) return false;
      // For income, only show debit payment methods
      if (direction === "in") return pm.type === "debit";
      return true;
    });
  }, [paymentMethods, form.account_id, direction]);

  // Get selected payment method
  const selectedPaymentMethod = paymentMethods.find(pm => pm.id === form.payment_method_id);

  // Get credit cards for selected payment method
  const availableCreditCards = useMemo(() => {
    if (!selectedPaymentMethod || selectedPaymentMethod.type !== "credit") return [];
    return creditCards?.filter(cc => cc.payment_method_id === selectedPaymentMethod.id && cc.is_active) ?? [];
  }, [selectedPaymentMethod, creditCards]);

  function handleAccountChange(accountId: string) {
    setForm(f => ({
      ...f,
      account_id: accountId,
      payment_method_id: "", // Reset payment method when account changes
      credit_card_id: "", // Reset credit card too
    }));
  }

  function handlePaymentMethodChange(pmId: string) {
    setForm(f => ({
      ...f,
      payment_method_id: pmId,
      credit_card_id: "", // Reset credit card when PM changes
    }));
  }

  function changeDirection(dir: "in" | "out") {
    setDirection(dir);
    setForm(f => ({ 
      ...f, 
      family_id: "", 
      category_id: "", 
      tag_id: "", 
      account_id: "",
      payment_method_id: "",
      credit_card_id: "" 
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tag_id || !form.account_id || !form.payment_method_id || !form.value) return;
    
    setSaving(true);
    try {
      await transactionsApi.create({
        tag_id: form.tag_id,
        account_id: form.account_id,
        date_transaction: new Date(form.date_transaction).toISOString(),
        value: parseFloat(form.value),
        currency: form.currency,
        description: form.description || undefined,
        quantity: form.quantity ? parseFloat(form.quantity) : undefined,
        symbol: form.symbol || undefined,
        index_rate: form.index_rate ? parseFloat(form.index_rate) : undefined,
        index: form.index || undefined,
        index_percentage: form.index_percentage ? parseFloat(form.index_percentage) : undefined,
        // For credit, we might need to handle invoice creation - this is handled by the backend
      });
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all";
  const selectCls =
    "w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary/60 transition-all appearance-none";

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-0 z-[60] flex items-center justify-center transition-transform duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="bg-surface border border-border rounded-2xl w-full max-w-lg mx-auto my-auto max-h-[85vh] overflow-hidden flex flex-col">
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>
          <div className="flex items-center justify-between px-5 pb-3 pt-1 shrink-0">
            <h2 className="text-base font-semibold text-text-primary">Nova transação</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-text-primary hover:bg-surface-3 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Entrada / Saída toggle */}
          <div className="px-5 pb-3 shrink-0">
            <div className="flex rounded-xl overflow-hidden border border-border">
              <button
                type="button"
                onClick={() => changeDirection("in")}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  direction === "in"
                    ? "bg-accent text-white"
                    : "bg-surface text-text-secondary hover:bg-surface-3"
                }`}>
                ↓ Entrada
              </button>
              <button
                type="button"
                onClick={() => changeDirection("out")}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  direction === "out"
                    ? "bg-danger text-white"
                    : "bg-surface text-text-secondary hover:bg-surface-3"
                }`}>
                ↑ Saída
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 pb-5 space-y-4">
            
            {/* Account Selection */}
            <div>
              <label className="block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">
                {direction === "in" ? "Conta de destino" : "Conta"}
              </label>
              <select
                value={form.account_id}
                onChange={(e) => handleAccountChange(e.target.value)}
                required
                className={selectCls}
              >
                <option value="">Selecionar conta...</option>
                {accounts?.filter(a => a.is_active).map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              {accounts?.filter(a => a.is_active).length === 0 && (
                <p className="text-[11px] text-muted mt-1">
                  Nenhuma conta cadastrada.
                </p>
              )}
            </div>

            {/* Payment Method Selection */}
            <div>
              <label className="block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">
                Método de pagamento
              </label>
              <select
                value={form.payment_method_id}
                onChange={(e) => handlePaymentMethodChange(e.target.value)}
                required
                disabled={!form.account_id || availablePaymentMethods.length === 0}
                className={`${selectCls} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <option value="">{form.account_id ? "Selecionar método..." : "Selecione uma conta primeiro"}</option>
                {availablePaymentMethods?.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {PM_TYPE_LABELS[pm.type] || pm.type} {pm.name !== PM_TYPE_LABELS[pm.type] ? `· ${pm.name}` : ""}
                  </option>
                ))}
              </select>
              {form.account_id && availablePaymentMethods.length === 0 && (
                <p className="text-[11px] text-muted mt-1">
                  Esta conta não tem métodos de pagamento configurados.
                </p>
              )}
            </div>

            {/* Credit Card Selection (only for credit payment methods) */}
            {selectedPaymentMethod?.type === "credit" && availableCreditCards.length > 0 && (
              <div>
                <label className="block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">
                  Cartão de crédito
                </label>
                <select
                  value={form.credit_card_id}
                  onChange={(e) => setForm({ ...form, credit_card_id: e.target.value })}
                  className={selectCls}
                >
                  <option value="">Selecionar cartão...</option>
                  {availableCreditCards?.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.name} (Fecha: dia {cc.closing_day}, Vence: dia {cc.due_day})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date/time */}
            <div>
              <label className="block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">Data e hora</label>
              <input
                type="datetime-local"
                value={form.date_transaction}
                onChange={(e) => setForm({ ...form, date_transaction: e.target.value })}
                className={inputCls}
              />
            </div>

            {/* Família */}
            <div>
              <label className="block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">Família</label>
              <select
                value={form.family_id}
                onChange={(e) => {
                  const famId = e.target.value;
                  setForm({ ...form, family_id: famId, category_id: "", tag_id: "" });
                }}
                className={selectCls}
              >
                <option value="">Selecionar família</option>
                {visibleFamilies?.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              {visibleFamilies?.length === 0 && (
                <p className="text-[11px] text-muted mt-1">
                  Nenhuma família com natureza "{direction === "in" ? "Receita" : "Gasto/Investimento"}" cadastrada.
                </p>
              )}
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">Categoria</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value, tag_id: "" })}
                disabled={!form.family_id}
                className={`${selectCls} disabled:opacity-40`}
              >
                <option value="">Selecionar categoria</option>
                {filteredCategories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Tag */}
            <div>
              <label className="block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">Tag</label>
              <select
                value={form.tag_id}
                onChange={(e) => setForm({ ...form, tag_id: e.target.value })}
                disabled={!form.category_id}
                className={`${selectCls} disabled:opacity-40`}
              >
                <option value="">Selecionar tag</option>
                {filteredTags?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {/* Valor + Moeda */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">Valor</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder="0,00"
                  required
                  className={`${inputCls} text-right`}
                />
              </div>
              <div>
                <label className="block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">Moeda</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}
                  className={selectCls}
                >
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">Descrição (opcional)</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ex: Mercado, iFood, Salário março…"
                className={inputCls}
              />
            </div>

            {/* Investment fields toggle */}
            <button
              type="button"
              onClick={() => setShowInvestment(!showInvestment)}
              className="flex items-center gap-2 text-xs text-muted hover:text-text-primary transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`w-3.5 h-3.5 transition-transform ${showInvestment ? "rotate-90" : ""}`}>
                <path d="M9 18l6-6-6-6" />
              </svg>
              {showInvestment ? "Ocultar campos de investimento" : "Adicionar campos de investimento"}
            </button>

            {showInvestment && (
              <div className="space-y-4 border-t border-border pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">Símbolo</label>
                    <input
                      type="text"
                      placeholder="BTC, PETR4…"
                      value={form.symbol}
                      onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">Quantidade</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                      className={`${inputCls} text-right`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">Índice</label>
                    <input
                      type="text"
                      placeholder="CDI, IPCA…"
                      value={form.index}
                      onChange={(e) => setForm({ ...form, index: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">Taxa (% AA)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="100"
                      value={form.index_rate}
                      onChange={(e) => setForm({ ...form, index_rate: e.target.value })}
                      className={`${inputCls} text-right`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">% Índice</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="100"
                      value={form.index_percentage}
                      onChange={(e) => setForm({ ...form, index_percentage: e.target.value })}
                      className={`${inputCls} text-right`}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 border border-border rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !form.tag_id || !form.payment_method_id || !form.value}
                className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium disabled:opacity-40 transition-colors"
              >
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
