
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { parseDateFromBackend, formatDateForBackend } from '@/utils/dateUtils';
import CriarUsuarioPadraoModal from '@/components/funcionarios/CriarUsuarioPadraoModal';
import NovoMedicoModal from '@/components/funcionarios/NovoMedicoModal';
import { DependentFormModal } from '@/components/dependentes/DependentFormModal';
import FichaEntregaEPIForm from './FichaEntregaEPIForm';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import dependentService from '@/services/dependentService';
import { Dependent, DependentCreateRequest } from '@/types/dependent';
import { epiDeliveryFormService } from '@/services/epiDeliveryFormService';
import accountingFormService from '@/services/accountingFormService';
import CurrencyInput from 'react-currency-input-field';
import { Eye, Shield, Edit2, Trash2, Users as UsersIcon, Link, X, UserPlus, AlertCircle, FileSpreadsheet } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { employeeService } from '@/services/employeeService';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys, fetchEmployeeDetailForEdit } from '@/hooks/queries';
import { UpdateEmployeeDTO } from '@/types/employee';
import { positionService, Position } from '@/services/positionService';
import { unitService, Unit } from '@/services/unitService';
import { userService } from '@/services/userService';
import { companyService } from '@/services/companyService';
import { Company } from '@/types/company';
import { User } from '@/types/user';
import { Employee } from '@/types/employee';
import { Search, User as UserIcon, Building, Briefcase, Plus, FileText, Download, Loader2 } from 'lucide-react';
import NovoCargoModal from '@/components/funcionarios/NovoCargoModal';
import { useToast } from '@/hooks/use-toast';
import workPostService, { WorkPost } from '@/services/workPostService';
import departmentService, { Department, filterCompanyDepartments } from '@/services/departmentService';
import { clientService, Client as ClientDTO } from '@/services/clientService';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { doctorService } from '@/services/doctorService';
import { Doctor } from '@/types/doctor';
import { formatTituloEleitorForInput, validateCPF, formatCpfForInput } from '@/utils/validation';
import DocumentosGerarTab from './DocumentosGerarTab';
import { EmployeeDocumentsTab } from './EmployeeDocumentsTab';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/utils/permissions';
import { History, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { remanejamentoService, Remanejamento } from '@/services/remanejamentoService';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DismissalReasonSelect } from '@/components/funcionarios/DismissalReasonSelect';
import { employeeChangeHistoryService, EmployeeChangeHistoryPage } from '@/services/employeeChangeHistoryService';
import {
  employeeEmploymentPeriodService,
  EligibleRehireEmployee,
  EmployeeEmploymentPeriod,
  EmploymentAdmissionType,
} from '@/services/employeeEmploymentPeriodService';
import RehireAdmissionPanel from '@/components/funcionarios/RehireAdmissionPanel';

interface FuncionarioEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funcionario: Employee | null;
  onSuccess: () => void;
}

const FuncionarioEditModal: React.FC<FuncionarioEditModalProps> = ({ 
  open, 
  onOpenChange, 
  funcionario, 
  onSuccess 
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const normalizedRole = (user?.role ?? '').replace(/^ROLE_/, '');
  const isRHOrDPE = ['RH', 'DEPARTAMENTO_PESSOAL', 'ASSISTENCIA_RH', 'AUX_DEP', 'SUPER_ADMIN', 'ADMIN'].includes(normalizedRole);
  const canSeeHistory = isRHOrDPE || (user?.permissions && hasPermission(user.permissions, 'EMPLOYEE_HISTORY_READ'));
  const [form, setForm] = useState<UpdateEmployeeDTO>({
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
    notes: '',
    position: { id: '' },
    unit: { id: '' },
    user: { id: '' },
    company: { id: '' },
    bankData: {
      bank: '',
      agency: '',
      account: '',
      type: 'CORRENTE',
      chavePix: ''
    },
    // Campos do cônjuge
    spouseName: '',
    spouseCpf: '',
    spouseRg: '',
    spouseBirthDate: '',
    spousePhone: '',
    spouseEmail: '',
    
    // Campos da ficha de registro
    empresaNome: '',
    empresaEndereco: '',
    empresaCnpj: '',
    tituloEleitor: '',
    tituloEleitorZona: '',
    tituloEleitorSecao: '',
    carteiraIdentidadeOrgaoEmissor: '',
    carteiraIdentidadeDataEmissao: '',
    rgUf: '',
    racaCor: '',
    tipoSalarioContratual: '',
    certificadoMilitar: '',
    nomePai: '',
    nomeMae: '',
    localNascimento: '',
    municipioNascimento: '',
    estadoNascimento: '',
    sexo: '',
    grauInstrucao: '',
    matriculaEsocial: '',
    cbo: '',
    salario: '' as any,
    salarioPorExtenso: '',
    periodoPagamento: '',
    horarioTrabalho: '',
    folgaSemanal: '',
    fgtsOptante: false,
    fgtsDataOpcao: '',
    fgtsBancoDepositario: '',
    fgtsDataRetratacao: '',
    pis: '',
    pisDataCadastro: '',
    pisBancoDepositario: '',
    pisEnderecoBanco: '',
    pisCodigoBanco: '',
    pisCodigoAgencia: '',
    cnhNumber: '',
    cnhExpirationDate: '',
    cnhCategory: '',
    ctps: '',
    ctpsRural: '',
    ctpsSeries: '',
    ctpsIssueDate: '',
    ctpsIssuingAgency: '',
    carteiraModelo19: '',
    registroGeralEstrangeiro: '',
    casadoBrasileiro: false,
    nomeConjugeEstrangeiro: '',
    temFilhosBrasileiros: false,
    quantidadeFilhosBrasileiros: 0,
    dataChegadaBrasil: '',
    naturalizado: false,
    decretoNaturalizacao: '',
    vistoFiscalizacao: '',
    assinaturaFuncionario: '',
    dataRescisao: '',
    // Campos de ASO
    exameMedicoData: '',
    exameMedicoVencimento: '',
    exameMedicoTipo: '',
    exameMedicoDoctor: { id: '' },
    exameMedicoHorario: '',
    exameMedicoIntervalosRefeicao: false,
    exameMedicoHorarioIntervalo: '',
    exameMedicoObservacoes: '',
    exameMedicoPrimeiroEmprego: false,
    exameMedicoContribuicaoSindicalPaga: false,
    // Campos de CIN
    cinNumero: '',
    cinOrgaoEmissor: '',
    cinDataEmissao: '',
    workPostId: '',
    departmentId: '',
    remanejamentoDataInicio: ''
  });
  const [temIntervaloRefeicao, setTemIntervaloRefeicao] = useState<'sim' | 'nao'>('nao');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);
  
  // Estados para os dados dos selects
  const [positions, setPositions] = useState<Position[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [workPosts, setWorkPosts] = useState<WorkPost[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [filteredWorkPosts, setFilteredWorkPosts] = useState<WorkPost[]>([]);
  const [loadingWorkPosts, setLoadingWorkPosts] = useState(false);
  
  // Estados para busca e filtros
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  
  // Estados para médicos
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [doctorSearchTerm, setDoctorSearchTerm] = useState('');
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  
  // Estados para modal de novo cargo
  const [novoCargoModalOpen, setNovoCargoModalOpen] = useState(false);

  // Histórico de mudanças do funcionário
  const [historyData, setHistoryData] = useState<EmployeeChangeHistoryPage | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPageIndex, setHistoryPageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('cadastro');
  const [remanejamentos, setRemanejamentos] = useState<Remanejamento[]>([]);
  const [loadingRemanejamentos, setLoadingRemanejamentos] = useState(false);

  // Estados que devem estar antes de qualquer return (Rules of Hooks)
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [eligibleRehireEmployee, setEligibleRehireEmployee] = useState<EligibleRehireEmployee | null>(null);
  const [rehireAdmissionType, setRehireAdmissionType] = useState<EmploymentAdmissionType | ''>('');
  const [employmentPeriods, setEmploymentPeriods] = useState<EmployeeEmploymentPeriod[]>([]);
  const [employmentPeriodsLoading, setEmploymentPeriodsLoading] = useState(false);
  const [historyPdfLoading, setHistoryPdfLoading] = useState(false);
  const [canCreateDefaultUser, setCanCreateDefaultUser] = useState(false);
  const [criarUsuarioModalOpen, setCriarUsuarioModalOpen] = useState(false);
  const [novoMedicoModalOpen, setNovoMedicoModalOpen] = useState(false);
  const [dependentModalOpen, setDependentModalOpen] = useState(false);
  const [dependentToEdit, setDependentToEdit] = useState<Dependent | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loadingDependents, setLoadingDependents] = useState(false);
  const [positionSearchTerm, setPositionSearchTerm] = useState('');
  const [showPositionDropdown, setShowPositionDropdown] = useState(false);
  const [filteredPositions, setFilteredPositions] = useState<Position[]>([]);
  const [epiModalOpen, setEpiModalOpen] = useState(false);
  const [employeeDependents, setEmployeeDependents] = useState<Dependent[]>([]);
  const [remanejamentoModalOpen, setRemanejamentoModalOpen] = useState(false);
  const [pendingWorkPostId, setPendingWorkPostId] = useState<string>('');
  const [remanejamentoForm, setRemanejamentoForm] = useState({ dataInicio: '', escalaTrabalho: '', horarioTrabalho: '' });
  const initialWorkPostIdRef = useRef('');
  const workPostSelectReadyRef = useRef(false);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const isInitialMount = useRef(true);
  const lastSavedFormRef = useRef<string | null>(null);

  // Monitora a inicialização/carregamento do form
  useEffect(() => {
    if (open && funcionario?.id && form.name) {
      if (lastSavedFormRef.current === null) {
        lastSavedFormRef.current = JSON.stringify(form);
      }
    }
  }, [open, funcionario?.id, form]);

  // Monitor form changes for autosave
  useEffect(() => {
    if (!open) {
      isInitialMount.current = true;
      lastSavedFormRef.current = null;
      return;
    }
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!funcionario?.id) return;

    if (!form.cpf?.trim() || !form.hireDate || !form.name?.trim()) {
      return;
    }

    const cpfDigits = form.cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11 || !validateCPF(form.cpf)) {
      return;
    }

    const targetPost = normalizeWorkPostId((form as any).workPostId);
    if (isWorkPostTransfer(initialWorkPostIdRef.current, targetPost) && !(form as any).remanejamentoDataInicio) {
      return;
    }

    const currentFormStr = JSON.stringify(form);
    if (lastSavedFormRef.current === null) {
      return;
    }
    if (currentFormStr === lastSavedFormRef.current) {
      return;
    }

    setSaveStatus('saving');

    const delayDebounceFn = setTimeout(async () => {
      try {
        const { remanejamentoDataInicio, ...formRest } = form as any;
        const employeeData: any = { ...formRest };
        if (remanejamentoDataInicio && remanejamentoDataInicio.trim()) {
          employeeData.remanejamentoDataInicio = remanejamentoDataInicio;
        }

        const updatedEmployee = await employeeService.updateEmployee(funcionario.id, employeeData);
        syncInitialWorkPostRef(
          updatedEmployee?.workPostId || updatedEmployee?.workPost?.id || employeeData.workPostId,
        );

        queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
        if (updatedEmployee?.id) {
          queryClient.setQueryData(queryKeys.employees.byId(funcionario.id), updatedEmployee);
        }

        lastSavedFormRef.current = currentFormStr;
        setSaveStatus('saved');
        const resetStatusTimeout = setTimeout(() => setSaveStatus('idle'), 3000);
        return () => clearTimeout(resetStatusTimeout);
      } catch (err) {
        console.error('Erro no salvamento automático:', err);
        setSaveStatus('error');
      }
    }, 1500);

    return () => clearTimeout(delayDebounceFn);
  }, [form, funcionario, queryClient, open]);

  const loadEmployeeDependents = async (employeeId: string | undefined, keepOnError = false) => {
    const raw = String(employeeId ?? '').trim();
    if (!raw) {
      setEmployeeDependents([]);
      return;
    }
    if (
      raw === '00000000-0000-0000-0000-000000000001' ||
      raw === '00000000-0000-0000-0000-000000000000' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)
    ) {
      setEmployeeDependents([]);
      return;
    }
    setLoadingDependents(true);
    try {
      const list = await dependentService.getDependentsByEmployee(raw);
      setEmployeeDependents(Array.isArray(list) ? list : []);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 500) {
        // Backend serialization error — dependente provavelmente foi salvo
        console.warn('[dependentes] GET retornou 500 — backend issue (mantém lista atual):', err);
        if (!keepOnError) setEmployeeDependents([]);
      } else {
        console.error('Erro ao carregar dependentes:', err);
        if (!keepOnError) setEmployeeDependents([]);
      }
    } finally {
      setLoadingDependents(false);
    }
  };

  useEffect(() => {
    if (!open || !funcionario?.id) {
      setEmployeeDependents([]);
      return;
    }
    loadEmployeeDependents(String(funcionario.id).trim());
  }, [open, funcionario?.id]);

  // Carregar dados para os selects quando o modal abrir
  useEffect(() => {
    if (open) {
      console.log('🔄 Modal aberto, carregando dados dos selects...');
      loadSelectData();
    }
  }, [open]);

  // Carregar histórico de mudanças quando abrir a aba Histórico
  useEffect(() => {
    if (!canSeeHistory || activeTab !== 'historico' || !funcionario?.id) {
      return;
    }
    let cancelled = false;
    
    // Buscar histórico de auditoria
    setHistoryLoading(true);
    setEmploymentPeriodsLoading(true);
    Promise.all([
      employeeChangeHistoryService.getByEmployeeId(funcionario.id, historyPageIndex, 20),
      employeeEmploymentPeriodService.getEmploymentPeriods(funcionario.id),
    ])
      .then(([history, periods]) => {
        if (!cancelled) {
          setHistoryData(history);
          setEmploymentPeriods(periods);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHistoryData(null);
          setEmploymentPeriods([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHistoryLoading(false);
          setEmploymentPeriodsLoading(false);
        }
      });

    // Buscar histórico de remanejamentos
    setLoadingRemanejamentos(true);
    remanejamentoService
      .getRemanejamentosByEmployee(funcionario.id)
      .then((data) => {
        if (!cancelled) setRemanejamentos(data || []);
      })
      .catch(() => {
        if (!cancelled) setRemanejamentos([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRemanejamentos(false);
      });

    return () => { cancelled = true; };
  }, [canSeeHistory, activeTab, funcionario?.id, historyPageIndex]);

  // Sincronizar Empresa e Posto do formulário quando companies/workPosts carregarem (dados vêm do getEmployeeById)
  useEffect(() => {
    if (!open || !funcionario?.id) return;
    const companyId = (form as any).company?.id;
    if (companyId && companies.length > 0) {
      const company = companies.find(c => String(c.id) === String(companyId));
      console.log('🔍 Sincronizando empresa selecionada:', { 
        formCompanyId: companyId, 
        found: !!company,
        totalCompanies: companies.length,
        selectedCompanyId: selectedCompany?.id
      });
      if (company && (!selectedCompany || String(selectedCompany.id) !== String(companyId))) {
        setSelectedCompany(company);
      } else if (!company) {
        console.warn(`⚠️ Empresa ID ${companyId} não encontrada na lista de ${companies.length} empresas.`);
      }
    }
  }, [(form as any).company?.id, companies, open, funcionario?.id]);

  useEffect(() => {
    if (!open || !funcionario?.id) {
      workPostSelectReadyRef.current = false;
      return;
    }

    const hasInitialPost = initialWorkPostIdRef.current !== '';
    if (hasInitialPost && workPosts.length === 0) {
      workPostSelectReadyRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      workPostSelectReadyRef.current = true;
    }, 150);

    return () => window.clearTimeout(timer);
  }, [open, funcionario?.id, workPosts.length]);

  // Atualizar usuário e cargo selecionados quando os dados forem carregados
  useEffect(() => {
    if (funcionario && open && users.length > 0 && positions.length > 0) {
      console.log('🔄 Atualizando selects com dados carregados');
      console.log('👤 Funcionário user ID:', funcionario.user?.id);
      console.log('💼 Funcionário position ID:', funcionario.position?.id);
      console.log('📋 Users disponíveis:', users.length);
      console.log('📋 Positions disponíveis:', positions.length);
      
      // Preencher usuário selecionado
      if (funcionario.user?.id) {
        const user = users.find(u => u.id === funcionario.user?.id);
        if (user) {
          setSelectedUser(user);
          setUserSearchTerm(user.name || user.email || '');
          console.log('✅ Usuário encontrado e selecionado:', user.name);
        } else {
          console.warn('⚠️ Usuário não encontrado na lista:', funcionario.user?.id);
        }
      } else {
        console.log('ℹ️ Funcionário não tem usuário associado');
      }
      
      // Preencher cargo selecionado - comparar IDs como strings
      if (funcionario.position?.id) {
        const positionId = String(funcionario.position.id);
        const position = positions.find(p => String(p.id) === positionId);
        if (position) {
          setSelectedPosition(position);
          console.log('✅ Cargo encontrado e selecionado:', position.name);
        } else {
          console.warn('⚠️ Cargo não encontrado na lista:', positionId);
        }
      } else {
        console.log('ℹ️ Funcionário não tem cargo associado');
      }
      
      // Preencher usuário selecionado - comparar IDs como strings
      if (funcionario.user?.id) {
        const userId = String(funcionario.user.id);
        const user = users.find(u => String(u.id) === userId);
        if (user) {
          setSelectedUser(user);
          setUserSearchTerm(user.name || user.email || '');
          console.log('✅ Usuário encontrado e selecionado:', user.name);
        } else {
          console.warn('⚠️ Usuário não encontrado na lista:', userId);
        }
      } else {
        console.log('ℹ️ Funcionário não tem usuário associado');
      }
      
      // Preencher empresa selecionada - comparar IDs como strings
      if (funcionario.company?.id && companies.length > 0) {
        const companyId = String(funcionario.company.id);
        const company = companies.find(c => String(c.id) === companyId);
        if (company) {
          setSelectedCompany(company);
          console.log('✅ Empresa encontrada e selecionada:', company.name, company.id);
        } else {
          console.warn('⚠️ Empresa não encontrada na lista:', companyId);
        }
      } else {
        console.log('ℹ️ Funcionário não tem empresa associada ou lista de empresas não carregada');
      }
    }
  }, [funcionario, users, positions, companies, open]);

  // Filtrar usuários baseado no termo de busca
  useEffect(() => {
    if (userSearchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(userSearchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [userSearchTerm, users]);

  // Preencher formulário quando funcionário for selecionado
  useEffect(() => {
    const loadFullEmployeeData = async () => {
      if (!funcionario || !open || !funcionario.id) {
        return;
      }

      try {
        console.log('🔍 Buscando dados completos do funcionário ID:', funcionario.id);
        const fullEmployee = await fetchEmployeeDetailForEdit(queryClient, funcionario.id);

        if (!fullEmployee) {
          console.warn('⚠️ Funcionário não encontrado no backend');
          return;
        }

        console.log('✅ Dados completos do funcionário carregados:', fullEmployee);
        console.log('🔍 Dados bancários brutos:', {
          bankData: fullEmployee.bankData,
          bankInfo: (fullEmployee as any).bankInfo
        });
        
        // Usar dados do funcionário completo buscado do backend
        const employeeData = fullEmployee || funcionario;
        
        console.log('🔍 [DEBUG] employeeData.workPost:', (employeeData as any).workPost);
        console.log('🔍 [DEBUG] employeeData.workPostId:', (employeeData as any).workPostId);
        
        // Tratar address que pode ser string ou objeto
        const addressValue = typeof employeeData.address === 'string' 
          ? employeeData.address 
          : employeeData.address?.street || '';
        
        // Tratar CPF que pode vir como cpf ou document
        const cpfValue = employeeData.cpf || (employeeData as any).document || '';
      
        // Tratar dados bancários - verificar tanto bankData quanto bankInfo
        let bankData = {
          bank: '',
          agency: '',
          account: '',
          accountDigit: '',
          type: 'CORRENTE' as const,
          chavePix: ''
        };
 
        // Backend envia como bankData ou bankInfo
        const rawBankData = (employeeData as any).bankData;
        const rawBankInfo = (employeeData as any).bankInfo;
 
        if (rawBankData) {
          bankData = {
            bank: rawBankData.bank || '',
            agency: rawBankData.agency || '',
            account: rawBankData.account || '',
            accountDigit: rawBankData.accountDigit || '',
            type: rawBankData.type || rawBankData.accountType || 'CORRENTE',
            chavePix: rawBankData.chavePix || rawBankData.pixKey || ''
          };
        } else if (rawBankInfo) {
          bankData = {
            bank: rawBankInfo.bank || '',
            agency: rawBankInfo.agency || '',
            account: rawBankInfo.account || '',
            accountDigit: rawBankInfo.accountDigit || '',
            type: rawBankInfo.type || rawBankInfo.accountType || 'CORRENTE',
            chavePix: rawBankInfo.chavePix || rawBankInfo.pixKey || ''
          };
        }
        
        console.log('💰 Dados bancários mapeados para o formulário:', bankData);
        
        // Inicialmente usar phone do funcionário
        let initialPhone = employeeData.phone || '';
        
        // Se endereço vier como objeto AddressDTO, extrair campos separados
        let enderecoRua = (employeeData as any).enderecoRua || '';
        let enderecoNumero = (employeeData as any).enderecoNumero || '';
        let enderecoComplemento = (employeeData as any).enderecoComplemento || '';
        let enderecoBairro = (employeeData as any).enderecoBairro || '';
        let enderecoCidade = (employeeData as any).enderecoCidade || '';
        let enderecoEstado = (employeeData as any).enderecoEstado || '';
        let enderecoCep = (employeeData as any).enderecoCep || '';
        
        // Se endereço vier como objeto address com campos separados, preencher campos vazios
        if (employeeData.address && typeof employeeData.address === 'object') {
          const addr = employeeData.address as any;
          if (!enderecoRua && addr.street) enderecoRua = addr.street;
          if (!enderecoNumero && addr.number) enderecoNumero = addr.number;
          if (!enderecoComplemento && addr.complement) enderecoComplemento = addr.complement;
          if (!enderecoBairro && addr.neighborhood) enderecoBairro = addr.neighborhood;
          if (!enderecoCidade && addr.city) enderecoCidade = addr.city;
          if (!enderecoEstado && addr.state) enderecoEstado = addr.state;
          if (!enderecoCep && addr.zipCode) enderecoCep = addr.zipCode;
        }
        
        const formToSet = {
          ...employeeData,
          name: employeeData.name || '',
          cpf: cpfValue,
          rg: employeeData.rg || '',
          email: employeeData.email || '',
          phone: initialPhone,
          birthDate: employeeData.birthDate || '',
          maritalStatus: employeeData.maritalStatus || 'SINGLE',
          nationality: employeeData.nationality || 'Brasileiro',
          registrationNumber: employeeData.registrationNumber || '',
          hireDate: employeeData.hireDate || '',
          status: employeeData.status || 'ACTIVE',
          bankData: bankData,
          // Pais - Fallback para .pai e .mae
          nomePai: employeeData.nomePai || (employeeData as any).pai || '',
          nomeMae: employeeData.nomeMae || (employeeData as any).mae || '',
          
          // Relacionamentos
          position: { id: employeeData.position?.id ? String(employeeData.position.id) : '' },
          unit: { id: employeeData.unit?.id ? String(employeeData.unit.id) : '' },
          user: { id: employeeData.user?.id ? String(employeeData.user.id) : '' },
          company: { id: (employeeData.company?.id ?? (employeeData as any).companyId) ? String(employeeData.company?.id ?? (employeeData as any).companyId) : '' },
          workPostId: (() => {
            const wp = (employeeData as any).workPost;
            let id = wp?.id ?? (employeeData as any).workPostId;
            return (id != null && id !== '') ? String(id) : '';
          })(),
          departmentId: String((employeeData as any).department?.id || (employeeData as any).departmentId || ''),

          // Explicitly set fields that might be overwritten by `...employeeData` if they are objects or need specific formatting
          address: addressValue, // Ensure address is handled correctly
          enderecoRua: enderecoRua,
          enderecoNumero: enderecoNumero,
          enderecoComplemento: enderecoComplemento,
          enderecoBairro: enderecoBairro,
          enderecoCidade: enderecoCidade,
          enderecoEstado: enderecoEstado,
          enderecoCep: enderecoCep,
          telefoneContato: (employeeData as any).telefoneContato || '',
          notes: employeeData.notes || '',
          spouseName: employeeData.spouseName || '',
          spouseCpf: employeeData.spouseCpf || '',
          spouseRg: employeeData.spouseRg || '',
          spouseBirthDate: employeeData.spouseBirthDate || '',
          spousePhone: employeeData.spousePhone || '',
          spouseEmail: employeeData.spouseEmail || '',
          
          // Campos da ficha de registro
          empresaNome: employeeData.empresaNome || (companies.find(c => String(c.id) === String(employeeData.company?.id || (employeeData as any).companyId))?.name || ''),
          empresaEndereco: employeeData.empresaEndereco || (companies.find(c => String(c.id) === String(employeeData.company?.id || (employeeData as any).companyId))?.address || ''),
          empresaCnpj: employeeData.empresaCnpj || (companies.find(c => String(c.id) === String(employeeData.company?.id || (employeeData as any).companyId))?.cnpj || ''),
          tituloEleitor: employeeData.tituloEleitor || '',
          tituloEleitorZona: employeeData.tituloEleitorZona || '',
          tituloEleitorSecao: employeeData.tituloEleitorSecao || '',
          carteiraIdentidadeOrgaoEmissor: employeeData.carteiraIdentidadeOrgaoEmissor || '',
          carteiraIdentidadeDataEmissao: employeeData.carteiraIdentidadeDataEmissao || '',
          rgUf: employeeData.rgUf || '',
          racaCor: employeeData.racaCor || '',
          tipoSalarioContratual: employeeData.tipoSalarioContratual || '',
          certificadoMilitar: employeeData.certificadoMilitar || '',
          localNascimento: employeeData.localNascimento || '',
          municipioNascimento: employeeData.municipioNascimento || '',
          estadoNascimento: employeeData.estadoNascimento || '',
          sexo: employeeData.sexo || '',
          grauInstrucao: employeeData.grauInstrucao || '',
          matriculaEsocial: employeeData.matriculaEsocial || '',
          cbo: employeeData.cbo || '',
          salario: employeeData.salario
            ? (typeof employeeData.salario === 'number'
              ? String(employeeData.salario)
              : employeeData.salario)
            : '' as any,
          salarioPorExtenso: employeeData.salarioPorExtenso || '',
          periodoPagamento: employeeData.periodoPagamento || '',
          horarioTrabalho: employeeData.horarioTrabalho || '',
          folgaSemanal: employeeData.folgaSemanal || '',
          fgtsOptante: employeeData.fgtsOptante || false,
          fgtsDataOpcao: employeeData.fgtsDataOpcao || '',
          fgtsBancoDepositario: employeeData.fgtsBancoDepositario || '',
          fgtsDataRetratacao: employeeData.fgtsDataRetratacao || '',
          pis: employeeData.pis || '',
          pisDataCadastro: employeeData.pisDataCadastro || '',
          pisBancoDepositario: employeeData.pisBancoDepositario || '',
          pisEnderecoBanco: employeeData.pisEnderecoBanco || '',
          pisCodigoBanco: employeeData.pisCodigoBanco || '',
          pisCodigoAgencia: employeeData.pisCodigoAgencia || '',
          cnhNumber: employeeData.cnhNumber || '',
          cnhExpirationDate: employeeData.cnhExpirationDate || '',
          cnhCategory: employeeData.cnhCategory || '',
          ctps: employeeData.ctps || '',
          ctpsRural: employeeData.ctpsRural || '',
          ctpsSeries: employeeData.ctpsSeries || '',
          ctpsIssueDate: employeeData.ctpsIssueDate || '',
          ctpsIssuingAgency: employeeData.ctpsIssuingAgency || '',
          carteiraModelo19: employeeData.carteiraModelo19 || '',
          registroGeralEstrangeiro: employeeData.registroGeralEstrangeiro || '',
          casadoBrasileiro: employeeData.casadoBrasileiro || false,
          nomeConjugeEstrangeiro: employeeData.nomeConjugeEstrangeiro || '',
          temFilhosBrasileiros: employeeData.temFilhosBrasileiros || false,
          quantidadeFilhosBrasileiros: employeeData.quantidadeFilhosBrasileiros || 0,
          dataChegadaBrasil: employeeData.dataChegadaBrasil || '',
          naturalizado: employeeData.naturalizado || false,
          decretoNaturalizacao: employeeData.decretoNaturalizacao || '',
          vistoFiscalizacao: employeeData.vistoFiscalizacao || '',
          assinaturaFuncionario: employeeData.assinaturaFuncionario || '',
          dataRescisao: employeeData.dataRescisao || '',
          terminationReason: employeeData.terminationReason || undefined,
          gender: employeeData.gender || '',

          // Novos campos
          horarioTrabalhoIntervalo: employeeData.horarioTrabalhoIntervalo || '',
          diasTrabalho: employeeData.diasTrabalho || '',
          prazoExperienciaTexto: employeeData.prazoExperienciaTexto || '',
          prorrogacaoExperiencia: employeeData.prorrogacaoExperiencia || '',
          escalaTrabalho: employeeData.escalaTrabalho || '',
          exameMedicoData: employeeData.exameMedicoData || '',
          exameMedicoVencimento: employeeData.exameMedicoVencimento || '',
          exameMedicoTipo: employeeData.exameMedicoTipo || '',
          exameMedicoHorario: employeeData.exameMedicoHorario || '',
          exameMedicoIntervalosRefeicao: employeeData.exameMedicoIntervalosRefeicao || false,
          exameMedicoObservacoes: employeeData.exameMedicoObservacoes || '',
          exameMedicoPrimeiroEmprego: employeeData.exameMedicoPrimeiroEmprego || false,
          exameMedicoContribuicaoSindicalPaga: employeeData.exameMedicoContribuicaoSindicalPaga || false,
          rneNumero: employeeData.rneNumero || '',
          rneValidade: employeeData.rneValidade || '',
          ricNumero: employeeData.ricNumero || '',
          ricOrgaoEmissor: employeeData.ricOrgaoEmissor || '',
          ricDataEmissao: employeeData.ricDataEmissao || '',
          tipoVisto: employeeData.tipoVisto || '',
          cinNumero: employeeData.cinNumero || '',
          cinOrgaoEmissor: employeeData.cinOrgaoEmissor || '',
          cinDataEmissao: employeeData.cinDataEmissao || '',
          exameMedicoHorarioIntervalo: (employeeData as any).exameMedicoHorarioIntervalo || '',
          exameMedicoDoctor: (employeeData as any).exameMedicoDoctor?.id
            ? { id: String((employeeData as any).exameMedicoDoctor.id) }
            : { id: '' },
        };
        
        console.log('🔍 [DEBUG] formToSet.workPostId:', formToSet.workPostId);
        setForm(formToSet);
        initialWorkPostIdRef.current = String(formToSet.workPostId || '').toLowerCase();
        workPostSelectReadyRef.current = false;
        if ((formToSet.status || '').toUpperCase() === 'TERMINATED') {
          setEligibleRehireEmployee(employeeData as EligibleRehireEmployee);
        } else {
          setEligibleRehireEmployee(null);
          setRehireAdmissionType('');
        }
        setTemIntervaloRefeicao(employeeData.horarioTrabalhoIntervalo ? 'sim' : 'nao');

        const docRef = (employeeData as any).exameMedicoDoctor;
        if (docRef?.id) {
          const doctorId = String(docRef.id);
          if (docRef.name) {
            setSelectedDoctor({ id: doctorId, name: docRef.name } as Doctor);
            setDoctorSearchTerm(
              docRef.crmNumber
                ? `${docRef.name} - CRM ${docRef.crmNumber}/${docRef.crmState || ''}`
                : String(docRef.name),
            );
          } else {
            doctorService
              .getById(doctorId)
              .then((d) => {
                setSelectedDoctor(d);
                setDoctorSearchTerm(`${d.name} - CRM ${d.crmNumber}/${d.crmState}`);
              })
              .catch(() => setDoctorSearchTerm(''));
          }
        } else {
          setSelectedDoctor(null);
          setDoctorSearchTerm('');
        }
        
        console.log('✅ Formulário preenchido com dados completos do funcionário');
        console.log('📋 Dados principais:', {
          name: employeeData.name,
          cpf: cpfValue,
          email: employeeData.email,
          phone: employeeData.phone,
          whatsapp: initialPhone,
          enderecoRua: enderecoRua,
          enderecoCep: enderecoCep,
          position: employeeData.position?.id,
          positionName: employeeData.position?.name,
          userId: employeeData.user?.id,
          userName: employeeData.user?.name || employeeData.user?.email,
          bankData: bankData,
          address: addressValue,
          photoUrl: (employeeData as any).photoUrl || ''
        });

        // Exibir preview da foto já existente
        if ((employeeData as any).photoUrl) {
          setPhotoPreview((employeeData as any).photoUrl);
        }
        
        // Buscar WhatsApp do usuário vinculado se existir
        if (employeeData.user?.id) {
          try {
            const userId = String(employeeData.user.id);
            // Primeiro tentar encontrar na lista já carregada
            const linkedUser = users.find(u => String(u.id) === userId);
            if (linkedUser?.whatsapp) {
              setForm(prev => ({
                ...prev,
                phone: linkedUser.whatsapp || prev.phone
              }));
              console.log('✅ WhatsApp encontrado no usuário vinculado (da lista):', linkedUser.whatsapp);
            } else {
              // Se não encontrou na lista, buscar do backend
              try {
                const userData = await userService.getUserById(userId);
                if (userData?.whatsapp) {
                  setForm(prev => ({
                    ...prev,
                    phone: userData.whatsapp || prev.phone
                  }));
                  console.log('✅ WhatsApp encontrado após buscar usuário:', userData.whatsapp);
                } else {
                  console.log('ℹ️ Usuário vinculado não tem WhatsApp cadastrado');
                }
              } catch (userError) {
                console.warn('⚠️ Erro ao buscar usuário para WhatsApp:', userError);
              }
            }
          } catch (whatsappError) {
            console.warn('⚠️ Erro ao buscar WhatsApp do usuário:', whatsappError);
          }
        }
      } catch (error) {
        console.error('❌ Erro ao buscar dados completos do funcionário:', error);
        if (funcionario) {
          const fallback = employeeService.normalizeEmployee(funcionario as any);
          if (fallback) {
            const synced = employeeService.syncFlatAddressFromApi(fallback as Record<string, unknown>);
            const bankData = employeeService.mapBankDataFromApi(synced);
            const addr =
              typeof synced.address === 'object' && synced.address
                ? (synced.address as Record<string, string>)
                : null;
            setForm((prev) => ({
              ...prev,
              name: String(synced.name || prev.name),
              cpf: String(synced.cpf || (synced as any).document || prev.cpf),
              email: String(synced.email || prev.email),
              phone: String(synced.phone || prev.phone),
              bankData,
              enderecoRua: String(synced.enderecoRua || addr?.street || ''),
              enderecoNumero: String(synced.enderecoNumero || addr?.number || ''),
              enderecoBairro: String(synced.enderecoBairro || addr?.neighborhood || ''),
              enderecoCidade: String(synced.enderecoCidade || addr?.city || ''),
              enderecoEstado: String(synced.enderecoEstado || addr?.state || ''),
              enderecoCep: String(synced.enderecoCep || addr?.zipCode || ''),
              salario: synced.salario != null ? String(synced.salario) : (prev.salario as any),
              workPostId: String(synced.workPostId || synced.workPost?.id || ''),
              exameMedicoData: String((synced as any).exameMedicoData || ''),
              exameMedicoVencimento: String((synced as any).exameMedicoVencimento || ''),
              exameMedicoTipo: String((synced as any).exameMedicoTipo || ''),
              exameMedicoPrimeiroEmprego: Boolean((synced as any).exameMedicoPrimeiroEmprego),
              exameMedicoContribuicaoSindicalPaga: Boolean((synced as any).exameMedicoContribuicaoSindicalPaga),
              nomePai: String((synced as any).nomePai || ''),
              nomeMae: String((synced as any).nomeMae || ''),
              sexo: String((synced as any).sexo || ''),
              grauInstrucao: String((synced as any).grauInstrucao || ''),
            }));
            console.log('⚠️ Formulário preenchido com dados parciais do funcionário (fallback)');
          }
        }
      }
    };

    if (funcionario && open) {
      loadFullEmployeeData();
    } else if (open && !funcionario) {
      // Resetar formulário quando modal abrir sem funcionário
      console.log('🔄 Resetando formulário - nenhum funcionário selecionado');
    }
  }, [funcionario, open]);

  // Buscar WhatsApp do usuário vinculado quando o funcionário tiver usuário
  useEffect(() => {
    const loadWhatsAppFromUser = async () => {
      if (!funcionario || !open || !funcionario.user?.id) {
        return;
      }

      const userId = String(funcionario.user.id);

      // Primeiro tentar encontrar na lista já carregada
      const linkedUser = users.find(u => String(u.id) === userId);
      if (linkedUser?.whatsapp) {
        setForm(prev => ({
          ...prev,
          phone: linkedUser.whatsapp || prev.phone
        }));
        console.log('✅ WhatsApp encontrado no usuário vinculado (da lista):', linkedUser.whatsapp);
        return;
      }

      // Se não encontrou na lista ou não tem WhatsApp, buscar do backend
      try {
        const userData = await userService.getUserById(userId);
        if (userData?.whatsapp) {
          setForm(prev => ({
            ...prev,
            phone: userData.whatsapp || prev.phone
          }));
          console.log('✅ WhatsApp encontrado após buscar usuário:', userData.whatsapp);
        } else {
          console.log('ℹ️ Usuário vinculado não tem WhatsApp cadastrado');
        }
      } catch (error) {
        console.warn('⚠️ Erro ao buscar usuário para WhatsApp:', error);
      }
    };

    loadWhatsAppFromUser();
  }, [funcionario, open, users]);

  // Função para buscar CEP
  const buscarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    
    setLoadingCep(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cepLimpo}`);
      
      if (response.ok) {
        const data = await response.json();
        const uf = String(data.state || data.uf || '')
          .trim()
          .toUpperCase()
          .slice(0, 2);
        setForm(prev => ({
          ...prev,
          enderecoRua: data.street || '',
          enderecoBairro: data.neighborhood || '',
          enderecoCidade: data.city || '',
          enderecoEstado: uf,
          enderecoCep: cepLimpo,
          address: `${data.street || ''}, ${data.neighborhood || ''}, ${data.city || ''} - ${uf}, ${cepLimpo}`
        }));
        toast({
          title: "CEP encontrado",
          description: "Endereço preenchido automaticamente.",
        });
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP informado.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast({
        title: "Erro",
        description: "Não foi possível buscar o CEP.",
        variant: "destructive"
      });
    } finally {
      setLoadingCep(false);
    }
  };

  // Função para aplicar máscara de telefone
  const aplicarMascaraTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length <= 10) {
      return numeros.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
    } else {
      return numeros.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
    }
  };
  
  // Função para aplicar máscara de CEP
  const aplicarMascaraCep = (valor: string) => {
    const numeros = valor.replace(/\D/g, '');
    return numeros.replace(/(\d{5})(\d{0,3})/, '$1-$2');
  };

  // Função para carregar médicos
  const loadDoctors = async () => {
    try {
      setLoadingDoctors(true);
      const doctorsList = await doctorService.getAllActive();
      setDoctors(doctorsList);
    } catch (error) {
      console.error('Erro ao carregar médicos:', error);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Função para buscar médicos por nome
  const handleDoctorSearch = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      loadDoctors();
      return;
    }
    try {
      setLoadingDoctors(true);
      const doctorsList = await doctorService.getAllActive();
      const filtered = doctorsList.filter(doctor =>
        doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.crmNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setDoctors(filtered);
    } catch (error) {
      console.error('Erro ao buscar médicos:', error);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const loadSelectData = async () => {
    setLoadingData(true);
    try {
      console.log('📥 Carregando dados dos selects...');
      const [positionsData, unitsData, usersData, companiesData, workPostsData, departmentsData, clientsData] = await Promise.all([
        positionService.getPositions().catch(err => { console.warn('⚠️ Erro ao carregar cargos:', err); return []; }),
        unitService.getAllUnits().catch(err => { console.warn('⚠️ Erro ao carregar unidades:', err); return []; }),
        userService.getAllUsers().catch(err => { console.warn('⚠️ Erro ao carregar usuários:', err); return []; }),
        companyService.getAllCompanies().then(data => {
          console.log('✅ DIAGNÓSTICO /api/companies RETORNOU:', data);
          return data;
        }).catch(err => { 
          console.error('❌ CRITICAL: Erro ao carregar empresas:', err.response || err); 
          return []; 
        }),
        workPostService.getAllWorkPosts().catch(err => { console.warn('⚠️ Erro ao carregar postos de trabalho:', err); return []; }),
        departmentService.listActive().catch(err => { console.warn('⚠️ Erro ao carregar departamentos:', err); return []; }),
        clientService.getAllClients().catch(err => { console.warn('⚠️ Erro ao carregar clientes:', err); return []; })
      ]);
      
      console.log('✅ Dados carregados:', {
        positions: positionsData.length,
        units: unitsData.length,
        users: usersData.length,
        companies: companiesData.length,
        clients: clientsData.length
      });
      
      if (companiesData.length === 0) {
        console.warn('⚠️ AVISO: A lista de empresas retornou vazia do backend.');
      } else {
        console.log(`✅ ${companiesData.length} empresas carregadas com sucesso.`);
      }

      setPositions(positionsData);
      setUnits(unitsData);
      setUsers(usersData);
      setFilteredUsers(usersData);
      setCompanies(companiesData);
      const sortedWorkPosts = (workPostsData || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setWorkPosts(sortedWorkPosts);
      setDepartments(filterCompanyDepartments(departmentsData));
      setClients(clientsData);
      
      // Carregar médicos
      await loadDoctors();
      
      // Após carregar os dados, preencher os selects se houver funcionário
      if (funcionario) {
        console.log('🔍 Funcionário encontrado, preenchendo selects...');
        console.log('👤 Funcionário user ID:', funcionario.user?.id);
        console.log('💼 Funcionário position ID:', funcionario.position?.id);
        
        // Preencher usuário selecionado - comparar IDs como strings
        if (funcionario.user?.id) {
          const userId = String(funcionario.user.id);
          const user = usersData.find(u => String(u.id) === userId);
          if (user) {
            setSelectedUser(user);
            setUserSearchTerm(user.name || user.email || '');
            console.log('✅ Usuário encontrado e selecionado:', user.name, user.id);
          } else {
            console.warn('⚠️ Usuário não encontrado na lista');
            console.warn('   Procurando por:', userId);
            console.warn('   IDs disponíveis:', usersData.map(u => String(u.id)));
            // Mesmo não encontrando, definir o ID no formulário para que apareça quando a lista carregar
            setForm(prev => ({ ...prev, user: { id: userId } }));
          }
        } else {
          console.log('ℹ️ Funcionário não tem usuário associado');
        }
        
        // Preencher cargo selecionado - comparar IDs como strings
        if (funcionario.position?.id) {
          const positionId = String(funcionario.position.id);
          const position = positionsData.find(p => String(p.id) === positionId);
          if (position) {
            setSelectedPosition(position);
            console.log('✅ Cargo encontrado e selecionado:', position.name, position.id);
          } else {
            console.warn('⚠️ Cargo não encontrado na lista');
            console.warn('   Procurando por:', positionId);
            console.warn('   IDs disponíveis:', positionsData.map(p => String(p.id)));
            // Mesmo não encontrando, definir o ID no formulário para que apareça quando a lista carregar
            setForm(prev => ({ ...prev, position: { id: positionId } }));
          }
        } else {
          console.log('ℹ️ Funcionário não tem cargo associado');
        }
        
        // Preencher empresa selecionada - comparar IDs como strings
        if (funcionario.company?.id) {
          const companyId = String(funcionario.company.id).toLowerCase();
          const company = companiesData.find(c => String(c.id).toLowerCase() === companyId);
          if (company) {
            setSelectedCompany(company);
            console.log('✅ Empresa encontrada e selecionada:', company.name, company.id);
          } else {
            console.warn('⚠️ Empresa não encontrada na lista detalhada');
            console.warn('   Procurando por (toLowerCase):', companyId);
            console.warn('   IDs disponíveis:', companiesData.map(c => String(c.id).toLowerCase()));
          }
        } else {
          console.log('ℹ️ Funcionário não tem empresa associada');
        }
      }
    } catch (err) {
      console.error('❌ Erro ao carregar dados dos selects:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle bankData fields
    if (name.startsWith('bankData.')) {
      const field = name.split('.')[1];
      setForm((prev) => ({
        ...prev,
        bankData: {
          ...(prev.bankData || { bank: '', agency: '', account: '', type: 'CORRENTE', chavePix: '' }),
          [field]: value
        }
      }));
    } else if (name === 'dataRescisao') {
      setForm((prev) => ({
        ...prev,
        [name]: value,
        ...(value ? { status: 'TERMINATED' } : { status: 'ACTIVE', terminationReason: undefined })
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleTituloEleitorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTituloEleitorForInput(e.target.value);
    setForm((prev) => ({ ...prev, tituloEleitor: formatted }));
  };

  const handleSelectChange = (field: string, value: string) => {
    if (value) {
      const stringValue = String(value);
      setForm((prev) => ({ 
        ...prev, 
        [field]: { id: stringValue } 
      }));
      
      // Atualizar estados selecionados
      if (field === 'user') {
        const user = users.find(u => String(u.id) === stringValue);
        if (user) {
          setSelectedUser(user);
          setUserSearchTerm(user.name || user.email || '');
        }
      } else if (field === 'position') {
        const position = positions.find(p => String(p.id) === stringValue);
        if (position) {
          setSelectedPosition(position);
        }
      }
    } else {
      setForm((prev) => {
        const newForm = { ...prev };
        if (field === 'position') {
          newForm.position = { id: '' };
          setSelectedPosition(null);
        } else if (field === 'unit') {
          newForm.unit = { id: '' };
        } else if (field === 'user') {
          newForm.user = { id: '' };
          setSelectedUser(null);
          setUserSearchTerm('');
        } else if (field === 'company') {
          newForm.company = { id: '' };
          setSelectedCompany(null);
        }
        return newForm;
      });
    }
  };
  
  const handleCompanySelect = (companyId: string) => {
    if (companyId === 'none' || companyId === '') {
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

  // Atualizar campo address quando campos separados são alterados
  useEffect(() => {
    if (form.enderecoRua || form.enderecoNumero || form.enderecoBairro || form.enderecoCidade || form.enderecoEstado || form.enderecoCep) {
      const partes = [
        form.enderecoRua,
        form.enderecoNumero ? `nº ${form.enderecoNumero}` : '',
        form.enderecoComplemento || '',
        form.enderecoBairro,
        form.enderecoCidade,
        form.enderecoEstado,
        form.enderecoCep ? `CEP: ${form.enderecoCep}` : ''
      ].filter(Boolean);

      const enderecoCompleto = partes.join(', ');

      setForm(prev => ({
        ...prev,
        address: enderecoCompleto
      }));
    }
  }, [form.enderecoRua, form.enderecoNumero, form.enderecoComplemento, form.enderecoBairro, form.enderecoCidade, form.enderecoEstado, form.enderecoCep]);

  const normalizeWorkPostId = (id?: string | null) => {
    const s = String(id || '').toLowerCase();
    return s === 'none' ? '' : s;
  };

  const isWorkPostTransfer = (fromId: string, toId: string) => {
    const from = normalizeWorkPostId(fromId);
    const to = normalizeWorkPostId(toId);
    return from !== '' && to !== '' && from !== to;
  };

  const syncInitialWorkPostRef = (workPostId?: string | null) => {
    initialWorkPostIdRef.current = normalizeWorkPostId(workPostId);
  };

  const handleWorkPostChange = (value: string) => {
    if (!workPostSelectReadyRef.current) {
      return;
    }

    const newValue = value === 'none' ? '' : value;
    const normalizedNew = normalizeWorkPostId(newValue);
    const currentWorkPostId = normalizeWorkPostId((form as any).workPostId);

    if (normalizedNew === currentWorkPostId) {
      return;
    }

    const baseline = initialWorkPostIdRef.current;
    if (isWorkPostTransfer(baseline, normalizedNew)) {
      setPendingWorkPostId(normalizedNew);
      const hoje = new Date().toISOString().split('T')[0];
      setRemanejamentoForm({
        dataInicio: hoje,
        escalaTrabalho: form.escalaTrabalho || '',
        horarioTrabalho: form.horarioTrabalho || '',
      });
      setRemanejamentoModalOpen(true);
    } else {
      setForm(prev => ({
        ...prev,
        workPostId: normalizedNew,
        remanejamentoDataInicio: undefined,
      } as any));
    }
  };

  const handleRehireAdmissionTypeChange = (type: EmploymentAdmissionType) => {
    setRehireAdmissionType(type);
    const prevHire = eligibleRehireEmployee?.hireDate;
    setForm((prev) => ({
      ...prev,
      status: 'ACTIVE',
      hireDate: prev.hireDate === prevHire ? '' : prev.hireDate,
    }));
  };

  const isRehireFormMode = Boolean(eligibleRehireEmployee && rehireAdmissionType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!funcionario) return;
    
    // Validação de formato de email (se preenchido)
    if (form.email && form.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        setError('Por favor, insira um email válido.');
        return;
      }
    }
    
    if (
      !form.enderecoRua ||
      !form.enderecoNumero ||
      !form.enderecoBairro ||
      !form.enderecoCidade ||
      !form.enderecoEstado ||
      !form.enderecoCep
    ) {
      setError('Todos os campos de endereço são obrigatórios (Rua, Número, Bairro, Cidade, Estado e CEP).');
      return;
    }

    if (!form.cpf?.trim()) {
      setError('CPF é obrigatório.');
      return;
    }

    if (!form.hireDate) {
      setError('Data de admissão é obrigatória.');
      return;
    }

    const cpfDigits = form.cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11 || !validateCPF(form.cpf)) {
      setError('Informe um CPF válido.');
      setCpfError('CPF inválido');
      return;
    }

    if (eligibleRehireEmployee?.id && !rehireAdmissionType) {
      setError('Selecione Readmissão ou Promoção para recontratar o funcionário.');
      return;
    }

    const isRehireFlow = Boolean(eligibleRehireEmployee?.id && rehireAdmissionType);

    if (isRehireFlow) {
      if (!form.hireDate) {
        setError('Informe a nova data de admissão para a recontratação.');
        return;
      }
      const prevHire = eligibleRehireEmployee?.hireDate;
      if (prevHire && form.hireDate === prevHire) {
        setError('A nova data de admissão deve ser diferente da data do vínculo anterior (preservada no histórico).');
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const baseline = initialWorkPostIdRef.current;
      const targetPost = normalizeWorkPostId((form as any).workPostId);
      if (isWorkPostTransfer(baseline, targetPost)) {
        const remanejamentoDataInicio = String((form as any).remanejamentoDataInicio || '').trim();
        if (!remanejamentoDataInicio) {
          setError('Ao alterar o setor/posto de trabalho, informe a data de início no novo setor. A escala de trabalho e horário também são obrigatórios e serão registrados no histórico do funcionário.');
          toast({
            title: 'Remanejamento obrigatório',
            description: 'Altere o setor/posto novamente e preencha a data de início, escala e horário.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
      }

      // Prepara os dados do funcionário, garantindo que o salário seja enviado como número
      const { remanejamentoDataInicio, ...formRest } = form as any;
      const employeeData: any = { ...formRest };
      if (remanejamentoDataInicio && remanejamentoDataInicio.trim()) {
        employeeData.remanejamentoDataInicio = remanejamentoDataInicio;
      }

      if (isRehireFlow) {
        employeeData.admissionType = rehireAdmissionType;
        employeeData.status = 'ACTIVE';
        delete employeeData.dataRescisao;
        delete employeeData.terminationDate;
        delete employeeData.terminationReason;
      }

      const updatedEmployee = isRehireFlow
        ? await employeeService.rehireEmployee(funcionario.id, employeeData)
        : await employeeService.updateEmployee(funcionario.id, employeeData);

      if (isRehireFlow) {
        setEligibleRehireEmployee(null);
        setRehireAdmissionType('');
      }
      syncInitialWorkPostRef(
        updatedEmployee?.workPostId || updatedEmployee?.workPost?.id || employeeData.workPostId,
      );
      setForm(prev => ({ ...prev, remanejamentoDataInicio: undefined } as any));
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      if (updatedEmployee?.id) {
        queryClient.setQueryData(queryKeys.employees.byId(funcionario.id), updatedEmployee);
      } else {
        queryClient.removeQueries({ queryKey: queryKeys.employees.byId(funcionario.id) });
      }
      toast({
        title: "Sucesso",
        description: isRehireFlow
          ? `Funcionário recontratado (${rehireAdmissionType === 'PROMOCAO' ? 'Promoção' : 'Readmissão'}) com sucesso!`
          : "Funcionário atualizado com sucesso!",
      });
      onSuccess();
    } catch (err: any) {
      console.error('Erro ao atualizar funcionário:', err);
      
      // Tratar erros específicos
      if (err.message.includes('CPF já cadastrado')) {
        setError('CPF já cadastrado no sistema');
        setCpfError('CPF já cadastrado');
        toast({
          title: "CPF Duplicado",
          description: "Este CPF já está cadastrado no sistema.",
          variant: "destructive"
        });
      } else if (err.message.includes('Data de admissão')) {
        setError('Data de admissão é obrigatória.');
        toast({
          title: "Campo obrigatório",
          description: "Informe a data de admissão do funcionário.",
          variant: "destructive"
        });
      } else if (err.message.includes('Email já cadastrado')) {
        setError('Email já cadastrado para outro funcionário');
        toast({
          title: "Email Duplicado",
          description: "Este email já está cadastrado para outro funcionário.",
          variant: "destructive"
        });
      } else {
        setError('Erro ao atualizar funcionário.');
        toast({
          title: "Erro",
          description: err.message || "Não foi possível atualizar o funcionário.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    if (funcionario) {
      const addr = funcionario.address && typeof funcionario.address === 'object' ? funcionario.address as any : null;
      setForm({
        name: funcionario.name || '',
        cpf: funcionario.cpf || '',
        rg: funcionario.rg || '',
        email: funcionario.email || '',
        phone: funcionario.phone || '',
        address: addr?.street || (typeof funcionario.address === 'string' ? funcionario.address : '') || '',
        birthDate: funcionario.birthDate || '',
        maritalStatus: funcionario.maritalStatus || 'SINGLE',
        nationality: funcionario.nationality || 'Brasileiro',
        registrationNumber: funcionario.registrationNumber || '',
        hireDate: funcionario.hireDate || '',
        status: funcionario.status || 'ACTIVE',
        notes: funcionario.notes || '',
        position: { id: funcionario.position?.id || '' },
        unit: { id: funcionario.unit?.id || '' },
        user: { id: funcionario.user?.id || '' },
        nomePai: funcionario.nomePai || '',
        nomeMae: funcionario.nomeMae || '',
        // Campos de endereço separados
        enderecoRua: (funcionario as any).enderecoRua || addr?.street || '',
        enderecoNumero: (funcionario as any).enderecoNumero || addr?.number || '',
        enderecoComplemento: (funcionario as any).enderecoComplemento || addr?.complement || '',
        enderecoBairro: (funcionario as any).enderecoBairro || addr?.neighborhood || '',
        enderecoCidade: (funcionario as any).enderecoCidade || addr?.city || '',
        enderecoEstado: (funcionario as any).enderecoEstado || addr?.state || '',
        enderecoCep: (funcionario as any).enderecoCep || addr?.zipCode || '',
        // Garantir que todos os campos sejam resetados ou mantidos conforme o funcionário
        cinNumero: (funcionario as any).cinNumero || '',
        cinOrgaoEmissor: (funcionario as any).cinOrgaoEmissor || '',
        cinDataEmissao: (funcionario as any).cinDataEmissao || '',
        exameMedicoData: (funcionario as any).exameMedicoData || '',
        exameMedicoVencimento: (funcionario as any).exameMedicoVencimento || '',
        exameMedicoTipo: (funcionario as any).exameMedicoTipo || '',
        exameMedicoHorarioIntervalo: (funcionario as any).exameMedicoHorarioIntervalo || '',
        exameMedicoDoctor: (funcionario as any).exameMedicoDoctor?.id
          ? { id: String((funcionario as any).exameMedicoDoctor.id) }
          : { id: '' },
        bankData: employeeService.mapBankDataFromApi(funcionario as Record<string, unknown>),
        workPostId: (funcionario as any).workPostId || (funcionario as any).workPost?.id || '',
        salario: funcionario.salario != null ? String(funcionario.salario) : ('' as any),
      });
      initialWorkPostIdRef.current = String(
        (funcionario as any).workPostId || (funcionario as any).workPost?.id || '',
      ).toLowerCase();
      workPostSelectReadyRef.current = false;
    }
    setError(null);
    setUserSearchTerm('');
  };

  const handleCargoCreated = (cargo: { id: string; name: string; description: string }) => {
    // Adicionar o novo cargo à lista
    setPositions(prev => [...prev, cargo]);
    // Selecionar automaticamente o novo cargo
    setForm(prev => ({ ...prev, position: { id: cargo.id } }));
  };

  // Não renderizar se não houver funcionário e a modal estiver fechada
  if (!open) return null;
  if (!funcionario && open) {
    return null;
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setPhotoPreview(dataUrl);
        setForm(prev => ({ ...prev, photoUrl: dataUrl }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConselhoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleForeignerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked, type, value } = e.target;
    const finalValue = type === 'checkbox' ? checked : value;
    setForm(prev => ({ ...prev, [name]: finalValue }));
  };

  const handlePositionInputFocus = () => { };
  const handlePositionInputBlur = () => { };
  const handlePositionSelect = (position: Position) => {
    setSelectedPosition(position);
    setPositionSearchTerm('');
    setForm(prev => ({ ...prev, position: { id: position.id } }));
  };

  const handleAddDependent = () => {
    setDependentToEdit(null);
    setDependentModalOpen(true);
  };

  const isEditMode = true;
  const employeeIdValue = funcionario?.id;
  const employeeDisplayName = funcionario?.name || 'Funcionario';
  const canGenerateReports = !!employeeIdValue;
  const employeeToEdit = funcionario;

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatCpfForInput(value);

    setForm(prev => ({
      ...prev,
      cpf: formatted,
      ctps: formatted
    }));

    if (formatted.length === 14) {
      if (!validateCPF(formatted)) {
        setCpfError('CPF inválido');
      } else {
        setCpfError(null);
      }
    } else {
      setCpfError(null);
    }
  };

  // handleTituloEleitorChange already exists

  const handleUserSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserSearchTerm(e.target.value);
    setShowUserDropdown(true);
  };

  const handleUserInputFocus = () => {
    setShowUserDropdown(true);
  };

  const handleUserInputBlur = () => {
    setTimeout(() => {
      setShowUserDropdown(false);
    }, 200);
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setUserSearchTerm(user.name);
    setForm(prev => ({ ...prev, user: { id: user.id } }));
  };

  const handleUsuarioPadraoCriado = (userId: string) => {
    setCriarUsuarioModalOpen(false);
    // Update user select
  };

  const handleMedicoCreated = (medico: Doctor) => {
    setNovoMedicoModalOpen(false);
  };

  const handleDependentSaved = async (savedDependent?: any) => {
    setDependentModalOpen(false);
    setDependentToEdit(null);
    if (funcionario?.id) {
      // Optimistic update: reflete na lista imediatamente
      if (savedDependent) {
        setEmployeeDependents(prev => {
          const exists = prev.some(d => d.id === savedDependent.id);
          if (exists) return prev.map(d => d.id === savedDependent.id ? savedDependent : d);
          return [...prev, savedDependent];
        });
      }
      // Recarregar mantendo lista se o servidor retornar 500
      await loadEmployeeDependents(String(funcionario.id).trim(), true);
    }
  };

  const handleEditDependent = (dependent: Dependent) => {
    setDependentToEdit(dependent);
    setDependentModalOpen(true);
  };

  const handleDeleteDependent = async (dependent: Dependent) => { };

  const openBlobInNewTab = (blob: Blob) => {
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => window.URL.revokeObjectURL(url), 100);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleChangeHistoryPdf = async () => {
    if (!funcionario?.id) return;
    setHistoryPdfLoading(true);
    try {
      const blob = await employeeService.generateEmployeeChangeHistoryPdf(funcionario.id);
      downloadBlob(blob, `historico-mudancas-${funcionario.name?.replace(/\s+/g, '_').toLowerCase() || funcionario.id}.pdf`);
      toast({
        title: 'Relatório gerado',
        description: 'PDF do histórico de mudanças baixado com sucesso.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar relatório';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setHistoryPdfLoading(false);
    }
  };

  const handleEmployeeRecordPdf = async (mode: 'download' | 'preview') => {
    if (!employeeIdValue) return;
    setLoading(true);
    try {
      const blob = await employeeService.generateEmployeeRecordPdf(employeeIdValue);
      if (mode === 'preview') {
        openBlobInNewTab(blob);
      } else {
        downloadBlob(blob, `ficha-registro-funcionario-${employeeIdValue}.pdf`);
      }
      toast({ title: "Sucesso", description: "Ficha gerada com sucesso!" });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Erro" });
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeRecordExcel = async () => {
    if (!funcionario?.id) return;
    try {
      const blob = await employeeService.generateEmployeeRecordExcel(funcionario.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ficha_registro_${funcionario.name.replace(/\s+/g, '_').toLowerCase()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast({
        title: "Sucesso",
        description: "Excel da ficha de registro gerado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao gerar Excel da ficha de registro",
        variant: "destructive",
      });
    }
  };
  const handleEpiPdf = async (mode: 'download' | 'preview') => {
    if (!selectedCompany?.id) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Empresa não selecionada."
      });
      return;
    }
    setLoading(true);
    try {
      const blob = await epiDeliveryFormService.generateBlankPdf(selectedCompany.id, funcionario?.id);

      if (mode === 'preview') {
        openBlobInNewTab(blob);
      } else {
        downloadBlob(blob, `ficha-epi-manual-${selectedCompany.sigla || 'manual'}.pdf`);
      }
      toast({ title: "Sucesso", description: "Ficha de EPI gerada com sucesso!" });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao gerar ficha de EPI." });
    } finally {
      setLoading(false);
    }
  };

  const handleEpiExcel = async () => {
    if (!funcionario?.id || !funcionario.company?.id) {
      toast({
        title: "Erro",
        description: "Dados do funcionário ou empresa incompletos",
        variant: "destructive",
      });
      return;
    }
    try {
      const data = {
        employeeId: funcionario.id,
        companyId: funcionario.company.id,
        deliveryDate: new Date().toISOString().split('T')[0],
        items: [] // Para preenchimento manual enviamos lista vazia
      };
      const blob = await epiDeliveryFormService.generateAndSaveExcel(data);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ficha_epi_vazia_${funcionario.name.replace(/\s+/g, '_').toLowerCase()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast({
        title: "Sucesso",
        description: "Excel da ficha de EPI gerado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao gerar Excel da ficha de EPI",
        variant: "destructive",
      });
    }
  };
  const handleOpenEpiManagement = () => { setEpiModalOpen(true); };

  const handleAccountingPdf = async () => {
    if (!employeeIdValue) return;
    setLoading(true);
    try {
      await accountingFormService.downloadPdf(employeeIdValue, funcionario?.name || 'Funcionario');
      toast({ title: "Sucesso", description: "PDF da contabilidade gerado com sucesso!" });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao gerar PDF da contabilidade."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountingPreview = async () => {
    if (!employeeIdValue) return;
    setLoading(true);
    try {
      await accountingFormService.generateHtml(employeeIdValue);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao abrir visualização."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountingExcel = async () => {
    if (!employeeIdValue) return;
    setLoading(true);
    try {
      await accountingFormService.downloadExcel(employeeIdValue, funcionario?.name || 'Funcionario');
      toast({ title: "Sucesso", description: "Excel da contabilidade gerado com sucesso!" });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao gerar Excel da contabilidade."
      });
    } finally {
      setLoading(false);
    }
  };
  const onClose = () => onOpenChange(false);

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={(isOpen) => {
        // Só fechar se o usuário explicitamente fechar (X ou ESC)
        // Não fechar automaticamente após salvar
        if (!isOpen) {
          // Só fechar se não estiver carregando e não houver funcionário salvo recentemente
          if (!loading) {
            onClose();
          }
        }
      }}>
        <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden p-0 mx-4 sm:mx-0 bg-seguranca-graphite border-gray-600">
          <DialogHeader className="bg-gradient-to-r shrink-0 from-seguranca-red to-seguranca-yellow p-4 sm:p-6 text-white z-10">
            <DialogTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl md:text-2xl font-bold w-full">
              <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg">
                <UserIcon className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
              <span className="truncate">{isEditMode ? 'Editar Funcionário' : 'Editar Funcionário'}</span>
              {saveStatus === 'saving' && (
                <span className="text-xs font-normal text-white/80 animate-pulse flex items-center gap-1.5 ml-auto bg-black/20 px-3 py-1 rounded-full border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                  Salvando...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-xs font-normal text-green-300 flex items-center gap-1 ml-auto bg-black/20 px-3 py-1 rounded-full border border-green-500/20">
                  ✓ Salvo automaticamente
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-xs font-normal text-red-300 flex items-center gap-1 ml-auto bg-black/20 px-3 py-1 rounded-full border border-red-500/20">
                  ⚠ Erro ao salvar
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-white/90 text-xs sm:text-sm mt-1">
              Preencha os dados abaixo. Itens obrigatórios estão indicados em vermelho.
          </DialogDescription>
        </DialogHeader>
        
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
                <TabsList className={`grid w-full ${canSeeHistory ? 'grid-cols-5' : 'grid-cols-4'} bg-seguranca-graphite border border-gray-600`}>
                  <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
                  <TabsTrigger value="dependentes">Dependentes</TabsTrigger>
                  <TabsTrigger value="documentos">Documentos</TabsTrigger>
                  <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
                  {canSeeHistory && (
                    <TabsTrigger value="historico" className="flex items-center gap-1.5">
                      <History className="h-4 w-4" />
                      Histórico
                    </TabsTrigger>
                  )}
                </TabsList>
                <TabsContent value="cadastro" className="space-y-4 sm:space-y-6">
                  {/* Seção: Relacionamentos Obrigatórios */}
                  <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
                    <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-seguranca-yellow/20 rounded-lg">
                          <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-yellow" />
                        </div>
                        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-white">
                          Relacionamentos Obrigatórios
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        {/* Seleção de Usuário */}
                        <div className="space-y-2">
                          <Label className="text-xs sm:text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2">
                            <UserIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">Usuário do Sistema</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
                            <Input
                              placeholder="Digite nome, email, username ou CPF para buscar usuário..."
                              value={userSearchTerm}
                              onChange={handleUserSearch}
                              onFocus={handleUserInputFocus}
                              onBlur={handleUserInputBlur}
                              className="pl-9 sm:pl-10 text-xs sm:text-sm h-9 sm:h-10"
                            />

                            {/* Dropdown de usuários */}
                            {showUserDropdown && (
                              <div className="absolute z-50 w-full mt-1 bg-seguranca-graphite border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {filteredUsers.length > 0 ? (
                                  filteredUsers.map((user) => (
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
                         ))
                       ) : (
                                  userSearchTerm.trim() !== '' && (
                                    <div className="p-3">
                                      <p className="text-sm text-gray-400">Nenhum usuário encontrado</p>
                         </div>
                                  )
                                )}
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

                        {/* Nova Divisão para Empresa e Posto de Trabalho */}
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-2">
                          <div>
                            <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                              <span className="truncate">Empresa</span>
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                            </Label>
                            <SearchableSelect
                              options={companies.map(c => ({
                                value: String(c.id),
                                label: c.sigla ? `${c.sigla.toUpperCase()} - ${c.name}` : c.name,
                                description: c.cnpj || ''
                              }))}
                              value={(form as any).company?.id || selectedCompany?.id || ''}
                              onChange={handleCompanySelect}
                              placeholder="Selecione uma empresa"
                              emptyMessage="Nenhuma empresa encontrada"
                            />
          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                              <span className="truncate">Setor/Posto de Trabalho</span>
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                            </Label>
                            <SearchableSelect
                              options={[
                                { value: 'none', label: 'Nenhum posto' },
                                ...workPosts.map((wp) => ({
                                  value: String(wp.id).toLowerCase(),
                                  label: wp.name,
                                  description: wp.clientName ? `Cliente: ${wp.clientName}` : (wp.address || ''),
                                }))
                              ]}
                              value={String((form as any).workPostId || 'none').toLowerCase()}
                              onChange={(value) => {
                                const resolvedValue = value === 'all' ? String((form as any).workPostId || 'none').toLowerCase() : value;
                                handleWorkPostChange(resolvedValue === 'none' ? '' : resolvedValue);
                              }}
                              placeholder="Selecione um posto"
                              searchPlaceholder="Buscar posto de trabalho..."
                              emptyPlaceholder="Nenhum posto encontrado"
                              minSearchChars={3}
                              minCharsMessage="Digite pelo menos 3 caracteres para pesquisar o posto..."
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

          {/* Seção: Informações Pessoais */}
                  <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
                    <div className="p-4 space-y-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-seguranca-red/20 rounded-lg">
                          <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-red" />
                        </div>
            <h3 className="text-lg font-semibold text-white">Informações Pessoais</h3>
                      </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Nome Completo</span>
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">Obrigatório</Badge>
                          </Label>
                <Input 
                  name="name" 
                  value={form.name} 
                  onChange={handleChange} 
                  required 
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">CPF</span>
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">Obrigatório</Badge>
                          </Label>
                <Input 
                  name="cpf" 
                  value={form.cpf} 
                            onChange={handleCpfChange}
                  required 
                  placeholder="000.000.000-00"
                            className={`bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11 ${cpfError ? 'border-red-500' : ''}`}
                          />
                          <p className="text-xs text-gray-400 mt-1">
                            Apenas números (formatado automaticamente)
                          </p>
                          {cpfError && (
                            <p className="text-xs text-red-500 mt-1">{cpfError}</p>
                          )}
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">RG</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Input
                  name="rg"
                            value={form.rg || ''}
                  onChange={handleChange}
                            placeholder="00.000.000-0"
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">U.F RG</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Input
                  name="rgUf"
                  value={form.rgUf || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, rgUf: e.target.value.toUpperCase().slice(0, 2) }))}
                  placeholder="UF"
                  maxLength={2}
                  className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Data de Nascimento</span>
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">Obrigatório</Badge>
                          </Label>
                <DatePicker 
                  date={parseDateFromBackend(form.birthDate) || undefined} 
                  onDateChange={(date) => setForm(prev => ({ ...prev, birthDate: formatDateForBackend(date) || '' }))} 
                  className="h-10 sm:h-11"
                />
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Sexo</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Select 
                  value={form.sexo || ''} 
                  onValueChange={(value) => setForm(prev => ({ ...prev, sexo: value }))}
                >
                            <SelectTrigger className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11">
                    <SelectValue placeholder="Selecione o sexo" />
                  </SelectTrigger>
                            <SelectContent className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
                    <SelectItem value="MASCULINO">Masculino</SelectItem>
                    <SelectItem value="FEMININO">Feminino</SelectItem>
                    <SelectItem value="OUTRO">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Município de Nascimento</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Input 
                  name="municipioNascimento" 
                  value={form.municipioNascimento || ''} 
                  onChange={handleChange} 
                  placeholder="Ex: Belo Horizonte"
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Estado de Nascimento</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Select 
                  value={form.estadoNascimento || ''} 
                  onValueChange={(value) => setForm(prev => ({ ...prev, estadoNascimento: value }))}
                >
                            <SelectTrigger className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11">
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                            <SelectContent className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray max-h-[300px]">
                    <SelectItem value="AC">Acre</SelectItem>
                    <SelectItem value="AL">Alagoas</SelectItem>
                    <SelectItem value="AP">Amapá</SelectItem>
                    <SelectItem value="AM">Amazonas</SelectItem>
                    <SelectItem value="BA">Bahia</SelectItem>
                    <SelectItem value="CE">Ceará</SelectItem>
                    <SelectItem value="DF">Distrito Federal</SelectItem>
                    <SelectItem value="ES">Espírito Santo</SelectItem>
                    <SelectItem value="GO">Goiás</SelectItem>
                    <SelectItem value="MA">Maranhão</SelectItem>
                    <SelectItem value="MT">Mato Grosso</SelectItem>
                    <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                    <SelectItem value="MG">Minas Gerais</SelectItem>
                    <SelectItem value="PA">Pará</SelectItem>
                    <SelectItem value="PB">Paraíba</SelectItem>
                    <SelectItem value="PR">Paraná</SelectItem>
                    <SelectItem value="PE">Pernambuco</SelectItem>
                    <SelectItem value="PI">Piauí</SelectItem>
                    <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                    <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                    <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                    <SelectItem value="RO">Rondônia</SelectItem>
                    <SelectItem value="RR">Roraima</SelectItem>
                    <SelectItem value="SC">Santa Catarina</SelectItem>
                    <SelectItem value="SP">São Paulo</SelectItem>
                    <SelectItem value="SE">Sergipe</SelectItem>
                    <SelectItem value="TO">Tocantins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Grau de Instrução</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Select 
                  value={form.grauInstrucao || ''} 
                  onValueChange={(value) => setForm(prev => ({ ...prev, grauInstrucao: value }))}
                >
                            <SelectTrigger className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11">
                              <SelectValue placeholder="Selecione o grau" />
                  </SelectTrigger>
                            <SelectContent className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray max-h-[300px]">
                    <SelectItem value="ANALFABETO">Analfabeto</SelectItem>
                              <SelectItem value="FUNDAMENTAL_INCOMPLETO">Ens. Fundamental Incompleto</SelectItem>
                              <SelectItem value="FUNDAMENTAL_COMPLETO">Ens. Fundamental Completo</SelectItem>
                              <SelectItem value="MEDIO_INCOMPLETO">Ens. Médio Incompleto</SelectItem>
                              <SelectItem value="MEDIO_COMPLETO">Ens. Médio Completo</SelectItem>
                              <SelectItem value="SUPERIOR_INCOMPLETO">Ens. Superior Incompleto</SelectItem>
                              <SelectItem value="SUPERIOR_COMPLETO">Ens. Superior Completo</SelectItem>
                    <SelectItem value="POS_GRADUACAO">Pós-Graduação</SelectItem>
                    <SelectItem value="MESTRADO">Mestrado</SelectItem>
                    <SelectItem value="DOUTORADO">Doutorado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Matrícula eSocial</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Input 
                  name="matriculaEsocial" 
                  value={form.matriculaEsocial || ''} 
                  onChange={handleChange} 
                            placeholder="Matrícula"
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Estado Civil</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Select 
                  value={form.maritalStatus} 
                  onValueChange={(value) => setForm(prev => ({ ...prev, maritalStatus: value }))}
                >
                            <SelectTrigger className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11">
                              <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                            <SelectContent className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
                    <SelectItem value="SINGLE">Solteiro</SelectItem>
                    <SelectItem value="MARRIED">Casado</SelectItem>
                    <SelectItem value="DIVORCED">Divorciado</SelectItem>
                    <SelectItem value="WIDOWED">Viúvo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Nacionalidade</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Input 
                  name="nationality" 
                  value={form.nationality} 
                  onChange={handleChange} 
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
            </div>
            
            {/* Dados Familiares (Nomes dos pais) */}
            <div className="mt-4 pt-4 border-t border-gray-600">
                        <h4 className="text-md font-semibold text-seguranca-yellow mb-4 flex items-center">
                          <UsersIcon className="mr-2" size={16} />
                          Dados Familiares (Nomes dos pais)
                        </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                            <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                              <span className="truncate">Nome da Mãe</span>
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                            </Label>
                  <Input 
                    name="nomeMae" 
                    value={form.nomeMae || ''} 
                    onChange={handleChange} 
                    placeholder="Nome completo da mãe"
                              className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>
                <div>
                            <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                              <span className="truncate">Nome do Pai</span>
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                            </Label>
                  <Input 
                    name="nomePai" 
                    value={form.nomePai || ''} 
                    onChange={handleChange} 
                    placeholder="Nome completo do pai"
                              className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>
              </div>
            </div>
            
            {/* Título de Eleitor */}
            <div className="mt-4 pt-4 border-t border-gray-600">
                        <h4 className="text-md font-semibold text-seguranca-yellow mb-4 flex items-center">
                          <FileText className="mr-2" size={16} />
                          Título de Eleitor
                        </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                            <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                              <span className="truncate">Número</span>
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                            </Label>
                  <Input 
                    name="tituloEleitor" 
                    value={form.tituloEleitor || ''} 
                              onChange={handleTituloEleitorChange}
                    placeholder="Ex: 2236.5048.0205"
                              className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                    <span className="truncate">Zona</span>
                    <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                  </Label>
                  <Input 
                    name="tituloEleitorZona" 
                    value={form.tituloEleitorZona || ''} 
                    onChange={handleChange} 
                    placeholder="Ex: 316"
                    className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                    <span className="truncate">Seção</span>
                    <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                  </Label>
                  <Input 
                    name="tituloEleitorSecao" 
                    value={form.tituloEleitorSecao || ''} 
                    onChange={handleChange} 
                    placeholder="Ex: 0585"
                    className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                    <span className="truncate">Data de Expedição</span>
                    <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                  </Label>
                  <DatePicker
                    date={parseDateFromBackend(form.tituloEleitorDataExpedicao) || undefined}
                    onDateChange={(date) => setForm(prev => ({ ...prev, tituloEleitorDataExpedicao: formatDateForBackend(date) || '' }))}
                    className="h-10 sm:h-11"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                    <span className="truncate">Validade</span>
                    <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                  </Label>
                  <DatePicker
                    date={parseDateFromBackend(form.tituloEleitorValidade) || undefined}
                    onDateChange={(date) => setForm(prev => ({ ...prev, tituloEleitorValidade: formatDateForBackend(date) || '' }))}
                    className="h-10 sm:h-11"
                  />
                </div>
              </div>
            </div>
            
                      {/* Nome do Conselho Regional */}
            <div className="mt-4 pt-4 border-t border-gray-600">
                        <h4 className="text-md font-semibold text-seguranca-yellow mb-4 flex items-center">
                          <FileText className="mr-2" size={16} />
                          Nome do Conselho Regional
                        </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                            <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                              <span className="truncate">Sigla</span>
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                            </Label>
                  <Input 
                              name="nomeConselhoRegional"
                              value={form.nomeConselhoRegional || ''}
                    onChange={handleChange} 
                              placeholder="Ex: CRM, CRO, etc."
                              className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>
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
                            <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                              <span className="truncate">Número da CNH</span>
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                            </Label>
                  <Input 
                              name="cnhNumber"
                              value={form.cnhNumber || ''}
                    onChange={handleChange} 
                              placeholder="00000000000"
                              className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>
                <div>
                            <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                              <span className="truncate">Categoria da CNH</span>
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                            </Label>
                            <Select
                              value={form.cnhCategory || ''}
                              onValueChange={(value) => setForm(prev => ({ ...prev, cnhCategory: value }))}
                            >
                              <SelectTrigger className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11">
                                <SelectValue placeholder="Selecione a categoria" />
                              </SelectTrigger>
                              <SelectContent className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray max-h-[300px]">
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
                            <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                              <span className="truncate">Validade da CNH</span>
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                            </Label>
                            <DatePicker
                              date={parseDateFromBackend(form.cnhExpirationDate) || undefined}
                              onDateChange={(date) => setForm(prev => ({ ...prev, cnhExpirationDate: formatDateForBackend(date) || '' }))}
                              className="h-10 sm:h-11"
                            />
                          </div>

                          {/* CTPS */}
                          <div>
                            <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                              <span className="truncate">Número da CTPS</span>
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                            </Label>
                            <Input
                              name="ctps"
                              value={form.ctps || ''}
                              onChange={handleChange}
                              placeholder="0000000"
                              className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                            />
              </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                              <span className="truncate">Série da CTPS</span>
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                            </Label>
                            <Input
                              name="ctpsSeries"
                              value={form.ctpsSeries || ''}
                              onChange={handleChange}
                              placeholder="0000"
                              className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                            />
            </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                              <span className="truncate">Data de Emissão da CTPS</span>
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                            </Label>
                            <DatePicker
                              date={parseDateFromBackend(form.ctpsIssueDate) || undefined}
                              onDateChange={(date) => setForm(prev => ({ ...prev, ctpsIssueDate: formatDateForBackend(date) || '' }))}
                              className="h-10 sm:h-11"
                            />
                          </div>

                          {/* CIN - Carteira de Identidade Nacional */}
                          <div>
                            <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                              <span className="truncate">Número do CIN</span>
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                            </Label>
                            <Input
                              name="cinNumero"
                              value={form.cinNumero || ''}
                              onChange={handleChange}
                              placeholder="Número do CIN"
                              className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                              <span className="truncate">Órgão Emissor do CIN</span>
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                            </Label>
                            <Input
                              name="cinOrgaoEmissor"
                              value={form.cinOrgaoEmissor || ''}
                              onChange={handleChange}
                              placeholder="Ex: SSP, DETRAN"
                              className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                              <span className="truncate">Data de Emissão do CIN</span>
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                            </Label>
                            <DatePicker
                              date={parseDateFromBackend(form.cinDataEmissao) || undefined}
                              onDateChange={(date) => setForm(prev => ({ ...prev, cinDataEmissao: formatDateForBackend(date) || '' }))}
                              className="h-10 sm:h-11"
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
                              <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                                <span className="truncate">Nome do Cônjuge</span>
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">Obrigatório</Badge>
                              </Label>
                  <Input 
                    name="spouseName" 
                                value={form.spouseName || ''}
                    onChange={handleChange} 
                    required 
                                placeholder="Nome completo do cônjuge"
                                className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>
                <div>
                              <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                                <span className="truncate">CPF do Cônjuge</span>
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">Obrigatório</Badge>
                              </Label>
                  <Input 
                    name="spouseCpf" 
                                value={form.spouseCpf || ''}
                    onChange={handleChange} 
                    required 
                                placeholder="000.000.000-00"
                                className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>
                <div>
                              <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                                <span className="truncate">RG do Cônjuge</span>
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">Obrigatório</Badge>
                              </Label>
                  <Input 
                    name="spouseRg" 
                                value={form.spouseRg || ''}
                    onChange={handleChange} 
                                required
                                placeholder="Número do RG"
                                className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>
                <div>
                              <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                                <span className="truncate">Data de Nascimento do Cônjuge</span>
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">Obrigatório</Badge>
                              </Label>
                              <DatePicker
                                date={parseDateFromBackend(form.spouseBirthDate) || undefined}
                                onDateChange={(date) => setForm(prev => ({ ...prev, spouseBirthDate: formatDateForBackend(date) || '' }))}
                                className="h-10 sm:h-11"
                              />
                            </div>
                <div>
                              <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                                <span className="truncate">Profissão do Cônjuge</span>
                                <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                              </Label>
                  <Input 
                                name="spouseProfession"
                                value={form.spouseProfession || ''}
                    onChange={handleChange} 
                                placeholder="Profissão do cônjuge"
                                className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>
                <div>
                              <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                                <span className="truncate">Telefone do Cônjuge</span>
                                <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                              </Label>
                  <Input 
                                name="spousePhone"
                                value={form.spousePhone || ''}
                    onChange={handleChange} 
                                placeholder="(00) 00000-0000"
                                className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>
              </div>
            </div>
          )}

                      {/* Seção de dependentes removida do formulário de criação. A gestão de dependentes permanece no modo de edição via modal dedicado. */}
                    </div>
                  </Card>

          {/* Seção: Informações de Contato */}
                  <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-seguranca-yellow/20 rounded-lg">
                          <Link className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-yellow" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-white">Informações de Contato</h3>
                      </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Email</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Input 
                  name="email" 
                  type="email" 
                  value={form.email} 
                  onChange={handleChange}
                  placeholder="exemplo@email.com"
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">WhatsApp</span>
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">Obrigatório</Badge>
                          </Label>
                <Input 
                  name="phone" 
                            value={aplicarMascaraTelefone(form.phone || '')}
                            onChange={(e) => {
                              const valor = e.target.value.replace(/\D/g, '');
                              setForm(prev => ({ ...prev, phone: valor }));
                            }}
                  required 
                  placeholder="(00) 00000-0000"
                            maxLength={15}
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Telefone de Contato</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Input 
                  name="telefoneContato" 
                            value={aplicarMascaraTelefone(form.telefoneContato || '')}
                  onChange={(e) => {
                    const valor = e.target.value.replace(/\D/g, '');
                              setForm(prev => ({ ...prev, telefoneContato: valor }));
                  }}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
            </div>
                    </div>
                  </Card>
            
            {/* Seção: Endereço Separado */}
                  <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-seguranca-yellow/20 rounded-lg">
                          <Building className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-yellow" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-white">Endereço</h3>
                      </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 flex flex-col sm:flex-row gap-4 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                              <span className="truncate">Rua/Logradouro</span>
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">Obrigatório</Badge>
                            </Label>
                            <Input
                              name="enderecoRua"
                              value={form.enderecoRua || ''}
                              onChange={handleChange}
                              placeholder="Nome da rua, avenida, etc."
                              required
                              className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                            />
                          </div>
                          <div className="w-full sm:w-40 flex-shrink-0">
                            <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                              <span className="truncate">CEP</span>
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">Obrigatório</Badge>
                            </Label>
                  <div className="flex gap-2">
                    <Input 
                      name="enderecoCep" 
                                value={aplicarMascaraCep(form.enderecoCep || '')}
                      onChange={(e) => {
                        const valor = e.target.value.replace(/\D/g, '');
                                  setForm(prev => ({ ...prev, enderecoCep: valor }));
                        if (valor.length === 8) {
                          buscarCep(valor);
                        }
                      }}
                      placeholder="00000-000"
                      maxLength={9}
                      required
                                className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                    />
                    {loadingCep && (
                                <div className="flex items-center px-1 text-seguranca-yellow">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-seguranca-yellow"></div>
                      </div>
                    )}
                  </div>
                </div>
                </div>
                <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Número</span>
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">Obrigatório</Badge>
                          </Label>
                  <Input 
                    name="enderecoNumero" 
                            value={form.enderecoNumero || ''}
                    onChange={handleChange} 
                    placeholder="123"
                    required
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>
                <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Complemento</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                  <Input 
                    name="enderecoComplemento" 
                            value={form.enderecoComplemento || ''}
                    onChange={handleChange} 
                            placeholder="Apt 101, Bloco B"
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>
                <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Bairro</span>
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">Obrigatório</Badge>
                          </Label>
                  <Input 
                    name="enderecoBairro" 
                            value={form.enderecoBairro || ''}
                    onChange={handleChange} 
                            placeholder="Centro"
                    required
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                              <span className="truncate">Cidade</span>
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">Obrigatório</Badge>
                            </Label>
                  <Input 
                    name="enderecoCidade" 
                              value={form.enderecoCidade || ''}
                    onChange={handleChange} 
                              placeholder="São Paulo"
                    required
                              className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>
                          <div className="w-24">
                            <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                              <span className="truncate">UF</span>
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">Obrigatório</Badge>
                            </Label>
                            <Select
                              value={form.enderecoEstado || ''}
                              onValueChange={(value) => setForm(prev => ({ ...prev, enderecoEstado: value }))}
                    required
                            >
                              <SelectTrigger className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11">
                                <SelectValue placeholder="UF" />
                              </SelectTrigger>
                              <SelectContent className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray max-h-[300px]">
                                <SelectItem value="AC">AC</SelectItem>
                                <SelectItem value="AL">AL</SelectItem>
                                <SelectItem value="AP">AP</SelectItem>
                                <SelectItem value="AM">AM</SelectItem>
                                <SelectItem value="BA">BA</SelectItem>
                                <SelectItem value="CE">CE</SelectItem>
                                <SelectItem value="DF">DF</SelectItem>
                                <SelectItem value="ES">ES</SelectItem>
                                <SelectItem value="GO">GO</SelectItem>
                                <SelectItem value="MA">Maranhão</SelectItem>
                                <SelectItem value="MT">Mato Grosso</SelectItem>
                                <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                                <SelectItem value="MG">Minas Gerais</SelectItem>
                                <SelectItem value="PA">Pará</SelectItem>
                                <SelectItem value="PB">Paraíba</SelectItem>
                                <SelectItem value="PR">Paraná</SelectItem>
                                <SelectItem value="PE">Pernambuco</SelectItem>
                                <SelectItem value="PI">Piauí</SelectItem>
                                <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                                <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                                <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                                <SelectItem value="RO">Rondônia</SelectItem>
                                <SelectItem value="RR">Roraima</SelectItem>
                                <SelectItem value="SC">Santa Catarina</SelectItem>
                                <SelectItem value="SP">São Paulo</SelectItem>
                                <SelectItem value="SE">Sergipe</SelectItem>
                                <SelectItem value="TO">Tocantins</SelectItem>
                              </SelectContent>
                            </Select>
                </div>
              </div>
            </div>
          </div>
                  </Card>

                  {/* Seção: Dados Bancários */}
                  <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
                    <div className="p-4 space-y-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-seguranca-yellow/20 rounded-lg">
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-yellow" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Dados Bancários</h3>
                      </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                          <Label className="text-sm font-medium text-gray-200">Banco</Label>
                <Input 
                            name="bankData.bank"
                            value={form.bankData?.bank || ''}
                  onChange={handleChange} 
                            placeholder="Nome do banco"
                />
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200">Agência</Label>
                <Input 
                            name="bankData.agency"
                            value={form.bankData?.agency || ''}
                  onChange={handleChange} 
                            placeholder="0000"
                />
              </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label className="text-sm font-medium text-gray-200">Conta Corrente</Label>
                <Input 
                              name="bankData.account"
                              value={form.bankData?.account || ''}
                  onChange={handleChange} 
                              placeholder="00000"
                />
              </div>
                          <div className="w-20">
                            <Label className="text-sm font-medium text-gray-200">Dígito</Label>
                <Input 
                              name="bankData.accountDigit"
                              value={form.bankData?.accountDigit || ''}
                  onChange={handleChange} 
                              placeholder="0"
                              maxLength={2}
                />
              </div>
              </div>
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium text-gray-200">Chave Pix</Label>
                <Input 
                            name="bankData.chavePix"
                            value={form.bankData?.chavePix || ''}
                  onChange={handleChange} 
                            placeholder="CPF, e-mail, telefone ou chave aleatória"
                />
              </div>
              </div>
              </div>
                  </Card>

                  {/* Seção: Dados do Exame Médico (ASO) */}
                  <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
                    <div className="p-4 space-y-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-seguranca-red/20 rounded-lg">
                          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-red" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Dados do Exame Médico (ASO)</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-200">Data Realizada</Label>
                <DatePicker
                  date={parseDateFromBackend(form.exameMedicoData) || undefined}
                  onDateChange={(date) => setForm(prev => ({ ...prev, exameMedicoData: formatDateForBackend(date) || '' }))}
                  className="h-9 sm:h-10"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Data de Vencimento</Label>
                <DatePicker
                  date={parseDateFromBackend(form.exameMedicoVencimento) || undefined}
                  onDateChange={(date) => setForm(prev => ({ ...prev, exameMedicoVencimento: formatDateForBackend(date) || '' }))}
                  className="h-9 sm:h-10"
                />
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200">Tipo de Exame Realizado</Label>
                <Select 
                            value={form.exameMedicoTipo || ''}
                            onValueChange={(value) => setForm(prev => ({ ...prev, exameMedicoTipo: value }))}
                >
                            <SelectTrigger className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray text-xs sm:text-sm h-9 sm:h-10">
                              <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                            <SelectContent className="bg-seguranca-graphite border-gray-600 max-h-60 overflow-auto">
                              <SelectItem value="ADMISSIONAL" className="text-seguranca-lightgray hover:bg-gray-700">Admissional</SelectItem>
                              <SelectItem value="DEMISSIONAL" className="text-seguranca-lightgray hover:bg-gray-700">Demissional</SelectItem>
                              <SelectItem value="PERIODICO" className="text-seguranca-lightgray hover:bg-gray-700">Periódico</SelectItem>
                              <SelectItem value="MUDANCA_FUNCAO" className="text-seguranca-lightgray hover:bg-gray-700">Mudança de Função</SelectItem>
                              <SelectItem value="RETORNO_TRABALHO" className="text-seguranca-lightgray hover:bg-gray-700">Retorno ao Trabalho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                        <div className="md:col-span-2">
                          <div className="flex items-center justify-between mb-1.5">
                            <Label className="text-sm font-medium text-gray-200">Nome do Médico</Label>
                            <button
                              type="button"
                              onClick={() => setNovoMedicoModalOpen(true)}
                              className="text-xs text-seguranca-yellow underline hover:no-underline focus:outline-none flex items-center gap-1"
                            >
                              <Plus size={12} />
                              Cadastrar novo médico
                            </button>
                          </div>
                          <div className="relative">
                <Input 
                              value={doctorSearchTerm}
                              onChange={(e) => {
                                setDoctorSearchTerm(e.target.value);
                                setShowDoctorDropdown(true);
                                if (e.target.value.length > 0) {
                                  handleDoctorSearch(e.target.value);
                                } else {
                                  loadDoctors();
                                }
                              }}
                              onFocus={() => {
                                setShowDoctorDropdown(true);
                                if (doctors.length === 0) {
                                  loadDoctors();
                                }
                              }}
                              onBlur={() => {
                                // Delay para permitir clique no dropdown
                                setTimeout(() => setShowDoctorDropdown(false), 200);
                              }}
                              placeholder="Digite para buscar médico..."
                              className="text-xs sm:text-sm h-9 sm:h-10"
                            />
                            {showDoctorDropdown && (
                              <div className="absolute z-50 w-full mt-1 bg-seguranca-graphite border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                                {loadingDoctors ? (
                                  <div className="p-2 text-sm text-gray-400">Carregando...</div>
                                ) : (
                                  <>
                                    {doctors.length > 0 && doctors.map((doctor) => (
                                      <div
                                        key={doctor.id}
                                        className="p-2 hover:bg-gray-700 cursor-pointer text-seguranca-lightgray text-xs sm:text-sm"
                                        onClick={() => {
                                          setSelectedDoctor(doctor);
                                          setDoctorSearchTerm(`${doctor.name} - CRM ${doctor.crmNumber}/${doctor.crmState}`);
                                          setForm(prev => ({
                                            ...prev,
                                            exameMedicoDoctor: { id: doctor.id }
                                          }));
                                          setShowDoctorDropdown(false);
                                        }}
                                      >
                                        {doctor.name} - CRM {doctor.crmNumber}/{doctor.crmState}
              </div>
                                    ))}

                                    <div className="p-2 border-t border-gray-600 sticky bottom-0 bg-seguranca-graphite">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setNovoMedicoModalOpen(true);
                                          setShowDoctorDropdown(false);
                                        }}
                                        className="w-full text-left p-2 text-sm text-seguranca-yellow hover:bg-gray-700 rounded border border-seguranca-yellow/30 flex items-center gap-2"
                                      >
                                        <Plus className="h-4 w-4" />
                                        <span>{doctors.length === 0 ? "Nenhum médico encontrado. Cadastrar novo?" : "Cadastrar novo médico"}</span>
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

              <div>
                          <Label className="text-sm font-medium text-gray-200">Este é o primeiro registro (1º emprego)?</Label>
                          <RadioGroup
                            value={form.exameMedicoPrimeiroEmprego === true ? 'sim' : form.exameMedicoPrimeiroEmprego === false ? 'nao' : ''}
                            onValueChange={(value) => setForm(prev => ({ ...prev, exameMedicoPrimeiroEmprego: value === 'sim' }))}
                            className="flex gap-4 mt-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="sim" id="primeiro-sim" className="text-seguranca-lightgray" />
                              <Label htmlFor="primeiro-sim" className="text-gray-300 cursor-pointer text-xs sm:text-sm">Sim</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="nao" id="primeiro-nao" className="text-seguranca-lightgray" />
                              <Label htmlFor="primeiro-nao" className="text-gray-300 cursor-pointer text-xs sm:text-sm">Não</Label>
                            </div>
                          </RadioGroup>
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200">Contribuição Sindical está pago este ano?</Label>
                          <RadioGroup
                            value={form.exameMedicoContribuicaoSindicalPaga === true ? 'sim' : form.exameMedicoContribuicaoSindicalPaga === false ? 'nao' : ''}
                            onValueChange={(value) => setForm(prev => ({ ...prev, exameMedicoContribuicaoSindicalPaga: value === 'sim' }))}
                            className="flex gap-4 mt-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="sim" id="sindical-sim" className="text-seguranca-lightgray" />
                              <Label htmlFor="sindical-sim" className="text-gray-300 cursor-pointer text-xs sm:text-sm">Sim</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="nao" id="sindical-nao" className="text-seguranca-lightgray" />
                              <Label htmlFor="sindical-nao" className="text-gray-300 cursor-pointer text-xs sm:text-sm">Não</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Seção: Para Estrangeiro */}
                  <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
                    <div className="p-4 space-y-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-seguranca-yellow/20 rounded-lg">
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-yellow" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-white">Para Estrangeiro</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-200">RNE nº</Label>
                <Input 
                            name="rneNumero"
                            value={form.rneNumero || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, rneNumero: e.target.value }))}
                            placeholder="Número do RNE"
                            className="text-xs sm:text-sm h-9 sm:h-10"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200">Validade</Label>
                <DatePicker
                  date={parseDateFromBackend(form.rneValidade) || undefined}
                  onDateChange={(date) => setForm(prev => ({ ...prev, rneValidade: formatDateForBackend(date) || '' }))}
                  className="h-9 sm:h-10"
                />
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200">Possui filhos com brasileiro?</Label>
                          <RadioGroup
                            value={form.temFilhosBrasileiros === true ? 'sim' : form.temFilhosBrasileiros === false ? 'nao' : ''}
                            onValueChange={(value) => setForm(prev => ({ ...prev, temFilhosBrasileiros: value === 'sim' }))}
                            className="flex gap-4 mt-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="sim" id="filhos-brasileiros-sim" className="text-seguranca-lightgray" />
                              <Label htmlFor="filhos-brasileiros-sim" className="text-gray-300 cursor-pointer text-xs sm:text-sm">Sim</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="nao" id="filhos-brasileiros-nao" className="text-seguranca-lightgray" />
                              <Label htmlFor="filhos-brasileiros-nao" className="text-gray-300 cursor-pointer text-xs sm:text-sm">Não</Label>
                            </div>
                          </RadioGroup>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-200">Quantos?</Label>
                <Input 
                            name="quantidadeFilhosBrasileiros"
                            type="number"
                            min="0"
                            value={form.quantidadeFilhosBrasileiros || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, quantidadeFilhosBrasileiros: e.target.value ? parseInt(e.target.value) : undefined }))}
                            placeholder="Quantidade"
                            className="text-xs sm:text-sm h-9 sm:h-10"
                            disabled={form.temFilhosBrasileiros !== true}
                />
              </div>
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium text-gray-200 mb-2 block">
                            Em caso de estrangeiro naturalizado brasileiro, informar o Nº RIC / Órgão Emissor / Data Emissão:
                          </Label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                              <Label className="text-xs font-medium text-gray-300">Nº RIC</Label>
                <Input 
                                name="ricNumero"
                                value={form.ricNumero || ''}
                                onChange={(e) => setForm(prev => ({ ...prev, ricNumero: e.target.value }))}
                                placeholder="Número do RIC"
                                className="text-xs sm:text-sm h-9 sm:h-10"
                />
              </div>
              <div>
                              <Label className="text-xs font-medium text-gray-300">Órgão Emissor</Label>
                <Input 
                                name="ricOrgaoEmissor"
                                value={form.ricOrgaoEmissor || ''}
                                onChange={(e) => setForm(prev => ({ ...prev, ricOrgaoEmissor: e.target.value }))}
                                placeholder="Órgão Emissor"
                                className="text-xs sm:text-sm h-9 sm:h-10"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-300">Data Emissão</Label>
                <DatePicker
                  date={parseDateFromBackend(form.ricDataEmissao) || undefined}
                  onDateChange={(date) => setForm(prev => ({ ...prev, ricDataEmissao: formatDateForBackend(date) || '' }))}
                  className="h-9 sm:h-10 w-full"
                />
              </div>
            </div>
          </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-200">Tipo de Visto</Label>
                          <Input
                            name="tipoVisto"
                            value={form.tipoVisto || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, tipoVisto: e.target.value }))}
                            placeholder="Tipo de visto"
                            className="text-xs sm:text-sm h-9 sm:h-10"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Seção: Dados do Cadastro / Admissão */}
                  <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-seguranca-yellow/20 rounded-lg">
                          <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-yellow" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-white">Dados do Cadastro / Admissão</h3>
                      </div>
                      {eligibleRehireEmployee && (
                        <RehireAdmissionPanel
                          eligibleEmployee={eligibleRehireEmployee}
                          admissionType={rehireAdmissionType}
                          onAdmissionTypeChange={handleRehireAdmissionTypeChange}
                          showTerminatedEditHint
                        />
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">PIS</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Input 
                            name="pis"
                            value={form.pis || ''}
                  onChange={handleChange} 
                            placeholder="000.00000.00-0"
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Reservista nº</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Input 
                            name="certificadoMilitar"
                            value={form.certificadoMilitar || ''}
                  onChange={handleChange} 
                            placeholder="Número do certificado militar"
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                  <span className="truncate">{isRehireFormMode ? 'Nova data de admissão' : 'Data de Admissão'}</span>
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">Obrigatório</Badge>
                </Label>
                <DatePicker
                  date={parseDateFromBackend(form.hireDate) || undefined}
                  onDateChange={(date) => setForm(prev => ({ ...prev, hireDate: formatDateForBackend(date) || '' }))}
                  className="h-10 sm:h-11 w-full"
                />
              </div>
              {!isRehireFormMode && (
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Data de Demissão</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                          <DatePicker
                            date={parseDateFromBackend(form.dataRescisao) || undefined}
                            onDateChange={(date) => setForm(prev => ({ ...prev, dataRescisao: formatDateForBackend(date) || '' }))}
                            className="h-10 sm:h-11 w-full"
                          />
                        </div>
              )}
                        {!isRehireFormMode && form.dataRescisao && (
                          <div className="md:col-span-2">
                            <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                              <span className="truncate">Motivo da Demissão</span>
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">Obrigatório</Badge>
                            </Label>
                            <DismissalReasonSelect
                              value={form.terminationReason || ''}
                              onValueChange={(val) => setForm((prev) => ({ ...prev, terminationReason: val }))}
                            />
            </div>
                        )}
                        {/* Cargo */}
                        <div className="space-y-2 md:col-span-2">
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Cargo</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                          <div className="relative">
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <SearchableSelect
                                  options={positions.map(p => ({
                                    value: String(p.id),
                                    label: p.name,
                                    description: p.description || ''
                                  }))}
                                  value={form.position?.id ? String(form.position.id) : ''}
                                  onChange={(val) => {
                                    const cargo = positions.find(p => String(p.id) === val);
                                    if (cargo) handlePositionSelect(cargo);
                                  }}
                                  placeholder="Selecione o cargo"
                                  emptyPlaceholder="Nenhum cargo encontrado"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setNovoCargoModalOpen(true)}
                                className="px-3 flex-shrink-0 h-10 sm:h-11 bg-seguranca-graphite border-gray-600 text-seguranca-yellow hover:bg-gray-700 hover:text-seguranca-yellow min-h-[40px] sm:min-h-[44px]"
                                title="Criar novo cargo"
                              >
                                <Plus size={16} />
                              </Button>
          </div>

                            {/* Cargo selecionado */}
                            {selectedPosition && (
                              <div className="mt-2 p-2 bg-gray-700 border border-gray-600 rounded-md flex items-center justify-between">
                                <div className="flex items-center">
                                  <Briefcase className="mr-2 text-seguranca-yellow" size={16} />
                                  <span className="text-sm text-seguranca-lightgray">
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
                                  className="text-seguranca-red hover:text-red-400 hover:bg-gray-600 rounded-md h-8 w-8 p-0 min-h-[40px] sm:min-h-[44px] min-w-[40px] sm:min-w-[44px] flex items-center justify-center -mr-1"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">
                            Digite para buscar cargos existentes ou clique no botão + para criar um novo.
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Seção: Remuneração */}
                  <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-seguranca-yellow/20 rounded-lg">
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-yellow" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-white">Remuneração</h3>
                      </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Salário (R$)</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                          <CurrencyInput
                            name="salario"
                            placeholder="R$ 0,00"
                            decimalsLimit={2}
                            decimalScale={2}
                            decimalSeparator=","
                            groupSeparator="."
                            disableAbbreviations
                            prefix="R$ "
                            allowDecimals={true}
                            value={form.salario}
                            onValueChange={(value) => {
                              // Se o valor não existir, setamos vazia
                              if (!value) {
                                setForm(prev => ({ ...prev, salario: '' as any }));
                                return;
                              }
                              // Armazenamos o valor da string "crua" exatamente como formatada/digitada
                              setForm(prev => ({ ...prev, salario: value as any }));
                            }}
                            className="flex h-10 sm:h-11 w-full rounded-md border border-gray-600 bg-seguranca-graphite px-3 py-1 text-sm sm:text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:border-seguranca-yellow focus:border-seguranca-yellow disabled:cursor-not-allowed disabled:opacity-50 text-seguranca-lightgray"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Forma de Pagamento</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                          <Select
                            value={form.periodoPagamento || ''}
                            onValueChange={(value) => setForm(prev => ({ ...prev, periodoPagamento: value }))}
                          >
                            <SelectTrigger className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11">
                              <SelectValue placeholder="Selecione a forma" />
                            </SelectTrigger>
                            <SelectContent className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
                              <SelectItem value="MENSAL" className="hover:bg-gray-700">Mensal</SelectItem>
                              <SelectItem value="QUINZENAL" className="hover:bg-gray-700">Quinzenal</SelectItem>
                              <SelectItem value="SEMANAL" className="hover:bg-gray-700">Semanal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Tipo Sal. Contratual</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                          <Select
                            value={form.tipoSalarioContratual || ''}
                            onValueChange={(value) => setForm(prev => ({ ...prev, tipoSalarioContratual: value }))}
                          >
                            <SelectTrigger className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
                              <SelectItem value="MENSAL" className="hover:bg-gray-700">Mensal</SelectItem>
                              <SelectItem value="HORISTA" className="hover:bg-gray-700">Horista</SelectItem>
                              <SelectItem value="DIARISTA" className="hover:bg-gray-700">Diarista</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Raça/Cor</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                          <Select
                            value={form.racaCor || ''}
                            onValueChange={(value) => setForm(prev => ({ ...prev, racaCor: value }))}
                          >
                            <SelectTrigger className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
                              <SelectItem value="BRANCA" className="hover:bg-gray-700">Branca</SelectItem>
                              <SelectItem value="PRETA" className="hover:bg-gray-700">Preta</SelectItem>
                              <SelectItem value="PARDA" className="hover:bg-gray-700">Parda</SelectItem>
                              <SelectItem value="AMARELA" className="hover:bg-gray-700">Amarela</SelectItem>
                              <SelectItem value="INDIGENA" className="hover:bg-gray-700">Indígena</SelectItem>
                              <SelectItem value="NAO_INFORMADO" className="hover:bg-gray-700">Não informado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Seção: Informações Adicionais Admissão */}
                  <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-seguranca-yellow/20 rounded-lg">
                          <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-yellow" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-white">Informações Adicionais</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Prazo de Experiência</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Input 
                            name="prazoExperienciaTexto"
                            value={form.prazoExperienciaTexto || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, prazoExperienciaTexto: e.target.value }))}
                            placeholder="Ex: 45 DIAS"
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Prorrogação</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                          <Input
                            name="prorrogacaoExperiencia"
                            value={form.prorrogacaoExperiencia || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, prorrogacaoExperiencia: e.target.value }))}
                            placeholder="Prorrogação do prazo"
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Dias de Folga</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                          <Input
                            name="folgaSemanal"
                            value={form.folgaSemanal || ''}
                  onChange={handleChange} 
                            placeholder="Ex: 1ª Escola"
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Escala de Trabalho</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Input 
                            name="escalaTrabalho"
                            value={form.escalaTrabalho || ''}
                  onChange={handleChange} 
                            placeholder="Ex: 12x36, 6x1, etc."
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Horário</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Input 
                            name="horarioTrabalho"
                            value={form.horarioTrabalho || ''}
                  onChange={handleChange} 
                            placeholder="Ex: 18:00 ÀS 06:00 H"
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Intervalos Almoço/Janta</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                          <RadioGroup
                            value={temIntervaloRefeicao}
                            onValueChange={(value) => {
                              setTemIntervaloRefeicao(value as 'sim' | 'nao');
                              if (value === 'nao') setForm(prev => ({ ...prev, horarioTrabalhoIntervalo: '' }));
                            }}
                            className="flex gap-4 mt-3"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="sim" id="intervalos-sim" className="text-seguranca-lightgray min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center p-0 m-0 border-gray-500 text-seguranca-yellow" />
                              <Label htmlFor="intervalos-sim" className="text-gray-300 font-medium cursor-pointer text-sm sm:text-base h-[44px] sm:h-auto flex items-center">Sim</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="nao" id="intervalos-nao" className="text-seguranca-lightgray min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center p-0 m-0 border-gray-500 text-seguranca-yellow" />
                              <Label htmlFor="intervalos-nao" className="text-gray-300 font-medium cursor-pointer text-sm sm:text-base h-[44px] sm:h-auto flex items-center">Não</Label>
                            </div>
                          </RadioGroup>
                        </div>
                        {temIntervaloRefeicao === 'sim' && (
                          <div className="md:col-span-2">
                            <Label className="text-sm font-medium text-seguranca-yellow flex items-center gap-1.5 sm:gap-2 mb-1.5">
                              <span className="truncate">Horário do Intervalo</span>
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                            </Label>
                            <Input 
                              name="horarioTrabalhoIntervalo"
                              value={form.horarioTrabalhoIntervalo || ''}
                              onChange={handleChange} 
                              placeholder="Ex: 12:00 ÀS 13:00 H"
                              className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                            />
                          </div>
                        )}

                      </div>
                    </div>
                  </Card>

                  {/* Seção: Informações Profissionais */}
                  <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-seguranca-yellow/20 rounded-lg">
                          <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-yellow" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-white">Informações Profissionais</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Número de Registro</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Input 
                            name="registrationNumber"
                            value={form.registrationNumber}
                  onChange={handleChange} 
                            placeholder="EMP001"
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                />
              </div>

              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Status</span>
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">Obrigatório</Badge>
                          </Label>
                <Select 
                  value={form.status} 
                  onValueChange={(value) => setForm(prev => ({ ...prev, status: value }))}
                >
                            <SelectTrigger className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                            <SelectContent className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
                              <SelectItem value="ACTIVE" className="hover:bg-gray-700">Ativo</SelectItem>
                              <SelectItem value="INACTIVE" className="hover:bg-gray-700">Inativo</SelectItem>
                              <SelectItem value="VACATION" className="hover:bg-gray-700">Férias</SelectItem>
                              <SelectItem value="TERMINATED" className="hover:bg-gray-700">Demitido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                        {form.status === 'TERMINATED' && (
                          <div className="md:col-span-3 bg-red-900/20 border border-red-500/40 rounded-lg p-3 sm:p-4">
                            <p className="text-red-300 text-sm sm:text-base flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                              Ao definir o status como Demitido, é obrigatório informar a Data de Demissão na seção de Dados de Cadastro / Admissão.
                            </p>
              </div>
                        )}
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">CBO</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Input 
                            name="cbo"
                            value={form.cbo || ''}
                  onChange={handleChange} 
                            placeholder="Ex: 517410"
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Departamento</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                            <SearchableSelect
                              options={departments.map((d) => ({
                                value: String(d.id),
                                label: d.name,
                                description: d.description || '',
                              }))}
                              value={form.departmentId || ''}
                              onChange={(val) => setForm(prev => ({ ...prev, departmentId: val || undefined }))}
                              placeholder={loadingData ? 'Carregando departamentos...' : 'Selecione um departamento'}
                              searchPlaceholder="Buscar departamento..."
                              emptyPlaceholder={loadingData ? 'Carregando...' : 'Nenhum departamento cadastrado'}
                              disabled={loadingData}
                            />
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Cliente</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                            <SearchableSelect
                              options={clients.map(c => ({
                                value: String(c.id),
                                label: c.name,
                                description: c.cnpj || ''
                              }))}
                              value={selectedClientId}
                              onChange={async (val) => {
                                setSelectedClientId(val);
                                setForm(prev => ({ ...prev, workPostId: '' }));
                                setFilteredWorkPosts([]);
                                if (val) {
                                  setLoadingWorkPosts(true);
                                  try {
                                    const posts = await workPostService.getWorkPostsByClient(val);
                                    const sorted = Array.isArray(posts) ? [...posts].sort((a, b) => (a.name || '').localeCompare(b.name || '')) : [];
                                    setFilteredWorkPosts(sorted);
                                  } catch (err) {
                                    console.warn('Erro ao carregar setores do cliente:', err);
                                    setFilteredWorkPosts([]);
                                  } finally {
                                    setLoadingWorkPosts(false);
                                  }
                                }
                              }}
                              placeholder="Selecione o cliente"
                              emptyMessage="Nenhum cliente encontrado"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              Selecione o cliente para listar os setores de trabalho disponíveis.
                            </p>
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Setor de Trabalho</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                            <SearchableSelect
                              options={(
                                selectedClientId
                                  ? filteredWorkPosts
                                  : workPosts
                              ).map(wp => ({
                                value: String(wp.id),
                                label: wp.name,
                                description: wp.clientName ? `Cliente: ${wp.clientName}` : (wp.address || '')
                              }))}
                              value={form.workPostId || ''}
                              onChange={(val) => handleWorkPostChange(val || 'none')}
                              placeholder={loadingWorkPosts ? 'Carregando setores...' : (selectedClientId ? 'Selecione o setor de trabalho' : 'Selecione um cliente primeiro')}
                              emptyPlaceholder={selectedClientId ? 'Nenhum setor encontrado para este cliente' : 'Selecione um cliente para listar os setores'}
                              minSearchChars={3}
                              minCharsMessage="Digite pelo menos 3 caracteres para pesquisar o setor..."
                            />
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Unidade</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                            <SearchableSelect
                              options={units.map(u => ({
                                value: String(u.id),
                                label: u.name,
                                description: u.sigla || u.code || ''
                              }))}
                              value={form.unit?.id || ''}
                              onChange={(val) => handleSelectChange('unit', val)}
                              placeholder="Selecione a unidade"
                              emptyMessage="Nenhuma unidade encontrada"
                            />
              </div>
                      </div>
                    </div>
                  </Card>

                  {/* Seção: FGTS */}
                  <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-seguranca-yellow/20 rounded-lg">
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-yellow" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-white">FGTS</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Optante pelo FGTS?</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Select 
                            value={String(form.fgtsOptante ?? '')}
                            onValueChange={(value) => setForm(prev => ({ ...prev, fgtsOptante: value === 'true' }))}
                          >
                            <SelectTrigger className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11">
                              <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                            <SelectContent className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
                              <SelectItem value="true" className="hover:bg-gray-700">Sim</SelectItem>
                              <SelectItem value="false" className="hover:bg-gray-700">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Data da Opção</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Input 
                            name="fgtsDataOpcao"
                            type="date"
                            value={form.fgtsDataOpcao || ''}
                  onChange={handleChange} 
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11 [color-scheme:dark]"
                />
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Data de Retratação</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Input 
                            name="fgtsDataRetratacao"
                            type="date"
                            value={form.fgtsDataRetratacao || ''}
                  onChange={handleChange} 
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11 [color-scheme:dark]"
                />
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Banco Depositário</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Input 
                            name="fgtsBancoDepositario"
                            value={form.fgtsBancoDepositario || ''}
                  onChange={handleChange} 
                            placeholder="Ex: Banco do Brasil"
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
              </div>
            </div>
                  </Card>

                  {/* Seção: PIS/PASEP */}
                  <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-seguranca-yellow/20 rounded-lg">
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-yellow" />
              </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-white">PIS / PASEP</h3>
              </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Número do PIS</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Input 
                            name="pis"
                            value={form.pis || ''}
                  onChange={handleChange} 
                            placeholder="Número do PIS"
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Data de Cadastro</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Input 
                            name="pisDataCadastro"
                            type="date"
                            value={form.pisDataCadastro || ''}
                  onChange={handleChange} 
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11 [color-scheme:dark]"
                />
              </div>
            </div>
          </div>
                  </Card>

                  {/* Seção: Foto e Observações */}
                  <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-seguranca-yellow/20 rounded-lg">
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-yellow" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-white">Documentos e Observações</h3>
                      </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Foto 3x4</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                <Input 
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray file:bg-gray-700 file:text-seguranca-lightgray file:border-0 file:rounded file:px-2 file:py-1 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                          />
                          {photoPreview && (
                            <img
                              src={photoPreview}
                              alt="Prévia"
                              className="mt-2 w-24 h-24 rounded-lg object-cover border border-gray-600 shadow-md"
                            />
                          )}
              </div>
              <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Observações</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                          <textarea
                            name="notes"
                            value={form.notes || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                            rows={3}
                            className="w-full rounded-md px-3 py-2 resize-none border border-gray-600 bg-seguranca-graphite text-seguranca-lightgray text-sm sm:text-base focus:border-seguranca-yellow focus:outline-none focus:ring-1 focus:ring-transparent placeholder:text-gray-400"
                            placeholder="Observações adicionais sobre o funcionário..."
                          />
                        </div>
                      </div>
                    </div>
                  </Card>

                </TabsContent>
                <TabsContent value="dependentes" className="space-y-4 sm:space-y-6">
                  {/* Seção: Dependentes */}
                  <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="p-1.5 sm:p-2 bg-seguranca-yellow/20 rounded-lg">
                            <UsersIcon className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-yellow" />
                          </div>
                          <h3 className="text-lg sm:text-xl font-semibold text-white">Dependentes</h3>
                        </div>
                        <Button
                          type="button"
                          onClick={handleAddDependent}
                          disabled={false}
                          className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto text-sm sm:text-base h-10 sm:h-11 justify-center sm:justify-start"
                        >
                          <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          Adicionar Dependente
                        </Button>
                          </div>

                      {/* Permitir adicionar dependentes mesmo na criação - serão salvos após salvar o funcionário */}
                      {employeeDependents.length === 0 && !isEditMode ? (
                        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                          <p className="text-blue-300 text-sm flex items-center">
                            <AlertCircle className="mr-2" size={16} />
                            Você pode adicionar dependentes após salvar o funcionário. Eles serão salvos automaticamente.
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
                  </Card>

                </TabsContent>
                <TabsContent value="documentos" className="space-y-4 sm:space-y-6">
                   {funcionario?.id ? (
                     <EmployeeDocumentsTab employeeId={funcionario.id} />
                   ) : (
                     <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
                       <div className="p-12 text-center space-y-4">
                         <div className="p-4 bg-seguranca-yellow/20 rounded-full w-fit mx-auto">
                           <AlertCircle className="h-10 w-10 text-seguranca-yellow" />
                         </div>
                         <h3 className="text-xl font-bold text-white">Salve o cadastro primeiro</h3>
                         <p className="text-gray-400 max-w-sm mx-auto">
                           É necessário salvar o cadastro básico do funcionário antes de gerar ou importar documentos.
                         </p>
                       </div>
                     </Card>
                   )}
                </TabsContent>
                <TabsContent value="relatorios" className="space-y-4 sm:space-y-6">
                  {!canGenerateReports ? (
                    <div className="p-6 border border-gray-600 rounded-lg bg-black/20 text-center">
                      <AlertCircle className="h-8 w-8 text-seguranca-yellow mx-auto mb-3" />
                      <h4 className="text-lg font-medium text-white mb-2">Salve o cadastro primeiro</h4>
                      <p className="text-gray-400 text-sm">
                        É necessário salvar o funcionário antes de gerar documentos e relatórios.
                      </p>
                    </div>
                  ) : (
                    <DocumentosGerarTab
                      hideHeader={true}
                      employeeId={employeeToEdit?.id}
                      companyId={
                        selectedCompany?.id ||
                        funcionario?.company?.id ||
                        (form as any).company?.id
                      }
                      tipoSalarioContratual={form.tipoSalarioContratual}
                      prazoExperienciaTexto={form.prazoExperienciaTexto}
                    />
                  )}

                  {/* Ficha para Contabilidade */}
                  <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-seguranca-yellow/20 rounded-lg">
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-yellow" />
              </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-white">Dados para Contabilidade</h3>
              </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAccountingPdf}
                          disabled={!canGenerateReports || loading}
                          className="border-red-500 text-red-400 hover:bg-red-500/10 text-sm sm:text-base h-10 sm:h-11"
                        >
                          <FileText className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          Gerar PDF
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAccountingPreview}
                          disabled={!canGenerateReports || loading}
                          className="border-gray-500 text-gray-300 hover:bg-gray-500/10 text-sm sm:text-base h-10 sm:h-11"
                        >
                          <Eye className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          Visualizar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAccountingExcel}
                          disabled={!canGenerateReports || loading}
                          className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 text-sm sm:text-base h-10 sm:h-11 disabled:opacity-50"
                        >
                          <FileSpreadsheet className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          Gerar Excel
                        </Button>
                  </div>
                  </div>
                  </Card>

                  {/* Ficha de Registro - Principal */}
                  <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-seguranca-yellow/20 rounded-lg">
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-yellow" />
            </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-white">Ficha de Registro do Funcionário</h3>
          </div>
                      <p className="text-xs sm:text-sm text-gray-400 -mt-2">
                        Emissão da ficha completa de registro do funcionário com todos os dados cadastrais.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleEmployeeRecordPdf('download')}
                          disabled={!canGenerateReports || loading}
                          className="border-blue-500 text-blue-400 hover:bg-blue-500/10 text-sm sm:text-base h-10 sm:h-11"
                        >
                          <FileText className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          Gerar PDF
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleEmployeeRecordPdf('preview')}
                          disabled={!canGenerateReports || loading}
                          className="border-gray-500 text-gray-300 hover:bg-gray-500/10 text-sm sm:text-base h-10 sm:h-11"
                        >
                          <Eye className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          Visualizar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleEmployeeRecordExcel}
                          disabled={!canGenerateReports || loading}
                          className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 text-sm sm:text-base h-10 sm:h-11"
                        >
                          <FileSpreadsheet className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          Gerar Excel
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Ficha de Entrega de EPI */}
                  <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-seguranca-yellow/20 rounded-lg">
                          <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-yellow" />
              </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-white">Ficha de Entrega de EPI</h3>
            </div>
                      <p className="text-xs sm:text-sm text-gray-400 -mt-2">
                        Gera uma ficha de EPI em branco para preenchimento manual ou gerencie os EPIs entregues.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleEpiPdf('download')}
                          disabled={!canGenerateReports || loading}
                          className="border-seguranca-red text-seguranca-red hover:bg-seguranca-red/10 text-sm sm:text-base h-10 sm:h-11"
                        >
                          <FileText className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          Gerar Ficha Manual (PDF)
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleEpiExcel}
                          disabled={!canGenerateReports || loading}
                          className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 text-sm sm:text-base h-10 sm:h-11"
                        >
                          <FileSpreadsheet className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          Gerar Excel
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleOpenEpiManagement}
                          disabled={!canGenerateReports || loading}
                          className="border-seguranca-yellow text-seguranca-yellow hover:bg-seguranca-yellow/10 text-sm sm:text-base h-10 sm:h-11 sm:col-span-2"
                        >
                          <Shield className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          Cadastrar / Gerenciar EPIs
                        </Button>
          </div>
                    </div>
                  </Card>
                </TabsContent>

                {canSeeHistory && (
                  <TabsContent value="historico" className="space-y-4 sm:space-y-6">
                    <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
                      <div className="p-4 sm:p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="p-1.5 sm:p-2 bg-seguranca-yellow/20 rounded-lg">
                              <History className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-yellow" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-semibold text-white">Histórico de Mudanças</h3>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleChangeHistoryPdf}
                            disabled={historyPdfLoading || !funcionario?.id}
                            className="border-seguranca-yellow text-seguranca-yellow hover:bg-seguranca-yellow/10 h-10"
                          >
                            {historyPdfLoading ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="mr-2 h-4 w-4" />
                            )}
                            Gerar Relatório PDF
                          </Button>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-200">Vínculos empregatícios</h4>
                          {employmentPeriodsLoading ? (
                            <p className="text-gray-400 text-sm">Carregando vínculos...</p>
                          ) : !employmentPeriods.length ? (
                            <p className="text-gray-500 text-xs">Nenhum vínculo registrado.</p>
                          ) : (
                            <div className="overflow-x-auto rounded-lg border border-gray-600">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-800/80 text-gray-300">
                                  <tr>
                                    <th className="text-left p-3">Tipo</th>
                                    <th className="text-left p-3">Empresa</th>
                                    <th className="text-left p-3">Cargo</th>
                                    <th className="text-left p-3">Admissão</th>
                                    <th className="text-left p-3">Demissão</th>
                                    <th className="text-left p-3">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="text-gray-400 divide-y divide-gray-600">
                                  {employmentPeriods.map((period) => (
                                    <tr key={period.id} className="hover:bg-gray-800/50">
                                      <td className="p-3">{period.admissionTypeLabel || period.admissionType}</td>
                                      <td className="p-3">{period.companyName || '-'}</td>
                                      <td className="p-3">{period.positionName || '-'}</td>
                                      <td className="p-3 whitespace-nowrap">
                                        {period.hireDate ? new Date(period.hireDate).toLocaleDateString('pt-BR') : '-'}
                                      </td>
                                      <td className="p-3 whitespace-nowrap">
                                        {period.terminationDate
                                          ? new Date(period.terminationDate).toLocaleDateString('pt-BR')
                                          : '-'}
                                      </td>
                                      <td className="p-3">
                                        {period.status === 'TERMINATED' ? 'Demitido' : 'Ativo'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {historyLoading ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-seguranca-yellow mx-auto" />
                            <p className="text-gray-400 text-sm mt-2">Carregando histórico...</p>
                          </div>
                        ) : !historyData?.content?.length ? (
                          <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-6 text-center">
                            <History className="mx-auto mb-2 text-gray-400" size={32} />
                            <p className="text-gray-400 text-sm">Nenhuma alteração registrada ainda.</p>
                            <p className="text-gray-500 text-xs mt-1">As mudanças no cadastro passam a ser registradas a partir de agora.</p>
                          </div>
                        ) : (
                          <>
                            <div className="overflow-x-auto rounded-lg border border-gray-600">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-800/80 text-gray-300">
                                  <tr>
                                    <th className="text-left p-3">Data/Hora</th>
                                    <th className="text-left p-3">Categoria</th>
                                    <th className="text-left p-3">Campo</th>
                                    <th className="text-left p-3">Valor antigo</th>
                                    <th className="text-left p-3">Valor novo</th>
                                    <th className="text-left p-3">Alterado por</th>
                                  </tr>
                                </thead>
                                <tbody className="text-gray-400 divide-y divide-gray-600">
                                  {historyData.content.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-800/50">
                                      <td className="p-3 whitespace-nowrap">
                                        {row.changedAt ? new Date(row.changedAt).toLocaleString('pt-BR') : '-'}
                                      </td>
                                      <td className="p-3">{row.categoryLabel || row.category}</td>
                                      <td className="p-3">{row.fieldLabel || row.fieldName}</td>
                                      <td className="p-3 max-w-[180px] truncate" title={row.oldValue ?? ''}>{row.oldValue ?? '-'}</td>
                                      <td className="p-3 max-w-[180px] truncate" title={row.newValue ?? ''}>{row.newValue ?? '-'}</td>
                                      <td className="p-3">{row.changedByUserName ?? '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {(historyData.totalPages ?? 0) > 1 && (
                              <div className="flex items-center justify-between pt-2">
                                <p className="text-gray-500 text-xs">
                                  Página {historyData.number + 1} de {historyData.totalPages} ({historyData.totalElements} registros)
                                </p>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={historyData.first}
                                    onClick={() => setHistoryPageIndex((p) => Math.max(0, p - 1))}
                                    className="border-gray-600 text-gray-300"
                                  >
                                    <ChevronLeft className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={historyData.last}
                                    onClick={() => setHistoryPageIndex((p) => p + 1)}
                                    className="border-gray-600 text-gray-300"
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </Card>

                    {/* Histórico de Remanejamentos */}
                    <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600">
                      <div className="p-4 sm:p-6 space-y-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="p-1.5 sm:p-2 bg-seguranca-yellow/20 rounded-lg">
                            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-seguranca-yellow" />
                          </div>
                          <h3 className="text-lg sm:text-xl font-semibold text-white">Histórico de Remanejamentos</h3>
                        </div>
                        {loadingRemanejamentos ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-seguranca-yellow mx-auto" />
                            <p className="text-gray-400 text-sm mt-2">Carregando remanejamentos...</p>
                          </div>
                        ) : !remanejamentos?.length ? (
                          <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-6 text-center">
                            <ArrowRight className="mx-auto mb-2 text-gray-400" size={32} />
                            <p className="text-gray-400 text-sm">Nenhum remanejamento registrado.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border border-gray-600">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-800/80 text-gray-300">
                                <tr>
                                  <th className="text-left p-3">Data</th>
                                  <th className="text-left p-3">Tipo</th>
                                  <th className="text-left p-3">Origem</th>
                                  <th className="text-left p-3">Destino</th>
                                  <th className="text-left p-3">Observação</th>
                                </tr>
                              </thead>
                              <tbody className="text-gray-400 divide-y divide-gray-600">
                                {remanejamentos.map((rem) => (
                                  <tr key={rem.id} className="hover:bg-gray-800/50">
                                    <td className="p-3 whitespace-nowrap">
                                      {rem.dataRemanejamento ? new Date(rem.dataRemanejamento).toLocaleDateString('pt-BR') : '-'}
                                    </td>
                                    <td className="p-3">
                                      <Badge variant="outline" className="text-[10px] uppercase font-bold border-gray-500 text-gray-300">
                                        {rem.tipo === 'TRANSFERENCIA_UNIDADE' ? 'Unidade' :
                                         rem.tipo === 'TRANSFERENCIA_POSTO_TRABALHO' ? 'Posto' :
                                         rem.tipo === 'PLANTAO' ? 'Plantão' :
                                         rem.tipo === 'COBRIR_FALTA' ? 'Falta' :
                                         rem.tipo === 'COBRIR_FERIAS' ? 'Férias' : rem.tipo}
                                      </Badge>
                                    </td>
                                    <td className="p-3">{rem.origem || '—'}</td>
                                    <td className="p-3">{rem.destino || '—'}</td>
                                    <td className="p-3 max-w-[200px] truncate" title={rem.observacao ?? ''}>{rem.observacao || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>
         
          {error && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}
         
              <DialogFooter className="flex flex-col gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-600 overflow-x-hidden mt-6">
                {/* Botões de ação */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={loading}
                    className="w-full h-10 sm:h-12 text-sm sm:text-base border-gray-500 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
                    disabled={loading}
                    className="w-full h-10 sm:h-12 text-sm sm:text-base font-semibold bg-gradient-to-r from-seguranca-red to-[#cc0000] hover:from-[#cc0000] hover:to-[#990000] text-white shadow-lg shadow-seguranca-red/20 border-0"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2 inline-block"></div>
                        Salvando...
                      </>
                    ) : (
                      'Salvar'
                    )}
            </Button>
                </div>
          </DialogFooter>
                 </form>
          </div>
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

        {/* Modal de Novo Médico */}
        <NovoMedicoModal
          open={novoMedicoModalOpen}
          onClose={() => setNovoMedicoModalOpen(false)}
          onMedicoCreated={handleMedicoCreated}
        />

        {/* Modal de Dependentes */}
        <DependentFormModal
          isOpen={dependentModalOpen}
          onClose={() => {
            setDependentModalOpen(false);
            setDependentToEdit(null);
          }}
          employeeId={funcionario?.id}
          employeeName={funcionario?.name}
          dependent={dependentToEdit || undefined}
          existingCpfs={[
            ...employeeDependents.filter((d) => d.id !== dependentToEdit?.id).map((d) => d.cpf),
            form.cpf,
          ].filter(Boolean) as string[]}
          onSuccess={async () => {
            await handleDependentSaved();
          }}
        />

        {/* Modal de Remanejamento - ao alterar Setor/Posto de Trabalho */}
        <Dialog open={remanejamentoModalOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
            setRemanejamentoModalOpen(false);
            setPendingWorkPostId('');
            setRemanejamentoForm({ dataInicio: '', escalaTrabalho: '', horarioTrabalho: '' });
          }
        }}>
          <DialogContent className="max-w-md bg-seguranca-graphite border-gray-600">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-seguranca-lightgray">
                Remanejamento - Novo Setor/Posto
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-400">
                Ao alterar o setor/posto de trabalho, é obrigatório informar a data de início no novo setor, a escala e o horário de trabalho. O registro será salvo como remanejamento e refletirá no histórico do funcionário.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label className="text-sm font-medium text-gray-200 mb-1.5 block">
                  Data de início no novo setor <span className="text-red-500">*</span>
                </Label>
                <DatePicker
                  date={parseDateFromBackend(remanejamentoForm.dataInicio) || undefined}
                  onDateChange={(date) => setRemanejamentoForm(prev => ({ ...prev, dataInicio: formatDateForBackend(date) || '' }))}
                  className="w-full"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200 mb-1.5 block">
                  Escala de trabalho <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Ex: 12x36, 6x1"
                  value={remanejamentoForm.escalaTrabalho}
                  onChange={(e) => setRemanejamentoForm(prev => ({ ...prev, escalaTrabalho: e.target.value }))}
                  className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-200 mb-1.5 block">
                  Horário de trabalho <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Ex: 18:00 às 06:00"
                  value={remanejamentoForm.horarioTrabalho}
                  onChange={(e) => setRemanejamentoForm(prev => ({ ...prev, horarioTrabalho: e.target.value }))}
                  className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setRemanejamentoModalOpen(false);
                  setPendingWorkPostId('');
                  setRemanejamentoForm({ dataInicio: '', escalaTrabalho: '', horarioTrabalho: '' });
                }}
                className="border-gray-600 text-gray-300"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!remanejamentoForm.dataInicio.trim()) {
                    toast({
                      title: "Campo obrigatório",
                      description: "Informe a data de início no novo setor.",
                      variant: "destructive"
                    });
                    return;
                  }
                  if (!remanejamentoForm.escalaTrabalho.trim()) {
                    toast({
                      title: "Campo obrigatório",
                      description: "Informe a escala de trabalho.",
                      variant: "destructive"
                    });
                    return;
                  }
                  if (!remanejamentoForm.horarioTrabalho.trim()) {
                    toast({
                      title: "Campo obrigatório",
                      description: "Informe o horário de trabalho.",
                      variant: "destructive"
                    });
                    return;
                  }
                  setForm(prev => ({
                    ...prev,
                    workPostId: pendingWorkPostId,
                    escalaTrabalho: remanejamentoForm.escalaTrabalho,
                    horarioTrabalho: remanejamentoForm.horarioTrabalho,
                    remanejamentoDataInicio: remanejamentoForm.dataInicio
                  }));
                  setRemanejamentoModalOpen(false);
                  setPendingWorkPostId('');
                  toast({
                    title: "Dados confirmados",
                    description: "Clique em Salvar para registrar o remanejamento e atualizar o funcionário.",
                  });
                }}
                className="bg-seguranca-yellow text-seguranca-dark hover:bg-seguranca-yellow/90"
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Ficha de Entrega de EPI */}
        <Dialog open={epiModalOpen} onOpenChange={setEpiModalOpen}>
          <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto bg-seguranca-graphite border-gray-600">
            <DialogHeader className="pb-3 sm:pb-4">
              <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold text-seguranca-lightgray">
                Ficha de Entrega de EPI
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-gray-400">
                Cadastre e gerencie os EPIs entregues para este funcionário. Após salvar, gere o PDF completo na seção de relatórios.
              </DialogDescription>
            </DialogHeader>
            <div className="pt-2">
              <FichaEntregaEPIForm employeeId={employeeIdValue || undefined} />
            </div>
          </DialogContent>
     </Dialog>
      </Dialog>
    </TooltipProvider >
   );
 };

export default FuncionarioEditModal;