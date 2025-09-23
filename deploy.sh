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
# 0. PREPARAR VARIÁVEIS (.env RAIZ)
# ========================================
log "0. Verificando arquivo .env na raiz do projeto..."
if [ ! -f ./.env ]; then
  warn "Arquivo .env não encontrado. Gerando um padrão seguro..."
  cat > ./.env << 'EOF'
POSTGRES_DB=secured_guard_prod
POSTGRES_USER=postgressg
POSTGRES_PASSWORD=Q9m!vSGci@2025productionA7#xLd

POSTGRES_DB_DEV=secured_guard_dev
POSTGRES_USER_DEV=postgressg
POSTGRES_PASSWORD_DEV=K4u^p3SGdev@2025noR8!z

POSTGRES_DB_CI=secured_guard_ci
POSTGRES_USER_CI=postgressg
POSTGRES_PASSWORD_CI=Bt7!cSGci@2025M4$qy

REDIS_PASSWORD=rP6@wZ!8cY2#qLmD
EOF
  log "✅ .env criado na raiz. Ajuste os valores se necessário."
else
  log "✅ .env encontrado."
fi

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
# 4. BANCO (PRODUÇÃO): SUBIR POSTGRES, CRIAR DB E AJUSTAR SENHA
# ========================================
log "4. Subindo Postgres (produção) e garantindo banco/usuário..."
cd .. # Voltar raiz do projeto
source ./.env
docker compose -f deploy/docker-compose.prod.yml up -d postgres
sleep 3
docker compose -f deploy/docker-compose.prod.yml exec postgres sh -c "psql -U postgres -tc \"SELECT 1 FROM pg_database WHERE datname='${POSTGRES_DB:-secured_guard_prod}'\" | grep -q 1 || psql -U postgres -c \"CREATE DATABASE ${POSTGRES_DB:-secured_guard_prod} OWNER ${POSTGRES_USER:-postgressg};\""
docker compose -f deploy/docker-compose.prod.yml exec postgres psql -U postgres -c "ALTER USER ${POSTGRES_USER:-postgressg} WITH PASSWORD '${POSTGRES_PASSWORD}';" || warn "Não foi possível alterar senha do usuário agora. Verifique volume existente."

# ========================================
# 5. BACKEND (PRODUÇÃO): SUBIR E DEIXAR FLYWAY RODAR
# ========================================
log "5. Subindo backend (produção) para executar migrações Flyway..."
docker compose -f deploy/docker-compose.prod.yml up -d backend
sleep 5
docker compose -f deploy/docker-compose.prod.yml logs --since=2m backend | grep -i flyway || true

# ========================================
# 6. RESTART FRONTEND/REDIS/NGINX (PRODUÇÃO)
# ========================================
log "6. Reiniciando demais serviços Docker (produção)..."
docker compose -f deploy/docker-compose.prod.yml up -d --build redis frontend nginx
log "✅ Serviços Docker (produção) atualizados!"

# ========================================
# 7. AMBIENTE DE DESENVOLVIMENTO (opcional)
# ========================================
if [ -f deploy/docker-compose.dev.yml ]; then
  log "7. Subindo Postgres (dev) e garantindo banco/usuário..."
  docker compose -f deploy/docker-compose.dev.yml up -d postgres
  sleep 3
  docker compose -f deploy/docker-compose.dev.yml exec postgres sh -c "psql -U postgres -tc \"SELECT 1 FROM pg_database WHERE datname='${POSTGRES_DB_DEV:-secured_guard_dev}'\" | grep -q 1 || psql -U postgres -c \"CREATE DATABASE ${POSTGRES_DB_DEV:-secured_guard_dev} OWNER ${POSTGRES_USER_DEV:-postgressg};\""
  docker compose -f deploy/docker-compose.dev.yml exec postgres psql -U postgres -c "ALTER USER ${POSTGRES_USER_DEV:-postgressg} WITH PASSWORD '${POSTGRES_PASSWORD_DEV}';" || warn "Não foi possível alterar senha do usuário dev agora."

  log "7.1 Subindo backend (dev) para executar migrações Flyway..."
  docker compose -f deploy/docker-compose.dev.yml up -d backend
  sleep 5
  docker compose -f deploy/docker-compose.dev.yml logs --since=2m backend | grep -i flyway || true
else
  warn "Compose de desenvolvimento não encontrado (deploy/docker-compose.dev.yml). Pulando dev."
fi

# ========================================
# 8. AMBIENTE DE CI (opcional)
# ========================================
if [ -f deploy/docker-compose.ci.yml ]; then
  log "8. Subindo Postgres (ci) e garantindo banco/usuário..."
  docker compose -f deploy/docker-compose.ci.yml up -d postgres
  sleep 3
  docker compose -f deploy/docker-compose.ci.yml exec postgres sh -c "psql -U postgres -tc \"SELECT 1 FROM pg_database WHERE datname='${POSTGRES_DB_CI:-secured_guard_ci}'\" | grep -q 1 || psql -U postgres -c \"CREATE DATABASE ${POSTGRES_DB_CI:-secured_guard_ci} OWNER ${POSTGRES_USER_CI:-postgressg};\""
  docker compose -f deploy/docker-compose.ci.yml exec postgres psql -U postgres -c "ALTER USER ${POSTGRES_USER_CI:-postgressg} WITH PASSWORD '${POSTGRES_PASSWORD_CI}';" || warn "Não foi possível alterar senha do usuário ci agora."

  log "8.1 Subindo backend (ci) para executar migrações Flyway..."
  docker compose -f deploy/docker-compose.ci.yml up -d backend
  sleep 5
  docker compose -f deploy/docker-compose.ci.yml logs --since=2m backend | grep -i flyway || true
else
  warn "Compose de CI não encontrado (deploy/docker-compose.ci.yml). Pulando ci."
fi

# ========================================
# 9. VERIFICAR STATUS
# ========================================
log "9. Verificando status dos serviços..."
docker compose -f deploy/docker-compose.prod.yml ps
if [ -f deploy/docker-compose.dev.yml ]; then docker compose -f deploy/docker-compose.dev.yml ps; fi
if [ -f deploy/docker-compose.ci.yml ]; then docker compose -f deploy/docker-compose.ci.yml ps; fi

log "🎉 Deploy concluído com sucesso!"
