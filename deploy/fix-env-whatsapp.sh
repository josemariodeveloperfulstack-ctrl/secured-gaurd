#!/bin/bash

# Script para corrigir a URL do WhatsApp no .env
# Execute na VPS: bash deploy/fix-env-whatsapp.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🔧 Corrigindo URL do WhatsApp no .env...${NC}"
echo ""

# Navegar para o diretório correto
cd /var/www/secured_guard/ci

# Fazer backup do .env
if [ -f ".env" ]; then
    echo -e "${GREEN}💾 Fazendo backup do .env...${NC}"
    cp .env /tmp/.env.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backup criado"
fi

# Delegar para script completo do agente WhatsApp
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "${SCRIPT_DIR}/configure-whatsapp-agent.sh" ]; then
    bash "${SCRIPT_DIR}/configure-whatsapp-agent.sh" .env docker-compose.ci.yml
else
    echo -e "${YELLOW}🔄 Corrigindo BAILEYS_REST_URL (modo legado)...${NC}"
    if grep -q "BAILEYS_REST_URL=" .env; then
        sed -i 's|BAILEYS_REST_URL=.*|BAILEYS_REST_URL=http://whatsapp-service-ci:3333|' .env
    else
        echo "BAILEYS_REST_URL=http://whatsapp-service-ci:3333" >> .env
    fi
    grep -E "BAILEYS_|WHATSAPP_|EVOLUTION_|UAZAPI_|ZAPI_" .env || grep -E "BAILEYS_" .env
    echo "   docker-compose -f docker-compose.ci.yml restart backend-ci"
fi
