#!/usr/bin/env bash
#
# Backup do PostgreSQL do sistema-financeiro via pg_dump. Não faz parte do
# build/deploy automático — é chamado por um timer/cron do operador
# (ver DEPLOYMENT.md, seção Backup). Lê credenciais só de variáveis de
# ambiente/EnvironmentFile — nunca aceita senha por argumento (apareceria em
# `ps`/histórico de shell).
#
# Uso:
#   DB_HOST=127.0.0.1 DB_PORT=5432 DB_NAME=sistema_financeiro \
#   DB_USERNAME=sistema_financeiro_app DB_PASSWORD=*** \
#   BACKUP_DIR=/var/backups/sistema-financeiro \
#   ./backup-db.sh
#
# Retenção: mantém os últimos KEEP_DAILY backups diários (default 7) —
# política simples e suficiente para o volume de dados desta aplicação;
# não há backup semanal/mensal separado porque, com KEEP_DAILY=7, a
# probabilidade de precisar restaurar algo com mais de uma semana sem
# perceber o problema antes é baixa o bastante para não justificar a
# complexidade extra de uma segunda política de retenção.

set -euo pipefail

: "${DB_HOST:?DB_HOST é obrigatório}"
: "${DB_PORT:?DB_PORT é obrigatório}"
: "${DB_NAME:?DB_NAME é obrigatório}"
: "${DB_USERNAME:?DB_USERNAME é obrigatório}"
: "${DB_PASSWORD:?DB_PASSWORD é obrigatório}"
: "${BACKUP_DIR:?BACKUP_DIR é obrigatório}"
KEEP_DAILY="${KEEP_DAILY:-7}"

mkdir -p "$BACKUP_DIR"

timestamp="$(date -u +%Y%m%d-%H%M%S)"
file="$BACKUP_DIR/${DB_NAME}-${timestamp}.sql.gz"
tmp_file="${file}.tmp"

export PGPASSWORD="$DB_PASSWORD"

echo "[backup-db] iniciando dump de ${DB_NAME}@${DB_HOST}:${DB_PORT} -> ${file}"

# --format=plain + gzip (em vez de --format=custom): restore com psql puro
# em qualquer lugar, sem depender de pg_restore/versão compatível — mais
# simples de auditar e de restaurar manualmente em uma emergência.
if ! pg_dump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USERNAME" \
    --dbname="$DB_NAME" \
    --format=plain \
    --no-owner \
    --no-privileges \
  | gzip > "$tmp_file"; then
  echo "[backup-db] ERRO: pg_dump falhou, removendo arquivo parcial" >&2
  rm -f "$tmp_file"
  exit 1
fi

mv "$tmp_file" "$file"
chmod 0600 "$file"

size="$(du -h "$file" | cut -f1)"
if [ ! -s "$file" ]; then
  echo "[backup-db] ERRO: arquivo de backup vazio: ${file}" >&2
  exit 1
fi
echo "[backup-db] backup concluído: ${file} (${size})"

# Retenção: apaga backups além dos KEEP_DAILY mais recentes deste banco.
mapfile -t old_backups < <(ls -1t "$BACKUP_DIR/${DB_NAME}-"*.sql.gz 2>/dev/null | tail -n +$((KEEP_DAILY + 1)))
if [ "${#old_backups[@]}" -gt 0 ]; then
  echo "[backup-db] removendo ${#old_backups[@]} backup(s) além da retenção (KEEP_DAILY=${KEEP_DAILY})"
  rm -f "${old_backups[@]}"
fi

echo "[backup-db] concluído."
