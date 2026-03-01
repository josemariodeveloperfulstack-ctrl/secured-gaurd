const fs = require('fs');
const path = require('path');

const novoPath = path.join('C:', 'dev', 'secured-guard', 'frontend', 'src', 'components', 'funcionarios', 'FuncionarioNovoModal.tsx');
const editPath = path.join('C:', 'dev', 'secured-guard', 'frontend', 'src', 'components', 'funcionarios', 'FuncionarioEditModal.tsx');

const novoContent = fs.readFileSync(novoPath, 'utf8');
const editContent = fs.readFileSync(editPath, 'utf8');

// Edit Modal
const editMarker = 'if (!funcionario && open) {';
const editMarkerIndex = editContent.indexOf(editMarker);
if (editMarkerIndex === -1) {
    console.log('Error: edit marker not found');
    process.exit(1);
}

const editReturnIndex = editContent.indexOf('return (', editMarkerIndex);
if (editReturnIndex === -1) {
    console.log('Error: return after edit marker not found');
    process.exit(1);
}

// Novo Modal
const novoMarker = 'const handleAccountingPreview = async () => {';
const novoMarkerIndex = novoContent.indexOf(novoMarker);
if (novoMarkerIndex === -1) {
    console.log('Error: novo marker not found');
    process.exit(1);
}

const novoReturnIndex = novoContent.indexOf('return (', novoMarkerIndex);
if (novoReturnIndex === -1) {
    console.log('Error: return after novo marker not found');
    process.exit(1);
}

const editBeforeReturn = editContent.substring(0, editReturnIndex);
let novoReturnPart = novoContent.substring(novoReturnIndex);

// Replace specific text for Edit mode
novoReturnPart = novoReturnPart.replace(/Novo Funcionário/g, 'Editar Funcionário');
novoReturnPart = novoReturnPart.replace(/Cadastrar Novo Funcionário/g, 'Atualizar Funcionário');
novoReturnPart = novoReturnPart.replace(/"Cadastrar"/g, '"Salvar"');

// Fix the onClose difference (Novo has onClose, Edit has only onOpenChange from props)
novoReturnPart = novoReturnPart.replace(/onClose=\{onClose\}/g, 'onClose={() => onOpenChange(false)}');
novoReturnPart = novoReturnPart.replace(/onClick=\{onClose\}/g, 'onClick={() => onOpenChange(false)}');

const finalContent = editBeforeReturn + novoReturnPart;

fs.writeFileSync(editPath, finalContent, 'utf8');
console.log('Replaced JSX return block successfully');
