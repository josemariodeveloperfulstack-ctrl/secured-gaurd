#!/bin/bash

set -e

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

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

log "🚀 Iniciando script de deploy na VPS..."

# ========================================
# 1. ATUALIZAR CÓDIGO
# ========================================
log "1. Atualizando código do repositório..."
git pull origin main
log "✅ Código atualizado com sucesso!"

# ========================================
# 2. BUILD BACKEND
# ========================================
log "2. Fazendo build do backend..."
cd backend
mvn clean compile
mvn package -DskipTests
log "✅ Backend compilado com sucesso!"

# ========================================
# 3. BUILD FRONTEND
# ========================================
log "3. Fazendo build do frontend..."
cd ../frontend

# Verificar se é Ubuntu
if ! grep -q "Ubuntu" /etc/os-release; then
    warn "⚠️ Sistema não é Ubuntu, mas continuando..."
fi

# Verificar versão do Node.js
log "🔍 Verificando versão do Node.js..."
node --version
npm --version

# Verificar se Node.js é compatível (versão 14+)
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    error "Node.js versão $NODE_VERSION é muito antiga. Necessário Node.js 14+ para Vite."
fi

# Limpar dependências antigas (Windows) e reinstalar para Linux
log "🧹 Limpando dependências antigas..."
rm -rf node_modules
rm -f package-lock.json

# Instalar dependências para Linux
log "📦 Instalando dependências para Linux..."
npm install

# Verificar se Vite está instalado
log "🔍 Verificando Vite..."
npx vite --version

# Fazer build
log "🔨 Fazendo build do frontend..."
npm run build

log "✅ Frontend compilado com sucesso!"

# ========================================
# 4. RESTART DOS SERVIÇOS
# ========================================
log "4. Reiniciando serviços Docker..."
cd .. # Voltar para o diretório raiz do projeto
docker compose -f deploy/docker-compose.prod.yml down || true
docker compose -f deploy/docker-compose.prod.yml up -d --build
log "✅ Serviços Docker reiniciados!"

# ========================================
# 5. VERIFICAR STATUS
# ========================================
log "5. Verificando status dos serviços..."
docker compose -f deploy/docker-compose.prod.yml ps

log "🎉 Deploy concluído com sucesso!"
