"use client";

import { useState } from "react";
import { Category, Tag, TagFamily, transactionsApi, CategoryType, Currency } from "@/lib/api";

interface Props {
  families: TagFamily[];
  categories: Category[];
  tags: Tag[];
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
    quantity: "",
    symbol: "",
    index_rate: "",
    index: "",
  };
}

export function AddTransactionRow({ families, categories, tags, onCreated }: Props) {
  const [form, setForm] = useState(makeEmpty);
  const [saving, setSaving] = useState(false);

  const filteredCategories = categories.filter(
    (c) =>
      (form.family_id === "" || c.family_id === form.family_id) &&
      tags.some((t) => t.type === form.type && t.category_id === c.id)
  );
  const filteredTags = tags.filter(
    (t) => t.type === form.type && (form.category_id === "" || t.category_id === form.category_id)
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
        quantity: form.quantity ? parseFloat(form.quantity) : undefined,
        symbol: form.symbol || undefined,
        index_rate: form.index_rate ? parseFloat(form.index_rate) : undefined,
        index: form.index || undefined,
      });
      setForm(makeEmpty());
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "bg-surface border border-border rounded px-1 py-0.5 text-xs text-text-primary focus:outline-none w-full";
  const selectCls =
    "bg-surface border border-border rounded px-1 py-0.5 text-xs text-text-primary focus:outline-none";

  return (
    <tr className="bg-accent/5 border-t-2 border-accent/30">
      <td className="px-3 py-1.5">
        <input
          type="datetime-local"
          value={form.date_transaction}
          onChange={(e) => setForm({ ...form, date_transaction: e.target.value })}
          className={inputCls}
        />
      </td>
      <td className="px-3 py-1.5">
        {/* Tipo: filtra categorias e tags disponíveis */}
        <select
          value={form.type}
          onChange={(e) =>
            setForm({ ...form, type: e.target.value as CategoryType, category_id: "", tag_id: "" })
          }
          className={selectCls}
        >
          <option value="outcome">Saída</option>
          <option value="income">Entrada</option>
        </select>
      </td>
      <td className="px-3 py-1.5">
        <select
          value={form.family_id}
          onChange={(e) => setForm({ ...form, family_id: e.target.value, category_id: "", tag_id: "" })}
          className={selectCls}
        >
          <option value="">Família</option>
          {families.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-1.5">
        {/* Categoria: filtrada por família e tipo */}
        <select
          value={form.category_id}
          onChange={(e) => setForm({ ...form, category_id: e.target.value, tag_id: "" })}
          className={selectCls}
        >
          <option value="">Categoria</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-1.5">
        <select
          value={form.tag_id}
          onChange={(e) => setForm({ ...form, tag_id: e.target.value })}
          disabled={!form.category_id}
          className={`${selectCls} disabled:opacity-40`}
        >
          <option value="">Tag</option>
          {filteredTags.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-1.5">
        <input
          type="number"
          placeholder="0,00"
          value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })}
          className={`${inputCls} text-right`}
        />
      </td>
      <td className="px-3 py-1.5">
        <select
          value={form.currency}
          onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}
          className={selectCls}
        >
          <option>BRL</option>
          <option>USD</option>
          <option>EUR</option>
        </select>
      </td>
      <td className="px-3 py-1.5">
        <input type="number" placeholder="—" value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          className={`${inputCls} text-right`} />
      </td>
      <td className="px-3 py-1.5">
        <input type="text" placeholder="—" value={form.symbol}
          onChange={(e) => setForm({ ...form, symbol: e.target.value })}
          className={inputCls} />
      </td>
      <td className="px-3 py-1.5">
        <input type="number" placeholder="—" value={form.index_rate}
          onChange={(e) => setForm({ ...form, index_rate: e.target.value })}
          className={`${inputCls} text-right`} />
      </td>
      <td className="px-3 py-1.5">
        <input type="text" placeholder="—" value={form.index}
          onChange={(e) => setForm({ ...form, index: e.target.value })}
          className={inputCls} />
      </td>
      <td className="px-3 py-1.5">
        <button
          onClick={handleSubmit}
          disabled={saving || !form.tag_id || !form.value}
          className="text-accent text-xs font-medium hover:underline disabled:opacity-40 whitespace-nowrap"
        >
          + Add
        </button>
      </td>
    </tr>
  );
}
