import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { employeeService } from '@/services/employeeService';
import { CreateEmployeeDTO, Employee } from '@/types/employee';
import { positionService, Position } from '@/services/positionService';
import workPostService, { WorkPost } from '@/services/workPostService';
import departmentService, { Department, filterCompanyDepartments } from '@/services/departmentService';
import { unitService, Unit } from '@/services/unitService';
import { userService } from '@/services/userService';
import { User } from '@/types/user';
import { companyService } from '@/services/companyService';
import { Company } from '@/types/company';
import { Search, User as UserIcon, Building, Briefcase, Plus, UserPlus, Link, X, FileText, AlertCircle, Users as UsersIcon, Trash2, Edit2, Shield, Eye, FileSpreadsheet, History, ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react';
import NovoCargoModal from '@/components/funcionarios/NovoCargoModal';
import NovoMedicoModal from '@/components/funcionarios/NovoMedicoModal';
import CriarUsuarioPadraoModal from '@/components/funcionarios/CriarUsuarioPadraoModal';
import { DependentFormModal } from '@/components/dependentes/DependentFormModal';
import dependentService from '@/services/dependentService';
import { Dependent, DependentCreateRequest, RELATIONSHIP_OPTIONS } from '@/types/dependent';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries';
import { TooltipProvider } from '@/components/ui/tooltip';
import { epiDeliveryFormService } from '@/services/epiDeliveryFormService';
import accountingFormService from '@/services/accountingFormService';
import { doctorService } from '@/services/doctorService';
import { Doctor } from '@/types/doctor';
import FichaEntregaEPIForm from './FichaEntregaEPIForm';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { validateCPF, formatCpfForInput, formatTituloEleitorForInput } from '@/utils/validation';
import CurrencyInput from 'react-currency-input-field';
import DocumentosGerarTab from './DocumentosGerarTab';
import { EmployeeDocumentsTab } from './EmployeeDocumentsTab';
import { useInvalidateDocumentosGerados } from '@/hooks/queries/useDocumentosGerados';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/utils/permissions';
import { employeeChangeHistoryService, EmployeeChangeHistoryPage } from '@/services/employeeChangeHistoryService';
import {
  employeeEmploymentPeriodService,
  EligibleRehireEmployee,
  EmployeeEmploymentPeriod,
  EmploymentAdmissionType,
} from '@/services/employeeEmploymentPeriodService';
import RehireAdmissionPanel from '@/components/funcionarios/RehireAdmissionPanel';
import { DismissalReasonSelect } from '@/components/funcionarios/DismissalReasonSelect';
import { DatePicker } from '@/components/ui/date-picker';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { parseDateFromBackend, formatDateForBackend } from '@/utils/dateUtils';
import {
  clearEmployeeFormDraft,
  getEmployeeFormDraftKey,
  saveEmployeeFormDraft,
} from '@/utils/employeeFormDraft';
import { enqueueEmployeeSync } from '@/utils/employeeOfflineSync';
import { isRetryableConnectionError } from '@/utils/connectionError';
import { useEmployeeOfflineSync } from '@/hooks/useEmployeeOfflineSync';
import { EmployeeOfflineSyncBanner } from '@/components/funcionarios/EmployeeOfflineSyncBanner';

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
  telefoneContato: '',
  address: '',
  enderecoRua: '',
  enderecoNumero: '',
  enderecoComplemento: '',
  enderecoBairro: '',
  enderecoCidade: '',
  enderecoEstado: '',
  enderecoCep: '',
  birthDate: '',
  maritalStatus: 'SINGLE',
  nationality: 'Brasileiro',
  nomePai: '',
  nomeMae: '',
  localNascimento: '',
  municipioNascimento: '',
  estadoNascimento: '',
  sexo: '',
  grauInstrucao: '',
  matriculaEsocial: '',
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
  },
  bankData: {
    bank: '',
    agency: '',
    account: '',
    accountDigit: '',
    type: 'CORRENTE',
    chavePix: ''
  },
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
  // Campos da planilha
  rgUf: '',
  racaCor: '',
  tipoSalarioContratual: '',
  departmentId: '',
};

const FuncionarioNovoModal: React.FC<FuncionarioNovoModalProps> = ({ open, onClose, onCreated, employeeToEdit }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const normalizedRole = (user?.role ?? '').replace(/^ROLE_/, '');
  const isRHOrDPE = ['RH', 'DEPARTAMENTO_PESSOAL', 'ASSISTENCIA_RH', 'AUX_DEP', 'SUPER_ADMIN', 'ADMIN'].includes(normalizedRole);
  const canSeeHistory = isRHOrDPE || (user?.permissions && hasPermission(user.permissions, 'EMPLOYEE_HISTORY_READ'));
  const [form, setForm] = useState<CreateEmployeeDTO>(initialState);
  const [isEditMode, setIsEditMode] = useState(false);
  const showHistoryTab = canSeeHistory && isEditMode;
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [eligibleRehireEmployee, setEligibleRehireEmployee] = useState<EligibleRehireEmployee | null>(null);
  const [rehireAdmissionType, setRehireAdmissionType] = useState<EmploymentAdmissionType | ''>('');
  const [employmentPeriods, setEmploymentPeriods] = useState<EmployeeEmploymentPeriod[]>([]);
  const [employmentPeriodsLoading, setEmploymentPeriodsLoading] = useState(false);
  const [historyPdfLoading, setHistoryPdfLoading] = useState(false);
  const cpfRehireCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalWasOpenRef = useRef(false);
  const loadedEmployeeIdRef = useRef<string | null>(null);
  /** Posto original ao abrir edição — remanejamento só se o usuário mudar para outro posto. */
  const initialWorkPostIdRef = useRef('');
  /** Evita abrir modal de remanejamento durante hidratação do Select (workPosts ainda carregando). */
  const workPostSelectReadyRef = useRef(false);
  const draftStorageKey = useMemo(
    () => getEmployeeFormDraftKey(user?.id || user?.username),
    [user?.id, user?.username],
  );
  const [offlineQueueId, setOfflineQueueId] = useState<string | null>(null);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const isInitialMount = useRef(true);
  const lastSavedFormRef = useRef<string | null>(null);

  // Monitora a inicialização/carregamento do form
  useEffect(() => {
    if (open) {
      if (employeeToEdit?.id && form.name) {
        if (lastSavedFormRef.current === null) {
          lastSavedFormRef.current = JSON.stringify(form);
        }
      } else if (!employeeToEdit && lastSavedFormRef.current === null) {
        lastSavedFormRef.current = JSON.stringify(form);
      }
    }
  }, [open, employeeToEdit, form]);

  // Monitor form changes for autosave in FuncionarioNovoModal
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

    const currentFormStr = JSON.stringify(form);
    if (lastSavedFormRef.current === null) {
      return;
    }
    if (currentFormStr === lastSavedFormRef.current) {
      return;
    }

    // 1. Se já está no modo de edição (funcionário já existe)
    if (isEditMode && currentEmployeeId) {
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

      setSaveStatus('saving');

      const delayDebounceFn = setTimeout(async () => {
        try {
          const { remanejamentoDataInicio, ...formRest } = form as any;
          const employeeData: any = { ...formRest };
          if (remanejamentoDataInicio && remanejamentoDataInicio.trim()) {
            employeeData.remanejamentoDataInicio = remanejamentoDataInicio;
          }

          const updatedEmployee = await employeeService.updateEmployee(currentEmployeeId, employeeData);
          syncInitialWorkPostRef(
            updatedEmployee?.workPostId || updatedEmployee?.workPost?.id || employeeData.workPostId,
          );

          queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
          queryClient.setQueryData(queryKeys.employees.byId(currentEmployeeId), updatedEmployee);

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
    } 
    
    // 2. Se NÃO está no modo de edição (funcionário novo, tentar a criação automática se os campos obrigatórios estiverem válidos)
    else if (!isEditMode && !currentEmployeeId && !employeeToEdit) {
      if (!form.name?.trim() || !form.cpf?.trim() || !form.phone?.trim() || !form.hireDate) {
        return;
      }

      const cpfDigits = form.cpf.replace(/\D/g, '');
      if (cpfDigits.length !== 11 || !validateCPF(form.cpf)) {
        return;
      }

      if (!form.enderecoRua?.trim() || !form.enderecoNumero?.trim() || !form.enderecoBairro?.trim() || !form.enderecoCidade?.trim() || !form.enderecoEstado?.trim() || !form.enderecoCep?.trim()) {
        return;
      }

      setSaveStatus('saving');

      const delayDebounceFn = setTimeout(async () => {
        try {
          const employeeData = { ...form } as Record<string, unknown>;
          delete employeeData.remanejamentoDataInicio;

          const createdEmployee = await employeeService.createEmployee(employeeData);
          console.log('✅ Funcionário criado via salvamento automático - ID:', createdEmployee.id);
          
          setCurrentEmployeeId(createdEmployee.id);
          setIsEditMode(true);
          syncInitialWorkPostRef(
            createdEmployee?.workPostId || createdEmployee?.workPost?.id || (employeeData.workPostId as string),
          );
          
          queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
          queryClient.setQueryData(queryKeys.employees.byId(createdEmployee.id), createdEmployee);
          void clearEmployeeFormDraft(draftStorageKey);

          lastSavedFormRef.current = currentFormStr;
          setSaveStatus('saved');
          const resetStatusTimeout = setTimeout(() => setSaveStatus('idle'), 3000);
          return () => clearTimeout(resetStatusTimeout);
        } catch (err) {
          console.error('Erro ao criar funcionário automaticamente:', err);
          setSaveStatus('error');
        }
      }, 2000);

      return () => clearTimeout(delayDebounceFn);
    }
  }, [form, isEditMode, currentEmployeeId, open, queryClient, employeeToEdit]);

  const handleOfflineItemSynced = useCallback(
    ({ item, employee }: { item: { id: string; operation: string }; employee?: { id?: string } }) => {
      if (offlineQueueId && item.id !== offlineQueueId) {
        return;
      }

      toast({
        title: 'Sincronizado com sucesso',
        description:
          item.operation === 'create'
            ? 'Cadastro enviado ao servidor.'
            : 'Alterações enviadas ao servidor.',
      });

      if (item.operation === 'create' && employee?.id) {
        setCurrentEmployeeId(employee.id);
        setIsEditMode(true);
        setPendingDependents([]);
        void clearEmployeeFormDraft(draftStorageKey);
      }

      setOfflineQueueId(null);
      onCreated();
    },
    [draftStorageKey, offlineQueueId, onCreated, toast],
  );

  const {
    pendingCount,
    isSyncing,
    syncPending,
  } = useEmployeeOfflineSync(user?.id || user?.username, {
    onItemSynced: handleOfflineItemSynced,
  });

  // Estados para médicos
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [doctorSearchTerm, setDoctorSearchTerm] = useState('');
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Função para carregar médicos
  const loadDoctors = async () => {
    try {
      setLoadingDoctors(true);
      const doctorsList = await doctorService.getAllActive();
      setDoctors(doctorsList);
    } catch (error) {
      console.error('Erro ao carregar médicos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de médicos.",
        variant: "destructive"
      });
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
      const results = await doctorService.searchByName(searchTerm);
      setDoctors(results);
    } catch (error) {
      console.error('Erro ao buscar médicos:', error);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Função para buscar CEP via API BrasilAPI
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
        const enderecoCompletoAtualizado = `${data.street || ''}, ${data.neighborhood || ''}, ${data.city || ''} - ${uf}, ${cepLimpo}`;
        setForm(prev => ({
          ...prev,
          enderecoRua: data.street || '',
          enderecoBairro: data.neighborhood || '',
          enderecoCidade: data.city || '',
          enderecoEstado: uf,
          enderecoCep: cepLimpo,
          address: enderecoCompletoAtualizado,
        }));
        toast({
          title: "CEP encontrado",
          description: "Endereço preenchido automaticamente.",
          variant: "default"
        });
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP digitado.",
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

  // Estados para os dados dos selects
  const [positions, setPositions] = useState<Position[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [workPosts, setWorkPosts] = useState<WorkPost[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentService.listActive(),
    enabled: open,
    select: filterCompanyDepartments,
  });

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
  const [pendingDependents, setPendingDependents] = useState<DependentCreateRequest[]>([]); // Dependentes pendentes para salvar após criar funcionário
  const [dependentModalOpen, setDependentModalOpen] = useState(false);
  const [dependentToEdit, setDependentToEdit] = useState<Dependent | null>(null);
  const [loadingDependents, setLoadingDependents] = useState(false);

  const loadEmployeeDependents = useCallback(async (employeeId: string | undefined, keepOnError = false) => {
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
      console.warn('UUID inválido para carregar dependentes:', raw);
      setEmployeeDependents([]);
      return;
    }

    setLoadingDependents(true);
    try {
      const dependents = await dependentService.getDependentsByEmployee(raw);
      setEmployeeDependents(Array.isArray(dependents) ? dependents : []);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      const status = err?.response?.status;
      if (status === 500) {
        // Backend serialization error — dependente provavelmente foi salvo
        // Mantém lista atual se keepOnError=true (logo após salvar)
        console.warn('[dependentes] GET retornou 500 — backend issue (mantém lista atual):', error);
        if (!keepOnError) setEmployeeDependents([]);
      } else if (status === 403) {
        console.warn('Acesso negado ao carregar dependentes.');
        if (!keepOnError) setEmployeeDependents([]);
      } else {
        console.error('Erro ao carregar dependentes:', error);
        if (!keepOnError) setEmployeeDependents([]);
      }
    } finally {
      setLoadingDependents(false);
    }
  }, []);

  useEffect(() => {
    const empId = currentEmployeeId || employeeToEdit?.id;
    if (!open || !empId) {
      return;
    }
    loadEmployeeDependents(empId);
  }, [open, currentEmployeeId, employeeToEdit?.id, loadEmployeeDependents]);

  // Estados para modal de remanejamento ao alterar setor/posto
  const [remanejamentoModalOpen, setRemanejamentoModalOpen] = useState(false);
  const [pendingWorkPostId, setPendingWorkPostId] = useState<string>('');
  const [remanejamentoForm, setRemanejamentoForm] = useState({ dataInicio: '', escalaTrabalho: '', horarioTrabalho: '' });

  // Estados para aba Histórico
  const [historyData, setHistoryData] = useState<EmployeeChangeHistoryPage | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPageIndex, setHistoryPageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('cadastro');
  const invalidateDocumentosGerados = useInvalidateDocumentosGerados();

  // Intervalos Almoço/Janta: controla visibilidade do campo Horário do Intervalo
  const [temIntervaloAlmoco, setTemIntervaloAlmoco] = useState<'sim' | 'nao'>('nao');

  const resetNewEmployeeFormState = useCallback(async () => {
    setIsEditMode(false);
    setCurrentEmployeeId(null);
    setForm(initialState);
    setPendingDependents([]);
    setTemIntervaloAlmoco('nao');
    setActiveTab('cadastro');
    setCpfError(null);
    setError(null);
    setSelectedPosition(null);
    setSelectedUnit(null);
    setSelectedUser(null);
    setSelectedCompany(null);
    setPhotoPreview(null);
    setEmployeeDependents([]);
    setUserSearchTerm('');
    setPositionSearchTerm('');
    setSelectedDoctor(null);
    setDoctorSearchTerm('');
    setShowDoctorDropdown(false);
    await clearEmployeeFormDraft(draftStorageKey);
  }, [draftStorageKey]);

  const resetForm = () => {
    void resetNewEmployeeFormState();
  };

  const persistEmployeeDraft = useCallback(async () => {
    if (isEditMode || employeeToEdit) {
      return null;
    }

    const saved = await saveEmployeeFormDraft(draftStorageKey, {
      form,
      pendingDependents,
      temIntervaloAlmoco,
      activeTab,
      doctorSearchTerm,
      userSearchTerm,
      positionSearchTerm,
    });

    return saved;
  }, [
    activeTab,
    doctorSearchTerm,
    draftStorageKey,
    employeeToEdit,
    form,
    isEditMode,
    userSearchTerm,
    positionSearchTerm,
    pendingDependents,
    temIntervaloAlmoco,
  ]);

  // Resetar aba Histórico quando o modal abrir sem permissão de histórico
  useEffect(() => {
    if (open && !showHistoryTab && activeTab === 'historico') {
      setActiveTab('cadastro');
    }
  }, [open, showHistoryTab, activeTab]);

  // Carregar histórico de mudanças quando abrir a aba Histórico (modo edição)
  useEffect(() => {
    if (!showHistoryTab || activeTab !== 'historico' || !currentEmployeeId) {
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    setEmploymentPeriodsLoading(true);
    Promise.all([
      employeeChangeHistoryService.getByEmployeeId(currentEmployeeId, historyPageIndex, 20),
      employeeEmploymentPeriodService.getEmploymentPeriods(currentEmployeeId),
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
    return () => { cancelled = true; };
  }, [showHistoryTab, activeTab, currentEmployeeId, historyPageIndex]);

  // useEffect para carregar dados do funcionário em modo de edição
  useEffect(() => {
    const justOpened = open && !modalWasOpenRef.current;
    modalWasOpenRef.current = open;

    if (!open) {
      loadedEmployeeIdRef.current = null;
      initialWorkPostIdRef.current = '';
      workPostSelectReadyRef.current = false;
      return;
    }

    if (employeeToEdit) {
      const employeeId = employeeToEdit.id || null;
      if (!justOpened && loadedEmployeeIdRef.current === employeeId) {
        return;
      }
      loadedEmployeeIdRef.current = employeeId;
      console.log('🔍 Carregando dados do funcionário para edição:', employeeToEdit);
      setIsEditMode(true);
      // Definir currentEmployeeId quando abrir para edição
      if (employeeToEdit.id) {
        setCurrentEmployeeId(employeeToEdit.id);
        console.log('✅ currentEmployeeId definido para edição:', employeeToEdit.id);
      }

      // Preencher o formulário com os dados do funcionário
      setForm({
        name: employeeToEdit.name || '',
        cpf: employeeToEdit.cpf || employeeToEdit.document || '',
        rg: employeeToEdit.rg || '',
        email: employeeToEdit.email || '',
        phone: employeeToEdit.phone || '',
        telefoneContato: (employeeToEdit as any).telefoneContato || '',
        address: employeeToEdit.address || '',
        // Preencher campos separados se existirem, senão tentar extrair do campo address
        enderecoRua: (employeeToEdit as any).enderecoRua || '',
        enderecoNumero: (employeeToEdit as any).enderecoNumero || '',
        enderecoComplemento: (employeeToEdit as any).enderecoComplemento || '',
        enderecoBairro: (employeeToEdit as any).enderecoBairro || '',
        enderecoCidade: (employeeToEdit as any).enderecoCidade || '',
        enderecoEstado: (employeeToEdit as any).enderecoEstado || '',
        enderecoCep: (employeeToEdit as any).enderecoCep || '',
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
        tituloEleitorDataExpedicao: employeeToEdit.tituloEleitorDataExpedicao || '',
        tituloEleitorValidade: employeeToEdit.tituloEleitorValidade || '',
        nomeConselhoRegional: employeeToEdit.nomeConselhoRegional || '',
        carteiraIdentidadeOrgaoEmissor: employeeToEdit.carteiraIdentidadeOrgaoEmissor || '',
        carteiraIdentidadeDataEmissao: employeeToEdit.carteiraIdentidadeDataEmissao || '',
        rgUf: (employeeToEdit as any).rgUf || '',
        racaCor: (employeeToEdit as any).racaCor || '',
        tipoSalarioContratual: (employeeToEdit as any).tipoSalarioContratual || '',
        certificadoMilitar: employeeToEdit.certificadoMilitar || '',
        nomePai: employeeToEdit.nomePai || (employeeToEdit as any).pai || '', // Fallback para .pai
        nomeMae: employeeToEdit.nomeMae || (employeeToEdit as any).mae || '', // Fallback para .mae
        localNascimento: employeeToEdit.localNascimento || '',
        municipioNascimento: employeeToEdit.municipioNascimento || '',
        estadoNascimento: employeeToEdit.estadoNascimento || '',
        sexo: employeeToEdit.sexo || '',
        grauInstrucao: employeeToEdit.grauInstrucao || '',
        matriculaEsocial: employeeToEdit.matriculaEsocial || '',
        cbo: employeeToEdit.cbo || '',
        salario: employeeToEdit.salario || 0,
        salarioPorExtenso: employeeToEdit.salarioPorExtenso || '',
        periodoPagamento: employeeToEdit.periodoPagamento || '',
        horarioTrabalho: employeeToEdit.horarioTrabalho || '',
        horarioTrabalhoIntervalo: employeeToEdit.horarioTrabalhoIntervalo || '',
        diasTrabalho: employeeToEdit.diasTrabalho || '',
        prazoExperienciaTexto: employeeToEdit.prazoExperienciaTexto || '',
        prorrogacaoExperiencia: employeeToEdit.prorrogacaoExperiencia || '',
        folgaSemanal: employeeToEdit.folgaSemanal || '',
        escalaTrabalho: employeeToEdit.escalaTrabalho || '',
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

        // Campos para Estrangeiro
        rneNumero: employeeToEdit.rneNumero || '',
        rneValidade: employeeToEdit.rneValidade || '',
        ricNumero: employeeToEdit.ricNumero || '',
        ricOrgaoEmissor: employeeToEdit.ricOrgaoEmissor || '',
        ricDataEmissao: employeeToEdit.ricDataEmissao || '',
        tipoVisto: employeeToEdit.tipoVisto || '',

        // Dados do Exame Médico (ASO)
        exameMedicoData: employeeToEdit.exameMedicoData || '',
        exameMedicoVencimento: employeeToEdit.exameMedicoVencimento || '',
        exameMedicoTipo: employeeToEdit.exameMedicoTipo || '',
        exameMedicoDoctor: employeeToEdit.exameMedicoDoctor || undefined,
        exameMedicoHorario: employeeToEdit.exameMedicoHorario || '',
        exameMedicoIntervalosRefeicao: employeeToEdit.exameMedicoIntervalosRefeicao,
        exameMedicoHorarioIntervalo: employeeToEdit.exameMedicoHorarioIntervalo || '',
        exameMedicoObservacoes: employeeToEdit.exameMedicoObservacoes || '',
        exameMedicoPrimeiroEmprego: employeeToEdit.exameMedicoPrimeiroEmprego,
        exameMedicoContribuicaoSindicalPaga: employeeToEdit.exameMedicoContribuicaoSindicalPaga,

        // Campos de CIN
        cinNumero: employeeToEdit.cinNumero || '',
        cinOrgaoEmissor: employeeToEdit.cinOrgaoEmissor || '',
        cinDataEmissao: employeeToEdit.cinDataEmissao || '',

        // Dados bancários - priorizar bankData, cair para bankInfo se necessário
        bankData: (employeeToEdit.bankData || (employeeToEdit as any).bankInfo) ? {
          bank: (employeeToEdit.bankData?.bank || (employeeToEdit as any).bankInfo?.bank || ''),
          agency: (employeeToEdit.bankData?.agency || (employeeToEdit as any).bankInfo?.agency || ''),
          account: (employeeToEdit.bankData?.account || (employeeToEdit as any).bankInfo?.account || ''),
          accountDigit: (employeeToEdit.bankData?.accountDigit || (employeeToEdit as any).bankInfo?.accountDigit || ''),
          type: (employeeToEdit.bankData?.type || (employeeToEdit as any).bankInfo?.accountType || 'CORRENTE'),
          chavePix: (employeeToEdit.bankData as any)?.chavePix || (employeeToEdit.bankData as any)?.pixKey ||
                    (employeeToEdit as any).bankInfo?.pixKey || (employeeToEdit as any).bankInfo?.chavePix || ''
        } : initialState.bankData,

        // Campos relacionais - workPost pode vir como objeto { id, name } ou workPostId
        workPostId: (employeeToEdit as any).workPostId || (employeeToEdit as any).workPost?.id || '',
        departmentId: String((employeeToEdit as any).departmentId || (employeeToEdit as any).department?.id || '')
      });

      initialWorkPostIdRef.current = String(
        (employeeToEdit as any).workPostId || (employeeToEdit as any).workPost?.id || '',
      ).toLowerCase();
      workPostSelectReadyRef.current = false;

      if ((employeeToEdit.status || '').toUpperCase() === 'TERMINATED') {
        setEligibleRehireEmployee(employeeToEdit as EligibleRehireEmployee);
      } else {
        setEligibleRehireEmployee(null);
        setRehireAdmissionType('');
      }

      setTemIntervaloAlmoco(employeeToEdit.horarioTrabalhoIntervalo ? 'sim' : 'nao');

      // Preencher seleções
      console.log('🔍 Dados de relacionamento:', {
        position: employeeToEdit.position,
        unit: employeeToEdit.unit,
        user: employeeToEdit.user,
        company: employeeToEdit.company,
        workPost: (employeeToEdit as any).workPost,
        workPostId: (employeeToEdit as any).workPostId,
        department: (employeeToEdit as any).department,
        departmentId: (employeeToEdit as any).departmentId
      });
      console.log('🔍 [DEBUG] form.workPostId:', (employeeToEdit as any).workPostId || (employeeToEdit as any).workPost?.id || '');
      console.log('🔍 [DEBUG] workPosts disponíveis:', workPosts.length, workPosts.map(wp => wp.id));

      if (employeeToEdit.position) {
        console.log('🔍 Carregando posição:', employeeToEdit.position);
        setSelectedPosition(employeeToEdit.position);
        setPositionSearchTerm('');
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
        // Tentar encontrar a empresa completa na lista para garantir que temos todos os dados (CNPJ, sigla, etc)
        const fullCompany = companies.find(c => c.id === employeeToEdit.company?.id);
        if (fullCompany) {
          setSelectedCompany(fullCompany);
        } else {
          // Se não encontrou na lista, usar o que veio do funcionário (que pode ser só o id e nome)
          setSelectedCompany(employeeToEdit.company as Company);
        }
      }

      // Dependentes: carregados pelo useEffect dedicado (open + employeeToEdit.id)

      // Carregar médico se houver (uso de optional chaining para segurança)
      if (employeeToEdit.exameMedicoDoctor?.id) {
        doctorService.getById(employeeToEdit.exameMedicoDoctor.id)
          .then(doctor => {
            if (doctor) {
              setSelectedDoctor(doctor);
              setDoctorSearchTerm(`${doctor.name} - CRM ${doctor.crmNumber}/${doctor.crmState}`);
            }
          })
          .catch(err => console.error('Erro ao carregar médico:', err));
      }
      return;
    }

    if (!justOpened) {
      return;
    }

    let cancelled = false;

    const prepareNewEmployeeForm = async () => {
      await resetNewEmployeeFormState();
      if (cancelled) {
        return;
      }
    };

    void prepareNewEmployeeForm();
    return () => {
      cancelled = true;
    };
  }, [employeeToEdit, open, resetNewEmployeeFormState]);

  // Carregar médicos quando abrir o modal
  useEffect(() => {
    if (open) {
      loadDoctors();
    }
  }, [open]);

  // Função para carregar Postos de Trabalho (carrega todos do sistema e ordena alfabeticamente)
  const loadWorkPostsData = async () => {
    try {
      const wp = await workPostService.getAllWorkPosts();
      const sortedWp = (wp || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setWorkPosts(sortedWp);
    } catch (e) {
      console.error('Erro ao carregar postos de trabalho', e);
    }
  };

  // Carregar Postos de Trabalho ao abrir o modal
  useEffect(() => {
    if (open) {
      loadWorkPostsData();
    }
  }, [open]);

  // Habilitar detecção de remanejamento só após postos carregarem (evita modal ao abrir edição)
  useEffect(() => {
    if (!open) {
      workPostSelectReadyRef.current = false;
      return;
    }

    if (!isEditMode) {
      workPostSelectReadyRef.current = true;
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
  }, [open, isEditMode, workPosts.length, employeeToEdit?.id]);

  // Atualizar selectedCompany quando companies forem carregadas e houver employeeToEdit
  useEffect(() => {
    if (employeeToEdit?.company?.id && companies.length > 0) {
      const fullCompany = companies.find(c => c.id === employeeToEdit.company?.id);
      if (fullCompany && (!selectedCompany || selectedCompany.id !== fullCompany.id)) {
        console.log('🔍 Atualizando empresa com dados completos:', fullCompany);
        setSelectedCompany(fullCompany);
      }
    }
  }, [companies, employeeToEdit?.company?.id]);

  // Restaurar seleções do rascunho (modo criação) quando listas carregarem
  useEffect(() => {
    if (!open || employeeToEdit || isEditMode) {
      return;
    }

    if (form.company?.id && companies.length > 0) {
      const company = companies.find(c => c.id === form.company?.id);
      if (company && selectedCompany?.id !== company.id) {
        setSelectedCompany(company);
      }
    }

    if (form.unit?.id && units.length > 0) {
      const unit = units.find(u => u.id === form.unit?.id);
      if (unit && selectedUnit?.id !== unit.id) {
        setSelectedUnit(unit);
      }
    }
  }, [
    open,
    employeeToEdit,
    isEditMode,
    form.company?.id,
    form.unit?.id,
    companies,
    units,
    selectedCompany?.id,
    selectedUnit?.id,
  ]);

  useEffect(() => {
    if (!open || employeeToEdit || isEditMode || !form.exameMedicoDoctor?.id) {
      return;
    }

    if (selectedDoctor?.id === form.exameMedicoDoctor.id) {
      return;
    }

    doctorService.getById(form.exameMedicoDoctor.id)
      .then((doctor) => {
        if (!doctor) {
          return;
        }
        setSelectedDoctor(doctor);
        if (!doctorSearchTerm) {
          setDoctorSearchTerm(`${doctor.name} - CRM ${doctor.crmNumber}/${doctor.crmState}`);
        }
      })
      .catch((err) => console.error('Erro ao restaurar médico do rascunho:', err));
  }, [
    open,
    employeeToEdit,
    isEditMode,
    form.exameMedicoDoctor?.id,
    selectedDoctor?.id,
    doctorSearchTerm,
  ]);

  // Abrir modal para adicionar dependente
  const handleAddDependent = () => {
    setDependentToEdit(null);
    setDependentModalOpen(true);
  };

  // Modificar callback para salvar dependente temporariamente se ainda não há funcionário criado
  const handleDependentSavedInCreation = async (dependentData: DependentCreateRequest) => {
    if (!isEditMode || !employeeToEdit?.id) {
      // Se ainda não há funcionário criado, armazenar temporariamente
      setPendingDependents(prev => [...prev, dependentData]);
      setDependentModalOpen(false);
      toast({
        title: "Sucesso!",
        description: "Dependente será adicionado após salvar o funcionário.",
        variant: "default"
      });
    } else {
      // Se já há funcionário, salvar normalmente
      await handleDependentSaved();
    }
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
  const handleDependentSaved = async (savedDependent?: any) => {
    setDependentModalOpen(false);
    setDependentToEdit(null);

    if (employeeToEdit?.id) {
      // Optimistic update: adiciona/atualiza na lista local imediatamente
      if (savedDependent) {
        setEmployeeDependents(prev => {
          const exists = prev.some(d => d.id === savedDependent.id);
          if (exists) {
            return prev.map(d => d.id === savedDependent.id ? savedDependent : d);
          }
          return [...prev, savedDependent];
        });
      }
      // Tenta recarregar do servidor; mantém lista atual se der 500
      await loadEmployeeDependents(employeeToEdit.id, true);
    }

    toast({
      title: "Sucesso!",
      description: dependentToEdit ? "Dependente atualizado com sucesso." : "Dependente adicionado com sucesso.",
      variant: "default"
    });
  };

  // Estados para modal de novo cargo
  const [novoCargoModalOpen, setNovoCargoModalOpen] = useState(false);
  const [epiModalOpen, setEpiModalOpen] = useState(false);

  // Estados para modal de novo médico
  const [novoMedicoModalOpen, setNovoMedicoModalOpen] = useState(false);

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
        setPositionSearchTerm('');
      }
    } else {
      setSelectedPosition(null);
      setPositionSearchTerm('');
    }
  }, [form.position?.id, positions]);

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

    // Handle bankData fields
    if (name.startsWith('bankData.')) {
      const field = name.split('.')[1];
      setForm((prev) => ({
        ...prev,
        bankData: {
          ...(prev.bankData || { bank: '', agency: '', account: '', accountDigit: '', type: 'CORRENTE', chavePix: '' }),
          [field]: value
        }
      }));
    } else if (name === 'cbo') {
      const normalized = value.replace(/\D/g, '');
      const matched = positions.find(p => (p.cbo || '').replace(/\D/g, '') === normalized);
      if (matched) {
        setSelectedPosition(matched);
        setPositionSearchTerm('');
        setForm(prev => ({
          ...prev,
          cbo: value,
          position: { id: matched.id }
        }));
      } else {
        setForm((prev) => ({ ...prev, [name]: value }));
      }
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

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const formatted = formatCpfForInput(raw);
    setCpfError(null);
    const updates: Partial<CreateEmployeeDTO> = {
      cpf: formatted,
      ctps: formatted // Sync CTPS with formatted CPF
    };
    if (raw.length === 11) {
      if (!validateCPF(formatted)) {
        setCpfError('CPF não válido');
        setEligibleRehireEmployee(null);
        setRehireAdmissionType('');
      } else if (!isEditMode) {
        if (cpfRehireCheckRef.current) clearTimeout(cpfRehireCheckRef.current);
        cpfRehireCheckRef.current = setTimeout(async () => {
          try {
            const eligible = await employeeService.findEligibleForRehire(formatted);
            if (eligible) {
              setEligibleRehireEmployee(eligible as EligibleRehireEmployee);
              setForm((prev) => ({
                ...prev,
                name: eligible.name || prev.name,
                cpf: formatted,
                ctps: formatted,
                rg: eligible.rg || prev.rg,
                birthDate: eligible.birthDate || prev.birthDate,
                email: eligible.email || prev.email,
                phone: eligible.phone || prev.phone,
                status: 'ACTIVE',
                dataRescisao: undefined,
                terminationReason: undefined,
              }));
            } else {
              setEligibleRehireEmployee(null);
              setRehireAdmissionType('');
            }
          } catch {
            setEligibleRehireEmployee(null);
            setRehireAdmissionType('');
          }
        }, 400);
      }
    } else {
      setEligibleRehireEmployee(null);
      setRehireAdmissionType('');
    }
    setForm((prev) => ({ ...prev, ...updates }));
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
    if (isEditMode && !workPostSelectReadyRef.current) {
      return;
    }

    const newValue = value === 'none' ? '' : value;
    const normalizedNew = normalizeWorkPostId(newValue);
    const currentWorkPostId = normalizeWorkPostId((form as any).workPostId);

    if (normalizedNew === currentWorkPostId) {
      return;
    }

    const baseline = initialWorkPostIdRef.current;
    if (isEditMode && isWorkPostTransfer(baseline, normalizedNew)) {
      setPendingWorkPostId(normalizedNew);
      const hoje = new Date().toISOString().split('T')[0];
      setRemanejamentoForm({
        dataInicio: hoje,
        escalaTrabalho: (form as any).escalaTrabalho || '',
        horarioTrabalho: (form as any).horarioTrabalho || '',
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
      dataRescisao: undefined,
      terminationReason: undefined,
      hireDate: prev.hireDate === prevHire ? '' : prev.hireDate,
    }));
  };

  const isRehireFormMode = Boolean(eligibleRehireEmployee && rehireAdmissionType);

  const downloadHistoryPdfBlob = (blob: Blob, filename: string) => {
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
    if (!currentEmployeeId) return;
    setHistoryPdfLoading(true);
    try {
      const blob = await employeeService.generateEmployeeChangeHistoryPdf(currentEmployeeId);
      const safeName = form.name?.replace(/\s+/g, '_').toLowerCase() || currentEmployeeId;
      downloadHistoryPdfBlob(blob, `historico-mudancas-${safeName}.pdf`);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação de formato de email (se preenchido)
    if (form.email && form.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        setError('Por favor, insira um email válido.');
        return;
      }
    }

    // Validações básicas
    if (!form.name || !form.cpf || !form.phone) {
      setError('Campos obrigatórios: Nome, CPF e Telefone.');
      return;
    }

    if (!form.hireDate) {
      setError(
        isRehireFormMode
          ? 'Informe a nova data de admissão para a recontratação.'
          : 'Data de admissão é obrigatória.',
      );
      return;
    }

    const cpfDigits = form.cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11 || !validateCPF(form.cpf)) {
      setError('Informe um CPF válido.');
      setCpfError('CPF inválido');
      return;
    }

    const duplicatePendingCpf = pendingDependents.some(
      (dep) => dep.cpf.replace(/\D/g, '') === cpfDigits
    );
    if (duplicatePendingCpf) {
      setError('O CPF informado já está cadastrado em um dependente pendente.');
      return;
    }

    const pendingCpfSet = new Set<string>();
    for (let i = 0; i < pendingDependents.length; i++) {
      const depCpf = pendingDependents[i].cpf.replace(/\D/g, '');
      if (pendingCpfSet.has(depCpf)) {
        setError(`Dependentes pendentes ${i + 1} possuem CPF duplicado.`);
        return;
      }
      pendingCpfSet.add(depCpf);
    }

    // Validações de endereço
    if (!form.enderecoRua || !form.enderecoNumero || !form.enderecoBairro || !form.enderecoCidade || !form.enderecoEstado || !form.enderecoCep) {
      setError('Todos os campos de endereço são obrigatórios (Rua, Número, Bairro, Cidade, Estado e CEP).');
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

    if (eligibleRehireEmployee?.id && !rehireAdmissionType) {
      setError('Selecione Readmissão ou Promoção para recontratar o funcionário.');
      return;
    }

    const isRehireFlowCheck = Boolean(eligibleRehireEmployee?.id && rehireAdmissionType);
    if (isRehireFlowCheck) {
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

    const employeeData = { ...form } as Record<string, unknown>;
    const targetEmployeeId = employeeToEdit?.id || currentEmployeeId;
    const isUpdate = Boolean(isEditMode && targetEmployeeId);

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

    if (!isUpdate) {
      delete employeeData.remanejamentoDataInicio;
    } else {
      const baseline = initialWorkPostIdRef.current;
      const targetPost = normalizeWorkPostId(employeeData.workPostId as string);
      if (isWorkPostTransfer(baseline, targetPost)) {
        const remanejamentoDataInicio = String(employeeData.remanejamentoDataInicio || '').trim();
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
      } else {
        delete employeeData.remanejamentoDataInicio;
      }
    }

  try {
      if (isRehireFlow && eligibleRehireEmployee?.id) {
        employeeData.admissionType = rehireAdmissionType;
        employeeData.status = 'ACTIVE';
        delete employeeData.dataRescisao;
        delete employeeData.terminationDate;
        delete employeeData.terminationReason;

        const rehiredEmployee = await employeeService.rehireEmployee(
          eligibleRehireEmployee.id,
          employeeData,
        );
        const savedId = rehiredEmployee?.id || eligibleRehireEmployee.id;
        setCurrentEmployeeId(savedId);
        setIsEditMode(true);
        setEligibleRehireEmployee(null);
        setRehireAdmissionType('');
        setForm((prev) => ({
          ...prev,
          status: 'ACTIVE',
          dataRescisao: undefined,
          terminationReason: undefined,
        }));
        syncInitialWorkPostRef(
          rehiredEmployee?.workPostId || rehiredEmployee?.workPost?.id || (employeeData.workPostId as string),
        );
        setOfflineQueueId(null);
        queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
        queryClient.setQueryData(queryKeys.employees.byId(savedId), rehiredEmployee);
        toast({
          title: 'Sucesso!',
          description: `Funcionário recontratado (${rehireAdmissionType === 'PROMOCAO' ? 'Promoção' : 'Readmissão'}) com sucesso.`,
          variant: 'default',
        });
        onCreated();
      } else if (isUpdate && targetEmployeeId) {
        const updatedEmployee = await employeeService.updateEmployee(targetEmployeeId, employeeData);
        const savedId = updatedEmployee?.id || targetEmployeeId;
        console.log('✅ Funcionário atualizado - ID:', savedId);
        console.log('✅ updatedEmployee:', updatedEmployee);
        setCurrentEmployeeId(savedId);
        syncInitialWorkPostRef(
          updatedEmployee?.workPostId || updatedEmployee?.workPost?.id || (employeeData.workPostId as string),
        );
        setForm(prev => ({ ...prev, remanejamentoDataInicio: undefined } as any));
        setOfflineQueueId(null);
        queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
        if (updatedEmployee?.id) {
          queryClient.setQueryData(queryKeys.employees.byId(savedId), updatedEmployee);
        } else {
          queryClient.removeQueries({ queryKey: queryKeys.employees.byId(savedId) });
        }
        toast({
          title: "Sucesso!",
          description: "Funcionário atualizado com sucesso.",
          variant: "default"
        });
        onCreated();
      } else {
        const createdEmployee = await employeeService.createEmployee(employeeData);
        console.log('✅ Funcionário criado - ID:', createdEmployee.id);
        console.log('✅ createdEmployee:', createdEmployee);
        setCurrentEmployeeId(createdEmployee.id);
        setIsEditMode(true);
        syncInitialWorkPostRef(
          createdEmployee?.workPostId || createdEmployee?.workPost?.id || (employeeData.workPostId as string),
        );
        setOfflineQueueId(null);
        queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
        queryClient.setQueryData(
          queryKeys.employees.byId(createdEmployee.id),
          createdEmployee,
        );
        void clearEmployeeFormDraft(draftStorageKey);

        if (createdEmployee.id) {
          await loadEmployeeDependents(createdEmployee.id);
        }

        // Salvar dependentes pendentes após criar o funcionário
        if (pendingDependents.length > 0 && createdEmployee.id) {
          try {
            for (const dependentData of pendingDependents) {
              await dependentService.createDependent({
                ...dependentData,
                employeeId: createdEmployee.id
              });
            }
            toast({
              title: "Sucesso!",
              description: `Funcionário criado com sucesso. ${pendingDependents.length} dependente(s) adicionado(s).`,
              variant: "default"
            });
            setPendingDependents([]);
          } catch (err: any) {
            console.error('Erro ao salvar dependentes:', err);
            toast({
              title: "Aviso",
              description: "Funcionário criado, mas houve erro ao salvar alguns dependentes. Você pode adicioná-los depois.",
              variant: "default"
            });
          }
        } else {
          toast({
            title: "Sucesso!",
            description: "Funcionário criado com sucesso.",
            variant: "default"
          });
        }

        onCreated();

        // Não limpar o formulário nem fechar o modal após criar
        // Permitir que o usuário gere as fichas imediatamente
      }
    } catch (err: unknown) {
      console.error('Erro ao cadastrar funcionário:', err);

      if (isRetryableConnectionError(err)) {
        const queued = await enqueueEmployeeSync({
          userKey: user?.id || user?.username,
          operation: isUpdate ? 'update' : 'create',
          payload: employeeData,
          pendingDependents: isUpdate ? [] : pendingDependents,
          employeeId: isUpdate ? targetEmployeeId || undefined : undefined,
          queueId: offlineQueueId || undefined,
        });

        setOfflineQueueId(queued.id);
        await persistEmployeeDraft();

        toast({
          title: 'Sem conexão com o servidor',
          description: 'Os dados foram mantidos na tela e salvos neste dispositivo. Enviaremos automaticamente quando a conexão voltar.',
          variant: 'default',
        });
        setError(null);
        return;
      }

      const message = err instanceof Error ? err.message : '';

      if (message.includes('CPF já cadastrado') || message.includes('CPF já cadastrado no sistema')) {
        setError('CPF já cadastrado no sistema');
        setCpfError('CPF já cadastrado');
        toast({
          title: 'CPF já cadastrado',
          description: 'Este CPF já está cadastrado no sistema.',
          variant: 'destructive',
        });
      } else if (message.includes('Data de admissão')) {
        setError('Data de admissão é obrigatória.');
        toast({
          title: 'Campo obrigatório',
          description: 'Informe a data de admissão do funcionário.',
          variant: 'destructive',
        });
      } else if (message.includes('Email já cadastrado')) {
        setError('Email já cadastrado para outro funcionário');
        toast({
          title: 'Email já cadastrado',
          description: 'Este email já está cadastrado para outro funcionário.',
          variant: 'destructive',
        });
      } else {
        setError(message || 'Erro ao cadastrar funcionário.');
        toast({
          title: 'Erro ao cadastrar',
          description: message || 'Não foi possível cadastrar o funcionário.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCargoCreated = (cargo: { id: string; name: string; description: string }) => {
    // Adicionar o novo cargo à lista
    setPositions(prev => [...prev, cargo]);
    // Selecionar automaticamente o novo cargo
    setForm(prev => ({ ...prev, position: { id: cargo.id } }));
  };

  const handleMedicoCreated = (medico: Doctor) => {
    // Adicionar o novo médico à lista
    setDoctors(prev => [...prev, medico]);
    // Selecionar automaticamente o novo médico
    setSelectedDoctor(medico);
    setDoctorSearchTerm(`${medico.name} - CRM ${medico.crmNumber}/${medico.crmState}`);
    setForm(prev => ({
      ...prev,
      exameMedicoDoctor: { id: medico.id }
    }));
    setShowDoctorDropdown(false);
    toast({
      title: "Sucesso!",
      description: "Médico cadastrado e selecionado com sucesso.",
      variant: "default"
    });
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

    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      setSelectedPosition(null);
      setForm(prev => ({ ...prev, position: { id: '' } }));
      return;
    }

    const matched = positions.find(p => (p.name || '').trim().toLowerCase() === normalized);
    if (matched) {
      setSelectedPosition(matched);
      setForm(prev => ({
        ...prev,
        position: { id: matched.id },
        cbo: matched.cbo || prev.cbo || ''
      }));
    }
  };

  const handlePositionSelect = (position: Position) => {
    setSelectedPosition(position);
    setPositionSearchTerm('');
    setForm(prev => ({
      ...prev,
      position: { id: position.id },
      // Preencher CBO automaticamente se o cargo tiver CBO
      cbo: position.cbo || prev.cbo || ''
    }));
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
      setForm(prev => ({ 
        ...prev, 
        company: { id: '' },
        workPostId: '' // Limpar posto ao remover empresa
      }));
    } else {
      const company = companies.find(c => c.id === companyId);
      if (company) {
        setSelectedCompany(company);
        setForm(prev => ({ 
          ...prev, 
          company: { id: company.id },
          workPostId: '' // Limpar posto ao trocar empresa
        }));
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

  const employeeIdValue = currentEmployeeId || employeeToEdit?.id || '';
  const employeeDisplayName = form.name || employeeToEdit?.name || 'Funcionário';
  const canGenerateReports = Boolean(employeeIdValue);
  const existingDependentCpfs = [
    ...employeeDependents.filter((d) => d.id !== dependentToEdit?.id).map((d) => d.cpf),
    ...pendingDependents.map((d) => d.cpf),
    form.cpf,
  ].filter(Boolean) as string[];

  const getRelationshipLabel = (relationship: string) => {
    const option = RELATIONSHIP_OPTIONS.find((opt) => opt.value === relationship);
    return option?.label ?? relationship;
  };

  const handlePendingDependentCreate = (data: DependentCreateRequest) => {
    setPendingDependents((prev) => [...prev, data]);
    setDependentModalOpen(false);
    setDependentToEdit(null);
  };

  const handleRemovePendingDependent = (index: number) => {
    setPendingDependents((prev) => prev.filter((_, i) => i !== index));
  };

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

  const handleEmployeeRecordPdf = async (mode: 'download' | 'preview') => {
    if (!employeeIdValue) {
      toast({
        title: "Atenção",
        description: "É necessário salvar o funcionário primeiro para gerar a ficha.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const blob = await employeeService.generateEmployeeRecordPdf(employeeIdValue);
      if (mode === 'preview') {
        openBlobInNewTab(blob);
      } else {
        downloadBlob(blob, `ficha-registro-funcionario-${employeeIdValue}.pdf`);
      }
      toast({
        title: "Sucesso",
        description: "Ficha de registro gerada com sucesso!",
        variant: "default"
      });
      invalidateDocumentosGerados(employeeIdValue);
    } catch (error: any) {
      console.error('❌ Erro ao gerar ficha:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível gerar a ficha.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeRecordExcel = async () => {
    if (!employeeIdValue) {
      toast({
        title: "Atenção",
        description: "É necessário salvar o funcionário primeiro para gerar a ficha.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const blob = await employeeService.generateEmployeeRecordExcel(employeeIdValue);
      downloadBlob(blob, `ficha-registro-funcionario-${employeeIdValue}.xlsx`);
      toast({
        title: "Sucesso",
        description: "Ficha de registro em Excel gerada com sucesso!",
        variant: "default"
      });
    } catch (error: any) {
      console.error('❌ Erro ao gerar ficha em Excel:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível gerar a ficha em Excel.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEpiPdf = async (mode: 'download' | 'preview') => {
    if (!employeeIdValue) {
      toast({
        title: "Atenção",
        description: "É necessário salvar o funcionário primeiro para gerar a ficha de EPI.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const employee = await employeeService.getEmployeeById(employeeIdValue);
      if (!employee) {
        throw new Error('Funcionário não encontrado');
      }

      if (!employee.company || !employee.company.id) {
        toast({
          title: "Atenção",
          description: "O funcionário precisa ter uma empresa cadastrada para gerar a ficha de EPI.",
          variant: "destructive"
        });
        return;
      }

      const epiFormData = {
        employeeId: employeeIdValue,
        companyId: employee.company.id,
        deliveryDate: new Date().toISOString().split('T')[0],
        items: []
      };

      const blob = await epiDeliveryFormService.generateAndSavePdf(epiFormData);
      if (mode === 'preview') {
        openBlobInNewTab(blob);
      } else {
        downloadBlob(blob, `ficha-entrega-epi-${employeeIdValue}.pdf`);
      }
      toast({
        title: "Sucesso",
        description: "Ficha de entrega de EPI gerada com sucesso!",
        variant: "default"
      });
      invalidateDocumentosGerados(employeeIdValue);
    } catch (error: any) {
      console.error('❌ Erro ao gerar ficha de EPI:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível gerar a ficha de EPI.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEpiManagement = () => {
    if (!employeeIdValue) {
      toast({
        title: "Atenção",
        description: "É necessário salvar o funcionário primeiro para gerenciar os EPIs.",
        variant: "destructive"
      });
      return;
    }

    setEpiModalOpen(true);
  };

  const handleEpiExcel = async () => {
    if (!employeeIdValue) {
      toast({
        title: "Atenção",
        description: "É necessário salvar o funcionário primeiro para gerar a ficha de EPI.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const employee = await employeeService.getEmployeeById(employeeIdValue);
      if (!employee) {
        throw new Error('Funcionário não encontrado');
      }

      if (!employee.company || !employee.company.id) {
        toast({
          title: "Atenção",
          description: "O funcionário precisa ter uma empresa cadastrada para gerar a ficha de EPI.",
          variant: "destructive"
        });
        return;
      }

      const epiFormData = {
        employeeId: employeeIdValue,
        companyId: employee.company.id,
        deliveryDate: new Date().toISOString().split('T')[0],
        items: []
      };

      const blob = await epiDeliveryFormService.generateAndSaveExcel(epiFormData);
      downloadBlob(blob, `ficha-entrega-epi-${employeeIdValue}.xlsx`);
      toast({
        title: "Sucesso",
        description: "Ficha de entrega de EPI em Excel gerada com sucesso!",
        variant: "default"
      });
    } catch (error: any) {
      console.error('❌ Erro ao gerar ficha de EPI em Excel:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível gerar a ficha de EPI em Excel.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountingPdf = async () => {
    if (!employeeIdValue) {
      toast({
        title: "Atenção",
        description: "É necessário salvar o funcionário primeiro para gerar a ficha.",
        variant: "destructive"
      });
      return;
    }

    try {
      await accountingFormService.downloadPdf(employeeIdValue, employeeDisplayName);
      toast({
        title: "✅ Ficha Gerada",
        description: "Ficha de contabilidade gerada e baixada com sucesso.",
      });
      invalidateDocumentosGerados(employeeIdValue);
    } catch (error) {
      console.error('Erro ao gerar ficha de contabilidade:', error);
      toast({
        title: "❌ Erro",
        description: "Erro ao gerar ficha de contabilidade. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleAccountingExcel = async () => {
    if (!employeeIdValue) {
      toast({
        title: "Atenção",
        description: "É necessário salvar o funcionário primeiro para gerar a ficha.",
        variant: "destructive"
      });
      return;
    }

    try {
      await accountingFormService.downloadExcel(employeeIdValue, employeeDisplayName);
      toast({
        title: "✅ Ficha Gerada",
        description: "Ficha de contabilidade em Excel gerada com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao gerar ficha de contabilidade em Excel:', error);
      toast({
        title: "❌ Erro",
        description: "Erro ao gerar ficha de contabilidade em Excel. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleAccountingPreview = async () => {
    if (!employeeIdValue) {
      toast({
        title: "Atenção",
        description: "É necessário salvar o funcionário primeiro para visualizar a ficha.",
        variant: "destructive"
      });
      return;
    }

    try {
      await accountingFormService.generateHtml(employeeIdValue);
    } catch (error) {
      console.error('Erro ao visualizar ficha de contabilidade:', error);
      toast({
        title: "❌ Erro",
        description: "Erro ao visualizar ficha de contabilidade. Tente novamente.",
        variant: "destructive"
      });
    }
  };

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
              <span className="truncate">{isEditMode ? 'Editar Funcionário' : 'Novo Funcionário'}</span>
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

          <EmployeeOfflineSyncBanner
            visible={Boolean((offlineQueueId || pendingCount > 0) && !employeeToEdit)}
            isSyncing={isSyncing}
            onSyncNow={() => void syncPending()}
          />

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <Tabs
                value={activeTab}
                onValueChange={(tab) => {
                  setActiveTab(tab);
                  if (tab === 'documentos') {
                    const id = currentEmployeeId || employeeToEdit?.id;
                    if (id) invalidateDocumentosGerados(id);
                  }
                }}
                className="space-y-4 sm:space-y-6"
              >
                {/* tabsLocked: true when creating a new employee and record not yet saved */}
                {(() => {
                  const tabsLocked = !isEditMode && !currentEmployeeId;
                  return (
                    <>
                      {tabsLocked && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm mb-2">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          <span>Salve o cadastro primeiro para liberar as demais abas.</span>
                        </div>
                      )}
                      <TabsList className={`grid w-full ${showHistoryTab ? 'grid-cols-5' : 'grid-cols-4'} bg-seguranca-graphite border border-gray-600`}>
                        <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
                        <TabsTrigger
                          value="dependentes"
                          disabled={tabsLocked}
                          className="disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Dependentes
                        </TabsTrigger>
                        <TabsTrigger
                          value="documentos"
                          disabled={tabsLocked}
                          className="disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Documentos
                        </TabsTrigger>
                        <TabsTrigger
                          value="relatorios"
                          disabled={tabsLocked}
                          className="disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Relatórios
                        </TabsTrigger>
                        {showHistoryTab && (
                          <TabsTrigger
                            value="historico"
                            disabled={tabsLocked}
                            className="flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <History className="h-4 w-4" />
                            Histórico
                          </TabsTrigger>
                        )}
                      </TabsList>
                    </>
                  );
                })()}
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

                        {/* Nova Divisão para Empresa e Posto de Trabalho */}
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-2">
                          <div>
                            <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                              <span className="truncate">Empresa</span>
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                            </Label>
                            <Select
                              value={selectedCompany?.id || 'none'}
                              onValueChange={handleCompanySelect}
                            >
                              <SelectTrigger className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11">
                                <SelectValue placeholder="Selecione uma empresa" />
                              </SelectTrigger>
                              <SelectContent className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
                                <SelectItem value="none" className="hover:bg-gray-700">
                                  <span className="text-gray-400">Nenhuma empresa</span>
                                </SelectItem>
                                {companies.map((company) => (
                                  <SelectItem
                                    key={company.id}
                                    value={company.id}
                                    className="hover:bg-gray-700"
                                  >
                                    {company.sigla ? `${company.sigla.toUpperCase()} - ${company.name}` : company.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                            className="w-full"
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
                              className="w-full"
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
                              className="w-full"
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
                              className="w-full"
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
                              className="w-full"
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
                              className="w-full"
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
                                className="w-full"
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
                                <SelectItem value="MA">MA</SelectItem>
                                <SelectItem value="MT">MT</SelectItem>
                                <SelectItem value="MS">MS</SelectItem>
                                <SelectItem value="MG">MG</SelectItem>
                                <SelectItem value="PA">PA</SelectItem>
                                <SelectItem value="PB">PB</SelectItem>
                                <SelectItem value="PR">PR</SelectItem>
                                <SelectItem value="PE">PE</SelectItem>
                                <SelectItem value="PI">PI</SelectItem>
                                <SelectItem value="RJ">RJ</SelectItem>
                                <SelectItem value="RN">RN</SelectItem>
                                <SelectItem value="RS">RS</SelectItem>
                                <SelectItem value="RO">RO</SelectItem>
                                <SelectItem value="RR">RR</SelectItem>
                                <SelectItem value="SC">SC</SelectItem>
                                <SelectItem value="SP">SP</SelectItem>
                                <SelectItem value="SE">SE</SelectItem>
                                <SelectItem value="TO">TO</SelectItem>
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
                            className="w-full"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-200">Data de Vencimento</Label>
                          <DatePicker
                            date={parseDateFromBackend(form.exameMedicoVencimento) || undefined}
                            onDateChange={(date) => setForm(prev => ({ ...prev, exameMedicoVencimento: formatDateForBackend(date) || '' }))}
                            className="w-full"
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
                            <SelectContent className="bg-seguranca-graphite border-gray-600">
                              <SelectItem value="ADMISSIONAL" className="text-seguranca-lightgray hover:bg-gray-700">Admissional</SelectItem>
                              <SelectItem value="DEMISSIONAL" className="text-seguranca-lightgray hover:bg-gray-700">Demissional</SelectItem>
                              <SelectItem value="PERIODICO" className="text-seguranca-lightgray hover:bg-gray-700">Periódico</SelectItem>
                              <SelectItem value="MUDANCA_FUNCAO" className="text-seguranca-lightgray hover:bg-gray-700">Mudança de Função</SelectItem>
                              <SelectItem value="RETORNO_TRABALHO" className="text-seguranca-lightgray hover:bg-gray-700">Retorno ao Trabalho</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <Label className="text-sm font-medium text-gray-200">Nome do Médico</Label>
                            <button
                              type="button"
                              onClick={() => { setNovoMedicoModalOpen(true); setShowDoctorDropdown(false); }}
                              className="text-xs text-seguranca-yellow underline hover:no-underline focus:outline-none"
                            >
                              + Cadastrar novo médico
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
                                ) : doctors.length > 0 ? (
                                  doctors.map((doctor) => (
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
                                  ))
                                ) : (
                                  <div className="p-2 space-y-2">
                                    <div className="text-sm text-gray-400 mb-2">Nenhum médico encontrado</div>
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
                                      <span>Cadastrar novo médico</span>
                                    </button>
                                  </div>
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
                        <h3 className="text-lg font-semibold text-white">Para Estrangeiro</h3>
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
                            className="w-full"
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
                                className="w-full"
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
                          showTerminatedEditHint={isEditMode}
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
                            className="w-full"
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
                            className="w-full"
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
                                <Input
                                  type="text"
                                  value={positionSearchTerm}
                                  onChange={handlePositionSearch}
                                  onFocus={handlePositionInputFocus}
                                  onBlur={handlePositionInputBlur}
                                  placeholder="Digite para buscar cargo..."
                                  className="pr-10 bg-seguranca-graphite border-gray-600 text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11"
                                />
                                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />

                                {/* Dropdown de cargos */}
                                {showPositionDropdown && (
                                  <div className="absolute z-50 w-full mt-1 bg-seguranca-graphite border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                                    {filteredPositions.length > 0 ? (
                                      filteredPositions.map((position) => (
                                        <div
                                          key={position.id}
                                          className="px-3 py-2 hover:bg-gray-700 cursor-pointer flex items-center text-seguranca-lightgray"
                                          onClick={() => handlePositionSelect(position)}
                                        >
                                          <Briefcase className="mr-2 text-seguranca-yellow" size={16} />
                                          <div className="flex-1">
                                            <div className="font-medium text-sm sm:text-base text-gray-200">{position.name}</div>
                                            {position.description && (
                                              <div className="text-xs text-gray-400">
                                                {position.description}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="px-3 py-2 text-gray-400 text-sm">
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
                            value={temIntervaloAlmoco}
                            onValueChange={(value) => {
                              setTemIntervaloAlmoco(value as 'sim' | 'nao');
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
                        {temIntervaloAlmoco === 'sim' && (
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
                            options={departments.map((d: Department) => ({
                              value: String(d.id),
                              label: d.name,
                              description: d.description || '',
                            }))}
                            value={form.departmentId || ''}
                            onChange={(value) => setForm(prev => ({ ...prev, departmentId: value || undefined }))}
                            placeholder={departmentsLoading ? 'Carregando departamentos...' : 'Selecione um departamento'}
                            searchPlaceholder="Buscar departamento..."
                            emptyPlaceholder={departmentsLoading ? 'Carregando...' : 'Nenhum departamento cadastrado'}
                            disabled={departmentsLoading}
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-1.5 sm:gap-2 mb-1.5">
                            <span className="truncate">Unidade</span>
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
                          </Label>
                          <Select
                            value={form.unit?.id || ''}
                            onValueChange={(value) => handleSelectChange('unit', value)}
                          >
                            <SelectTrigger className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow text-sm sm:text-base h-10 sm:h-11">
                              <SelectValue placeholder="Selecione uma unidade" />
                            </SelectTrigger>
                            <SelectContent className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
                              {units.map((unit) => (
                                <SelectItem key={unit.id} value={unit.id} className="hover:bg-gray-700">
                                  <div className="flex items-center">
                                    <Building className="mr-2 text-seguranca-yellow" size={16} />
                                    {unit.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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

                      {/* Dependentes salvos ou pendentes (antes de salvar o funcionário) */}
                      {!employeeIdValue && pendingDependents.length === 0 ? (
                        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                          <p className="text-blue-300 text-sm flex items-center">
                            <AlertCircle className="mr-2" size={16} />
                            Você pode adicionar dependentes antes de salvar. Eles serão gravados automaticamente ao salvar o funcionário.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {loadingDependents ? (
                            <div className="text-center py-4">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                              <p className="text-gray-400 text-sm mt-2">Carregando dependentes...</p>
                            </div>
                          ) : employeeDependents.length === 0 && pendingDependents.length === 0 ? (
                            <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 text-center">
                              <UsersIcon className="mx-auto mb-2 text-gray-400" size={32} />
                              <p className="text-gray-400 text-sm">Nenhum dependente cadastrado</p>
                              <p className="text-gray-500 text-xs mt-1">Clique em "Adicionar Dependente" para começar</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {pendingDependents.map((dependent, index) => (
                                <div
                                  key={`pending-${index}`}
                                  className="bg-gray-800/50 border border-amber-600/40 rounded-lg p-4"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <h4 className="font-semibold text-white">{dependent.name}</h4>
                                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                                          Pendente
                                        </Badge>
                                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                                          {getRelationshipLabel(dependent.relationship)}
                                        </Badge>
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
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemovePendingDependent(index)}
                                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                    >
                                      <Trash2 size={16} />
                                    </Button>
                                  </div>
                                </div>
                              ))}
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
                                Total: {employeeDependents.length + pendingDependents.length} dependente(s)
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>

                </TabsContent>
                <TabsContent value="documentos" className="space-y-4 sm:space-y-6">
                   {employeeIdValue ? (
                     <EmployeeDocumentsTab employeeId={employeeIdValue} />
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
                      employeeId={employeeIdValue}
                      companyId={
                        selectedCompany?.id
                        || form.company?.id
                        || employeeToEdit?.company?.id
                        || ''
                      }
                      companies={companies}
                      employeeName={employeeDisplayName}
                      tipoSalarioContratual={form.tipoSalarioContratual}
                      prazoExperienciaTexto={form.prazoExperienciaTexto}
                    />
                  )}

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
                </TabsContent>

                {showHistoryTab && (
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
                            disabled={historyPdfLoading || !currentEmployeeId}
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
                    onClick={onClose}
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
          employeeId={employeeIdValue || undefined}
          employeeName={employeeDisplayName}
          dependent={dependentToEdit || undefined}
          deferSave={!employeeIdValue}
          onPendingCreate={handlePendingDependentCreate}
          existingCpfs={existingDependentCpfs}
          onSuccess={async () => {
            if (employeeIdValue) {
              await loadEmployeeDependents(employeeIdValue, true);
            }
            setDependentModalOpen(false);
            setDependentToEdit(null);
            toast({
              title: "Sucesso!",
              description: dependentToEdit ? "Dependente atualizado com sucesso." : "Dependente adicionado com sucesso.",
              variant: "default"
            });
          }}
        />

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
                  placeholder="Ex: 12x36, 6x1, 10:00 às 22:00"
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
                  } as any));
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
      </Dialog>
    </TooltipProvider >
  );
};

export default FuncionarioNovoModal; 