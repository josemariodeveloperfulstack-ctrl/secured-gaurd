import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { employeeService } from '@/services/employeeService';
import { CreateEmployeeDTO } from '@/types/employee';
import { positionService, Position } from '@/services/positionService';
import workPostService, { WorkPost } from '@/services/workPostService';
import departmentService, { Department } from '@/services/departmentService';
import { unitService, Unit } from '@/services/unitService';
import { userService } from '@/services/userService';
import { User } from '@/types/user';
import { companyService } from '@/services/companyService';
import { Company } from '@/types/company';
import { Search, User as UserIcon, Building, Briefcase, Plus, UserPlus, Link, X, FileText, Upload, FileCheck, AlertCircle, Users as UsersIcon, Trash2, Edit2 } from 'lucide-react';
import NovoCargoModal from '@/components/funcionarios/NovoCargoModal';
import CriarUsuarioPadraoModal from '@/components/funcionarios/CriarUsuarioPadraoModal';
import { EmployeeDataFromPDF } from '@/services/pdfProcessingService';
import { DependentFormModal } from '@/components/dependentes/DependentFormModal';
import dependentService from '@/services/dependentService';
import { Dependent, DependentCreateRequest } from '@/types/dependent';
import { useToast } from '@/hooks/use-toast';
import { AccountingFormButton } from '@/components/funcionarios/AccountingFormButton';

interface FuncionarioNovoModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  employeeToEdit?: Employee | null; // Funcionário para edição (opcional)
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
  },
  company: {
    id: ''
  }
};

const FuncionarioNovoModal: React.FC<FuncionarioNovoModalProps> = ({ open, onClose, onCreated, employeeToEdit }) => {
  const { toast } = useToast();
  const [form, setForm] = useState<CreateEmployeeDTO>(initialState);
  const [isEditMode, setIsEditMode] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para os dados dos selects
  const [positions, setPositions] = useState<Position[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [workPosts, setWorkPosts] = useState<WorkPost[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
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
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  
  // Estados para empresas
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Estados para dependentes
  const [employeeDependents, setEmployeeDependents] = useState<Dependent[]>([]);
  const [dependentModalOpen, setDependentModalOpen] = useState(false);
  const [dependentToEdit, setDependentToEdit] = useState<Dependent | null>(null);
  const [loadingDependents, setLoadingDependents] = useState(false);

  // useEffect para carregar dados do funcionário em modo de edição
  useEffect(() => {
    if (employeeToEdit && open) {
      console.log('🔍 Carregando dados do funcionário para edição:', employeeToEdit);
      setIsEditMode(true);
      
      // Preencher o formulário com os dados do funcionário
      setForm({
        name: employeeToEdit.name || '',
        cpf: employeeToEdit.cpf || employeeToEdit.document || '',
        rg: employeeToEdit.rg || '',
        email: employeeToEdit.email || '',
        phone: employeeToEdit.phone || '',
        address: employeeToEdit.address || '',
        birthDate: employeeToEdit.birthDate || '',
        maritalStatus: employeeToEdit.maritalStatus || 'SINGLE',
        nationality: employeeToEdit.nationality || 'Brasileiro',
        registrationNumber: employeeToEdit.registrationNumber || '',
        hireDate: employeeToEdit.hireDate || '',
        status: employeeToEdit.status || 'ACTIVE',
        notes: employeeToEdit.notes || '',
        position: employeeToEdit.position || { id: '' },
        unit: employeeToEdit.unit || { id: '' },
        user: employeeToEdit.user || { id: '' },
        company: employeeToEdit.company || { id: '' },
        
        // Campos do cônjuge
        spouseName: employeeToEdit.spouseName || '',
        spouseCpf: employeeToEdit.spouseCpf || '',
        spouseRg: employeeToEdit.spouseRg || '',
        spouseBirthDate: employeeToEdit.spouseBirthDate || '',
        spousePhone: employeeToEdit.spousePhone || '',
        spouseEmail: employeeToEdit.spouseEmail || '',
        
        // Campos da ficha de registro
        empresaNome: employeeToEdit.empresaNome || '',
        empresaEndereco: employeeToEdit.empresaEndereco || '',
        empresaCnpj: employeeToEdit.empresaCnpj || '',
        tituloEleitor: employeeToEdit.tituloEleitor || '',
        tituloEleitorZona: employeeToEdit.tituloEleitorZona || '',
        tituloEleitorSecao: employeeToEdit.tituloEleitorSecao || '',
        carteiraIdentidadeOrgaoEmissor: employeeToEdit.carteiraIdentidadeOrgaoEmissor || '',
        carteiraIdentidadeDataEmissao: employeeToEdit.carteiraIdentidadeDataEmissao || '',
        certificadoMilitar: employeeToEdit.certificadoMilitar || '',
        nomePai: employeeToEdit.nomePai || '',
        nomeMae: employeeToEdit.nomeMae || '',
        localNascimento: employeeToEdit.localNascimento || '',
        grauInstrucao: employeeToEdit.grauInstrucao || '',
        cbo: employeeToEdit.cbo || '',
        salario: employeeToEdit.salario || 0,
        salarioPorExtenso: employeeToEdit.salarioPorExtenso || '',
        periodoPagamento: employeeToEdit.periodoPagamento || '',
        horarioTrabalho: employeeToEdit.horarioTrabalho || '',
        folgaSemanal: employeeToEdit.folgaSemanal || '',
        fgtsOptante: employeeToEdit.fgtsOptante || false,
        fgtsDataOpcao: employeeToEdit.fgtsDataOpcao || '',
        fgtsBancoDepositario: employeeToEdit.fgtsBancoDepositario || '',
        fgtsDataRetratacao: employeeToEdit.fgtsDataRetratacao || '',
        pisDataCadastro: employeeToEdit.pisDataCadastro || '',
        pisBancoDepositario: employeeToEdit.pisBancoDepositario || '',
        pisEnderecoBanco: employeeToEdit.pisEnderecoBanco || '',
        pisCodigoBanco: employeeToEdit.pisCodigoBanco || '',
        pisCodigoAgencia: employeeToEdit.pisCodigoAgencia || '',
        cnhNumber: employeeToEdit.cnhNumber || '',
        cnhExpirationDate: employeeToEdit.cnhExpirationDate || '',
        cnhCategory: employeeToEdit.cnhCategory || '',
        ctps: employeeToEdit.ctps || '',
        ctpsRural: employeeToEdit.ctpsRural || '',
        ctpsSeries: employeeToEdit.ctpsSeries || '',
        ctpsIssueDate: employeeToEdit.ctpsIssueDate || '',
        ctpsIssuingAgency: employeeToEdit.ctpsIssuingAgency || '',
        carteiraModelo19: employeeToEdit.carteiraModelo19 || '',
        registroGeralEstrangeiro: employeeToEdit.registroGeralEstrangeiro || '',
        casadoBrasileiro: employeeToEdit.casadoBrasileiro || false,
        nomeConjugeEstrangeiro: employeeToEdit.nomeConjugeEstrangeiro || '',
        temFilhosBrasileiros: employeeToEdit.temFilhosBrasileiros || false,
        quantidadeFilhosBrasileiros: employeeToEdit.quantidadeFilhosBrasileiros || 0,
        dataChegadaBrasil: employeeToEdit.dataChegadaBrasil || '',
        naturalizado: employeeToEdit.naturalizado || false,
        decretoNaturalizacao: employeeToEdit.decretoNaturalizacao || '',
        assinaturaFuncionario: employeeToEdit.assinaturaFuncionario || '',
        dataRescisao: employeeToEdit.dataRescisao || '',
        pis: employeeToEdit.pis || '',
        gender: employeeToEdit.gender || '',
        vistoFiscalizacao: employeeToEdit.vistoFiscalizacao || '',
        
        // Campos adicionais - comentados pois não existem na entidade
        // workPostId: (employeeToEdit as any).workPostId || '',
        // departmentId: (employeeToEdit as any).departmentId || ''
      });

      // Preencher seleções
      console.log('🔍 Dados de relacionamento:', {
        position: employeeToEdit.position,
        unit: employeeToEdit.unit,
        user: employeeToEdit.user,
        company: employeeToEdit.company
        // workPostId e departmentId não existem na entidade Employee
      });
      
      if (employeeToEdit.position) {
        console.log('🔍 Carregando posição:', employeeToEdit.position);
        setSelectedPosition(employeeToEdit.position);
        setPositionSearchTerm(employeeToEdit.position.name || '');
      }
      if (employeeToEdit.unit) {
        console.log('🔍 Carregando unidade:', employeeToEdit.unit);
        setSelectedUnit(employeeToEdit.unit);
      }
      if (employeeToEdit.user) {
        console.log('🔍 Carregando usuário:', employeeToEdit.user);
        setSelectedUser(employeeToEdit.user);
        setUserSearchTerm(employeeToEdit.user.name || employeeToEdit.user.username || '');
      }
      if (employeeToEdit.company) {
        console.log('🔍 Carregando empresa:', employeeToEdit.company);
        setSelectedCompany(employeeToEdit.company);
      }

      // Carregar dependentes do funcionário
      loadEmployeeDependents(employeeToEdit.id);
    } else if (!employeeToEdit && open) {
      // Modo de criação - resetar formulário
      setIsEditMode(false);
      setForm(initialState);
      setSelectedPosition(null);
      setSelectedUnit(null);
      setSelectedUser(null);
      setSelectedCompany(null);
      setPhotoPreview(null);
      setEmployeeDependents([]);
      setUserSearchTerm('');
      setPositionSearchTerm('');
    }
  }, [employeeToEdit, open]);

  // Carregar Postos de Trabalho e Departamentos
  useEffect(() => {
    const loadWorkPostsAndDepartments = async () => {
      try {
        const [wp, deps] = await Promise.all([
          workPostService.getAllWorkPosts(),
          departmentService.listActive(),
        ]);
        setWorkPosts(wp);
        setDepartments(deps);
      } catch (e) {
        console.error('Erro ao carregar postos/departamentos', e);
      }
    };
    loadWorkPostsAndDepartments();
  }, []);

  // Função para carregar dependentes do funcionário
  const loadEmployeeDependents = async (employeeId: string) => {
    if (!employeeId) return;
    
    setLoadingDependents(true);
    try {
      const dependents = await dependentService.getDependentsByEmployee(employeeId);
      setEmployeeDependents(dependents);
    } catch (error) {
      console.error('Erro ao carregar dependentes:', error);
      setEmployeeDependents([]);
    } finally {
      setLoadingDependents(false);
    }
  };

  // Abrir modal para adicionar dependente
  const handleAddDependent = () => {
    setDependentToEdit(null);
    setDependentModalOpen(true);
  };

  // Abrir modal para editar dependente
  const handleEditDependent = (dependent: Dependent) => {
    setDependentToEdit(dependent);
    setDependentModalOpen(true);
  };

  // Excluir dependente
  const handleDeleteDependent = async (dependent: Dependent) => {
    if (!window.confirm(`Tem certeza que deseja excluir o dependente "${dependent.name}"?`)) {
      return;
    }

    try {
      await dependentService.deleteDependent(dependent.id);
      toast({
        title: "Sucesso!",
        description: "Dependente excluído com sucesso.",
        variant: "default"
      });
      
      // Recarregar dependentes
      if (employeeToEdit?.id) {
        await loadEmployeeDependents(employeeToEdit.id);
      }
    } catch (error: any) {
      console.error('Erro ao excluir dependente:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir dependente.",
        variant: "destructive"
      });
    }
  };

  // Callback quando dependente é criado/editado com sucesso
  const handleDependentSaved = async () => {
    setDependentModalOpen(false);
    setDependentToEdit(null);
    
    // Recarregar dependentes
    if (employeeToEdit?.id) {
      await loadEmployeeDependents(employeeToEdit.id);
    }
    
    toast({
      title: "Sucesso!",
      description: dependentToEdit ? "Dependente atualizado com sucesso." : "Dependente adicionado com sucesso.",
      variant: "default"
    });
  };
  
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
  const [extractedPreview, setExtractedPreview] = useState<any | null>(null);

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
        // Verificar se o termo de busca é um CPF (apenas números)
        const isCpfSearch = /^\d+$/.test(userSearchTerm.replace(/\D/g, ''));
        
        if (isCpfSearch && userSearchTerm.replace(/\D/g, '').length >= 11) {
          // Buscar por CPF
          try {
            const userByCpf = await userService.getUserByCpf(userSearchTerm.replace(/\D/g, ''));
            setFilteredUsers([userByCpf]);
          } catch (cpfError) {
            // Se não encontrar por CPF, fazer busca normal
            const searchResults = await userService.searchUsers(userSearchTerm);
            setFilteredUsers(searchResults);
          }
        } else {
          // Busca normal por nome, email ou username
          const searchResults = await userService.searchUsers(userSearchTerm);
          setFilteredUsers(searchResults);
        }
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        setFilteredUsers([]);
      }
    };

    // Debounce para evitar muitas requisições
    const timeoutId = setTimeout(() => {
      if (userSearchTerm.trim()) {
        searchUsers();
      } else {
        setFilteredUsers([]);
      }
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
      // Incluir dependentes no payload (mas não enviar na criação/edição de funcionário)
      // Os dependentes devem ser gerenciados separadamente
      const employeeData = {
        ...form
        // Removido: dependents - não enviar dependentes no payload do funcionário
      };
      
      if (isEditMode && employeeToEdit?.id) {
        // Modo de edição
        await employeeService.updateEmployee(employeeToEdit.id, employeeData);
        toast({
          title: "Sucesso!",
          description: "Funcionário atualizado com sucesso.",
          variant: "default"
        });
        onCreated(); // Atualizar lista
        onClose(); // Fechar modal
      } else {
        // Modo de criação
        const createdEmployee = await employeeService.createEmployee(employeeData);
        toast({
          title: "Sucesso!",
          description: "Funcionário criado com sucesso.",
          variant: "default"
        });
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
      }
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
      // Processar no backend
      const data = await employeeService.processEmployeeForm(pdfFile);
      // Converter para tipo esperado pelo preenchimento
      fillFormWithPDFData(data as EmployeeDataFromPDF);
      // Guardar pré-visualização por blocos
      setExtractedPreview({
        employer: data?.employer || {},
        employee: data?.employee || {},
        contract: data?.contract || {},
        fgts: data?.fgts || {},
        pis: data?.pis || {},
        voter: data?.voter || {},
        foreigner: data?.foreigner || {},
        notes: data?.notes || ''
      });
      setPdfSuccess(true);
      setShowPDFImport(false);
    } catch (error) {
      console.error('Erro ao processar PDF:', error);
      setPdfError('Erro ao processar PDF. Tente novamente.');
    } finally {
      setPdfProcessing(false);
    }
  };

  const fillFormWithPDFData = (data: any) => {
    // Suporte a novo formato por blocos do backend
    const employer = data?.employer || {};
    const employee = data?.employee || {};
    const contract = data?.contract || {};
    const fgts = data?.fgts || {};
    const pis = data?.pis || {};
    const voter = data?.voter || {};
    const foreigner = data?.foreigner || {};

    // Criar objeto combinado com retrocompatibilidade
    const combined: EmployeeDataFromPDF = {
      // Employer
      empresaNome: employer.companyName ?? data.empresaNome,
      empresaCnpj: employer.cnpj ?? data.empresaCnpj,
      empresaEndereco: employer.address ?? data.empresaEndereco,
      // Employee
      name: employee.name ?? data.name,
      cpf: employee.cpf ?? data.cpf,
      rg: employee.rg ?? data.rg,
      carteiraIdentidadeOrgaoEmissor: employee.issuingAuthority ?? data.carteiraIdentidadeOrgaoEmissor,
      birthDate: employee.birthDate ?? data.birthDate,
      nationality: employee.nationality ?? data.nationality,
      maritalStatus: employee.maritalStatus ?? data.maritalStatus,
      nomePai: employee.fatherName ?? data.nomePai,
      nomeMae: employee.motherName ?? data.nomeMae,
      address: employee.address ?? data.address,
      cep: employee.cep ?? data.cep,
      city: employee.city ?? data.city,
      // Contract
      hireDate: contract.admissionDate ?? data.hireDate,
      position: contract.position ?? data.position,
      cbo: contract.cbo ?? data.cbo,
      salary: contract.salary ?? (data as any).salary,
      periodoPagamento: contract.paymentPeriod ?? (data as any).periodoPagamento,
      horarioTrabalho: contract.workSchedule ?? data.horarioTrabalho,
      folgaSemanal: contract.weeklyRest ?? data.folgaSemanal,
      // FGTS
      fgtsOptante: fgts.optante ?? data.fgtsOptante,
      fgtsDataOpcao: fgts.optionDate ?? data.fgtsDataOpcao,
      fgtsBancoDepositario: fgts.bank ?? data.fgtsBancoDepositario,
      // PIS
      pis: pis.number ?? data.pis,
      pisDataCadastro: pis.registeredAt ?? data.pisDataCadastro,
      pisBancoDepositario: pis.bank ?? data.pisBancoDepositario,
      pisEnderecoBanco: pis.address ?? (data as any).pisEnderecoBanco,
      pisCodigoBanco: pis.bankCode ?? (data as any).pisCodigoBanco,
      pisCodigoAgencia: pis.agencyCode ?? (data as any).pisCodigoAgencia,
      // Voter
      tituloEleitor: voter.titulo ?? data.tituloEleitor,
      tituloEleitorZona: voter.zona ?? data.tituloEleitorZona,
      tituloEleitorSecao: voter.secao ?? data.tituloEleitorSecao,
      // Foreigner (opcional)
      spouseName: foreigner.spouseName ?? data.spouseName,
      notes: data.notes ?? data.observations,
    } as any;

    setForm(prev => ({
      ...prev,
      // Employer
      empresaNome: combined.empresaNome || prev.empresaNome,
      empresaCnpj: combined.empresaCnpj || prev.empresaCnpj,
      empresaEndereco: combined.empresaEndereco || prev.empresaEndereco,
      // Employee
      name: combined.name || prev.name,
      cpf: combined.cpf || prev.cpf,
      rg: combined.rg || prev.rg,
      birthDate: combined.birthDate || prev.birthDate,
      nationality: combined.nationality || prev.nationality,
      maritalStatus: combined.maritalStatus || prev.maritalStatus,
      address: combined.address || prev.address,
      city: combined.city || prev.city,
      cep: combined.cep || prev.cep,
      hireDate: combined.hireDate || prev.hireDate,
      email: data.email || prev.email,
      phone: data.phone || prev.phone,
      notes: combined.notes || prev.notes,
      
      // Campos adicionais
      tituloEleitor: combined.tituloEleitor || prev.tituloEleitor,
      tituloEleitorZona: combined.tituloEleitorZona || prev.tituloEleitorZona,
      carteiraIdentidadeOrgaoEmissor: combined.carteiraIdentidadeOrgaoEmissor || prev.carteiraIdentidadeOrgaoEmissor,
      cnhNumber: data.cnhNumber || prev.cnhNumber,
      certificadoMilitar: data.certificadoMilitar || prev.certificadoMilitar,
      nomePai: combined.nomePai || prev.nomePai,
      nomeMae: combined.nomeMae || prev.nomeMae,
      localNascimento: data.localNascimento || prev.localNascimento,
      grauInstrucao: data.grauInstrucao || prev.grauInstrucao,
      cbo: combined.cbo || prev.cbo,
      salario: combined.salary || prev.salario,
      salarioPorExtenso: data.salarioPorExtenso || prev.salarioPorExtenso,
      periodoPagamento: combined.periodoPagamento || prev.periodoPagamento,
      horarioTrabalho: combined.horarioTrabalho || prev.horarioTrabalho,
      folgaSemanal: combined.folgaSemanal || prev.folgaSemanal,
      fgtsOptante: combined.fgtsOptante !== undefined ? combined.fgtsOptante : prev.fgtsOptante,
      fgtsDataOpcao: combined.fgtsDataOpcao || prev.fgtsDataOpcao,
      fgtsBancoDepositario: combined.fgtsBancoDepositario || prev.fgtsBancoDepositario,
      pis: combined.pis || prev.pis,
      pisDataCadastro: combined.pisDataCadastro || prev.pisDataCadastro,
      pisBancoDepositario: combined.pisBancoDepositario || prev.pisBancoDepositario,
      vistoFiscalizacao: data.vistoFiscalizacao || prev.vistoFiscalizacao,
      
      // Dados do cônjuge
      spouseName: combined.spouseName || prev.spouseName,
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

    // Pré-preencher cargo a partir do PDF, se houver correspondência
    const positionText = combined.position || data.position;
    if (positionText && positionText.trim()) {
      const normalized = positionText.trim().toLowerCase();
      const matched = positions.find(p => (p.name || '').trim().toLowerCase() === normalized);
      if (matched) {
        setSelectedPosition(matched);
        setPositionSearchTerm(matched.name);
        setForm(prev => ({ ...prev, position: { id: matched.id } }));
      } else {
        // Preenche o campo de busca para facilitar a seleção/criação
        setPositionSearchTerm(positionText);
      }
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

  const handleCompanySelect = (companyId: string) => {
    if (companyId === 'none') {
      setSelectedCompany(null);
      setForm(prev => ({ ...prev, company: { id: '' } }));
    } else {
      const company = companies.find(c => c.id === companyId);
      if (company) {
        setSelectedCompany(company);
        setForm(prev => ({ ...prev, company: { id: company.id } }));
      }
    }
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
          <DialogTitle className="text-xl font-bold">
            {isEditMode ? 'Editar Funcionário' : 'Novo Funcionário'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Edite os dados do funcionário. Campos marcados com * são obrigatórios.'
              : 'Preencha os dados do funcionário. Campos marcados com * são obrigatórios.'
            }
          </DialogDescription>
          
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

            {extractedPreview && (
              <div className="mt-3 p-3 bg-seguranca-black rounded border border-seguranca-lightgray/30 text-sm text-white">
                <h5 className="font-semibold mb-2">Pré-visualização dos dados extraídos</h5>
                <div className="space-y-2">
                  <details className="bg-[#2a2a2a] rounded p-2" open>
                    <summary className="cursor-pointer font-medium">Dados da Empresa</summary>
                    <div className="flex justify-end mb-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fillFormWithPDFData({ employer: extractedPreview.employer })}
                        className="h-7 text-xs"
                      >
                        Aplicar este bloco
                      </Button>
                    </div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {Object.entries(extractedPreview.employer || {}).map(([k,v]) => (
                        v ? <div key={k}><span className="text-gray-400">{k}:</span> {String(v)}</div> : null
                      ))}
                    </div>
                  </details>
                  <details className="bg-[#2a2a2a] rounded p-2">
                    <summary className="cursor-pointer font-medium">Dados do Funcionário</summary>
                    <div className="flex justify-end mb-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fillFormWithPDFData({ employee: extractedPreview.employee })}
                        className="h-7 text-xs"
                      >
                        Aplicar este bloco
                      </Button>
                    </div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {Object.entries(extractedPreview.employee || {}).map(([k,v]) => (
                        v ? <div key={k}><span className="text-gray-400">{k}:</span> {String(v)}</div> : null
                      ))}
                    </div>
                  </details>
                  <details className="bg-[#2a2a2a] rounded p-2">
                    <summary className="cursor-pointer font-medium">Vínculo Empregatício</summary>
                    <div className="flex justify-end mb-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fillFormWithPDFData({ contract: extractedPreview.contract })}
                        className="h-7 text-xs"
                      >
                        Aplicar este bloco
                      </Button>
                    </div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {Object.entries(extractedPreview.contract || {}).map(([k,v]) => (
                        v ? <div key={k}><span className="text-gray-400">{k}:</span> {String(v)}</div> : null
                      ))}
                    </div>
                  </details>
                  <details className="bg-[#2a2a2a] rounded p-2">
                    <summary className="cursor-pointer font-medium">FGTS</summary>
                    <div className="flex justify-end mb-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fillFormWithPDFData({ fgts: extractedPreview.fgts })}
                        className="h-7 text-xs"
                      >
                        Aplicar este bloco
                      </Button>
                    </div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {Object.entries(extractedPreview.fgts || {}).map(([k,v]) => (
                        (v !== undefined && v !== null && String(v).length > 0) ? <div key={k}><span className="text-gray-400">{k}:</span> {String(v)}</div> : null
                      ))}
                    </div>
                  </details>
                  <details className="bg-[#2a2a2a] rounded p-2">
                    <summary className="cursor-pointer font-medium">PIS</summary>
                    <div className="flex justify-end mb-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fillFormWithPDFData({ pis: extractedPreview.pis })}
                        className="h-7 text-xs"
                      >
                        Aplicar este bloco
                      </Button>
                    </div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {Object.entries(extractedPreview.pis || {}).map(([k,v]) => (
                        v ? <div key={k}><span className="text-gray-400">{k}:</span> {String(v)}</div> : null
                      ))}
                    </div>
                  </details>
                  <details className="bg-[#2a2a2a] rounded p-2">
                    <summary className="cursor-pointer font-medium">Título de Eleitor</summary>
                    <div className="flex justify-end mb-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fillFormWithPDFData({ voter: extractedPreview.voter })}
                        className="h-7 text-xs"
                      >
                        Aplicar este bloco
                      </Button>
                    </div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {Object.entries(extractedPreview.voter || {}).map(([k,v]) => (
                        v ? <div key={k}><span className="text-gray-400">{k}:</span> {String(v)}</div> : null
                      ))}
                    </div>
                  </details>
                  <details className="bg-[#2a2a2a] rounded p-2">
                    <summary className="cursor-pointer font-medium">Quando Estrangeiro</summary>
                    <div className="flex justify-end mb-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fillFormWithPDFData({ foreigner: extractedPreview.foreigner })}
                        className="h-7 text-xs"
                      >
                        Aplicar este bloco
                      </Button>
                    </div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {Object.entries(extractedPreview.foreigner || {}).map(([k,v]) => (
                        v ? <div key={k}><span className="text-gray-400">{k}:</span> {String(v)}</div> : null
                      ))}
                    </div>
                  </details>
                  {extractedPreview.notes ? (
                    <div className="bg-[#2a2a2a] rounded p-2">
                      <div className="font-medium">Observações</div>
                      <div className="text-xs mt-1">{extractedPreview.notes}</div>
                    </div>
                  ) : null}
                </div>
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
                     placeholder="Digite nome, email, username ou CPF para buscar usuário..."
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
             
            {/* Seção de dependentes removida do formulário de criação. A gestão de dependentes permanece no modo de edição via modal dedicado. */}
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
                <Label className="text-sm font-medium text-gray-200">CBO</Label>
                <Input 
                  name="cbo" 
                  value={form.cbo || ''} 
                  onChange={handleChange} 
                  placeholder="Ex: 517410"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-2 00">Salário (R$)</Label>
                <Input 
                  name="salario" 
                  type="number" 
                  step="0.01"
                  value={form.salario as any || ''} 
                  onChange={handleChange} 
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Período de Pagamento</Label>
                <Select 
                  value={form.periodoPagamento || ''} 
                  onValueChange={(value) => setForm(prev => ({ ...prev, periodoPagamento: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MENSAL">Mensal</SelectItem>
                    <SelectItem value="QUINZENAL">Quinzenal</SelectItem>
                    <SelectItem value="SEMANAL">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Posto de Trabalho</Label>
                <Select 
                  value={(form as any).workPostId || ''}
                  onValueChange={(value) => setForm(prev => ({ ...(prev as any), workPostId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um posto" />
                  </SelectTrigger>
                  <SelectContent>
                    {workPosts.map((wp) => (
                      <SelectItem key={wp.id} value={wp.id}>
                        {wp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Departamento</Label>
                <Select 
                  value={(form as any).departmentId || ''}
                  onValueChange={(value) => setForm(prev => ({ ...(prev as any), departmentId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-gray-200">Horário de Trabalho</Label>
                <Input 
                  name="horarioTrabalho" 
                  value={form.horarioTrabalho || ''} 
                  onChange={handleChange} 
                  placeholder="Ex: 07:00-19:00 12x36"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Folga Semanal</Label>
                <Input 
                  name="folgaSemanal" 
                  value={form.folgaSemanal || ''} 
                  onChange={handleChange} 
                  placeholder="Ex: Domingo"
                />
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
                 <Select 
                   value={selectedCompany?.id || 'none'} 
                   onValueChange={handleCompanySelect}
                 >
                   <SelectTrigger className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
                     <SelectValue placeholder="Selecione uma empresa" />
                   </SelectTrigger>
                   <SelectContent className="bg-seguranca-graphite border-gray-600">
                     <SelectItem value="none" className="text-seguranca-lightgray hover:bg-gray-700">
                       <span className="text-gray-400">Nenhuma empresa</span>
                     </SelectItem>
                     {companies.map((company) => (
                       <SelectItem 
                         key={company.id} 
                         value={company.id}
                         className="text-seguranca-lightgray hover:bg-gray-700"
                       >
                         <div className="flex flex-col">
                           <span className="font-medium">{company.name}</span>
                           <span className="text-xs text-gray-400">
                             {company.cnpj ? `CNPJ: ${company.cnpj}` : 'Sem CNPJ'} • {company.status}
                           </span>
                         </div>
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
             </div>
           </div>

          {/* Seção: FGTS */}
          <div className="space-y-4 bg-[#363636] p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white">FGTS</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-200">Optante pelo FGTS?</Label>
                <Select 
                  value={String(form.fgtsOptante ?? '')} 
                  onValueChange={(value) => setForm(prev => ({ ...prev, fgtsOptante: value === 'true' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Sim</SelectItem>
                    <SelectItem value="false">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Data da Opção</Label>
                <Input 
                  name="fgtsDataOpcao" 
                  type="date" 
                  value={form.fgtsDataOpcao || ''} 
                  onChange={handleChange} 
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Data de Retratação</Label>
                <Input 
                  name="fgtsDataRetratacao" 
                  type="date" 
                  value={form.fgtsDataRetratacao || ''} 
                  onChange={handleChange} 
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Banco Depositário</Label>
                <Input 
                  name="fgtsBancoDepositario" 
                  value={form.fgtsBancoDepositario || ''} 
                  onChange={handleChange} 
                  placeholder="Ex: Banco do Brasil"
                />
              </div>
            </div>
          </div>

          {/* Seção: PIS/PASEP */}
          <div className="space-y-4 bg-[#363636] p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white">PIS / PASEP</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-200">Número do PIS</Label>
                <Input 
                  name="pis" 
                  value={form.pis || ''} 
                  onChange={handleChange} 
                  placeholder="Número do PIS"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Data de Cadastro</Label>
                <Input 
                  name="pisDataCadastro" 
                  type="date" 
                  value={form.pisDataCadastro || ''} 
                  onChange={handleChange} 
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Banco Depositário do PIS</Label>
                <Input 
                  name="pisBancoDepositario" 
                  value={form.pisBancoDepositario || ''} 
                  onChange={handleChange} 
                  placeholder="Ex: Banco do Brasil"
                />
              </div>
            </div>
          </div>

          {/* Seção: Dados da Empresa (Ficha) - opcional */}

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

           {/* Seção: Dependentes */}
           <div className="space-y-4 bg-gradient-to-br from-purple-900/20 to-blue-900/20 p-6 rounded-lg border border-purple-500/30">
             <div className="flex items-center justify-between">
               <h3 className="text-lg font-semibold flex items-center text-white">
                 <UsersIcon className="mr-2" size={20} />
                 Dependentes
               </h3>
               <Button
                 type="button"
                 onClick={handleAddDependent}
                 disabled={!isEditMode || !employeeToEdit?.id}
                 className="bg-purple-600 hover:bg-purple-700 text-white"
                 size="sm"
               >
                 <Plus className="mr-2" size={16} />
                 Adicionar Dependente
               </Button>
             </div>

             {!isEditMode || !employeeToEdit?.id ? (
               <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                 <p className="text-yellow-300 text-sm flex items-center">
                   <AlertCircle className="mr-2" size={16} />
                   Para adicionar dependentes, primeiro salve o funcionário e depois edite-o.
                 </p>
               </div>
             ) : (
               <div className="space-y-3">
                 {loadingDependents ? (
                   <div className="text-center py-4">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                     <p className="text-gray-400 text-sm mt-2">Carregando dependentes...</p>
                   </div>
                 ) : employeeDependents.length === 0 ? (
                   <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 text-center">
                     <UsersIcon className="mx-auto mb-2 text-gray-400" size={32} />
                     <p className="text-gray-400 text-sm">Nenhum dependente cadastrado</p>
                     <p className="text-gray-500 text-xs mt-1">Clique em "Adicionar Dependente" para começar</p>
                   </div>
                 ) : (
                   <div className="space-y-2">
                     {employeeDependents.map((dependent) => (
                       <div
                         key={dependent.id}
                         className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 hover:border-purple-500/50 transition-colors"
                       >
                         <div className="flex items-start justify-between">
                           <div className="flex-1">
                             <div className="flex items-center gap-2 mb-2">
                               <h4 className="font-semibold text-white">{dependent.name}</h4>
                               <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                                 {dependent.relationship}
                               </Badge>
                               {dependent.isStudent && (
                                 <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                                   Estudante
                                 </Badge>
                               )}
                               {dependent.isBeneficiary && (
                                 <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                   Beneficiário
                                 </Badge>
                               )}
                             </div>
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                               {dependent.cpf && (
                                 <p className="text-gray-400">
                                   <span className="font-medium">CPF:</span> {dependent.cpf}
                                 </p>
                               )}
                               {dependent.birthDate && (
                                 <p className="text-gray-400">
                                   <span className="font-medium">Nascimento:</span> {new Date(dependent.birthDate).toLocaleDateString('pt-BR')}
                                 </p>
                               )}
                               {dependent.phone && (
                                 <p className="text-gray-400">
                                   <span className="font-medium">Telefone:</span> {dependent.phone}
                                 </p>
                               )}
                             </div>
                           </div>
                           <div className="flex gap-2 ml-4">
                             <Button
                               type="button"
                               variant="ghost"
                               size="sm"
                               onClick={() => handleEditDependent(dependent)}
                               className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                             >
                               <Edit2 size={16} />
                             </Button>
                             <Button
                               type="button"
                               variant="ghost"
                               size="sm"
                               onClick={() => handleDeleteDependent(dependent)}
                               className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                             >
                               <Trash2 size={16} />
                             </Button>
                           </div>
                         </div>
                       </div>
                     ))}
                     <p className="text-gray-400 text-xs mt-2">
                       Total: {employeeDependents.length} dependente(s)
                     </p>
                   </div>
                 )}
               </div>
             )}
           </div>
          
                     {error && (
             <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
               <p className="text-destructive text-sm">{error}</p>
             </div>
           )}
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            {/* Botão de Ficha Contabilidade - apenas em modo de edição */}
            {isEditMode && employeeToEdit?.id && (
              <div className="w-full sm:w-auto">
                <AccountingFormButton
                  employeeId={employeeToEdit.id}
                  employeeName={employeeToEdit.name || 'Funcionário'}
                  variant="outline"
                  className="border-red-500 text-red-400 hover:bg-red-500/10 w-full sm:w-auto"
                />
              </div>
            )}
            
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
               {loading ? 'Salvando...' : (isEditMode ? 'Atualizar Funcionário' : 'Cadastrar Funcionário')}
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

       {/* Modal de Dependentes */}
       {employeeToEdit?.id && (
         <DependentFormModal
           isOpen={dependentModalOpen}
           onClose={() => setDependentModalOpen(false)}
           employeeId={employeeToEdit.id}
           employeeName={employeeToEdit.name}
           dependent={dependentToEdit || undefined}
           onSuccess={handleDependentSaved}
         />
       )}
     </Dialog>
   );
 };

export default FuncionarioNovoModal; 