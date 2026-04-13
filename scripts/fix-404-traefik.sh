#!/bin/bash
# Script para corrigir problema de 404 no Traefik

set -e

# Permitir execução mesmo se algum comando falhar (para diagnóstico)
set +e

echo "🔧 Corrigindo problema de 404 no Traefik..."
echo ""

# Diagnóstico: Cloudflare 521 + "address already in use" na 80 = outro processo ocupa a porta do host.
diagnose_port80() {
  echo "   📌 Quem usa a porta 80 no host:"
  (ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null) | grep -E ':(80)\s' || echo "      (não listado — instale iproute2/ss)"
  echo "   📌 Containers Docker com bind em :80:"
  docker ps --format '{{.Names}}\t{{.Ports}}' 2>/dev/null | grep -E ':80->|:::80->|0\.0\.0\.0:80->' || echo "      (nenhum encontrado pelo grep)"
}

# Sobe Traefik após limpar container falho (Created/Exited por conflito de porta).
start_traefik_safe() {
  cd /var/www/secured_guard || return 1
  echo "   🔄 compose down + rm traefik (estado falho / porta presa no nome)..."
  docker-compose -f docker-compose.traefik.yml down 2>/dev/null || true
  docker rm -f traefik 2>/dev/null || true
  echo "   🚀 docker-compose up -d traefik..."
  if docker-compose -f docker-compose.traefik.yml up -d; then
    return 0
  fi
  echo "❌ Traefik não subiu (muito provável: porta 80 ou 443 já em uso)."
  diagnose_port80
  echo "   💡 Liberte a 80/443 no host. Exemplos:"
  echo "      • Outro container: docker stop <nome>   (veja lista acima)"
  echo "      • Nginx no sistema: sudo systemctl stop nginx"
  echo "      • Apache: sudo systemctl stop apache2"
  return 1
}

# 1. Verificar se Traefik está rodando
echo "1️⃣ Verificando Traefik..."
if ! docker ps --format '{{.Names}}' | grep -q '^traefik$'; then
  echo "❌ Traefik não está rodando! Iniciando..."
  diagnose_port80
  start_traefik_safe || true
  sleep 10
else
  echo "✅ Traefik está rodando"
fi

# 2. Verificar se configuração dinâmica existe
echo ""
echo "2️⃣ Verificando configuração dinâmica..."
if [ ! -f "/var/www/secured_guard/traefik/dynamic/ci.yml" ]; then
  echo "⚠️ Arquivo de configuração dinâmica não encontrado em /var/www/secured_guard/traefik/dynamic/ci.yml"
  
  # Tentar recuperar de um backup se existir (enviado pelo deploy)
  if [ -f "/var/www/secured_guard/traefik-dynamic-ci.yml" ]; then
    echo "   📦 Encontrado backup em /var/www/secured_guard/traefik-dynamic-ci.yml. Restaurando..."
    mkdir -p /var/www/secured_guard/traefik/dynamic
    cp /var/www/secured_guard/traefik-dynamic-ci.yml /var/www/secured_guard/traefik/dynamic/ci.yml
    echo "   ✅ Arquivo restaurado!"
  else
    echo "   ❌ Nenhum backup encontrado! Você precisa transferir o arquivo traefik-dynamic-ci.yml"
    echo "   💡 Execute no GitHub Actions ou copie manualmente:"
    echo "      scp traefik-dynamic-ci.yml root@servidor:/var/www/secured_guard/traefik/dynamic/ci.yml"
    # Não sair com erro se for apenas aviso, mas aqui é crítico para o roteamento
    # exit 1 
  fi
else
  echo "✅ Arquivo de configuração dinâmica encontrado"
fi

# 3. Verificar se Nginx está rodando
echo ""
echo "3️⃣ Verificando Nginx..."
if ! docker ps | grep -q "secured-guard-nginx-ci"; then
  echo "❌ Nginx não está rodando!"
  echo "   Iniciando Nginx..."
  cd /var/www/secured_guard/ci
  docker-compose -f docker-compose.ci.yml up -d nginx-ci
  sleep 5
else
  echo "✅ Nginx está rodando"
fi

# 4. Conectar Nginx à rede z7network
echo ""
echo "4️⃣ Conectando Nginx à rede z7network..."
if docker inspect secured-guard-nginx-ci 2>/dev/null | grep -q "z7network"; then
  echo "✅ Nginx já está na rede z7network"
else
  echo "   Conectando Nginx à rede z7network..."
  docker network connect z7network secured-guard-nginx-ci 2>/dev/null || echo "   ⚠️ Pode já estar conectado"
  sleep 2
  if docker inspect secured-guard-nginx-ci 2>/dev/null | grep -q "z7network"; then
    echo "✅ Nginx conectado à rede z7network"
  else
    echo "❌ Falha ao conectar Nginx à rede z7network"
  fi
fi

# 5. Verificar conectividade Traefik → Nginx
echo ""
echo "5️⃣ Testando conectividade Traefik → Nginx..."
if ! docker ps --format '{{.Names}}' | grep -q '^traefik$'; then
  echo "⚠️ Traefik não está Up — pulando wget (corrija conflito na porta 80)."
else
if docker exec traefik wget -qO- --timeout=5 http://secured-guard-nginx-ci:80/health 2>/dev/null | grep -q "healthy"; then
  echo "✅ Traefik consegue acessar o Nginx"
else
  echo "❌ Traefik NÃO consegue acessar o Nginx!"
  echo "   Verificando se ambos estão na mesma rede..."
  
  TRAEFIK_NETWORKS=$(docker inspect traefik | jq -r '.[0].NetworkSettings.Networks | keys[]' 2>/dev/null || echo "")
  NGINX_NETWORKS=$(docker inspect secured-guard-nginx-ci | jq -r '.[0].NetworkSettings.Networks | keys[]' 2>/dev/null || echo "")
  
  echo "   Redes do Traefik: $TRAEFIK_NETWORKS"
  echo "   Redes do Nginx: $NGINX_NETWORKS"
  
  if ! echo "$TRAEFIK_NETWORKS" | grep -q "z7network"; then
    echo "   ❌ Traefik não está na rede z7network!"
    echo "   💡 Verifique o docker-compose.traefik.yml"
  fi
  
  if ! echo "$NGINX_NETWORKS" | grep -q "z7network"; then
    echo "   ❌ Nginx não está na rede z7network!"
    echo "   Tentando conectar novamente..."
    docker network connect z7network secured-guard-nginx-ci
    sleep 2
  fi
fi
fi

# 6. Reiniciar Traefik para carregar configuração dinâmica
echo ""
echo "6️⃣ Reiniciando Traefik para carregar configuração dinâmica..."
if docker ps --format '{{.Names}}' | grep -q '^traefik$'; then
  docker restart traefik
else
  echo "   Traefik não estava Up — tentando subir de forma limpa..."
  start_traefik_safe || true
fi
echo "   Aguardando Traefik (15s)..."
sleep 15

# Verificar se Traefik reiniciou
if docker ps --format '{{.Names}}' | grep -q '^traefik$'; then
  echo "✅ Traefik em execução"
else
  echo "❌ Traefik ainda não está rodando (ver conflito de porta 80/443)."
  diagnose_port80
fi

# 7. Verificar se router foi carregado
echo ""
echo "7️⃣ Verificando se router foi carregado..."
if ! docker ps --format '{{.Names}}' | grep -q '^traefik$'; then
  echo "⚠️ Traefik não está Up — passos 7–9 ignorados até a porta 80/443 estar livre."
else
ROUTERS=$(docker exec traefik wget -qO- http://localhost:8080/api/http/routers 2>/dev/null || echo "[]")
if echo "$ROUTERS" | grep -q "ci-backend"; then
  echo "✅ Router ci-backend encontrado no Traefik"
else
  echo "❌ Router ci-backend NÃO encontrado no Traefik!"
  echo "📋 Routers disponíveis:"
  echo "$ROUTERS" | jq -r '.[].name' 2>/dev/null || echo "$ROUTERS"
  echo ""
  echo "💡 Possíveis causas:"
  echo "   1. Arquivo de configuração dinâmica não está no formato correto"
  echo "   2. Traefik não está montando o volume /var/www/secured_guard/traefik/dynamic"
  echo "   3. Erro de sintaxe no arquivo ci.yml"
  echo ""
  echo "📋 Verificando logs do Traefik:"
  docker logs traefik --tail 30 | grep -i "error\|dynamic\|ci" || echo "Nenhum erro encontrado nos logs"
fi

# 8. Verificar serviço
echo ""
echo "8️⃣ Verificando serviço ci-backend-service..."
SERVICES=$(docker exec traefik wget -qO- http://localhost:8080/api/http/services 2>/dev/null || echo "[]")
if echo "$SERVICES" | grep -q "ci-backend-service"; then
  echo "✅ Serviço ci-backend-service encontrado no Traefik"
else
  echo "❌ Serviço ci-backend-service NÃO encontrado no Traefik!"
  echo "📋 Serviços disponíveis:"
  echo "$SERVICES" | jq -r '.[].name' 2>/dev/null || echo "$SERVICES"
fi

# 9. Testar acesso
echo ""
echo "9️⃣ Testando acesso via Traefik..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: ci.z7botsolutions.com.br" http://localhost/api/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Acesso via Traefik funcionando! (HTTP $HTTP_CODE)"
elif [ "$HTTP_CODE" = "404" ]; then
  echo "❌ Ainda retornando 404"
  echo ""
  echo "🔍 Diagnóstico adicional:"
  echo ""
  echo "📋 Verificando se Traefik consegue resolver o nome do Nginx:"
  docker exec traefik nslookup secured-guard-nginx-ci 2>/dev/null || echo "⚠️ Não foi possível resolver nome"
  echo ""
  echo "📋 Verificando se Traefik consegue acessar o Nginx diretamente:"
  docker exec traefik wget -qO- --timeout=5 http://secured-guard-nginx-ci:80/health 2>&1 | head -5 || echo "❌ Falha ao acessar Nginx"
  echo ""
  echo "📋 Verificando conteúdo do arquivo de configuração dinâmica:"
  cat /var/www/secured_guard/traefik/dynamic/ci.yml | head -30
  echo ""
  echo "💡 Verifique:"
  echo "   1. Se o router ci-backend está configurado corretamente"
  echo "   2. Se o serviço ci-backend-service aponta para o Nginx correto (secured-guard-nginx-ci:80)"
  echo "   3. Se o Nginx está respondendo corretamente"
  echo "   4. Se ambos estão na mesma rede (z7network)"
else
  echo "⚠️ Resposta HTTP: $HTTP_CODE"
fi

fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Correção concluída!"
echo ""
echo "📋 Próximos passos se ainda houver 404:"
echo "   1. Verifique os logs do Traefik: docker logs traefik --tail 50"
echo "   2. Verifique o conteúdo do arquivo: cat /var/www/secured_guard/traefik/dynamic/ci.yml"
echo "   3. Verifique se o docker-compose.traefik.yml monta o volume corretamente"
echo "   4. Teste manualmente: curl -H 'Host: ci.z7botsolutions.com.br' http://localhost/api/health"
echo ""

