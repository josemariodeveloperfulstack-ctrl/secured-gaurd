#!/usr/bin/env bash
# Redeploy rápido do backend CI após fix de dependentes (JOIN FETCH + open-in-view=false).
# Executar na VPS: bash /var/www/secured_guard/ci/scripts/redeploy-ci-backend-dependents.sh

set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-/var/www/secured_guard/ci/docker-compose.ci.yml}"
IMAGE="${CI_BACKEND_IMAGE:-ghcr.io/zmarioramos/secured-guard-backend:ci}"
CONTAINER="${CI_BACKEND_CONTAINER:-secured-guard-backend-ci}"

echo "📥 Pull da imagem: ${IMAGE}"
docker pull "${IMAGE}"

echo "🔄 Recriando backend CI..."
docker-compose -f "${COMPOSE_FILE}" up -d --force-recreate --no-deps backend-ci

echo "⏳ Aguardando backend (até 120s)..."
for i in $(seq 1 24); do
  if docker inspect "${CONTAINER}" --format '{{.State.Health.Status}}' 2>/dev/null | grep -q healthy; then
    echo "✅ Backend healthy"
    exit 0
  fi
  if docker inspect "${CONTAINER}" --format '{{.State.Status}}' 2>/dev/null | grep -q exited; then
    echo "❌ Container parou. Últimos logs:"
    docker logs --tail 80 "${CONTAINER}" 2>&1 || true
    exit 1
  fi
  sleep 5
done

echo "⚠️ Healthcheck ainda não healthy. Logs:"
docker logs --tail 80 "${CONTAINER}" 2>&1 || true
exit 1
