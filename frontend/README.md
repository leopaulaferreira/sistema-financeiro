# Frontend — Sistema Financeiro

Fundação visual e estrutural do frontend (Fase 4). Ainda **sem integração
com a API real** — todas as telas usam dados mockados em `src/mocks/`.

## Stack

React + TypeScript + Vite, Tailwind CSS v4, shadcn/ui, React Router,
Recharts.

## Scripts

```bash
npm install
npm run dev      # servidor de desenvolvimento
npm run build    # type-check + build de produção
npm run lint     # oxlint
npm run preview  # servir o build de produção localmente
```

## Estrutura

```
src/
  components/ui/     # primitivos shadcn/ui
  components/common/ # PageHeader, StatCard, EmptyState, Pagination...
  features/          # componentes e hooks por domínio (dashboard, transactions, accounts, categories)
  layouts/            # AppLayout (sidebar + topbar), AuthLayout
  pages/               # páginas de rota
  routes/               # definição de rotas e paths
  mocks/                 # dados mockados (contas, categorias, transações)
  lib/                    # utilitários (formatação, cálculos do dashboard, cn)
  types/                   # tipos de domínio compartilhados
```

Ver `ARCHITECTURE.md` na raiz do repositório para o desenho completo do
projeto e o roadmap de fases.
