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
  const isIncome = category?.type === "income";

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

  const cellCls = "px-3 py-1.5 text-sm border-b border-r border-[#2d3154]";
  const inputCls =
    "bg-[#0f1117] border border-indigo-500 rounded px-1 py-0.5 text-xs text-[#f1f5f9] focus:outline-none w-full";

  if (!editing) {
    return (
      <tr onDoubleClick={() => setEditing(true)} className="cursor-default group hover:bg-[#252840]">
        <td className={`${cellCls} font-mono text-xs text-[#94a3b8]`}>
          {formatDate(transaction.date_transaction)}
        </td>
        <td className={cellCls}>
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              isIncome
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {isIncome ? "Entrada" : "Saída"}
          </span>
        </td>
        <td className={`${cellCls} text-[#94a3b8]`}>{category?.name ?? "—"}</td>
        <td className={cellCls}>{tag?.name ?? "—"}</td>
        <td className={`${cellCls} font-mono text-right`}>
          <span className={isIncome ? "text-emerald-400" : "text-[#f1f5f9]"}>
            {formatCurrency(transaction.value, transaction.currency)}
          </span>
        </td>
        <td className={`${cellCls} text-[#94a3b8]`}>{transaction.currency}</td>
        <td className={`${cellCls} font-mono text-right text-[#94a3b8]`}>
          {transaction.quantity ?? ""}
        </td>
        <td className={`${cellCls} text-[#94a3b8]`}>{transaction.symbol ?? ""}</td>
        <td className={`${cellCls} font-mono text-right text-[#94a3b8]`}>
          {transaction.index_rate ?? ""}
        </td>
        <td className={`${cellCls} text-[#94a3b8]`}>{transaction.index ?? ""}</td>
        <td className={`${cellCls} opacity-0 group-hover:opacity-100 transition-opacity`}>
          <button onClick={remove} className="text-red-400 text-xs hover:underline">
            ✕
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-indigo-500/5">
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
          className="bg-[#0f1117] border border-indigo-500 rounded px-1 py-0.5 text-xs text-[#f1f5f9] focus:outline-none"
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
          className="bg-[#0f1117] border border-indigo-500 rounded px-1 py-0.5 text-xs text-[#f1f5f9] focus:outline-none"
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
        <button onClick={save} disabled={saving} className="text-emerald-400 text-xs hover:underline">
          ✓
        </button>
        <button onClick={() => setEditing(false)} className="text-[#6b7280] text-xs hover:underline">
          ✕
        </button>
      </td>
    </tr>
  );
}
