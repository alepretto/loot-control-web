"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { tagFamiliesApi, categoriesApi, tagsApi } from "@/lib/api";
import type { CategoryType } from "@/lib/api";

// ─── Suggested starter structure ─────────────────────────────────────────────

const SUGGESTED: {
  family: string;
  categories: { name: string; tags: { name: string; type: CategoryType }[] }[];
}[] = [
  {
    family: "Renda",
    categories: [{ name: "Salário", tags: [{ name: "Salário CLT", type: "income" }, { name: "Freelance", type: "income" }] }],
  },
  {
    family: "Moradia",
    categories: [
      { name: "Aluguel", tags: [{ name: "Mensalidade", type: "outcome" }] },
      { name: "Contas", tags: [{ name: "Luz", type: "outcome" }, { name: "Internet", type: "outcome" }, { name: "Água", type: "outcome" }] },
    ],
  },
  {
    family: "Alimentação",
    categories: [
      { name: "Mercado", tags: [{ name: "Mercado", type: "outcome" }] },
      { name: "Restaurantes", tags: [{ name: "Restaurante", type: "outcome" }] },
    ],
  },
  {
    family: "Lazer",
    categories: [
      { name: "Streaming", tags: [{ name: "Netflix", type: "outcome" }, { name: "Spotify", type: "outcome" }] },
      { name: "Viagens", tags: [{ name: "Viagem", type: "outcome" }] },
    ],
  },
  {
    family: "Saúde",
    categories: [
      { name: "Farmácia", tags: [{ name: "Farmácia", type: "outcome" }] },
      { name: "Plano de Saúde", tags: [{ name: "Plano", type: "outcome" }] },
    ],
  },
  {
    family: "Transporte",
    categories: [
      { name: "Combustível", tags: [{ name: "Gasolina", type: "outcome" }] },
      { name: "Transporte", tags: [{ name: "Uber", type: "outcome" }, { name: "Ônibus", type: "outcome" }] },
    ],
  },
  {
    family: "Investimentos",
    categories: [
      { name: "Ações", tags: [{ name: "Aporte Ações", type: "outcome" }] },
      { name: "Cripto", tags: [{ name: "Aporte Cripto", type: "outcome" }] },
      { name: "Renda Fixa", tags: [{ name: "Aporte RF", type: "outcome" }] },
    ],
  },
];

// ─── Step types ───────────────────────────────────────────────────────────────

type Step = "welcome" | "family" | "category" | "tag" | "creating" | "done";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("welcome");
  const [error, setError] = useState<string | null>(null);

  // Manual creation state
  const [familyName, setFamilyName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [tagName, setTagName] = useState("");
  const [tagType, setTagType] = useState<CategoryType>("outcome");

  // Created IDs for chaining
  const [createdFamilyId, setCreatedFamilyId] = useState("");
  const [createdCategoryId, setCreatedCategoryId] = useState("");

  // Suggested creation stats
  const [createdStats, setCreatedStats] = useState({ families: 0, categories: 0, tags: 0 });
  const [creatingProgress, setCreatingProgress] = useState("");

  // ── Manual flow ────────────────────────────────────────────────────────────

  async function handleCreateFamily() {
    if (!familyName.trim()) return;
    setError(null);
    try {
      const family = await tagFamiliesApi.create({ name: familyName.trim() });
      setCreatedFamilyId(family.id);
      setStep("category");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao criar família.");
    }
  }

  async function handleCreateCategory() {
    if (!categoryName.trim()) return;
    setError(null);
    try {
      const cat = await categoriesApi.create({ name: categoryName.trim(), family_id: createdFamilyId });
      setCreatedCategoryId(cat.id);
      setStep("tag");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao criar categoria.");
    }
  }

  async function handleCreateTag() {
    if (!tagName.trim()) return;
    setError(null);
    try {
      await tagsApi.create({ name: tagName.trim(), category_id: createdCategoryId, type: tagType });
      setCreatedStats({ families: 1, categories: 1, tags: 1 });
      setStep("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao criar tag.");
    }
  }

  // ── Suggested flow ─────────────────────────────────────────────────────────

  async function handleCreateSuggested() {
    setStep("creating");
    setError(null);
    let families = 0, cats = 0, tags = 0;

    try {
      for (const item of SUGGESTED) {
        setCreatingProgress(`Criando ${item.family}...`);
        const family = await tagFamiliesApi.create({ name: item.family });
        families++;

        for (const catItem of item.categories) {
          const cat = await categoriesApi.create({ name: catItem.name, family_id: family.id });
          cats++;

          for (const tagItem of catItem.tags) {
            await tagsApi.create({ name: tagItem.name, category_id: cat.id, type: tagItem.type });
            tags++;
          }
        }
      }

      setCreatedStats({ families, categories: cats, tags });
      setStep("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao criar estrutura.");
      setStep("welcome");
    }
  }

  // ── Progress indicator ─────────────────────────────────────────────────────

  const STEPS_MANUAL: Step[] = ["welcome", "family", "category", "tag", "done"];
  const currentStepIdx = STEPS_MANUAL.indexOf(step);
  const showProgress = step !== "welcome" && step !== "creating";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background atmospherics */}
      <div className="absolute -top-40 -left-20 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-20 w-[400px] h-[400px] bg-accent/4 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">

        {/* Progress dots (manual flow only) */}
        {showProgress && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {["family", "category", "tag", "done"].map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  STEPS_MANUAL.indexOf(step) > i + 1
                    ? "bg-primary w-6"
                    : STEPS_MANUAL.indexOf(step) === i + 1
                    ? "bg-primary w-8"
                    : "bg-surface-3 w-4"
                }`}
              />
            ))}
          </div>
        )}

        {/* ── WELCOME ─────────────────────────────────────────────────────── */}
        {step === "welcome" && (
          <div className="text-center space-y-6">
            <div className="flex justify-center mb-2">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/8 rounded-2xl blur-xl scale-110 pointer-events-none" />
                <Image src="/logo.png" alt="Loot Control" width={180} height={180} className="relative rounded-2xl" priority />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-text-primary">Bem-vindo ao Loot Control!</h1>
              <p className="text-sm text-muted mt-2 leading-relaxed">
                Vamos deixar tudo pronto para você começar a registrar suas finanças.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-xl p-5 text-left space-y-3">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Estrutura sugerida inclui:</p>
              <div className="space-y-2">
                {[
                  { icon: "🏠", text: "7 famílias (Moradia, Alimentação, Lazer...)" },
                  { icon: "📂", text: "14 categorias prontas para usar" },
                  { icon: "🏷️", text: "20 tags com tipos já configurados" },
                ].map((i) => (
                  <div key={i.text} className="flex items-center gap-2.5">
                    <span>{i.icon}</span>
                    <span className="text-sm text-text-secondary">{i.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-xs text-danger bg-danger/8 border border-danger/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="space-y-3">
              <button
                onClick={handleCreateSuggested}
                className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-lg shadow-primary/20"
              >
                Usar estrutura sugerida →
              </button>
              <button
                onClick={() => setStep("family")}
                className="w-full bg-surface-2 hover:bg-surface-3 border border-border text-text-secondary hover:text-text-primary font-medium py-2.5 rounded-xl text-sm transition-all"
              >
                Criar do zero
              </button>
              <button
                onClick={() => router.push("/summary")}
                className="w-full text-xs text-muted hover:text-text-secondary transition-colors py-1"
              >
                Pular por agora
              </button>
            </div>
          </div>
        )}

        {/* ── CREATING (loading) ──────────────────────────────────────────── */}
        {step === "creating" && (
          <div className="text-center space-y-6 py-8">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Criando sua estrutura...</h2>
              <p className="text-sm text-muted mt-1">{creatingProgress}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl px-4 py-3">
              <p className="text-xs text-muted">Isso leva alguns segundos. Não feche a janela.</p>
            </div>
          </div>
        )}

        {/* ── FAMILY ──────────────────────────────────────────────────────── */}
        {step === "family" && (
          <div className="space-y-6">
            <div>
              <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-2">Passo 1 de 3</p>
              <h2 className="text-xl font-bold text-text-primary">Crie sua primeira família</h2>
              <p className="text-sm text-muted mt-1 leading-relaxed">
                Famílias agrupam seus gastos em grandes categorias como{" "}
                <span className="text-text-secondary">Moradia</span>,{" "}
                <span className="text-text-secondary">Alimentação</span> ou{" "}
                <span className="text-text-secondary">Lazer</span>.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
              <div>
                <label className="block text-[10px] text-muted uppercase tracking-wider font-semibold mb-2">
                  Nome da família
                </label>
                <input
                  autoFocus
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateFamily()}
                  placeholder="ex: Moradia, Alimentação, Lazer..."
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>

              {error && (
                <p className="text-xs text-danger">{error}</p>
              )}

              <button
                onClick={handleCreateFamily}
                disabled={!familyName.trim()}
                className="w-full bg-primary hover:bg-primary-hover disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl text-sm transition-all"
              >
                Criar família →
              </button>
            </div>

            <button
              onClick={() => router.push("/summary")}
              className="w-full text-xs text-muted hover:text-text-secondary transition-colors py-1"
            >
              Pular e configurar depois
            </button>
          </div>
        )}

        {/* ── CATEGORY ────────────────────────────────────────────────────── */}
        {step === "category" && (
          <div className="space-y-6">
            <div>
              <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-2">Passo 2 de 3</p>
              <h2 className="text-xl font-bold text-text-primary">Crie uma categoria</h2>
              <p className="text-sm text-muted mt-1 leading-relaxed">
                Dentro de <span className="text-text-secondary font-medium">{familyName}</span>, adicione uma categoria para organizar seus gastos.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="bg-surface-3 border border-border rounded-lg px-2.5 py-1 font-medium">{familyName}</span>
                <span>→</span>
                <span className="text-text-secondary">nova categoria</span>
              </div>

              <div>
                <label className="block text-[10px] text-muted uppercase tracking-wider font-semibold mb-2">
                  Nome da categoria
                </label>
                <input
                  autoFocus
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
                  placeholder="ex: Aluguel, Mercado, Streaming..."
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>

              {error && <p className="text-xs text-danger">{error}</p>}

              <button
                onClick={handleCreateCategory}
                disabled={!categoryName.trim()}
                className="w-full bg-primary hover:bg-primary-hover disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl text-sm transition-all"
              >
                Criar categoria →
              </button>
            </div>

            <button
              onClick={() => router.push("/summary")}
              className="w-full text-xs text-muted hover:text-text-secondary transition-colors py-1"
            >
              Pular e configurar depois
            </button>
          </div>
        )}

        {/* ── TAG ─────────────────────────────────────────────────────────── */}
        {step === "tag" && (
          <div className="space-y-6">
            <div>
              <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-2">Passo 3 de 3</p>
              <h2 className="text-xl font-bold text-text-primary">Crie sua primeira tag</h2>
              <p className="text-sm text-muted mt-1 leading-relaxed">
                Tags são o nível mais específico. Aqui você define se é um{" "}
                <span className="text-danger">gasto</span> ou uma{" "}
                <span className="text-accent">receita</span>.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="bg-surface-3 border border-border rounded-lg px-2.5 py-1 font-medium">{familyName}</span>
                <span>→</span>
                <span className="bg-surface-3 border border-border rounded-lg px-2.5 py-1 font-medium">{categoryName}</span>
                <span>→</span>
                <span className="text-text-secondary">nova tag</span>
              </div>

              <div>
                <label className="block text-[10px] text-muted uppercase tracking-wider font-semibold mb-2">
                  Nome da tag
                </label>
                <input
                  autoFocus
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                  placeholder="ex: Mensalidade, Salário, Mercado..."
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] text-muted uppercase tracking-wider font-semibold mb-2">
                  Tipo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([["outcome", "Gasto", "text-danger", "border-danger/40 bg-danger/8"], ["income", "Receita", "text-accent", "border-accent/40 bg-accent/8"]] as const).map(([value, label, textCls, activeCls]) => (
                    <button
                      key={value}
                      onClick={() => setTagType(value)}
                      className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        tagType === value ? `${activeCls} ${textCls}` : "border-border bg-surface-2 text-muted hover:bg-surface-3"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-xs text-danger">{error}</p>}

              <button
                onClick={handleCreateTag}
                disabled={!tagName.trim()}
                className="w-full bg-primary hover:bg-primary-hover disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl text-sm transition-all"
              >
                Criar tag →
              </button>
            </div>

            <button
              onClick={() => router.push("/summary")}
              className="w-full text-xs text-muted hover:text-text-secondary transition-colors py-1"
            >
              Pular e configurar depois
            </button>
          </div>
        )}

        {/* ── DONE ────────────────────────────────────────────────────────── */}
        {step === "done" && (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-accent">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-text-primary">Tudo pronto!</h2>
              <p className="text-sm text-muted mt-2 leading-relaxed">
                Sua estrutura foi criada com sucesso.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Famílias", value: createdStats.families },
                  { label: "Categorias", value: createdStats.categories },
                  { label: "Tags", value: createdStats.tags },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-2xl font-bold font-mono text-primary">{s.value}</p>
                    <p className="text-xs text-muted mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => router.push("/transactions")}
                className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-lg shadow-primary/20"
              >
                Registrar minha primeira transação →
              </button>
              <button
                onClick={() => router.push("/summary")}
                className="w-full text-xs text-muted hover:text-text-secondary transition-colors py-1"
              >
                Ir para o dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
