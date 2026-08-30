# Auditoria de Segurança — Sistema Financeiro

**Data:** 2026-08-30
**Branch:** `security/deep-audit` (a partir de `main`, sem alterações de código aplicadas)
**Escopo:** repositório completo (backend Spring Boot, frontend React/TS, infraestrutura de deploy documentada — Nginx, systemd, scripts de backup/restore, CI) + produção em `https://finance.leofe.com.br` **apenas por leitura de configuração**, nunca por requisição ativa.
**Metodologia:** análise estática profunda (leitura completa de código, não amostragem), leitura de testes automatizados existentes, verificação read-only de dependências (`npm audit`, leitura de `pom.xml`), varredura de segredos no working tree e no histórico do Git, revisão de configuração de infraestrutura versionada. Nenhum ataque foi executado contra produção. Alguns testes locais seguros foram considerados/planejados; a maior parte das conclusões vem de leitura de código combinada com a suíte de testes de integração já existente no projeto (Testcontainers/PostgreSQL real), que já exercita em runtime os fluxos críticos de autenticação.

---

## 1. Executive Summary

O projeto está, de forma geral, **bem acima da média** para o porte de uma aplicação financeira pessoal single-tenant: disciplina de ownership (IDOR) consistente em 100% dos módulos de negócio revisados, refresh token nunca em texto plano, detecção de reuso de refresh token com revogação de família, CSRF via double-submit cookie aplicado até em login/registro, cabeçalhos de segurança configurados tanto no Spring Security quanto no Nginx, backend isolado atrás de Nginx (bind em `127.0.0.1`), scripts de backup/restore com boas práticas (permissão 0600, sem senha em argumento de linha de comando, confirmação explícita para restore), e systemd já com hardening básico (usuário dedicado sem privilégios, `ProtectSystem=strict`, `NoNewPrivileges=true`).

**Nenhuma vulnerabilidade CRITICAL ou HIGH foi encontrada.** Os 21 achados classificados são majoritariamente de robustez/hardening (concorrência, limites de recursos, validação de entrada, tratamento de erro) e nenhum permite, isoladamente, acesso não autorizado a dados de outro usuário. Os três riscos mais relevantes para priorizar são:

1. **Corrida (race condition) na rotação de refresh token** (SEC-005, MEDIUM) — enfraquece a garantia de detecção de reuso sob concorrência.
2. **Formula/CSV Injection na exportação de relatórios** (SEC-011, MEDIUM) — arquivo exportado pode conter fórmulas que executam no Excel/LibreOffice de quem o abrir.
3. **Rate limiting de autenticação só por IP, sem eviction e sem controle por conta** (SEC-001/SEC-002, MEDIUM) — viabiliza força bruta distribuída contra uma conta específica e crescimento de memória não limitado.

Nenhum segredo real foi encontrado no repositório nem no histórico do Git. `npm audit` no frontend não reportou vulnerabilidades. As dependências do backend (Spring Boot 4.1.0, jjwt 0.13.0) estão em versões recentes.

---

## 2. Scope

**Dentro do escopo:**
- Backend: todos os 9 módulos de negócio (auth, user, account, category, paymentmethod, transaction, recurring, budget, goal, report, dashboard), config de segurança, exceptions, migrations Flyway.
- Frontend: React/TypeScript completo (services, features, componentes, roteamento).
- Infraestrutura versionada: `deploy/nginx/*.conf`, `deploy/systemd/*.service`, `deploy/scripts/*.sh`, `docker-compose.dev.yml`, `.github/workflows/ci.yml`.
- Segredos: working tree completo + histórico do Git (`git log --all`).
- Dependências: `backend/pom.xml` (leitura manual) e `frontend/package.json`/`package-lock.json` (`npm audit`).

**Fora do escopo / não verificável nesta auditoria:**
- Acesso SSH real à VM de produção (configuração de firewall real, versão do Nginx/kernel instalada, permissões de arquivo reais em `/etc/sistema-financeiro/app.env`, existência/rotação real de backups) — **auditado apenas por documentação** (`DEPLOYMENT.md`, scripts versionados); recomenda-se checklist de verificação manual (seção 24/25).
- Qualquer requisição ativa contra `https://finance.leofe.com.br` (proibido pelo escopo da tarefa).
- `mvn org.owasp:dependency-check-maven:check` completo (exige download de base NVD; não executado por limitação de tempo/rede desta sessão) — mitigado por revisão manual de versões.
- Testes de carga/stress reais.

---

## 3. Architecture

Monólito Spring Boot (Java 21, Spring Boot 4.1.0) + SPA React/TypeScript (Vite), PostgreSQL, Nginx como único ponto público, deploy via systemd em VM única. Autenticação via JWT de acesso (15 min, stateless, cookie HttpOnly) + refresh token opaco (30 dias, hash SHA-256 no banco, cookie HttpOnly escopado a `/api/auth/refresh`). CSRF via double-submit cookie (`XSRF-TOKEN` legível por JS + header `X-XSRF-TOKEN`). Same-origin real em produção (frontend estático e `/api/*` servidos pelo mesmo domínio via proxy Nginx), CORS configurado como segunda camada de defesa. Backend nunca bindado em `0.0.0.0` (`server.address=127.0.0.1` em prod). Recorrências processadas por `@Scheduled` interno (sem broker externo), com lock pessimista + constraint UNIQUE contra duplicidade. Ver `ARCHITECTURE.md` do próprio repositório para o detalhamento original de design (o código mostra evidências de fases anteriores de hardening/auditoria já incorporadas — comentários referenciam "Fase 9/10" corrigindo N+1 e adicionando rate limiting/headers).

---

## 4. Threat Model

### Ativos
| Ativo | Onde vive | Criticidade |
|---|---|---|
| Credenciais (senha) | `users.password_hash` (BCrypt) | Alta |
| Sessões (access/refresh token) | Cookies HttpOnly + `refresh_tokens` (hash) | Alta |
| Dados financeiros (transações, saldos, metas) | Postgres | Alta |
| Dados pessoais (nome, e-mail) | Postgres | Média |
| Backups | `/var/backups/sistema-financeiro` (VM, fora do escopo verificável) | Alta |
| Segredo JWT / senha do banco | `/etc/sistema-financeiro/app.env` (0600, fora do repo) | Crítica |
| Logs | journald (VM) | Baixa/Média |

### Atores
- **Usuário legítimo** — dono dos próprios dados.
- **Usuário autenticado malicioso** — tenta acessar/alterar dados de outro usuário (IDOR), abusar de regras de negócio, ou explorar formula injection contra terceiros via export CSV.
- **Atacante não autenticado** — mira `/api/auth/*` (força bruta, enumeração), CSRF contra vítima logada, exploração de headers/infra.
- **Atacante com token roubado** (XSS histórico, malware local, cookie exfiltrado por outro meio) — mira replay de refresh token; mitigado por detecção de reuso (com a ressalva do SEC-005).
- **Atacante com acesso parcial ao host** (fora do escopo de código, mas relevante para o modelo) — miraria `app.env`, backups em disco, ou o processo systemd.
- **Erro operacional** — deploy incorreto, `.env` vazado por engano, restore acidental sobre banco em uso (mitigado pelo `CONFIRM_RESTORE=yes` explícito em `restore-db.sh`).

### Superfícies de ataque
Frontend (SPA estática), API REST (`/api/**`), fluxo de autenticação/cookies, Nginx (único ponto de entrada público), banco (nunca exposto publicamente, mitigação confirmada por design), CI (GitHub Actions), backup/restore (scripts locais na VM), cabeçalhos HTTP, DNS/HTTPS (Let's Encrypt via Certbot, documentado).

### Cenários de abuso principais
1. Usuário B tenta ler/alterar/excluir recurso do usuário A por ID — **mitigado** (ver seção 13, nenhum IDOR encontrado).
2. Atacante rouba refresh token e tenta reutilizá-lo — **mitigado**, com ressalva de corrida concorrente (SEC-005).
3. Atacante força bruta senha de uma conta-alvo distribuindo tentativas por múltiplos IPs — **não mitigado** (SEC-002).
4. Usuário exporta CSV com descrição maliciosa e compartilha com terceiro que abre no Excel — **não mitigado** (SEC-011).
5. CSRF contra endpoint mutável — **mitigado** (double-submit cookie + SameSite=Strict, defesa em profundidade).
6. Vazamento de segredo via repositório/histórico Git — **não encontrado** nesta auditoria.

---

## 5. Methodology

Referências: OWASP ASVS 4.0, OWASP Top 10 2021, OWASP API Security Top 10 2023, princípios secure-by-default / least privilege / defense in depth / fail securely — aplicados de forma proporcional ao porte real do projeto (aplicação pessoal single-tenant, não multi-tenant enterprise), evitando inflar achados sem impacto prático (ex.: "IDs sequenciais" não é reportado como finding isolado, pois a autorização por `userId` já impede exploração).

---

## 6. Findings Summary

| ID | Finding | Severidade | Componente | Status |
|---|---|---|---|---|
| SEC-001 | Rate limiter de auth sem eviction (memória cresce por IP distinto) | MEDIUM | `AuthRateLimiter` | **FIXED** (`security/hardening-p1`, `5144856`) |
| SEC-002 | Força bruta distribuída por IP contorna rate limit (sem controle por conta) | MEDIUM | `AuthRateLimiter`/`AuthController` | **DEFERRED — P2** (ver seção 9, justificativa registrada em `security/hardening-p1`) |
| SEC-003 | Enumeração de e-mail via `/api/auth/register` (409 explícito) | LOW | `AuthService.register` | OPEN |
| SEC-004 | Política de senha valida por caracteres, não por bytes UTF-8 (limite real do BCrypt é 72 bytes) | LOW | `RegisterRequest` | **FIXED** (`security/hardening-p2`, `4d43365`) |
| SEC-005 | Rotação de refresh token sem lock — race condition permite 2 filhos válidos de 1 token pai | MEDIUM | `RefreshTokenService.rotate` | **FIXED** (`security/hardening-p1`, `cc88668`) |
| SEC-006 | Sem tolerância de clock skew no JWT (informativo, sem risco prático hoje) | INFO | `JwtService` | **FIXED** (`security/hardening-p2`, `d0c9277`) |
| SEC-007 | Sem "logout de todos os dispositivos" self-service | INFO | Auth (ausência de endpoint) | OPEN |
| SEC-008 | Rate limit de auth compartilhado entre login/register/refresh (impacto em CGNAT) | INFO | `AuthController` | OPEN |
| SEC-009 | `user_agent` do refresh token não usado como sinal de segurança | INFO | `RefreshTokenService` | OPEN |
| SEC-010 | Ausência de `@Digits` em campos financeiros — valor fora de precisão gera 500 em vez de 400 | MEDIUM | DTOs de account/transaction/recurring/budget/goal | **FIXED** (`security/hardening-p2`, `8aaeb3c`) |
| SEC-011 | CSV export não neutraliza `=`,`+`,`-`,`@` — Formula/CSV Injection | MEDIUM | `ReportService.exportCsv` | **FIXED** (`security/hardening-p1`, `eada752`) |
| SEC-012 | Listagens sem paginação em recursos de baixa cardinalidade (account/category/etc.) | INFO | Controllers diversos | OPEN |
| SEC-013 | Workflow do GitHub Actions sem bloco `permissions:` explícito (least privilege do `GITHUB_TOKEN`) | LOW | `.github/workflows/ci.yml` | **FIXED** (`security/hardening-p2`, `f90ffdf`) |
| SEC-014 | Actions do GitHub fixadas por tag mutável (`@v4`), não por SHA | INFO | `.github/workflows/ci.yml` | **FIXED** (`security/hardening-p2`, `f90ffdf`) |
| SEC-015 | Nenhum limite explícito de tamanho de corpo de requisição documentado no backend (depende do default implícito do Nginx) | INFO | `deploy/nginx/*.conf`, backend | **FIXED** (`security/hardening-p2`, `2f522cf` — documentado, sem mudança de comportamento) |
| SEC-016 | HSTS enviado pela API (default do Spring Security, `includeSubDomains`) diverge do HSTS conservador do Nginx | LOW | `SecurityConfig` | **FIXED** (`security/hardening-p2`, `7fb4fd4`) |
| SEC-017 | Sem rate limiting em `/api/reports/*` (incl. `export.csv`, que carrega transações do período em memória) | LOW | `ReportController` | **FIXED** (`security/hardening-p2`, `2e38d46`) |
| SEC-018 | `page` sem validação/teto em `GET /api/transactions` — `page` negativo retorna 500 em vez de 400 | LOW | `TransactionController.search` | **FIXED** (`security/hardening-p2`, `667cfc1`) |
| SEC-019 | `DataIntegrityViolationException` não tratada — corrida de nome duplicado em categoria/método de pagamento retorna 500 em vez de 409 | LOW | `CategoryService`, `PaymentMethodService`, `GlobalExceptionHandler` | **FIXED** (`security/hardening-p2`, `001e63c`) |
| SEC-020 | `HttpMessageNotReadableException` (JSON malformado / enum inválido) sem handler dedicado — provável 500 em vez de 400 | LOW | `GlobalExceptionHandler` | **FIXED** (`security/hardening-p2`, `001e63c`) |
| SEC-021 | Ausência de proteção de idempotência em `POST /api/transactions` e `POST /api/goals/{id}/contributions` (duplo clique/retry gera duplicidade) | LOW | `TransactionService`, `GoalService` | OPEN |

**Totais:** CRITICAL 0 · HIGH 0 · MEDIUM 5 · LOW 9 · INFO 7 — **21 findings**.

---

## 7. Critical Findings

Nenhum.

---

## 8. High Findings

Nenhum.

---

## 9. Medium Findings

### SEC-001 — Rate limiter de auth sem eviction: memória cresce sem limite por IP distinto
**Componente:** `backend/src/main/java/com/financeapp/auth/AuthRateLimiter.java:32,44-55`
`AuthRateLimiter` guarda um `ConcurrentHashMap<String, Window>` chaveado por IP do cliente, incrementado a cada chamada a `/api/auth/register`, `/login` e `/refresh`. Não há nenhuma tarefa de limpeza (`@Scheduled`, eviction por TTL, cache com `expireAfterWrite`) — entradas nunca são removidas, só sobrescritas se o mesmo IP voltar a aparecer.
**Cenário:** atacante com acesso fácil a um espaço grande de IPs de origem (bloco IPv6 rotacionável, botnet modesta) dispara uma requisição por IP contra `/api/auth/register`/`/login`. Cada IP novo cria entrada permanente; sem cota máxima nem TTL, o heap da instância única de produção (`-Xmx256m`, ver `deploy/systemd/sistema-financeiro.service:31`) cresce indefinidamente.
**Impacto:** possível exaustão de memória (DoS da aplicação inteira), exigindo volume razoável de IPs distintos — custo de ataque baixo (endpoint público, sem necessidade de autenticação).
**Correção:** trocar por cache com `maximumSize`/`expireAfterWrite` (ex.: Caffeine) ou tarefa `@Scheduled` de limpeza periódica.
**Regressão:** teste inserindo N chaves e validando que o tamanho do cache não cresce sem limite após expiração.
**OWASP:** ASVS §11.1.4; API Security Top 10 API4:2023.
**Status:** **FIXED** — `security/hardening-p1` (`5144856`). `ConcurrentHashMap` substituído por `com.github.benmanes.caffeine.cache.Cache` com `maximumSize` (`app.auth.rate-limit.cache-max-size`, default 10000) e `expireAfterWrite` igual à janela configurada. Regressão: `AuthRateLimiterTest.cacheSize_isBoundedByMaximumSize_evenWithManyDistinctKeys` (insere 10x o `maximumSize` de teste e confirma `estimatedSize() <= maximumSize` após `cleanUp()`) e `AuthRateLimiterTest.windowStillExpires_afterEviction_infrastructureChangeDoesNotBreakBehavior` (confirma que a janela por IP continua expirando normalmente).

### SEC-002 — Proteção contra força bruta é só por IP; sem lockout por conta
**Componente:** `AuthRateLimiter.checkAllowed` chaveado por `request.getRemoteAddr()` (`AuthController.java:93-95`), nunca por e-mail.
**Cenário:** atacante distribui tentativas de login contra um e-mail-alvo específico através de múltiplos IPs — cada IP tem seu próprio orçamento de 10 tentativas/60s contra a mesma conta, nunca esbarrando em um limite agregado por conta.
**Impacto:** força bruta/dicionário direcionado viável se distribuído; mitigado parcialmente por BCrypt (custo por tentativa) e senha mínima de 8 caracteres, mas sem teto por conta.
**Correção:** avaliar controle complementar por conta (contador de falhas persistido com lockout temporário curto — cuidado para manter tempo de resposta/mensagem idênticos entre "não existe" e "bloqueada", preservando a mitigação de enumeração já existente) ou CAPTCHA progressivo por IP+e-mail.
**Regressão:** teste simulando falhas contra o mesmo e-mail vindas de IPs diferentes, validando lockout temporário a partir de um limiar.
**OWASP:** ASVS §2.2.1; Top 10 A07:2021.
**Status:** **DEFERRED — P2** (decisão registrada em `security/hardening-p1`, nenhum código alterado para este item). Justificativa técnica:
- Uma implementação segura exige que o *tempo de resposta e a mensagem* sejam idênticos entre "conta bloqueada", "conta não existe" e "senha errada" — qualquer divergência reabre exatamente o canal de enumeração de e-mail que o login já mitiga hoje com o hash BCrypt dummy (ver seção 12). Garantir isso com confiança exige um lookup de estado de bloqueio cujo custo não seja distinguível do custo do BCrypt (~100ms) sob medição externa — viável em princípio (um `Cache.get()` é sub-milissegundo frente ao BCrypt), mas validar essa garantia com um teste automatizado não-flaky está fora do que é razoável nesta branch (o próprio plano desta fase pede para evitar "teste de timing extremamente rígido/flaky").
- É uma decisão de política de produto, não só técnica: qualquer lockout por conta (mesmo temporário e com janela curta) introduz uma nova superfície de DoS contra o usuário legítimo (um atacante que só queira incomodar um usuário específico pode forçar o lockout de propósito, sabendo o e-mail dele). Definir o limiar/janela certos para equilibrar isso é uma escolha de produto, não uma correção mecânica — o próprio `SECURITY_AUDIT.md` já classificava este item como P2 ("requer decisão de produto sobre a estratégia de mitigação") antes desta fase.
- Mitigação hoje: custo de BCrypt por tentativa, senha mínima de 8 caracteres, rate limiter por IP (10 tentativas/60s, já com eviction limitada desde SEC-001) — reduz a superfície a "força bruta distribuída propositalmente entre múltiplos IPs contra uma conta específica", um ataque de custo/sofisticação não trivial para o porte desta aplicação (financeira pessoal, não um alvo de alto valor para automação em escala).
- Risco residual aceito: força bruta direcionada e distribuída contra uma única conta permanece possível. Reavaliar se o produto crescer (mais usuários, maior valor por conta) ou se houver evidência real de tentativa de força bruta nos logs.

### SEC-005 — Rotação de refresh token sem lock: race condition permite dois tokens filhos válidos a partir de um único token pai
**Componente:** `backend/src/main/java/com/financeapp/auth/RefreshTokenService.java:62-82`
`rotate()` lê o token, revoga e emite o filho sem lock pessimista/otimista nem `UPDATE` condicional atômico. Sob READ COMMITTED, duas chamadas concorrentes com o mesmo `rawToken` podem ambas ler `revokedAt == null` antes de qualquer commit, e ambas emitirem token filho — sem acionar a detecção de reuso. O próprio projeto já resolve esse padrão de corrida corretamente em `RecurringTransactionService.processDueOccurrences` (`findByIdForUpdate` + constraint UNIQUE), confirmando que é um descuido pontual, não uma limitação de arquitetura.
**Impacto:** não concede acesso a quem não possuía o token, mas enfraquece a garantia central "reuso detectado ⇒ todas as sessões revogadas" sob concorrência.
**Correção:** `UPDATE refresh_tokens SET revoked_at = :now WHERE token_hash = :hash AND revoked_at IS NULL` checando `rowsAffected`, ou `@Lock(PESSIMISTIC_WRITE)`.
**Regressão:** teste de integração com duas chamadas concorrentes ao mesmo refresh token, afirmando que só uma sucede.
**OWASP:** ASVS §3.5; Top 10 A04:2021.
**Status:** **FIXED** — `security/hardening-p1` (`cc88668`). Implementado `RefreshTokenRepository.revokeIfActive` (UPDATE condicional atômico `WHERE id = :id AND revokedAt IS NULL`, retornando `rowsAffected`), chamado antes do `issue()` do token filho; `rowsAffected == 0` cai no mesmo caminho de reuso já existente. Regressão: `RefreshTokenConcurrencyTest.concurrentRotate_withSameToken_onlyOneSucceeds` (duas chamadas concorrentes sincronizadas por `CountDownLatch` contra Postgres real via Testcontainers, confirmando exatamente 1 sucesso, 1 reuso detectado, e 0 tokens ativos ao final).

### SEC-010 — Ausência de `@Digits` nos campos financeiros — valor fora da precisão da coluna gera 500 em vez de 400
**Componente:** DTOs de `account`, `transaction`, `recurring`, `budget`, `goal` (`amount`/`initialBalance`/`targetAmount`), todos mapeados para colunas `NUMERIC(12,2)`.
Nenhum DTO usa `@Digits(integer=10, fraction=2)` espelhando a coluna — um valor com mais de 10 dígitos inteiros ou 2 casas decimais passa pela Bean Validation e só falha no INSERT/UPDATE, caindo no handler genérico (`GlobalExceptionHandler.handleUnexpected`) e retornando 500 em vez de 400.
**Impacto:** robustez/input validation — não vaza dado (o handler genérico não expõe detalhe), mas é resposta HTTP incorreta e ofusca observabilidade (todo erro vira "Erro não tratado" no log).
**Correção:** adicionar `@Digits(integer = 10, fraction = 2)` em todos os campos monetários dos DTOs de request.
**Regressão:** teste de integração enviando valor com >10 dígitos inteiros ou >2 casas decimais para cada endpoint financeiro, esperando 400 estruturado.
**OWASP:** ASVS §5.1; Top 10 A04:2021.
**Status:** **FIXED** — `security/hardening-p2` (`8aaeb3c`). `@Digits(integer = 10, fraction = 2)` adicionado em `amount`/`initialBalance`/`targetAmount` dos 10 DTOs de request de account/transaction/recurring/budget/goal. Regressão: um teste de integração por DTO afetado (`AccountControllerIntegrationTest`, `TransactionControllerIntegrationTest`, `RecurringTransactionControllerIntegrationTest`, `BudgetControllerIntegrationTest`, `GoalControllerIntegrationTest` — criação de meta e de contribuição), cada um enviando valor com 11 dígitos inteiros e esperando 400 em vez do 500 anterior.

### SEC-011 — CSV export não neutraliza `=`, `+`, `-`, `@` — Formula/CSV Injection
**Componente:** `backend/src/main/java/com/financeapp/report/ReportService.java:196-226,303-308` (`exportCsv`/`csvField`)
`csvField()` escapa corretamente vírgula/aspas/quebra de linha (RFC 4180), mas não neutraliza um valor de `description`/nome de categoria/conta/método que comece com `=`, `+`, `-` ou `@` — interpretado como fórmula por Excel/LibreOffice ao abrir.
**Cenário:** como cada usuário só exporta seus próprios dados, o vetor prático relevante é compartilhamento do CSV com terceiros (contador, planilha compartilhada) que abrem o arquivo confiando na origem.
**Impacto:** execução de fórmula/hyperlink (`HYPERLINK`, ou DDE em configurações legadas) no aplicativo de planilha de quem abre o arquivo — client-side, não compromete o backend.
**Correção:** em `csvField()`, prefixar com `'` (aspas simples) valores que comecem com `=`,`+`,`-`,`@`,tab ou CR, antes do escaping de aspas/vírgula existente (OWASP CSV Injection Prevention Cheat Sheet).
**Regressão:** teste unitário de `csvField()` cobrindo cada caractere de gatilho, confirmando o prefixo neutralizante na saída.
**OWASP:** OWASP CSV Injection; ASVS §5.1.
**Status:** **FIXED** — `security/hardening-p1` (`eada752`). `csvField()` agora prefixa com `'` valores cujo primeiro caractere esteja em `=+-@`, tab ou CR, antes do escaping RFC 4180 existente; aplicado uniformemente aos quatro campos textuais do export (descrição, categoria, conta, método de pagamento) via o mesmo helper central — nenhuma lógica duplicada. Regressão: `ReportServiceCsvFieldTest` (13 casos, unitário — cada gatilho + regressão de vírgula/aspas/quebra de linha/texto normal) e `ReportControllerIntegrationTest.exportCsv_descriptionStartingWithFormulaTrigger_isNeutralizedInOutput` (ponta a ponta via API real).

---

## 10. Low Findings

### SEC-003 — Enumeração de e-mail via `/api/auth/register`
`AuthService.register` responde 409 explícito ("Já existe uma conta com este e-mail") quando o e-mail já está cadastrado — contraste com o login, que foi cuidadosamente hardenizado contra enumeração (hash dummy BCrypt + mensagem idêntica). Mitigado em volume pelo rate limiter compartilhado (10/60s por IP), mas não impedido. **Correção:** trade-off de UX vs. segurança comumente aceito; se quiser mitigar, considerar resposta assíncrona/verificação de e-mail antes de ativar a conta — requer módulo de e-mail que o projeto não possui hoje. **Status:** OPEN — P3.

### SEC-004 — Política de senha valida por caracteres (`@Size`), não por bytes UTF-8
BCrypt processa apenas os primeiros 72 **bytes**; `@Size(max = 72)` em `RegisterRequest.java:17-19` conta **caracteres**. Senhas longas com acentos/emoji (comuns em português) podem exceder 72 bytes e ter a "cauda" silenciosamente truncada pelo hash, reduzindo entropia efetiva sem o usuário perceber. **Correção:** validar `password.getBytes(UTF_8).length <= 72` além de (ou em vez de) `@Size`. **Status:** **FIXED** — `security/hardening-p2` (`4d43365`). Checagem manual em `AuthService.register` (`password.getBytes(UTF_8).length > 72` → 400 estruturado via `InvalidTransactionException`, já reutilizada em outros domínios do projeto como violação de regra de negócio 400) antes de criar o usuário. Regressão: `AuthControllerIntegrationTest.registerWithPasswordExceeding72Bytes_returns400` (senha de 40 caracteres "é", 80 bytes em UTF-8, sob o limite de `@Size` mas acima do limite real do BCrypt).

### SEC-013 — Workflow do GitHub Actions sem bloco `permissions:` explícito
`.github/workflows/ci.yml` não declara `permissions:`, então o `GITHUB_TOKEN` herda o padrão da organização/repositório (pode ser `write` em repositórios mais antigos). O workflow só roda testes/build, não precisa de escrita em conteúdo/PRs. **Correção:** adicionar `permissions: contents: read` no topo do workflow (least privilege). **Status:** **FIXED** — `security/hardening-p2` (`f90ffdf`). Bloco `permissions: contents: read` adicionado no nível do workflow.

### SEC-016 — HSTS da API diverge do HSTS conservador do Nginx
`SecurityConfig.headers(...)` (`backend/src/main/java/com/financeapp/config/SecurityConfig.java:84-91`) configura CSP/Referrer-Policy/Permissions-Policy explicitamente, mas **não** configura HSTS — o Spring Security aplica o default da biblioteca (`max-age=31536000; includeSubDomains`). Isso diverge do HSTS deliberadamente conservador do Nginx (`deploy/nginx/sistema-financeiro.conf:80,91,123`, `max-age=15552000`, **sem** `includeSubDomains` — decisão documentada no próprio arquivo, linha 71, por não haver garantia de que outros subdomínios da VM tenham HTTPS válido). Como `/api/` não tem `add_header` no Nginx (a resposta do backend passa como veio), o navegador recebe políticas HSTS diferentes dependendo de qual endpoint respondeu por último — o valor mais amplo (`includeSubDomains`) vindo da API contradiz a intenção documentada no Nginx. Não é uma vulnerabilidade explorável (HSTS mais amplo tende a ser mais seguro, não menos) — é um risco operacional: se um subdomínio de `finance.leofe.com.br` existir sem HTTPS válido, pode ficar inacessível até o `max-age` expirar no navegador. **Correção:** configurar `httpStrictTransportSecurity` explicitamente em `SecurityConfig` com os mesmos valores do Nginx (`maxAgeInSeconds=15552000`, `includeSubDomains=false`), ou documentar a divergência como aceitável. **Teste de regressão:** teste de integração que assere o valor exato do header `Strict-Transport-Security` em respostas de `/api/**`. **OWASP:** ASVS 9.1 (Communications Security). **Status:** **FIXED** — `security/hardening-p2` (`7fb4fd4`). `httpStrictTransportSecurity` configurado explicitamente em `SecurityConfig` com os mesmos valores do Nginx (`maxAgeInSeconds=15552000`, `includeSubDomains=false`). Regressão: `SecurityHeadersIntegrationTest.apiResponse_overHttps_sendsHstsMatchingNginxConfig` (requisição MockMvc marcada `secure(true)`, asserção do valor exato do header).

### SEC-017 — Sem rate limiting em `/api/reports/*` (incl. `export.csv`)
`AuthRateLimiter` só é referenciado em `AuthController`/`AuthService` (confirmado por grep) — nenhum dos 9 endpoints de `ReportController`, incluindo `export.csv` (que monta a lista completa de transações do período em memória, `ReportService.exportCsv`), tem limite de taxa. O único controle existente é o teto de 5 anos de período (`ReportService.MAX_PERIOD_YEARS`), que limita o tamanho de uma resposta, não a frequência de chamadas. Um usuário autenticado (ou sessão comprometida) pode repetir chamadas em loop apertado, gerando carga de CPU/IO desnecessária no Postgres de uma instância única de baixo recurso (`-Xmx256m`, `DB_POOL_SIZE=4`). Dano autolimitado aos próprios dados do usuário (sem amplificação cross-tenant). **Correção:** aplicar um limitador por `userId` autenticado (mesmo padrão simples do `AuthRateLimiter`) nos endpoints de relatório/exportação, com limites generosos para uso normal. **Teste de regressão:** teste de integração disparando mais requisições que o limite configurado e esperando 429. **OWASP:** API Security Top 10 — API4:2023 (Unrestricted Resource Consumption). **Status:** **FIXED** — `security/hardening-p2` (`2e38d46`). Novo `ReportRateLimiter` (mesmo padrão Caffeine do `AuthRateLimiter` pós-SEC-001), chaveado por `userId` autenticado, aplicado nos 9 endpoints de `ReportController`; limite padrão generoso (60 requisições/minuto), retorna 429 ao estourar. Regressão: `ReportRateLimitIntegrationTest.exceedingLimit_returns429` (contexto Spring próprio com `app.reports.rate-limit.max-attempts=3` para não depender de disparar 60+ requisições reais).

### SEC-018 — `page` sem validação/teto em `GET /api/transactions`
`TransactionController.search` (`backend/src/main/java/com/financeapp/transaction/TransactionController.java:49-52`) capa corretamente `size` em `[1,100]`, mas não valida `page`. Um `page` negativo chega em `PageRequest.of(page, size)` (`TransactionService.java:112`), que lança `IllegalArgumentException`, capturada pelo handler genérico e retornada como **500** em vez de **400**. Achado confirmado de forma independente por duas linhas de investigação distintas desta auditoria (autorização e validação de input), reforçando a confiança. Sem IDOR envolvido — o filtro `t.user.id = :userId` sempre restringe o dano ao próprio usuário. **Correção:** `int cappedPage = Math.max(page, 0);` (mesmo padrão já usado para `size`), ou `@Min(0) int page` no Controller. **Teste de regressão:** `GET /api/transactions?page=-1` deve retornar 400 (ou 200 com primeira página), nunca 500. **OWASP:** ASVS 5.1 (Input Validation). **Status:** **FIXED** — `security/hardening-p2` (`667cfc1`). `page` capado a um mínimo de 0 em `TransactionController.search`, mesmo padrão já usado para `size`. Regressão: `TransactionControllerIntegrationTest.search_negativePage_isCappedToFirstPage_insteadOf500` (`page=-1` retorna 200 com a primeira página, não 500).

### SEC-019 — `DataIntegrityViolationException` não tratada em corrida de nome duplicado (categoria/método de pagamento)
`categories` (`UNIQUE (user_id, name, type)`) e `payment_methods` (`UNIQUE (user_id, name)`) têm constraint única no schema (migration V2), mas `CategoryService`/`PaymentMethodService` não fazem checagem prévia de duplicidade em nível de aplicação — diferente de `BudgetService.assertNotDuplicate`, que existe e mapeia para 409. Duas requisições concorrentes criando o mesmo nome fazem a segunda falhar no INSERT com `DataIntegrityViolationException`, sem `@ExceptionHandler` dedicado no `GlobalExceptionHandler`, caindo no handler genérico → **500** em vez de **409 Conflict**. Nenhuma corrupção de dado (a constraint do banco funciona corretamente), apenas resposta HTTP incorreta para uma corrida benigna de "double-click". **Correção:** adicionar `@ExceptionHandler(DataIntegrityViolationException.class)` retornando 409, e opcionalmente replicar `assertNotDuplicate` em `CategoryService`/`PaymentMethodService`. **Teste de regressão:** duas criações concorrentes (ou sequenciais) de categoria com mesmo nome devem retornar 409 na segunda, não 500. **OWASP:** fail securely / clear error handling (sem CWE Top 10 direto). **Status:** **FIXED** — `security/hardening-p2` (`001e63c`). `@ExceptionHandler(DataIntegrityViolationException.class)` adicionado ao `GlobalExceptionHandler`, retornando 409 estruturado (a checagem de aplicação estilo `BudgetService.assertNotDuplicate` não foi replicada — o handler genérico já resolve o achado sem lógica duplicada por service). Regressão: `CategoryControllerIntegrationTest.createCategory_withDuplicateNameAndType_returns409` e `PaymentMethodControllerIntegrationTest.createPaymentMethod_withDuplicateName_returns409` (duas criações sequenciais com mesmo nome, segunda espera 409).

### SEC-020 — `HttpMessageNotReadableException` (JSON malformado / enum inválido) sem handler dedicado
O `@RestControllerAdvice` trata `MethodArgumentNotValidException` e `ConstraintViolationException`, mas não tem handler para `HttpMessageNotReadableException` — lançada pelo Jackson **antes** do `@Valid` rodar, quando o corpo é JSON malformado ou contém um valor de enum inválido (ex.: `"type": "NAO_EXISTE"` em `TransactionType`). Cai no handler genérico (`Exception.class`) → provável **500** em vez de **400**. **Confiança:** achado por análise estática (comportamento documentado do `ExceptionHandlerExceptionResolver` do Spring MVC), não verificado em runtime nesta sessão — nenhum teste de integração existente cobre este caso. Sem vazamento de dado (mensagem genérica em ambos os casos), apenas UX de erro degradada e log de erro desnecessário. **Correção:** adicionar `@ExceptionHandler(HttpMessageNotReadableException.class)` retornando 400 com mensagem "Corpo da requisição inválido ou malformado". **Teste de regressão:** POST com JSON sintaticamente inválido e com valor de enum inexistente devem retornar 400 (não 500) — este teste também serve para confirmar o achado em runtime. **OWASP:** ASVS 5.1 (Input Validation), fail securely. **Status:** **FIXED** — `security/hardening-p2` (`001e63c`). `@ExceptionHandler(HttpMessageNotReadableException.class)` adicionado ao `GlobalExceptionHandler`, retornando 400. Regressão (confirma o achado em runtime, antes só suposto por análise estática): `TransactionControllerIntegrationTest.create_malformedJson_returns400` e `create_invalidEnumValue_returns400`.

### SEC-021 — Ausência de proteção de idempotência em criação de recursos financeiros
`POST /api/transactions` e `POST /api/goals/{id}/contributions` não têm chave de idempotência, debounce no backend, nem constraint única que impeça duas linhas idênticas — diferente de `budgets`/`categories`/`payment_methods`, que têm `UNIQUE` no schema (aqui, deliberadamente ausente: duas transações idênticas no mesmo dia são um caso de uso legítimo, ex. dois cafés de R$5). Duplo clique no botão "Salvar", ou um retry automático de rede durante falha tardia, gera duas transações idênticas, inflando despesas/receitas sem aviso — abuso/erro de integridade financeira, não uma falha de acesso. **Correção:** se reportado como problema real por usuários, considerar chave de idempotência opcional (header `Idempotency-Key`, cacheada por `userId+key` por alguns minutos) nesses dois endpoints — não obrigatório hoje. **Teste de regressão:** se implementado, duas requisições idênticas com o mesmo `Idempotency-Key` devem gerar apenas um registro. **OWASP:** API Security Top 10 — API4:2023 (parcialmente relacionado); sem CWE específico de "missing idempotency". **Status:** OPEN — P3.

---

## 11. Informational

- **SEC-006** — Sem tolerância de clock skew no `JwtService` (`Jwts.parser()` sem `.clockSkewSeconds()`); irrelevante hoje (instância única, mesmo relógio de emissão/validação), mas recomendável adicionar 30-60s de tolerância se o backend for escalado horizontalmente no futuro. **FIXED** — `security/hardening-p2` (`d0c9277`): `.clockSkewSeconds(30)` adicionado ao parser.
- **SEC-007** — Não existe endpoint self-service de "logout de todos os dispositivos" (`revokeAllActiveForUser` já existe internamente, usado só pela detecção de reuso). Não há também fluxo de reset/troca de senha — **confirmado N/A**, funcionalidade não implementada.
- **SEC-008** — `register`/`login`/`refresh` compartilham o mesmo balde de rate limit por IP; usuários legítimos atrás do mesmo IP público (CGNAT/rede corporativa) podem esbarrar no limite em picos de uso legítimo. Efeito de disponibilidade, não de segurança.
- **SEC-009** — `user_agent` do refresh token é gravado mas nunca comparado entre rotações — capacidade não aproveitada para heurística de anomalia (não recomendado como bloqueio automático, só como sinal de alerta futuro).
- **SEC-012** — Endpoints de listagem de account/category/payment-method/recurring/budget/goal não são paginados (diferente de `/api/transactions`, que é); aceitável dado que a cardinalidade é inerentemente pequena e pertence ao próprio usuário.
- **SEC-014** — Actions oficiais do GitHub (`actions/checkout@v4`, `setup-java@v4`, `setup-node@v4`) fixadas por tag mutável, não por SHA — risco baixo (actions oficiais, mantidas pela própria GitHub), mas hardening de supply chain recomendável. **FIXED** — `security/hardening-p2` (`f90ffdf`): as três actions fixadas por SHA exato (versão comentada ao lado).
- **SEC-015** — Nenhum `client_max_body_size` explícito no Nginx (aplica-se o default implícito de 1MB) nem limite adicional no backend Spring Boot. O default do Nginx já é uma mitigação razoável para tráfego externo; recomenda-se apenas documentar essa dependência explicitamente em `DEPLOYMENT.md` em vez de depender de um default implícito não declarado. **FIXED** — `security/hardening-p2` (`2f522cf`): nota adicionada em `DEPLOYMENT.md` §11 documentando a dependência (sem mudança de comportamento).

---

## 12. Authentication

Ver Findings SEC-001 a SEC-009 (seção 9-11). **Controles verificados como corretos** (evidência detalhada nos artefatos de trabalho desta auditoria, arquivo por arquivo):
- JWT HS256, chave ≥32 bytes exigida em runtime (fail-fast), sem default em produção; claims enxutos (`sub`, `email`, `iat`, `exp`); sem risco de confusão de algoritmo/`alg:none`.
- Refresh token: 256 bits de `SecureRandom`, nunca persistido em texto plano (hash SHA-256), rotação a cada uso, detecção de reuso com revogação de família (ressalva de corrida em SEC-005).
- Cookies de auth: `HttpOnly`, `Secure` (prod), `SameSite=Strict`, `refresh_token` com `Path` restrito a `/api/auth/refresh`.
- CSRF: double-submit cookie aplicado inclusive a login/registro/logout (sem `ignoringRequestMatchers`).
- CORS: origem única explícita, nunca wildcard, mesmo com `allowCredentials(true)`.
- Login: mitigação de timing attack e de enumeração de e-mail via hash BCrypt dummy + mensagem de erro idêntica.
- Logout: revoga o refresh token correspondente e limpa cookies com os mesmos atributos de criação.
- Múltiplas sessões concorrentes suportadas por design (não é bug).
- Password reset: **N/A confirmado** — não implementado.

---

## 13. Authorization

**Nenhum IDOR encontrado** — a disciplina de ownership é o ponto mais forte desta auditoria:
- Zero ocorrências de `repository.findById(id)` sem filtro de usuário em qualquer um dos 9 módulos de negócio (confirmado por grep exaustivo).
- `userId` sempre derivado de `@AuthenticationPrincipal`, nunca de corpo/path/query da requisição — confirmado em 100% dos controllers.
- Toda referência cruzada (transação→conta/categoria/método; orçamento→categoria; recorrência→conta/categoria/método; contribuição→meta) é validada por posse antes de uso, retornando 404 (não 403) para não vazar existência de recursos de terceiros.
- `Specification`s dinâmicas sempre incluem o predicado de `userId` de forma incondicional.
- Mass assignment: nenhum DTO expõe `id`/`userId`/`role`/status "automático" livremente; a única exceção controlada (`FinancialGoalUpdateRequest.status`) rejeita `COMPLETED` vindo do cliente com 400 explícito.

Ver SEC-010 (validação de precisão financeira) e SEC-012 (paginação) como únicos achados relacionados a esta área, ambos de robustez, não de autorização quebrada.

---

## 14. Session Security

Ver seção 12. Residual risk documentado (não é bug): access tokens JWT continuam válidos até expirar naturalmente (máx. 15 min) mesmo após logout ou revogação por reuso — trade-off padrão e aceito de JWT stateless de curta duração.

---

## 15. API Security

Rate limiting de relatórios/exportação: todos os endpoints de `/api/reports/*` (incluindo `export.csv`) validam um período máximo de 5 anos (`validatePeriod`, aplicado consistentemente, sem exceção) e limites (`@Min`/`@Max`) em `limit`/`months`, mas **não têm limitador de taxa** (`AuthRateLimiter` só cobre `/api/auth/*` — ver SEC-017). Paginação de transações capada em `size∈[1,100]`, mas `page` não é validado (ver SEC-018). HSTS enviado pela API diverge do HSTS do Nginx (ver SEC-016). HTTP methods: nenhum `@PatchMapping` no código (embora `PATCH` permaneça na lista de métodos CORS permitidos sem uso — cosmético, P3). Nenhum endpoint de upload de arquivo existe — **file upload: N/A**. Nenhuma chamada HTTP de saída construída a partir de URL fornecida pelo cliente — **SSRF: N/A**. Nenhum parâmetro `redirect`/`returnUrl`/`next` encontrado — **Open Redirect: N/A**. Nenhum envio de e-mail no projeto — **Email header injection: N/A**.

---

## 16. Input Validation

Ver SEC-010, SEC-018, SEC-019, SEC-020, SEC-021. Bean Validation (`@NotNull`, `@Size`, `@DecimalMin`, `@Pattern`) presente e consistente em todos os DTOs de request revisados; os gaps identificados são todos de robustez de tratamento de erro (respostas 500 genéricas onde deveriam ser 400/409 estruturados), nunca de dado aceito incorretamente ou vazamento de informação — em todos os casos o `GlobalExceptionHandler` genérico já garante que nenhum detalhe interno (stacktrace, SQL, nome de classe) chega ao cliente, mesmo quando o código HTTP está "errado". Datas validadas com regras de negócio específicas por módulo (ex.: `targetDate` de meta não anterior à criação, `endDate` de recorrência não anterior a `startDate`). Nenhuma proteção de idempotência em POSTs financeiros (SEC-021) — risco de duplicidade por duplo clique, não de segurança de acesso.

---

## 17. Data Security

Valores financeiros sempre em `BigDecimal` na cadeia de persistência (nunca `double`/`float`), eliminando erro de arredondamento de ponto flutuante. Conversão pontual `Double→BigDecimal` em agregações SQL (`ReportService.money()`) usa `BigDecimal.valueOf(double)` (via representação String, não o construtor binário impreciso) — escolha correta. Senha nunca serializada em resposta (`UserResponse` é DTO explícito sem `passwordHash`). Nenhum log contendo senha/token/segredo encontrado nos pacotes `auth`/`config`/`user`.

---

## 18. Frontend Security

Zero ocorrências de `dangerouslySetInnerHTML`/`innerHTML`/`eval` em todo `frontend/src` — React escapa por padrão via JSX, texto livre da API sempre renderizado como texto. Zero uso de `localStorage`/`sessionStorage` para dados sensíveis — tokens vivem exclusivamente em cookies HttpOnly geridos pelo backend. `npm audit` (frontend, produção + dev): **0 vulnerabilidades**. `frontend/.env.development` contém apenas `VITE_API_URL` (valor público, sem segredo).

---

## 19. Infrastructure

- **Nginx**: único ponto público (80→443 redirect, HSTS condicional, CSP restritiva para o HTML/assets estáticos, headers de segurança repetidos corretamente em cada `location` devido à regra de herança do `add_header` do Nginx — comentário no próprio arquivo demonstra consciência dessa pegadinha real). `/api/` faz proxy para `127.0.0.1:8084` sem reescrever headers, deixando a API responder com sua própria CSP restritiva (`default-src 'none'`). Nenhum `client_max_body_size` explícito (SEC-015, INFO).
- **Backend binding**: `server.address=127.0.0.1` em produção — nunca `0.0.0.0` — confirmado em `application-prod.yml`.
- **PostgreSQL**: não exposto publicamente por design (acessado só via `127.0.0.1` pelo backend); role dedicada (`sistema_financeiro_app`) documentada em `deploy/app.env.example`. Verificação de que a VM real não expõe a porta 5432 publicamente **não é possível nesta auditoria** (sem acesso SSH) — recomenda-se checklist manual (seção 25).
- **systemd**: usuário/grupo dedicados sem privilégio (`sistema-financeiro`, `nologin`), `NoNewPrivileges=true`, `PrivateTmp=true`, `ProtectSystem=strict`, `ProtectHome=true`, `ReadWritePaths` restrito ao diretório da aplicação — hardening básico já presente e correto. Hardening adicional possível (não obrigatório, P3): `ProtectKernelModules=true`, `ProtectKernelLogs=true`, `ProtectControlGroups=true`, `RestrictRealtime=true`, `RestrictNamespaces=true`, `SystemCallFilter=@system-service`.
- **Backup/Restore**: `backup-db.sh` nunca recebe senha por argumento (só env var — evita exposição em `ps`/histórico de shell), grava com `chmod 0600`, remove arquivo parcial em caso de falha, retenção simples (`KEEP_DAILY=7`). `restore-db.sh` exige `CONFIRM_RESTORE=yes` explícito e não faz DROP/CREATE automático — proteção deliberada contra execução acidental. **Criptografia do backup em repouso**: os arquivos `.sql.gz` **não são criptografados** — contêm dados financeiros/pessoais em texto plano (comprimido) no disco da VM. Proporcional ao risco atual (permissão 0600, mesma VM que já hospeda o banco em texto), mas vale documentar como risco residual caso a política de backup evolua para armazenamento externo/cloud.
- **Firewall (documentação, não verificável na VM real)**: portas que devem estar publicamente abertas: 80, 443 (Nginx), 22 (SSH, idealmente restrito por IP/chave). Backend (8084) e PostgreSQL (5432) **nunca** devem estar expostos publicamente — já mitigado por design (bind em loopback), mas a auditoria não teve acesso para confirmar a ausência de regra de firewall permissiva na VM real.

---

## 20. CI/CD

Ver SEC-013, SEC-014. `npm ci` (lockfile determinístico) e Maven Wrapper usados corretamente — `.mvn/wrapper/maven-wrapper.properties` aponta para a URL oficial `apache.org`, sem indício de comprometimento. Testes de backend rodam contra Postgres real via Testcontainers (não mockado) em todo PR/push para `main`. `npm audit` roda no CI mas não falha o build (`|| true`) — decisão deliberada e documentada no próprio workflow ("audit é um sinal a revisar, não um gate automático"); aceitável dado que o projeto não tem política formal de severidade de CVE ainda, mas recomenda-se ao menos revisar manualmente o output periodicamente.

---

## 21. Dependencies

**Backend (Maven):** Spring Boot 4.1.0 (parent), `jjwt` 0.13.0, PostgreSQL JDBC driver (via BOM do Spring Boot), Flyway (`flyway-database-postgresql`). Nenhuma dependência com CVE conhecida identificada em revisão manual — versões recentes e ativamente mantidas. `dependency-check-maven` completo não executado (exige base NVD externa) — recomenda-se rodar periodicamente em pipeline separado.
**Frontend (npm):** `npm audit` (produção e completo): **0 vulnerabilidades**. Lockfile (`package-lock.json`) versionado, `npm ci` usado no CI (build determinístico).

---

## 22. Backup/Recovery

Ver seção 19 (Infrastructure). Resumo: processo de backup/restore bem desenhado para o porte do projeto; único ponto de atenção é a ausência de criptografia em repouso dos arquivos de backup (documentado como risco residual proporcional, não como finding acionável imediato).

---

## 23. Security Tests

Testes de segurança recomendados, por prioridade (a suíte já existente — `AuthControllerIntegrationTest`, `RefreshTokenTest`, `AuthRateLimiterTest` — já cobre boa parte do fluxo básico de auth/CSRF/reuse; os gaps abaixo são o que NÃO está coberto hoje):

1. **Concorrência na rotação de refresh token** (cobre SEC-005) — duas chamadas simultâneas ao mesmo token, esperando que só uma suceda.
2. **Rate limit por IP vs. força bruta distribuída por conta** (cobre SEC-002) — múltiplos "IPs" (mockados) contra o mesmo e-mail.
3. **CSV Injection** (cobre SEC-011) — `description`/nomes iniciados por `=`,`+`,`-`,`@` devem sair prefixados no export.
4. **Validação de precisão financeira** (cobre SEC-010) — valores com >10 dígitos inteiros ou >2 casas decimais devem retornar 400, não 500, em todos os endpoints financeiros.
5. **IDOR (regressão preventiva)** — mesmo sem achado hoje, recomenda-se um teste parametrizado genérico ("usuário B não pode GET/PUT/PATCH/DELETE recurso do usuário A") rodando contra todos os 9 módulos, para blindar contra regressão futura.
6. **Ownership em referências cruzadas** — criar transação/recorrência/orçamento referenciando `accountId`/`categoryId`/`paymentMethodId` de outro usuário deve retornar 404.
7. **Eviction do rate limiter** (cobre SEC-001) — validar que o cache não cresce sem limite.
8. **Validação de parâmetros de paginação** (cobre SEC-018) — `page` negativo deve retornar 400, não 500.
9. **Corrida de nome duplicado** (cobre SEC-019) — duas criações concorrentes de categoria/método de pagamento com mesmo nome devem retornar 409 na segunda, não 500.
10. **JSON malformado / enum inválido** (cobre SEC-020) — confirma em runtime se o comportamento hoje é de fato 500 (achado por análise estática) e trava 400 como contrato.
11. **Rate limit em relatórios/exportação** (cobre SEC-017) — acima de um limiar de chamadas por minuto, esperar 429.

---

## 24. Prioritized Remediation Plan

**P0 — corrigir imediatamente:** nenhum item (sem CRITICAL/HIGH).

**P1 — antes do próximo deploy:** ✅ **concluído e mesclado em `main`** (`security/hardening-p1`, PR #14, mergedAt 2026-08-30T14:01:30Z).
- SEC-011 (CSV Formula Injection) — **FIXED** (`eada752`).
- SEC-005 (race condition na rotação de refresh token) — **FIXED** (`cc88668`).
- SEC-001 (rate limiter sem eviction) — **FIXED** (`5144856`).

**P2 — curto prazo:** ✅ **concluído em `security/hardening-p2`** (2026-08-30, PR aberto, aguardando merge do usuário).
- SEC-002 (força bruta distribuída por conta) — avaliado nesta fase e **mantido deliberadamente deferido**, a pedido explícito do usuário (ver seção 9 para a justificativa completa); requer decisão de produto sobre limiar/janela de lockout e um teste de timing/enumeração que não seja flaky antes de ser implementado com segurança.
- SEC-010 (`@Digits` em campos financeiros) — **FIXED** (`8aaeb3c`).
- Também corrigidos nesta fase (originalmente P3, adiantados por serem mecânicos/baixo risco): SEC-004, SEC-006, SEC-013, SEC-014, SEC-015, SEC-016, SEC-017, SEC-018, SEC-019, SEC-020 — ver seções 9-11 para detalhe de cada um.

**P3 — hardening futuro (restante, ainda OPEN):**
- SEC-003 (enumeração de e-mail no registro) — trade-off aceito, exigiria módulo de e-mail que o projeto não tem.
- SEC-007 (sem logout de todos os dispositivos) — feature nova, não um bug; N/A confirmado.
- SEC-008 (rate limit de auth compartilhado entre login/register/refresh) — efeito de disponibilidade, não de segurança; sem correção concreta proposta.
- SEC-009 (`user_agent` do refresh token não usado como sinal) — capacidade não aproveitada, não recomendado como bloqueio automático hoje.
- SEC-012 (listagens sem paginação em recursos de baixa cardinalidade) — aceitável, sem correção necessária.
- SEC-021 (sem proteção de idempotência em transações/contribuições) — o próprio achado já recomenda não implementar preventivamente; revisitar só se reportado como problema real por usuários.
- Hardening systemd adicional (seção 19).
- Criptografia de backup em repouso, caso a política de armazenamento evolua.
- Verificação manual na VM real (firewall, permissões de arquivo, versão do Nginx) — checklist na seção 25.

---

## 25. Residual Risks

- Verificação de infraestrutura real da VM (firewall, permissões de arquivo de `app.env`/backups, exposição real de portas) **não foi possível nesta auditoria** por falta de acesso SSH — risco residual até que um operador confirme manualmente via checklist (portas abertas = apenas 80/443/22; `app.env` com dono `sistema-financeiro:sistema-financeiro` e permissão 0600; PostgreSQL escutando só em `127.0.0.1`).
- Access tokens JWT continuam válidos até expirar (máx. 15 min) mesmo após logout/revogação por reuso — trade-off aceito de design stateless, não uma falha.
- Ausência de criptografia em repouso nos backups — proporcional ao risco atual, mas vale reavaliar se o armazenamento migrar para fora da VM.
- `dependency-check-maven` completo (CVE feed NVD) não executado nesta sessão — recomenda-se integrar ao CI ou rodar periodicamente fora dele.
- Nenhum WAF/proteção anti-automação (CAPTCHA) em `/api/auth/register` — aceito como trade-off atual, documentado em SEC-002/SEC-003.

---

*Relatório gerado como parte de uma auditoria de segurança dedicada. Nenhuma correção de código foi aplicada nesta fase além do que está explicitamente documentado como necessário para validar um achado (nenhuma alteração de código foi de fato necessária ou aplicada — toda a auditoria foi feita por leitura estática e revisão de testes/configuração existentes).*
