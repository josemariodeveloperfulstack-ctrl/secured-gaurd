const fs = require('fs');
const path = require('path');

const novoPath = path.join('C:', 'dev', 'secured-guard', 'frontend', 'src', 'components', 'funcionarios', 'FuncionarioNovoModal.tsx');
const editPath = path.join('C:', 'dev', 'secured-guard', 'frontend', 'src', 'components', 'funcionarios', 'FuncionarioEditModal.tsx');

const novoContent = fs.readFileSync(novoPath, 'utf8');
const editContent = fs.readFileSync(editPath, 'utf8');

// Find the return statement in Edit
const editReturnIndex = editContent.indexOf('  return (');
if (editReturnIndex === -1) {
    console.log('Error: Could not find "return (" in Edit');
    process.exit(1);
}

// Find the return statement in Novo
const novoReturnIndex = novoContent.indexOf('  return (');
if (novoReturnIndex === -1) {
    console.log('Error: Could not find "return (" in Novo');
    process.exit(1);
}

const editBeforeReturn = editContent.substring(0, editReturnIndex);
let novoReturnPart = novoContent.substring(novoReturnIndex);

// Replace specific text for Edit mode
novoReturnPart = novoReturnPart.replace(/Novo Funcionário/g, 'Editar Funcionário');
novoReturnPart = novoReturnPart.replace(/Cadastrar Novo Funcionário/g, 'Atualizar Funcionário');
novoReturnPart = novoReturnPart.replace(/"Cadastrar"/g, '"Salvar"');

const finalContent = editBeforeReturn + novoReturnPart;

fs.writeFileSync(editPath, finalContent, 'utf8');
console.log('Replaced JSX return block successfully');
