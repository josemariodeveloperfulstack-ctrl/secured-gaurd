#!/bin/bash
# Sobe o stack PROD na VPS (Contabo). Use docker-compose (v1), não "docker compose".
# Uso: cd /var/www/secured_guard/prod/deploy && bash /var/www/secured_guard/prod/scripts/bootstrap-prod-vps.sh

set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/var/www/secured_guard/prod/deploy}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
else
  DC="docker-compose"
fi

echo "🔧 Compose: $DC"
cd "$DEPLOY_DIR"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "❌ $DEPLOY_DIR/$COMPOSE_FILE não encontrado"
  exit 1
fi

if [ ! -f .env ]; then
  echo "❌ Arquivo .env ausente em $DEPLOY_DIR"
  echo "   O deploy GitHub Actions cria .env; copie de backup ou rode o workflow deploy-prod-docker."
  exit 1
fi

mkdir -p ../backend/src/main/resources/db/migration ../backend/holerites

echo "🌐 Redes Docker..."
docker network create secured-guard 2>/dev/null || true
docker network create z7network 2>/dev/null || true

if ! docker ps --format '{{.Names}}' | grep -q '^traefik$'; then
  echo "⚠️ Traefik não está rodando. Suba em /var/www/secured_guard com docker-compose.traefik.yml"
fi

echo "📥 Pull imagens (Docker Hub)..."
for img in z7design/secured-guard-backend:prod z7design/secured-guard-frontend:prod z7design/secured-guard-whatsapp:prod; do
  for i in 1 2 3; do
    docker pull "$img" && break
    echo "⚠️ Pull $img falhou ($i/3), aguardando 10s..."
    sleep 10
    [ "$i" -eq 3 ] && { echo "❌ Falha ao puxar $img"; exit 1; }
  done
done

echo "🔧 Flyway repair (se postgres já existir)..."
if docker ps --format '{{.Names}}' | grep -q '^secured-guard-db-prod$'; then
  docker exec -i secured-guard-db-prod psql -U postgres -d secured_guard_prod -c \
    "DELETE FROM flyway_schema_history WHERE success = false;" 2>/dev/null || true
fi

echo "🚀 Subindo PROD (postgres/redis primeiro)..."
$DC -f "$COMPOSE_FILE" up -d postgres redis
for i in $(seq 1 24); do
  docker exec secured-guard-db-prod pg_isready -U postgres -d secured_guard_prod 2>/dev/null && break
  sleep 5
done

echo "🚀 Subindo backend, frontend, whatsapp..."
$DC -f "$COMPOSE_FILE" up -d backend frontend whatsapp-service

echo "⏳ Aguardando backend healthy (até 5 min)..."
for i in $(seq 1 60); do
  H=$(docker inspect secured-guard-backend-prod --format '{{.State.Health.Status}}' 2>/dev/null || echo "missing")
  C=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:8084/api/health 2>/dev/null || echo "000")
  [ "$C" = "200" ] && echo "✅ Backend OK ($H)" && break
  [ "$i" -eq 60 ] && echo "⚠️ Backend ainda não healthy — rode: bash ../scripts/fix-backend-prod-unhealthy.sh"
  sleep 5
done

echo "🚀 Subindo nginx..."
$DC -f "$COMPOSE_FILE" up -d nginx

echo "⏳ Aguardando postgres..."
for i in $(seq 1 24); do
  if docker exec secured-guard-db-prod pg_isready -U postgres -d secured_guard_prod 2>/dev/null; then
    echo "✅ Postgres pronto"
    break
  fi
  [ "$i" -eq 24 ] && echo "⚠️ Timeout postgres (continuando...)"
  sleep 5
done

echo "📋 Containers PROD:"
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E 'prod|traefik' || true

echo "🏥 Health nginx (8085):"
curl -s -o /dev/null -w "HTTP %{http_code}\n" --max-time 10 http://localhost:8085/health || true

echo "🏥 Health backend (8084):"
curl -s -o /dev/null -w "HTTP %{http_code}\n" --max-time 10 http://localhost:8084/api/health || true

echo "✅ Bootstrap concluído. Teste: curl -I https://portal.promovervigilancia.com.br/api/health"
