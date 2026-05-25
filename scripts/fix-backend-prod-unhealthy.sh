#!/bin/bash
# Corrige backend PROD unhealthy (Flyway / startup lento).
# Uso: bash /var/www/secured_guard/prod/scripts/fix-backend-prod-unhealthy.sh

set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/var/www/secured_guard/prod/deploy}"
CONTAINER_DB="${CONTAINER_DB:-secured-guard-db-prod}"
CONTAINER_BACKEND="${CONTAINER_BACKEND:-secured-guard-backend-prod}"

if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
else
  DC="docker-compose"
fi

echo "=========================================="
echo "🔧 FIX: backend PROD unhealthy"
echo "=========================================="

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_DB}$"; then
  echo "❌ Postgres ${CONTAINER_DB} não está rodando."
  echo "   cd ${DEPLOY_DIR} && docker-compose -f docker-compose.prod.yml up -d postgres redis"
  exit 1
fi

echo "📋 Últimos logs do backend (antes do fix):"
docker logs --tail 60 "${CONTAINER_BACKEND}" 2>&1 || echo "(container não existe ou parado)"
echo ""

echo "🔧 Flyway repair no banco secured_guard_prod..."
docker exec -i "${CONTAINER_DB}" psql -U postgres -d secured_guard_prod <<'SQL'
DELETE FROM flyway_schema_history WHERE success = false;
DELETE FROM flyway_schema_history WHERE version IN ('424','425','426','427','429') AND success = false;
UPDATE flyway_schema_history SET checksum = 318441356 WHERE version = '424';
UPDATE flyway_schema_history SET checksum = -1437677079 WHERE version = '427';
UPDATE flyway_schema_history SET checksum = -1673547286 WHERE version = '429';
SQL

echo "🔄 Reiniciando backend..."
docker restart "${CONTAINER_BACKEND}" 2>/dev/null || {
  cd "${DEPLOY_DIR}"
  $DC -f docker-compose.prod.yml up -d backend
}

echo "⏳ Aguardando backend (até 4 min)..."
for i in $(seq 1 48); do
  STATE=$(docker inspect "${CONTAINER_BACKEND}" --format '{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:8084/api/health 2>/dev/null || echo "000")
  echo "   [$i/48] health=${STATE} http=${HTTP}"
  if [ "$HTTP" = "200" ]; then
    echo "✅ Backend respondendo em :8084"
    break
  fi
  if [ "$i" -eq 48 ]; then
    echo "❌ Timeout. Logs:"
    docker logs --tail 100 "${CONTAINER_BACKEND}" 2>&1
    exit 1
  fi
  sleep 5
done

echo "🚀 Subindo nginx (depende do backend healthy)..."
cd "${DEPLOY_DIR}"
$DC -f docker-compose.prod.yml up -d nginx

echo "🏥 Testes:"
curl -s -o /dev/null -w "  backend :8084 → %{http_code}\n" http://localhost:8084/api/health || true
curl -s -o /dev/null -w "  nginx   :8085 → %{http_code}\n" http://127.0.0.1:8085/api/health || true
echo "✅ Concluído."
