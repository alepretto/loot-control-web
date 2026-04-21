"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  transactionsApi,
  tagFamiliesApi,
  categoriesApi,
  tagsApi,
  accountsApi,
  TagFamily,
  Category,
  Tag,
  TagNature,
  Account,
  Currency,
} from "@/lib/api";

const CURRENCIES: Currency[] = ["BRL", "USD", "EUR"];

const NATURE_ORDER: TagNature[] = ["income", "fixed_expense", "variable_expense", "investment"];
const NATURE_LABELS: Record<TagNature, string> = {
  income: "Receita",
  fixed_expense: "Custo Fixo",
  variable_expense: "Custo Variável",
  investment: "Investimento",
};
const NATURE_COLORS: Record<TagNature, string> = {
  income: "text-accent border-accent/30 bg-accent/10",
  fixed_expense: "text-danger border-danger/30 bg-danger/10",
  variable_expense: "text-orange-500 border-orange-500/30 bg-orange-500/10",
  investment: "text-primary border-primary/30 bg-primary/10",
};

function haptic(type: "medium" | "success") {
  try {
    const tg = (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred?: (t: string) => void; notificationOccurred?: (t: string) => void } } } }).Telegram?.WebApp?.HapticFeedback;
    if (type === "success") {
      tg?.notificationOccurred?.("success");
    } else {
      tg?.impactOccurred?.(type);
    }
  } catch {
    // Outside Telegram
  }
}

export default function NewTransactionPage() {
  const router = useRouter();

  const [families, setFamilies] = useState<TagFamily[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [valueStr, setValueStr] = useState("");
  const [selectedNature, setSelectedNature] = useState<TagNature | "">("");
  const [selectedFamilyId, setSelectedFamilyId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedTagId, setSelectedTagId] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [date, setDate] = useState(() =>
    new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date())
  );
  const [time, setTime] = useState(() => {
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
    return `${get("hour")}:${get("minute")}`;
  });
  const [currency, setCurrency] = useState<Currency>("BRL");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [fams, cats, tagList, accts] = await Promise.all([
        tagFamiliesApi.list(),
        categoriesApi.list(),
        tagsApi.list({ is_active: true }),
        accountsApi.list({ is_active: true }),
      ]);
      setFamilies(fams);
      setCategories(cats);
      setTags(tagList);
      setAccounts(accts as Account[]);
      setLoadingData(false);
    }
    load();
  }, []);

  const filteredFamilies = selectedNature
    ? families.filter((f) => f.nature === selectedNature)
    : families;

  const filteredCategories = selectedFamilyId
    ? categories.filter((c) => c.family_id === selectedFamilyId)
    : [];

  const filteredTags = selectedCategoryId
    ? tags.filter((t) => t.category_id === selectedCategoryId && t.is_active)
    : [];

  const normalAccounts = (accounts as Account[]).filter(
    (a) => a.type !== "credit_card" && a.is_active
  );
  const creditAccounts = (accounts as Account[]).filter(
    (a) => a.type === "credit_card" && a.is_active
  );

  function handleNatureChange(nature: TagNature | "") {
    setSelectedNature(nature);
    setSelectedFamilyId("");
    setSelectedCategoryId("");
    setSelectedTagId("");
  }

  function handleFamilyChange(id: string) {
    setSelectedFamilyId(id);
    setSelectedCategoryId("");
    setSelectedTagId("");
  }

  function handleCategoryChange(id: string) {
    setSelectedCategoryId(id);
    setSelectedTagId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const value = parseFloat(valueStr.replace(",", "."));
    if (!value || value <= 0) {
      setError("Insira um valor válido.");
      return;
    }
    if (!selectedTagId) {
      setError("Selecione uma tag.");
      return;
    }
    if (!selectedAccountId) {
      setError("Selecione uma conta.");
      return;
    }

    haptic("medium");
    setSubmitting(true);

    try {
      await transactionsApi.create({
        tag_id: selectedTagId,
        account_id: selectedAccountId,
        date_transaction: new Date(`${date}T${time}:00`).toISOString(),
        value,
        currency,
      });
      haptic("success");
      router.push("/mini/transactions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar transação.");
      setSubmitting(false);
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted text-sm">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-8 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-muted hover:text-text-primary transition-colors min-h-[44px] min-w-[44px]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-text-primary">Novo Lançamento</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Value */}
        <div className="bg-surface border border-border rounded-2xl p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-muted mb-3">Valor</p>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            value={valueStr}
            onChange={(e) => setValueStr(e.target.value)}
            placeholder="0,00"
            className="text-4xl font-bold text-center bg-transparent text-text-primary placeholder:text-muted w-full focus:outline-none"
          />
        </div>

        {/* Nature selector */}
        <div>
          <p className="text-xs uppercase tracking-wider text-muted mb-2">Natureza</p>
          <div className="grid grid-cols-2 gap-2">
            {NATURE_ORDER.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleNatureChange(n)}
                className={`py-3 rounded-xl text-sm font-semibold transition-colors min-h-[48px] border ${
                  selectedNature === n
                    ? NATURE_COLORS[n]
                    : "bg-surface border-border text-muted"
                }`}
              >
                {NATURE_LABELS[n]}
              </button>
            ))}
          </div>
        </div>

        {/* Family selector */}
        <div>
          <p className="text-xs uppercase tracking-wider text-muted mb-2">Família</p>
          <select
            value={selectedFamilyId}
            onChange={(e) => handleFamilyChange(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors min-h-[48px]"
          >
            <option value="">Selecione uma família</option>
            {filteredFamilies.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          {filteredFamilies.length === 0 && selectedNature && (
            <p className="text-xs text-muted mt-1">Nenhuma família com essa natureza.</p>
          )}
        </div>

        {/* Category selector */}
        {filteredCategories.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-muted mb-2">Categoria</p>
            <select
              value={selectedCategoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors min-h-[48px]"
            >
              <option value="">Selecione uma categoria</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Tag selector */}
        <div>
          <p className="text-xs uppercase tracking-wider text-muted mb-2">Tag *</p>
          <select
            value={selectedTagId}
            onChange={(e) => setSelectedTagId(e.target.value)}
            required
            className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors min-h-[48px]"
          >
            <option value="">Selecione uma tag</option>
            {filteredTags.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {filteredTags.length === 0 && selectedFamilyId && (
            <p className="text-xs text-muted mt-1">Nenhuma tag disponível nesta categoria.</p>
          )}
        </div>

        {/* Account selector */}
        <div>
          <p className="text-xs uppercase tracking-wider text-muted mb-2">Conta</p>
          {normalAccounts.length > 0 && (
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors min-h-[48px] mb-2"
            >
              <option value="">Conta corrente/débito</option>
              {normalAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
          {creditAccounts.length > 0 && (
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3.5 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors min-h-[48px]"
            >
              <option value="">Cartão de crédito</option>
              {creditAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Date + Time */}
        <div>
          <p className="text-xs uppercase tracking-wider text-muted mb-2">Data e Hora</p>
          <div className="flex gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="flex-1 bg-surface border border-border rounded-xl px-4 py-3.5 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors min-h-[48px]"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="w-28 bg-surface border border-border rounded-xl px-4 py-3.5 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors min-h-[48px]"
            />
          </div>
        </div>

        {/* Currency */}
        <div>
          <p className="text-xs uppercase tracking-wider text-muted mb-2">Moeda</p>
          <div className="flex gap-3">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors min-h-[48px] border ${
                  currency === c
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-surface border-border text-muted"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="text-danger bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-base transition-colors min-h-[56px]"
        >
          {submitting ? "Salvando..." : "Confirmar"}
        </button>
      </form>
    </div>
  );
}
