#!/usr/bin/env bash
# ============================================================
# CORRIGIR CERTIFICADO TLS DE PRODUÇÃO (Let's Encrypt STAGING -> PRODUCTION)
# ============================================================
# Sintoma: browser mostra "Sua conexão não é particular"
#          NET::ERR_CERT_AUTHORITY_INVALID
# Causa:   Traefik configurado com acme.caserver de staging;
#          o certificado emitido por staging não é confiável.
#
# Executar no VPS:
#   chmod +x /var/www/secured_guard/prod/scripts/fix-prod-ssl-staging.sh
#   bash /var/www/secured_guard/prod/scripts/fix-prod-ssl-staging.sh
# ============================================================
set -euo pipefail

BASE_DIR="/var/www/secured_guard"
COMPOSE_FILE="$BASE_DIR/docker-compose.traefik.yml"
ACME_FILE="$BASE_DIR/traefik/letsencrypt/acme.json"
HOST_NAME="portal.promovervigilancia.com.br"
STAMP="$(date +%Y%m%d%H%M%S)"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "❌ $COMPOSE_FILE não encontrado"
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
else
  DC="docker-compose"
fi

# 1. Remover ACME de staging da configuração do Traefik
STAGING_FOUND=0
if grep -q 'acme-staging' "$COMPOSE_FILE"; then
  cp "$COMPOSE_FILE" "${COMPOSE_FILE}.staging.bak-${STAMP}"
  sed -i '/acme-staging-v02\.api\.letsencrypt\.org\/directory/d' "$COMPOSE_FILE"
  STAGING_FOUND=1
  echo "✅ ACME de staging removido de $COMPOSE_FILE (backup criado)"
else
  echo "ℹ️ Configuração do Traefik já usa ACME de produção"
fi

# 2. Descartar certificados de staging (somente se a config era de staging)
if [ "$STAGING_FOUND" -eq 1 ] && [ -f "$ACME_FILE" ]; then
  cp "$ACME_FILE" "${ACME_FILE}.staging.bak-${STAMP}"
  rm -f "$ACME_FILE"
  echo "✅ acme.json de staging removido (backup criado)"
fi

# 3. Recriar o Traefik para emitir certificados de produção
cd "$BASE_DIR"
$DC -f "$COMPOSE_FILE" up -d --force-recreate
echo "🔄 Traefik recriado. Aguardando emissão do certificado de produção..."

# 4. Validar o certificado servido
ISSUER=""
for i in $(seq 1 40); do
  ISSUER="$(echo | openssl s_client -servername "$HOST_NAME" -connect "$HOST_NAME:443" 2>/dev/null \
    | openssl x509 -noout -issuer 2>/dev/null || true)"
  if echo "$ISSUER" | grep -qi "Let's Encrypt" && ! echo "$ISSUER" | grep -qi "staging"; then
    echo "✅ Certificado de produção válido: $ISSUER"
    echo "🎉 HTTPS de $HOST_NAME corrigido."
    exit 0
  fi
  sleep 10
done

echo "❌ Certificado de produção não foi emitido a tempo."
echo "Issuer atual: ${ISSUER:-<indisponível>}"
echo "📋 Logs do Traefik:"
docker logs traefik --tail 100 || true
exit 1
