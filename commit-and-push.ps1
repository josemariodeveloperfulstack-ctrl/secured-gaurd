# Script para fazer commit e push das mudanças

Write-Host "📝 Preparando commit..." -ForegroundColor Cyan

# Adicionar todos os arquivos modificados
git add -A

# Verificar status
Write-Host "`n📋 Status dos arquivos:" -ForegroundColor Yellow
git status --short

# Fazer commit
Write-Host "`n💾 Fazendo commit..." -ForegroundColor Cyan
git commit -m "feat: Organização hierárquica de documentos unificados e correção do health check

- Implementada organização por Empresa/Setor/Ano/Mês na aba Unificados
- Adicionada seleção em massa e ações em massa (Email, WhatsApp, Excluir)
- Corrigido health check do deploy CI com mais tempo e diagnóstico melhorado
- Aumentado tempo de espera inicial e número de tentativas
- Adicionada verificação prévia de containers e logs detalhados"

# Push para o repositório
Write-Host "`n🚀 Fazendo push..." -ForegroundColor Cyan
git push

Write-Host "`n✅ Commit e push concluídos!" -ForegroundColor Green

