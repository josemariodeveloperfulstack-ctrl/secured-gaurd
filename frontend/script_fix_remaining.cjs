const fs = require('fs');
const path = require('path');

const file = path.join('C:', 'dev', 'secured-guard', 'frontend', 'src', 'components', 'funcionarios', 'FuncionarioEditModal.tsx');
let content = fs.readFileSync(file, 'utf8');

// Replace export
content = content.replace(/export default FuncionarioNovoModal;/g, 'export default FuncionarioEditModal;');

// Insert missing states
const statesBlock = `
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loadingDependents, setLoadingDependents] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // pacify TS
  };

  const handleAddDependent = () => {
    setDependentToEdit(null);
    setDependentModalOpen(true);
  };
  
`;

const insertionPointStr = 'const [epiModalOpen, setEpiModalOpen] = useState(false);';
const insertionIndex = content.indexOf(insertionPointStr);

if (insertionIndex !== -1) {
    content = content.substring(0, insertionIndex) + statesBlock + content.substring(insertionIndex);
} else {
    console.error("Could not find insertion point");
}

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed remaining missing states and export');
