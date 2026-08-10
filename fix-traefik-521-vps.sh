#!/bin/bash

# ========================================
# SCRIPT WSL PARA FIXAR ERRO 521 NA VPS CI
# ========================================

set -e

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Configurações
VPS_HOST="185.225.233.18"
VPS_USER="root"
VPS_PORT="22"
VPS_PASSWORD="4KaCiJc6an@7sg@2026"

log "Fixando erro 521 na VPS CI"
echo ""
info "Configurações:"
info "  VPS_HOST: $VPS_HOST"
info "  VPS_USER: $VPS_USER"
info "  VPS_PORT: $VPS_PORT"
echo ""

# ========================================
# 1. VERIFICAR SSHPASS
# ========================================
log "1. Verificando sshpass..."
if ! command -v sshpass &> /dev/null; then
    log "Instalando sshpass..."
    sudo apt update
    sudo apt install -y sshpass
fi

log "✅ sshpass disponível!"

# ========================================
# 2. CONFIGURAR SSH
# ========================================
log "2. Configurando SSH..."

# Criar diretório SSH
mkdir -p ~/.ssh
chmod 700 ~/.ssh
touch ~/.ssh/known_hosts
chmod 600 ~/.ssh/known_hosts

# Adicionar chave do host
ssh-keyscan -p $VPS_PORT $VPS_HOST >> ~/.ssh/known_hosts

log "✅ SSH configurado!"

# ========================================
# 3. TESTAR CONEXÃO
# ========================================
log "3. Testando conexão SSH..."
if sshpass -p "$VPS_PASSWORD" ssh -p $VPS_PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST "echo 'SSH OK'"; then
    log "✅ Conexão SSH funcionando!"
else
    error "❌ Não foi possível conectar via SSH"
fi

# ========================================
# 4. VERIFICAR DIRETÓRIOS NA VPS
# ========================================
log "4. Verificando diretórios na VPS..."

PROJECT_DIR="/var/www/secured-guard"
if sshpass -p "$VPS_PASSWORD" ssh -p $VPS_PORT -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST "[ -d $PROJECT_DIR ]"; then
    log "✅ Diretório $PROJECT_DIR existe!"
else
    PROJECT_DIR="/opt/secured-guard"
    if sshpass -p "$VPS_PASSWORD" ssh -p $VPS_PORT -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST "[ -d $PROJECT_DIR ]"; then
        log "⚠️ Diretório /var/www/secured-guard não existe, usando $PROJECT_DIR"
    else
        error "❌ Nenhum diretório de projeto encontrado na VPS!"
    fi
fi

# ========================================
# 5. COPIAR ARQUIVOS PARA VPS
# ========================================
log "5. Copiando arquivos para VPS..."

# Copiar fix-traefik-521.sh
log "  Copiando fix-traefik-521.sh..."
sshpass -p "$VPS_PASSWORD" scp -P $VPS_PORT -o StrictHostKeyChecking=no fix-traefik-521.sh $VPS_USER@$VPS_HOST:$PROJECT_DIR/

# Copiar docker-compose.traefik.yml
log "  Copiando docker-compose.traefik.yml..."
sshpass -p "$VPS_PASSWORD" scp -P $VPS_PORT -o StrictHostKeyChecking=no docker-compose.traefik.yml $VPS_USER@$VPS_HOST:$PROJECT_DIR/

# Criar diretório traefik/dynamic se não existir
log "  Verificando diretório traefik/dynamic..."
sshpass -p "$VPS_PASSWORD" ssh -p $VPS_PORT -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST "mkdir -p $PROJECT_DIR/traefik/dynamic"

# Copiar traefik-dynamic-ci.yml para traefik/dynamic/ci.yml
log "  Copiando traefik-dynamic-ci.yml..."
sshpass -p "$VPS_PASSWORD" scp -P $VPS_PORT -o StrictHostKeyChecking=no traefik-dynamic-ci.yml $VPS_USER@$VPS_HOST:$PROJECT_DIR/traefik/dynamic/ci.yml

log "✅ Arquivos copiados com sucesso!"

# ========================================
# 6. EXECUTAR FIX NA VPS
# ========================================
log "6. Executando script de fix na VPS..."

sshpass -p "$VPS_PASSWORD" ssh -p $VPS_PORT -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST << EOF
cd $PROJECT_DIR
chmod +x fix-traefik-521.sh
# Modificar o script para usar o diretório correto
sed -i "s|/var/www/secured-guard|$PROJECT_DIR|g" fix-traefik-521.sh
./fix-traefik-521.sh
EOF

log "✅ Fix executado com sucesso!"

# ========================================
# 7. VERIFICAR STATUS
# ========================================
log "7. Verificando status do Traefik..."
sshpass -p "$VPS_PASSWORD" ssh -p $VPS_PORT -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST "docker ps | grep traefik"

log "✅ Processo concluído!"
echo ""
info "Acesse sua aplicação em:"
echo "🌐 https://ci.z7botsolutions.com.br"
