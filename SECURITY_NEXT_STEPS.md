# Security — Handoff para Remediação (P1)

**Data:** 2026-08-30
**Objetivo deste arquivo:** retomar o trabalho de remediação amanhã sem precisar reexplicar contexto. Este documento não corrige nada — é só o estado da auditoria e o plano de ataque para a fase de hardening.

---

## 1. Estado atual

- **Auditoria concluída e já mergeada em `main`.** A branch `security/deep-audit` foi mergeada via **PR #12** (`fda90e0`), em `2026-08-30T04:09:57Z`. `SECURITY_AUDIT.md` já está em `main`.
- **Atenção:** esse push + abertura + merge do PR #12 **não foi feito por mim nesta sessão** — minha tentativa de `git push` foi bloqueada pelo classificador de auto mode do Claude Code, e quando verifiquei de novo o PR já constava como aberto e mergeado. Presumo que você (ou outra sessão) fez isso manualmente. **Confirme que esse merge foi intencional** antes de seguir — se não foi, isso precisa ser revertido antes da fase de hardening.
- Commits da auditoria, ambos em `main` hoje:
  - `6e490bb` — `docs: add comprehensive security audit` (relatório inicial, 332 linhas, 15 findings).
  - `e6e57cb` — `docs: consolidate parallel security audit findings into report` (adiciona SEC-016 a SEC-021, totais atualizados para 21 findings).
- Este arquivo (`SECURITY_NEXT_STEPS.md`) está sendo commitado na branch `docs/security-handoff`, criada a partir de `main` já atualizado. Push/PR desta branch: **pendente**, mesma situação — meu `git push` tende a ser bloqueado pelo classificador; se for o caso, rode você mesmo ou aprove o próximo prompt de permissão.

---

## 2. Total de findings e severidades

| Severidade | Qtd |
|---|---|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 5 |
| LOW | 9 |
| INFO | 7 |
| **Total** | **21** |

Nenhum finding CRITICAL/HIGH. Nenhum IDOR, nenhum segredo exposto, nenhuma dependência vulnerável.

---

## 3. P1 — prioritários (corrigir antes do próximo deploy)

Estes três são o único escopo da branch de hardening amanhã. Ver `SECURITY_AUDIT.md` para o texto completo de cada um (seção 9 — Medium Findings).

### SEC-005 — Race condition na rotação de refresh token
- **Arquivo:** `backend/src/main/java/com/financeapp/auth/RefreshTokenService.java:62-82` (método `rotate`)
- **Problema:** leitura + revogação sem lock pessimista/otimista nem `UPDATE` condicional atômico. Duas chamadas concorrentes com o mesmo `rawToken` podem ambas passar antes de qualquer commit, gerando dois tokens filhos válidos sem acionar a detecção de reuso.
- **Correção recomendada:** trocar por `UPDATE refresh_tokens SET revoked_at = :now WHERE token_hash = :hash AND revoked_at IS NULL` checando `rowsAffected` (tratar `0` como reuso), **ou** `@Lock(LockModeType.PESSIMISTIC_WRITE)` em `findByTokenHash`. O projeto já usa esse padrão em `RecurringTransactionRepository.findByIdForUpdate` — replicar a mesma abordagem aqui.

### SEC-011 — CSV / Formula Injection no export de relatórios
- **Arquivo:** `backend/src/main/java/com/financeapp/report/ReportService.java:196-226` (`exportCsv`) e `:303-308` (`csvField`)
- **Problema:** `csvField()` escapa vírgula/aspas/quebra de linha (RFC 4180) mas não neutraliza valores que começam com `=`, `+`, `-`, `@` — interpretados como fórmula por Excel/LibreOffice.
- **Correção recomendada:** no início de `csvField()`, se o valor (após trim) começar com `=`, `+`, `-`, `@`, tab ou CR, prefixar com `'` (apóstrofo) antes de aplicar o escaping existente. Aplicar a `Descrição`, `Categoria`, `Conta` e `Método de pagamento`.

### SEC-001 / SEC-002 — Rate limiting de auth: sem eviction e sem controle por conta
- **Arquivo:** `backend/src/main/java/com/financeapp/auth/AuthRateLimiter.java`
- **SEC-001:** `ConcurrentHashMap<String, Window>` sem TTL/eviction — cresce indefinidamente por IP distinto (risco de OOM na instância única, `-Xmx256m`).
- **SEC-002:** chave é sempre `request.getRemoteAddr()` (IP), nunca a conta/e-mail — força bruta distribuída por múltiplos IPs contra a mesma conta nunca esbarra em limite agregado.
- **Correção recomendada (SEC-001):** trocar o `ConcurrentHashMap` manual por cache com `maximumSize`/`expireAfterWrite` (ex.: Caffeine), ou adicionar `@Scheduled` de limpeza periódica.
- **Correção recomendada (SEC-002):** avaliar controle complementar por conta (contador de falhas persistido + lockout temporário curto) **cuidando para manter tempo de resposta e mensagem de erro idênticos** entre "conta não existe" e "conta bloqueada" — não reabrir o canal de enumeração de e-mail que o login já mitiga hoje (hash BCrypt dummy). Se preferir não implementar lockout por conta agora, documentar a decisão explicitamente como risco aceito — não é obrigatório para fechar P1, mas SEC-001 (eviction) é.

---

## 4. O que já foi validado (não precisa repetir)

- Suíte de integração existente (`AuthControllerIntegrationTest`, Testcontainers/Postgres real) cobre login, register, CSRF ausente/inválido, refresh, rotação, logout, reuse detection.
- IDOR testado dinamicamente com dois usuários reais locais (~19 requisições cruzadas em todos os 9 módulos de negócio) — nenhum vazamento, nenhuma mutação cross-tenant.
- Mass assignment testado empiricamente (campos `id`/`userId`/`active` extras no corpo são ignorados).
- `npm audit` (frontend): 0 vulnerabilidades. Confirmado de forma independente duas vezes.
- Versões de dependências backend (Spring Boot 4.1.0, jjwt 0.13.0) confirmadas recentes via leitura de `pom.xml`.
- Busca de segredos no working tree **e** no histórico completo do Git (`git log --all -p`, padrões de senha/chave/token AWS/PEM): nada encontrado. Confirmado de forma independente duas vezes.
- `.gitignore` cobre corretamente `.env`/`.env.*` em ambos os módulos.
- Ausência de bloco `permissions:` no `.github/workflows/ci.yml` confirmada diretamente (SEC-013, P3 — não bloqueia P1).
- Zero XSS explorável no frontend (sem `dangerouslySetInnerHTML`/`innerHTML`, dados sempre via JSX escapado).
- Zero token de auth em `localStorage`/`sessionStorage` — sessão 100% via cookies HttpOnly.

## 5. O que **não** foi testado, por segurança (não fazer sem escopo formal)

- Nenhuma requisição contra `https://finance.leofe.com.br` (produção) em nenhum momento.
- Nenhum brute force real (nem local, nem contra produção).
- Nenhum fuzzing agressivo ou stress test.
- `mvn org.owasp:dependency-check-maven:check` completo (exige download de base NVD externa) — recomendo integrar ao CI separadamente, fora desta fase.
- Nenhum acesso SSH à VM real de produção — firewall, permissões de arquivo (`app.env`, backups), versão real do Nginx/kernel **não confirmados**, só auditados por documentação (`DEPLOYMENT.md`). Ver seção 25 (Residual Risks) do `SECURITY_AUDIT.md`.

---

## 6. Próximos passos exatos

```
1. [FEITO — confirmar se foi intencional] abrir/mergear PR da auditoria (PR #12, já mergeada em main)
2. criar branch security/hardening-p1 a partir de main
3. corrigir SEC-005 (race condition no refresh token)
4. corrigir SEC-011 (CSV injection)
5. corrigir SEC-001/002 (rate limiting)
6. testes de regressão (ver seção 7 abaixo)
7. atualizar SECURITY_AUDIT.md (marcar SEC-005/011/001/002 como FIXED, não OPEN)
8. nova revisão curta (diff pequeno e cirúrgico — 3 correções, não uma reescrita)
```

Branch sugerida: **`security/hardening-p1`**, criada a partir de `main` (já contém a auditoria).

---

## 7. Testes de regressão necessários por correção

### SEC-005 (refresh token race condition)
- Teste de integração com duas chamadas **concorrentes** (`CompletableFuture`/`CountDownLatch` para sincronizar o início) a `RefreshTokenService.rotate()` com o **mesmo** `rawToken`, contra Postgres real (Testcontainers, mesmo padrão de `AuthControllerIntegrationTest`).
- Asserir que **exatamente uma** chamada sucede; a outra deve ser tratada como reuso (mesmo caminho de "revoga todas as sessões" já existente).
- Rodar o teste de reuse detection já existente depois da correção para confirmar que não quebrou o fluxo sequencial normal.

### SEC-011 (CSV injection)
- Teste unitário de `csvField()`/`exportCsv` cobrindo valores começando com `=`, `+`, `-`, `@`, tab, CR — cada um deve sair prefixado com `'` na saída.
- Teste de regressão que confirma que valores **normais** (sem esses prefixos) continuam idênticos ao comportamento atual (não quebrar o escaping de vírgula/aspas/quebra de linha existente).
- Teste de que um valor como `=1+1` some `'=1+1` no CSV gerado (não `1+1` nem `2`).

### SEC-001 (rate limiter sem eviction)
- Teste inserindo N chaves (N grande, ex. 100.000) e validando que, após decorrido o `window` configurado, o tamanho do cache/mapa interno **não** cresce indefinidamente (expõe método de tamanho para teste, ou testa indiretamente).
- Se trocar para Caffeine: teste de que o limite (`maximumSize`) é respeitado.

### SEC-002 (rate limit por IP, sem conta)
- **Somente se a correção for implementada nesta fase** (é opcional para fechar P1, ver seção 3): teste simulando falhas de login contra o mesmo e-mail vindas de múltiplos IPs (mockados), validando lockout temporário a partir de um limiar configurável — e validando que a mensagem/tempo de resposta continuam idênticos entre "conta não existe" e "conta bloqueada".

---

## 8. Aviso — não mexer em LOW/INFO antes de fechar P1

Os outros 16 findings (SEC-003, 004, 006 a 010, 012 a 021) são **LOW ou INFO** — nenhum é bloqueante, nenhum expõe dado ou permite acesso não autorizado. **Não abrir escopo para eles na branch `security/hardening-p1`.** Misturar correções P1 com hardening P2/P3 no mesmo PR:

- dificulta a revisão (diff deixa de ser "3 correções cirúrgicas" e vira uma reescrita);
- atrasa o fechamento dos itens que de fato importam (P1);
- contraria a instrução do usuário de manter auditoria e remediação como fases separadas.

Se algo em LOW/INFO for tentador de corrigir "já que está mexendo no arquivo" (ex.: SEC-010 `@Digits` está em DTOs que SEC-011 não toca, então não há sobreposição real) — mesmo assim, deixar para uma branch `security/hardening-p2` posterior.

---

## 9. Status do push/PR

- `docs/security-handoff` (este arquivo): commitado localmente. Push pendente — meu `git push` tende a ser bloqueado pelo classificador de auto mode; rode manualmente ou aprove o prompt de permissão quando aparecer.
- Nenhuma outra branch de código foi criada ainda. `security/hardening-p1` **não existe** — é só uma sugestão de nome para amanhã, conforme pedido.
