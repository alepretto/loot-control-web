"use client";

import { useState } from "react";
import { Account, Category, Tag, TagFamily, transactionsApi, Currency } from "@/lib/api";

interface Props {
  families: TagFamily[];
  categories: Category[];
  tags: Tag[];
  accounts?: Account[];
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
    family_id: "",
    category_id: "",
    tag_id: "",
    account_id: "",
    value: "",
    currency: "BRL" as Currency,
    quantity: "",
    symbol: "",
    index_rate: "",
    index: "",
  };
}

export function AddTransactionRow({ families, categories, tags, accounts = [], onCreated }: Props) {
  const [form, setForm] = useState(makeEmpty);
  const [saving, setSaving] = useState(false);

  const filteredCategories = categories.filter(
    (c) => form.family_id === "" || c.family_id === form.family_id,
  );
  const filteredTags = tags.filter(
    (t) => form.category_id === "" || t.category_id === form.category_id,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tag_id || !form.account_id || !form.value) return;
    setSaving(true);
    try {
      await transactionsApi.create({
        tag_id: form.tag_id,
        account_id: form.account_id,
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
    "bg-background border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-primary";

  return (
    <div className="sticky top-0 z-10 pb-2 bg-background">
    <div className="bg-surface-2 border border-border rounded-xl px-4 py-3">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
        <input
          type="datetime-local"
          value={form.date_transaction}
          onChange={(e) => setForm({ ...form, date_transaction: e.target.value })}
          className={inputCls}
          style={{ width: 160 }}
        />
        <select
          value={form.account_id}
          onChange={(e) => setForm({ ...form, account_id: e.target.value })}
          required
          className={inputCls}
          style={{ width: 120 }}
        >
          <option value="">Conta</option>
          {accounts.filter((a) => a.is_active).map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <select
          value={form.family_id}
          onChange={(e) =>
            setForm({ ...form, family_id: e.target.value, category_id: "", tag_id: "" })
          }
          className={inputCls}
          style={{ width: 100 }}
        >
          <option value="">Família</option>
          {families.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <select
          value={form.category_id}
          onChange={(e) => setForm({ ...form, category_id: e.target.value, tag_id: "" })}
          className={inputCls}
          style={{ width: 110 }}
        >
          <option value="">Categoria</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={form.tag_id}
          onChange={(e) => setForm({ ...form, tag_id: e.target.value })}
          disabled={!form.category_id}
          className={`${inputCls} disabled:opacity-40`}
          style={{ width: 100 }}
        >
          <option value="">Tag</option>
          {filteredTags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Valor"
          value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })}
          className={`${inputCls} text-right`}
          style={{ width: 90 }}
        />
        <select
          value={form.currency}
          onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}
          className={inputCls}
          style={{ width: 72 }}
        >
          <option>BRL</option>
          <option>USD</option>
          <option>EUR</option>
        </select>
        <input
          type="text"
          placeholder="Symbol"
          value={form.symbol}
          onChange={(e) => setForm({ ...form, symbol: e.target.value })}
          className={inputCls}
          style={{ width: 60 }}
        />
        <input
          type="number"
          placeholder="Taxa"
          value={form.index_rate}
          onChange={(e) => setForm({ ...form, index_rate: e.target.value })}
          className={`${inputCls} text-right`}
          style={{ width: 60 }}
        />
        <button
          type="submit"
          disabled={saving || !form.tag_id || !form.account_id || !form.value}
          className="ml-auto px-4 py-1.5 bg-accent text-background text-xs font-semibold rounded hover:bg-accent/90 disabled:opacity-40 whitespace-nowrap"
        >
          + Adicionar
        </button>
      </form>
    </div>
    </div>
  );
}