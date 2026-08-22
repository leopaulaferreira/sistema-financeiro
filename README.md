# Sistema de Finanças Pessoais

Gerenciador de finanças pessoais — monólito modular (API Java/Spring Boot +
frontend React). Multiusuário, com autenticação por cookie `HttpOnly`,
CSRF, transações recorrentes, orçamentos, metas financeiras e relatórios.

Planejamento completo e decisões de arquitetura em [ARCHITECTURE.md](ARCHITECTURE.md)
e [DESIGN.md](DESIGN.md). Procedimento operacional de deploy em produção
em [DEPLOYMENT.md](DEPLOYMENT.md).

**Status atual: roadmap completo (Fases 1–10) implementado.** Trabalho
futuro é tratado como evolução nova, não como continuação automática deste
roadmap (ver ARCHITECTURE.md §16).

## Stack

- **Backend**: Java 21, Spring Boot 4.1 (Web, Security, Data JPA, Actuator),
  PostgreSQL, Flyway, JWT (`jjwt`), Testcontainers.
- **Frontend**: React + TypeScript, Vite, Tailwind CSS v4, shadcn/ui
  (Radix), TanStack Query, React Router, Recharts, Vitest + React Testing
  Library.
- **Deploy**: JAR + `systemd`, Nginx (reverse proxy + estático + HTTPS via
  Certbot), sem containerização do backend nem serviços de infraestrutura
  pesada (ver "Por que não microsserviços/fila/cache" em ARCHITECTURE.md §3).

## Funcionalidades

- Autenticação multiusuário (cookies `HttpOnly`/`Secure`, refresh token
  rotacionado com detecção de reuso, CSRF double-submit, rate limiting em
  auth).
- Contas, categorias, métodos de pagamento e transações (CRUD completo,
  isolamento por usuário, filtros e paginação).
- Dashboard com agregações reais (receitas/despesas, saldo por conta,
  evolução, últimos lançamentos).
- Transações recorrentes (mensal/semanal/diária/anual), com processador
  automático idempotente e catch-up de execuções perdidas.
- Orçamentos mensais por categoria (status SAFE/WARNING/EXCEEDED) e metas
  financeiras com histórico de contribuições.
- Relatórios financeiros (resumo por período, séries temporais, por
  categoria, fluxo por conta, evolução de saldo, comparativo mensal, top
  transações, distribuição por método de pagamento, exportação CSV).

## Arquitetura

Visão geral em ARCHITECTURE.md §1–§4; principais decisões em §15. Em
produção, o único ponto público é o Nginx:

```
Nginx (HTTPS, :443)
  ├─ /            → frontend estático (dist/, SPA)
  └─ /api/*       → proxy → Spring Boot (127.0.0.1, porta interna)
                              └─ PostgreSQL (127.0.0.1/rede privada)
```

## Segurança

- Sessão via cookies `HttpOnly` + `Secure` + `SameSite=Strict` — o JWT
  nunca é acessível a JavaScript nem armazenado em `localStorage`.
- CSRF: cookie `XSRF-TOKEN` legível pelo frontend (double-submit) + header
  `X-XSRF-TOKEN` em toda mutação.
- Ownership estrito por usuário em todos os domínios — acesso cross-user
  responde 404 (evita confirmar a existência do recurso, mitigação IDOR).
- Rate limiting em `/api/auth/*` (register/login/refresh), chaveado pelo
  IP real do cliente mesmo atrás do Nginx (ver ARCHITECTURE.md, Fase 10).
- `Actuator` só expõe `/actuator/health`, sem detalhes internos.
- CSP, `Referrer-Policy` e `Permissions-Policy` na API (Spring Security) e
  no HTML/assets estáticos (Nginx) — ver ARCHITECTURE.md, Fase 10.

Detalhes completos e decisões de trade-off em ARCHITECTURE.md §5 e §17.

## Testes

- **Backend**: Testcontainers com PostgreSQL real (não H2) em todas as
  fases — cobre CRUD, ownership, validações, regras de negócio e
  segurança (CSRF, rate limit, IP real atrás de proxy confiável).
- **Frontend**: Vitest + React Testing Library, focado nos fluxos mais
  sensíveis a regressão silenciosa (estratégia de refresh/CSRF do
  `api-client`, login).

```bash
# Backend
cd backend
./mvnw test

# Frontend
cd frontend
npm run test:run
```

## Rodando localmente

Pré-requisitos: Java 21+, Node 22+, Docker (Postgres de desenvolvimento).

```bash
# 1. Sobe um Postgres descartável só para este projeto
docker compose -f docker-compose.dev.yml up -d

# 2. Backend — copie o exemplo de variáveis de ambiente e ajuste
cp backend/.env.example backend/.env
# edite backend/.env — gere um JWT_SECRET com: openssl rand -base64 48
cd backend
export $(grep -v '^#' .env | xargs)
./mvnw spring-boot:run
# API sobe em http://localhost:8080, perfil "dev"

# 3. Frontend, em outro terminal
cd frontend
npm ci
cp .env.development .env.local  # se precisar sobrescrever VITE_API_URL
npm run dev
# UI sobe em http://localhost:5173
```

## Variáveis de ambiente

Backend: ver `backend/.env.example` (desenvolvimento) e
`deploy/app.env.example` (produção, mais completo — CORS, rate limit,
scheduler). Frontend: `frontend/.env.development` — em produção não é
necessário definir `VITE_API_URL` (o frontend chama `/api` na mesma
origem via Nginx; ver ARCHITECTURE.md, Fase 10).

## Comandos principais

```bash
# Backend
./mvnw test                # suíte de integração (Testcontainers)
./mvnw package              # gera o JAR executável

# Frontend
npm run lint                 # oxlint
npm run test:run             # Vitest
npm run build                # build de produção
npm audit                    # auditoria de dependências
```

## Deploy

Procedimento operacional completo (pré-requisitos, paths, systemd, Nginx,
HTTPS, backup/restore, rollback, troubleshooting) em
[DEPLOYMENT.md](DEPLOYMENT.md). Templates versionados em `deploy/`
(`systemd/`, `nginx/`, `scripts/`, `app.env.example`).
