# ARCHITECTURE.md — Sistema de Finanças Pessoais

> Este documento descreve a arquitetura **pensada para a versão final do
> produto**, mesmo que a implementação seja incremental. Funcionalidades
> futuras (recorrências, orçamentos, metas, cartão de crédito, relatórios)
> são consideradas no desenho do domínio desde já, para que as fases
> seguintes sejam apenas *adição* de comportamento — não remodelagem
> estrutural do que já existe.

## 1. Visão geral

Aplicação monolítica bem estruturada, com frontend e backend fisicamente
separados (processos distintos), mas sem fragmentação em microsserviços.
Alvo: rodar confortavelmente em uma VM Linux com ~1 GB de RAM **que já
hospeda outros projetos** — ou seja, esta aplicação não tem a VM só para
si, e o orçamento de memória precisa ser conservador desde o início.

```
┌────────────────────┐        HTTPS/JSON         ┌──────────────────────────┐
│  Nginx (porta 443)  │ ────────────────────────▶ │ Spring Boot API (8080)   │
│  - serve React      │                            │  - REST controllers      │
│    (build estático) │ ◀──────────────────────── │  - Services               │
│  - proxy /api/* p/  │   cookies HttpOnly         │  - Spring Data JPA        │
│    backend            │                          │  - Spring Security        │
└────────────────────┘                            │    (cookie + CSRF)        │
                                                     └────────────┬─────────────┘
                                                                  │ JDBC
                                                                  ▼
                                                       ┌────────────────────────┐
                                                       │ PostgreSQL (instância    │
                                                       │ compartilhada da VM,      │
                                                       │ database exclusivo)       │
                                                       └────────────────────────┘
```

Um único domínio serve tudo: Nginx entrega os arquivos estáticos do React e
faz proxy reverso de `/api/*` para o Spring Boot, no mesmo host — isso
mantém frontend e backend **same-origin**, o que simplifica (e torna mais
seguro) o uso de cookies de autenticação.

## 2. Stack

| Camada       | Tecnologia                                             |
|--------------|-----------------------------------------------------------|
| Frontend     | React + TypeScript + Vite                                  |
| Estilo       | TailwindCSS + shadcn/ui (tema escuro)                       |
| Estado servidor | TanStack Query (React Query)                             |
| Estado UI    | Zustand (sidebar, tema, filtros de UI)                       |
| Formulários  | react-hook-form + zod                                         |
| Gráficos     | Recharts                                                        |
| Backend      | Java 21 + Spring Boot 4.1 (revisado na Fase 1 — Boot 3 já sem suporte OSS ativo quando a implementação começou) |
| Persistência | Spring Data JPA / Hibernate                                       |
| Auth         | Spring Security — JWT em cookie HttpOnly (não localStorage), com CSRF |
| Migrações    | Flyway                                                              |
| Banco        | PostgreSQL — instância já existente na VM, database exclusivo        |
| Build backend| Maven                                                                  |
| Deploy       | Linux + systemd (backend), Nginx (frontend + proxy), HTTPS via Let's Encrypt |
| Docker       | Apenas onde reduz risco/consumo de forma comprovada — ver seção 13 |

## 3. Por que não microsserviços / fila / cache / ES

Dado o volume de dados de um app de finanças pessoais (um usuário ou poucos
usuários, milhares de transações no máximo) e o limite de memória
compartilhado com outros projetos na mesma VM:

- **Microsserviços**: overhead de rede, serialização e operação (múltiplas
  JVMs) não se paga nesse volume. Um monólito modular por pacote já dá
  separação de responsabilidades sem o custo operacional.
- **RabbitMQ/Kafka**: não há processamento assíncrono de alto volume nem
  integração entre serviços que justifique um broker. Tudo é
  request/response síncrono.
- **Redis**: os dados cabem confortavelmente em memória de
  aplicação/consulta direta ao Postgres com índices adequados. Cache
  prematuro adiciona complexidade (invalidação) sem benefício mensurável
  nesse volume. Também é a razão pela qual a estratégia de sessão de
  autenticação (seção 5) usa JWT stateless + tabela de refresh tokens no
  Postgres, em vez de um armazenamento de sessão em memória distribuída.
- **Elasticsearch**: não há busca full-text complexa. Filtros por período,
  categoria, conta etc. são resolvidos com índices Postgres comuns.

Cada um desses componentes é um processo adicional consumindo RAM que a VM
compartilhada não tem sobrando.

## 4. Arquitetura do backend

### 4.1 Estilo

Monólito em camadas, organizado **por feature** (package-by-feature), não
por camada técnica global. Isso mantém alta coesão e facilita evolução
futura para módulos mais isolados, se um dia for necessário.

```
Controller (REST, DTOs) → Service (regras de negócio) → Repository (Spring Data JPA) → PostgreSQL
```

- **Controllers**: recebem/retornam DTOs, nunca entidades JPA diretamente.
  Validação com Bean Validation (`@Valid`).
- **Services**: regras de negócio, transações (`@Transactional`), checagem
  de posse (o recurso pertence ao usuário autenticado).
- **Repositories**: interfaces Spring Data JPA + queries JPQL/nativas para
  agregações do dashboard.
- **Mapeamento DTO ↔ Entidade**: manual (métodos estáticos `toDto`/
  `toEntity` ou pequenas classes `*Mapper`). Evita a dependência do
  MapStruct em um projeto deste tamanho.

### 4.2 Estrutura de pacotes

```
com.financeapp
├── config/            # SecurityConfig, CorsConfig, OpenApiConfig, JacksonConfig, CookieProperties
├── common/
│   ├── exception/      # GlobalExceptionHandler, exceções de domínio
│   ├── pagination/       # PageResponse<T> genérico
│   └── audit/             # BaseEntity (createdAt/updatedAt)
├── auth/
│   ├── AuthController, AuthService
│   ├── JwtService, JwtAuthFilter, CookieService
│   ├── RefreshToken (entity), RefreshTokenRepository
│   └── dto/ (RegisterRequest, LoginRequest, AuthResponse)
├── user/
│   └── User (entity), UserRepository
├── account/
│   └── Account, AccountRepository, AccountService, AccountController, dto/
├── category/
│   └── Category, CategoryRepository, CategoryService, CategoryController, dto/
├── paymentmethod/
│   └── PaymentMethod, PaymentMethodRepository, ..., Controller, dto/
├── transaction/
│   └── Transaction, TransactionRepository, TransactionService, TransactionController, dto/
├── dashboard/
│   └── DashboardController, DashboardService, dto/
├── recurring/          # Fase 6 — RecurringTransaction, geração de ocorrências
├── budget/              # Fase 7 — Budget
├── goal/                  # Fase 7 — FinancialGoal
└── report/                  # Fase 8 — exportação/agregações de relatórios
```

Os pacotes `recurring/`, `budget/`, `goal/` e `report/` são reservados no
desenho (nomes e responsabilidades já definidos) mas só recebem código nas
fases 6–8. Isso evita decisões de nomenclatura/organização de última hora.

### 4.3 Tratamento de erros

`@RestControllerAdvice` global convertendo exceções de domínio
(`ResourceNotFoundException`, `AccessDeniedException`, `ValidationException`)
em respostas JSON padronizadas (`{status, message, errors[], timestamp}`).

## 5. Autenticação e segurança

### 5.0 Estratégia aprovada (resumo sem ambiguidade)

Nenhum token (access, refresh ou CSRF) é lido ou escrito por JavaScript via
`localStorage`/`sessionStorage` em nenhum momento. O estado de sessão vive
inteiramente em cookies geridos pelo navegador/backend:

- **Access token** (JWT) em cookie `HttpOnly` — inacessível a JavaScript.
- **Refresh token** (JWT) em cookie `HttpOnly`, `Path` restrito a
  `/api/auth/refresh` — inacessível a JavaScript.
- Ambos com `Secure` em produção (HTTPS) e `SameSite=Strict`.
- **`XSRF-TOKEN`** é o único cookie legível pelo frontend (não é `HttpOnly`
  por definição — é assim que o padrão double-submit funciona), usado
  exclusivamente para prova de origem contra CSRF, nunca para autenticação.
- O frontend lê o valor do cookie `XSRF-TOKEN` e o reenvia no header
  `X-XSRF-TOKEN` (nome padrão esperado pelo `CookieCsrfTokenRepository` do
  Spring Security) em toda requisição mutante (POST/PUT/PATCH/DELETE).
- Proteção CSRF segue o padrão **cookie + header**, validado pelo Spring
  Security no backend — não há lógica de CSRF no frontend além de ler o
  cookie e ecoar o header.

Qualquer menção anterior a `localStorage` como local de armazenamento de
token foi removida da documentação — não é a estratégia adotada.

### 5.1 Decisão

JWT **stateless**, mas transportado em **cookie HttpOnly** — nunca em
`localStorage`/`sessionStorage` (elimina a superfície de roubo de token via
XSS, já que JavaScript não consegue ler o cookie). Como cookies são
enviados automaticamente pelo navegador, isso introduz risco de CSRF, que é
mitigado em duas camadas (seção 5.4).

Modelo de dois tokens:

| Token | Onde vive | Duração | Cookie |
|---|---|---|---|
| **Access token** | JWT assinado, stateless | curta (15 min) | `access_token` — `HttpOnly; Secure*; SameSite=Strict; Path=/` |
| **Refresh token** | Valor opaco aleatório (256 bits) + hash SHA-256 persistido no Postgres — revisado na Fase 1: não é um JWT (ver nota abaixo) | longa (30 dias) | `refresh_token` — `HttpOnly; Secure*; SameSite=Strict; Path=/api/auth/refresh` |
| **CSRF token** | valor aleatório legível por JS | igual à sessão | `XSRF-TOKEN` — `Secure*; SameSite=Strict; Path=/` (sem HttpOnly, precisa ser lido pelo frontend) |

`*Secure` é habilitado apenas em produção (HTTPS). Em desenvolvimento local
(HTTP), o cookie é enviado sem o atributo `Secure`, controlado por profile
do Spring (`application-dev.yml` vs `application-prod.yml`).

O refresh token fica com o **path restrito** a `/api/auth/refresh`, então o
navegador só o envia nesse endpoint específico — reduz a exposição do
token de longa duração nas demais chamadas.

> **Desvio implementado na Fase 1:** o refresh token deixou de ser um JWT e
> passou a ser um valor opaco aleatório (32 bytes via `SecureRandom`,
> Base64URL). Sua validade **sempre** depende de uma consulta ao banco
> (verificar revogação/expiração/reuso), então ser um JWT autocontido não
> trazia nenhuma vantagem — apenas superfície extra de parsing. O access
> token continua sendo o único JWT do sistema.

### 5.2 Por que refresh token com tabela no Postgres (não Redis)

Um JWT puramente stateless não pode ser revogado antes de expirar (logout
real, "sair de todos os dispositivos", detecção de reuso roubado). Para
resolver isso sem introduzir Redis, o refresh token é:

1. Emitido como JWT, mas seu **hash** (SHA-256) é persistido em uma tabela
   `refresh_tokens` no próprio Postgres já usado pela aplicação.
2. A cada uso, é **rotacionado**: o token antigo é invalidado e um novo é
   emitido. Se um token já invalidado for reapresentado, é sinal de reuso
   indevido (token roubado) — a sessão inteira do usuário é revogada.
3. Logout apaga a linha correspondente; "sair de todos os dispositivos"
   apaga todas as linhas do usuário.

Essa tabela é criada **na Fase 1** (fundação de autenticação), não depois —
é parte do desenho de segurança final, não um adendo futuro.

```sql
CREATE TABLE refresh_tokens (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    user_agent  VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
```

### 5.3 Fluxo completo

```
1. POST /api/auth/login {email, senha}
   → valida credenciais
   → gera access_token (JWT, 15 min) + refresh_token (JWT, 30 dias)
   → persiste hash do refresh_token em refresh_tokens
   → Set-Cookie: access_token, refresh_token, XSRF-TOKEN

2. Requisições autenticadas (GET/POST/...)
   → navegador envia automaticamente o cookie access_token
   → JwtAuthFilter lê o cookie (não header Authorization), valida assinatura/expiração
   → popula SecurityContext
   → requisições de escrita (POST/PUT/PATCH/DELETE) também exigem
     header X-XSRF-TOKEN == cookie XSRF-TOKEN (validado pelo filtro CSRF do Spring Security)

3. access_token expira (401 Unauthorized)
   → frontend chama POST /api/auth/refresh (sem body; refresh_token vai
     automaticamente pois o path bate)
   → backend valida hash do refresh_token na tabela (não expirado, não revogado)
   → rotaciona: revoga o token antigo, emite novo access_token + novo refresh_token
   → frontend repete a requisição original automaticamente (interceptor)

4. POST /api/auth/logout
   → revoga o refresh_token atual na tabela
   → limpa os três cookies (Max-Age=0)
```

### 5.4 CSRF

`SameSite=Strict` já impede que o navegador envie os cookies de
autenticação em requisições disparadas por outro site (top-level
navigation ou fetch cross-site) — é a primeira linha de defesa e cobre a
maior parte do risco, já que frontend e API são same-origin.

Como defesa em profundidade (recomendado para um app financeiro), a
proteção CSRF nativa do Spring Security é mantida ativa para os métodos
mutantes (POST/PUT/PATCH/DELETE), usando `CookieCsrfTokenRepository`
(padrão *double-submit cookie*): o backend expõe o token em um cookie
legível (`XSRF-TOKEN`), o frontend o lê e reenvia no header `X-XSRF-TOKEN`
a cada mutação; o backend compara. `GET`/`HEAD`/`OPTIONS` ficam isentos
(não alteram estado).

### 5.5 Implicações no frontend

- Cliente HTTP (`fetch`/axios) configurado com `credentials: 'include'`
  em toda chamada — os cookies viajam automaticamente, não há token para
  guardar em memória/estado do React.
- Interceptor de resposta: em `401`, tenta uma vez `POST /api/auth/refresh`
  e repete a requisição original; se o refresh também falhar, redireciona
  para `/login`.
- Interceptor de requisição: em métodos mutantes, injeta o header
  `X-XSRF-TOKEN` lido do cookie `XSRF-TOKEN`.
- **Dev server (Vite)**: configurado com proxy (`server.proxy` para
  `/api` → `http://localhost:8080`) para que o frontend em desenvolvimento
  também converse com o backend como *same-origin*. Isso evita ter que
  lidar com `SameSite=None`/CORS+credenciais em dev, e mantém o
  comportamento idêntico entre dev e produção.

## 6. Arquitetura do frontend

### 6.1 Estrutura de diretórios

```
frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── routes.tsx          # react-router
│   │   └── layout/
│   │       ├── AppShell.tsx     # sidebar + topbar + outlet
│   │       └── Sidebar.tsx
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   │   ├── components/ (SummaryCards, ExpenseByCategoryChart, IncomeExpenseChart)
│   │   │   ├── hooks/ (useDashboardSummary, useCategoryBreakdown)
│   │   │   └── DashboardPage.tsx
│   │   ├── transactions/
│   │   │   ├── components/ (TransactionForm, TransactionTable, TransactionFilters)
│   │   │   ├── hooks/ (useTransactions, useCreateTransaction, ...)
│   │   │   └── TransactionsPage.tsx
│   │   ├── accounts/
│   │   ├── categories/
│   │   ├── payment-methods/
│   │   ├── recurring/       # Fase 6
│   │   ├── budgets/          # Fase 7
│   │   ├── goals/              # Fase 7
│   │   └── reports/              # Fase 8
│   ├── components/ui/         # primitives shadcn (button, card, dialog, table...)
│   ├── lib/
│   │   ├── api-client.ts      # fetch wrapper com credentials:'include' + refresh + CSRF header
│   │   └── query-client.ts
│   ├── hooks/
│   ├── types/
│   │   └── api.ts             # tipos mantidos manualmente a partir dos DTOs
│   └── styles/
│       └── globals.css
├── index.html
├── vite.config.ts             # inclui proxy dev de /api
└── tailwind.config.ts
```

### 6.2 Padrões

- **Server state**: TanStack Query — cache, invalidação e refetch
  automáticos após mutações.
- **UI state local**: Zustand apenas para estado de interface (sidebar
  colapsada, tema, filtros temporários de UI) — nunca para dados que vêm
  da API, e nunca para tokens (não existem tokens acessíveis ao JS).
- **Formulários**: react-hook-form + zod schema compartilhando validação
  com o shape esperado pelo backend.
- **Roteamento protegido**: `PrivateRoute` que verifica o estado de sessão
  via uma chamada leve `GET /api/auth/me` (não há token para inspecionar
  no cliente, já que ele é HttpOnly).

## 7. Fluxo completo: cadastro de uma despesa

1. Usuário clica em "Nova Transação" → abre modal/drawer.
2. Formulário (react-hook-form) com campos: tipo (INCOME/EXPENSE, default
   EXPENSE), descrição, valor, data, categoria (select filtrado por
   `type=EXPENSE`), conta, método de pagamento, observação opcional.
3. Validação client-side via zod.
4. Submit → mutation do React Query dispara `POST /api/transactions`
   (cookies enviados automaticamente pelo navegador; header
   `X-XSRF-TOKEN` injetado pelo interceptor).
5. Backend:
   - `JwtAuthFilter` lê e valida o cookie `access_token`, popula o
     `SecurityContext`.
   - Filtro CSRF do Spring Security valida `X-XSRF-TOKEN`.
   - `TransactionController` recebe `TransactionRequest`, valida com
     `@Valid`.
   - `TransactionService` confirma que `accountId`, `categoryId`,
     `paymentMethodId` pertencem ao usuário autenticado (evita IDOR) e
     persiste a entidade dentro de uma transação (`@Transactional`).
   - Retorna `201 Created` com o DTO da transação criada.
6. Frontend invalida `['transactions']`, `['dashboard-summary']` e as
   queries de gráficos → React Query refaz o fetch → UI atualiza sem
   reload.
7. Toast de sucesso; modal fecha; nova linha aparece na tabela e os
   cards/gráficos do dashboard refletem o novo total.

## 8. Cálculo dos dados do dashboard

Todos os agregados são calculados no Postgres via `SUM`/`GROUP BY`
(`TransactionRepository`/`AccountRepository`), filtrados sempre por
`user_id` — nenhum endpoint carrega a lista de transações do usuário para
somar em memória Java. Implementado na Fase 3.

### 8.1 Semântica de período (`year`/`month`)

`year=2026&month=8` representa o intervalo **half-open** `[2026-08-01,
2026-09-01)` — ou seja, `date >= from AND date < to` com
`to = from.plusMonths(1)`. Evita ambiguidade de fuso/limite que um `BETWEEN`
inclusive nos dois extremos teria em torno da virada do mês. `Transaction.date`
é `DATE` (sem componente de hora), então essa comparação é direta, sem
conversão de timezone envolvida.

### 8.2 Fórmulas

- **`totalIncome`** (do mês): `SUM(amount) WHERE user_id=:u AND type=INCOME AND date >= :from AND date < :to`. Não filtra por tipo de conta — inclui, por exemplo, uma despesa lançada num cartão de crédito, pois representa o que foi efetivamente gasto/recebido no mês.
- **`totalExpenses`** (do mês): idem com `type=EXPENSE`.
- **`netSavings`**: `totalIncome - totalExpenses` (calculado em Java a partir dos dois totais já agregados, não é uma query própria).
- **`availableBalance`** (disponibilidade financeira — ver seção 10.6): `SUM(account.initial_balance) + SUM(transaction.amount WHERE type=INCOME) - SUM(transaction.amount WHERE type=EXPENSE)`, **restrito a contas com `type <> CREDIT_CARD`**, cumulativo **até `to` (exclusivo)** — não apenas do mês consultado, mas de todo o histórico até o fim do período. Uma despesa lançada num cartão de crédito não reduz esse número: ainda não saiu do caixa, é dívida futura (diferente de `totalExpenses`, que inclui gastos no cartão).
- **Gastos por categoria**: `GROUP BY category_id`, só `type=EXPENSE`, período do mês, ordenado por soma decrescente. Só retorna categorias com pelo menos uma despesa — lista vazia quando não há despesas no período (evita divisão por zero no cálculo de `percentage`, que é feito em Java com `RoundingMode.HALF_UP` e escala 2).
- **Receitas x despesas (série temporal)**: granularidade **diária** — o endpoint é sempre escopado a um único mês (`year`+`month`), então dia é a granularidade natural (~28–31 pontos, adequado para um gráfico). Dias sem nenhuma transação são preenchidos com zero pelo Service (não pela query — o Postgres só retorna dias com movimentação; o Service gera a lista completa de dias do mês e usa zero como default), para que o frontend receba um eixo temporal contínuo sem buracos para tratar.
- **Últimas transações**: `ORDER BY date DESC, id DESC` (determinístico mesmo com múltiplas transações no mesmo dia), `LIMIT` fornecido pelo cliente mas sempre capado em 50 no Service, independente do que for enviado.
- **Saldo por conta**: `initial_balance + SUM(income vinculada à conta) - SUM(expense vinculada à conta)`, cumulativo (sem filtro de período). **Contas `CREDIT_CARD` são excluídas da resposta** — não só do somatório de disponibilidade, mas do endpoint inteiro (`GET /api/dashboard/accounts-balance`) — porque a semântica real de "saldo" de um cartão (fatura, fechamento, pagamento parcial) ainda não existe (módulo de cartão é fase futura); aplicar a mesma fórmula ingenuamente produziria um número que parece um saldo mas não significa o que o usuário esperaria ver.

## 9. Modelo de dados

### 9.1 Entidades ativas (Fases 1–3)

```sql
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(120) NOT NULL,
    email         VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    user_agent  VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);

-- Tipos como VARCHAR + CHECK em vez de enum nativo do Postgres — decisão
-- tomada na Fase 2 (ver nota abaixo): mesma integridade, sem a fricção de
-- mapeamento JPA/Hibernate que enums nativos exigem.

CREATE TABLE accounts (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name             VARCHAR(80) NOT NULL,
    type             VARCHAR(20) NOT NULL CHECK (type IN ('CHECKING', 'SAVINGS', 'WALLET', 'CREDIT_CARD', 'INVESTMENT')),
    initial_balance  NUMERIC(12,2) NOT NULL DEFAULT 0,
    active           BOOLEAN NOT NULL DEFAULT TRUE,
    -- colunas abaixo ficam ausentes até a Fase de cartão de crédito (ver seção 10);
    -- criadas por migração própria quando aquele módulo for implementado, não agora.
    -- credit_limit           NUMERIC(12,2),
    -- statement_closing_day  SMALLINT,
    -- payment_due_day        SMALLINT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_accounts_user ON accounts (user_id);

CREATE TABLE categories (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       VARCHAR(60) NOT NULL,
    type       VARCHAR(20) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    color      VARCHAR(7),
    icon       VARCHAR(40),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, name, type)
);

CREATE INDEX idx_categories_user_type ON categories (user_id, type);

CREATE TABLE payment_methods (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       VARCHAR(60) NOT NULL,
    type       VARCHAR(20) NOT NULL CHECK (type IN ('CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'PIX', 'BANK_TRANSFER', 'OTHER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, name)
);

CREATE INDEX idx_payment_methods_user ON payment_methods (user_id);

CREATE TABLE transactions (
    id                     BIGSERIAL PRIMARY KEY,
    user_id                BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id             BIGINT NOT NULL REFERENCES accounts(id),
    category_id            BIGINT NOT NULL REFERENCES categories(id),
    payment_method_id      BIGINT NOT NULL REFERENCES payment_methods(id),
    description            VARCHAR(160) NOT NULL,
    amount                 NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    type                   VARCHAR(20) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    date                   DATE NOT NULL,
    notes                  VARCHAR(500),
    -- colunas abaixo ficam ausentes até as Fases 6 e "cartão de crédito" respectivamente;
    -- adição de coluna NULL sem default é operação de metadado no Postgres,
    -- não exige rewrite de tabela nem backfill — por isso não precisam existir agora.
    -- recurring_transaction_id BIGINT REFERENCES recurring_transactions(id),
    -- installment_number       SMALLINT,
    -- installment_total        SMALLINT,
    -- purchase_group_id        UUID,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user_date       ON transactions (user_id, date DESC);
CREATE INDEX idx_transactions_user_type_date  ON transactions (user_id, type, date);
CREATE INDEX idx_transactions_user_category   ON transactions (user_id, category_id);
CREATE INDEX idx_transactions_user_account    ON transactions (user_id, account_id);
```

Notas de modelagem:

- `amount` é sempre positivo; o sinal é dado pelo `type`.
- `initial_balance` representa o saldo "ponto de partida" antes do
  histórico registrado no app.
- `categories`/`payment_methods` são por usuário; seed automático de um
  conjunto padrão no registro **ainda não implementado** — ficou fora do
  escopo explícito da Fase 2 (CRUD), fica para quando fizer sentido.
- Sem soft delete no MVP: `DELETE` físico, bloqueado com `409 Conflict`
  se houver transações vinculadas — vale para accounts, categories e
  payment_methods (Fase 2).
- **Desvio implementado na Fase 2:** `accounts` não tem mais a coluna
  `currency` (sistema é mono-moeda BRL, coluna fixa nunca variava — sem
  ganho em mantê-la) e `archived` foi renomeada para `active`
  (equivalente, apenas polaridade invertida). `updated_at` foi adicionado
  a `accounts` (faltava na v1 do desenho). Enums nativos do Postgres
  (`CREATE TYPE ... AS ENUM`) foram trocados por `VARCHAR + CHECK` em
  todas as tabelas — o mapeamento JPA/Hibernate para enum nativo exige
  anotações extras (`@JdbcTypeCode`) sensíveis à versão, enquanto
  `@Enumerated(STRING)` contra uma coluna `VARCHAR` funciona sem fricção
  e com a mesma integridade via `CHECK`. Também elimina por completo a
  restrição de `ALTER TYPE ... ADD VALUE` discutida na seção 9.3.4.

### 9.2 Visão final do domínio — entidades futuras (não criadas agora)

Desenhadas desde já para garantir que se encaixam sem atrito no modelo
atual. Serão materializadas em migrações Flyway próprias, na fase indicada.

**`recurring_transactions`** (Fase 6, implementada — migration `V3`) — regra
geradora de transações, nunca as substitui:

```sql
CREATE TABLE recurring_transactions (
    id                   BIGSERIAL PRIMARY KEY,
    user_id              BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id           BIGINT NOT NULL REFERENCES accounts(id),
    category_id          BIGINT NOT NULL REFERENCES categories(id),
    payment_method_id    BIGINT NOT NULL REFERENCES payment_methods(id),
    description          VARCHAR(160) NOT NULL,
    amount               NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    type                 VARCHAR(20) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    frequency            VARCHAR(20) NOT NULL CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),
    start_date           DATE NOT NULL,
    end_date             DATE,
    next_execution_date  DATE NOT NULL,
    last_execution_date  DATE,
    active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_date IS NULL OR end_date >= start_date)
);
```

**Nota:** o rascunho original desta seção (escrito antes da Fase 2) usava
`CREATE TYPE ... AS ENUM` e `type transaction_type NOT NULL` como se
existisse um enum nativo do Postgres para `transaction_type` — nunca
existiu; a Fase 2 já havia decidido `VARCHAR + CHECK` para todos os tipos
enumerados (seção 9.1/9.3.4), e este rascunho só não tinha sido atualizado.
A implementação da Fase 6 segue o padrão real do projeto, não o rascunho.
`next_occurrence_at` também foi renomeada para `next_execution_date`
(mesmo campo, nome mais explícito) e `last_execution_date` foi adicionada —
não usada em nenhuma regra de negócio (a fonte de verdade do agendamento é
sempre `next_execution_date`), só para auditoria/depuração de catch-up.

Cada disparo gera uma linha real em `transactions`, vinculada de volta via
`transactions.recurring_transaction_id` + `transactions.recurrence_date`
(colunas adicionadas na mesma migração `V3`). A dupla
`(recurring_transaction_id, recurrence_date)` é `UNIQUE` — é a última
linha de defesa contra uma ocorrência ser gerada duas vezes (ver "Fase 6 —
recorrências" abaixo). Isso preserva o princípio central do domínio
(seção 9.3): a recorrência é um *gerador*, a transação continua sendo o
lançamento atômico.

### 9.2.1 Fase 6 — recorrências (detalhamento)

- **Semântica de `startDate`**: é sempre a primeira data de execução (não
  "início da regra, com a primeira execução em um período posterior").
  `nextExecutionDate` nasce igual a `startDate` na criação.
- **Cálculo de datas (`RecurrenceDateCalculator`)**: `MONTHLY`/`YEARLY`
  sempre ancoram no dia (e, para `YEARLY`, também no mês) de `startDate` —
  nunca no dia da ocorrência anterior. Isso evita degradação cumulativa:
  `31/01 → 28/02 → 31/03` (ancorado em 31), não `31/01 → 28/02 → 28/03`
  (que aconteceria se março reusasse o dia já truncado de fevereiro).
  Quando o dia âncora não existe no mês de destino, usa-se o último dia
  válido desse mês — mesma regra para `31` em meses de 30 dias e para
  `29/02` (`YEARLY`) em anos não bissextos, que cai em `28/02` e volta a
  `29/02` no próximo ano bissexto. Por isso não existe uma coluna separada
  de "dia âncora": o próprio `startDate` já cumpre esse papel — e é por
  isso que editar `startDate` é bloqueado depois que a regra já gerou
  alguma ocorrência (ver abaixo).
- **Processador**: `RecurringTransactionScheduler` (`@Scheduled`, cron
  configurável via `app.recurring-processing.cron`, default de hora em
  hora — sem Kafka/RabbitMQ/Quartz, ver seção 3) aciona
  `RecurringTransactionProcessor`, que varre regras `active=true` com
  `next_execution_date <= hoje` (sem filtro de usuário — roda para todos)
  e delega o processamento de cada regra a
  `RecurringTransactionService.processDueOccurrences`, reaproveitando
  `TransactionService.createFromRecurrence` (mesmas invariantes do CRUD
  manual de `Transaction`) para não duplicar a regra de criação.
- **Catch-up**: cada regra processada gera, em loop, uma `Transaction` por
  ocorrência vencida (ex.: app desligada por 4 meses gera as 4 ocorrências
  perdidas, não só a mais recente), limitado a 500 ocorrências por regra
  por rodada — alto o bastante para catch-up realista (uma recorrência
  diária parada por mais de um ano), baixo o bastante para nunca travar o
  processador por causa de um dado inconsistente; se o limite for atingido,
  a rodada seguinte continua de onde parou, sem perda.
- **Idempotência**: duas camadas. (1) Lock pessimista
  (`SELECT ... FOR UPDATE`, via `findByIdForUpdate`) antes de processar uma
  regra, serializando duas execuções concorrentes da mesma regra — e
  processado por regra em sua própria transação de banco (não um lote
  inteiro), para não segurar o lock além do necessário. (2) A constraint
  `UNIQUE(recurring_transaction_id, recurrence_date)` em `transactions`,
  que rejeitaria um INSERT duplicado mesmo que a camada 1 falhasse por
  algum motivo — a última linha de defesa é sempre o banco, não o Java.
- **Consistência transacional**: gerar a `Transaction` e avançar
  `next_execution_date` (e `last_execution_date`) acontecem na mesma
  transação de banco (`@Transactional` em
  `RecurringTransactionService.processDueOccurrences`). Se o processo
  morrer entre os dois passos, a transação Postgres nunca comita — nem a
  `Transaction` nem o avanço de data existem — e a próxima rodada
  reprocessa a mesma ocorrência do zero, sem duplicidade nem perda.
- **Edição**: alterar campos de conteúdo (descrição, valor, conta,
  categoria, método, frequência, `endDate`) nunca reescreve `Transaction`s
  já geradas — o vínculo é histórico, não uma referência viva. `type` não é
  editável (troca de receita↔despesa é uma nova recorrência).
  `next_execution_date` só é recalculada quando semanticamente necessário:
  sem nenhuma execução ainda, é sempre `startDate` (novo ou antigo); com
  execuções, só se a frequência mudar (ancorando na última execução real,
  não em `startDate`) — editar só a descrição não mexe no calendário.
  `startDate` só pode ser alterada enquanto a regra nunca gerou nenhuma
  ocorrência.
- **Pausar/reativar**: reaproveita o mesmo PUT de edição (`active`), sem
  endpoint `PATCH` dedicado — mesmo padrão já usado por `accounts`. Pausar
  (`active=false`) só impede novas gerações; o histórico não muda. Ao
  reativar, se `next_execution_date` ficou no passado durante a pausa, ela
  é reposicionada para a próxima ocorrência válida a partir de hoje (nunca
  gera de uma vez todas as ocorrências perdidas durante a pausa) — pausar
  uma assinatura por 6 meses e reativar não deve gerar 6 despesas
  retroativas.
- **Exclusão**: `DELETE` físico da regra. `transactions.recurring_transaction_id`
  é `ON DELETE SET NULL` — as `Transaction`s já geradas nunca são apagadas
  junto, só perdem o vínculo "de volta" para uma regra que não existe mais
  (mantendo `recurrence_date` como dado histórico). Diferente de
  account/category/payment-method, excluir uma recorrência nunca é
  bloqueado com 409 — não há "uso corrente" que a exclusão comprometa,
  apenas histórico que sobrevive por conta própria.
- **`account`/`category`/`payment_method` referenciados por uma
  recorrência**: excluí-los é bloqueado com 409 (mesmo padrão de
  `transactions`), porque a FK correspondente em `recurring_transactions`
  não tem `ON DELETE` automático — sem esse bloqueio explícito no Service,
  a tentativa quebraria com um erro 500 de violação de constraint em vez
  de uma mensagem amigável.
- **Dashboard**: continua consultando só `transactions` — nenhuma
  agregação passa a somar `recurring_transactions`. Previsão e realizado
  nunca se misturam num mesmo número.

**`budgets`** (Fase 7) — orçamento mensal, opcionalmente por categoria:

```sql
CREATE TABLE budgets (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id  BIGINT REFERENCES categories(id),  -- NULL = orçamento geral do mês
    month        SMALLINT NOT NULL,
    year         SMALLINT NOT NULL,
    amount_limit NUMERIC(12,2) NOT NULL CHECK (amount_limit > 0),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, category_id, month, year)
);
```

Autocontido — não exige nenhuma alteração em `transactions`, `accounts` ou
`categories`; a comparação orçado x realizado é feita em runtime somando
`transactions` do período/categoria.

**`financial_goals`** (Fase 7) — metas financeiras:

```sql
CREATE TYPE goal_status AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

CREATE TABLE financial_goals (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    linked_account_id BIGINT REFERENCES accounts(id),  -- opcional: conta que acumula p/ a meta
    name              VARCHAR(120) NOT NULL,
    target_amount     NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
    target_date       DATE,
    status            goal_status NOT NULL DEFAULT 'ACTIVE',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Deliberadamente desacoplada: a meta *aponta* para uma conta opcional, a
conta não sabe da meta. `current_amount` não é armazenado — é calculado a
partir do saldo da conta vinculada (ou de transações filtradas por
categoria/conta, a definir no detalhamento da Fase 7). Isso evita duplicar
uma fonte de verdade que já existe em `transactions`/`accounts`.

**Relatórios (Fase 8)**: não introduzem tabela nova no MVP — são queries de
agregação sobre `transactions`/`categories`/`accounts`, no mesmo espírito
do dashboard (seção 8), com exportação (CSV/PDF) gerada sob demanda. Uma
tabela `report_exports` (histórico de exportações) só seria adicionada se
no futuro quisermos persistir relatórios gerados — não é uma dependência
do modelo atual.

### 9.3 Princípios que preservam a evolução sem refatoração estrutural

Estes são os pontos que **realmente** precisavam ser decididos agora — o
resto (novas tabelas, novas colunas nullable) é barato de adicionar depois
e por isso não precisa ser antecipado:

1. **`Transaction` é o lançamento atômico do sistema.** Uma recorrência ou
   uma compra parcelada nunca é "uma transação com metadado extra que
   precisa ser somado depois" — é sempre um *gerador* que produz N linhas
   em `transactions`, uma por ocorrência/parcela. Se essa decisão não
   fosse tomada agora, o risco real seria modelar parcelamento como um
   valor único que precisaria ser "explodido" em várias linhas depois —
   isso sim exigiria migração de dados retroativa. Mantendo o princípio,
   qualquer feature futura apenas *insere mais linhas* em uma tabela que já
   existe, com o mesmo formato.
2. **Novas colunas em tabelas existentes são sempre `NULL` sem `DEFAULT`.**
   No Postgres (≥ 11), isso é uma operação de metadado — não reescreve a
   tabela, não bloqueia leituras/escritas concorrentes, independente do
   volume de dados já existente. Por isso `recurring_transaction_id`,
   `installment_number` etc. não precisam existir desde já: adicioná-las
   na fase correspondente é barato, não é uma "remodelagem grande".
3. **Entidades novas e autocontidas (budgets, goals) não tocam nas tabelas
   existentes** — apenas referenciam `category_id`/`account_id` como
   chave estrangeira opcional. Zero risco de retrabalho.
4. **Tipos enumerados como `VARCHAR + CHECK`** (`account_type`,
   `transaction_type`, `payment_method_type` — decisão revisada na Fase 2,
   ver seção 9.1): adicionar um novo valor é só um novo `CHECK` na próxima
   migração (`ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT ...`),
   sem a restrição de `ALTER TYPE ... ADD VALUE` não poder ser usado na
   mesma transação em que é criado — e sem exigir anotações JPA extras
   (`@JdbcTypeCode`) sensíveis à versão do Hibernate para mapear enum
   nativo do Postgres.
5. **`payment_method` e `account` continuam sendo conceitos distintos**:
   `account` é *de onde/para onde* o dinheiro se move (inclusive um cartão
   de crédito, ver seção 10); `payment_method` é *o instrumento* usado. Um
   cartão de crédito específico já é hoje representado como uma
   `Account` com `type = CREDIT_CARD` — não precisa de nenhuma tabela
   nova para existir como conceito.

## 10. Cartões de crédito — análise de impacto (sem implementação)

Objetivo desta seção: verificar se `Account`/`Transaction`, como estão
desenhados hoje, suportam de forma limpa fechamento de fatura, vencimento,
limite, compras parceladas e parcelas futuras — ou se alguma decisão
estrutural precisa ser tomada **agora**.

### 10.1 O que já funciona sem mudança nenhuma

- Um cartão de crédito é uma `Account` com `type = CREDIT_CARD` — já
  suportado pelo enum atual.
- A distinção `account` (onde) vs `payment_method` (como) já permite dizer
  "paguei com Cartão de Crédito (`payment_method`), no meu Nubank
  (`account`)" sem ambiguidade, mesmo com múltiplos cartões.

### 10.2 O que precisa de colunas novas — mas só quando o módulo for feito

Atributos específicos de cartão (`credit_limit`, `statement_closing_day`,
`payment_due_day`) são naturalmente `NULL` para contas que não são cartão
de crédito. Como discutido na seção 9.3 (princípio 2), adicionar essas
colunas em `accounts` na hora de implementar o módulo é uma operação
barata — não há razão para criá-las vazias hoje.

### 10.3 A decisão estrutural que realmente importa: compra parcelada

O ponto de atenção real é conceitual, não físico: **uma compra parcelada
não pode ser modelada como uma única `Transaction` com um valor total**,
porque cada parcela cai em uma fatura (mês) diferente, e o dashboard/
relatórios precisam refletir o impacto mês a mês, não o valor total na
data da compra.

A decisão (já adotada pelo princípio da seção 9.3.1): uma compra parcelada
em N vezes gera **N linhas em `transactions`**, uma por parcela, cada uma
com sua própria `date` (mapeada para o mês da fatura correspondente),
ligadas entre si por um `purchase_group_id` (UUID) e identificadas por
`installment_number`/`installment_total` (ex.: "3/12") para exibição.
Essas três colunas são adicionadas em `transactions` só na fase do módulo
de cartão — são `NULL` para todas as transações que não são parcelas.

Isso significa que **nenhuma decisão estrutural precisa ser tomada agora**
além de manter o princípio "Transaction = lançamento atômico" — que já é a
decisão vigente. Se esse princípio não existisse (ex.: se `Transaction`
representasse "uma compra" com um valor total único), aí sim seria
necessário decidir agora entre quebrar `Transaction` em
`Purchase`/`Installment` ou aceitar uma migração de dados dolorosa mais
tarde.

### 10.4 Fatura (invoice): tabela física ou cálculo sob demanda?

Em aberto para a fase do módulo (não bloqueia nada hoje): a "fatura" de um
cartão em um mês pode ser (a) **calculada sob demanda**, agrupando
`transactions` por `account_id` + mês de vencimento da parcela — mesmo
padrão já usado no dashboard —, ou (b) **materializada** em uma tabela
`invoices` caso seja necessário rastrear estado da fatura (aberta,
fechada, paga, paga parcialmente). Recomendação preliminar: começar com
(a) e só promover para (b) se houver necessidade real de registrar
pagamentos parciais de fatura — decisão a ser tomada na Fase 6/7, não
agora, pois não afeta o modelo atual.

### 10.5 Trade-off documentado

| Abordagem | Prós | Contras |
|---|---|---|
| **Transaction = lançamento atômico, parcela = linha própria** (adotada) | Reaproveita 100% da infraestrutura de dashboard/filtros/relatórios já construída; sem tabela nova obrigatória; consistente com recorrências | Uma "compra" não é uma entidade de 1ª classe — para editar todas as parcelas de uma vez, a aplicação precisa operar sobre o grupo (`purchase_group_id`), não sobre um único registro |
| **Purchase (1 linha) + Installment (N linhas)** | Compra é uma entidade explícita, mais natural para "editar a compra inteira" | Duplica conceitos com `transactions`; dashboard/relatórios precisariam saber consultar duas fontes; motivo pelo qual foi descartada |

**Conclusão**: o modelo atual de `Account`/`Transaction` suporta a
evolução para cartão de crédito de forma limpa, contanto que o princípio
"Transaction = lançamento atômico" (seção 9.3) seja respeitado desde já.
Nenhuma migração de schema é necessária nesta fase.

### 10.6 Saldo de caixa vs. dívida de cartão — semântica que já vale desde a Fase 3

Mesmo sem o módulo de cartão implementado, `account_type` já inclui
`CREDIT_CARD` (uma conta desse tipo pode, tecnicamente, ser criada a partir
da Fase 2). Por isso a semântica abaixo precisa estar clara **desde a Fase
3 (dashboard)**, para que nenhuma métrica fique matematicamente errada
quando o módulo de cartão chegar:

- **Contas de caixa/corrente** (`CHECKING`, `SAVINGS`, `WALLET`,
  `INVESTMENT`): o saldo representa **disponibilidade financeira** — dinheiro
  que o usuário tem para gastar.
- **Conta de cartão de crédito** (`CREDIT_CARD`): o saldo/fatura representa
  **obrigação/dívida** — dinheiro que o usuário *deve*, não que possui. Somar
  esse valor ao saldo de caixa como se fosse "dinheiro disponível" produz um
  número financeiramente errado (infla a disponibilidade real).
- **Regra vigente já na Fase 3**: o campo "saldo" do dashboard (seção 8) soma
  apenas contas com `type <> 'CREDIT_CARD'`. Contas de cartão são
  explicitamente excluídas dessa soma — não porque o tipo não exista, mas
  porque sua semântica é de dívida, não de disponibilidade.
- **Métricas futuras (Fase 6+, quando o módulo de cartão for implementado)**:
  - `saldo disponível` = soma de contas de caixa (como já calculado hoje);
  - `dívida em cartões` = soma das faturas/obrigações das contas
    `CREDIT_CARD`;
  - `patrimônio líquido` = `saldo disponível` − `dívida em cartões` (e,
    depois, + investimentos de longo prazo, se aplicável).

Nenhuma dessas três métricas futuras exige mudança estrutural — é uma
questão de **quais contas entram em qual soma**, decidida na camada de
`DashboardService`, não no schema.

## 11. Endpoints REST principais

```
Auth
  POST   /api/auth/register
  POST   /api/auth/login
  POST   /api/auth/refresh
  POST   /api/auth/logout
  GET    /api/auth/me

Accounts
  GET    /api/accounts
  POST   /api/accounts
  GET    /api/accounts/{id}
  PUT    /api/accounts/{id}
  DELETE /api/accounts/{id}

Categories
  GET    /api/categories?type=EXPENSE|INCOME
  POST   /api/categories
  PUT    /api/categories/{id}
  DELETE /api/categories/{id}

Payment methods
  GET    /api/payment-methods
  POST   /api/payment-methods
  PUT    /api/payment-methods/{id}
  DELETE /api/payment-methods/{id}

Transactions
  GET    /api/transactions?from=&to=&type=&categoryId=&accountId=&page=&size=
         (filtro por paymentMethodId e sort customizável ficam para quando houver
         necessidade real — ordenação fixa por date desc, id desc por enquanto)
  POST   /api/transactions
  GET    /api/transactions/{id}
  PUT    /api/transactions/{id}
  DELETE /api/transactions/{id}

Dashboard
  GET    /api/dashboard/summary?year=&month=
  GET    /api/dashboard/expenses-by-category?year=&month=
  GET    /api/dashboard/income-vs-expense?year=&month=
         (revisado na Fase 3: granularidade diária dentro de um único mês,
         não janela de N meses — ver seção 8.2)
  GET    /api/dashboard/recent-transactions?limit=
  GET    /api/dashboard/accounts-balance
```

Recurring transactions (Fase 6, implementada)
  GET    /api/recurring-transactions?type=&active=&frequency=
  POST   /api/recurring-transactions
  GET    /api/recurring-transactions/{id}
  PUT    /api/recurring-transactions/{id}
         (substitui o registro inteiro, incluindo `active` — reaproveitado
         para pausar/reativar, sem endpoint PATCH dedicado, mesmo padrão de
         `accounts`)
  DELETE /api/recurring-transactions/{id}

Paginação: offset-based (`page`, `size`) — `recurring-transactions` não
pagina (lista simples, mesmo padrão de `accounts`/`categories`/
`payment-methods`, volume baixo por usuário).

Endpoints das Fases 7–8 (`/api/budgets`, `/api/goals`, `/api/reports/*`)
seguem o mesmo padrão REST e serão detalhados quando a fase correspondente
começar.

## 12. Estratégia de memória do Spring Boot

### 12.1 Ponto de partida conservador (não é o valor final)

Como a VM já hospeda outros projetos, o backend começa com um teto de heap
propositalmente pequeno, a ser validado com medição real antes de virar o
valor definitivo de produção:

```
-Xms64m
-Xmx256m
-XX:+UseSerialGC
-XX:MaxMetaspaceSize=128m
-XX:ReservedCodeCacheSize=64m
-Xss512k
```

`SerialGC` é usado (em vez de G1, o default) porque tem menor overhead de
bookkeeping em heaps pequenos — mais previsível quando a memória é escassa.
`MaxMetaspaceSize` e `ReservedCodeCacheSize` limitam regiões *off-heap* que
frequentemente são esquecidas e também contam para o RSS total do
processo — o número que realmente importa para o limite de 1 GB
compartilhado.

Hikari (pool de conexões): `maximum-pool-size: 4` — conservador porque o
Postgres também é compartilhado com outros projetos (seção 13); cada
conexão ociosa custa memória tanto no lado da aplicação quanto no lado do
Postgres.

### 12.2 Como medir antes de fixar o valor definitivo

Não escolher o `-Xmx` final "no chute". Processo de validação, a rodar
antes de finalizar o systemd unit de produção (fim da Fase 2/3 ou na Fase
9 de hardening, o que vier primeiro após haver funcionalidade real para
testar):

1. **Habilitar Native Memory Tracking** durante os testes:
   `-XX:NativeMemoryTracking=summary`, consultado via
   `jcmd <pid> VM.native_memory summary` — mostra heap, metaspace, thread
   stacks, code cache separadamente.
2. **Medir RSS real do processo** (o número que o SO/VM enxerga, não só o
   heap Java): `ps -o rss,vsz -p <pid>` ou `cat /proc/<pid>/status | grep VmRSS`,
   em dois momentos: (a) logo após o start (idle) e (b) sob carga.
3. **Gerar carga realista**: popular o banco com um volume plausível
   (alguns milhares de transações) e simular uso concorrente leve com
   `hey`/`k6` (ex.: navegação no dashboard + criação de transações por 2–5
   minutos), observando RSS ao longo do teste.
4. **Critério de decisão**:
   - Se o RSS sob carga fica confortavelmente abaixo do teto (`256m`) e
     não há `OutOfMemoryError` nem GC excessivo (verificável com
     `-Xlog:gc` — pausas frequentes ou full GCs recorrentes indicam heap
     apertado), o valor testado é adotado.
   - Se houver pressão de memória, aumentar em incrementos pequenos
     (`224m → 256m`, depois `288m`) e repetir a medição — nunca pular
     direto para um valor alto "de segurança".
5. **Registrar o resultado da medição** (RSS idle, RSS sob carga, `-Xmx`
   final escolhido) neste documento quando a validação for feita, para que
   a decisão fique rastreável.

Backend continua como **JAR executado via systemd** — decisão já aprovada,
mantida.

## 13. Estratégia de PostgreSQL na VM compartilhada

**Nenhuma decisão de reaproveitamento é assumida por padrão.** Em
particular, se o PostgreSQL já existente na VM rodar dentro de um
container pertencente a outro projeto, este sistema **não deve acoplar seu
ciclo de vida ao daquele projeto** — subir/derrubar/atualizar o outro
projeto não pode arriscar o banco desta aplicação, e vice-versa. Essa
restrição por si só pode eliminar a opção de "reaproveitar o container de
outro projeto" mesmo que ele tecnicamente comporte outro database.

### 13.1 Checklist de inspeção (obrigatório antes de decidir)

Antes de qualquer decisão de onde este banco vai morar, é preciso
levantar, na VM real, sem alterar nada nela nesta fase:

- **Versão do PostgreSQL** em execução (compatibilidade com Flyway/
  Hibernate — recomendado 13+).
- **Nativo ou Docker**: o Postgres roda como processo do sistema
  (systemd/pacote da distro) ou dentro de um container?
- **Inventário de containers existentes**: quais containers Postgres (ou
  outros) já rodam na VM, e a quais projetos pertencem.
- **Dependências**: quais aplicações já dependem de cada instância
  encontrada — se um container pertence a outro projeto, esse projeto é o
  dono do seu ciclo de vida, não este sistema.
- **Volumes**: onde os dados de cada instância são persistidos (volume
  Docker nomeado, bind mount, disco nativo) e quem faz backup deles hoje.
- **Consumo de RAM observado**: `ps`/`docker stats` de cada instância
  Postgres já rodando, para saber quanta margem realmente existe na VM.
- **Estratégia de backup atual**: existe rotina de backup (`pg_dump`
  agendado, snapshot de volume, nenhuma)? Este sistema precisa da própria
  rotina ou pode herdar uma existente?

Este levantamento é puramente de leitura (inspeção) — **nenhuma alteração
é feita na VM nesta fase**.

### 13.2 Opções a decidir somente após a inspeção

| Opção | Quando faz sentido |
|---|---|
| **Instância compartilhada, já adequadamente administrada** (mesmo processo/container que outros projetos usam, mas com database e role exclusivos) | Se a instância encontrada for de propósito geral (não pertence logicamente a "outro projeto" específico, tem backup e versão adequados) — menor custo de RAM |
| **Novo database em uma instância geral já existente** | Variante da anterior: mesmo processo Postgres, mas explicitamente criado como instância "da VM", não do container de um projeto específico |
| **Nova instância/container dedicado a este projeto** | Se a única instância encontrada pertencer ao ciclo de vida de outro projeto (não podemos acoplar), ou se não houver Postgres algum ainda na VM |

A escolha entre essas três só é feita **depois** do checklist da seção
13.1 ser preenchido com dados reais da VM — não antes. Em qualquer caso, o
provisionamento segue o mesmo padrão de isolamento lógico já definido:

```sql
CREATE ROLE sistema_financeiro_app WITH LOGIN PASSWORD '<senha forte gerada>';
CREATE DATABASE sistema_financeiro OWNER sistema_financeiro_app;
```

Como o role é dono do próprio database, ele já tem todos os privilégios
necessários dentro dele — e, por padrão, o Postgres **não** concede acesso
a outros databases da instância a um role que não foi explicitamente
autorizado. Isso atende ao requisito de "permissões restritas ao database
da aplicação" independentemente de qual das três opções acima for
escolhida.

### 13.3 Reversibilidade

Qualquer que seja a opção escolhida, migrar depois para outra (ex.: sair
de uma instância compartilhada para uma dedicada) é puramente operacional
— `pg_dump`/`pg_restore` e troca de connection string — **sem alteração no
modelo de dados ou no código da aplicação**. Por isso essa decisão pode
ficar em aberto sem bloquear a Fase 1: o desenvolvimento local usa uma
instância Postgres própria (container de desenvolvimento, descartável), e
a decisão de produção só precisa estar tomada antes do checkpoint de
deploy (após a Fase 3, seção 16).

### 13.4 Pré-requisito operacional (depende de você, antes do checkpoint de deploy)

- Acesso à VM para rodar o checklist da seção 13.1.
- Acesso administrativo (ou alguém que possa executar) para provisionar
  o database e o role exclusivos, depois de decidida a opção.

## 14. Estratégia de deploy

- **PostgreSQL**: a opção definida a partir do checklist de inspeção da
  seção 13 — instância compartilhada adequadamente administrada, novo
  database em instância geral, ou instância dedicada. Não é assumido de
  antemão; decidido antes do checkpoint de deploy (seção 16), com base em
  dados reais da VM, nunca acoplando o ciclo de vida deste projeto ao de
  outro.
- **Backend**: JAR executável rodando como serviço `systemd` diretamente
  na VM, com as flags de JVM da seção 12.
- **Frontend**: build estático (`dist/`) servido diretamente pelo Nginx.
- **Nginx**: reverse proxy `/api/*` → `localhost:8080`, serve `dist/` para
  o resto com fallback de SPA (`try_files ... /index.html`), certificado
  HTTPS via Certbot/Let's Encrypt.
- **Build**: compilar frontend e backend fora da VM (CI ou máquina local)
  e enviar apenas os artefatos finais — evita gastar RAM/CPU da VM de
  produção, já disputada por outros projetos, com toolchain de build.

Docker é usado apenas onde comprovadamente reduz risco/consumo — backend
continua JAR nativo em qualquer cenário. Para o Postgres, se a inspeção
concluir que uma instância nova é necessária, um único container Postgres
dedicado a este projeto (não acoplado a outro) é a forma recomendada de
criá-la — decisão tomada com base na seção 13, não antecipada aqui.

## 15. Decisões técnicas e trade-offs

| Decisão | Escolha | Alternativa descartada | Motivo |
|---|---|---|---|
| Mapeamento DTO | Manual | MapStruct | Menos dependências/build steps |
| Cache | Nenhum no MVP | Redis | Volume de dados não justifica |
| Multi-usuário | Sim, desde o início | App single-user | Portfólio + evita migração depois |
| Amount signed vs positivo+type | Positivo + type | Signed (+/-) | Menos bugs de sinal, `CHECK` simples |
| Delete de categoria/conta em uso | Bloqueado (409) | Soft delete | Simplicidade |
| Paginação | Offset | Cursor | Volume baixo, offset é suficiente |
| Backend em produção | JAR + systemd | Container Docker | Menor overhead de memória |
| Postgres em produção | Decidido após inspeção real da VM (seção 13), nunca acoplado ao ciclo de vida de outro projeto | Assumir reaproveitamento sem inspecionar | RAM é escassa e compartilhada, mas acoplar-se ao container de outro projeto é um risco operacional inaceitável; decisão adiada para dados reais |
| Saldo do dashboard e contas de cartão | Soma de "saldo" exclui contas `CREDIT_CARD` (disponibilidade ≠ dívida) | Somar todas as contas indiscriminadamente | Cartão representa obrigação, não disponibilidade; métricas futuras (dívida, patrimônio líquido) dependem dessa distinção desde já |
| Auth: onde fica o token | Cookie HttpOnly + Secure + SameSite=Strict | `localStorage` | Elimina roubo de token via XSS; exige mitigação de CSRF em troca |
| CSRF | SameSite=Strict + double-submit token (Spring Security) | Somente SameSite | Defesa em profundidade para app financeiro |
| Revogação de sessão | Refresh token com hash em tabela Postgres, rotacionado a cada uso | Redis / sessão em memória | Evita novo processo; volume baixo cabe bem em uma tabela indexada |
| `-Xmx` do backend | Medido empiricamente, começando em 256m | Valor fixo arbitrário (320m+) | VM compartilhada com outros projetos; decisão baseada em RSS real, não estimativa |
| Compra parcelada de cartão | `Transaction` = lançamento atômico; parcela = linha própria ligada por `purchase_group_id` | Entidade `Purchase` + `Installment` separada | Reaproveita toda a infraestrutura de dashboard/filtros já construída; evita duplicar fonte de verdade |
| Colunas de features futuras (recorrência, cartão) | Não criadas agora; adicionadas via migração própria na fase correspondente | Criar todas as colunas nullable hoje | Adicionar coluna `NULL` sem default é operação barata no Postgres — antecipar é complexidade sem ganho |

## 16. Roadmap

| Fase | Escopo | Observações |
|---|---|---|
| **1** | Fundação backend, banco e autenticação | Setup do projeto Spring Boot, Flyway inicial (`users`, `refresh_tokens`), fluxo completo de auth por cookie (seção 5), config de segurança/CSRF. Nenhuma feature de domínio financeiro ainda. |
| **2** | Contas, categorias, métodos de pagamento e transações | CRUD completo dessas quatro entidades + regra de bloqueio 409 em delete com referência. Testável via Postman/Swagger. |
| **3** | Dashboard e agregações | Endpoints de `dashboard/*` (seção 8), queries otimizadas com os índices já definidos. |
| **Checkpoint** (após a Fase 3, antes da Fase 4) | Deploy mínimo de validação | Sobe o backend (Fases 1–3) na VM real, mesmo sem frontend completo. Objetivo: validar integração com PostgreSQL real (seção 13, já com a instância decidida), medir RSS real da JVM sob a carga do checklist da seção 12.2 e ajustar o `-Xmx` definitivo, medir consumo real do Postgres escolhido, testar Nginx/HTTPS de ponta a ponta, e confirmar que a aplicação cabe confortavelmente na VM **antes** de investir em frontend e funcionalidades futuras. Não é o deploy definitivo (esse é a Fase 10) — é uma validação de ambiente antecipada para reduzir risco. |
| **4** | Estrutura e design system do frontend | Vite + Tailwind + shadcn/ui, shell (sidebar/topbar), tema escuro, componentes base — sem integração real com API ainda (dados mockados). |
| **5** | Integração completa frontend/API | Conecta as telas da Fase 4 aos endpoints das Fases 1–3: login/logout via cookie, CRUD de transações, dashboard real. |
| **6** | Recorrências | `recurring_transactions` (migration `V3`), `RecurringTransactionScheduler`/`Processor` (`@Scheduled`, catch-up idempotente), colunas `transactions.recurring_transaction_id`/`recurrence_date`, UI de gestão de recorrências. Detalhado na seção 9.2.1. |
| **7** | Orçamentos e metas | `budgets`, `financial_goals`, UI de acompanhamento (orçado x realizado, progresso de meta). |
| **8** | Relatórios | Agregações adicionais, exportação (CSV/PDF), UI de relatórios. |
| **9** | Testes, segurança, performance e acessibilidade | Cobertura de testes (unit/integration) consolidada, revisão de segurança (CSRF/auth/IDOR), medição de memória (seção 12.2) usada para fixar o `-Xmx` definitivo, auditoria de acessibilidade do frontend. |
| **10** | Deploy e observabilidade | Deploy definitivo/hardening: Nginx + HTTPS + systemd em produção, logging estruturado, healthcheck, rotina de backup do database exclusivo. Reaproveita o que já foi validado no Checkpoint (pós-Fase 3) em vez de repetir a validação do zero. |
