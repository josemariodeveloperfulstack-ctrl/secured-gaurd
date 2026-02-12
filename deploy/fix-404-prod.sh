#!/bin/bash
# Corrigir 404 em PROD - executar NO SERVIDOR (SSH) como root
# Uso: cd /var/www/secured_guard/prod/deploy && bash fix-404-prod.sh

set -e
echo "=========================================="
echo "🔧 Fix 404 PROD - Secured Guard"
echo "=========================================="

DEPLOY_DIR="${DEPLOY_DIR:-/var/www/secured_guard/prod/deploy}"
cd "$DEPLOY_DIR" || { echo "Erro: pasta $DEPLOY_DIR não encontrada"; exit 1; }

# 1. Rede z7network (Traefik descobre os containers por esta rede)
echo ""
echo "1️⃣ Rede z7network..."
if ! docker network inspect z7network &>/dev/null; then
  echo "   Criando rede z7network..."
  docker network create z7network
else
  echo "   Rede z7network já existe."
fi

# 2. Garantir que o nginx está na rede
echo ""
echo "2️⃣ Container nginx na rede z7network..."
if docker ps -a --format '{{.Names}}' | grep -qx secured-guard-nginx-prod; then
  if ! docker network inspect z7network | grep -q secured-guard-nginx-prod; then
    echo "   Ligando nginx à rede z7network..."
    docker network connect z7network secured-guard-nginx-prod 2>/dev/null || true
  else
    echo "   Nginx já está na rede z7network."
  fi
else
  echo "   Nginx não está a correr. A subir o stack..."
  docker-compose -f docker-compose.prod.yml up -d
  sleep 10
fi

# 3. Reiniciar nginx para garantir que está estável
echo ""
echo "3️⃣ Reiniciar nginx..."
docker restart secured-guard-nginx-prod 2>/dev/null || true
sleep 3

# 4. Teste local
echo ""
echo "4️⃣ Teste no servidor (deve dar 200):"
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:8085/ 2>/dev/null || echo "000")
if [ "$CODE" = "200" ]; then
  echo "   ✅ http://127.0.0.1:8085/ → $CODE"
else
  echo "   ❌ http://127.0.0.1:8085/ → $CODE (esperado 200)"
fi

CODE_API=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:8085/api/health 2>/dev/null || echo "000")
if [ "$CODE_API" = "200" ]; then
  echo "   ✅ http://127.0.0.1:8085/api/health → $CODE_API"
else
  echo "   ❌ http://127.0.0.1:8085/api/health → $CODE_API"
fi

# 5. Verificar se o Traefik vê o nginx
echo ""
echo "5️⃣ Containers na rede z7network:"
docker network inspect z7network --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null || echo "   (erro ao listar)"

echo ""
echo "=========================================="
echo "📌 Se o teste local deu 200 mas o site continua 404:"
echo "   O Traefik tem de estar na mesma rede (z7network) e a escutar na porta 443."
echo ""
echo "   No host onde corre o Traefik:"
echo "   - docker network inspect z7network   # deve listar secured-guard-nginx-prod"
echo "   - Os entrypoints do Traefik devem chamar-se 'web' (80) e 'websecure' (443)"
echo "   - Se o Traefik usar ficheiros em vez de Docker labels, adicione um router"
echo "     para Host('securedguard.z7botsolutions.com.br') → servidor :8085 ou ao container nginx"
echo "=========================================="
