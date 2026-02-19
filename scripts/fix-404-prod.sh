#!/bin/bash
# Script para corrigir 404 externo no ambiente PROD (Cloudflare/Traefik)
# Executar na VPS: cd /var/www/secured_guard/prod/deploy && bash ../../scripts/fix-404-prod.sh

set -e
set +e  # Permitir diagnóstico mesmo com falhas

PROD_HOST="securedguard.z7botsolutions.com.br"
NGINX_CONTAINER="secured-guard-nginx-prod"

echo "🔧 Corrigindo 404 externo PROD (Traefik/Cloudflare)..."
echo ""

# 1. Verificar se Traefik está rodando
echo "1️⃣ Verificando Traefik..."
if ! docker ps | grep -q "traefik"; then
  echo "❌ Traefik não está rodando!"
  echo "   Inicie o Traefik: cd /var/www/secured_guard && docker-compose -f docker-compose.traefik.yml up -d"
  exit 1
else
  echo "✅ Traefik está rodando"
fi

# 2. Verificar se Nginx PROD está rodando
echo ""
echo "2️⃣ Verificando Nginx PROD..."
if ! docker ps | grep -q "$NGINX_CONTAINER"; then
  echo "❌ Nginx PROD não está rodando!"
  echo "   Iniciando: cd /var/www/secured_guard/prod/deploy && docker-compose -f docker-compose.prod.yml up -d nginx"
  cd /var/www/secured_guard/prod/deploy 2>/dev/null && docker-compose -f docker-compose.prod.yml up -d nginx
  sleep 5
else
  echo "✅ Nginx PROD está rodando"
fi

# 3. Conectar Nginx à rede z7network (necessário para Traefik)
echo ""
echo "3️⃣ Verificando rede z7network..."
if docker inspect "$NGINX_CONTAINER" 2>/dev/null | grep -q "z7network"; then
  echo "✅ Nginx já está na rede z7network"
else
  echo "   Conectando Nginx à rede z7network..."
  docker network connect z7network "$NGINX_CONTAINER" 2>/dev/null || echo "   ⚠️ Pode já estar conectado ou rede não existe"
  sleep 2
  if docker inspect "$NGINX_CONTAINER" 2>/dev/null | grep -q "z7network"; then
    echo "✅ Nginx conectado à z7network"
  else
    echo "⚠️ Nginx pode não estar na z7network - Traefik precisa ver o container"
  fi
fi

# 4. Testar conectividade Traefik → Nginx (via /api/health)
echo ""
echo "4️⃣ Testando Traefik → Nginx..."
if docker exec traefik wget -qO- --timeout=5 "http://${NGINX_CONTAINER}:80/api/health" 2>/dev/null | grep -qE '"(status|database|application)"'; then
  echo "✅ Traefik consegue acessar Nginx em /api/health"
else
  echo "❌ Traefik NÃO consegue acessar Nginx!"
  echo "   Redes Traefik: $(docker inspect traefik 2>/dev/null | jq -r '.[0].NetworkSettings.Networks | keys[]' 2>/dev/null || echo '?')"
  echo "   Redes Nginx:   $(docker inspect $NGINX_CONTAINER 2>/dev/null | jq -r '.[0].NetworkSettings.Networks | keys[]' 2>/dev/null || echo '?')"
  echo "   Ambos precisam estar na z7network."
fi

# 5. Reiniciar Traefik para redetectar containers
echo ""
echo "5️⃣ Reiniciando Traefik..."
docker restart traefik 2>/dev/null && echo "   Aguardando 15s..." && sleep 15 || echo "   ⚠️ Não foi possível reiniciar Traefik"

# 6. Verificar routers PROD no Traefik
echo ""
echo "6️⃣ Verificando routers PROD no Traefik..."
ROUTERS=$(docker exec traefik wget -qO- http://localhost:8080/api/http/routers 2>/dev/null || echo "[]")
if echo "$ROUTERS" | grep -q "prod-https@file"; then
  echo "✅ Router prod-https@file encontrado (config dinâmica)"
elif echo "$ROUTERS" | grep -q "secured-guard-prod"; then
  echo "✅ Router secured-guard-prod encontrado (Docker labels)"
else
  echo "⚠️ Router PROD não encontrado. Routers disponíveis:"
  echo "$ROUTERS" | jq -r '.[].name' 2>/dev/null | grep -E "prod|secured" || echo "$ROUTERS"
fi

# Verificar se arquivo de config dinâmica existe
echo ""
echo "6️⃣.1 Verificando config dinâmica Traefik..."
if [ -f "/var/www/secured_guard/traefik/dynamic/prod.yml" ]; then
  echo "✅ Arquivo prod.yml existe"
  echo "   URL configurada: $(grep -A 1 'servers:' /var/www/secured_guard/traefik/dynamic/prod.yml | grep 'url:' | awk '{print $2}' | tr -d '"')"
else
  echo "❌ Arquivo prod.yml NÃO existe em /var/www/secured_guard/traefik/dynamic/"
  echo "   Execute: scp traefik-dynamic-prod.yml root@VPS:/var/www/secured_guard/traefik/dynamic/prod.yml"
fi

# 7. Teste local (simulando Cloudflare)
echo ""
echo "7️⃣ Testando acesso (Host: $PROD_HOST)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -k -H "Host: $PROD_HOST" https://localhost/api/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Acesso local OK (HTTP 200)"
else
  HTTP_CODE_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: $PROD_HOST" http://localhost/api/health 2>/dev/null || echo "000")
  echo "   HTTPS: $HTTP_CODE | HTTP: $HTTP_CODE_HTTP"
fi

# 8. Teste externo (via Cloudflare)
echo ""
echo "8️⃣ Testando acesso externo (Cloudflare)..."
EXT_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://${PROD_HOST}/api/health" 2>/dev/null || echo "000")
if [ "$EXT_CODE" = "200" ]; then
  echo "✅ Acesso externo OK (HTTP 200)"
else
  echo "⚠️ Externo retornou HTTP $EXT_CODE (esperado: 200)"
  echo ""
  echo "💡 Se interno=200 mas externo=404:"
  echo "   - Cloudflare: verificar DNS (proxied/laranja) e Page Rules"
  echo "   - Traefik: verificar se entrypoint websecure está exposto na porta 443"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Correção concluída. Ver deploy/CLOUDFLARE_TRAEFIK_PROD.md para mais detalhes."
echo ""
