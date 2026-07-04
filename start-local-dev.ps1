# ================================================
# SECURED GUARD - Iniciar Ambiente Local de Dev
# ================================================
# Uso: .\start-local-dev.ps1
# 
# Garante que o busconnect-frontend nao ocupa a porta 3000
# e sobe apenas o whatsapp do secured-guard (banco e redis
# ja estao rodando em containers externos).

Write-Host "`n[1/3] Parando containers que conflitam com o ambiente..." -ForegroundColor Cyan

# Para o frontend do busconnect que ocupa a porta 3000
$busconnectFrontend = docker ps -q --filter "name=busconnect-frontend" 2>$null
if ($busconnectFrontend) {
    docker stop busconnect-frontend | Out-Null
    Write-Host "  OK  busconnect-frontend parado (porta 3000 liberada)" -ForegroundColor Green
} else {
    Write-Host "  --  busconnect-frontend ja estava parado" -ForegroundColor Gray
}

Write-Host "`n[2/3] Subindo servico WhatsApp (Baileys)..." -ForegroundColor Cyan
docker-compose -f docker-compose.local.yml up -d whatsapp 2>&1 | Out-Null

$whatsapp = docker ps -q --filter "name=secured-guard-local-whatsapp" 2>$null
if ($whatsapp) {
    Write-Host "  OK  secured-guard-local-whatsapp rodando na porta 3333" -ForegroundColor Green
} else {
    Write-Host "  ERRO  Falha ao subir whatsapp. Verifique: docker logs secured-guard-local-whatsapp" -ForegroundColor Red
}

Write-Host "`n[3/3] Status final dos servicos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Banco (pg)        ->  localhost:5432  " -NoNewline
$pg = docker ps -q --filter "name=pg" 2>$null
if ($pg) { Write-Host "[RUNNING]" -ForegroundColor Green } else { Write-Host "[STOPPED]" -ForegroundColor Red }

Write-Host "  Redis             ->  localhost:6379  " -NoNewline
$redis = docker ps -q --filter "name=^redis$" 2>$null
if ($redis) { Write-Host "[RUNNING]" -ForegroundColor Green } else { Write-Host "[STOPPED]" -ForegroundColor Red }

Write-Host "  WhatsApp          ->  localhost:3333  " -NoNewline
$wa = docker ps -q --filter "name=secured-guard-local-whatsapp" 2>$null
if ($wa) { Write-Host "[RUNNING]" -ForegroundColor Green } else { Write-Host "[STOPPED]" -ForegroundColor Red }

Write-Host ""
Write-Host "Proximo passo:" -ForegroundColor Yellow
Write-Host "  1. Inicie o backend: perfil 'local' no IntelliJ/VS Code" -ForegroundColor White
Write-Host "  2. Inicie o frontend: cd frontend; npm run dev" -ForegroundColor White
Write-Host "  3. Acesse: https://localhost:3000" -ForegroundColor White
Write-Host ""
