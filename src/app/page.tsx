import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/60 backdrop-blur-xl bg-background/75">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/nav-icon.png"
              alt="Loot Control"
              width={50}
              height={50}
              className="rounded-lg"
            />
            <span className="font-bold text-lg tracking-tight text-text-primary">
              Loot Control
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/demo"
              className="text-sm text-muted hover:text-text-primary transition-colors px-3 py-1.5"
            >
              Demo
            </Link>
            <Link
              href="/login"
              className="text-sm text-muted hover:text-text-primary transition-colors px-3 py-1.5"
            >
              Entrar
            </Link>
            <Link
              href="/login"
              className="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-all duration-200 shadow-glow-sm hover:shadow-glow-primary"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="pt-28 pb-24 px-6 text-center relative overflow-hidden">
        {/* Atmospheric mesh gradients */}
        <div className="absolute -top-40 -left-20 w-[700px] h-[700px] bg-primary/6 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/4 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-sm mx-auto mb-10">
          <div className="absolute inset-0 bg-primary/8 rounded-2xl blur-2xl scale-110 pointer-events-none" />
          <Image
            src="/logo.png"
            alt="Loot Control"
            width={600}
            height={600}
            className="relative rounded-2xl w-full h-auto"
            priority
          />
        </div>

        <div className="relative max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/20 rounded-full px-4 py-1.5 text-xs text-primary font-medium tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Controle financeiro sem atrito
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1]">
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
              className="bg-primary hover:bg-primary-hover text-white font-semibold px-8 py-3 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-glow-primary hover:-translate-y-0.5"
            >
              Começar grátis →
            </Link>
            <Link
              href="/demo"
              className="flex items-center gap-2 text-sm text-muted hover:text-text-primary border border-border hover:border-border/80 bg-surface hover:bg-surface-2 px-6 py-3 rounded-xl transition-all duration-200"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Ver demo ao vivo
            </Link>
          </div>
        </div>
      </section>

      {/* ── App preview ──────────────────────────────────── */}
      <section className="py-6 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Mock app UI */}
          <div className="rounded-2xl border border-border overflow-hidden shadow-2xl shadow-black/40">
            {/* Fake browser chrome */}
            <div className="bg-surface-2 border-b border-border px-4 py-2.5 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-danger/60" />
                <div className="w-3 h-3 rounded-full bg-primary/40" />
                <div className="w-3 h-3 rounded-full bg-accent/40" />
              </div>
              <div className="flex-1 bg-surface rounded-md h-5 mx-4 flex items-center px-3">
                <span className="text-[10px] text-muted font-mono">app.lootcontrol.com/summary</span>
              </div>
            </div>
            {/* Fake dashboard */}
            <div className="bg-background flex" style={{ height: 320 }}>
              {/* Sidebar */}
              <div className="w-44 border-r border-border bg-surface flex-col hidden md:flex" style={{ background: "linear-gradient(180deg, #0E1218 0%, #0A0F16 100%)" }}>
                <div className="border-b border-border px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-primary/20" />
                    <span className="text-xs font-semibold text-text-primary">Loot Control</span>
                  </div>
                </div>
                <div className="px-2 py-2 space-y-0.5 flex-1">
                  {["Gastos", "Investimentos", "Transações", "Tags"].map((item, i) => (
                    <div key={item} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${i === 0 ? "bg-primary/10" : ""}`}>
                      <div className={`w-3 h-3 rounded-sm ${i === 0 ? "bg-primary/60" : "bg-surface-3"}`} />
                      <span className={`text-[11px] font-medium ${i === 0 ? "text-primary" : "text-muted"}`}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Main content */}
              <div className="flex-1 p-4 overflow-hidden">
                {/* KPIs */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { label: "Entradas", value: "+R$8.500", color: "text-accent" },
                    { label: "Saídas", value: "-R$4.230", color: "text-danger" },
                    { label: "Saldo", value: "+R$4.270", color: "text-primary" },
                    { label: "Poupança", value: "50,2%", color: "text-accent" },
                  ].map((k) => (
                    <div key={k.label} className="bg-surface border border-border rounded-lg p-2">
                      <p className="text-[8px] text-muted uppercase tracking-wide">{k.label}</p>
                      <p className={`text-xs font-bold font-mono mt-0.5 ${k.color}`}>{k.value}</p>
                    </div>
                  ))}
                </div>
                {/* Two columns */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Spending bars */}
                  <div className="bg-surface border border-border rounded-lg p-3">
                    <p className="text-[9px] text-muted uppercase tracking-wide mb-2">Gastos por família</p>
                    <div className="space-y-1.5">
                      {[
                        { name: "Moradia", pct: 65, color: "#2563eb" },
                        { name: "Alimentação", pct: 28, color: "#22c55e" },
                        { name: "Saúde", pct: 4, color: "#f59e0b" },
                        { name: "Lazer", pct: 3, color: "#8b5cf6" },
                      ].map((f) => (
                        <div key={f.name}>
                          <div className="flex justify-between mb-0.5">
                            <span className="text-[8px] text-muted">{f.name}</span>
                            <span className="text-[8px] text-muted">{f.pct}%</span>
                          </div>
                          <div className="h-1 bg-surface-3 rounded-full">
                            <div className="h-full rounded-full" style={{ width: `${f.pct}%`, background: f.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Transactions */}
                  <div className="bg-surface border border-border rounded-lg p-3">
                    <p className="text-[9px] text-muted uppercase tracking-wide mb-2">Últimas transações</p>
                    <div className="space-y-1.5">
                      {[
                        { name: "Salário CLT", value: "+R$8.500", income: true },
                        { name: "Aluguel", value: "-R$2.500", income: false },
                        { name: "Mercado", value: "-R$380", income: false },
                        { name: "Netflix", value: "-R$39,90", income: false },
                      ].map((t) => (
                        <div key={t.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${t.income ? "bg-accent" : "bg-danger"}`} />
                            <span className="text-[9px] text-text-secondary">{t.name}</span>
                          </div>
                          <span className={`text-[9px] font-mono font-semibold ${t.income ? "text-accent" : "text-text-primary"}`}>{t.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-4">
            <Link href="/demo" className="text-xs text-primary hover:text-primary-hover transition-colors">
              Explorar demo interativa →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Problema ────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-border/60">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-semibold text-muted uppercase tracking-[0.15em] mb-12">
            Soa familiar?
          </p>
          <div className="grid sm:grid-cols-3 gap-4 animate-stagger">
            {[
              {
                icon: "📊",
                text: "Planilha com 47 abas que só você entende — e que você abandona em fevereiro.",
                accent: "border-l-danger/40",
              },
              {
                icon: "💸",
                text: "Você sabe que gasta muito, mas não sabe exatamente onde o dinheiro some.",
                accent: "border-l-primary/40",
              },
              {
                icon: "📈",
                text: "Seus investimentos ficam em outro lugar, desconectados das suas despesas.",
                accent: "border-l-accent/40",
              },
            ].map(({ icon, text, accent }) => (
              <div
                key={text}
                className={`bg-surface border border-border border-l-2 ${accent} rounded-xl p-5 flex gap-4 hover:bg-surface-2 transition-colors duration-200`}
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
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.15em]">
              O que você ganha
            </p>
            <h2 className="text-3xl font-bold tracking-tight">
              Tudo que você precisa, nada do que você não precisa
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-stagger">
            {[
              {
                icon: "⚡",
                title: "Registro rápido",
                desc: "Interface estilo planilha. Clique, digite, salve. Menos de 5 segundos por transação.",
                accentText: "text-primary",
                accentBg: "bg-primary/10 group-hover:bg-primary/15",
                glowClass: "hover:shadow-glow-primary",
                borderHover: "hover:border-primary/30",
              },
              {
                icon: "🗂️",
                title: "Organização hierárquica",
                desc: "Família → Categoria → Tag. Agrupe do jeito que faz sentido pra sua vida.",
                accentText: "text-accent",
                accentBg: "bg-accent/10 group-hover:bg-accent/15",
                glowClass: "hover:shadow-glow-accent",
                borderHover: "hover:border-accent/30",
              },
              {
                icon: "📅",
                title: "Resumo mensal",
                desc: "Veja gastos por família, % da sua renda e variação em relação ao mês anterior.",
                accentText: "text-primary",
                accentBg: "bg-primary/10 group-hover:bg-primary/15",
                glowClass: "hover:shadow-glow-primary",
                borderHover: "hover:border-primary/30",
              },
              {
                icon: "💼",
                title: "Investimentos integrados",
                desc: "Ações, cripto e renda fixa no mesmo lugar. Gráfico de aportes e alocação por classe.",
                accentText: "text-accent",
                accentBg: "bg-accent/10 group-hover:bg-accent/15",
                glowClass: "hover:shadow-glow-accent",
                borderHover: "hover:border-accent/30",
              },
              {
                icon: "📥",
                title: "Importação por CSV",
                desc: "Tinha dados espalhados? Importe tudo de uma vez com nosso modelo pronto.",
                accentText: "text-primary",
                accentBg: "bg-primary/10 group-hover:bg-primary/15",
                glowClass: "hover:shadow-glow-primary",
                borderHover: "hover:border-primary/30",
              },
              {
                icon: "🌙",
                title: "Dark mode nativo",
                desc: "Feito para quem passa horas na frente de uma tela. Seus olhos agradecem.",
                accentText: "text-accent",
                accentBg: "bg-accent/10 group-hover:bg-accent/15",
                glowClass: "hover:shadow-glow-accent",
                borderHover: "hover:border-accent/30",
              },
            ].map(({ icon, title, desc, accentText, accentBg, glowClass, borderHover }) => (
              <div
                key={title}
                className={`group bg-surface border border-border ${borderHover} rounded-xl p-6 space-y-3 ${glowClass} hover:-translate-y-0.5 transition-all duration-200`}
              >
                <div className={`w-10 h-10 ${accentBg} rounded-lg flex items-center justify-center text-xl transition-colors duration-200`}>
                  {icon}
                </div>
                <h3 className={`font-semibold text-sm ${accentText}`}>{title}</h3>
                <p className="text-sm text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hierarquia ──────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-border/60">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14 space-y-3">
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.15em]">
              Organização inteligente
            </p>
            <h2 className="text-3xl font-bold tracking-tight">
              Um sistema que se adapta à sua vida
            </h2>
            <p className="text-muted text-base max-w-xl mx-auto leading-relaxed">
              Você organiza do jeito que faz sentido pra você — não pra uma planilha genérica.
            </p>
          </div>

          {/* 3-level visual */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-0 mb-10">
            <div className="flex flex-col items-center gap-2 sm:flex-1">
              <div className="bg-primary/8 border border-primary/25 rounded-xl px-6 py-4 text-center w-full max-w-[180px] hover:bg-primary/12 hover:border-primary/40 transition-colors duration-200">
                <p className="text-primary font-bold text-sm mb-1">Família</p>
                <p className="text-muted text-xs leading-snug">O grupo maior<br />(ex: Moradia, Alimentação)</p>
              </div>
            </div>
            <div className="text-muted text-xl sm:shrink-0 rotate-90 sm:rotate-0 opacity-40">→</div>
            <div className="flex flex-col items-center gap-2 sm:flex-1">
              <div className="bg-accent/8 border border-accent/25 rounded-xl px-6 py-4 text-center w-full max-w-[180px] hover:bg-accent/12 hover:border-accent/40 transition-colors duration-200">
                <p className="text-accent font-bold text-sm mb-1">Categoria</p>
                <p className="text-muted text-xs leading-snug">Subdivide a família<br />(ex: Aluguel, Mercado)</p>
              </div>
            </div>
            <div className="text-muted text-xl sm:shrink-0 rotate-90 sm:rotate-0 opacity-40">→</div>
            <div className="flex flex-col items-center gap-2 sm:flex-1">
              <div className="bg-surface-2 border border-border rounded-xl px-6 py-4 text-center w-full max-w-[180px] hover:border-border/80 transition-colors duration-200">
                <p className="text-text-primary font-bold text-sm mb-1">Tag</p>
                <p className="text-muted text-xs leading-snug">O detalhe final — define se é Gasto ou Receita</p>
              </div>
            </div>
          </div>

          {/* Concrete example */}
          <div className="bg-surface border border-border rounded-xl p-6 max-w-2xl mx-auto">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-[0.15em] mb-4">Exemplo real</p>
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
      <section id="como-funciona" className="py-24 px-6 border-t border-border/60">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.15em]">
              Como funciona
            </p>
            <h2 className="text-3xl font-bold tracking-tight">Simples do começo ao fim</h2>
          </div>

          <div className="relative pl-8">
            {/* Timeline line */}
            <div className="absolute left-[11px] top-4 bottom-4 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent pointer-events-none" />

            <div className="space-y-4 animate-stagger">
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
                  {/* Step circle with primary glow */}
                  <div className="shrink-0 w-6 h-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center -ml-8 z-10 relative">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div className="flex-1 bg-surface border border-border rounded-xl p-5 hover:border-border/80 hover:bg-surface-2 transition-all duration-200 -mt-1">
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="text-[10px] font-mono font-bold text-primary/70 tracking-wider">{step}</span>
                      <h3 className="font-semibold text-sm text-text-primary">{title}</h3>
                    </div>
                    <p className="text-sm text-muted leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────── */}
      <section className="py-16 px-6 border-t border-border/60">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6 text-center">
          {[
            { value: "< 5s", label: "para registrar uma transação" },
            { value: "3 níveis", label: "de organização hierárquica" },
            { value: "100%", label: "dos seus dados, só seus" },
          ].map(({ value, label }) => (
            <div key={label} className="space-y-1">
              <p className="text-3xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                {value}
              </p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[350px] bg-primary/6 rounded-full blur-3xl" />
          <div className="absolute w-[300px] h-[200px] bg-accent/5 rounded-full blur-3xl translate-x-40 translate-y-20" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-4xl font-bold tracking-tight leading-tight">
            Chega de planilha confusa.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Comece hoje, de graça.
            </span>
          </h2>
          <p className="text-muted text-base">
            Crie sua conta em segundos e comece a ter clareza sobre o seu dinheiro.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold px-10 py-3.5 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-glow-primary hover:-translate-y-0.5"
            >
              Criar conta grátis
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <p className="text-xs text-text-secondary">
            Sem cartão de crédito. Sem pegadinha.
          </p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-border/60 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Loot Control"
              width={20}
              height={20}
              className="rounded-md opacity-50"
            />
            <span className="text-xs text-text-secondary">Loot Control</span>
          </div>
          <p className="text-xs text-text-secondary">
            Feito para quem quer ter controle de verdade, sem atrito.
          </p>
          <Link href="/login" className="text-xs text-primary hover:text-primary-hover transition-colors">
            Entrar na conta →
          </Link>
        </div>
      </footer>
    </div>
  );
}
