"use client";

import { useEffect, useState } from "react";
import {
  budgetsApi, tagFamiliesApi, categoriesApi,
  Budget, BudgetProgress, TagFamily, Category,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function toMonthStr(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function navigateMonth(year: number, month: number, delta: number) {
  let m = month + delta;
  let y = year;
  if (m > 12) { m = 1; y += 1; }
  if (m < 1) { m = 12; y -= 1; }
  return { year: y, month: m };
}

function ProgressBar({ value, max, height = 6 }: { value: number; max: number; height?: number }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const over = value > max;
  const color = over ? "#ef4444" : pct > 0.8 ? "#f97316" : "#2563eb";
  return (
    <div style={{ height, background: "#1C2330", overflow: "hidden" }}>
      <div style={{ width: `${pct * 100}%`, height: "100%", background: color, transition: "width 200ms" }} />
    </div>
  );
}

interface BudgetModalProps {
  families: TagFamily[];
  categories: Category[];
  initial?: Budget;
  onSave: (data: { name: string; scope: "family" | "category"; family_id?: string | null; category_id?: string | null; amount: number }) => Promise<void>;
  onClose: () => void;
}

function BudgetModal({ families, categories, initial, onSave, onClose }: BudgetModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [scope, setScope] = useState<"family" | "category">(initial?.scope ?? "family");
  const [familyId, setFamilyId] = useState(initial?.family_id ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !amount) return;
    setSaving(true);
    try {
      await onSave({
        name,
        scope,
        family_id: scope === "family" ? (familyId || null) : null,
        category_id: scope === "category" ? (categoryId || null) : null,
        amount: parseFloat(amount),
      });
      onClose();
    } catch (err) {
      alert(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-surface-2 border border-border w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-semibold">{initial ? "Editar orçamento" : "Novo orçamento"}</h2>
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
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted block mb-1">Escopo</label>
            <div className="flex border border-border">
              {(["family","category"] as const).map(s => (
                <button key={s} type="button" onClick={() => setScope(s)}
                  className={`flex-1 py-1.5 text-[12px] font-medium transition-colors ${scope === s ? "bg-primary/20 text-primary" : "text-muted hover:text-text-primary"}`}>
                  {s === "family" ? "Família" : "Categoria"}
                </button>
              ))}
            </div>
          </div>
          {scope === "family" && (
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted block mb-1">Família</label>
              <select value={familyId} onChange={e => setFamilyId(e.target.value)}
                className="w-full bg-surface border border-border px-3 py-2 text-sm focus:outline-none">
                <option value="">— Selecionar —</option>
                {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}
          {scope === "category" && (
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted block mb-1">Categoria</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                className="w-full bg-surface border border-border px-3 py-2 text-sm focus:outline-none">
                <option value="">— Selecionar —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted block mb-1">Valor mensal (R$)</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required
              className="w-full bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/60" />
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

export default function OrcamentosPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [budgets, setBudgets] = useState<BudgetProgress[]>([]);
  const [families, setFamilies] = useState<TagFamily[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBudget, setEditBudget] = useState<Budget | null>(null);

  async function loadBudgets(y: number, m: number) {
    setLoading(true);
    try {
      const data = await budgetsApi.progress(toMonthStr(y, m));
      setBudgets(data);
    } catch {
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([
      tagFamiliesApi.list(),
      categoriesApi.list(),
    ]).then(([fams, cats]) => {
      setFamilies(fams);
      setCategories(cats);
    });
    loadBudgets(year, month);
  }, []);

  function changeMonth(delta: number) {
    const { year: y, month: m } = navigateMonth(year, month, delta);
    setYear(y); setMonth(m);
    loadBudgets(y, m);
  }

  async function handleCreate(data: Parameters<typeof budgetsApi.create>[0]) {
    await budgetsApi.create(data);
    await loadBudgets(year, month);
  }

  async function handleUpdate(data: Parameters<typeof budgetsApi.create>[0]) {
    if (!editBudget) return;
    await budgetsApi.update(editBudget.id, data);
    await loadBudgets(year, month);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este orçamento?")) return;
    await budgetsApi.delete(id);
    await loadBudgets(year, month);
  }

  const totals = budgets.reduce((acc, b) => ({
    amount: acc.amount + b.amount,
    spent: acc.spent + b.spent,
  }), { amount: 0, spent: 0 });

  const now2 = new Date();
  const daysInMonth = new Date(year, month, 0).getDate();
  const currentDay = year === now2.getFullYear() && month === now2.getMonth() + 1 ? now2.getDate() : daysInMonth;
  const monthProgress = currentDay / daysInMonth;

  return (
    <div className="px-4 md:px-6 py-5 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-semibold text-text-primary">Orçamentos</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border">
            <button onClick={() => changeMonth(-1)} className="px-3 py-1.5 text-muted hover:text-text-primary border-r border-border">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <span className="px-4 py-1.5 text-[12px] font-mono">
              {MONTHS_SHORT[month - 1]}/{year}
            </span>
            <button onClick={() => changeMonth(1)} className="px-3 py-1.5 text-muted hover:text-text-primary border-l border-border">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
          <button onClick={() => { setEditBudget(null); setShowModal(true); }}
            className="px-3 py-1.5 text-[12px] font-medium bg-primary text-white hover:bg-primary/80 flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><path d="M12 5v14M5 12h14" /></svg>
            Novo orçamento
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="flex border border-border divide-x divide-border overflow-x-auto rounded-xl">
        <div className="flex-1 px-4 py-3">
          <div className="text-[9px] font-semibold uppercase tracking-widest text-muted mb-1">Orçado (mês)</div>
          <div className="text-[15px] font-mono font-semibold">{formatCurrency(totals.amount, "BRL")}</div>
          <div className="text-[10px] text-muted mt-0.5">{budgets.length} orçamentos</div>
        </div>
        <div className="flex-1 px-4 py-3">
          <div className="text-[9px] font-semibold uppercase tracking-widest text-muted mb-1">Realizado</div>
          <div className="text-[15px] font-mono font-semibold">{formatCurrency(totals.spent, "BRL")}</div>
        </div>
        <div className="flex-1 px-4 py-3">
          <div className="text-[9px] font-semibold uppercase tracking-widest text-muted mb-1">Saldo disponível</div>
          <div className="text-[15px] font-mono font-semibold" style={{ color: totals.amount - totals.spent >= 0 ? "#22c55e" : "#ef4444" }}>
            {formatCurrency(totals.amount - totals.spent, "BRL")}
          </div>
        </div>
      </div>

      {/* Budget cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1,2,3,4].map(i => <div key={i} className="h-36 bg-surface border border-border rounded-xl" />)}
        </div>
      ) : budgets.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted">
          <p>Nenhum orçamento cadastrado.</p>
          <button onClick={() => setShowModal(true)} className="mt-2 text-primary hover:underline text-sm">Criar primeiro orçamento</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map(b => {
            const usagePct = b.usage_pct;
            const over = usagePct >= 100;
            const pctColor = over ? "#ef4444" : usagePct > 80 ? "#f97316" : "#22c55e";
            const pillHue = over ? 10 : usagePct > 80 ? 50 : 150;
            const remaining = b.amount - b.spent;
            return (
              <div key={b.budget_id} className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-widest text-muted">
                      {b.scope === "family" ? "Família" : "Categoria"}
                    </div>
                    <div className="text-[15px] font-semibold mt-0.5">{b.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 font-mono"
                      style={{
                        background: `oklch(0.26 0.06 ${pillHue} / 0.7)`,
                        color: `oklch(0.88 0.12 ${pillHue})`,
                        border: `1px solid oklch(0.42 0.12 ${pillHue} / 0.4)`,
                      }}>
                      {usagePct.toFixed(0)}%
                    </span>
                    <button onClick={() => { setEditBudget({ ...b, id: b.budget_id }); setShowModal(true); }}
                      className="text-muted hover:text-text-primary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(b.budget_id)} className="text-muted hover:text-red-400">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <div className="text-[9px] text-muted uppercase tracking-wide">Realizado</div>
                    <div className="text-[14px] font-mono font-semibold mt-0.5">{formatCurrency(b.spent, "BRL")}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-muted uppercase tracking-wide">Orçado</div>
                    <div className="text-[14px] font-mono font-medium text-muted mt-0.5">{formatCurrency(b.amount, "BRL")}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-muted uppercase tracking-wide">{over ? "Estouro" : "Saldo"}</div>
                    <div className="text-[14px] font-mono font-semibold mt-0.5" style={{ color: pctColor }}>
                      {over ? "-" : "+"}{formatCurrency(Math.abs(remaining), "BRL")}
                    </div>
                  </div>
                </div>

                <ProgressBar value={b.spent} max={b.amount} />
                <div className="flex justify-between mt-1 text-[10px] text-muted font-mono">
                  <span>Dia {currentDay} de {daysInMonth}</span>
                  <span>{(monthProgress * 100).toFixed(0)}% do mês</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <BudgetModal
          families={families}
          categories={categories}
          initial={editBudget ?? undefined}
          onSave={editBudget ? handleUpdate : handleCreate}
          onClose={() => { setShowModal(false); setEditBudget(null); }}
        />
      )}
    </div>
  );
}
