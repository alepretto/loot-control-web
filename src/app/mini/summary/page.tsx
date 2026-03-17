"use client";

import { useEffect, useState } from "react";
import {
  transactionsApi,
  tagsApi,
  categoriesApi,
  tagFamiliesApi,
  Transaction,
  Tag,
  Category,
  TagFamily,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function navigateMonth(year: number, month: number, delta: number) {
  let m = month + delta;
  let y = year;
  if (m > 12) { m = 1; y += 1; }
  if (m < 1) { m = 12; y -= 1; }
  return { year: y, month: m };
}

function monthBounds(year: number, month: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return {
    date_from: `${year}-${pad(month)}-01`,
    date_to: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

// ─── Data model ───────────────────────────────────────────────────────────────

interface TagRow   { id: string; name: string; cur: number; prev: number; }
interface CatGroup { id: string; name: string; cur: number; prev: number; tags: TagRow[]; }
interface FamGroup { id: string; name: string; cur: number; prev: number; cats: CatGroup[]; }

function buildFamilyGroups(
  txs: Transaction[],
  prevTxs: Transaction[],
  tags: Tag[],
  categories: Category[],
  families: TagFamily[],
): FamGroup[] {
  const tagById = new Map(tags.map((t) => [t.id, t]));
  const catById = new Map(categories.map((c) => [c.id, c]));

  const isExpense = (tx: Transaction) => {
    if (tx.symbol || tx.index) return false;
    return tagById.get(tx.tag_id)?.type === "outcome";
  };

  const curByTag: Record<string, number> = {};
  const prevByTag: Record<string, number> = {};
  for (const tx of txs.filter(isExpense))
    curByTag[tx.tag_id] = (curByTag[tx.tag_id] ?? 0) + tx.value;
  for (const tx of prevTxs.filter(isExpense))
    prevByTag[tx.tag_id] = (prevByTag[tx.tag_id] ?? 0) + tx.value;

  const famMap = new Map<string, FamGroup>(
    families.map((f) => [f.id, { id: f.id, name: f.name, cur: 0, prev: 0, cats: [] }]),
  );

  for (const cat of categories) {
    const fam = famMap.get(cat.family_id);
    if (!fam) continue;
    const catGroup: CatGroup = { id: cat.id, name: cat.name, cur: 0, prev: 0, tags: [] };

    for (const tag of tags.filter((t) => t.category_id === cat.id && t.type === "outcome")) {
      const c = curByTag[tag.id] ?? 0;
      const p = prevByTag[tag.id] ?? 0;
      if (c === 0 && p === 0) continue;
      catGroup.tags.push({ id: tag.id, name: tag.name, cur: c, prev: p });
      catGroup.cur += c;
      catGroup.prev += p;
    }

    if (catGroup.cur === 0 && catGroup.prev === 0) continue;
    catGroup.tags.sort((a, b) => b.cur - a.cur);
    fam.cats.push(catGroup);
    fam.cur += catGroup.cur;
    fam.prev += catGroup.prev;
  }

  return [...famMap.values()]
    .filter((f) => f.cur > 0 || f.prev > 0)
    .sort((a, b) => b.cur - a.cur);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MoM({ cur, prev }: { cur: number; prev: number }) {
  if (prev === 0) {
    return cur > 0
      ? <span className="text-[10px] text-muted bg-surface-2 px-1.5 py-0.5 rounded-full">novo</span>
      : null;
  }
  const pct = ((cur - prev) / prev) * 100;
  const worse = pct > 1; // spending more = worse
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
      worse ? "text-danger bg-danger/10" : "text-accent bg-accent/10"
    }`}>
      {worse ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

function ProgressBar({ value, max, color = "bg-danger" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function TagRowItem({ tag, famTotal }: { tag: TagRow; famTotal: number }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 min-h-[40px]">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="w-1 h-1 rounded-full bg-danger/50 flex-shrink-0" />
        <span className="text-xs text-text-secondary truncate">{tag.name}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <MoM cur={tag.cur} prev={tag.prev} />
        <span className="text-xs font-mono text-text-primary">{formatCurrency(tag.cur, "BRL")}</span>
        <span className="text-[10px] text-muted w-8 text-right">
          {famTotal > 0 ? `${((tag.cur / famTotal) * 100).toFixed(0)}%` : ""}
        </span>
      </div>
    </div>
  );
}

function CatGroupItem({
  cat,
  famTotal,
  maxCat,
}: {
  cat: CatGroup;
  famTotal: number;
  maxCat: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 min-h-[44px] active:bg-surface-3 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`text-[10px] transition-transform ${open ? "rotate-90" : ""} text-muted`}>▶</span>
          <span className="text-xs font-medium text-text-primary truncate">{cat.name}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <MoM cur={cat.cur} prev={cat.prev} />
          <span className="text-xs font-mono text-text-primary">{formatCurrency(cat.cur, "BRL")}</span>
          <span className="text-[10px] text-muted w-8 text-right">
            {famTotal > 0 ? `${((cat.cur / famTotal) * 100).toFixed(0)}%` : ""}
          </span>
        </div>
      </button>
      <div className="px-4 pb-1">
        <ProgressBar value={cat.cur} max={maxCat} />
      </div>
      {open && (
        <div className="divide-y divide-border/50 border-t border-border/50">
          {cat.tags.map((tag) => (
            <TagRowItem key={tag.id} tag={tag} famTotal={famTotal} />
          ))}
        </div>
      )}
    </div>
  );
}

function FamGroupCard({
  group,
  totalOutcome,
  incomeRef,
}: {
  group: FamGroup;
  totalOutcome: number;
  incomeRef: number;
}) {
  const [open, setOpen] = useState(false);
  const pctOfIncome = incomeRef > 0 ? (group.cur / incomeRef) * 100 : 0;
  const maxCat = Math.max(...group.cats.map((c) => c.cur), 0);

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      {/* Family header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-4 min-h-[56px] active:bg-surface-2 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`text-xs transition-transform ${open ? "rotate-90" : ""} text-muted`}>▶</span>
          <span className="text-sm font-semibold text-text-primary truncate">{group.name}</span>
          {pctOfIncome > 0 && (
            <span className="text-[10px] text-muted flex-shrink-0">{pctOfIncome.toFixed(0)}% renda</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <MoM cur={group.cur} prev={group.prev} />
          <span className="text-sm font-mono font-semibold text-danger">
            -{formatCurrency(group.cur, "BRL")}
          </span>
        </div>
      </button>

      {/* Progress bar (% of total outcome) */}
      <div className="px-4 pb-3">
        <ProgressBar value={group.cur} max={totalOutcome} />
      </div>

      {/* Categories */}
      {open && (
        <div className="border-t border-border divide-y divide-border">
          {group.cats.map((cat) => (
            <CatGroupItem key={cat.id} cat={cat} famTotal={group.cur} maxCat={maxCat} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MiniSummaryPage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prevTransactions, setPrevTransactions] = useState<Transaction[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [families, setFamilies] = useState<TagFamily[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const bounds = monthBounds(selectedYear, selectedMonth);
      const prev = navigateMonth(selectedYear, selectedMonth, -1);
      const prevBounds = monthBounds(prev.year, prev.month);
      const [txData, prevTxData, tagList, catList, famList] = await Promise.all([
        transactionsApi.list({ ...bounds, page_size: 2000 }),
        transactionsApi.list({ ...prevBounds, page_size: 2000 }),
        tagsApi.list(),
        categoriesApi.list(),
        tagFamiliesApi.list(),
      ]);
      setTransactions(txData.items);
      setPrevTransactions(prevTxData.items);
      setTags(tagList);
      setCategories(catList);
      setFamilies(famList);
      setLoading(false);
    }
    load();
  }, [selectedYear, selectedMonth]);

  const tagById = new Map(tags.map((t) => [t.id, t]));

  const nonInv = (tx: Transaction) => !tx.symbol && !tx.index;

  const totalIncome = transactions
    .filter((tx) => nonInv(tx) && tagById.get(tx.tag_id)?.type === "income")
    .reduce((s, tx) => s + tx.value, 0);
  const prevIncome = prevTransactions
    .filter((tx) => nonInv(tx) && tagById.get(tx.tag_id)?.type === "income")
    .reduce((s, tx) => s + tx.value, 0);

  const totalOutcome = transactions
    .filter((tx) => nonInv(tx) && tagById.get(tx.tag_id)?.type === "outcome")
    .reduce((s, tx) => s + tx.value, 0);
  const prevOutcome = prevTransactions
    .filter((tx) => nonInv(tx) && tagById.get(tx.tag_id)?.type === "outcome")
    .reduce((s, tx) => s + tx.value, 0);

  const balance = totalIncome - totalOutcome;
  const prevBalance = prevIncome - prevOutcome;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalOutcome) / totalIncome) * 100 : 0;
  const prevSavingsRate = prevIncome > 0 ? ((prevIncome - prevOutcome) / prevIncome) * 100 : 0;

  const familyGroups = loading
    ? []
    : buildFamilyGroups(transactions, prevTransactions, tags, categories, families);

  function prevMonth() {
    const { year, month } = navigateMonth(selectedYear, selectedMonth, -1);
    setSelectedYear(year); setSelectedMonth(month);
  }
  function nextMonth() {
    const { year, month } = navigateMonth(selectedYear, selectedMonth, 1);
    setSelectedYear(year); setSelectedMonth(month);
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      {/* Header + month nav */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-text-primary">Resumo</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-muted active:bg-surface-2 transition-colors"
          >←</button>
          <span className="text-sm text-text-primary font-medium min-w-[130px] text-center">
            {MONTHS[selectedMonth - 1]} {selectedYear}
          </span>
          <button
            onClick={nextMonth}
            className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-muted active:bg-surface-2 transition-colors"
          >→</button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Entradas */}
        <div className="bg-surface border border-border rounded-2xl p-4 space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted">Entradas</p>
          <p className={`text-lg font-bold font-mono text-accent ${loading ? "opacity-30" : ""}`}>
            {loading ? "—" : formatCurrency(totalIncome, "BRL")}
          </p>
          {!loading && <MoM cur={totalIncome} prev={prevIncome} />}
        </div>
        {/* Saídas */}
        <div className="bg-surface border border-border rounded-2xl p-4 space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted">Saídas</p>
          <p className={`text-lg font-bold font-mono text-danger ${loading ? "opacity-30" : ""}`}>
            {loading ? "—" : formatCurrency(totalOutcome, "BRL")}
          </p>
          {!loading && <MoM cur={totalOutcome} prev={prevOutcome} />}
        </div>
        {/* Saldo */}
        <div className="bg-surface border border-border rounded-2xl p-4 space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted">Saldo</p>
          <p className={`text-lg font-bold font-mono ${balance >= 0 ? "text-accent" : "text-danger"} ${loading ? "opacity-30" : ""}`}>
            {loading ? "—" : formatCurrency(balance, "BRL")}
          </p>
          {!loading && prevBalance !== 0 && (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
              balance >= prevBalance ? "text-accent bg-accent/10" : "text-danger bg-danger/10"
            }`}>
              {balance >= prevBalance ? "▲" : "▼"} {formatCurrency(Math.abs(balance - prevBalance), "BRL")}
            </span>
          )}
        </div>
        {/* Poupança */}
        <div className="bg-surface border border-border rounded-2xl p-4 space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted">Poupança</p>
          <p className={`text-lg font-bold font-mono text-primary ${loading ? "opacity-30" : ""}`}>
            {loading ? "—" : `${savingsRate.toFixed(1)}%`}
          </p>
          {!loading && prevSavingsRate !== 0 && (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
              savingsRate >= prevSavingsRate ? "text-accent bg-accent/10" : "text-danger bg-danger/10"
            }`}>
              {savingsRate >= prevSavingsRate ? "▲" : "▼"} {Math.abs(savingsRate - prevSavingsRate).toFixed(1)}pp
            </span>
          )}
        </div>
      </div>

      {/* Family breakdown */}
      {loading ? (
        <p className="text-muted text-sm text-center py-8">Carregando...</p>
      ) : familyGroups.length === 0 ? (
        <p className="text-muted text-sm text-center py-4">Sem gastos neste mês.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-text-primary">Gastos por Família</p>
          {familyGroups.map((group) => (
            <FamGroupCard
              key={group.id}
              group={group}
              totalOutcome={totalOutcome}
              incomeRef={totalIncome}
            />
          ))}
        </div>
      )}
    </div>
  );
}
