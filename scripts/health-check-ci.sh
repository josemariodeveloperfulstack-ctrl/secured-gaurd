#!/bin/bash
# Exit on error, but allow manual exit codes
set -euo pipefail

# Trap para garantir que sempre saímos com código apropriado
# Exit code 47 geralmente indica timeout do GitHub Actions
cleanup_and_exit() {
    local exit_code=$?
    log "Script finalizado com código: $exit_code"
    
    # Se o código não for 0 ou 1, converter para 1 (erro genérico)
    if [ $exit_code -ne 0 ] && [ $exit_code -ne 1 ]; then
        log "⚠️ Código de saída inválido ($exit_code), convertendo para 1"
        exit 1
    fi
    
    exit $exit_code
}

trap cleanup_and_exit EXIT INT TERM

echo "🏥 Verificando saúde da aplicação CI..."

# Verificar variáveis de ambiente necessárias
if [ -z "${SSH_USER:-}" ] || [ -z "${SSH_HOST:-}" ] || [ -z "${SSH_PASSWORD:-}" ]; then
    echo "❌ Erro: Variáveis de ambiente SSH_USER, SSH_HOST e SSH_PASSWORD devem estar definidas"
    exit 1
fi

# Configurações
MAX_ATTEMPTS=15
ATTEMPT=1
HEALTH_CHECK_URL="https://ci.z7botsolutions.com.br/api/health"
INTERNAL_HEALTH_CHECK="http://localhost:8081/api/health"

# Função para log com timestamp
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# Função para verificar Traefik
check_traefik() {
    log "🔍 Verificando status do Traefik..."
    local traefik_status=$(sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no "${SSH_USER}@${SSH_HOST}" "docker ps --filter 'name=traefik' --format '{{.Status}}' 2>&1" || echo "")
    if echo "$traefik_status" | grep -q "Up" 2>/dev/null; then
        log "✅ Traefik está rodando"
        return 0
    else
        log "❌ Traefik NÃO está rodando! Isso causa HTTP 521 do Cloudflare."
        return 1
    fi
}

# Função para verificar health check interno (via SSH)
check_internal_health() {
    log "🔍 Verificando health check interno no servidor..."
    local response=$(sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no "${SSH_USER}@${SSH_HOST}" \
        "curl -s -w '\n%{http_code}' --max-time 10 ${INTERNAL_HEALTH_CHECK} 2>/dev/null || echo '000'" 2>/dev/null || echo "ssh_failed")
    
    if [ "$response" = "ssh_failed" ]; then
        log "⚠️ Não foi possível conectar via SSH"
        return 1
    fi
    
    local http_code=$(echo "$response" | tail -1)
    local body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        log "✅ Health check interno passou!"
        log "Resposta: $body"
        return 0
    else
        log "⚠️ Health check interno retornou HTTP $http_code"
        return 1
    fi
}

# Função para verificar health check externo
check_external_health() {
    log "🔍 Verificando health check externo (via Cloudflare)..."
    
    # Tentar obter código HTTP
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 15 --connect-timeout 10 --location-trusted "${HEALTH_CHECK_URL}" 2>/dev/null || echo "000")
    
    # Limpar código HTTP de caracteres não numéricos
    http_code=$(echo "$http_code" | grep -oE '[0-9]+' 2>/dev/null | head -1 || echo "000")
    
    log "HTTP Code recebido: $http_code"
    
    if [ "$http_code" = "200" ]; then
        log "✅ Health check externo passou!"
        
        # Obter resposta completa
        local response=$(curl -s -L --max-time 15 --location-trusted "${HEALTH_CHECK_URL}" 2>/dev/null || echo "")
        log "Resposta: $response"
        return 0
    elif [ "$http_code" = "521" ]; then
        log "❌ HTTP 521: Cloudflare não consegue conectar ao servidor de origem"
        log "💡 Possíveis causas:"
        log "   1. Traefik não está rodando"
        log "   2. Firewall bloqueando conexões do Cloudflare"
        log "   3. Nginx não está respondendo"
        return 1
    elif [ "$http_code" = "000" ]; then
        log "⚠️ Timeout ou erro de conexão"
        return 1
    else
        log "⚠️ HTTP Code: $http_code (esperado: 200)"
        return 1
    fi
}

# Função para coletar diagnósticos
collect_diagnostics() {
    log "🔍 Coletando informações de diagnóstico..."
    
    sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no "${SSH_USER}@${SSH_HOST}" << 'DIAG_EOF'
        echo "📋 Status dos containers CI:"
        cd /var/www/secured_guard/ci
        docker-compose -f docker-compose.ci.yml ps 2>&1 || echo "Erro ao verificar containers"
        
        echo ""
        echo "🔍 Verificando Traefik:"
        if docker ps | grep -q traefik; then
            echo "✅ Traefik está rodando"
            docker ps --filter "name=traefik" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
            echo ""
            echo "📋 Logs do Traefik (últimas 20 linhas):"
            docker logs --tail 20 traefik 2>&1 | tail -20 || echo "Erro ao ler logs"
        else
            echo "❌ Traefik não está rodando!"
        fi
        
        echo ""
        echo "🌐 Testando conectividade interna:"
        echo "Backend (localhost:8081):"
        curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:8081/api/health || echo "Backend não responde"
        echo "Nginx (localhost:8082):"
        curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:8082/api/health || echo "Nginx não responde"
        
        echo ""
        echo "📋 Logs do backend (últimas 30 linhas):"
        docker logs --tail 30 secured-guard-backend-ci 2>&1 | tail -30 || echo "Container não encontrado"
        
        echo ""
        echo "📋 Logs do nginx (últimas 20 linhas):"
        docker logs --tail 20 secured-guard-nginx-ci 2>&1 | tail -20 || echo "Container não encontrado"
DIAG_EOF
}

# Aguardar inicialização
log "⏳ Aguardando 60 segundos para aplicação inicializar completamente..."
sleep 60

# Loop principal de tentativas
while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    log ""
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "Tentativa $ATTEMPT de $MAX_ATTEMPTS..."
    
    # Verificar Traefik a cada 3 tentativas
    if [ $((ATTEMPT % 3)) -eq 0 ]; then
        if ! check_traefik; then
            log "💡 Tentando iniciar Traefik..."
            sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no "${SSH_USER}@${SSH_HOST}" \
                "cd /var/www/secured_guard && docker-compose -f docker-compose.traefik.yml up -d 2>&1" || true
            sleep 10
        fi
    fi
    
    # Primeiro, verificar health check interno
    if check_internal_health; then
        log "✅ Aplicação está funcionando internamente!"
        
        # Se interno funciona, tentar externo
        if check_external_health; then
            log "✅ Health check externo também passou!"
            log "✅ Aplicação CI está totalmente operacional!"
            exit 0
        else
            log "⚠️ Aplicação funciona internamente mas não externamente"
            log "💡 Pode ser problema de Cloudflare ou Traefik"
        fi
    else
        log "⚠️ Health check interno falhou"
    fi
    
    # Se não passou, aguardar antes da próxima tentativa
    if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
        log "⏳ Aguardando 15 segundos antes da próxima tentativa..."
        sleep 15
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
done

# Se chegou aqui, todas as tentativas falharam
log ""
log "❌ Health check falhou após $MAX_ATTEMPTS tentativas!"
log ""
collect_diagnostics
exit 1

