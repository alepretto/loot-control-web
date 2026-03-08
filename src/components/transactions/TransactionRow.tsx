"use client";

import { useState } from "react";
import { Transaction, Category, Tag, transactionsApi } from "@/lib/api";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Props {
  transaction: Transaction;
  categories: Category[];
  tags: Tag[];
  onUpdated: () => void;
  onDeleted: () => void;
}

export function TransactionRow({ transaction, categories, tags, onUpdated, onDeleted }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(transaction);
  const [saving, setSaving] = useState(false);

  const tag = tags.find((t) => t.id === transaction.tag_id);
  const category = categories.find((c) => c.id === tag?.category_id);
  const isIncome = tag?.type === "income";

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

  const cellCls = "px-3 py-1.5 text-sm border-b border-r border-border";
  const inputCls =
    "bg-background border border-primary rounded px-1 py-0.5 text-xs text-text-primary focus:outline-none w-full";

  if (!editing) {
    return (
      <tr onDoubleClick={() => setEditing(true)} className="cursor-default group hover:bg-surface-2">
        <td className={`${cellCls} font-mono text-xs text-muted`}>
          {formatDate(transaction.date_transaction)}
        </td>
        <td className={cellCls}>
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              isIncome
                ? "bg-accent/20 text-accent"
                : "bg-danger/20 text-danger"
            }`}
          >
            {isIncome ? "Entrada" : "Saída"}
          </span>
        </td>
        <td className={`${cellCls} text-muted`}>{category?.name ?? "—"}</td>
        <td className={cellCls}>{tag?.name ?? "—"}</td>
        <td className={`${cellCls} font-mono text-right`}>
          <span className={isIncome ? "text-accent" : "text-text-primary"}>
            {formatCurrency(transaction.value, transaction.currency)}
          </span>
        </td>
        <td className={`${cellCls} text-muted`}>{transaction.currency}</td>
        <td className={`${cellCls} font-mono text-right text-muted`}>
          {transaction.quantity ?? ""}
        </td>
        <td className={`${cellCls} text-muted`}>{transaction.symbol ?? ""}</td>
        <td className={`${cellCls} font-mono text-right text-muted`}>
          {transaction.index_rate ?? ""}
        </td>
        <td className={`${cellCls} text-muted`}>{transaction.index ?? ""}</td>
        <td className={`${cellCls} opacity-0 group-hover:opacity-100 transition-opacity`}>
          <button onClick={remove} className="text-danger text-xs hover:underline">
            ✕
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-primary/5">
      <td className={cellCls}>
        <input
          type="datetime-local"
          value={draft.date_transaction.slice(0, 16)}
          onChange={(e) => setDraft({ ...draft, date_transaction: e.target.value })}
          className={inputCls}
        />
      </td>
      <td className={cellCls} colSpan={3}>
        <select
          value={draft.tag_id}
          onChange={(e) => setDraft({ ...draft, tag_id: e.target.value })}
          className="bg-background border border-primary rounded px-1 py-0.5 text-xs text-text-primary focus:outline-none"
        >
          {tags.map((t) => {
            const cat = categories.find((c) => c.id === t.category_id);
            return (
              <option key={t.id} value={t.id}>
                {cat?.name} / {t.name}
              </option>
            );
          })}
        </select>
      </td>
      <td className={cellCls}>
        <input
          type="number"
          value={draft.value}
          onChange={(e) => setDraft({ ...draft, value: parseFloat(e.target.value) })}
          className={`${inputCls} text-right w-24`}
        />
      </td>
      <td className={cellCls}>
        <select
          value={draft.currency}
          onChange={(e) =>
            setDraft({ ...draft, currency: e.target.value as Transaction["currency"] })
          }
          className="bg-background border border-primary rounded px-1 py-0.5 text-xs text-text-primary focus:outline-none"
        >
          {["BRL", "USD", "EUR"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </td>
      <td className={cellCls}>
        <input
          type="number"
          placeholder="—"
          value={draft.quantity ?? ""}
          onChange={(e) =>
            setDraft({ ...draft, quantity: e.target.value ? parseFloat(e.target.value) : null })
          }
          className={`${inputCls} text-right w-16`}
        />
      </td>
      <td className={cellCls}>
        <input
          type="text"
          placeholder="—"
          value={draft.symbol ?? ""}
          onChange={(e) => setDraft({ ...draft, symbol: e.target.value || null })}
          className={`${inputCls} w-16`}
        />
      </td>
      <td className={cellCls}>
        <input
          type="number"
          placeholder="—"
          value={draft.index_rate ?? ""}
          onChange={(e) =>
            setDraft({ ...draft, index_rate: e.target.value ? parseFloat(e.target.value) : null })
          }
          className={`${inputCls} text-right w-20`}
        />
      </td>
      <td className={cellCls}>
        <input
          type="text"
          placeholder="—"
          value={draft.index ?? ""}
          onChange={(e) => setDraft({ ...draft, index: e.target.value || null })}
          className={`${inputCls} w-16`}
        />
      </td>
      <td className={`${cellCls} flex gap-2 py-2`}>
        <button onClick={save} disabled={saving} className="text-accent text-xs hover:underline">
          ✓
        </button>
        <button onClick={() => setEditing(false)} className="text-text-secondary text-xs hover:underline">
          ✕
        </button>
      </td>
    </tr>
  );
}
