# Loot Control Web

Frontend do **Loot Control** — sistema de acompanhamento de gastos, receitas e investimentos.

## Stack

- **Next.js 15** App Router + **TypeScript**
- **Bun** — gerenciador de pacotes e runtime
- **TailwindCSS** — dark theme
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

O middleware (`src/middleware.ts`) protege todas as rotas exceto `/login`. O JWT do Supabase é anexado automaticamente em todas as requisições ao backend via `src/lib/api.ts`.

## Telas

### `/login`
Login com email e senha via Supabase Auth.

---

### `/tags` — Famílias, Categorias e Tags

Hierarquia de 3 níveis:

```
Família (ex: Gastos de Casa)
└── Categoria (outcome | income)
    └── Tag (ativa/inativa)
```

**Funcionalidades:**
- Criar/excluir famílias (ex: "Mensalidades", "Lazer", "Investimentos")
- Criar categorias vinculadas a uma família (opcional)
- Criar tags dentro de categorias
- Prevenção de duplicatas: exibe erro se a tag já existe na categoria (HTTP 409)
- Ativar/desativar tags sem excluí-las
- Excluir família não remove categorias — apenas remove a vinculação

---

### `/transactions` — Lançamentos

Tabela estilo planilha.

**Colunas:** Data | Tipo | Categoria | Tag | Valor | Moeda | Qtd | Symbol | Index Rate | Index

**Funcionalidades:**
- Adicionar transação pela linha superior
- Double-click em qualquer linha para editar inline
- Filtros: Categoria → Tag (cascata), Moeda, Período
- Paginação (50 por página)
- Data padrão no fuso horário de Brasília (`America/Sao_Paulo`)

---

### `/summary` — Resumo Mensal

**Funcionalidades:**
- Navegação por mês/ano (← →)
- Cards de totais: Entradas, Saídas, Saldo
- Gastos agrupados por **Família de Tag**
- Para cada família:
  - Total gasto no mês
  - **% da renda** destinada à família
  - **Variação vs mês anterior** (▲ mais gasto / ▼ menos gasto)
  - Breakdown por categoria
- Card de entradas com breakdown por categoria

---

### `/investments` — Investimentos

**Funcionalidades:**
- Gráfico de linha: aportes acumulados ao longo do tempo
- Gráfico de pizza: alocação por classe de ativo
- Tabelas por classe (crypto, ações BR, renda fixa, ações US)
- Classificação automática por símbolo/índice

---

## Paleta (dark theme)

| Token       | Hex       |
|-------------|-----------|
| Background  | `#0f1117` |
| Surface     | `#1a1d2e` |
| Surface-2   | `#252840` |
| Border      | `#2d3154` |
| Primary     | `#6366f1` |
| Accent      | `#10b981` |
| Danger      | `#ef4444` |
| Muted       | `#6b7280` |

## API Client (`src/lib/api.ts`)

Ponto central para todos os tipos TypeScript e chamadas à API:

| Export            | Descrição                                    |
|-------------------|----------------------------------------------|
| `tagFamiliesApi`  | CRUD de famílias                             |
| `categoriesApi`   | CRUD de categorias (suporta `family_id`)     |
| `tagsApi`         | CRUD de tags                                 |
| `transactionsApi` | CRUD + filtros + paginação de transações     |
| `usersApi`        | Criação e consulta de usuário                |

Todas as requisições anexam automaticamente o JWT do Supabase. Em caso de 401, redireciona para `/login`.
