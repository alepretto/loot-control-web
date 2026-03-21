"use client";

import { useEffect, useState } from "react";
import { Transaction, Category, Tag, TagFamily, transactionsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

interface Props {
  transaction: Transaction;
  families: TagFamily[];
  categories: Category[];
  tags: Tag[];
  grouped?: boolean; // true = in a date group (shows time only, not full date)
  onUpdated: () => void;
  onDeleted: () => void;
  onEditRequest?: () => void; // mobile: opens edit modal in parent
}

const MONTHS_PT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

function localTime(dateStr: string, tz: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(dateStr));
}

function localDate(dateStr: string, tz: string) {
  const d = new Date(dateStr);
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    day: "2-digit", month: "numeric",
  }).formatToParts(d);
  const day = parts.find(p => p.type === "day")?.value ?? "";
  const month = parseInt(parts.find(p => p.type === "month")?.value ?? "1") - 1;
  return `${day} ${MONTHS_PT[month]}`;
}

export function TransactionRow({
  transaction, families, categories, tags,
  grouped = false, onUpdated, onDeleted, onEditRequest,
}: Props) {
  const { timezone, displayCurrency, fmtDisplay } = useSettings();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(transaction);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const tag = tags.find(t => t.id === transaction.tag_id);
  const category = categories.find(c => c.id === tag?.category_id);
  const family = families.find(f => f.id === category?.family_id);
  const isIncome = tag?.type === "income";

  const [draftFamilyId, setDraftFamilyId] = useState(family?.id ?? "");
  const [draftCategoryId, setDraftCategoryId] = useState(category?.id ?? "");

  const editCategories = draftFamilyId
    ? categories.filter(c => c.family_id === draftFamilyId)
    : categories;
  const editTags = draftCategoryId
    ? tags.filter(t => t.category_id === draftCategoryId)
    : draftFamilyId
    ? tags.filter(t => editCategories.some(c => c.id === t.category_id))
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
    if (!pendingDelete) { setPendingDelete(true); return; }
    await transactionsApi.delete(transaction.id);
    onDeleted();
  }

  function handleRowClick() {
    if (isMobile && onEditRequest) onEditRequest();
  }

  const inputCls =
    "bg-background border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-primary";

  // ── Edit mode (desktop inline) ──────────────────────────────────────────────
  if (editing) {
    return (
      <div className="bg-primary/5 border-b border-primary/20 px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <input type="datetime-local" value={draft.date_transaction.slice(0, 16)}
            onChange={e => setDraft({ ...draft, date_transaction: e.target.value })}
            className={inputCls} style={{ width: 160 }} />
          <select value={draftFamilyId}
            onChange={e => { setDraftFamilyId(e.target.value); setDraftCategoryId(""); setDraft({ ...draft, tag_id: "" }); }}
            className={inputCls} style={{ width: 110 }}>
            <option value="">Família</option>
            {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select value={draftCategoryId}
            onChange={e => { setDraftCategoryId(e.target.value); setDraft({ ...draft, tag_id: "" }); }}
            className={inputCls} style={{ width: 120 }}>
            <option value="">Categoria</option>
            {editCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={draft.tag_id} onChange={e => setDraft({ ...draft, tag_id: e.target.value })}
            disabled={!draftCategoryId} className={`${inputCls} disabled:opacity-40`} style={{ width: 120 }}>
            <option value="">Tag</option>
            {editTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input type="number" value={draft.value}
            onChange={e => setDraft({ ...draft, value: parseFloat(e.target.value) })}
            className={`${inputCls} text-right`} style={{ width: 100 }} />
          <select value={draft.currency}
            onChange={e => setDraft({ ...draft, currency: e.target.value as Transaction["currency"] })}
            className={inputCls} style={{ width: 72 }}>
            {["BRL", "USD", "EUR"].map(c => <option key={c}>{c}</option>)}
          </select>
          <input type="text" placeholder="Symbol" value={draft.symbol ?? ""}
            onChange={e => setDraft({ ...draft, symbol: e.target.value || null })}
            className={inputCls} style={{ width: 72 }} />
          <input type="number" placeholder="Qtd" value={draft.quantity ?? ""}
            onChange={e => setDraft({ ...draft, quantity: e.target.value ? parseFloat(e.target.value) : null })}
            className={`${inputCls} text-right`} style={{ width: 72 }} />
          <input type="number" placeholder="Index %" value={draft.index_rate ?? ""}
            onChange={e => setDraft({ ...draft, index_rate: e.target.value ? parseFloat(e.target.value) : null })}
            className={`${inputCls} text-right`} style={{ width: 80 }} />
          <input type="text" placeholder="Índice" value={draft.index ?? ""}
            onChange={e => setDraft({ ...draft, index: e.target.value || null })}
            className={inputCls} style={{ width: 72 }} />
          <div className="flex gap-2 ml-auto">
            <button onClick={save} disabled={saving}
              className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover disabled:opacity-40 transition-colors">
              {saving ? "…" : "Salvar"}
            </button>
            <button onClick={() => setEditing(false)}
              className="px-3 py-1.5 bg-surface-3 text-muted text-xs rounded-lg hover:text-text-primary transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── View mode ───────────────────────────────────────────────────────────────
  const breadcrumb = [family?.name, category?.name].filter(Boolean).join(" · ");
  const timeStr = grouped ? localTime(transaction.date_transaction, timezone) : localDate(transaction.date_transaction, timezone);

  return (
    <div
      onDoubleClick={() => !isMobile && setEditing(true)}
      onClick={handleRowClick}
      className={`group flex items-center gap-3 px-4 py-3 border-b border-border/60 hover:bg-surface-2/60 transition-colors ${isMobile ? "cursor-pointer active:bg-surface-2" : "cursor-default"}`}
    >
      {/* Type indicator */}
      <span className={`shrink-0 w-2 h-2 rounded-full ${isIncome ? "bg-accent" : "bg-danger"}`} />

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary truncate">{tag?.name ?? "—"}</span>
          {transaction.symbol && (
            <span className="shrink-0 text-[10px] font-mono bg-surface-3 border border-border px-1.5 py-0.5 rounded text-muted">
              {transaction.symbol}{transaction.quantity != null ? ` · ${transaction.quantity}` : ""}
            </span>
          )}
          {!transaction.symbol && transaction.index && (
            <span className="shrink-0 text-[10px] font-mono bg-surface-3 border border-border px-1.5 py-0.5 rounded text-muted">
              {transaction.index}{transaction.index_rate != null ? ` ${transaction.index_rate}%` : ""}
            </span>
          )}
        </div>
        {breadcrumb && (
          <div className="text-xs text-muted mt-0.5 truncate">{breadcrumb}</div>
        )}
      </div>

      {/* Value + time */}
      <div className="text-right shrink-0">
        <div className={`text-sm font-mono font-semibold tabular-nums ${isIncome ? "text-accent" : "text-text-primary"}`}>
          {isIncome ? "+" : ""}{fmtDisplay(transaction.value, transaction.currency)}
          {transaction.currency !== "BRL" && transaction.currency !== displayCurrency && (
            <span className="text-[10px] font-normal text-muted ml-1">{transaction.currency}</span>
          )}
        </div>
        <div className="text-[10px] font-mono text-muted mt-0.5">{timeStr}</div>
      </div>

      {/* Desktop actions (hover reveal) */}
      <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
        <button onClick={e => { e.stopPropagation(); setEditing(true); }}
          className="p-1.5 rounded-lg hover:bg-surface-3 text-muted hover:text-text-primary transition-colors"
          title="Editar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button onClick={e => { e.stopPropagation(); remove(); }}
          className={`p-1.5 rounded-lg transition-all text-xs font-medium ${
            pendingDelete
              ? "bg-danger/15 text-danger border border-danger/30 px-2"
              : "hover:bg-surface-3 text-muted hover:text-danger"
          }`}
          title="Excluir">
          {pendingDelete ? "Excluir?" : (
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
  );
}
