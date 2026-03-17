"use client";

import { useState } from "react";
import { Transaction, Category, Tag, TagFamily, transactionsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface Props {
  transaction: Transaction;
  families: TagFamily[];
  categories: Category[];
  tags: Tag[];
  onUpdated: () => void;
  onDeleted: () => void;
}

const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function cardDate(dateStr: string) {
  const d = new Date(dateStr);
  return {
    day: String(d.getDate()).padStart(2, "0"),
    month: MONTHS_PT[d.getMonth()],
    year: d.getFullYear(),
  };
}

export function TransactionRow({ transaction, families, categories, tags, onUpdated, onDeleted }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(transaction);
  const [saving, setSaving] = useState(false);

  const tag = tags.find((t) => t.id === transaction.tag_id);
  const category = categories.find((c) => c.id === tag?.category_id);
  const family = families.find((f) => f.id === category?.family_id);
  const isIncome = tag?.type === "income";

  const [draftFamilyId, setDraftFamilyId] = useState(family?.id ?? "");
  const [draftCategoryId, setDraftCategoryId] = useState(category?.id ?? "");

  const editCategories = draftFamilyId
    ? categories.filter((c) => c.family_id === draftFamilyId)
    : categories;
  const editTags = draftCategoryId
    ? tags.filter((t) => t.category_id === draftCategoryId)
    : draftFamilyId
    ? tags.filter((t) => editCategories.some((c) => c.id === t.category_id))
    : tags;

  async function save() {
    setSaving(true);
    try {
      await transactionsApi.update(transaction.id, {
        tag_id: draft.tag_id,
        date_transaction: draft.date_transaction,
        value: draft.value,
        currency: draft.currency,
        quantity: draft.quantity ?? undefined,
        symbol: draft.symbol ?? undefined,
        index_rate: draft.index_rate ?? undefined,
        index: draft.index ?? undefined,
      });
      onUpdated();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Excluir transação?")) return;
    await transactionsApi.delete(transaction.id);
    onDeleted();
  }

  const inputCls =
    "bg-background border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-primary";

  // ── View mode ────────────────────────────────────────────────────────────────
  if (!editing) {
    const { day, month, year } = cardDate(transaction.date_transaction);
    const breadcrumb = [family?.name, category?.name].filter(Boolean).join(" · ");

    return (
      <div
        onDoubleClick={() => setEditing(true)}
        className="bg-surface border border-border rounded-xl px-4 py-3 hover:bg-surface-2 hover:border-surface-3 transition-colors cursor-default group"
      >
        <div className="flex items-center gap-4">
          {/* Date block */}
          <div className="w-10 flex-shrink-0 text-center select-none">
            <div className="text-2xl font-bold text-text-primary leading-none tabular-nums">{day}</div>
            <div className="text-[10px] text-muted uppercase tracking-wide mt-0.5">{month}</div>
            <div className="text-[10px] text-muted">{year}</div>
          </div>

          {/* Divider */}
          <div className="w-px h-10 bg-border flex-shrink-0" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Row 1: tag + value */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isIncome ? "bg-accent" : "bg-danger"}`} />
                <span className="text-sm font-medium text-text-primary truncate">{tag?.name ?? "—"}</span>
                {transaction.symbol && (
                  <span className="flex-shrink-0 text-xs font-mono bg-surface-3 border border-border px-1.5 py-0.5 rounded text-muted">
                    {transaction.symbol}
                    {transaction.quantity != null ? ` · ${transaction.quantity}` : ""}
                  </span>
                )}
                {!transaction.symbol && transaction.index && (
                  <span className="flex-shrink-0 text-xs font-mono bg-surface-3 border border-border px-1.5 py-0.5 rounded text-muted">
                    {transaction.index}
                    {transaction.index_rate != null ? ` ${transaction.index_rate}%` : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`font-mono text-sm font-semibold tabular-nums ${isIncome ? "text-accent" : "text-text-primary"}`}>
                  {isIncome ? "+" : ""}
                  {formatCurrency(transaction.value, transaction.currency)}
                </span>
                {transaction.currency !== "BRL" && (
                  <span className="text-[10px] font-medium text-muted bg-surface-3 border border-border px-1.5 py-0.5 rounded">
                    {transaction.currency}
                  </span>
                )}
              </div>
            </div>

            {/* Row 2: breadcrumb */}
            {breadcrumb && (
              <div className="text-xs text-muted mt-0.5 ml-3.5 truncate">{breadcrumb}</div>
            )}
          </div>

          {/* Delete (hover) */}
          <button
            onClick={remove}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-danger text-xs flex-shrink-0 w-4 text-center"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // ── Edit mode ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-primary/5 border border-primary/30 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="datetime-local"
          value={draft.date_transaction.slice(0, 16)}
          onChange={(e) => setDraft({ ...draft, date_transaction: e.target.value })}
          className={inputCls}
          style={{ width: 160 }}
        />
        <select
          value={draftFamilyId}
          onChange={(e) => {
            setDraftFamilyId(e.target.value);
            setDraftCategoryId("");
            setDraft({ ...draft, tag_id: "" });
          }}
          className={inputCls}
          style={{ width: 110 }}
        >
          <option value="">Família</option>
          {families.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <select
          value={draftCategoryId}
          onChange={(e) => {
            setDraftCategoryId(e.target.value);
            setDraft({ ...draft, tag_id: "" });
          }}
          className={inputCls}
          style={{ width: 120 }}
        >
          <option value="">Categoria</option>
          {editCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={draft.tag_id}
          onChange={(e) => setDraft({ ...draft, tag_id: e.target.value })}
          disabled={!draftCategoryId}
          className={`${inputCls} disabled:opacity-40`}
          style={{ width: 120 }}
        >
          <option value="">Tag</option>
          {editTags.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <input
          type="number"
          value={draft.value}
          onChange={(e) => setDraft({ ...draft, value: parseFloat(e.target.value) })}
          className={`${inputCls} text-right`}
          style={{ width: 100 }}
        />
        <select
          value={draft.currency}
          onChange={(e) => setDraft({ ...draft, currency: e.target.value as Transaction["currency"] })}
          className={inputCls}
          style={{ width: 72 }}
        >
          {["BRL", "USD", "EUR"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Symbol"
          value={draft.symbol ?? ""}
          onChange={(e) => setDraft({ ...draft, symbol: e.target.value || null })}
          className={inputCls}
          style={{ width: 72 }}
        />
        <input
          type="number"
          placeholder="Qtd"
          value={draft.quantity ?? ""}
          onChange={(e) =>
            setDraft({ ...draft, quantity: e.target.value ? parseFloat(e.target.value) : null })
          }
          className={`${inputCls} text-right`}
          style={{ width: 72 }}
        />
        <input
          type="number"
          placeholder="Index %"
          value={draft.index_rate ?? ""}
          onChange={(e) =>
            setDraft({ ...draft, index_rate: e.target.value ? parseFloat(e.target.value) : null })
          }
          className={`${inputCls} text-right`}
          style={{ width: 80 }}
        />
        <input
          type="text"
          placeholder="Índice"
          value={draft.index ?? ""}
          onChange={(e) => setDraft({ ...draft, index: e.target.value || null })}
          className={inputCls}
          style={{ width: 72 }}
        />
        <div className="flex gap-2 ml-auto">
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-1 bg-accent/20 text-accent text-xs font-medium rounded hover:bg-accent/30 disabled:opacity-40"
          >
            Salvar
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1 bg-surface-3 text-muted text-xs rounded hover:text-text-primary"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
