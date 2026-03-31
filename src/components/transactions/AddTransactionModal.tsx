"use client";

import { useEffect, useState } from "react";
import { Category, Tag, TagFamily, PaymentMethod, transactionsApi, CategoryType, Currency } from "@/lib/api";

interface Props {
  families: TagFamily[];
  categories: Category[];
  tags: Tag[];
  paymentMethods: PaymentMethod[];
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

function makeEmpty() {
  return {
    date_transaction: brazilDatetime(),
    type: "outcome" as CategoryType,
    family_id: "",
    category_id: "",
    tag_id: "",
    value: "",
    currency: "BRL" as Currency,
    payment_method_id: "",
    quantity: "",
    symbol: "",
    index_rate: "",
    index: "",
  };
}

export function AddTransactionModal({ families, categories, tags, paymentMethods, open, onClose, onCreated }: Props) {
  const [form, setForm] = useState(makeEmpty);
  const [saving, setSaving] = useState(false);
  const [showInvestment, setShowInvestment] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setForm(makeEmpty());
      setShowInvestment(false);
    }
  }, [open]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const filteredCategories = categories.filter(
    (c) =>
      (form.family_id === "" || c.family_id === form.family_id) &&
      tags.some((t) => t.type === form.type && t.category_id === c.id),
  );
  const filteredTags = tags.filter(
    (t) => t.type === form.type && (form.category_id === "" || t.category_id === form.category_id),
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tag_id || !form.value) return;
    setSaving(true);
    try {
      await transactionsApi.create({
        tag_id: form.tag_id,
        date_transaction: new Date(form.date_transaction).toISOString(),
        value: parseFloat(form.value),
        currency: form.currency,
        payment_method_id: form.payment_method_id || null,
        quantity: form.quantity ? parseFloat(form.quantity) : undefined,
        symbol: form.symbol || undefined,
        index_rate: form.index_rate ? parseFloat(form.index_rate) : undefined,
        index: form.index || undefined,
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
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className={`fixed bottom-0 inset-x-0 z-[60] transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="bg-surface-2 rounded-t-2xl border-t border-border max-h-[92dvh] flex flex-col">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-4 pt-1 shrink-0">
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

          {/* Form (scrollable) */}
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 pb-5 space-y-4">

            {/* Tipo — large toggle buttons */}
            <div>
              <label className="block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">Tipo</label>
              <div className="grid grid-cols-2 gap-2">
                {(["outcome", "income"] as CategoryType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, type: t, category_id: "", tag_id: "" })}
                    className={`py-3 rounded-xl text-sm font-semibold border transition-all duration-150 ${
                      form.type === t
                        ? t === "outcome"
                          ? "bg-danger/15 border-danger/40 text-danger"
                          : "bg-accent/15 border-accent/40 text-accent"
                        : "bg-surface border-border text-muted"
                    }`}
                  >
                    {t === "outcome" ? "Saída" : "Entrada"}
                  </button>
                ))}
              </div>
            </div>

            {/* Data */}
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
                onChange={(e) => setForm({ ...form, family_id: e.target.value, category_id: "", tag_id: "" })}
                className={selectCls}
              >
                <option value="">Selecionar família</option>
                {families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">Categoria</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value, tag_id: "" })}
                className={selectCls}
              >
                <option value="">Selecionar categoria</option>
                {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                {filteredTags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {/* Valor + Moeda */}
            <div>
              <label className="block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">Valor</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  className={`${inputCls} text-right flex-1`}
                />
                <div className="grid grid-cols-3 gap-1">
                  {(["BRL", "USD", "EUR"] as Currency[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, currency: c })}
                      className={`px-3 py-3 rounded-xl text-xs font-semibold border transition-all duration-150 ${
                        form.currency === c
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "bg-surface border-border text-muted"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Método de Pagamento */}
            {paymentMethods.filter((pm) => pm.is_active).length > 0 && (
              <div>
                <label className="block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">Método de Pagamento</label>
                <select
                  value={form.payment_method_id}
                  onChange={(e) => setForm({ ...form, payment_method_id: e.target.value })}
                  className={selectCls}
                >
                  <option value="">Não informado</option>
                  {paymentMethods.filter((pm) => pm.is_active).map((pm) => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Investimento toggle */}
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
                    <label className="block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">Symbol</label>
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
                    <label className="block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">Taxa %</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="12.5"
                      value={form.index_rate}
                      onChange={(e) => setForm({ ...form, index_rate: e.target.value })}
                      className={`${inputCls} text-right`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={saving || !form.tag_id || !form.value}
              className="w-full py-4 bg-accent hover:bg-accent/90 disabled:opacity-40 text-background font-semibold rounded-xl text-sm transition-all duration-150 disabled:cursor-not-allowed mt-2"
            >
              {saving ? "Salvando…" : "Adicionar transação"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
