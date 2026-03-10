#!/bin/bash
# Diagnóstico e correção do erro 502 Bad Gateway em PROD
# Execute na VPS: ssh user@vps "cd /var/www/secured_guard/prod/deploy && bash /var/www/secured_guard/prod/scripts/diagnostico-502-prod.sh"
# Ou: scp scripts/diagnostico-502-prod.sh user@vps:/tmp/ && ssh user@vps "bash /tmp/diagnostico-502-prod.sh"

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[ERRO] $1${NC}"; }
warn() { echo -e "${YELLOW}[AVISO] $1${NC}"; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

DEPLOY_DIR="${DEPLOY_DIR:-/var/www/secured_guard/prod/deploy}"
SCRIPT_DIR="${SCRIPT_DIR:-/var/www/secured_guard/prod/scripts}"

echo ""
echo "=========================================="
echo "🔍 DIAGNÓSTICO 502 - PROD (securedguard.z7botsolutions.com.br)"
echo "=========================================="
echo ""

cd "$DEPLOY_DIR" 2>/dev/null || { error "Pasta $DEPLOY_DIR não encontrada. Execute na VPS."; exit 1; }

# 1. Status dos containers
log "1️⃣ Status dos containers PROD..."
docker-compose -f docker-compose.prod.yml ps 2>/dev/null || docker compose -f docker-compose.prod.yml ps 2>/dev/null || true
echo ""

# 2. Backend
log "2️⃣ Verificando backend (secured-guard-backend-prod)..."
BACKEND_STATE=$(docker inspect secured-guard-backend-prod --format '{{.State.Status}}' 2>/dev/null || echo "missing")
BACKEND_HEALTH=$(docker inspect secured-guard-backend-prod --format '{{.State.Health.Status}}' 2>/dev/null || echo "unknown")

if [ "$BACKEND_STATE" = "running" ]; then
  log "   Container: $BACKEND_STATE | Health: $BACKEND_HEALTH"
else
  error "   Backend NÃO está rodando! Estado: $BACKEND_STATE"
  warn "   Tentando iniciar backend..."
  docker-compose -f docker-compose.prod.yml up -d backend 2>/dev/null || docker compose -f docker-compose.prod.yml up -d backend 2>/dev/null || true
  sleep 20
fi
echo ""

# 3. Backend escutando na porta 8080 (interno)
log "3️⃣ Backend escutando na porta 8080..."
if docker exec secured-guard-backend-prod sh -c "curl -sf http://127.0.0.1:8080/api/health" 2>/dev/null | grep -q "status"; then
  log "   ✅ Backend responde em localhost:8080"
else
  error "   ❌ Backend NÃO responde em localhost:8080"
  log "   Últimos logs do backend:"
  docker logs --tail=40 secured-guard-backend-prod 2>&1 | tail -40
  echo ""
fi
echo ""

# 4. Teste no host (porta 8084)
log "4️⃣ Teste no host (localhost:8084)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:8084/api/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  log "   ✅ http://localhost:8084/api/health → $HTTP_CODE"
else
  error "   ❌ http://localhost:8084/api/health → $HTTP_CODE (esperado 200)"
fi
echo ""

# 5. Nginx -> Backend (conectividade interna)
log "5️⃣ Conectividade Nginx → Backend..."
if docker exec secured-guard-nginx-prod sh -c "curl -sf --max-time 5 http://backend:8080/api/health" 2>/dev/null | grep -q "status"; then
  log "   ✅ Nginx consegue conectar ao backend"
else
  error "   ❌ Nginx NÃO consegue conectar ao backend"
  warn "   Verificando rede Docker..."
  docker network inspect secured-guard 2>/dev/null | grep -A2 "backend\|nginx" || true
fi
echo ""

# 6. Nginx local (porta 8085)
log "6️⃣ Teste Nginx (localhost:8085)..."
NGINX_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:8085/api/health 2>/dev/null || echo "000")
if [ "$NGINX_CODE" = "200" ]; then
  log "   ✅ http://127.0.0.1:8085/api/health → $NGINX_CODE"
else
  error "   ❌ http://127.0.0.1:8085/api/health → $NGINX_CODE (502 = backend inacessível)"
  warn "   Reiniciando nginx..."
  docker restart secured-guard-nginx-prod 2>/dev/null || true
  sleep 5
  NGINX_CODE2=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:8085/api/health 2>/dev/null || echo "000")
  if [ "$NGINX_CODE2" = "200" ]; then
    log "   ✅ Após restart: $NGINX_CODE2"
  else
    error "   Ainda falha: $NGINX_CODE2"
  fi
fi
echo ""

# 7. Traefik
log "7️⃣ Traefik..."
if docker ps --filter 'name=traefik' --format '{{.Status}}' 2>/dev/null | grep -q "Up"; then
  log "   ✅ Traefik está rodando"
else
  warn "   Traefik não encontrado ou parado (pode causar 521 no Cloudflare)"
fi
echo ""

# 8. Erros nos logs
log "8️⃣ Erros recentes no backend..."
docker logs --tail=100 secured-guard-backend-prod 2>&1 | grep -i -E "(error|exception|failed|fatal|outofmemory)" | tail -15 || log "   Nenhum erro crítico encontrado"
echo ""

# 9. Ação corretiva se necessário
if [ "$NGINX_CODE" != "200" ] && [ "$HTTP_CODE" = "200" ]; then
  warn "Backend responde mas Nginx retorna 502. Reiniciando stack..."
  docker-compose -f docker-compose.prod.yml restart nginx 2>/dev/null || docker compose -f docker-compose.prod.yml restart nginx 2>/dev/null || true
  sleep 10
  docker restart traefik 2>/dev/null || true
  sleep 5
  log "Teste final: curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8085/api/health"
  curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:8085/api/health 2>/dev/null || true
fi

if [ "$BACKEND_STATE" != "running" ] || [ "$HTTP_CODE" != "200" ]; then
  warn "Backend com problema. Reiniciando backend..."
  docker restart secured-guard-backend-prod 2>/dev/null || true
  sleep 30
  log "Aguardando backend iniciar (30s)..."
  HTTP_CODE_FINAL=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 http://localhost:8084/api/health 2>/dev/null || echo "000")
  if [ "$HTTP_CODE_FINAL" = "200" ]; then
    log "   ✅ Backend voltou após restart"
    docker restart secured-guard-nginx-prod 2>/dev/null || true
    sleep 5
  else
    error "   Backend ainda não responde. Verifique os logs:"
    docker logs --tail=80 secured-guard-backend-prod 2>&1
  fi
fi

echo ""
echo "=========================================="
echo "📋 RESUMO"
echo "=========================================="
echo "  Backend (8084):  $(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://localhost:8084/api/health 2>/dev/null || echo '?')"
echo "  Nginx (8085):    $(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://127.0.0.1:8085/api/health 2>/dev/null || echo '?')"
echo ""
echo "💡 Se localhost:8085 retorna 200 mas o site continua 502:"
echo "   - Verifique Traefik e rede z7network"
echo "   - Execute: bash fix-404-prod.sh"
echo ""
echo "💡 Se o backend não inicia, verifique:"
echo "   - docker logs secured-guard-backend-prod"
echo "   - Postgres: docker exec secured-guard-db-prod pg_isready -U postgres"
echo "   - Redis: docker exec secured-guard-redis-prod redis-cli -a \$REDIS_PASSWORD_PROD ping"
echo ""
