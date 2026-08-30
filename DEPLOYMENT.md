# DEPLOYMENT.md — sistema-financeiro

Procedimento operacional para colocar a aplicação em produção. Este
documento assume uma VM Linux pequena, compartilhada com outros projetos
(ver ARCHITECTURE.md §12–§13), com acesso SSH de um operador humano.

**O deploy está aplicado e ao vivo.** Duas VMs candidatas foram
inspecionadas via SSH:
- `147.15.127.35` — já hospeda o projeto GridPulse; descartada para este
  deploy por restrição de memória disponível.
- `167.234.233.150` — escolhida: tem Nginx nativo já instalado e já
  hospeda outros projetos do usuário.

O deploy foi executado de fato em `167.234.233.150` e confirmado por
verificação read-only real (não é só o template revisado): backend
como `sistema-financeiro.service` (systemd) ativo, servindo
`/opt/sistema-financeiro/app.jar`; Nginx com vhost
`finance.leofe.com.br` habilitado; certificado Let's Encrypt real válido
(`certbot certificates`); `curl https://finance.leofe.com.br/` responde
HTTP 200; Postgres do projeto respondendo em `127.0.0.1:5433`;
`/etc/sistema-financeiro/app.env` com permissão `0600`. Antes disso, os
templates em `deploy/` foram criados e o backend/frontend validados
localmente (build, testes, ciclo real de backup→restore contra Postgres
local). Os passos abaixo documentam o procedimento seguido — para
qualquer novo deploy/rollback/alteração nesta VM, reconectar e reconferir
o estado real antes de assumir que nada mudou (é uma VM compartilhada e
de recursos apertados).

## 1. Pré-requisitos

- VM Linux (systemd), acesso SSH com um usuário com sudo.
- Java 21+ (runtime — `apt install openjdk-21-jre-headless` ou
  equivalente; build acontece fora da VM, então JDK completo não é
  necessário).
- PostgreSQL 13+ acessível (nativo ou container) — ver §4.
- Nginx.
- Certbot (`certbot` + plugin `python3-certbot-nginx`) para HTTPS.
- Domínio público apontando para o IP da VM.

## 2. Checklist de inspeção da VM (obrigatório, antes de tudo)

Antes de instalar qualquer coisa, levantar (só leitura, sem alterar nada):

```bash
# Portas já em uso — escolher SERVER_PORT (backend) sem colidir
ss -tlnp

# Serviços systemd já rodando
systemctl list-units --type=service --state=running

# Containers Docker já rodando (se PostgreSQL de outro projeto estiver em container)
docker ps -a

# Config de Nginx já existente — não sobrescrever virtual host de outro projeto
ls -la /etc/nginx/sites-enabled/
nginx -T | less

# Certificados já emitidos
certbot certificates

# Memória/disco disponíveis
free -h
df -h
```

Ver ARCHITECTURE.md §13.1 para o checklist completo de inspeção do
PostgreSQL especificamente. **Nunca**: parar serviço de outro projeto,
sobrescrever virtual host existente, remover container alheio, reutilizar
banco de outro sistema, apagar certificado, abrir PostgreSQL publicamente.

## 3. Paths de produção

```
/opt/sistema-financeiro/app.jar              # backend (link/cópia do artefato)
/opt/sistema-financeiro/app.jar.previous      # JAR anterior, para rollback
/var/www/sistema-financeiro/releases/<ts>/    # cada build do frontend
/var/www/sistema-financeiro/current -> releases/<ts>/  # symlink atual
/etc/sistema-financeiro/app.env               # segredos (0600, fora do repo)
/etc/systemd/system/sistema-financeiro.service
/etc/nginx/sites-available/sistema-financeiro.conf (symlink em sites-enabled)
/var/backups/sistema-financeiro/              # backups de banco (pg_dump)
```

## 4. Usuário Linux

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin sistema-financeiro
sudo mkdir -p /opt/sistema-financeiro
sudo chown sistema-financeiro:sistema-financeiro /opt/sistema-financeiro
sudo mkdir -p /etc/sistema-financeiro
sudo chown root:sistema-financeiro /etc/sistema-financeiro
```

## 5. PostgreSQL

Seguir o checklist e as opções da ARCHITECTURE.md §13 (instância
compartilhada já bem administrada vs. nova instância dedicada — decisão
tomada com dados reais da VM, não antecipada aqui). Em qualquer caso:

```sql
CREATE ROLE sistema_financeiro_app WITH LOGIN PASSWORD '<senha forte gerada>';
CREATE DATABASE sistema_financeiro OWNER sistema_financeiro_app;
```

PostgreSQL **não pode ficar exposto publicamente** — `listen_addresses`
restrito a `127.0.0.1`/rede privada, ou, se em container, sem publicar a
porta em `0.0.0.0`.

## 6. Variáveis de ambiente (`app.env`)

```bash
sudo cp deploy/app.env.example /etc/sistema-financeiro/app.env
sudo chmod 0600 /etc/sistema-financeiro/app.env
sudo chown sistema-financeiro:sistema-financeiro /etc/sistema-financeiro/app.env
sudo -u sistema-financeiro nano /etc/sistema-financeiro/app.env
```

Preencher `DB_URL`/`DB_USERNAME`/`DB_PASSWORD` (do passo 5),
`JWT_SECRET` (`openssl rand -base64 48`), `CORS_ALLOWED_ORIGIN` (domínio
público real), `SERVER_PORT` (escolhida no checklist do §2 — o valor de
exemplo é `8084`, ajustar se já estiver em uso). **Nunca commitar este
arquivo real.**

## 7. Build (fora da VM — CI ou máquina local)

```bash
# Backend
cd backend
./mvnw clean test
./mvnw package
# Artefato: backend/target/backend-0.0.1-SNAPSHOT.jar

# Frontend
cd frontend
npm ci
npm run lint
npm run test:run
npm run build
npm audit
# Artefato: frontend/dist/
```

Só os artefatos finais (`*.jar`, `dist/`) são enviados à VM — não a
toolchain de build (ver ARCHITECTURE.md §14).

## 8. Frontend — primeira instalação

```bash
sudo mkdir -p /var/www/sistema-financeiro/releases
sudo chown -R www-data:www-data /var/www/sistema-financeiro
# primeira release manual; deploys seguintes usam deploy/scripts/deploy.sh
```

## 9. Backend — primeira instalação

```bash
sudo cp backend/target/backend-0.0.1-SNAPSHOT.jar /opt/sistema-financeiro/app.jar
sudo chown sistema-financeiro:sistema-financeiro /opt/sistema-financeiro/app.jar
```

## 10. systemd

```bash
sudo cp deploy/systemd/sistema-financeiro.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable sistema-financeiro
sudo systemctl start sistema-financeiro
sudo systemctl status sistema-financeiro
```

Flags de JVM já no `.service` (`-Xms64m -Xmx256m` + `SerialGC`,
conservador — ver ARCHITECTURE.md §12 e a seção "Consumo de memória"
abaixo). Roda como usuário `sistema-financeiro`, nunca root.

## 11. Nginx

```bash
sudo cp deploy/nginx/sistema-financeiro.conf /etc/nginx/sites-available/
# editar SEU-DOMINIO-AQUI e os paths de root/proxy_pass antes do symlink
sudo ln -s /etc/nginx/sites-available/sistema-financeiro.conf /etc/nginx/sites-enabled/
sudo nginx -t          # NUNCA reload com config inválida
sudo systemctl reload nginx
```

## 12. SSL (Certbot/Let's Encrypt)

```bash
sudo certbot --nginx -d SEU-DOMINIO-AQUI
```

O Certbot edita o `server` block temporariamente para o desafio HTTP-01 e
injeta as diretivas `ssl_certificate`/`ssl_certificate_key` — o arquivo em
`deploy/nginx/sistema-financeiro.conf` já assume esses caminhos padrão.
Renovação automática já vem configurada pelo pacote do Certbot
(`systemctl status certbot.timer`); validar uma vez com:

```bash
sudo certbot renew --dry-run
```

HSTS (`Strict-Transport-Security`) só deve ficar ativo no `.conf` depois
de confirmar que HTTPS funciona de ponta a ponta — está conservador por
padrão (sem `preload`, sem `includeSubDomains`).

## 13. Healthcheck

```bash
curl -fsS http://127.0.0.1:8084/actuator/health   # ajustar a porta escolhida no §6
# {"status":"UP"} — sem detalhes internos (management.endpoint.health.show-details=never)

systemctl status sistema-financeiro
journalctl -u sistema-financeiro -n 50
```

Só `/actuator/health` é exposto (o `SecurityConfig` trata como endpoint
público); nenhum outro endpoint do Actuator (`env`, `beans`,
`configprops`, `mappings`, `heapdump`) está habilitado
(`management.endpoints.web.exposure.include=health`).

## 14. Logs

```bash
journalctl -u sistema-financeiro -f              # acompanhar em tempo real
journalctl -u sistema-financeiro --since "1 hour ago"
journalctl -u sistema-financeiro -p err           # só erros

sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

Nginx já integra com o `logrotate` padrão da distro (pacote `nginx`
normalmente instala `/etc/logrotate.d/nginx`) — não foi necessário criar
configuração própria. Nível de log do backend em produção é `INFO` por
padrão (`application-prod.yml`), sem `DEBUG` de Spring Security/Hibernate
SQL — ajustável via `LOGGING_LEVEL_*` no `app.env` só para diagnóstico
pontual.

## 15. Backup

```bash
DB_HOST=127.0.0.1 DB_PORT=5432 DB_NAME=sistema_financeiro \
DB_USERNAME=sistema_financeiro_app DB_PASSWORD=*** \
BACKUP_DIR=/var/backups/sistema-financeiro \
  deploy/scripts/backup-db.sh
```

Agendar via `cron`/`systemd timer` do operador (fora do escopo deste
repo — decisão de infraestrutura da VM). Retenção: últimos 7 backups
diários (`KEEP_DAILY`, ajustável). Nunca imprime a senha em texto (lida só
de variável de ambiente).

## 16. Restore

**Sempre testar primeiro contra um banco temporário**, nunca direto em
produção:

```bash
# 1. Criar banco temporário
psql -h 127.0.0.1 -U sistema_financeiro_app -d postgres \
  -c "CREATE DATABASE sistema_financeiro_restore_test OWNER sistema_financeiro_app;"

# 2. Restaurar o backup nele (exige confirmação explícita)
DB_HOST=127.0.0.1 DB_PORT=5432 DB_NAME=sistema_financeiro_restore_test \
DB_USERNAME=sistema_financeiro_app DB_PASSWORD=*** \
CONFIRM_RESTORE=yes \
  deploy/scripts/restore-db.sh /var/backups/sistema-financeiro/sistema_financeiro-<timestamp>.sql.gz

# 3. Validar dados, depois apagar o banco temporário
psql -h 127.0.0.1 -U sistema_financeiro_app -d postgres \
  -c "DROP DATABASE sistema_financeiro_restore_test;"
```

Esse ciclo completo (dados reais → backup → restore em banco temporário →
validação → limpeza) **foi executado e validado nesta sessão** contra o
Postgres de desenvolvimento (`docker-compose.dev.yml`) — ver
ARCHITECTURE.md, Fase 10, para o resultado. Restaurar por cima de um banco
existente exige apagar/recriar o database antes (decisão manual do
operador — o script não faz isso sozinho).

## 17. Update (deploy de uma nova versão)

```bash
BACKEND_JAR=/caminho/para/backend-0.0.1-SNAPSHOT.jar \
FRONTEND_DIST=/caminho/para/frontend/dist \
  deploy/scripts/deploy.sh
```

O script: guarda o JAR anterior (`app.jar.previous`), copia o novo,
publica o frontend em um diretório de release novo e troca o symlink
`current` atomicamente (nunca existe um estado "meio publicado"),
reinicia o `systemd`, espera o healthcheck responder `UP`, valida e
recarrega o Nginx. **Se houve migration Flyway nova nesta versão**, ela já
foi aplicada no startup do backend antes do healthcheck passar — não tem
como "cancelar" isso automaticamente (ver §18).

## 17b. Deploy automático (CD via GitHub Actions)

Desde 2026-08-30, `.github/workflows/deploy.yml` automatiza o fluxo manual
da §17 (build local, `scp`, SSH, `chown`, `nginx reload`) — eliminando a
classe de erro humano que já causou incidente real (build de produção
contaminado por `frontend/.env.local` residual, ver §"Troubleshooting").

**Como disparar:** aba *Actions* do repositório no GitHub → workflow
"Deploy" → **Run workflow**, escolhendo a branch/ref desejada (geralmente
`main`, depois de já mesclada — este projeto não faz deploy automático a
cada merge, é sempre um clique deliberado). O job builda backend+frontend
do zero num runner limpo (elimina por construção o risco de `.env.local`
contaminar o bundle — um checkout novo do GitHub nunca tem esse arquivo
git-ignored), roda lint/test/build, faz uma checagem anti-contaminação no
bundle final, envia os artefatos por SSH e executa o deploy na VM.

**Credencial usada — NÃO é a chave pessoal do operador
(`oracle-jan29.key`)**: existe um usuário Linux dedicado só para isso,
`deploy-financeiro`, com uma chave `ed25519` própria guardada como secret
do repositório (`DEPLOY_SSH_KEY`). Esse usuário **não tem sudo geral** —
só pode, via `/etc/sudoers.d/deploy-financeiro`, rodar como root um único
comando: `/bin/bash /tmp/sistema-financeiro-deploy-*/run-deploy.sh` (o
wrapper que o próprio workflow gera e envia a cada execução). Se o secret
do GitHub algum dia vazar, o dano fica contido a "redeployar esta app" —
não dá shell arbitrário nem acesso aos outros projetos que dividem a VM
(HubFlow, Running Insights, etc.). Ver `/etc/sudoers.d/deploy-financeiro`
na VM para o texto exato da regra.

**Diferença do fluxo manual da §17:** o healthcheck do próprio
`deploy/scripts/deploy.sh` já tem timeout generoso (300s — ver comentário
no script), então o workflow não deveria precisar do "conserto manual" de
`chown`/`nginx reload` que era necessário quando o script antigo (60s)
dava falso negativo — mas se algum dia isso acontecer de novo, os passos
manuais de recuperação são os mesmos descritos no histórico deste arquivo
antes desta seção existir: confirmar saúde via
`curl http://127.0.0.1:8084/actuator/health` na VM, depois `sudo chown
sistema-financeiro:sistema-financeiro /opt/sistema-financeiro/app.jar`,
`sudo chown -R ubuntu:ubuntu` no release do frontend, `sudo nginx -t &&
sudo systemctl reload nginx`.

**Rotação/revogação da chave de deploy:** gerar um novo par
(`ssh-keygen -t ed25519`), atualizar
`/home/deploy-financeiro/.ssh/authorized_keys` na VM com a nova chave
pública, atualizar o secret `DEPLOY_SSH_KEY` no GitHub
(`gh secret set DEPLOY_SSH_KEY < nova_chave_privada`), remover a entrada
antiga do `authorized_keys`.

## 18. Rollback

**Backend**: `cp /opt/sistema-financeiro/app.jar.previous /opt/sistema-financeiro/app.jar && sudo systemctl restart sistema-financeiro`.

**Frontend**: `ln -sfn /var/www/sistema-financeiro/releases/<release-anterior> /var/www/sistema-financeiro/current && sudo systemctl reload nginx`.

**Banco de dados**: migrations Flyway **não são automaticamente
reversíveis**. Se a versão com problema já rodou uma migration (nova
coluna, tabela, constraint), fazer rollback do JAR sozinho pode deixar o
código antigo rodando contra um schema mais novo — funciona só se a
migration for estritamente aditiva e compatível com o código anterior
(ex.: coluna nova nullable). Se não for esse o caso, a opção real é
restaurar um backup anterior à migration (§16) ou escrever uma migration
de correção — não existe um "desfazer" mágico, e este documento não finge
que existe.

## Consumo de memória

**Snapshot real observado (idle, via `systemctl status`), não medição
formal sob carga:** cgroup do `sistema-financeiro.service` em
`167.234.233.150` mostrando `Memory: 83.3M (peak: 323.0M swap: 268.9M
swap peak: 322.0M)` cerca de 20h após o start — o pico alto bate com o
warmup lento do primeiro start (ver nota de "Thread starvation" abaixo).
Isso não substitui o processo formal de ARCHITECTURE.md §12.2 (Native
Memory Tracking + RSS sob carga real gerada com `hey`/`k6`), que
continua pendente — é só um dado de referência a favor de manter o
`-Xmx256m` atual como razoável, não uma validação completa. O
`.service` usa o ponto de partida conservador já documentado em
ARCHITECTURE.md §12.1 (`-Xms64m -Xmx256m`, `SerialGC`, `MaxMetaspaceSize=128m`,
`ReservedCodeCacheSize=64m`, `Xss512k`) — são valores de partida
sugeridos, não medidos, pensados para uma VM pequena e compartilhada.
Antes de considerar esse `-Xmx` definitivo, seguir o processo de medição
de ARCHITECTURE.md §12.2 (Native Memory Tracking + RSS real sob carga) na
VM real e registrar o resultado no próprio ARCHITECTURE.md.

## Smoke test (rodar após cada deploy real)

### Funcional

```bash
curl -fsS https://SEU-DOMINIO-AQUI/                     # 200, HTML do frontend
curl -fsS https://SEU-DOMINIO-AQUI/actuator/health      # via proxy, se exposto (ver nginx.conf)
# UI: registrar usuário, login, criar conta/categoria/transação,
# dashboard atualiza, criar recorrência, orçamento, meta, abrir relatórios,
# exportar CSV, logout.
```

### Segurança

```bash
curl -I http://SEU-DOMINIO-AQUI/                        # 301 -> https
curl -i https://SEU-DOMINIO-AQUI/api/accounts            # 401 sem sessão
curl -i -X POST https://SEU-DOMINIO-AQUI/api/accounts \
  -H "Content-Type: application/json" -d '{}'            # sem cookie/CSRF -> 401/403, não 500

# Cookies: no DevTools do navegador, confirmar Secure + HttpOnly nos
# cookies de auth, e SameSite=Strict.

# Backend/Postgres não devem responder de fora da VM:
nc -zv SEU-IP-PUBLICO 8084   # deve falhar (connection refused/timeout)
nc -zv SEU-IP-PUBLICO 5432   # deve falhar
```

Só foi possível validar localmente, nesta sessão, o comportamento
equivalente contra o backend em `dev` (endpoint protegido sem sessão →
401; `/actuator/health` sem detalhes sensíveis) — os itens acima que
dependem de rede pública/HTTPS real ficam como checklist para o operador
rodar após o primeiro deploy de verdade.

## Troubleshooting

| Sintoma | Onde olhar |
|---|---|
| `502 Bad Gateway` no Nginx | Backend não subiu — `systemctl status sistema-financeiro`, `journalctl -u sistema-financeiro` |
| Backend não sobe | `journalctl -u sistema-financeiro -n 100` — geralmente `DB_URL`/`JWT_SECRET` ausente ou Postgres inacessível |
| `nginx -t` falha | Erro de sintaxe no `.conf` — a mensagem de erro já aponta a linha |
| Login funciona mas próxima requisição dá 401 | Cookies `Secure` sendo descartados por HTTP em vez de HTTPS — confirmar certificado válido |
| Rate limit disparando para todo mundo junto | `server.forward-headers-strategy`/`internal-proxies` não aplicado — confirmar perfil `prod` ativo (`SPRING_PROFILES_ACTIVE=prod` no `.service`) |
| Migration falhou no deploy | Backend fica `DOWN` no healthcheck — ver `journalctl`, corrigir a migration (nunca editar uma já aplicada) e re-deployar |
