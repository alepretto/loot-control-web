"use client";

import { useEffect, useState } from "react";
import { PaymentMethod, PaymentMethodCategory, paymentMethodsApi } from "@/lib/api";

const CATEGORY_LABEL: Record<PaymentMethodCategory, string> = {
  money: "Dinheiro",
  benefit: "Benefício",
};

const CATEGORY_COLOR: Record<PaymentMethodCategory, string> = {
  money: "text-primary border-primary/30 bg-primary/10",
  benefit: "text-accent border-accent/30 bg-accent/10",
};

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<PaymentMethodCategory>("money");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Rename state: id → draft name
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  // Delete confirm
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setMethods(await paymentMethodsApi.list());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      await paymentMethodsApi.create({ name: newName.trim(), category: newCategory });
      setNewName("");
      await load();
    } catch {
      setCreateError("Já existe um método com esse nome.");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(pm: PaymentMethod) {
    await paymentMethodsApi.update(pm.id, { is_active: !pm.is_active });
    await load();
  }

  async function handleRenameSubmit(pm: PaymentMethod) {
    if (!renameDraft.trim() || renameDraft.trim() === pm.name) {
      setRenamingId(null);
      return;
    }
    await paymentMethodsApi.update(pm.id, { name: renameDraft.trim() });
    setRenamingId(null);
    await load();
  }

  async function handleDelete(id: string) {
    if (pendingDeleteId !== id) { setPendingDeleteId(id); return; }
    await paymentMethodsApi.delete(id);
    setPendingDeleteId(null);
    await load();
  }

  const groups = (["money", "benefit"] as PaymentMethodCategory[]).map((cat) => ({
    category: cat,
    items: methods.filter((m) => m.category === cat),
  }));

  const inputCls = "bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/60 transition-colors";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">Métodos de Pagamento</h1>
        <p className="text-xs text-muted mt-1">
          Classifique seus gastos entre <span className="text-primary">Dinheiro</span> (crédito, débito, PIX, boleto) e{" "}
          <span className="text-accent">Benefício</span> (VA, VR).
        </p>
      </div>

      {/* ── Create form ─────────────────────────────────────────────────────── */}
      <form onSubmit={handleCreate} className="bg-surface border border-border rounded-xl p-4 mb-6">
        <p className="text-xs uppercase tracking-wider text-muted font-semibold mb-3">Novo método</p>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Ex: Crédito Nubank, Vale Refeição..."
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setCreateError(""); }}
            className={`${inputCls} flex-1 min-w-[180px]`}
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as PaymentMethodCategory)}
            className={inputCls}
          >
            <option value="money">Dinheiro</option>
            <option value="benefit">Benefício</option>
          </select>
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors"
          >
            {creating ? "…" : "Adicionar"}
          </button>
        </div>
        {createError && <p className="text-xs text-danger mt-2">{createError}</p>}
      </form>

      {/* ── Lists by category ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-sm text-muted text-center py-12">Carregando…</div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ category, items }) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${CATEGORY_COLOR[category]}`}>
                  {CATEGORY_LABEL[category]}
                </span>
                <span className="text-xs text-muted">{items.length} método{items.length !== 1 ? "s" : ""}</span>
              </div>

              {items.length === 0 ? (
                <div className="bg-surface border border-border rounded-xl px-4 py-4 text-xs text-muted text-center">
                  Nenhum método cadastrado.
                </div>
              ) : (
                <div className="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden">
                  {items.map((pm) => (
                    <div key={pm.id} className={`flex items-center gap-3 px-4 py-3 ${!pm.is_active ? "opacity-50" : ""}`}>

                      {/* Name / rename input */}
                      <div className="flex-1 min-w-0">
                        {renamingId === pm.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onBlur={() => handleRenameSubmit(pm)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameSubmit(pm);
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            className="bg-background border border-primary/40 rounded px-2 py-1 text-sm text-text-primary focus:outline-none w-full"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-text-primary truncate">{pm.name}</span>
                            {!pm.is_active && (
                              <span className="text-[10px] text-muted border border-border px-1.5 py-0.5 rounded-full shrink-0">
                                Inativo
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Rename */}
                        <button
                          onClick={() => { setRenamingId(pm.id); setRenameDraft(pm.name); setPendingDeleteId(null); }}
                          className="p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-text-primary transition-colors"
                          title="Renomear"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>

                        {/* Toggle active */}
                        <button
                          onClick={() => handleToggleActive(pm)}
                          className="p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-text-primary transition-colors"
                          title={pm.is_active ? "Desativar" : "Ativar"}
                        >
                          {pm.is_active ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                              <rect x="1" y="5" width="22" height="14" rx="7" />
                              <circle cx="16" cy="12" r="3" fill="currentColor" stroke="none" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                              <rect x="1" y="5" width="22" height="14" rx="7" />
                              <circle cx="8" cy="12" r="3" fill="currentColor" stroke="none" />
                            </svg>
                          )}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(pm.id)}
                          onBlur={() => { if (pendingDeleteId === pm.id) setPendingDeleteId(null); }}
                          className={`p-1.5 rounded-lg transition-all text-xs font-medium ${
                            pendingDeleteId === pm.id
                              ? "bg-danger/15 text-danger border border-danger/30 px-2"
                              : "hover:bg-surface-2 text-muted hover:text-danger"
                          }`}
                          title="Excluir"
                        >
                          {pendingDeleteId === pm.id ? "Excluir?" : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
