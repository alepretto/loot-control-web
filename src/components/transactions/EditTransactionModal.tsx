"use client";

import { useEffect, useState } from "react";
import { Transaction, Category, Tag, TagFamily, PaymentMethod, transactionsApi, Currency } from "@/lib/api";

interface Props {
  transaction: Transaction;
  families: TagFamily[];
  categories: Category[];
  tags: Tag[];
  paymentMethods: PaymentMethod[];
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

export function EditTransactionModal({
  transaction, families, categories, tags, paymentMethods, open, onClose, onUpdated, onDeleted,
}: Props) {
  const [draft, setDraft] = useState(transaction);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [showInvestment, setShowInvestment] = useState(false);

  const tag = tags.find(t => t.id === transaction.tag_id);
  const category = categories.find(c => c.id === tag?.category_id);

  const [draftFamilyId, setDraftFamilyId] = useState(category?.family_id ?? "");
  const [draftCategoryId, setDraftCategoryId] = useState(category?.id ?? "");

  useEffect(() => {
    if (open) {
      setDraft(transaction);
      const t = tags.find(x => x.id === transaction.tag_id);
      const c = categories.find(x => x.id === t?.category_id);
      setDraftFamilyId(c?.family_id ?? "");
      setDraftCategoryId(c?.id ?? "");
      setShowInvestment(!!(transaction.symbol || transaction.index));
      setPendingDelete(false);
    }
  }, [open, transaction, tags, categories]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const editCategories = draftFamilyId
    ? categories.filter(c => c.family_id === draftFamilyId)
    : categories;
  const editTags = draftCategoryId
    ? tags.filter(t => t.category_id === draftCategoryId)
    : draftFamilyId
    ? tags.filter(t => editCategories.some(c => c.id === t.category_id))
    : tags;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.tag_id || !draft.value) return;
    setSaving(true);
    try {
      await transactionsApi.update(transaction.id, {
        tag_id: draft.tag_id,
        date_transaction: new Date(draft.date_transaction).toISOString(),
        value: draft.value,
        currency: draft.currency,
        payment_method_id: draft.payment_method_id ?? null,
        quantity: draft.quantity ?? undefined,
        symbol: draft.symbol ?? undefined,
        index_rate: draft.index_rate ?? undefined,
        index: draft.index ?? undefined,
      });
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

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <div
        className={`fixed bottom-0 inset-x-0 z-[60] transition-transform duration-300 ease-out ${open ? "translate-y-0" : "translate-y-full"}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="bg-surface-2 rounded-t-2xl border-t border-border max-h-[92dvh] flex flex-col">
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>
          <div className="flex items-center justify-between px-5 pb-4 pt-1 shrink-0">
            <h2 className="text-base font-semibold text-text-primary">Editar transação</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-text-primary hover:bg-surface-3 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <form onSubmit={save} className="overflow-y-auto flex-1 px-5 pb-5 space-y-4">
            {/* Data */}
            <div>
              <label className={labelCls}>Data e hora</label>
              <input type="datetime-local" value={draft.date_transaction.slice(0, 16)}
                onChange={e => setDraft({ ...draft, date_transaction: e.target.value })}
                className={inputCls} />
            </div>

            {/* Família */}
            <div>
              <label className={labelCls}>Família</label>
              <select value={draftFamilyId}
                onChange={e => { setDraftFamilyId(e.target.value); setDraftCategoryId(""); setDraft({ ...draft, tag_id: "" }); }}
                className={selectCls}>
                <option value="">Selecionar família</option>
                {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            {/* Categoria */}
            <div>
              <label className={labelCls}>Categoria</label>
              <select value={draftCategoryId}
                onChange={e => { setDraftCategoryId(e.target.value); setDraft({ ...draft, tag_id: "" }); }}
                className={selectCls}>
                <option value="">Selecionar categoria</option>
                {editCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Tag */}
            <div>
              <label className={labelCls}>Tag</label>
              <select value={draft.tag_id} onChange={e => setDraft({ ...draft, tag_id: e.target.value })}
                disabled={!draftCategoryId} className={`${selectCls} disabled:opacity-40`}>
                <option value="">Selecionar tag</option>
                {editTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {/* Valor + Moeda */}
            <div>
              <label className={labelCls}>Valor</label>
              <div className="flex gap-2">
                <input type="number" inputMode="decimal" placeholder="0,00" value={draft.value}
                  onChange={e => setDraft({ ...draft, value: parseFloat(e.target.value) })}
                  className={`${inputCls} text-right flex-1`} />
                <div className="grid grid-cols-3 gap-1">
                  {(["BRL", "USD", "EUR"] as Currency[]).map(c => (
                    <button key={c} type="button" onClick={() => setDraft({ ...draft, currency: c })}
                      className={`px-3 py-3 rounded-xl text-xs font-semibold border transition-all duration-150 ${
                        draft.currency === c ? "bg-primary/15 border-primary/40 text-primary" : "bg-surface border-border text-muted"
                      }`}>
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
                  value={draft.payment_method_id ?? ""}
                  onChange={(e) => setDraft({ ...draft, payment_method_id: e.target.value || null })}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary/60 transition-all appearance-none"
                >
                  <option value="">Não informado</option>
                  {paymentMethods.filter((pm) => pm.is_active).map((pm) => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Investment fields toggle */}
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
                    <label className={labelCls}>Symbol</label>
                    <input type="text" placeholder="BTC, PETR4…" value={draft.symbol ?? ""}
                      onChange={e => setDraft({ ...draft, symbol: e.target.value || null })}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Quantidade</label>
                    <input type="number" inputMode="decimal" placeholder="0" value={draft.quantity ?? ""}
                      onChange={e => setDraft({ ...draft, quantity: e.target.value ? parseFloat(e.target.value) : null })}
                      className={`${inputCls} text-right`} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Índice</label>
                    <input type="text" placeholder="CDI, IPCA…" value={draft.index ?? ""}
                      onChange={e => setDraft({ ...draft, index: e.target.value || null })}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Taxa %</label>
                    <input type="number" inputMode="decimal" placeholder="12.5" value={draft.index_rate ?? ""}
                      onChange={e => setDraft({ ...draft, index_rate: e.target.value ? parseFloat(e.target.value) : null })}
                      className={`${inputCls} text-right`} />
                  </div>
                </div>
              </div>
            )}

            {/* Save */}
            <button type="submit" disabled={saving || !draft.tag_id || !draft.value}
              className="w-full py-4 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white font-semibold rounded-xl text-sm transition-all duration-150 mt-2">
              {saving ? "Salvando…" : "Salvar alterações"}
            </button>

            {/* Delete */}
            <button type="button" onClick={remove} disabled={deleting}
              className={`w-full py-3 rounded-xl text-sm font-medium border transition-all duration-150 ${
                pendingDelete
                  ? "bg-danger/15 border-danger/40 text-danger"
                  : "bg-transparent border-border text-muted hover:border-danger/40 hover:text-danger"
              }`}>
              {deleting ? "Excluindo…" : pendingDelete ? "Confirmar exclusão" : "Excluir transação"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

const labelCls = "block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2";
