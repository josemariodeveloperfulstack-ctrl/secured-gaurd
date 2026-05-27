#!/bin/bash
# Configura o agente WhatsApp (UAZAPI, Z-API, Evolution, Baileys) no .env do CI/VPS.
# Uso na VPS: cd /var/www/secured_guard/ci && bash deploy/configure-whatsapp-agent.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENV_FILE="${1:-.env}"
COMPOSE_FILE="${2:-docker-compose.ci.yml}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Arquivo $ENV_FILE não encontrado. Execute a partir de /var/www/secured_guard/ci"
  exit 1
fi

backup() {
  cp "$ENV_FILE" "/tmp/.env.backup.whatsapp.$(date +%Y%m%d_%H%M%S)"
  echo -e "${GREEN}Backup do .env criado em /tmp${NC}"
}

set_var() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

echo -e "${GREEN}Configurando agente WhatsApp em ${ENV_FILE}...${NC}"
backup

# Ordem de fallback (ajuste conforme sua prioridade)
set_var "WHATSAPP_PROVIDER_ORDER" "${WHATSAPP_PROVIDER_ORDER:-evolution,uazapi,zapi,baileys}"

# Evolution (padrão CI — container na rede Docker)
set_var "EVOLUTION_API_ENABLED" "${EVOLUTION_API_ENABLED:-true}"
set_var "EVOLUTION_API_URL" "${EVOLUTION_API_URL:-http://evolution-api-ci:8080}"
set_var "EVOLUTION_API_KEY" "${EVOLUTION_API_KEY:-B6D711FCDE4D4FD5936544120E713976}"
set_var "EVOLUTION_API_INSTANCE" "${EVOLUTION_API_INSTANCE:-securedguard}"

# UAZAPI — preencha no Portainer ou exporte antes de rodar o script
set_var "UAZAPI_ENABLED" "${UAZAPI_ENABLED:-false}"
set_var "UAZAPI_BASE_URL" "${UAZAPI_BASE_URL:-}"
set_var "UAZAPI_INSTANCE_TOKEN" "${UAZAPI_INSTANCE_TOKEN:-}"

# Z-API
set_var "ZAPI_ENABLED" "${ZAPI_ENABLED:-false}"
set_var "ZAPI_BASE_URL" "${ZAPI_BASE_URL:-https://api.z-api.io}"
set_var "ZAPI_INSTANCE_ID" "${ZAPI_INSTANCE_ID:-}"
set_var "ZAPI_INSTANCE_TOKEN" "${ZAPI_INSTANCE_TOKEN:-}"
set_var "ZAPI_CLIENT_TOKEN" "${ZAPI_CLIENT_TOKEN:-}"

# Baileys (fallback local)
set_var "BAILEYS_REST_URL" "${BAILEYS_REST_URL:-http://whatsapp-service-ci:3333}"
set_var "BAILEYS_ENABLED" "${BAILEYS_ENABLED:-true}"
set_var "BAILEYS_INSTANCE_KEY" "${BAILEYS_INSTANCE_KEY:-securedguard_ci}"

echo ""
echo -e "${GREEN}Variáveis WhatsApp no .env:${NC}"
grep -E '^(WHATSAPP_|UAZAPI_|ZAPI_|EVOLUTION_|BAILEYS_)' "$ENV_FILE" || true

echo ""
echo -e "${YELLOW}Reiniciando backend e Evolution...${NC}"
docker compose -f "$COMPOSE_FILE" up -d evolution-api-ci backend-ci 2>/dev/null \
  || docker-compose -f "$COMPOSE_FILE" up -d evolution-api-ci backend-ci

echo ""
echo -e "${GREEN}Teste do agente:${NC}"
echo "  curl -s https://ci.z7botsolutions.com.br/api/whatsapp/agent/status | jq ."
echo ""
echo -e "${YELLOW}Para ativar UAZAPI na VPS:${NC}"
echo "  export UAZAPI_ENABLED=true"
echo "  export UAZAPI_BASE_URL=https://sua-instancia.uazapi.com"
echo "  export UAZAPI_INSTANCE_TOKEN=seu-token"
echo "  export WHATSAPP_PROVIDER_ORDER=uazapi,zapi,evolution,baileys"
echo "  bash deploy/configure-whatsapp-agent.sh"
