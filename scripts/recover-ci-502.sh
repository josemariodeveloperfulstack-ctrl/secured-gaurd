#!/bin/bash
# Script de recuperação para CI com erro 502/521 (Cloudflare)
# Execute na VPS via SSH:
#
#   ssh user@vps-host
#   cd /var/www/secured_guard/ci
#   bash -c "$(curl -sSL https://raw.githubusercontent.com/.../recover-ci-502.sh)" 
#   # OU copie o script e execute:
#   chmod +x scripts/recover-ci-502.sh
#   ./scripts/recover-ci-502.sh
#
set -e

echo "🔧 Recuperação CI - Erro 502/521"
echo "================================"

cd /var/www/secured_guard/ci || { echo "❌ Diretório CI não encontrado"; exit 1; }

# 1. Verificar status dos containers
echo ""
echo "📋 1. Status dos containers:"
docker-compose -f docker-compose.ci.yml ps 2>&1 || true

# 2. Verificar Traefik (causa comum do 521)
echo ""
echo "📋 2. Verificando Traefik:"
if docker ps | grep -q traefik; then
    echo "✅ Traefik está rodando"
else
    echo "❌ Traefik NÃO está rodando - iniciando..."
    cd /var/www/secured_guard
    docker-compose -f docker-compose.traefik.yml up -d 2>&1 || true
    cd /var/www/secured_guard/ci
    sleep 5
fi

# 3. Verificar backend
echo ""
echo "📋 3. Logs do backend (últimas 50 linhas):"
docker logs --tail 50 secured-guard-backend-ci 2>&1 || echo "Container não encontrado"

# 4. Se backend crashou por Flyway, reparar
echo ""
echo "📋 4. Verificando migrações Flyway com falha:"
docker exec secured-guard-db-ci psql -U secured_guard_ci -d secured_guard_ci -t -c "
  SELECT version, description, success FROM flyway_schema_history 
  WHERE success = false ORDER BY installed_rank DESC LIMIT 10;
" 2>/dev/null || echo "Não foi possível consultar Flyway"

# 5. Remover migrações falhas e reiniciar
echo ""
echo "📋 5. Removendo registros de migrações falhas (V424-V452)..."
docker exec secured-guard-db-ci psql -U secured_guard_ci -d secured_guard_ci -c "
  DELETE FROM flyway_schema_history WHERE success = false;
  UPDATE flyway_schema_history SET checksum = 318441356 WHERE version = '424';
  UPDATE flyway_schema_history SET checksum = -1437677079 WHERE version = '427';
  SELECT version, success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;
" 2>/dev/null || true

# 6. Reiniciar backend
echo ""
echo "📋 6. Reiniciando backend..."
docker restart secured-guard-backend-ci 2>/dev/null || docker-compose -f docker-compose.ci.yml up -d backend-ci --force-recreate

# 7. Aguardar e testar
echo ""
echo "⏳ Aguardando 60s para backend inicializar..."
sleep 60

echo ""
echo "📋 7. Testando conectividade:"
echo "   Backend (localhost:8081): $(curl -s -o /dev/null -w '%{http_code}' http://localhost:8081/api/health 2>/dev/null || echo 'N/A')"
echo "   Nginx (localhost:8082):   $(curl -s -o /dev/null -w '%{http_code}' http://localhost:8082/api/health 2>/dev/null || echo 'N/A')"
echo "   Externo (Cloudflare):     $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://ci.z7botsolutions.com.br/api/health 2>/dev/null || echo 'N/A')"

echo ""
echo "✅ Recuperação concluída. Se ainda houver 502/521:"
echo "   - Verifique os logs: docker logs -f secured-guard-backend-ci"
echo "   - Verifique o Traefik: docker logs -f traefik"
echo "   - Aguarde mais 2-3 min (Flyway pode demorar)"
