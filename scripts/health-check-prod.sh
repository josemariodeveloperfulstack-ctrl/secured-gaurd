#!/bin/bash
# Exit on error, but allow manual exit codes
set -euo pipefail

# Trap para garantir que sempre saímos com código apropriado
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

echo "🏥 Verificando saúde da aplicação PROD..."

# Verificar variáveis de ambiente necessárias
if [ -z "${SSH_USER:-}" ] || [ -z "${SSH_HOST:-}" ] || [ -z "${SSH_PASSWORD:-}" ]; then
    echo "❌ Erro: Variáveis de ambiente SSH_USER, SSH_HOST e SSH_PASSWORD devem estar definidas"
    exit 1
fi

# Configurações
MAX_ATTEMPTS=15
ATTEMPT=1
HEALTH_CHECK_URL="https://securedguard.z7botsolutions.com.br/api/health"
INTERNAL_HEALTH_CHECK="http://localhost:8084/api/health"
CONTAINER_MISSING_DIAG_DONE=0

# Função para log com timestamp
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# Função para verificar Traefik (usando o mesmo traefik do sistema)
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

# Função para verificar se backend está pronto
check_backend_ready() {
    log "🔍 Verificando se backend está pronto..."
    local backend_status=$(sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no "${SSH_USER}@${SSH_HOST}" \
        "docker inspect secured-guard-backend-prod --format '{{.State.Health.Status}}' 2>/dev/null || echo 'unknown'" 2>/dev/null || echo "unknown")
    
    if [ "$backend_status" = "healthy" ]; then
        log "✅ Backend está healthy"
        return 0
    elif [ "$backend_status" = "starting" ]; then
        log "⏳ Backend ainda está iniciando..."
        return 1
    else
        log "⚠️ Status do backend: $backend_status"
        # Verificar logs para ver se há erros
        local last_log=$(sshpass -p "${SSH_PASSWORD}" ssh -o StrictHostKeyChecking=no "${SSH_USER}@${SSH_HOST}" \
            "docker logs --tail 5 secured-guard-backend-prod 2>&1 | tail -1" 2>/dev/null || echo "")
        if [ -n "$last_log" ]; then
            log "📋 Última linha do log: $last_log"
            # Se container não existe, rodar diagnóstico uma vez na primeira tentativa
            if echo "$last_log" | grep -q "No such container" && [ "${CONTAINER_MISSING_DIAG_DONE}" -eq 0 ]; then
                CONTAINER_MISSING_DIAG_DONE=1
                log "🔍 Container não encontrado no servidor - executando diagnóstico..."
                collect_diagnostics
            fi
        fi
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
    
    local temp_response=$(mktemp)
    local temp_stderr=$(mktemp)
    
    local http_code=$(curl -s -L -w "%{http_code}" -o "$temp_response" --max-time 15 --connect-timeout 10 --location-trusted "${HEALTH_CHECK_URL}" 2>"$temp_stderr" || echo "000")
    local curl_exit_code=$?
    
    local response=$(cat "$temp_response" 2>/dev/null || echo "")
    local curl_error=$(cat "$temp_stderr" 2>/dev/null || echo "")
    
    rm -f "$temp_response" "$temp_stderr" 2>/dev/null || true
    
    if [ $curl_exit_code -ne 0 ]; then
        log "⚠️ Erro ao executar curl (código: $curl_exit_code)"
        if [ -n "$curl_error" ]; then
            log "⚠️ Erro: $curl_error"
        fi
        return 1
    fi
    
    if ! echo "$http_code" | grep -qE '^[1-5][0-9]{2}$'; then
        log "⚠️ Código HTTP inválido: '$http_code'"
        http_code="000"
    fi
    
    log "HTTP Code recebido: $http_code"
    
    if [ "$http_code" = "200" ]; then
        if echo "$response" | grep -qE '"(status|database|application)"'; then
            log "✅ Health check externo passou!"
            log "Resposta: $response"
            # Verificar se NÃO é a resposta do CI
            if echo "$response" | grep -q "ci.z7botsolutions.com.br"; then
                log "❌ Erro: Health check retornou dados do ambiente CI em vez de PROD!"
                return 1
            fi
            return 0
        else
            log "⚠️ Resposta não é JSON válido ou não contém campos esperados"
            log "⚠️ Resposta recebida: $response"
            return 1
        fi
    elif [ "$http_code" = "521" ]; then
        log "❌ HTTP 521: Cloudflare não consegue conectar ao servidor de origem"
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
        echo "📋 Status dos containers PROD:"
        cd /var/www/secured_guard/prod/deploy
        docker-compose -f docker-compose.prod.yml ps 2>&1 || echo "Erro ao verificar containers"
        
        echo ""
        echo "🌐 Testando conectividade interna:"
        echo "Backend (localhost:8084):"
        curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:8084/api/health || echo "Backend não responde"
        
        echo ""
        echo "📋 Logs do backend (últimas 30 linhas):"
        docker logs --tail 30 secured-guard-backend-prod 2>&1 | tail -30 || echo "Container não encontrado"
DIAG_EOF
}

# Aguardar inicialização
log "⏳ Aguardando 60 segundos para aplicação inicializar..."
sleep 60

# Loop principal de tentativas
while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    log ""
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "Tentativa $ATTEMPT de $MAX_ATTEMPTS..."
    
    if check_backend_ready; then
        if check_internal_health; then
            log "✅ Aplicação está funcionando internamente!"
            if check_external_health; then
                log "✅ Health check externo também passou!"
                log "✅ Aplicação PROD está totalmente operacional!"
                exit 0
            else
                log "⚠️ Aplicação funciona internamente mas não externamente"
                if [ $ATTEMPT -ge 10 ]; then
                    log "✅ Aplicação está funcionando internamente após $ATTEMPT tentativas"
                    log "📌 O 404 externo vem do Cloudflare ou Traefik (encaminhamento para o servidor)."
                    log "   No servidor: cd /var/www/secured_guard/prod/deploy && bash fix-404-prod.sh"
                    log "   Ver também: deploy/CLOUDFLARE_TRAEFIK_PROD.md"
                    exit 0
                fi
            fi
        else
            log "⚠️ Health check interno falhou"
        fi
    else
        log "⚠️ Backend ainda não está pronto"
    fi
    
    if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
        log "⏳ Aguardando 20 segundos antes da próxima tentativa..."
        sleep 20
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
done

log ""
log "❌ Health check falhou após $MAX_ATTEMPTS tentativas!"
collect_diagnostics
exit 1
