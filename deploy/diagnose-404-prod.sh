#!/bin/bash
# Diagnóstico 404 em PROD - executar NO SERVIDOR (SSH)
# Uso: bash deploy/diagnose-404-prod.sh   (a partir de /var/www/secured_guard/prod ou do repo)

set -e
cd "$(dirname "$0")/.." 2>/dev/null || true
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/secured_guard/prod/deploy}"
cd "$DEPLOY_DIR" 2>/dev/null || true

echo "=========================================="
echo "🔍 Diagnóstico 404 - Secured Guard PROD"
echo "=========================================="
echo ""

echo "1️⃣ Containers (todos devem estar Up):"
docker-compose -f docker-compose.prod.yml ps -a 2>/dev/null || docker compose -f docker-compose.prod.yml ps -a
echo ""

echo "2️⃣ Teste direto ao nginx na porta 8085 (deve retornar 200):"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:8085/ 2>/dev/null || echo "erro")
if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ HTTP $HTTP_CODE - Nginx e frontend respondem. O 404 vem de ANTES do nginx (Traefik/Cloudflare)."
else
  echo "   ❌ HTTP $HTTP_CODE - Problema no nginx ou frontend. Verifique logs: docker logs secured-guard-nginx-prod"
fi
echo ""

echo "3️⃣ Teste ao frontend (dentro da rede Docker):"
docker exec secured-guard-nginx-prod curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://secured-guard-frontend-prod:80/ 2>/dev/null && echo "   ✅ Frontend responde 200" || echo "   ❌ Frontend não responde"
echo ""

echo "4️⃣ Configuração do nginx (sem resolver dentro de upstream):"
grep -A2 "upstream backend_prod" nginx/nginx-prod.conf 2>/dev/null || true
echo ""

echo "5️⃣ Se o passo 2 retornou 200 mas o site em https:// continua 404:"
echo "   - O tráfego HTTPS passa por Traefik ou Cloudflare."
echo "   - Traefik: confirme que está na rede 'z7network' e que o router 'secured-guard-prod-https' existe."
echo "   - Cloudflare: em DNS, o proxy (nuvem laranja) aponta para o IP do VPS; em SSL/TLS, modo 'Full' ou 'Full (strict)'."
echo "   - No VPS, quem escuta na porta 443? (Traefik ou outro proxy) Esse serviço deve encaminhar para o container nginx (porta 80 interna ou 8085 no host)."
echo ""

echo "6️⃣ Reiniciar nginx após alterar config:"
echo "   docker exec secured-guard-nginx-prod nginx -t && docker restart secured-guard-nginx-prod"
echo ""
