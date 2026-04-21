"use client";

import { useEffect, useState } from "react";
import { liabilitiesApi, Liability, LiabilityType } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const LIABILITY_TYPE_LABELS: Record<LiabilityType, string> = {
  mortgage: "Financiamento Imobiliário",
  vehicle: "Financiamento Veicular",
  personal_loan: "Empréstimo Pessoal",
  student_loan: "Empréstimo Estudantil",
  other: "Outro",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

interface LiabilityModalProps {
  initial?: Liability;
  onSave: (data: Parameters<typeof liabilitiesApi.create>[0]) => Promise<void>;
  onClose: () => void;
}

function LiabilityModal({ initial, onSave, onClose }: LiabilityModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<LiabilityType>(initial?.type ?? "other");
  const [institution, setInstitution] = useState(initial?.institution ?? "");
  const [originalAmount, setOriginalAmount] = useState(initial?.original_amount?.toString() ?? "");
  const [outstandingBalance, setOutstandingBalance] = useState(initial?.outstanding_balance?.toString() ?? "");
  const [monthlyPayment, setMonthlyPayment] = useState(initial?.monthly_payment?.toString() ?? "");
  const [interestRate, setInterestRate] = useState(initial?.interest_rate?.toString() ?? "");
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        name, type,
        institution: institution || null,
        original_amount: parseFloat(originalAmount),
        outstanding_balance: parseFloat(outstandingBalance),
        monthly_payment: monthlyPayment ? parseFloat(monthlyPayment) : null,
        interest_rate: interestRate ? parseFloat(interestRate) : null,
        start_date: startDate || null,
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
          <h2 className="text-[14px] font-semibold">{initial ? "Editar passivo" : "Novo passivo"}</h2>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted block mb-1">Tipo</label>
              <select value={type} onChange={e => setType(e.target.value as LiabilityType)}
                className="w-full bg-surface border border-border px-3 py-2 text-sm focus:outline-none">
                {Object.entries(LIABILITY_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted block mb-1">Instituição</label>
              <input value={institution} onChange={e => setInstitution(e.target.value)}
                className="w-full bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted block mb-1">Valor original (R$)</label>
              <input type="number" step="0.01" value={originalAmount} onChange={e => setOriginalAmount(e.target.value)} required
                className="w-full bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted block mb-1">Saldo devedor (R$)</label>
              <input type="number" step="0.01" value={outstandingBalance} onChange={e => setOutstandingBalance(e.target.value)} required
                className="w-full bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted block mb-1">Parcela mensal (R$)</label>
              <input type="number" step="0.01" value={monthlyPayment} onChange={e => setMonthlyPayment(e.target.value)}
                className="w-full bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted block mb-1">Taxa a.a. (%)</label>
              <input type="number" step="0.01" value={interestRate} onChange={e => setInterestRate(e.target.value)}
                className="w-full bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted block mb-1">Data início</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted block mb-1">Data fim</label>
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

export default function PassivosPage() {
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editLiability, setEditLiability] = useState<Liability | null>(null);

  async function loadLiabilities() {
    try {
      const data = await liabilitiesApi.list();
      setLiabilities(data);
    } catch {
      setLiabilities([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLiabilities(); }, []);

  async function handleCreate(data: Parameters<typeof liabilitiesApi.create>[0]) {
    await liabilitiesApi.create(data);
    await loadLiabilities();
  }

  async function handleUpdate(data: Parameters<typeof liabilitiesApi.create>[0]) {
    if (!editLiability) return;
    await liabilitiesApi.update(editLiability.id, data);
    await loadLiabilities();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este passivo?")) return;
    await liabilitiesApi.delete(id);
    await loadLiabilities();
  }

  const total = liabilities.reduce((s, l) => s + l.outstanding_balance, 0);
  const monthlyTotal = liabilities.reduce((s, l) => s + (l.monthly_payment ?? 0), 0);

  return (
    <div className="px-4 md:px-6 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">Passivos</h1>
        <button onClick={() => { setEditLiability(null); setShowModal(true); }}
          className="px-3 py-1.5 text-[12px] font-medium bg-primary text-white hover:bg-primary/80 flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path d="M12 5v14M5 12h14" /></svg>
          Novo passivo
        </button>
      </div>

      {/* Summary strip */}
      {liabilities.length > 0 && (
        <div className="flex border border-border divide-x divide-border overflow-x-auto rounded-xl">
          <div className="flex-1 px-4 py-3">
            <div className="text-[9px] font-semibold uppercase tracking-widest text-muted mb-1">Total devedor</div>
            <div className="text-[15px] font-mono font-semibold text-red-400">{formatCurrency(total, "BRL")}</div>
          </div>
          <div className="flex-1 px-4 py-3">
            <div className="text-[9px] font-semibold uppercase tracking-widest text-muted mb-1">Parcelas mensais</div>
            <div className="text-[15px] font-mono font-semibold">{formatCurrency(monthlyTotal, "BRL")}</div>
          </div>
          <div className="flex-1 px-4 py-3">
            <div className="text-[9px] font-semibold uppercase tracking-widest text-muted mb-1">Passivos ativos</div>
            <div className="text-[15px] font-mono font-semibold">{liabilities.filter(l => l.is_active).length}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-surface border border-border rounded-xl" />)}
        </div>
      ) : liabilities.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted">Nenhum passivo cadastrado.</div>
      ) : (
        <div className="space-y-3">
          {liabilities.map(l => {
            const paidPct = l.original_amount > 0 ? (1 - l.outstanding_balance / l.original_amount) : 0;
            return (
              <div key={l.id} className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-[13px] font-semibold">{l.name}</div>
                    <div className="text-[10px] text-muted font-mono mt-0.5">
                      {LIABILITY_TYPE_LABELS[l.type]} · {l.institution ?? "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setEditLiability(l); setShowModal(true); }}
                      className="text-muted hover:text-text-primary p-1">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(l.id)} className="text-muted hover:text-red-400 p-1">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3 text-[11px]">
                  <div>
                    <div className="text-[9px] text-muted uppercase tracking-wide mb-0.5">Saldo devedor</div>
                    <div className="font-mono font-semibold text-red-400">{formatCurrency(l.outstanding_balance, "BRL")}</div>
                  </div>
                  {l.monthly_payment && (
                    <div>
                      <div className="text-[9px] text-muted uppercase tracking-wide mb-0.5">Parcela</div>
                      <div className="font-mono">{formatCurrency(l.monthly_payment, "BRL")}</div>
                    </div>
                  )}
                  {l.interest_rate && (
                    <div>
                      <div className="text-[9px] text-muted uppercase tracking-wide mb-0.5">Taxa a.a.</div>
                      <div className="font-mono">{l.interest_rate.toFixed(1)}%</div>
                    </div>
                  )}
                </div>

                {l.end_date && (
                  <div className="text-[10px] text-muted font-mono mb-2">
                    {fmtDate(l.start_date)} → {fmtDate(l.end_date)}
                  </div>
                )}

                <div>
                  <div className="h-1.5 bg-surface-3 overflow-hidden">
                    <div className="h-full bg-green-400/60" style={{ width: `${paidPct * 100}%`, transition: "width 200ms" }} />
                  </div>
                  <div className="flex justify-between mt-0.5 text-[9px] text-muted font-mono">
                    <span>{(paidPct * 100).toFixed(0)}% quitado</span>
                    <span>Total {formatCurrency(l.original_amount, "BRL")}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <LiabilityModal
          initial={editLiability ?? undefined}
          onSave={editLiability ? handleUpdate : handleCreate}
          onClose={() => { setShowModal(false); setEditLiability(null); }}
        />
      )}
    </div>
  );
}
