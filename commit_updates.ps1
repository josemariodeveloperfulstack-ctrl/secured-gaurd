$gitPath = "C:\Program Files\Git\cmd\git.exe"

Write-Host "Adicionando alterações..."
& $gitPath add .

Write-Host "Realizando commit..."
& $gitPath commit -m "feat(frontend): UI improvements for Dependents, Training and Visits modals" -m "Melhorias de UI:" -m "- Novo design para modal de Dependentes (DependentFormModal)" -m "- Card de funcionário selecionado na tela de Dependentes" -m "- Correção de visibilidade do campo Cargo no modal de Treinamento" -m "- Filtro de supervisores no modal de Nova Visita"

Write-Host "Enviando para o repositório remoto (branch ci)..."
& $gitPath push origin ci

Write-Host "Concluído!"

