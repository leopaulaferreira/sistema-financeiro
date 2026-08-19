# Sistema de Finanças Pessoais

Aplicação de gerenciamento de finanças pessoais — monólito modular (API Java/
Spring Boot + frontend React, a partir da Fase 4). Ver [ARCHITECTURE.md](ARCHITECTURE.md)
e [DESIGN.md](DESIGN.md) para o planejamento completo.

Status atual: **Fase 1 — fundação backend, banco e autenticação.**

## Rodando o backend localmente

Pré-requisitos: Java 21+, Maven, Docker (para o Postgres de desenvolvimento).

```bash
# 1. Sobe um Postgres descartável só para este projeto
docker compose -f docker-compose.dev.yml up -d

# 2. Copie o exemplo de variáveis de ambiente e ajuste o que fizer sentido
cp backend/.env.example backend/.env
# edite backend/.env — gere um JWT_SECRET com: openssl rand -base64 48

# 3. Exporte as variáveis (ou use um plugin de sua IDE que leia .env) e rode
cd backend
export $(grep -v '^#' .env | xargs)
mvn spring-boot:run
```

A API sobe em `http://localhost:8080`, perfil `dev` (`SPRING_PROFILES_ACTIVE=dev`
no `.env.example`).

## Testes

```bash
cd backend
mvn test
```

Os testes de integração usam Testcontainers (sobem um Postgres efêmero
próprio) — requer Docker disponível.

## Endpoints (Fase 1)

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
```

Autenticação via cookies `HttpOnly` (nunca `localStorage`) — ver
ARCHITECTURE.md §5 para o fluxo completo e a estratégia de CSRF.
