"use client";

import { useState } from "react";

const steps = [
  {
    title: "Entendendo a estrutura",
    shortTitle: "Estrutura",
  },
  {
    title: "Passo 1 — Famílias",
    shortTitle: "Famílias",
  },
  {
    title: "Passo 2 — Categorias e Tags",
    shortTitle: "Categorias e Tags",
  },
  {
    title: "Passo 3 — Lançando transações",
    shortTitle: "Transações",
  },
  {
    title: "Importando dados em massa",
    shortTitle: "Importação CSV",
  },
  {
    title: "Entendendo o Resumo",
    shortTitle: "Resumo Mensal",
  },
  {
    title: "Investimentos",
    shortTitle: "Investimentos",
  },
];

function Step1() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted leading-relaxed">
        O Loot Control organiza suas finanças em três níveis hierárquicos. Antes de começar a registrar qualquer transação, é importante entender essa estrutura — ela é o que torna o sistema flexível e poderoso.
      </p>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">Hierarquia</p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <div className="bg-primary/10 border border-primary/30 text-primary text-xs font-semibold px-4 py-2 rounded-lg">
              Família
            </div>
            <span className="text-xs text-muted">O grupo maior</span>
          </div>
          <div className="text-muted text-lg hidden sm:block">→</div>
          <div className="text-muted text-lg sm:hidden">↓</div>
          <div className="flex flex-col items-center gap-1">
            <div className="bg-accent/10 border border-accent/30 text-accent text-xs font-semibold px-4 py-2 rounded-lg">
              Categoria
            </div>
            <span className="text-xs text-muted">Subdivide a família</span>
          </div>
          <div className="text-muted text-lg hidden sm:block">→</div>
          <div className="text-muted text-lg sm:hidden">↓</div>
          <div className="flex flex-col items-center gap-1">
            <div className="bg-surface-2 border border-border text-text-primary text-xs font-semibold px-4 py-2 rounded-lg">
              Tag
            </div>
            <span className="text-xs text-muted">Define Gasto ou Receita</span>
          </div>
          <div className="text-muted text-lg hidden sm:block">→</div>
          <div className="text-muted text-lg sm:hidden">↓</div>
          <div className="flex flex-col items-center gap-1">
            <div className="bg-surface-3 border border-border text-text-secondary text-xs font-semibold px-4 py-2 rounded-lg">
              Transação
            </div>
            <span className="text-xs text-muted">O lançamento</span>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">Exemplo prático</p>
        <div className="space-y-3 text-sm font-mono">
          <div className="space-y-1">
            <div className="text-primary font-semibold">Moradia</div>
            <div className="ml-4 text-text-secondary">└── Aluguel</div>
            <div className="ml-10 text-muted">└── Mensalidade <span className="text-danger text-xs font-sans font-medium ml-1 bg-danger/10 px-1.5 py-0.5 rounded">Gasto</span></div>
          </div>
          <div className="space-y-1">
            <div className="text-primary font-semibold">Alimentação</div>
            <div className="ml-4 text-text-secondary">└── Mercado</div>
            <div className="ml-10 text-muted">└── Feira <span className="text-danger text-xs font-sans font-medium ml-1 bg-danger/10 px-1.5 py-0.5 rounded">Gasto</span></div>
            <div className="ml-10 text-muted">└── Supermercado <span className="text-danger text-xs font-sans font-medium ml-1 bg-danger/10 px-1.5 py-0.5 rounded">Gasto</span></div>
          </div>
          <div className="space-y-1">
            <div className="text-primary font-semibold">Renda</div>
            <div className="ml-4 text-text-secondary">└── Salário</div>
            <div className="ml-10 text-muted">└── Salário CLT <span className="text-accent text-xs font-sans font-medium ml-1 bg-accent/10 px-1.5 py-0.5 rounded">Receita</span></div>
          </div>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
        <div className="shrink-0 mt-0.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4 text-primary">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        </div>
        <p className="text-sm text-muted leading-relaxed">
          <span className="text-text-primary font-medium">A Tag é o nível mais específico</span> — ela define se a transação é um Gasto ou uma Receita, e é o que você escolhe ao registrar qualquer lançamento. Pense nela como o rótulo final do seu gasto.
        </p>
      </div>
    </div>
  );
}

function Step2() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted leading-relaxed">
        A Família é o agrupamento mais amplo das suas finanças. É o primeiro nível que você vai criar e o que aparece nos gráficos do Resumo mensal.
      </p>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">Como criar</p>
        <ol className="space-y-3">
          {[
            "Acesse a aba Tags no menu lateral.",
            'Clique em "Nova Família" no topo da lista.',
            "Digite o nome da família e confirme com Enter.",
            "A família aparece na lista — agora você pode expandir para adicionar categorias.",
          ].map((item, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-muted leading-relaxed">{item}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">Sugestão de famílias para começar</p>
        <div className="flex flex-wrap gap-2">
          {["Moradia", "Alimentação", "Transporte", "Saúde", "Lazer", "Assinaturas", "Renda", "Investimentos"].map((f) => (
            <span key={f} className="text-xs bg-surface-2 border border-border text-text-secondary px-3 py-1.5 rounded-lg">
              {f}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex gap-3">
        <div className="shrink-0 mt-0.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4 text-accent">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <p className="text-sm text-muted leading-relaxed">
          <span className="text-text-primary font-medium">Dica:</span> Crie entre 5 e 8 famílias. Menos que isso fica vago demais; mais que isso começa a confundir na hora de analisar o resumo.
        </p>
      </div>
    </div>
  );
}

function Step3() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted leading-relaxed">
        Com as famílias criadas, o próximo passo é adicionar categorias dentro de cada uma — e dentro de cada categoria, criar as tags. As tags são o detalhe final e é onde você define o tipo (Gasto ou Receita).
      </p>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">Criando categorias</p>
        <ol className="space-y-3">
          {[
            "Na aba Tags, clique na seta ao lado de uma família para expandi-la.",
            'Clique em "Nova Categoria" que aparece dentro da família.',
            "Digite o nome (ex: Aluguel, Mercado, Academia) e confirme.",
          ].map((item, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="shrink-0 w-5 h-5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-muted leading-relaxed">{item}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">Criando tags</p>
        <ol className="space-y-3">
          {[
            "Expanda uma categoria clicando na seta ao lado dela.",
            'Clique em "Nova Tag".',
            "Digite o nome e selecione o tipo: Gasto (outcome) ou Receita (income).",
            "Confirme. A tag está pronta para ser usada em transações.",
          ].map((item, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="shrink-0 w-5 h-5 rounded-full bg-surface-3 border border-border text-text-secondary text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-muted leading-relaxed">{item}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
        <div className="shrink-0 mt-0.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4 text-primary">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        </div>
        <p className="text-sm text-muted leading-relaxed">
          <span className="text-text-primary font-medium">Importante:</span> Uma mesma categoria pode ter tags de tipos diferentes. Por exemplo, a categoria &quot;Investimentos&quot; pode ter &quot;Aporte&quot; (Gasto) e &quot;Resgate&quot; (Receita) como tags — isso é intencional e correto.
        </p>
      </div>
    </div>
  );
}

function Step4() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted leading-relaxed">
        Com a estrutura criada, você está pronto para registrar transações. A tela de Transações funciona como uma planilha — rápida, direta, sem formulários complicados.
      </p>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">Registrando uma transação</p>
        <ol className="space-y-3">
          {[
            "Acesse a aba Transações no menu lateral.",
            "A primeira linha da tabela é sempre para criar novas entradas.",
            "Preencha a data (padrão: hoje), selecione a tag e informe o valor.",
            "Pressione Enter ou clique em salvar.",
          ].map((item, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-muted leading-relaxed">{item}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">Dicas úteis</p>
        <ul className="space-y-2.5">
          {[
            "Dê dois cliques em qualquer linha existente para editar o valor, data ou tag.",
            "Use os filtros no topo para encontrar transações por família, categoria, tag ou período.",
            "A data é sempre registrada no horário de Brasília.",
            "Você pode registrar em BRL, USD ou EUR — a moeda fica salva com a transação.",
          ].map((tip, i) => (
            <li key={i} className="flex gap-2.5 text-sm">
              <span className="shrink-0 w-1 h-1 rounded-full bg-muted mt-2" />
              <span className="text-muted leading-relaxed">{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Step5() {
  const fields = [
    { name: "data", required: true, desc: "Formato YYYY-MM-DD ou DD/MM/YYYY" },
    { name: "tipo", required: true, desc: "outcome (gasto) ou income (receita)" },
    { name: "categoria", required: true, desc: "Nome exato como cadastrado no sistema" },
    { name: "tag", required: true, desc: "Nome exato como cadastrado no sistema" },
    { name: "valor", required: true, desc: "Número (ex: 150.50)" },
    { name: "moeda", required: true, desc: "BRL, USD ou EUR" },
    { name: "quantidade", required: false, desc: "Para ativos de mercado (ex: 10 ações)" },
    { name: "symbol", required: false, desc: "Ticker do ativo (ex: PETR4, BTC)" },
    { name: "index", required: false, desc: "Índice de renda fixa (ex: CDI, IPCA)" },
    { name: "index_rate", required: false, desc: "Taxa do índice (ex: 100 para 100% do CDI)" },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted leading-relaxed">
        Se você já tem transações em outra planilha, pode importar tudo de uma vez usando o arquivo CSV. Isso evita ter que registrar manualmente meses de histórico.
      </p>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">Como importar</p>
        <ol className="space-y-3">
          {[
            "Na tela de Transações, clique no ícone de seta (importar) no topo direito.",
            "Baixe o modelo CSV — ele já vem com 4 linhas de exemplo.",
            "Preencha suas transações seguindo o formato das colunas.",
            "Faça upload do arquivo preenchido.",
            "O sistema valida os dados e mostra um resumo antes de importar.",
          ].map((item, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-muted leading-relaxed">{item}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">Campos do CSV</p>
        <div className="space-y-2">
          {fields.map(({ name, required, desc }) => (
            <div key={name} className="flex items-start gap-3 text-sm">
              <div className="flex items-center gap-1.5 shrink-0 w-44">
                <code className="text-xs bg-surface-2 border border-border text-text-secondary px-2 py-0.5 rounded font-mono">
                  {name}
                </code>
                {required ? (
                  <span className="text-xs text-danger font-medium">obrigatório</span>
                ) : (
                  <span className="text-xs text-muted">opcional</span>
                )}
              </div>
              <span className="text-muted leading-relaxed">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex gap-3">
        <div className="shrink-0 mt-0.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4 text-accent">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <p className="text-sm text-muted leading-relaxed">
          <span className="text-text-primary font-medium">Atenção:</span> As categorias e tags no CSV precisam existir previamente no sistema. Crie sua estrutura na aba Tags antes de importar.
        </p>
      </div>
    </div>
  );
}

function Step6() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted leading-relaxed">
        A página de Resumo é onde você acompanha sua saúde financeira mês a mês. Ela consolida automaticamente todas as transações do período selecionado.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {[
          {
            label: "Entradas",
            desc: "Soma de todas as transações com tags do tipo Receita no mês.",
            color: "text-accent",
            bg: "bg-accent/10",
          },
          {
            label: "Saídas",
            desc: "Soma de todas as transações com tags do tipo Gasto no mês.",
            color: "text-danger",
            bg: "bg-danger/10",
          },
          {
            label: "Saldo",
            desc: "Diferença entre Entradas e Saídas. Positivo é bom sinal.",
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Taxa de Poupança",
            desc: "Percentual da sua renda que não foi gasta. Quanto maior, melhor.",
            color: "text-text-primary",
            bg: "bg-surface-2",
          },
        ].map(({ label, desc, color, bg }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4 space-y-2">
            <div className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-md ${bg} ${color}`}>
              {label}
            </div>
            <p className="text-xs text-muted leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">O que mais aparece no Resumo</p>
        <ul className="space-y-2.5">
          {[
            "Gráfico de rosca com gastos por família — veja onde vai a maior parte do dinheiro.",
            "Gráfico de barras com as 10 categorias que mais custaram no mês.",
            "Cards por família (clique para expandir) com checklist de tags: ponto verde = pago, ponto cinza = não pago ainda.",
            "Variação em relação ao mês anterior (▲▼) para cada família.",
            "Card de Entradas por categoria no final da página.",
          ].map((item, i) => (
            <li key={i} className="flex gap-2.5 text-sm">
              <span className="shrink-0 w-1 h-1 rounded-full bg-muted mt-2" />
              <span className="text-muted leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
        <div className="shrink-0 mt-0.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4 text-primary">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        </div>
        <p className="text-sm text-muted leading-relaxed">
          Use os botões ← → no seletor de mês para navegar entre períodos e comparar sua evolução ao longo do tempo.
        </p>
      </div>
    </div>
  );
}

function Step7() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted leading-relaxed">
        Investimentos no Loot Control são transações normais — só que com campos extras que identificam o ativo. Não há uma seção separada para cadastrar: você registra em Transações e o painel de Investimentos consolida automaticamente.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">Ativos de mercado</p>
          <p className="text-sm text-muted leading-relaxed">Ações, FIIs, criptomoedas. Preencha os campos:</p>
          <div className="space-y-1.5">
            <div className="flex gap-2 text-sm">
              <code className="text-xs bg-surface-2 border border-border text-text-secondary px-2 py-0.5 rounded font-mono shrink-0">quantity</code>
              <span className="text-muted">Quantidade de ativos comprada</span>
            </div>
            <div className="flex gap-2 text-sm">
              <code className="text-xs bg-surface-2 border border-border text-text-secondary px-2 py-0.5 rounded font-mono shrink-0">symbol</code>
              <span className="text-muted">Ticker (ex: PETR4, BTC, ETH)</span>
            </div>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-accent uppercase tracking-wider">Renda fixa</p>
          <p className="text-sm text-muted leading-relaxed">CDB, LCI, Tesouro Direto. Preencha os campos:</p>
          <div className="space-y-1.5">
            <div className="flex gap-2 text-sm">
              <code className="text-xs bg-surface-2 border border-border text-text-secondary px-2 py-0.5 rounded font-mono shrink-0">index</code>
              <span className="text-muted">Índice (CDI, IPCA, Selic)</span>
            </div>
            <div className="flex gap-2 text-sm">
              <code className="text-xs bg-surface-2 border border-border text-text-secondary px-2 py-0.5 rounded font-mono shrink-0">index_rate</code>
              <span className="text-muted">Taxa (ex: 100 para 100% do CDI)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">O que aparece no painel de Investimentos</p>
        <ul className="space-y-2.5">
          {[
            "Total aportado, número de ativos distintos e classes de ativos.",
            "Gráfico de linha com evolução dos aportes acumulados ao longo do tempo.",
            "Gráfico de rosca com alocação por classe (Crypto, Ações BR, Renda Fixa, Stocks EUA, Outros).",
            "Tabelas por classe com todos os ativos registrados.",
            "Preços atualizados automaticamente todo dia às 21h30 UTC.",
          ].map((item, i) => (
            <li key={i} className="flex gap-2.5 text-sm">
              <span className="shrink-0 w-1 h-1 rounded-full bg-muted mt-2" />
              <span className="text-muted leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex gap-3">
        <div className="shrink-0 mt-0.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4 text-accent">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <p className="text-sm text-muted leading-relaxed">
          <span className="text-text-primary font-medium">Dica:</span> Crie uma família chamada &quot;Investimentos&quot; com categorias por classe (Crypto, Ações, Renda Fixa) e tags para cada ativo. Assim o Resumo mensal também mostra quanto você aportou no mês.
        </p>
      </div>
    </div>
  );
}

const stepContent = [Step1, Step2, Step3, Step4, Step5, Step6, Step7];

export default function GuidePage() {
  const [current, setCurrent] = useState(0);

  const StepContent = stepContent[current];

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-1">Guia de Uso</h1>
        <p className="text-sm text-muted">
          Aprenda a configurar e usar o Loot Control em minutos.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 max-w-5xl">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:block shrink-0 w-52">
          <nav className="space-y-0.5">
            {steps.map((step, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                  current === i
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-surface-2 hover:text-text-primary"
                }`}
              >
                <span
                  className={`shrink-0 w-5 h-5 rounded-full border text-xs font-bold flex items-center justify-center ${
                    current === i
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : i < current
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-border bg-surface-2 text-text-secondary"
                  }`}
                >
                  {i < current ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="truncate">{step.shortTitle}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile progress */}
        <div className="lg:hidden flex gap-1.5 mb-2">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full flex-1 transition-colors ${
                i === current
                  ? "bg-primary"
                  : i < current
                  ? "bg-accent/60"
                  : "bg-surface-3"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 min-w-0">
          <div className="bg-surface border border-border rounded-xl p-6 space-y-6">
            {/* Step header */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-text-primary">
                  {steps[current].title}
                </h2>
              </div>
              <span className="shrink-0 text-xs text-muted bg-surface-2 border border-border px-3 py-1.5 rounded-lg whitespace-nowrap">
                Passo {current + 1} de {steps.length}
              </span>
            </div>

            {/* Content */}
            <StepContent />

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <button
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-border text-muted hover:bg-surface-2 hover:text-text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                Anterior
              </button>

              <div className="lg:hidden flex items-center gap-1">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i === current ? "bg-primary" : "bg-surface-3"
                    }`}
                  />
                ))}
              </div>

              {current < steps.length - 1 ? (
                <button
                  onClick={() => setCurrent((c) => Math.min(steps.length - 1, c + 1))}
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white transition-colors"
                >
                  Próximo
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              ) : (
                <span className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-accent/10 text-accent border border-accent/20">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  Concluido
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
