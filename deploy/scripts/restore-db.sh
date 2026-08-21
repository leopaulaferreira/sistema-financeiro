#!/usr/bin/env bash
#
# Restore de um backup gerado por backup-db.sh. Deliberadamente NÃO é
# automático: exige o caminho do arquivo explícito e uma confirmação, para
# que rodar este script por engano (ex.: copiar/colar o comando errado)
# não sobrescreva um banco em uso sem querer.
#
# Uso:
#   DB_HOST=127.0.0.1 DB_PORT=5432 DB_NAME=sistema_financeiro_restore_test \
#   DB_USERNAME=sistema_financeiro_app DB_PASSWORD=*** \
#   ./restore-db.sh /var/backups/sistema-financeiro/sistema_financeiro-20260101-030000.sql.gz
#
# Para restaurar por cima de um banco existente, apagar/recriar o database
# ANTES de chamar este script (ele só executa o dump contra um banco vazio
# — não faz DROP/CREATE DATABASE sozinho, isso é uma decisão consciente do
# operador, não deste script). Rodar sempre primeiro contra um banco
# temporário para validar o backup (ver DEPLOYMENT.md, seção Restore).

set -euo pipefail

: "${DB_HOST:?DB_HOST é obrigatório}"
: "${DB_PORT:?DB_PORT é obrigatório}"
: "${DB_NAME:?DB_NAME é obrigatório}"
: "${DB_USERNAME:?DB_USERNAME é obrigatório}"
: "${DB_PASSWORD:?DB_PASSWORD é obrigatório}"

backup_file="${1:-}"
if [ -z "$backup_file" ]; then
  echo "Uso: $0 <caminho-do-backup.sql.gz>" >&2
  exit 1
fi
if [ ! -f "$backup_file" ]; then
  echo "[restore-db] ERRO: arquivo não encontrado: ${backup_file}" >&2
  exit 1
fi

if [ "${CONFIRM_RESTORE:-}" != "yes" ]; then
  echo "[restore-db] Isto vai executar ${backup_file} contra o banco '${DB_NAME}' em ${DB_HOST}:${DB_PORT}." >&2
  echo "[restore-db] Rode de novo com CONFIRM_RESTORE=yes para confirmar." >&2
  exit 1
fi

export PGPASSWORD="$DB_PASSWORD"

echo "[restore-db] restaurando ${backup_file} -> ${DB_NAME}@${DB_HOST}:${DB_PORT}"

gunzip -c "$backup_file" | psql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USERNAME" \
  --dbname="$DB_NAME" \
  --set ON_ERROR_STOP=on \
  --quiet

echo "[restore-db] concluído."
