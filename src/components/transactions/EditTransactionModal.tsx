"use client";

import { useEffect, useMemo, useState } from "react";
import { Account, Transaction, Category, Tag, TagFamily, transactionsApi, Currency, PaymentMethod, CreditCard, invoicesApi } from "@/lib/api";

interface Props {
  transaction: Transaction;
  families: TagFamily[];
  categories: Category[];
  tags: Tag[];
  accounts?: Account[];
  paymentMethods?: PaymentMethod[];
  creditCards?: CreditCard[];
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

const PM_TYPE_LABELS: Record<string, string> = {
  debit: "Débito / Pix",
  credit: "Crédito",
  benefit: "Benefício",
};

export function EditTransactionModal({
  transaction, families, categories, tags, accounts = [], paymentMethods = [], creditCards = [], open, onClose, onUpdated, onDeleted,
}: Props) {
  const tag = tags.find(t => t.id === transaction.tag_id);
  const category = categories.find(c => c.id === tag?.category_id);
  const initialFamilyId = category?.family_id ?? "";
  const initialCategoryId = category?.id ?? "";

  // Determine initial direction from the transaction's family nature
  const initialFamily = families.find(f => f.id === initialFamilyId);
  const initialDirection: "in" | "out" = initialFamily?.nature === "income" ? "in" : "out";
  
  // Find initial account and payment method from transaction's account_id
  const initialAccountId = transaction.account_id ?? "";
  const initialPaymentMethod = paymentMethods.find(pm => pm.account_id === transaction.account_id);

  const [draftFamilyId, setDraftFamilyId] = useState(initialFamilyId);
  const [draftCategoryId, setDraftCategoryId] = useState(initialCategoryId);
  const [draftTagId, setDraftTagId] = useState(transaction.tag_id);
  const [draftAccountId, setDraftAccountId] = useState(initialAccountId);
  const [draftPaymentMethodId, setDraftPaymentMethodId] = useState(initialPaymentMethod?.id ?? "");
  const [draftCreditCardId, setDraftCreditCardId] = useState("");
  const [draftDate, setDraftDate] = useState(transaction.date_transaction.slice(0, 16));
  const [draftValue, setDraftValue] = useState(transaction.value.toString());
  const [draftCurrency, setDraftCurrency] = useState<Currency>(transaction.currency);
  const [draftDescription, setDraftDescription] = useState(transaction.description ?? "");
  const [draftSymbol, setDraftSymbol] = useState(transaction.symbol ?? "");
  const [draftQuantity, setDraftQuantity] = useState(transaction.quantity?.toString() ?? "");
  const [draftIndex, setDraftIndex] = useState(transaction.index ?? "");
  const [draftIndexRate, setDraftIndexRate] = useState(transaction.index_rate?.toString() ?? "");
  const [draftRecurring, setDraftRecurring] = useState(transaction.is_recurring ?? false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [showInvestment, setShowInvestment] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Direction toggle
  const [direction, setDirection] = useState<"in" | "out">(initialDirection);

  const editCategories = useMemo(() =>
    draftFamilyId ? categories.filter(c => c.family_id === draftFamilyId) : categories,
  [draftFamilyId, categories]);

  const editTags = useMemo(() =>
    draftCategoryId
      ? tags.filter(t => t.category_id === draftCategoryId)
      : draftFamilyId
        ? tags.filter(t => editCategories.some(c => c.id === t.category_id))
        : tags,
  [draftCategoryId, draftFamilyId, tags, editCategories]);

  // Filter families by direction
  const visibleFamilies = useMemo(() => {
    return families.filter(f => {
      if (direction === "in") return f.nature === "income";
      return f.nature !== "income";
    });
  }, [families, direction]);

  // Get selected account
  const selectedAccount = accounts.find(a => a.id === draftAccountId);

  // Filter payment methods by selected account and direction
  const availablePaymentMethods = useMemo(() => {
    if (!draftAccountId) return [];
    return paymentMethods.filter(pm => {
      if (!pm.is_active) return false;
      if (pm.account_id !== draftAccountId) return false;
      // For income, only show debit payment methods
      if (direction === "in") return pm.type === "debit";
      return true;
    });
  }, [paymentMethods, draftAccountId, direction]);

  // Get selected payment method
  const selectedPaymentMethod = paymentMethods.find(pm => pm.id === draftPaymentMethodId);
  
  // Get credit cards for selected payment method
  const availableCreditCards = useMemo(() => {
    if (!selectedPaymentMethod || selectedPaymentMethod.type !== "credit") return [];
    return creditCards.filter(cc => cc.payment_method_id === selectedPaymentMethod.id && cc.is_active);
  }, [selectedPaymentMethod, creditCards]);

  const selectedFamily = families.find(f => f.id === draftFamilyId);
  const isInvestment = selectedFamily?.nature === "investment";

  useEffect(() => {
    if (isInvestment) setShowInvestment(true);
    else setShowInvestment(false);
  }, [isInvestment]);

  function changeDirection(dir: "in" | "out") {
    setDirection(dir);
    setDraftFamilyId("");
    setDraftCategoryId("");
    setDraftTagId("");
    setDraftAccountId("");
    setDraftPaymentMethodId("");
    setDraftCreditCardId("");
  }

  function handleAccountChange(accountId: string) {
    setDraftAccountId(accountId);
    setDraftPaymentMethodId(""); // Reset payment method when account changes
    setDraftCreditCardId(""); // Reset credit card too
  }

  function handlePaymentMethodChange(pmId: string) {
    setDraftPaymentMethodId(pmId);
    setDraftCreditCardId(""); // Reset credit card when PM changes
  }

  // Fetch invoice info to pre-select credit card when modal opens
  const [invoices, setInvoices] = useState<{id: string, credit_card_id: string, reference_month: string}[]>([]);
  
  useEffect(() => {
    if (open && creditCards.length > 0) {
      // Fetch invoices to map transaction.invoice_id to credit_card_id
      invoicesApi.list().then(invList => {
        setInvoices(invList.map(i => ({ id: i.id, credit_card_id: i.credit_card_id, reference_month: i.reference_month })));
        // If transaction has invoice_id, find the credit card
        if (transaction.invoice_id) {
          const inv = invList.find(i => i.id === transaction.invoice_id);
          if (inv) {
            const cc = creditCards.find(c => c.id === inv.credit_card_id);
            if (cc) {
              // Also set the payment method if it's different
              const pm = paymentMethods.find(p => p.id === cc.payment_method_id);
              if (pm) {
                setDraftPaymentMethodId(pm.id);
              }
              setDraftCreditCardId(cc.id);
            }
          }
        } else {
          setDraftCreditCardId("");
        }
      }).catch(() => setInvoices([]));
      
      setDirection(initialDirection);
      setDraftFamilyId(initialFamilyId);
      setDraftCategoryId(initialCategoryId);
      setDraftTagId(transaction.tag_id);
      setDraftPaymentMethodId(initialPaymentMethod?.id ?? "");
      setDraftDate(transaction.date_transaction.slice(0, 16));
      setDraftValue(transaction.value.toString());
      setDraftCurrency(transaction.currency);
      setDraftDescription(transaction.description ?? "");
      setDraftSymbol(transaction.symbol ?? "");
      setDraftQuantity(transaction.quantity?.toString() ?? "");
      setDraftIndex(transaction.index ?? "");
      setDraftIndexRate(transaction.index_rate?.toString() ?? "");
      setDraftRecurring(transaction.is_recurring ?? false);
      setShowInvestment(!!(transaction.symbol || transaction.index));
      setShowAdvanced(false);
      setPendingDelete(false);
    }
  }, [open, transaction, initialFamilyId, initialCategoryId, initialDirection, initialPaymentMethod, creditCards, paymentMethods]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(draftValue);
    if (!draftTagId || !draftAccountId || !draftPaymentMethodId || isNaN(val) || val <= 0) return;
    
    setSaving(true);
    try {
      // Prepare update payload
      const updateData: any = {
        tag_id: draftTagId,
        account_id: draftAccountId,
        date_transaction: new Date(draftDate + ":00").toISOString(),
        value: val,
        currency: draftCurrency,
        description: draftDescription || null,
        quantity: draftQuantity ? parseFloat(draftQuantity) : null,
        symbol: draftSymbol || null,
        index_rate: draftIndexRate ? parseFloat(draftIndexRate) : null,
        index: draftIndex || null,
        is_recurring: draftRecurring || undefined,
      };
      
      // If credit card is selected, send credit_card_id for backend to handle invoice
      if (draftCreditCardId && selectedPaymentMethod?.type === "credit") {
        updateData.credit_card_id = draftCreditCardId;
      }
      
      await transactionsApi.update(transaction.id, updateData);
      onUpdated();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!pendingDelete) { setPendingDelete(true); return; }
    setDeleting(true);
    await transactionsApi.delete(transaction.id);
    onDeleted();
    onClose();
  }

  const inputCls =
    "w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all";
  const selectCls =
    "w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary/60 transition-all appearance-none";
  const labelCls = "block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2";

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <div className={`bg-surface-2 border border-border rounded-2xl w-full max-w-lg shadow-2xl transition-transform duration-300 ${open ? "scale-100" : "scale-95"}`}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4">
            <h2 className="text-base font-semibold text-text-primary">Editar transação</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-text-primary hover:bg-surface-3 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <form onSubmit={save} className="overflow-y-auto px-6 pb-6 space-y-4" style={{ maxHeight: "calc(100dvh - 140px)" }}>
            {/* Entrada / Saída toggle */}
            <div>
              <div className="flex rounded-xl overflow-hidden border border-border">
                <button
                  type="button"
                  onClick={() => changeDirection("in")}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                    direction === "in" ? "bg-accent text-white" : "bg-surface text-text-secondary hover:bg-surface-3"
                  }`}>
                  ↓ Entrada
                </button>
                <button
                  type="button"
                  onClick={() => changeDirection("out")}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                    direction === "out" ? "bg-danger text-white" : "bg-surface text-text-secondary hover:bg-surface-3"
                  }`}>
                  ↑ Saída
                </button>
              </div>
            </div>

            {/* Account Selection */}
            <div>
              <label className={labelCls}>
                {direction === "in" ? "Conta de destino" : "Conta"}
              </label>
              <select
                value={draftAccountId}
                onChange={(e) => handleAccountChange(e.target.value)}
                required
                className={selectCls}
              >
                <option value="">Selecionar conta...</option>
                {accounts.filter(a => a.is_active).map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method Selection */}
            <div>
              <label className={labelCls}>
                Método de pagamento
              </label>
              <select
                value={draftPaymentMethodId}
                onChange={(e) => handlePaymentMethodChange(e.target.value)}
                required
                disabled={!draftAccountId || availablePaymentMethods.length === 0}
                className={`${selectCls} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <option value="">{draftAccountId ? "Selecionar método..." : "Selecione uma conta primeiro"}</option>
                {availablePaymentMethods.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {PM_TYPE_LABELS[pm.type] || pm.type} {pm.name !== PM_TYPE_LABELS[pm.type] ? `· ${pm.name}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Credit Card Selection */}
            {selectedPaymentMethod?.type === "credit" && availableCreditCards.length > 0 && (
              <div>
                <label className={labelCls}>Cartão de crédito</label>
                <select
                  value={draftCreditCardId}
                  onChange={(e) => setDraftCreditCardId(e.target.value)}
                  className={selectCls}
                >
                  <option value="">Selecionar cartão...</option>
                  {availableCreditCards.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.name} (Fecha: dia {cc.closing_day}, Vence: dia {cc.due_day})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Value + Currency */}
            <div>
              <label className={labelCls}>Valor</label>
              <div className="flex gap-2">
                <input type="number" inputMode="decimal" placeholder="0,00" value={draftValue}
                  onChange={e => setDraftValue(e.target.value)}
                  className={`${inputCls} text-right flex-1 text-lg font-mono font-semibold`} />
                <div className="grid grid-cols-3 gap-1">
                  {(["BRL", "USD", "EUR"] as Currency[]).map(c => (
                    <button key={c} type="button" onClick={() => setDraftCurrency(c)}
                      className={`px-3 py-3 rounded-xl text-xs font-semibold border transition-all duration-150 ${
                        draftCurrency === c ? "bg-primary/15 border-primary/40 text-primary" : "bg-surface border-border text-muted"
                      }`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className={labelCls}>Data e hora</label>
              <input type="datetime-local" value={draftDate}
                onChange={e => setDraftDate(e.target.value)}
                className={`${inputCls} [color-scheme:dark]`} />
            </div>

            {/* Taxonomy: Family → Category → Tag */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Família</label>
                <select value={draftFamilyId}
                  onChange={e => { setDraftFamilyId(e.target.value); setDraftCategoryId(""); setDraftTagId(""); }}
                  className={selectCls}>
                  <option value="">Família</option>
                  {visibleFamilies.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Categoria</label>
                <select value={draftCategoryId}
                  onChange={e => { setDraftCategoryId(e.target.value); setDraftTagId(""); }}
                  disabled={!draftFamilyId}
                  className={`${selectCls} disabled:opacity-40`}>
                  <option value="">Categoria</option>
                  {editCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Tag</label>
                <select value={draftTagId} onChange={e => setDraftTagId(e.target.value)}
                  disabled={!draftCategoryId}
                  className={`${selectCls} disabled:opacity-40`}>
                  <option value="">Tag</option>
                  {editTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={labelCls}>Descrição</label>
              <input type="text" placeholder="Descrição opcional" value={draftDescription}
                onChange={e => setDraftDescription(e.target.value)}
                className={inputCls} />
            </div>

            {/* Advanced toggle */}
            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-xs text-muted hover:text-text-primary transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-90" : ""}`}>
                <path d="M9 18l6-6-6-6" />
              </svg>
              {showAdvanced ? "Ocultar opções avançadas" : "Opções avançadas"}
            </button>

            {showAdvanced && (
              <div className="space-y-4 border-t border-border pt-4">
                {/* Recurring */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-text-primary font-medium">Recorrente</div>
                    <div className="text-xs text-muted">Marcar como transação recorrente</div>
                  </div>
                  <button type="button" onClick={() => setDraftRecurring(!draftRecurring)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${draftRecurring ? "bg-primary" : "bg-surface-3 border border-border"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${draftRecurring ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>

                {/* Investment fields */}
                <button type="button" onClick={() => setShowInvestment(!showInvestment)}
                  className="flex items-center gap-2 text-xs text-muted hover:text-text-primary transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                    className={`w-3.5 h-3.5 transition-transform ${showInvestment ? "rotate-90" : ""}`}>
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                  {showInvestment ? "Ocultar campos de investimento" : "Campos de investimento"}
                </button>

                {showInvestment && (
                  <div className="space-y-4 border-t border-border pt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Símbolo</label>
                        <input type="text" placeholder="BTC, PETR4…" value={draftSymbol}
                          onChange={e => setDraftSymbol(e.target.value)}
                          className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Quantidade</label>
                        <input type="number" inputMode="decimal" placeholder="0" value={draftQuantity}
                          onChange={e => setDraftQuantity(e.target.value)}
                          className={`${inputCls} text-right`} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Índice</label>
                        <input type="text" placeholder="CDI, IPCA…" value={draftIndex}
                          onChange={e => setDraftIndex(e.target.value)}
                          className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Taxa %</label>
                        <input type="number" inputMode="decimal" placeholder="12.5" value={draftIndexRate}
                          onChange={e => setDraftIndexRate(e.target.value)}
                          className={`${inputCls} text-right`} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button type="submit" disabled={saving || !draftTagId || !draftPaymentMethodId || !draftValue}
                className="w-full py-3.5 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white font-semibold rounded-xl text-sm transition-all duration-150">
                {saving ? "Salvando…" : "Salvar alterações"}
              </button>
              <button type="button" onClick={remove} disabled={deleting}
                className={`w-full py-3 rounded-xl text-sm font-medium border transition-all duration-150 ${
                  pendingDelete ? "bg-danger/15 border-danger/40 text-danger" : "bg-transparent border-border text-muted hover:border-danger/40 hover:text-danger"
                }`}>
                {deleting ? "Excluindo…" : pendingDelete ? "Confirmar exclusão" : "Excluir transação"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
