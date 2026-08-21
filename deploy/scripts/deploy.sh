#!/usr/bin/env bash
#
# Deploy do sistema-financeiro: espera receber os artefatos JÁ construídos
# (JAR do backend + dist/ do frontend, buildados fora da VM — CI ou máquina
# local, ver ARCHITECTURE.md §14) e faz a troca em produção.
#
# NÃO builda nada aqui (evita gastar CPU/RAM da VM de produção com
# toolchain de build). NÃO apaga banco. NÃO faz `git reset` destrutivo.
# NÃO embute segredo — tudo sensível já está em /etc/sistema-financeiro/app.env.
#
# Uso:
#   BACKEND_JAR=/caminho/para/backend-0.0.1-SNAPSHOT.jar \
#   FRONTEND_DIST=/caminho/para/frontend/dist \
#   ./deploy.sh

set -euo pipefail

: "${BACKEND_JAR:?BACKEND_JAR é obrigatório (caminho do JAR já buildado)}"
: "${FRONTEND_DIST:?FRONTEND_DIST é obrigatório (caminho do dist/ já buildado)}"

APP_DIR="${APP_DIR:-/opt/sistema-financeiro}"
FRONTEND_BASE="${FRONTEND_BASE:-/var/www/sistema-financeiro}"
SERVICE_NAME="${SERVICE_NAME:-sistema-financeiro}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8084/actuator/health}"

if [ ! -f "$BACKEND_JAR" ]; then
  echo "[deploy] ERRO: JAR não encontrado: ${BACKEND_JAR}" >&2
  exit 1
fi
if [ ! -d "$FRONTEND_DIST" ]; then
  echo "[deploy] ERRO: diretório de dist não encontrado: ${FRONTEND_DIST}" >&2
  exit 1
fi

echo "[deploy] === backend ==="
if [ -f "$APP_DIR/app.jar" ]; then
  echo "[deploy] guardando JAR anterior como app.jar.previous (rollback manual)"
  cp -f "$APP_DIR/app.jar" "$APP_DIR/app.jar.previous"
fi
cp -f "$BACKEND_JAR" "$APP_DIR/app.jar.new"
mv -f "$APP_DIR/app.jar.new" "$APP_DIR/app.jar"

echo "[deploy] === frontend (deploy atômico) ==="
release_dir="$FRONTEND_BASE/releases/$(date -u +%Y%m%d-%H%M%S)"
mkdir -p "$release_dir"
cp -r "$FRONTEND_DIST"/. "$release_dir"/

previous_target="$(readlink -f "$FRONTEND_BASE/current" 2>/dev/null || true)"
# Symlink trocado atomicamente (ln -sfn + mv) — nunca existe um estado
# onde "current" aponta pra um diretório meio copiado.
ln -sfn "$release_dir" "$FRONTEND_BASE/current.new"
mv -Tf "$FRONTEND_BASE/current.new" "$FRONTEND_BASE/current"
echo "[deploy] frontend atual: $release_dir"

echo "[deploy] === restart backend ==="
sudo systemctl restart "$SERVICE_NAME"

echo "[deploy] === healthcheck ==="
healthy=false
for i in $(seq 1 30); do
  if curl -fsS "$HEALTH_URL" | grep -q '"status":"UP"'; then
    healthy=true
    break
  fi
  sleep 2
done

if [ "$healthy" != "true" ]; then
  echo "[deploy] ERRO: backend não respondeu saudável após o restart." >&2
  echo "[deploy] rollback manual: copiar ${APP_DIR}/app.jar.previous para ${APP_DIR}/app.jar e reiniciar o service." >&2
  if [ -n "$previous_target" ]; then
    echo "[deploy] rollback do frontend: ln -sfn '${previous_target}' '${FRONTEND_BASE}/current'" >&2
  fi
  exit 1
fi

echo "[deploy] === reload nginx ==="
sudo nginx -t
sudo systemctl reload nginx

echo "[deploy] concluído com sucesso."
echo "[deploy] rollback do backend, se precisar: cp ${APP_DIR}/app.jar.previous ${APP_DIR}/app.jar && sudo systemctl restart ${SERVICE_NAME}"
if [ -n "$previous_target" ]; then
  echo "[deploy] rollback do frontend, se precisar: ln -sfn '${previous_target}' '${FRONTEND_BASE}/current' && sudo systemctl reload nginx"
fi
echo "[deploy] LEMBRETE: se este deploy incluiu uma migration Flyway nova, rollback de aplicação NÃO desfaz o schema — ver DEPLOYMENT.md, seção Rollback."
