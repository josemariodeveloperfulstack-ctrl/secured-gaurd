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

CI_BASE_DIR="${CI_BASE_DIR:-/var/www/secured_guard}"
CI_DIR="${CI_BASE_DIR}/ci"

if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker compose"
else
  DOCKER_COMPOSE="docker-compose"
fi

echo "🏥 Verificando saúde da aplicação CI (VPS: ${CI_BASE_DIR})..."

# Configurações — backend Spring Boot + Flyway no CI pode levar 8–12 min na VPS
MAX_ATTEMPTS=40
ATTEMPT=1
RETRY_INTERVAL=25
HEALTH_CHECK_URL="https://ci.z7botsolutions.com.br/api/health"
INTERNAL_HEALTH_CHECK="http://localhost:8081/api/health"
# Por omissão o script só termina com sucesso se o health PÚBLICO (Cloudflare) passar.
# Apenas para debugging: CI_HEALTH_ALLOW_PARTIAL_SUCCESS=1 permite exit 0 só com interno OK (não use em produção).

# Função para log com timestamp
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# Função para verificar Traefik (container exato "traefik", não substring noutro nome)
check_traefik() {
    log "🔍 Verificando status do Traefik..."
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^traefik$'; then
        log "✅ Traefik está rodando"
        return 0
    fi
    log "❌ Traefik NÃO está rodando! Isso causa HTTP 521 do Cloudflare."
    return 1
}

# Função para verificar se backend está pronto
check_backend_ready() {
    log "🔍 Verificando se backend está pronto..."
    local backend_status=$(docker inspect secured-guard-backend-ci --format '{{.State.Health.Status}}' 2>/dev/null || echo 'unknown')
    local restart_count=$(docker inspect secured-guard-backend-ci --format '{{.RestartCount}}' 2>/dev/null || echo '0')
    local started_at=$(docker inspect secured-guard-backend-ci --format '{{.State.StartedAt}}' 2>/dev/null || echo 'unknown')
    local uptime_sec=$(docker inspect secured-guard-backend-ci --format '{{if .State.Running}}{{.State.StartedAt}}{{end}}' 2>/dev/null | xargs -I{} date -d {} +%s 2>/dev/null || echo "0")
    local now_sec=$(date +%s 2>/dev/null || echo "0")
    if [ "$uptime_sec" != "0" ] && [ "$now_sec" != "0" ]; then
        local elapsed=$((now_sec - uptime_sec))
        log "📊 Backend: status=$backend_status, restarts=$restart_count, uptime=${elapsed}s"
    else
        log "📊 Backend: status=$backend_status, restarts=$restart_count, started=$started_at"
    fi

    if [ "${restart_count:-0}" -gt 2 ] 2>/dev/null; then
        log "⚠️ Backend reiniciou ${restart_count}x — possível OOM ou erro no startup (verifique logs)"
    fi
    
    if [ "$backend_status" = "healthy" ]; then
        log "✅ Backend está healthy"
        return 0
    elif [ "$backend_status" = "starting" ]; then
        log "⏳ Backend ainda está iniciando..."
        return 1
    else
        log "⚠️ Status do backend: $backend_status"
        local last_log=$(docker logs --tail 5 secured-guard-backend-ci 2>&1 | tail -1 || echo "")
        if [ -n "$last_log" ]; then
            log "📋 Última linha do log: $last_log"
        fi
        return 1
    fi
}

# Função para verificar health check interno
check_internal_health() {
    log "🔍 Verificando health check interno no servidor..."
    local response=$(curl -s -w '\n%{http_code}' --max-time 10 ${INTERNAL_HEALTH_CHECK} 2>/dev/null || echo '000')
    
    local http_code=$(echo "$response" | tail -1 | tr -d '\r\n' | head -c 3)
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
    
    # Obter resposta completa e código HTTP em uma única chamada
    # Usar arquivo temporário para capturar resposta e código separadamente
    local temp_response=$(mktemp)
    local temp_stderr=$(mktemp)
    
    # Fazer requisição seguindo todos os redirects
    # -L: seguir redirects
    # -w "%{http_code}": obter código HTTP final
    # -s: silencioso (sem progress bar)
    # -o: salvar resposta em arquivo
    local http_code=$(curl -s -L -w "%{http_code}" -o "$temp_response" --max-time 15 --connect-timeout 10 --location-trusted "${HEALTH_CHECK_URL}" 2>"$temp_stderr" || echo "000")
    local curl_exit_code=$?
    
    # Ler resposta do arquivo
    local response=$(cat "$temp_response" 2>/dev/null || echo "")
    local curl_error=$(cat "$temp_stderr" 2>/dev/null || echo "")
    
    # Limpar arquivos temporários
    rm -f "$temp_response" "$temp_stderr" 2>/dev/null || true
    
    # Se curl falhou, tratar como erro
    if [ $curl_exit_code -ne 0 ]; then
        log "⚠️ Erro ao executar curl (código: $curl_exit_code)"
        if [ -n "$curl_error" ]; then
            log "⚠️ Erro: $curl_error"
        fi
        return 1
    fi
    
    # Validar que é um código HTTP válido (100-599)
    if ! echo "$http_code" | grep -qE '^[1-5][0-9]{2}$'; then
        log "⚠️ Código HTTP inválido: '$http_code'"
        http_code="000"
    fi
    
    log "HTTP Code recebido: $http_code"
    
    if [ "$http_code" = "200" ]; then
        # Validar que a resposta é JSON válido com campos esperados
        if echo "$response" | grep -qE '"(status|database|application)"'; then
            log "✅ Health check externo passou!"
            log "Resposta: $response"
            return 0
        else
            log "⚠️ Resposta não é JSON válido ou não contém campos esperados"
            log "⚠️ Resposta recebida: $response"
            return 1
        fi
    elif [ "$http_code" = "521" ]; then
        log "❌ HTTP 521: Cloudflare não consegue conectar ao servidor de origem (origem offline / recusa TCP)."
        log "💡 Causas frequentes neste projeto:"
        log "   1. Traefik parado — ver docker logs traefik; se viu 'address already in use' na 80, outro serviço usa a porta."
        log "   2. Porta 80 ocupada (nginx do sistema, outro container): sudo ss -tlnp | grep ':80'"
        log "   3. Firewall bloqueando IPs da Cloudflare na 80/443"
        return 1
    elif [ "$http_code" = "301" ] || [ "$http_code" = "302" ] || [ "$http_code" = "307" ] || [ "$http_code" = "308" ]; then
        log "⚠️ HTTP $http_code: Redirecionamento detectado"
        log "💡 O curl deveria ter seguido o redirect automaticamente com -L"
        log "💡 Verificando se a resposta após redirect é válida..."
        
        # Se chegou aqui com código de redirect, pode ser que o curl não seguiu corretamente
        # Tentar novamente com redirect explícito
        if [ -n "$response" ] && echo "$response" | grep -qE '"(status|database|application)"'; then
            log "✅ Resposta após redirect é válida!"
            log "Resposta: $response"
            return 0
        else
            local final_url=$(curl -s -o /dev/null -w "%{url_effective}" -L --max-time 15 --location-trusted "${HEALTH_CHECK_URL}" 2>/dev/null || echo "")
            log "💡 URL final: $final_url"
            log "💡 Resposta recebida: ${response:0:200}..." # Primeiros 200 caracteres
            return 1
        fi
    elif [ "$http_code" = "000" ]; then
        log "⚠️ Timeout ou erro de conexão"
        if [ -n "$curl_error" ]; then
            log "⚠️ Detalhes: $curl_error"
        fi
        return 1
    else
        log "⚠️ HTTP Code: $http_code (esperado: 200)"
        log "💡 Pode ser problema de Cloudflare ou Traefik"
        if [ -n "$response" ]; then
            log "💡 Resposta: ${response:0:200}..." # Primeiros 200 caracteres
        fi
        return 1
    fi
}

# Função para coletar diagnósticos
collect_diagnostics() {
    log "🔍 Coletando informações de diagnóstico..."
    
    echo "📋 Status dos containers CI:"
    cd "${CI_DIR}" || { echo "❌ Diretório CI não encontrado: ${CI_DIR}"; return; }
    ${DOCKER_COMPOSE} -f docker-compose.ci.yml ps 2>&1 || echo "Erro ao verificar containers"
    
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
    echo "🔌 Porta 80 no host (Traefik precisa disto livre para Cloudflare deixar de responder 521):"
    (command -v ss >/dev/null && ss -tlnp 2>/dev/null | grep -E ':80\s' || true) || echo "   (instale iproute2 / use: sudo ss -tlnp | grep ':80')"
    docker ps --format '{{.Names}}\t{{.Ports}}' 2>/dev/null | grep -E ':80->|:::80->' || echo "   (nenhum container mapeando :80)"
    
    echo ""
    echo "📋 Diagnóstico do backend:"
    docker inspect secured-guard-backend-ci --format 'Status={{.State.Status}} Health={{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}} Restarts={{.RestartCount}} Started={{.State.StartedAt}} ExitCode={{.State.ExitCode}} OOMKilled={{.State.OOMKilled}}' 2>/dev/null || echo "Container não encontrado"
    echo ""
    echo "📋 Logs do backend (últimas 50 linhas):"
    docker logs --tail 50 secured-guard-backend-ci 2>&1 | tail -50 || echo "Container não encontrado"
    
    echo ""
    echo "📋 Logs do nginx (últimas 20 linhas):"
    docker logs --tail 20 secured-guard-nginx-ci 2>&1 | tail -20 || echo "Container não encontrado"
}

# Aguardar inicialização
log "⏳ Aguardando 60 segundos para aplicação inicializar (o deploy principal já verificou o básico)..."
log "💡 Backend precisa de tempo para conectar ao banco, Flyway e carregar beans Spring."
sleep 60

# Loop principal de tentativas
while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    log ""
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "Tentativa $ATTEMPT de $MAX_ATTEMPTS..."
    
    # Verificar Traefik a cada 3 tentativas (script roda na VPS, executar localmente)
    if [ $((ATTEMPT % 3)) -eq 0 ]; then
        if ! check_traefik; then
            log "💡 Tentando Traefik: compose down + rm container falho + up -d..."
            (
              cd "${CI_BASE_DIR}" || exit 0
              if [ -f ci/scripts/free-host-ports-for-traefik.sh ]; then
                bash ci/scripts/free-host-ports-for-traefik.sh 2>/dev/null || true
              elif [ -f scripts/free-host-ports-for-traefik.sh ]; then
                bash scripts/free-host-ports-for-traefik.sh 2>/dev/null || true
              fi
              ${DOCKER_COMPOSE} -f docker-compose.traefik.yml down 2>/dev/null || true
              docker rm -f traefik 2>/dev/null || true
              ${DOCKER_COMPOSE} -f docker-compose.traefik.yml up -d 2>&1
            ) || true
            sleep 15
            if ! check_traefik; then
                log "⚠️ Traefik ainda não subiu. Verifique conflito na porta 80: sudo ss -tlnp | grep ':80'"
            fi
        fi
    fi
    
    # Priorizar health check HTTP real (backend pode responder antes do docker health)
    if check_internal_health; then
        log "✅ Aplicação está funcionando internamente!"
        # Se interno funciona, tentar externo
        if check_external_health; then
            log "✅ Health check externo também passou!"
            log "✅ Aplicação CI está totalmente operacional!"
            exit 0
        else
            log "⚠️ Aplicação funciona internamente mas não externamente"
            log "💡 HTTP 521 = origem inacessível na 80/443 — em geral Traefik parado (porta 80 ocupada no host)."
            if [ "${CI_HEALTH_ALLOW_PARTIAL_SUCCESS:-0}" = "1" ] && [ $ATTEMPT -ge 15 ]; then
                log "⚠️ CI_HEALTH_ALLOW_PARTIAL_SUCCESS=1 — saindo com sucesso apesar do externo falhar."
                exit 0
            fi
        fi
    else
        # Fallback: verificar status docker
        if ! check_backend_ready; then
            log "⚠️ Backend ainda não está pronto"
        fi
    fi
    
    # Se não passou, aguardar antes da próxima tentativa
    if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
        log "⏳ Aguardando ${RETRY_INTERVAL} segundos antes da próxima tentativa..."
        sleep "${RETRY_INTERVAL}"
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
done

# Se chegou aqui, todas as tentativas falharam
log ""
log "❌ Health check falhou após $MAX_ATTEMPTS tentativas!"
log ""
collect_diagnostics
exit 1

