#!/bin/bash

# ===================== COMANDOS PARA EXECUTAR NA VPS =====================
# Execute estes comandos um por vez na VPS

echo "🔍 Verificando status da VPS SecuredGuard..."
echo ""

echo "1️⃣ Verificando containers Docker:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "2️⃣ Verificando logs do backend (últimas 10 linhas):"
docker logs --tail 10 secured-guard-backend-1 2>/dev/null || echo "   ❌ Backend não encontrado"
echo ""

echo "3️⃣ Verificando logs do PostgreSQL (últimas 5 linhas):"
docker logs --tail 5 secured-guard-postgres-1 2>/dev/null || echo "   ❌ PostgreSQL não encontrado"
echo ""

echo "4️⃣ Verificando bancos de dados:"
docker exec secured-guard-postgres-1 psql -U postgressg -d postgres -c "SELECT datname FROM pg_database WHERE datname LIKE 'secured_guard%';" 2>/dev/null || echo "   ❌ Não foi possível conectar no PostgreSQL"
echo ""

echo "5️⃣ Testando endpoint do backend:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:8080/actuator/health 2>/dev/null || echo "   ❌ Backend não está respondendo"
echo ""

echo "6️⃣ Verificando uso de recursos:"
echo "   CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "   Memória: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "   Disco: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 " usado)"}')"
echo ""

echo "✅ Verificação concluída!"
