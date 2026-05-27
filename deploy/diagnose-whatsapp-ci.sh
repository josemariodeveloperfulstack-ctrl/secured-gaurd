#!/bin/bash

# Script para diagnosticar problemas do WhatsApp no ambiente CI
# Execute na VPS: bash deploy/diagnose-whatsapp-ci.sh

echo "🔍 Diagnóstico do WhatsApp no ambiente CI"
echo "=========================================="
echo ""

# 1. Verificar se os containers estão rodando
echo "1️⃣ Verificando containers Docker (Evolution + Baileys)..."
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E 'evolution-api-ci|whatsapp' || echo "❌ Containers WhatsApp não encontrados"
echo ""

# 2. Verificar logs do container
echo "2️⃣ Últimas 20 linhas dos logs do WhatsApp:"
docker logs secured-guard-whatsapp-ci --tail 20 2>&1 || echo "❌ Não foi possível ler logs"
echo ""

# 3. Verificar se o container está na rede correta
echo "3️⃣ Verificando redes Docker..."
docker network inspect secured-guard-ci-network | grep whatsapp || echo "⚠️ Container pode não estar na rede"
docker network inspect z7network | grep whatsapp || echo "⚠️ Container pode não estar na rede z7network"
echo ""

# 4. Testar conectividade do backend para o WhatsApp
echo "4️⃣ Testando conectividade do backend para o WhatsApp..."
docker exec secured-guard-backend-ci curl -f http://whatsapp-service-ci:3333/health || echo "❌ Backend não consegue acessar WhatsApp"
echo ""

# 5. Variáveis do agente WhatsApp no backend
echo "5️⃣ Variáveis do agente WhatsApp no backend:"
docker exec secured-guard-backend-ci env 2>/dev/null | grep -E '^(WHATSAPP_|UAZAPI_|ZAPI_|EVOLUTION_|BAILEYS_)' || echo "⚠️ Variáveis do agente não encontradas"
echo ""

# 5b. Status do agente via API
echo "5b️⃣ Status do agente (API interna):"
docker exec secured-guard-backend-ci curl -sf http://localhost:8080/api/whatsapp/agent/status 2>/dev/null | head -c 2000 || \
  curl -sf http://localhost:8081/api/whatsapp/agent/status 2>/dev/null | head -c 2000 || \
  echo "⚠️ Não foi possível consultar /api/whatsapp/agent/status"
echo ""

# 5c. Evolution API
echo "5c️⃣ Evolution API (rede interna):"
docker exec secured-guard-backend-ci curl -sf -H "apikey: ${EVOLUTION_API_KEY:-B6D711FCDE4D4FD5936544120E713976}" \
  http://evolution-api-ci:8080/instance/connectionState/securedguard 2>/dev/null || \
  echo "⚠️ Evolution não respondeu"
echo ""

# 6. Verificar health check do WhatsApp
echo "6️⃣ Health check do serviço WhatsApp:"
docker exec secured-guard-whatsapp-ci curl -f http://localhost:3333/health || echo "❌ Health check falhou"
echo ""

# 7. Verificar se o serviço está escutando na porta correta
echo "7️⃣ Verificando portas abertas no container WhatsApp:"
docker exec secured-guard-whatsapp-ci netstat -tlnp 2>/dev/null | grep 3333 || docker exec secured-guard-whatsapp-ci ss -tlnp 2>/dev/null | grep 3333 || echo "⚠️ Porta 3333 não encontrada"
echo ""

# 8. Verificar configuração do docker-compose
echo "8️⃣ Verificando configuração do docker-compose.ci.yml:"
grep -A 10 "whatsapp-service-ci" docker-compose.ci.yml | head -15
echo ""

echo "✅ Diagnóstico concluído!"
echo ""
echo "💡 Próximos passos:"
echo "   - Configurar .env: bash deploy/configure-whatsapp-agent.sh"
echo "   - Subir serviços: docker compose -f docker-compose.ci.yml up -d evolution-api-ci whatsapp-service-ci backend-ci"
echo "   - Painel: https://ci.z7botsolutions.com.br → Conexão WhatsApp"
echo "   - API: curl https://ci.z7botsolutions.com.br/api/whatsapp/agent/status"
