"use client";

import { useEffect, useState } from "react";
import {
  recurrencesApi, tagsApi, accountsApi,
  RecurrenceRule, RecurrenceFrequency, Tag, Account, Currency,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const FREQ_LABELS: Record<RecurrenceFrequency, string> = {
  daily: "Diária", weekly: "Semanal", monthly: "Mensal", yearly: "Anual",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

interface RecurrenceModalProps {
  tags: Tag[];
  accounts: Account[];
  initial?: RecurrenceRule;
  onSave: (data: Parameters<typeof recurrencesApi.create>[0]) => Promise<void>;
  onClose: () => void;
}

function RecurrenceModal({ tags, accounts, initial, onSave, onClose }: RecurrenceModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [tagId, setTagId] = useState(initial?.tag_id ?? "");
  const [accountId, setAccountId] = useState(initial?.account_id ?? "");
  const [value, setValue] = useState(initial?.value?.toString() ?? "");
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "BRL");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(initial?.frequency ?? "monthly");
  const [interval, setInterval] = useState(initial?.interval?.toString() ?? "1");
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        name, tag_id: tagId,
        account_id: accountId || null,
        value: parseFloat(value),
        currency,
        frequency,
        interval: parseInt(interval),
        start_date: startDate,
        end_date: endDate || null,
      });
      onClose();
    } catch (err) {
      alert(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 overflow-y-auto py-4">
      <div className="bg-surface-2 border border-border w-full max-w-md p-5 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-semibold">{initial ? "Editar recorrência" : "Nova recorrência"}</h2>
          <button onClick={onClose} className="text-muted hover:text-text-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted block mb-1">Nome</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className="w-full bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted block mb-1">Tag</label>
            <select value={tagId} onChange={e => setTagId(e.target.value)} required
              className="w-full bg-surface border border-border px-3 py-2 text-sm focus:outline-none">
              <option value="">— Selecionar —</option>
              {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted block mb-1">Valor</label>
              <input type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} required
                className="w-full bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted block mb-1">Moeda</label>
              <select value={currency} onChange={e => setCurrency(e.target.value as Currency)}
                className="w-full bg-surface border border-border px-3 py-2 text-sm focus:outline-none">
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted block mb-1">Frequência</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value as RecurrenceFrequency)}
                className="w-full bg-surface border border-border px-3 py-2 text-sm focus:outline-none">
                {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted block mb-1">Intervalo</label>
              <input type="number" min="1" value={interval} onChange={e => setInterval(e.target.value)}
                className="w-full bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted block mb-1">Conta</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)}
              className="w-full bg-surface border border-border px-3 py-2 text-sm focus:outline-none">
              <option value="">— Nenhuma —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted block mb-1">Data início</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required
                className="w-full bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted block mb-1">Data fim (opcional)</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-[12px] font-medium border border-border text-muted hover:text-text-primary transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 text-[12px] font-medium bg-primary text-white hover:bg-primary/80 transition-colors disabled:opacity-50">
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RecorrenciasPage() {
  const [recurrences, setRecurrences] = useState<RecurrenceRule[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRec, setEditRec] = useState<RecurrenceRule | null>(null);

  async function loadAll() {
    try {
      const [recs, tgs, accts] = await Promise.all([
        recurrencesApi.list(),
        tagsApi.list({ is_active: true }),
        accountsApi.list({ is_active: true }),
      ]);
      setRecurrences(recs);
      setTags(tgs);
      setAccounts(accts);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleCreate(data: Parameters<typeof recurrencesApi.create>[0]) {
    await recurrencesApi.create(data);
    await loadAll();
  }

  async function handleUpdate(data: Parameters<typeof recurrencesApi.create>[0]) {
    if (!editRec) return;
    await recurrencesApi.update(editRec.id, data);
    await loadAll();
  }

  async function handleToggle(rec: RecurrenceRule) {
    await recurrencesApi.update(rec.id, { is_active: !rec.is_active });
    await loadAll();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta recorrência?")) return;
    await recurrencesApi.delete(id);
    await loadAll();
  }

  return (
    <div className="px-4 md:px-6 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">Recorrências</h1>
        <button onClick={() => { setEditRec(null); setShowModal(true); }}
          className="px-3 py-1.5 text-[12px] font-medium bg-primary text-white hover:bg-primary/80 flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path d="M12 5v14M5 12h14" /></svg>
          Nova recorrência
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-surface border border-border rounded-xl" />)}
        </div>
      ) : recurrences.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted">Nenhuma recorrência cadastrada.</div>
      ) : (
        <div className="bg-surface border border-border rounded-xl">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2 text-[9px] font-semibold uppercase tracking-widest text-muted">Nome</th>
                <th className="text-left px-4 py-2 text-[9px] font-semibold uppercase tracking-widest text-muted">Frequência</th>
                <th className="text-left px-4 py-2 text-[9px] font-semibold uppercase tracking-widest text-muted">Próxima geração</th>
                <th className="text-right px-4 py-2 text-[9px] font-semibold uppercase tracking-widest text-muted">Valor</th>
                <th className="text-center px-4 py-2 text-[9px] font-semibold uppercase tracking-widest text-muted">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {recurrences.map(r => {
                const tag = tags.find(t => t.id === r.tag_id);
                return (
                  <tr key={r.id} className={`border-b border-border last:border-b-0 ${r.is_active ? "" : "opacity-50"}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-[10px] text-muted mt-0.5">{tag?.name ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {r.interval > 1 ? `A cada ${r.interval} ` : ""}{FREQ_LABELS[r.frequency].toLowerCase()}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted">{fmtDate(r.next_date)}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium">
                      {formatCurrency(r.value, r.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggle(r)}
                        className={`text-[9px] font-semibold px-2 py-0.5 font-mono uppercase transition-colors ${
                          r.is_active
                            ? "bg-green-400/10 text-green-400 hover:bg-red-400/10 hover:text-red-400"
                            : "bg-surface-3 text-muted hover:bg-green-400/10 hover:text-green-400"
                        }`}>
                        {r.is_active ? "Ativa" : "Pausada"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => { setEditRec(r); setShowModal(true); }}
                          className="text-muted hover:text-text-primary p-1">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(r.id)} className="text-muted hover:text-red-400 p-1">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <RecurrenceModal
          tags={tags}
          accounts={accounts}
          initial={editRec ?? undefined}
          onSave={editRec ? handleUpdate : handleCreate}
          onClose={() => { setShowModal(false); setEditRec(null); }}
        />
      )}
    </div>
  );
}
