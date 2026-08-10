# ============================================================
# SECURED GUARD - Restart Rapido do Backend (pula o Maven)
# ============================================================
# O mvnw spring-boot:run recompila TODOS os fontes (757 arquivos)
# a cada execucao. Este script sobe o backend direto na JVM usando
# o target/classes ja compilado + classpath de dependencias,
# sem passar pelo Maven (restart em ~10s).
#
# Uso:
#   .\iniciar-backend-rapido.ps1            (inicia com perfil local)
#   .\iniciar-backend-rapido.ps1 -Profile test
#   .\iniciar-backend-rapido.ps1 -SkipRecompile
# ============================================================

param(
    [string]$Profile = "",
    [switch]$SkipRecompile
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
Set-Location $backend

Write-Host ""
Write-Host "== SECURED GUARD - Backend (restart rapido) ==" -ForegroundColor Cyan

# 1. Compilar apenas se necessario (fontes mais novos que classes)
$appClass = Join-Path $backend "target\classes\com\z7design\secured_guard\SecuredGuardApplication.class"
$needCompile = -not (Test-Path $appClass)
if (-not $needCompile) {
    $newest = Get-ChildItem (Join-Path $backend "src") -Recurse -File |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($newest -and $newest.LastWriteTime -gt (Get-Item $appClass).LastWriteTime) {
        $needCompile = $true
    }
}
if ($needCompile -and -not $SkipRecompile) {
    Write-Host "[1/3] Compilando fontes alterados..." -ForegroundColor Yellow
    & .\mvnw.cmd -q compile -DskipTests
    if ($LASTEXITCODE -ne 0) { Write-Host "Falha na compilacao" -ForegroundColor Red; exit 1 }
} else {
    Write-Host "[1/3] Classes ja compiladas (skip)" -ForegroundColor Green
}

# 2. Montar classpath: target\classes + jars do .m2
#    O arquivo gerado pelo Maven pode vir com o caminho do usuario
#    corrompido (acentos/encoding). Corrigimos o prefixo .m2 para
#    o caminho REAL do usuario atual.
$cpFile = Join-Path $backend "target\classpath.txt"
if (-not (Test-Path $cpFile)) {
    Write-Host "[2/3] Gerando classpath de dependencias (primeira vez)... " -ForegroundColor Yellow
    & .\mvnw.cmd -q dependency:build-classpath "-Dmdep.outputFile=target\classpath.txt" "-DincludeScope=runtime" -DskipTests -o
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $cpFile)) {
        Write-Host "    Offline falhou, tentando online..." -ForegroundColor DarkYellow
        & .\mvnw.cmd -q dependency:build-classpath "-Dmdep.outputFile=target\classpath.txt" "-DincludeScope=runtime" -DskipTests
    }
    if (-not (Test-Path $cpFile)) { Write-Host "Falha ao gerar classpath" -ForegroundColor Red; exit 1 }
}
$userProfile = [System.Environment]::GetFolderPath("UserProfile")
$cpRaw = [System.IO.File]::ReadAllText($cpFile)
$cpRaw = $cpRaw -replace '(?i)C:\\Users\\[^\\]+\\\.m2\\repository', "$userProfile\.m2\repository"
$cp = "target\classes;" + $cpRaw.Trim()
Write-Host "[2/3] Classpath montado ($([Math]::Round($cp.Length / 1KB)) KB)" -ForegroundColor Green

# 3. Liberar a porta 8083 se algo estiver rodando
$port8083 = Get-NetTCPConnection -LocalPort 8083 -State Listen -ErrorAction SilentlyContinue
if ($port8083) {
    $pid8083 = $port8083 | Select-Object -First 1 -ExpandProperty OwningProcess
    Write-Host "[3/3] Porta 8083 ocupada pelo processo $pid8083 - encerrando..." -ForegroundColor Yellow
    Stop-Process -Id $pid8083 -Force
    Start-Sleep -Seconds 2
} else {
    Write-Host "[3/3] Porta 8083 livre" -ForegroundColor Green
}

# 4. Iniciar via variavel de ambiente CLASSPATH (evita limite de tamanho
#    da linha de comando, problemas de aspa/encoding do argfile e do PS)
$env:CLASSPATH = $cp

Write-Host "Iniciando backend (perfil: '$($Profile -replace '^$','local')')..." -ForegroundColor Cyan
Write-Host "Para parar: Ctrl+C`n" -ForegroundColor DarkGray
if ($Profile) {
    & java "-Dspring.profiles.active=$Profile" com.z7design.secured_guard.SecuredGuardApplication
} else {
    & java com.z7design.secured_guard.SecuredGuardApplication
}
