# Loot Control Web

Frontend do **Loot Control** — sistema de acompanhamento de gastos, receitas e investimentos.

## Stack

- **Next.js 15** App Router + **TypeScript**
- **Bun** — gerenciador de pacotes e runtime
- **TailwindCSS** — dark theme com tokens personalizados
- **Chart.js + react-chartjs-2** — gráficos (Resumo e Investimentos)
- **Supabase** — autenticação SSR (email/senha)

## Pré-requisitos

- [Bun](https://bun.sh/) instalado
- Backend (`loot-control-api`) rodando em `http://localhost:8000`
- Projeto no [Supabase](https://supabase.com/)

## Configuração

Crie um arquivo `.env.local` na raiz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Desenvolvimento

```bash
bun install
bun dev
```

Aplicação disponível em `http://localhost:3000`.

## Autenticação

O middleware (`src/middleware.ts`) protege todas as rotas exceto `/` e `/login`. O JWT do Supabase é anexado automaticamente em todas as requisições ao backend via `src/lib/api.ts`. Em caso de 401 o usuário é redirecionado para `/login`. Após login bem-sucedido, redireciona para `/summary`.

## Rotas

| Rota           | Acesso    | Descrição                                      |
|----------------|-----------|------------------------------------------------|
| `/`            | Público   | Landing page                                   |
| `/login`       | Público   | Login / cadastro via Supabase                  |
| `/summary`     | Protegido | Resumo mensal (gastos + investido)             |
| `/investments` | Protegido | Carteira de investimentos                      |
| `/transactions`| Protegido | Lançamentos estilo planilha                    |
| `/tags`        | Protegido | Gestão de famílias, categorias e tags          |

---

## Telas

### `/summary` — Resumo Mensal

- Navegação por mês/ano com dropdowns e botões ← →
- **5 KPIs:** Entradas, Saídas, Investido, Saldo, Taxa de Poupança
- **Layout 2 colunas** (55% gráficos / 45% cards)
- **Donut (Chart.js):** gastos por família com legenda e total central
- **Barra horizontal (Chart.js):** top 10 categorias por gasto
- **Cards de família** (clicáveis para expandir):
  - Colapsado: lista categorias com valor
  - Expandido: checklist por tag — ponto verde + valor se pago no mês, cinza se não
  - Badges: % da renda, variação vs mês anterior (▲▼)
- Card de entradas por categoria ao final
- Investimentos excluídos dos gráficos de gastos — aparecem apenas no KPI "Investido"

---

### `/investments` — Investimentos

- **3 KPIs:** Total Aportado, Nº de Ativos, Classes
- **Layout 2 colunas** (60% gráficos / 40% tabelas)
- **Line chart (Chart.js):** evolução do portfólio (valor de mercado vs aportado)
- **Donut (Chart.js):** alocação por classe com %, valor e legenda
- **Tabelas por classe:** Crypto, Ações BR, Renda Fixa, Stocks EUA, Outros
  - Cada tabela mostra: Símbolo, Preço, Qtd, Aporte (R$), Carteira (R$), Retorno, Peso
  - Ciclos encerrados (compra + venda completa) exibidos colapsados no rodapé
- **Renda Fixa:** cálculo de CDI acumulado (% do CDI) ou taxa prefixada por transação
- Classificação automática por símbolo/índice (lookup case-insensitive)

---

### `/transactions` — Lançamentos

Tabela estilo planilha.

**Colunas:** Data | Família | Categoria | Tag | Valor | Moeda | Qtd | Symbol | Index Rate | Index

**Funcionalidades:**
- Linha de criação no topo da tabela
- Double-click em qualquer linha para editar inline (Enter salva, Escape cancela)
- Filtros: Família → Categoria → Tag (cascata), Moeda, Período (data de/até)
- Paginação (50 por página)
- Importação via CSV com modal:
  - Download de modelo de exemplo
  - Validação de tipo, moeda e data
  - Campos obrigatórios para investimentos (`quantity`, `symbol`) e renda fixa (`index_rate`, `index`)
- Data padrão no fuso horário de Brasília (`America/Sao_Paulo`)
- Ordenação por `date_transaction DESC`

---

### `/tags` — Famílias, Categorias e Tags

Hierarquia de 3 níveis colapsável (▶▼):

```
Família (ex: Moradia)
└── Categoria (ex: Alimentação)
    └── Tag (ex: Restaurante)   ← tipo outcome/income está aqui
```

**Funcionalidades por nível:**

| Nível     | Ações disponíveis                                             |
|-----------|---------------------------------------------------------------|
| Família   | Criar, Excluir (cascade apaga tudo abaixo)                   |
| Categoria | Criar, Mover (trocar família inline), Excluir (cascade)      |
| Tag       | Criar, Renomear inline (Enter/Escape), Ativar/Desativar, Excluir (cascade) |

> Excluir qualquer nível apaga em cascata tudo que está abaixo (Família → Categorias → Tags → Transações).

---

### `/login`

Login e cadastro com email e senha via Supabase Auth.

---

### `/` — Landing Page

Pública, sem autenticação. Apresenta o produto: hero, problema, features, como funciona, estatísticas e CTA.

---

## Paleta de cores (dark theme)

Todos os componentes usam **tokens Tailwind** — nunca hardcodar hex nos componentes (exceto em configurações de Chart.js).

| Token          | Hex       | Uso                                  |
|----------------|-----------|--------------------------------------|
| `background`   | `#070B11` | Fundo da página                      |
| `surface`      | `#0E1218` | Cards, painéis                       |
| `surface-2`    | `#141A22` | Headers de cards, hover              |
| `surface-3`    | `#1C2330` | Hover estados secundários            |
| `border`       | `#20282F` | Todas as bordas                      |
| `primary`      | `#2563eb` | Azul — botões, links, gráficos       |
| `primary-hover`| `#1d4ed8` | Hover do primary                     |
| `accent`       | `#22c55e` | Verde — income, sucesso, pago        |
| `danger`       | `#ef4444` | Vermelho — outcome, erro, excluir    |
| `muted`        | `#8b949e` | Texto secundário                     |
| `text-primary` | `#e6edf3` | Texto principal                      |
| `text-secondary`| `#7d8590`| Texto terciário                      |

---

## API Client (`src/lib/api.ts`)

Ponto central para todos os tipos TypeScript e chamadas à API:

| Export           | Descrição                                                  |
|------------------|------------------------------------------------------------|
| `tagFamiliesApi` | CRUD de famílias                                           |
| `categoriesApi`  | CRUD de categorias (suporta `family_id`)                   |
| `tagsApi`        | CRUD de tags                                               |
| `transactionsApi`| CRUD + filtros (família/categoria/tag/moeda/data) + paginação |
| `marketDataApi`  | Cotações (exchange rates), preços de ativos e CDI histórico |

Todas as requisições anexam automaticamente o JWT do Supabase.
