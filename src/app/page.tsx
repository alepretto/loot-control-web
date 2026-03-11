import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary overflow-x-hidden">
      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border backdrop-blur-md bg-background/80">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/nav-icon.png"
              alt="Loot Control"
              width={50}
              height={50}
              className="rounded-lg"
            />
            <span className="font-bold text-xl tracking-tight">
              Loot Control
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xm text-muted hover:text-text-primary transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/login"
              className="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="pt-28 pb-24 px-6 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px]  rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-sm mx-auto mb-10">
          <Image
            src="/logo.png"
            alt="Loot Control"
            width={600}
            height={600}
            className="rounded-2xl w-full h-auto"
            priority
          />
        </div>

        <div className="relative max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-xs text-primary font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Controle financeiro sem atrito
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.1]">
            Suas finanças,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              do jeito que deveriam ser
            </span>
          </h1>

          <p className="text-lg text-muted max-w-xl mx-auto leading-relaxed">
            Registre gastos, receitas e investimentos em segundos. Sem fórmulas,
            sem complexidade — só clareza sobre para onde vai o seu dinheiro.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/login"
              className="bg-primary hover:bg-primary-hover text-white font-semibold px-8 py-3 rounded-xl text-sm transition-colors shadow-lg shadow-primary/20"
            >
              Começar grátis →
            </Link>
            <a
              href="#como-funciona"
              className="text-sm text-muted hover:text-text-primary transition-colors px-4 py-3"
            >
              Ver como funciona ↓
            </a>
          </div>
        </div>
      </section>

      {/* ── Problema ────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-semibold text-muted uppercase tracking-widest mb-12">
            Soa familiar?
          </p>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                icon: "📊",
                text: "Planilha com 47 abas que só você entende — e que você abandona em fevereiro.",
              },
              {
                icon: "💸",
                text: "Você sabe que gasta muito, mas não sabe exatamente onde o dinheiro some.",
              },
              {
                icon: "📈",
                text: "Seus investimentos ficam em outro lugar, desconectados das suas despesas.",
              },
            ].map(({ icon, text }) => (
              <div
                key={text}
                className="bg-surface border border-border rounded-xl p-5 flex gap-4"
              >
                <span className="text-2xl mt-0.5 shrink-0">{icon}</span>
                <p className="text-sm text-muted leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest">
              O que você ganha
            </p>
            <h2 className="text-3xl font-bold">
              Tudo que você precisa, nada do que você não precisa
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: "⚡",
                title: "Registro rápido",
                desc: "Interface estilo planilha. Clique, digite, salve. Menos de 5 segundos por transação.",
                accent: "text-primary",
                bg: "bg-primary/10",
              },
              {
                icon: "🗂️",
                title: "Organização hierárquica",
                desc: "Família → Categoria → Tag. Agrupe do jeito que faz sentido pra sua vida.",
                accent: "text-accent",
                bg: "bg-accent/10",
              },
              {
                icon: "📅",
                title: "Resumo mensal",
                desc: "Veja gastos por família, % da sua renda e variação em relação ao mês anterior.",
                accent: "text-primary",
                bg: "bg-primary/10",
              },
              {
                icon: "💼",
                title: "Investimentos integrados",
                desc: "Ações, cripto e renda fixa no mesmo lugar. Gráfico de aportes e alocação por classe.",
                accent: "text-accent",
                bg: "bg-accent/10",
              },
              {
                icon: "📥",
                title: "Importação por CSV",
                desc: "Tinha dados espalhados? Importe tudo de uma vez com nosso modelo pronto.",
                accent: "text-primary",
                bg: "bg-primary/10",
              },
              {
                icon: "🌙",
                title: "Dark mode nativo",
                desc: "Feito para quem passa horas na frente de uma tela. Seus olhos agradecem.",
                accent: "text-accent",
                bg: "bg-accent/10",
              },
            ].map(({ icon, title, desc, accent, bg }) => (
              <div
                key={title}
                className="bg-surface border border-border rounded-xl p-6 space-y-3 hover:border-primary/40 transition-colors"
              >
                <div
                  className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center text-xl`}
                >
                  {icon}
                </div>
                <h3 className={`font-semibold text-sm ${accent}`}>{title}</h3>
                <p className="text-sm text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hierarquia ──────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14 space-y-3">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest">
              Organização inteligente
            </p>
            <h2 className="text-3xl font-bold">
              Um sistema que se adapta à sua vida
            </h2>
            <p className="text-muted text-base max-w-xl mx-auto leading-relaxed">
              Você organiza do jeito que faz sentido pra você — não pra uma planilha genérica.
            </p>
          </div>

          {/* 3-level visual */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-0 mb-10">
            <div className="flex flex-col items-center gap-2 sm:flex-1">
              <div className="bg-primary/10 border border-primary/30 rounded-xl px-6 py-4 text-center w-full max-w-[180px]">
                <p className="text-primary font-bold text-sm mb-1">Família</p>
                <p className="text-muted text-xs leading-snug">O grupo maior<br />(ex: Moradia, Alimentação)</p>
              </div>
            </div>
            <div className="text-muted text-2xl sm:shrink-0 rotate-90 sm:rotate-0">→</div>
            <div className="flex flex-col items-center gap-2 sm:flex-1">
              <div className="bg-accent/10 border border-accent/30 rounded-xl px-6 py-4 text-center w-full max-w-[180px]">
                <p className="text-accent font-bold text-sm mb-1">Categoria</p>
                <p className="text-muted text-xs leading-snug">Subdivide a família<br />(ex: Aluguel, Mercado)</p>
              </div>
            </div>
            <div className="text-muted text-2xl sm:shrink-0 rotate-90 sm:rotate-0">→</div>
            <div className="flex flex-col items-center gap-2 sm:flex-1">
              <div className="bg-surface-2 border border-border rounded-xl px-6 py-4 text-center w-full max-w-[180px]">
                <p className="text-text-primary font-bold text-sm mb-1">Tag</p>
                <p className="text-muted text-xs leading-snug">O detalhe final — define se é Gasto ou Receita</p>
              </div>
            </div>
          </div>

          {/* Concrete example */}
          <div className="bg-surface border border-border rounded-xl p-6 max-w-2xl mx-auto">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Exemplo real</p>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <span className="text-muted">
                  <span className="text-text-secondary">💰 Renda</span>
                  {" → "}
                  <span className="text-text-secondary">Salário</span>
                  {" → "}
                  <span className="text-text-primary">Salário CLT</span>
                </span>
                <span className="text-xs font-sans font-medium text-accent bg-accent/10 border border-accent/20 px-2.5 py-0.5 rounded-full shrink-0">
                  Receita
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <span className="text-muted">
                  <span className="text-text-secondary">🏠 Moradia</span>
                  {" → "}
                  <span className="text-text-secondary">Aluguel</span>
                  {" → "}
                  <span className="text-text-primary">Mensalidade</span>
                </span>
                <span className="text-xs font-sans font-medium text-danger bg-danger/10 border border-danger/20 px-2.5 py-0.5 rounded-full shrink-0">
                  Gasto
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <span className="text-muted">
                  <span className="text-text-secondary">🍔 Alimentação</span>
                  {" → "}
                  <span className="text-text-secondary">Mercado</span>
                  {" → "}
                  <span className="text-text-primary">Feira</span>
                </span>
                <span className="text-xs font-sans font-medium text-danger bg-danger/10 border border-danger/20 px-2.5 py-0.5 rounded-full shrink-0">
                  Gasto
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Como funciona ───────────────────────────────── */}
      <section id="como-funciona" className="py-24 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest">
              Como funciona
            </p>
            <h2 className="text-3xl font-bold">Simples do começo ao fim</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                step: "01",
                title: "Crie sua estrutura uma única vez",
                desc: "Na aba Tags, crie suas Famílias (ex: Moradia, Alimentação), depois suas Categorias e finalmente as Tags com o tipo (Gasto ou Receita). Leva menos de 10 minutos e você nunca mais precisa mudar.",
              },
              {
                step: "02",
                title: "Registre em menos de 5 segundos",
                desc: "Abra Transações, clique na primeira linha e preencha: data, tag e valor. Pronto. Sem formulários, sem menus escondidos, sem complicação.",
              },
              {
                step: "03",
                title: "Importe o que já tem",
                desc: "Tinha dados em planilha? Baixe nosso modelo CSV, cole seus dados e faça upload. Meses de histórico importados em minutos.",
              },
              {
                step: "04",
                title: "Veja o panorama completo",
                desc: "No Resumo, acompanhe entradas, saídas e taxa de poupança por mês. Nos Investimentos, veja o crescimento da sua carteira com gráficos automáticos.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-5 items-start">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{step}</span>
                </div>
                <div className="flex-1 bg-surface border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-sm mb-1.5">{title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────── */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6 text-center">
          {[
            { value: "< 5s", label: "para registrar uma transação" },
            { value: "3 níveis", label: "de organização hierárquica" },
            { value: "100%", label: "dos seus dados, só seus" },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                {value}
              </p>
              <p className="text-xs text-muted mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────── */}
      <section className="py-28 px-6 relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[300px] bg-primary/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-4xl font-extrabold tracking-tight">
            Chega de planilha confusa.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Comece hoje, de graça.
            </span>
          </h2>
          <p className="text-muted text-base">
            Crie sua conta em segundos e comece a ter clareza sobre o seu
            dinheiro.
          </p>
          <Link
            href="/login"
            className="inline-block bg-primary hover:bg-primary-hover text-white font-semibold px-10 py-3.5 rounded-xl text-sm transition-colors shadow-lg shadow-primary/20"
          >
            Criar conta grátis →
          </Link>
          <p className="text-xs text-muted">
            Sem cartão de crédito. Sem pegadinha.
          </p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Loot Control"
              width={20}
              height={20}
              className="rounded-md opacity-60"
            />
            <span className="text-xs text-muted">Loot Control</span>
          </div>
          <p className="text-xs text-muted">
            Feito para quem quer ter controle de verdade, sem atrito.
          </p>
          <Link href="/login" className="text-xs text-primary hover:underline">
            Entrar na conta →
          </Link>
        </div>
      </footer>
    </div>
  );
}
