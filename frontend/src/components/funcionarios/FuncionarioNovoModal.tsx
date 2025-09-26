import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { employeeService } from '@/services/employeeService';
import { CreateEmployeeDTO } from '@/types/employee';
import { positionService, Position } from '@/services/positionService';
import { unitService, Unit } from '@/services/unitService';
import { userService } from '@/services/userService';
import { User } from '@/types/user';
import { companyService } from '@/services/companyService';
import { Company } from '@/types/company';
import { Search, User as UserIcon, Building, Briefcase, Plus, UserPlus, Link, X, FileText, Upload, FileCheck, AlertCircle } from 'lucide-react';
import NovoCargoModal from '@/components/funcionarios/NovoCargoModal';
import CriarUsuarioPadraoModal from '@/components/funcionarios/CriarUsuarioPadraoModal';
import { pdfProcessingService, EmployeeDataFromPDF } from '@/services/pdfProcessingService';

interface FuncionarioNovoModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const initialState: CreateEmployeeDTO = {
  name: '',
  cpf: '',
  rg: '',
  email: '',
  phone: '',
  address: '',
  birthDate: '',
  maritalStatus: 'SINGLE',
  nationality: 'Brasileiro',
  registrationNumber: '',
  hireDate: '',
  status: 'ACTIVE',
  position: {
    id: ''
  },
  unit: {
    id: ''
  },
  user: {
    id: ''
  }
};

const FuncionarioNovoModal: React.FC<FuncionarioNovoModalProps> = ({ open, onClose, onCreated }) => {
  const [form, setForm] = useState<CreateEmployeeDTO>(initialState);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para os dados dos selects
  const [positions, setPositions] = useState<Position[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // Estados para busca e filtros
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Estados para busca de cargos
  const [positionSearchTerm, setPositionSearchTerm] = useState('');
  const [filteredPositions, setFilteredPositions] = useState<Position[]>([]);
  const [showPositionDropdown, setShowPositionDropdown] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  
  // Estados para busca de empresas
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  
  // Estados para modal de novo cargo
  const [novoCargoModalOpen, setNovoCargoModalOpen] = useState(false);
  
  // Estados para modal de criar usuário padrão
  const [criarUsuarioModalOpen, setCriarUsuarioModalOpen] = useState(false);
  
  // Estados para dependentes
  const [dependents, setDependents] = useState<Array<{
    name: string;
    relationship: string;
    birthDate: string;
    cpf: string;
    rg: string;
  }>>([]);

  // Estados para importação de PDF
  const [showPDFImport, setShowPDFImport] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfProcessing, setPdfProcessing] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  // Carregar dados para os selects
  useEffect(() => {
    if (open) {
      loadSelectData();
    }
  }, [open]);

  // Buscar usuários no backend baseado no termo de busca
  useEffect(() => {
    const searchUsers = async () => {
      try {
        const searchResults = await userService.searchUsers(userSearchTerm);
        setFilteredUsers(searchResults);
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        setFilteredUsers([]);
      }
    };

    // Debounce para evitar muitas requisições
    const timeoutId = setTimeout(() => {
      searchUsers();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [userSearchTerm]);

  // Buscar cargos no backend baseado no termo de busca
  useEffect(() => {
    const searchPositions = async () => {
      try {
        const searchResults = await positionService.searchPositions(positionSearchTerm);
        setFilteredPositions(searchResults);
      } catch (error) {
        console.error('Erro ao buscar cargos:', error);
        setFilteredPositions([]);
      }
    };

    // Debounce para evitar muitas requisições
    const timeoutId = setTimeout(() => {
      searchPositions();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [positionSearchTerm]);

  // Atualizar usuário selecionado quando form.user muda
  useEffect(() => {
    if (form.user?.id) {
      const user = users.find(u => u.id === form.user.id);
      setSelectedUser(user || null);
      if (user) {
        setUserSearchTerm(user.name);
      }
    } else {
      setSelectedUser(null);
      setUserSearchTerm('');
    }
  }, [form.user?.id, users]);

  // Atualizar cargo selecionado quando form.position muda
  useEffect(() => {
    if (form.position?.id) {
      const position = positions.find(p => p.id === form.position.id);
      setSelectedPosition(position || null);
      if (position) {
        setPositionSearchTerm(position.name);
      }
    } else {
      setSelectedPosition(null);
      setPositionSearchTerm('');
    }
  }, [form.position?.id, positions]);

  // Buscar empresas no backend baseado no termo de busca
  useEffect(() => {
    const searchCompanies = async () => {
      try {
        const searchResults = await companyService.searchCompanies(companySearchTerm);
        setFilteredCompanies(searchResults);
      } catch (error) {
        console.error('Erro ao buscar empresas:', error);
        setFilteredCompanies([]);
      }
    };

    // Debounce para evitar muitas requisições
    const timeoutId = setTimeout(() => {
      searchCompanies();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [companySearchTerm]);

  const loadSelectData = async () => {
    setLoadingData(true);
    try {
      const [positionsData, unitsData, companiesData] = await Promise.all([
        positionService.searchPositions(), // Usar searchPositions para carregar todos
        unitService.getAllUnits(),
        companyService.getAllCompanies()
      ]);
      setPositions(positionsData);
      setFilteredPositions(positionsData);
      setUnits(unitsData);
      setCompanies(companiesData);
      setFilteredCompanies(companiesData);
      
      // Carregar usuários iniciais (sem filtro)
      const usersData = await userService.searchUsers();
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (err) {
      console.error('Erro ao carregar dados dos selects:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    if (value) {
      setForm((prev) => ({ 
        ...prev, 
        [field]: { id: value } 
      }));
    } else {
      setForm((prev) => {
        const newForm = { ...prev };
        if (field === 'position') {
          newForm.position = { id: '' };
        } else if (field === 'unit') {
          newForm.unit = { id: '' };
        } else if (field === 'user') {
          newForm.user = { id: '' };
        } else if (field === 'company') {
          newForm.company = { id: '' };
        }
        return newForm;
      });
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!form.position?.id) {
      setError('Cargo é obrigatório para criar um funcionário.');
      return;
    }
    if (!form.address) {
      setError('Endereço é obrigatório para criar um funcionário.');
      return;
    }

    // Validar dependentes
    for (let i = 0; i < dependents.length; i++) {
      const dependent = dependents[i];
      if (!dependent.name.trim()) {
        setError(`Nome do dependente ${i + 1} é obrigatório.`);
        return;
      }
      if (!dependent.relationship) {
        setError(`Parentesco do dependente ${i + 1} é obrigatório.`);
        return;
      }
      if (!dependent.birthDate) {
        setError(`Data de nascimento do dependente ${i + 1} é obrigatória.`);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      // Incluir dependentes no payload
      const employeeData = {
        ...form,
        dependents: dependents.map(dep => ({
          name: dep.name,
          relationship: dep.relationship,
          birthDate: dep.birthDate,
          cpf: dep.cpf || null,
          rg: dep.rg || null
        }))
      };
      
      const createdEmployee = await employeeService.createEmployee(employeeData);
      onCreated();
      
      // Após salvar o funcionário, abrir modal para criar usuário
      setCriarUsuarioModalOpen(true);
      
      // Não fechar o modal principal ainda, apenas limpar o formulário
      setForm(initialState);
      setPhotoPreview(null);
      setSelectedUser(null);
      setUserSearchTerm('');
      setSelectedPosition(null);
      setPositionSearchTerm('');
      setDependents([]);
    } catch (err: any) {
      console.error('Erro ao cadastrar funcionário:', err);
      
      // Tratar erros específicos
      if (err.message.includes('CPF já cadastrado')) {
        setError('CPF já cadastrado para outro funcionário');
      } else if (err.message.includes('Email já cadastrado')) {
        setError('Email já cadastrado para outro funcionário');
      } else {
        setError('Erro ao cadastrar funcionário.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(initialState);
    setPhotoPreview(null);
    setError(null);
    setUserSearchTerm('');
  };

  const handleCargoCreated = (cargo: { id: string; name: string; description: string }) => {
    // Adicionar o novo cargo à lista
    setPositions(prev => [...prev, cargo]);
    // Selecionar automaticamente o novo cargo
    setForm(prev => ({ ...prev, position: { id: cargo.id } }));
  };

  const handleUsuarioPadraoCriado = (usuario: User) => {
    // Adicionar o novo usuário à lista
    setUsers(prev => [...prev, usuario]);
    setFilteredUsers(prev => [...prev, usuario]);
    // Selecionar automaticamente o novo usuário
    setForm(prev => ({ ...prev, user: { id: usuario.id } }));
    setSelectedUser(usuario);
    setUserSearchTerm(usuario.name);
    setCriarUsuarioModalOpen(false);
    
    // Fechar o modal principal após criar o usuário
    onClose();
  };

  // Funções para importação de PDF
  const handlePDFFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setPdfError('Apenas arquivos PDF são aceitos');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        setPdfError('Arquivo muito grande. Máximo 10MB');
        return;
      }
      setPdfFile(file);
      setPdfError(null);
    }
  };

  const handleProcessPDF = async () => {
    if (!pdfFile) return;

    setPdfProcessing(true);
    setPdfError(null);
    setPdfSuccess(false);

    try {
      const result = await pdfProcessingService.processEmployeeRegistrationPDF(pdfFile);
      
      if (result.success && result.data) {
        // Preencher formulário com dados extraídos
        fillFormWithPDFData(result.data);
        setPdfSuccess(true);
        setShowPDFImport(false);
      } else {
        setPdfError(result.error || 'Erro ao processar PDF');
      }
    } catch (error) {
      console.error('Erro ao processar PDF:', error);
      setPdfError('Erro ao processar PDF. Tente novamente.');
    } finally {
      setPdfProcessing(false);
    }
  };

  const fillFormWithPDFData = (data: EmployeeDataFromPDF) => {
    setForm(prev => ({
      ...prev,
      name: data.name || prev.name,
      cpf: data.cpf || prev.cpf,
      rg: data.rg || prev.rg,
      birthDate: data.birthDate || prev.birthDate,
      nationality: data.nationality || prev.nationality,
      maritalStatus: data.maritalStatus || prev.maritalStatus,
      address: data.address || prev.address,
      city: data.city || prev.city,
      cep: data.cep || prev.cep,
      hireDate: data.hireDate || prev.hireDate,
      email: data.email || prev.email,
      phone: data.phone || prev.phone,
      notes: data.notes || prev.notes,
      
      // Campos adicionais
      tituloEleitor: data.tituloEleitor || prev.tituloEleitor,
      tituloEleitorZona: data.tituloEleitorZona || prev.tituloEleitorZona,
      carteiraIdentidadeOrgaoEmissor: data.carteiraIdentidadeOrgaoEmissor || prev.carteiraIdentidadeOrgaoEmissor,
      cnhNumber: data.cnhNumber || prev.cnhNumber,
      certificadoMilitar: data.certificadoMilitar || prev.certificadoMilitar,
      nomePai: data.nomePai || prev.nomePai,
      nomeMae: data.nomeMae || prev.nomeMae,
      localNascimento: data.localNascimento || prev.localNascimento,
      grauInstrucao: data.grauInstrucao || prev.grauInstrucao,
      cbo: data.cbo || prev.cbo,
      salario: data.salary || prev.salario,
      salarioPorExtenso: data.salarioPorExtenso || prev.salarioPorExtenso,
      periodoPagamento: data.periodoPagamento || prev.periodoPagamento,
      horarioTrabalho: data.horarioTrabalho || prev.horarioTrabalho,
      folgaSemanal: data.folgaSemanal || prev.folgaSemanal,
      fgtsOptante: data.fgtsOptante !== undefined ? data.fgtsOptante : prev.fgtsOptante,
      fgtsDataOpcao: data.fgtsDataOpcao || prev.fgtsDataOpcao,
      fgtsBancoDepositario: data.fgtsBancoDepositario || prev.fgtsBancoDepositario,
      pis: data.pis || prev.pis,
      pisDataCadastro: data.pisDataCadastro || prev.pisDataCadastro,
      pisBancoDepositario: data.pisBancoDepositario || prev.pisBancoDepositario,
      empresaNome: data.empresaNome || prev.empresaNome,
      empresaEndereco: data.empresaEndereco || prev.empresaEndereco,
      empresaCnpj: data.empresaCnpj || prev.empresaCnpj,
      vistoFiscalizacao: data.vistoFiscalizacao || prev.vistoFiscalizacao,
      
      // Dados do cônjuge
      spouseName: data.spouseName || prev.spouseName,
      spouseCpf: data.spouseCpf || prev.spouseCpf,
      spouseRg: data.spouseRg || prev.spouseRg,
      spouseBirthDate: data.spouseBirthDate || prev.spouseBirthDate,
      spouseProfession: data.spouseProfession || prev.spouseProfession,
      spousePhone: data.spousePhone || prev.spousePhone,
    }));

    // Se há dados de dependentes, adicionar
    if (data.dependents && data.dependents.length > 0) {
      setDependents(data.dependents);
    }
  };

  const handleUserSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserSearchTerm(value);
    setShowUserDropdown(true);
    
    // Se o campo estiver vazio, limpar seleção
    if (value.trim() === '') {
      setForm(prev => ({ ...prev, user: { id: '' } }));
      setSelectedUser(null);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setUserSearchTerm(user.name);
    setForm(prev => ({ ...prev, user: { id: user.id } }));
    setShowUserDropdown(false);
  };

  const handleUserInputFocus = () => {
    setShowUserDropdown(true);
  };

  const handleUserInputBlur = () => {
    // Delay para permitir clique no dropdown
    setTimeout(() => {
      setShowUserDropdown(false);
    }, 200);
  };

  const handlePositionSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPositionSearchTerm(value);
    setShowPositionDropdown(true);
  };

  const handlePositionSelect = (position: Position) => {
    setSelectedPosition(position);
    setPositionSearchTerm(position.name);
    setForm(prev => ({ ...prev, position: { id: position.id } }));
    setShowPositionDropdown(false);
  };

  const handlePositionInputFocus = () => {
    setShowPositionDropdown(true);
  };

  const handlePositionInputBlur = () => {
    // Delay para permitir clique no dropdown
    setTimeout(() => {
      setShowPositionDropdown(false);
    }, 200);
  };

  const handleCompanySearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCompanySearchTerm(value);
    setShowCompanyDropdown(true);
  };

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company);
    setCompanySearchTerm(`${company.name} (${company.cnpj || 'Sem CNPJ'})`);
    setForm(prev => ({ ...prev, company: { id: company.id } }));
    setShowCompanyDropdown(false);
  };

  const handleCompanyInputFocus = () => {
    setShowCompanyDropdown(true);
  };

  const handleCompanyInputBlur = () => {
    // Delay para permitir clique no dropdown
    setTimeout(() => {
      setShowCompanyDropdown(false);
    }, 200);
  };

  // Funções para gerenciar dependentes
  const addDependent = () => {
    setDependents(prev => [...prev, {
      name: '',
      relationship: '',
      birthDate: '',
      cpf: '',
      rg: ''
    }]);
  };

  const removeDependent = (index: number) => {
    setDependents(prev => prev.filter((_, i) => i !== index));
  };

  const updateDependent = (index: number, field: string, value: string) => {
    setDependents(prev => prev.map((dependent, i) => 
      i === index ? { ...dependent, [field]: value } : dependent
    ));
  };

  // Verificar se o cargo selecionado permite criação de usuário padrão
  const canCreateDefaultUser = selectedPosition && 
    ['Vigia', 'Vigilante', 'Porteiro', 'Auxiliar de Serviços Gerais', 'Supervisor'].some(cargo => 
      selectedPosition.name.toLowerCase().includes(cargo.toLowerCase())
    );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-2 sm:p-4 overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Novo Funcionário</DialogTitle>
          <p className="text-sm text-gray-400">
            Preencha os dados do funcionário. Campos marcados com * são obrigatórios.
          </p>
          
          {/* Botão de Importação de PDF */}
          <div className="flex justify-end mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPDFImport(!showPDFImport)}
              className="flex items-center gap-2 border-seguranca-yellow text-seguranca-yellow hover:bg-seguranca-yellow hover:text-seguranca-black"
            >
              <Upload className="h-4 w-4" />
              Importar PDF
            </Button>
          </div>
          
          {/* Seção de Importação de PDF */}
          {showPDFImport && (
            <div className="mt-4 p-4 bg-seguranca-darkgray rounded-lg border border-seguranca-lightgray/20">
              <h4 className="text-lg font-semibold text-seguranca-yellow mb-3 flex items-center">
                <FileCheck className="mr-2" size={20} />
                Importar FICHA DE REGISTRO DOS EMPREGADOS
              </h4>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-seguranca-lightgray">
                    Selecionar arquivo PDF
                  </Label>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={handlePDFFileChange}
                    className="mt-1 bg-seguranca-black border-seguranca-lightgray/30 text-white"
                  />
                  <p className="text-xs text-seguranca-lightgray/60 mt-1">
                    Apenas arquivos PDF. Máximo 10MB.
                  </p>
                </div>
                
                {pdfFile && (
                  <div className="flex items-center gap-2 p-2 bg-seguranca-black rounded border border-seguranca-lightgray/30">
                    <FileText className="h-4 w-4 text-seguranca-yellow" />
                    <span className="text-sm text-white">{pdfFile.name}</span>
                    <span className="text-xs text-seguranca-lightgray/60">
                      ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                )}
                
                {pdfError && (
                  <div className="flex items-center gap-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{pdfError}</span>
                  </div>
                )}
                
                {pdfSuccess && (
                  <div className="flex items-center gap-2 p-2 bg-green-900/20 border border-green-500/30 rounded text-green-400">
                    <FileCheck className="h-4 w-4" />
                    <span className="text-sm">PDF processado com sucesso! Formulário preenchido automaticamente.</span>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleProcessPDF}
                    disabled={!pdfFile || pdfProcessing}
                    className="flex items-center gap-2 bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
                  >
                    {pdfProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-seguranca-black"></div>
                        Processando...
                      </>
                    ) : (
                      <>
                        <FileCheck className="h-4 w-4" />
                        Processar PDF
                      </>
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPDFImport(false);
                      setPdfFile(null);
                      setPdfError(null);
                      setPdfSuccess(false);
                    }}
                    className="border-seguranca-lightgray/30 text-seguranca-lightgray hover:bg-seguranca-lightgray/10"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogHeader>
        
                 <form onSubmit={handleSubmit} className="space-y-6">
           {/* Seção: Relacionamentos Obrigatórios */}
           <div className="space-y-4 bg-[#363636] p-4 rounded-lg">
             <h3 className="text-lg font-semibold flex items-center text-white">
               <UserIcon className="mr-2" size={20} />
               Relacionamentos Obrigatórios
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Seleção de Usuário */}
               <div className="space-y-2">
                 <Label className="text-sm font-medium text-gray-200">
                   Usuário do Sistema
                 </Label>
                 <div className="relative">
                   <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                   <Input
                     placeholder="Digite para buscar usuário..."
                     value={userSearchTerm}
                     onChange={handleUserSearch}
                     onFocus={handleUserInputFocus}
                     onBlur={handleUserInputBlur}
                     className="pl-10"
                   />
                   
                   {/* Dropdown de usuários */}
                   {showUserDropdown && filteredUsers.length > 0 && (
                     <div className="absolute z-50 w-full mt-1 bg-seguranca-graphite border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                       {filteredUsers.map((user) => (
                         <div
                           key={user.id}
                           className="px-3 py-2 hover:bg-gray-700 cursor-pointer border-b border-gray-600 last:border-b-0"
                           onClick={() => handleUserSelect(user)}
                         >
                           <div className="flex flex-col">
                             <span className="font-medium text-seguranca-lightgray">{user.name}</span>
                             <span className="text-xs text-gray-400">
                               {user.email} • {user.username} • {user.role}
                             </span>
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                   
                   {/* Mensagem quando não há resultados */}
                   {showUserDropdown && userSearchTerm.trim() !== '' && filteredUsers.length === 0 && (
                     <div className="absolute z-50 w-full mt-1 bg-seguranca-graphite border border-gray-600 rounded-lg shadow-lg p-3">
                       <p className="text-sm text-gray-400">Nenhum usuário encontrado</p>
                     </div>
                   )}
                 </div>
                 
                 {/* Exibir usuário selecionado */}
                 {selectedUser && (
                   <div className="bg-green-900/20 border border-green-600 rounded-lg p-3">
                     <div className="flex items-center justify-between">
                       <div>
                         <p className="text-sm font-medium text-green-400">Usuário selecionado:</p>
                         <p className="text-sm text-seguranca-lightgray">{selectedUser.name}</p>
                         <p className="text-xs text-gray-400">{selectedUser.email}</p>
                       </div>
                       <Button
                         type="button"
                         variant="ghost"
                         size="sm"
                         onClick={() => {
                           setSelectedUser(null);
                           setUserSearchTerm('');
                           setForm(prev => ({ ...prev, user: { id: '' } }));
                         }}
                         className="text-red-400 hover:text-red-300"
                       >
                         <X className="h-4 w-4" />
                       </Button>
                     </div>
                   </div>
                 )}
                 <div className="flex items-center justify-between">
                 <p className="text-xs text-gray-300">
                   O usuário selecionado será associado ao funcionário para acesso ao sistema. (Opcional)
                   {canCreateDefaultUser && (
                     <span className="block mt-1 text-seguranca-yellow">
                       Para este cargo, é recomendado criar um usuário padrão.
                     </span>
                   )}
                 </p>
                   {canCreateDefaultUser && (
                     <Button
                       type="button"
                       variant="ghost"
                       size="sm"
                       onClick={() => setCriarUsuarioModalOpen(true)}
                       className="text-seguranca-yellow hover:text-yellow-400 text-xs px-2 py-1 h-auto"
                     >
                       <UserPlus className="h-3 w-3 mr-1" />
                       Criar Usuário Padrão
                       <Link className="h-3 w-3 ml-1" />
                     </Button>
                   )}
                 </div>
               </div>

               {/* Seleção de Cargo */}
               <div className="space-y-2">
                 <Label className="text-sm font-medium text-gray-200">
                   Cargo * <span className="text-red-400">*</span>
                 </Label>
                 <div className="relative">
                   <div className="flex gap-2">
                     <div className="relative flex-1">
                       <Input
                         type="text"
                         value={positionSearchTerm}
                         onChange={handlePositionSearch}
                         onFocus={handlePositionInputFocus}
                         onBlur={handlePositionInputBlur}
                         placeholder="Digite para buscar cargo..."
                         className="pr-10"
                       />
                       <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                       
                       {/* Dropdown de cargos */}
                       {showPositionDropdown && (
                         <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                           {filteredPositions.length > 0 ? (
                             filteredPositions.map((position) => (
                               <div
                                 key={position.id}
                                 className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center"
                                 onClick={() => handlePositionSelect(position)}
                               >
                                 <Briefcase className="mr-2" size={16} />
                                 <div className="flex-1">
                                   <div className="font-medium">{position.name}</div>
                                   {position.description && (
                                     <div className="text-xs text-gray-500 dark:text-gray-400">
                                       {position.description}
                                     </div>
                                   )}
                                 </div>
                               </div>
                             ))
                           ) : (
                             <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
                               Nenhum cargo encontrado
                             </div>
                           )}
                         </div>
                       )}
                     </div>
                     <Button
                       type="button"
                       variant="outline"
                       size="sm"
                       onClick={() => setNovoCargoModalOpen(true)}
                       className="px-3 flex-shrink-0"
                       title="Criar novo cargo"
                     >
                       <Plus size={16} />
                     </Button>
                   </div>
                   
                   {/* Cargo selecionado */}
                   {selectedPosition && (
                     <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md flex items-center justify-between">
                       <div className="flex items-center">
                         <Briefcase className="mr-2 text-blue-600 dark:text-blue-400" size={16} />
                         <span className="text-sm text-blue-800 dark:text-blue-200">
                           {selectedPosition.name}
                         </span>
                       </div>
                       <Button
                         type="button"
                         variant="ghost"
                         size="sm"
                         onClick={() => {
                           setSelectedPosition(null);
                           setPositionSearchTerm('');
                           setForm(prev => ({ ...prev, position: { id: '' } }));
                         }}
                         className="text-red-400 hover:text-red-300"
                       >
                         <X className="h-4 w-4" />
                       </Button>
                     </div>
                   )}
                 </div>
                 <p className="text-xs text-gray-300">
                   Digite para buscar cargos existentes ou clique no botão + para criar um novo.
                 </p>
               </div>
             </div>
           </div>

           {/* Seção: Informações Pessoais */}
           <div className="space-y-4 bg-[#363636] p-4 rounded-lg">
             <h3 className="text-lg font-semibold text-white">Informações Pessoais</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <Label className="text-sm font-medium text-gray-200">Nome Completo *</Label>
                 <Input 
                   name="name" 
                   value={form.name} 
                   onChange={handleChange} 
                   required 
                 />
               </div>
               <div>
                 <Label className="text-sm font-medium text-gray-200">CPF *</Label>
                 <Input 
                   name="cpf" 
                   value={form.cpf} 
                   onChange={handleChange} 
                   required 
                   placeholder="000.000.000-00"
                 />
               </div>
               <div>
                 <Label className="text-sm font-medium text-gray-200">RG *</Label>
                 <Input 
                   name="rg" 
                   value={form.rg} 
                   onChange={handleChange} 
                   required 
                 />
               </div>
               <div>
                 <Label className="text-sm font-medium text-gray-200">Data de Nascimento *</Label>
                 <Input 
                   name="birthDate" 
                   type="date" 
                   value={form.birthDate} 
                   onChange={handleChange} 
                   required 
                 />
               </div>
               <div>
                 <Label className="text-sm font-medium text-gray-200">Estado Civil</Label>
                 <Select 
                   value={form.maritalStatus} 
                   onValueChange={(value) => setForm(prev => ({ ...prev, maritalStatus: value }))}
                 >
                   <SelectTrigger>
                     <SelectValue placeholder="Selecione o estado civil" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="SINGLE">Solteiro</SelectItem>
                     <SelectItem value="MARRIED">Casado</SelectItem>
                     <SelectItem value="DIVORCED">Divorciado</SelectItem>
                     <SelectItem value="WIDOWED">Viúvo</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               <div>
                 <Label className="text-sm font-medium text-gray-200">Nacionalidade</Label>
                 <Input 
                   name="nationality" 
                   value={form.nationality} 
                   onChange={handleChange} 
                 />
               </div>
             </div>
             
             {/* Seção de Documentos Pessoais */}
             <div className="mt-4 pt-4 border-t border-gray-600">
               <h4 className="text-md font-semibold text-seguranca-yellow mb-4 flex items-center">
                 <FileText className="mr-2" size={16} />
                 Documentos Pessoais
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {/* CNH */}
                 <div>
                   <Label className="text-sm font-medium text-gray-200">Número da CNH</Label>
                   <Input 
                     name="cnhNumber" 
                     value={form.cnhNumber || ''} 
                     onChange={handleChange} 
                     placeholder="00000000000"
                   />
                 </div>
                 <div>
                   <Label className="text-sm font-medium text-gray-200">Categoria da CNH</Label>
                   <Select 
                     value={form.cnhCategory || ''} 
                     onValueChange={(value) => setForm(prev => ({ ...prev, cnhCategory: value }))}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Selecione a categoria" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="A">A - Motocicleta</SelectItem>
                       <SelectItem value="B">B - Carro</SelectItem>
                       <SelectItem value="C">C - Caminhão</SelectItem>
                       <SelectItem value="D">D - Ônibus</SelectItem>
                       <SelectItem value="E">E - Carreta</SelectItem>
                       <SelectItem value="AB">AB - Moto e Carro</SelectItem>
                       <SelectItem value="AC">AC - Moto e Caminhão</SelectItem>
                       <SelectItem value="AD">AD - Moto e Ônibus</SelectItem>
                       <SelectItem value="AE">AE - Moto e Carreta</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div>
                   <Label className="text-sm font-medium text-gray-200">Validade da CNH</Label>
                   <Input 
                     name="cnhExpirationDate" 
                     type="date" 
                     value={form.cnhExpirationDate || ''} 
                     onChange={handleChange} 
                   />
                 </div>
                 
                 {/* CTPS */}
                 <div>
                   <Label className="text-sm font-medium text-gray-200">Número da CTPS</Label>
                   <Input 
                     name="ctps" 
                     value={form.ctps || ''} 
                     onChange={handleChange} 
                     placeholder="0000000"
                   />
                 </div>
                 <div>
                   <Label className="text-sm font-medium text-gray-200">Série da CTPS</Label>
                   <Input 
                     name="ctpsSeries" 
                     value={form.ctpsSeries || ''} 
                     onChange={handleChange} 
                     placeholder="0000"
                   />
                 </div>
                 <div>
                   <Label className="text-sm font-medium text-gray-200">Data de Emissão da CTPS</Label>
                   <Input 
                     name="ctpsIssueDate" 
                     type="date" 
                     value={form.ctpsIssueDate || ''} 
                     onChange={handleChange} 
                   />
                 </div>
                 <div>
                   <Label className="text-sm font-medium text-gray-200">Órgão Emissor da CTPS</Label>
                   <Input 
                     name="ctpsIssuingAgency" 
                     value={form.ctpsIssuingAgency || ''} 
                     onChange={handleChange} 
                     placeholder="Ex: SSP, DETRAN"
                   />
                 </div>
               </div>
             </div>
             
             {/* Seção de dados do cônjuge - aparece apenas se estado civil for "Casado" */}
             {form.maritalStatus === 'MARRIED' && (
               <div className="mt-4 pt-4 border-t border-gray-600">
                 <h4 className="text-md font-semibold text-seguranca-yellow mb-4 flex items-center">
                   <UserIcon className="mr-2" size={16} />
                   Dados do Cônjuge
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <Label className="text-sm font-medium text-gray-200">Nome do Cônjuge *</Label>
                     <Input 
                       name="spouseName" 
                       value={form.spouseName || ''} 
                       onChange={handleChange} 
                       required 
                       placeholder="Nome completo do cônjuge"
                     />
                   </div>
                   <div>
                     <Label className="text-sm font-medium text-gray-200">CPF do Cônjuge *</Label>
                     <Input 
                       name="spouseCpf" 
                       value={form.spouseCpf || ''} 
                       onChange={handleChange} 
                       required 
                       placeholder="000.000.000-00"
                     />
                   </div>
                   <div>
                     <Label className="text-sm font-medium text-gray-200">RG do Cônjuge *</Label>
                     <Input 
                       name="spouseRg" 
                       value={form.spouseRg || ''} 
                       onChange={handleChange} 
                       required 
                       placeholder="Número do RG"
                     />
                   </div>
                   <div>
                     <Label className="text-sm font-medium text-gray-200">Data de Nascimento do Cônjuge *</Label>
                     <Input 
                       name="spouseBirthDate" 
                       type="date" 
                       value={form.spouseBirthDate || ''} 
                       onChange={handleChange} 
                       required 
                     />
                   </div>
                   <div>
                     <Label className="text-sm font-medium text-gray-200">Profissão do Cônjuge</Label>
                     <Input 
                       name="spouseProfession" 
                       value={form.spouseProfession || ''} 
                       onChange={handleChange} 
                       placeholder="Profissão do cônjuge"
                     />
                   </div>
                   <div>
                     <Label className="text-sm font-medium text-gray-200">Telefone do Cônjuge</Label>
                     <Input 
                       name="spousePhone" 
                       value={form.spousePhone || ''} 
                       onChange={handleChange} 
                       placeholder="(00) 00000-0000"
                     />
                   </div>
                 </div>
               </div>
             )}
             
             {/* Seção de dependentes - sempre visível */}
             <div className="mt-4 pt-4 border-t border-gray-600">
               <h4 className="text-md font-semibold text-seguranca-yellow mb-4 flex items-center">
                 <UserIcon className="mr-2" size={16} />
                 Dependentes
               </h4>
               <div className="space-y-4">
                 {dependents.map((dependent, index) => (
                   <div key={index} className="bg-gray-700 p-4 rounded-lg">
                     <div className="flex items-center justify-between mb-3">
                       <h5 className="text-sm font-medium text-white">Dependente {index + 1}</h5>
                       <Button
                         type="button"
                         variant="ghost"
                         size="sm"
                         onClick={() => removeDependent(index)}
                         className="text-red-400 hover:text-red-300"
                       >
                         <X className="h-4 w-4" />
                       </Button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                         <Label className="text-sm font-medium text-gray-200">Nome do Dependente *</Label>
                         <Input 
                           value={dependent.name} 
                           onChange={(e) => updateDependent(index, 'name', e.target.value)}
                           required 
                           placeholder="Nome completo do dependente"
                         />
                       </div>
                       <div>
                         <Label className="text-sm font-medium text-gray-200">Parentesco *</Label>
                         <Select 
                           value={dependent.relationship} 
                           onValueChange={(value) => updateDependent(index, 'relationship', value)}
                         >
                           <SelectTrigger>
                             <SelectValue placeholder="Selecione o parentesco" />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="FILHO">Filho(a)</SelectItem>
                             <SelectItem value="FILHA">Filha</SelectItem>
                             <SelectItem value="ESPOSO">Esposo</SelectItem>
                             <SelectItem value="ESPOSA">Esposa</SelectItem>
                             <SelectItem value="PAI">Pai</SelectItem>
                             <SelectItem value="MAE">Mãe</SelectItem>
                             <SelectItem value="IRMAO">Irmão</SelectItem>
                             <SelectItem value="IRMA">Irmã</SelectItem>
                             <SelectItem value="NETO">Neto(a)</SelectItem>
                             <SelectItem value="OUTRO">Outro</SelectItem>
                           </SelectContent>
                         </Select>
                       </div>
                       <div>
                         <Label className="text-sm font-medium text-gray-200">Data de Nascimento *</Label>
                         <Input 
                           type="date" 
                           value={dependent.birthDate} 
                           onChange={(e) => updateDependent(index, 'birthDate', e.target.value)}
                           required 
                         />
                       </div>
                       <div>
                         <Label className="text-sm font-medium text-gray-200">CPF</Label>
                         <Input 
                           value={dependent.cpf} 
                           onChange={(e) => updateDependent(index, 'cpf', e.target.value)}
                           placeholder="000.000.000-00"
                         />
                       </div>
                       <div>
                         <Label className="text-sm font-medium text-gray-200">RG</Label>
                         <Input 
                           value={dependent.rg} 
                           onChange={(e) => updateDependent(index, 'rg', e.target.value)}
                           placeholder="Número do RG"
                         />
                       </div>
                     </div>
                   </div>
                 ))}
                 
                 <Button
                   type="button"
                   variant="outline"
                   onClick={addDependent}
                   className="w-full border-dashed border-gray-500 text-gray-400 hover:text-white hover:border-white"
                 >
                   <Plus className="mr-2" size={16} />
                   Adicionar Dependente
                 </Button>
               </div>
             </div>
           </div>

           {/* Seção: Informações de Contato */}
           <div className="space-y-4 bg-[#363636] p-4 rounded-lg">
             <h3 className="text-lg font-semibold text-white">Informações de Contato</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <Label className="text-sm font-medium text-gray-200">Email *</Label>
                 <Input 
                   name="email" 
                   type="email" 
                   value={form.email} 
                   onChange={handleChange} 
                   required 
                 />
               </div>
               <div>
                 <Label className="text-sm font-medium text-gray-200">Telefone *</Label>
                 <Input 
                   name="phone" 
                   value={form.phone} 
                   onChange={handleChange} 
                   required 
                   placeholder="(00) 00000-0000"
                 />
               </div>
               <div className="md:col-span-2">
                 <Label className="text-sm font-medium text-gray-200">Endereço *</Label>
                 <Input 
                   name="address" 
                   value={form.address} 
                   onChange={handleChange} 
                   required 
                   placeholder="Rua, número, bairro, cidade - estado, CEP"
                 />
               </div>
             </div>
           </div>

           {/* Seção: Informações Profissionais */}
           <div className="space-y-4 bg-[#363636] p-4 rounded-lg">
             <h3 className="text-lg font-semibold flex items-center text-white">
               <Building className="mr-2" size={20} />
               Informações Profissionais
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <Label className="text-sm font-medium text-gray-200">Número de Registro *</Label>
                 <Input 
                   name="registrationNumber" 
                   value={form.registrationNumber} 
                   onChange={handleChange} 
                   required 
                   placeholder="EMP001"
                 />
               </div>
               <div>
                 <Label className="text-sm font-medium text-gray-200">Data de Admissão *</Label>
                 <Input 
                   name="hireDate" 
                   type="date" 
                   value={form.hireDate} 
                   onChange={handleChange} 
                   required 
                 />
               </div>
               <div>
                 <Label className="text-sm font-medium text-gray-200">Status *</Label>
                 <Select 
                   value={form.status} 
                   onValueChange={(value) => setForm(prev => ({ ...prev, status: value }))}
                 >
                   <SelectTrigger>
                     <SelectValue placeholder="Selecione o status" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="ACTIVE">Ativo</SelectItem>
                     <SelectItem value="INACTIVE">Inativo</SelectItem>
                     <SelectItem value="VACATION">Férias</SelectItem>
                     <SelectItem value="TERMINATED">Demitido</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               <div>
                 <Label className="text-sm font-medium text-gray-200">Unidade (Opcional)</Label>
                 <Select 
                   value={form.unit?.id || ''} 
                   onValueChange={(value) => handleSelectChange('unit', value)}
                 >
                   <SelectTrigger>
                     <SelectValue placeholder="Selecione uma unidade" />
                   </SelectTrigger>
                   <SelectContent>
                     {units.map((unit) => (
                       <SelectItem key={unit.id} value={unit.id}>
                         <div className="flex items-center">
                           <Building className="mr-2" size={16} />
                           {unit.name}
                         </div>
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               <div>
                 <Label className="text-sm font-medium text-gray-200">Empresa (Opcional)</Label>
                 <div className="relative">
                   <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                   <Input
                     placeholder="Digite para buscar empresa..."
                     value={companySearchTerm}
                     onChange={handleCompanySearch}
                     onFocus={handleCompanyInputFocus}
                     onBlur={handleCompanyInputBlur}
                     className="pl-10"
                   />
                   
                   {/* Dropdown de empresas */}
                   {showCompanyDropdown && filteredCompanies.length > 0 && (
                     <div className="absolute z-50 w-full mt-1 bg-seguranca-graphite border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                       {filteredCompanies.map((company) => (
                         <div
                           key={company.id}
                           className="px-3 py-2 hover:bg-gray-700 cursor-pointer border-b border-gray-600 last:border-b-0"
                           onClick={() => handleCompanySelect(company)}
                         >
                           <div className="flex flex-col">
                             <span className="font-medium text-seguranca-lightgray">{company.name}</span>
                             <span className="text-xs text-gray-400">
                               {company.cnpj ? `CNPJ: ${company.cnpj}` : 'Sem CNPJ'} • {company.status}
                             </span>
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
                 
                 {/* Empresa selecionada */}
                 {selectedCompany && (
                   <div className="mt-2 p-2 bg-gray-700 rounded-lg flex items-center justify-between">
                     <div className="flex items-center">
                       <Building className="mr-2 text-seguranca-yellow" size={16} />
                       <div>
                         <span className="text-seguranca-lightgray font-medium">{selectedCompany.name}</span>
                         <span className="text-xs text-gray-400 block">
                           {selectedCompany.cnpj ? `CNPJ: ${selectedCompany.cnpj}` : 'Sem CNPJ'}
                         </span>
                       </div>
                     </div>
                     <Button
                       type="button"
                       variant="ghost"
                       size="sm"
                       onClick={() => {
                         setSelectedCompany(null);
                         setCompanySearchTerm('');
                         setForm(prev => ({ ...prev, company: { id: '' } }));
                       }}
                       className="text-red-400 hover:text-red-300"
                     >
                       <X className="h-4 w-4" />
                     </Button>
                   </div>
                 )}
               </div>
             </div>
           </div>

           {/* Seção: Foto e Observações */}
           <div className="space-y-4 bg-[#363636] p-4 rounded-lg">
             <h3 className="text-lg font-semibold text-white">Documentos e Observações</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <Label className="text-sm font-medium text-gray-200">Foto 3x4</Label>
                 <Input 
                   type="file" 
                   accept="image/*" 
                   onChange={handlePhotoChange} 
                 />
                 {photoPreview && (
                   <img 
                     src={photoPreview} 
                     alt="Prévia" 
                     className="mt-2 w-24 h-24 rounded object-cover border" 
                   />
                 )}
               </div>
               <div>
                 <Label className="text-sm font-medium text-gray-200">Observações</Label>
                 <textarea
                   name="notes"
                   value={form.notes || ''}
                   onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                   rows={3}
                   className="w-full rounded px-3 py-2 resize-none border border-gray-600 bg-gray-700 text-white"
                   placeholder="Observações sobre o funcionário..."
                 />
               </div>
             </div>
           </div>
          
                     {error && (
             <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
               <p className="text-destructive text-sm">{error}</p>
             </div>
           )}
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={resetForm}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Limpar Formulário
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
                         <Button 
               type="submit" 
               disabled={loading || loadingData || !form.position?.id}
               className="w-full sm:w-auto"
             >
               {loading ? 'Salvando...' : 'Cadastrar Funcionário'}
             </Button>
                     </DialogFooter>
         </form>
       </DialogContent>
       
       {/* Modal de Novo Cargo */}
       <NovoCargoModal
         open={novoCargoModalOpen}
         onClose={() => setNovoCargoModalOpen(false)}
         onCargoCreated={handleCargoCreated}
       />

       {/* Modal de Criar Usuário Padrão */}
       <CriarUsuarioPadraoModal
         open={criarUsuarioModalOpen}
         onClose={() => {
           setCriarUsuarioModalOpen(false);
           // Se fechar sem criar usuário, fechar o modal principal também
           onClose();
         }}
         onUsuarioCreated={handleUsuarioPadraoCriado}
         positionName={selectedPosition?.name || ''}
         employeeName={form.name}
         employeeCpf={form.cpf}
         employeePhone={form.phone}
       />
     </Dialog>
   );
 };

export default FuncionarioNovoModal; 