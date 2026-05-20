import React, { useState, useEffect } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Users,
  Plus,
  Search,
  Filter,
  RefreshCw,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building,
  Loader2,
  AlertCircle,
  FileText,
  Briefcase,
  Award,
  FileWarning,
  Shuffle,
  Settings,
  UserPlus,
  CheckCircle2,
  Clock,
  UserMinus,
  XCircle,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
  Trash2,
  BarChart2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useGSAP } from '@/hooks/use-gsap';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  queryKeys,
  useInvalidateEmployees,
} from '@/hooks/queries';
import { employeeService, EmployeeFilters } from '@/services/employeeService';
import { admissionRequestService, AdmissionEmployeeIntegrationContext } from '@/services/admissionRequestService';
import { companyService } from '@/services/companyService';
import { workPostService, WorkPost } from '@/services/workPostService';
import { positionService, Position } from '@/services/positionService';
import { Employee } from '@/types/employee';
import FuncionarioNovoModal from '@/components/funcionarios/FuncionarioNovoModal';
import { EmployeeDocuments } from '@/components/funcionarios/EmployeeDocuments';
import { format, parseISO } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { useLocation, useNavigate } from 'react-router-dom';
import EmployeeTrainingTab from '@/components/funcionarios/EmployeeTrainingTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmployeeDocumentsPanel from '@/components/funcionarios/EmployeeDocumentsPanel';
import { RelatoriosModal } from '@/components/funcionarios/RelatoriosModal';
import DocumentosGerarTab from '@/components/funcionarios/DocumentosGerarTab';
import DependenteModal from '@/components/dependentes/DependenteModal';
import { FuncionariosTable } from '@/components/funcionarios/FuncionariosTable';
import ExcelImportModal from '@/components/funcionarios/ExcelImportModal';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { EmployeeViewDetailsModal } from '@/components/funcionarios/EmployeeViewDetailsModal';
import { SearchableSelect } from '@/components/ui/searchable-select';
import FuncionarioEditModal from '@/components/funcionarios/FuncionarioEditModal';
import { EmployeeQrCodeBadgeModal } from '@/components/funcionarios/EmployeeQrCodeBadgeModal';

const Funcionarios: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE' | 'VACATION' | 'MATERNITY_LEAVE' | 'MEDICAL_CERTIFICATE' | 'TERMINATED' | 'SUSPENDED'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [qrCodeModalOpen, setQrCodeModalOpen] = useState(false);
  const [employeeForQrCode, setEmployeeForQrCode] = useState<Employee | null>(null);
  useGSAP();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const invalidateEmployees = useInvalidateEmployees();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const shouldOpenModal = params.get('novo') === '1';
  const shouldOpenExcelImport = params.get('importar') === 'excel';
  const tabFromUrl = params.get('tab') || 'lista';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [modalOpen, setModalOpen] = useState(shouldOpenModal);
  const [excelImportModalOpen, setExcelImportModalOpen] = useState(shouldOpenExcelImport);
  const [dependentSearchTerm, setDependentSearchTerm] = useState('');
  const [promoverImportModalOpen, setPromoverImportModalOpen] = useState(false);
  const [promoverImportLoading, setPromoverImportLoading] = useState(false);
  const [promoverImportResult, setPromoverImportResult] = useState<any>(null);
  const [promoverCnpj, setPromoverCnpj] = useState<string>('43576260000112'); // Padrão
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkBarPos, setBulkBarPos] = useState<{ x: number; y: number } | null>(null);
  const [bulkBarDragging, setBulkBarDragging] = useState(false);
  const [bulkBarDragOffset, setBulkBarDragOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [companies, setCompanies] = useState<any[]>([]);
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [workPostFilter, setWorkPostFilter] = useState<string>('all');
  const [hireDateFrom, setHireDateFrom] = useState<string>('');
  const [hireDateTo, setHireDateTo] = useState<string>('');
  const [terminationDateFrom, setTerminationDateFrom] = useState<string>('');
  const [terminationDateTo, setTerminationDateTo] = useState<string>('');
  // Listas da API para opções dos filtros (empresas, postos, departamentos, cargos)
  const [filterCompanies, setFilterCompanies] = useState<Array<{ id: string; name?: string; sigla?: string }>>([]);
  const [filterWorkPosts, setFilterWorkPosts] = useState<WorkPost[]>([]);
  const [filterPositions, setFilterPositions] = useState<Position[]>([]);
  const [statsFromApi, setStatsFromApi] = useState<{
    total: number;
    active: number;
    vacation: number;
    medicalCertificate: number;
    terminated: number;
    suspended: number;
  } | null>(null);
  const [isMobileSelectionMode, setIsMobileSelectionMode] = useState(false);
  const [admissionIntegration, setAdmissionIntegration] = useState<AdmissionEmployeeIntegrationContext | null>(null);

  type SortKey = 'name' | 'position' | 'company' | 'workPost' | 'hireDate' | 'terminationDate' | 'status' | 'escalaTrabalho' | 'horarioTrabalho';
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const buildApiFilters = React.useCallback((): EmployeeFilters => {
    const base: EmployeeFilters = {
      searchTerm: searchTerm.trim() || undefined,
      companyId: companyFilter && companyFilter !== 'all' ? companyFilter : undefined,
      status: statusFilter && statusFilter !== 'all' ? statusFilter : undefined,
    };
    if (sortKey === 'hireDate' || sortKey === 'terminationDate') {
      base.sortBy = sortKey;
      base.sortDir = sortDir;
    }
    return base;
  }, [searchTerm, companyFilter, statusFilter, sortKey, sortDir]);

  const loadAdmissionIntegration = async () => {
    try {
      const ctx = await admissionRequestService.getIntegrationContextForEmployees();
      setAdmissionIntegration(ctx);
    } catch {
      setAdmissionIntegration(null);
    }
  };

  useEffect(() => {
    loadAdmissionIntegration();
  }, []);

  // Barra de ações em massa: posição inicial no centro + drag (mouse/touch)
  useEffect(() => {
    if (bulkBarPos != null) return;
    setBulkBarPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!bulkBarDragging) return;

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const margin = 12;

    const onMove = (e: PointerEvent) => {
      if (!bulkBarDragging) return;
      const x = e.clientX - bulkBarDragOffset.dx;
      const y = e.clientY - bulkBarDragOffset.dy;
      setBulkBarPos({
        x: clamp(x, margin, window.innerWidth - margin),
        y: clamp(y, margin, window.innerHeight - margin),
      });
    };

    const onUp = () => {
      setBulkBarDragging(false);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [bulkBarDragging, bulkBarDragOffset.dx, bulkBarDragOffset.dy]);
  const [confirmConfig, setConfirmConfig] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: 'destructive' | 'default';
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => { },
    variant: 'default'
  });
  const [relatoriosModalOpen, setRelatoriosModalOpen] = useState(false);

  // Carregar empresas para filtros e para o modal de importação Promover
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const list = await companyService.getAllCompanies();
        setCompanies(list);

        // Se o CNPJ atual não estiver na lista, usar o primeiro como padrão
        if (list.length > 0) {
          const hasCurrent = list.some(c => (c.cnpj || '').replace(/[^0-9]/g, '') === promoverCnpj);
          if (!hasCurrent) {
            const first = list[0];
            if (first?.cnpj) {
              setPromoverCnpj(String(first.cnpj).replace(/[^0-9]/g, ''));
            }
          }
        }
      } catch (error) {
        console.error('Erro ao carregar empresas para importação Promover:', error);
      }
    };

    loadCompanies();
  }, []); // carregar apenas uma vez

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [employeeForDetails, setEmployeeForDetails] = useState<Employee | null>(null);

  // Atualizar aba quando mudar na URL
  useEffect(() => {
    const tab = params.get('tab') || 'lista';
    setActiveTab(tab);
  }, [location.search]);

  // Carregar funcionários (filtros da API: busca, empresa, status e ordenação por admissão/demissão)
  // Roteado pelo TanStack Query: lista e contagem ficam em cache compartilhado com outras telas (modal de edição).
  const loadEmployees = async (filters?: EmployeeFilters, page = 0) => {
    try {
      setLoading(true);
      setError(null);

      // Buscar lista e contagem total — via queryClient.fetchQuery para reaproveitar o cache.
      const [data, count] = await Promise.all([
        queryClient.fetchQuery({
          queryKey: queryKeys.employees.list(filters, page, pageSize),
          queryFn: () => employeeService.getAllEmployees(filters, page, pageSize),
        }),
        queryClient.fetchQuery({
          queryKey: queryKeys.employees.count(),
          queryFn: () => employeeService.getEmployeesCount(),
          staleTime: 2 * 60 * 1000,
        }),
      ]);

      // Pré-popular cache `byId` para evitar refetch no modal de edição
      data.forEach((emp) => {
        if (emp?.id) {
          queryClient.setQueryData(queryKeys.employees.byId(emp.id), emp);
        }
      });

      console.log('🔍 [Funcionarios] Funcionários recebidos:', data.length, '| Página:', page, '| Total no sistema:', count);
      setEmployees(data);
      if (count !== null) setTotalCount(count);
    } catch (err) {
      console.error('Erro ao carregar funcionários:', err);
      setError('Erro ao carregar funcionários. Tente novamente.');
      toast({
        title: "Erro",
        description: "Não foi possível carregar os funcionários.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setSelectedIds([]); // Limpar seleção após carregar
    }
  };

  // Efeito para carregar ao mudar de página
  useEffect(() => {
    void loadEmployeesWithFilters();
  }, [currentPage]);

  const prevSortKeyRef = React.useRef<SortKey>('name');

  // Ao ordenar por Admissão ou Demissão, voltar à página 0 e buscar já ordenado no servidor (alinha com o resumo global)
  useEffect(() => {
    if (sortKey !== 'hireDate' && sortKey !== 'terminationDate') return;
    setCurrentPage(0);
    void loadEmployees(buildApiFilters(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarrega só ao mudar coluna/direção de ordenação por data
  }, [sortKey, sortDir]);

  // Ao sair da ordenação por data, recarregar por nome no servidor (a ordenação local só veria a página atual)
  useEffect(() => {
    const prev = prevSortKeyRef.current;
    prevSortKeyRef.current = sortKey;
    const wasDate = prev === 'hireDate' || prev === 'terminationDate';
    const isDate = sortKey === 'hireDate' || sortKey === 'terminationDate';
    if (wasDate && !isDate) {
      setCurrentPage(0);
      void loadEmployees(buildApiFilters(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortKey]);

  // Carregar funcionários com filtros atuais (searchTerm, companyId e status vão para a API; demais filtros no frontend)
  const loadEmployeesWithFilters = async () => {
    await loadEmployees(buildApiFilters(), currentPage);
  };

  // Carregar funcionários ao mudar filtros (searchTerm, companyId e status vão para a API; resto filtra no frontend)
  useEffect(() => {
    const term = searchTerm.trim();
    
    // Só dispara a busca se o termo for vazio (limpar) ou tiver pelo menos 3 caracteres
    if (term.length > 0 && term.length < 3) {
      return;
    }

    setCurrentPage(0);
    const debounceMs = term ? 500 : 0;
    const timeoutId = setTimeout(() => loadEmployees(buildApiFilters(), 0), debounceMs);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, companyFilter, positionFilter, workPostFilter, hireDateFrom, hireDateTo, terminationDateFrom, terminationDateTo, buildApiFilters]);

  // Carregar opções dos filtros (empresas, cargos) da API (uma vez)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [companiesRes, positionsRes] = await Promise.all([
          companyService.getAllCompanies(),
          positionService.getPositions().catch(() => []),
        ]);
        if (cancelled) return;
        setFilterCompanies(Array.isArray(companiesRes) ? companiesRes : []);
        setFilterPositions(Array.isArray(positionsRes) ? positionsRes : []);
      } catch (e) {
        if (!cancelled) console.warn('Erro ao carregar opções dos filtros:', e);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Carregar postos de trabalho conforme empresa selecionada (ao escolher empresa, carregar apenas postos daquela empresa)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (companyFilter && companyFilter !== 'all') {
          const posts = await workPostService.getWorkPostsByCompany(companyFilter);
          if (!cancelled) {
            setFilterWorkPosts(Array.isArray(posts) ? posts : []);
            setWorkPostFilter('all'); // Resetar filtro de posto ao trocar empresa
          }
        } else {
          const posts = await workPostService.getAllWorkPosts();
          if (!cancelled) {
            setFilterWorkPosts(Array.isArray(posts) ? posts : []);
            setWorkPostFilter('all');
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('Erro ao carregar postos:', e);
          setFilterWorkPosts([]);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [companyFilter]);

  // Carregar estatísticas por empresa (cards exibem totais da empresa selecionada)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const companyId = companyFilter && companyFilter !== 'all' ? companyFilter : undefined;
        const stats = await employeeService.getEmployeesStats(companyId);
        if (!cancelled) setStatsFromApi(stats);
      } catch (e) {
        if (!cancelled) {
          console.warn('Erro ao carregar estatísticas:', e);
          setStatsFromApi(null);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [companyFilter]);

  useEffect(() => {
    if (shouldOpenModal) setModalOpen(true);
  }, [shouldOpenModal]);

  useEffect(() => {
    if (shouldOpenExcelImport) setExcelImportModalOpen(true);
  }, [shouldOpenExcelImport]);

  const handleOpenModal = () => {
    // Fechar modal de edição se estiver aberto
    if (editModalOpen) {
      setEditModalOpen(false);
      setEmployeeToEdit(null);
    }
    setModalOpen(true);
    navigate('/rh/funcionarios?novo=1', { replace: true });
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    if (shouldOpenModal) navigate('/rh/funcionarios', { replace: true });
  };

  // Abrir modal do crachá / QR Code
  const handleViewQrCode = (employee: Employee) => {
    setEmployeeForQrCode(employee);
    setQrCodeModalOpen(true);
  };

  // Abrir modal de edição
  const handleEditEmployee = async (employee: Employee) => {
    console.log('🔍 handleEditEmployee chamado com:', employee);
    console.log('🔍 Estado atual editModalOpen:', editModalOpen);
    console.log('🔍 Estado atual employeeToEdit:', employeeToEdit);
    console.log('🔍 Estado atual modalOpen:', modalOpen);

    try {
      // Fechar modal de criação se estiver aberto (primeiro, antes de tudo)
      if (modalOpen) {
        setModalOpen(false);
        // Limpar parâmetro da URL se existir
        if (shouldOpenModal) {
          navigate('/rh/funcionarios', { replace: true });
        }
      }

      // Garantir que editModalOpen está false antes de buscar dados
      setEditModalOpen(false);
      setEmployeeToEdit(null);

      // Buscar dados completos do funcionário do backend (via cache do React Query).
      // Se a lista já foi carregada recentemente, o cache `byId` foi pré-populado
      // em loadEmployees, evitando uma segunda chamada de rede aqui.
      console.log('🔍 Buscando dados completos do funcionário:', employee.id);
      const fullEmployeeData = await queryClient.fetchQuery({
        queryKey: queryKeys.employees.byId(employee.id),
        queryFn: () => employeeService.getEmployeeById(employee.id),
        staleTime: 30 * 1000,
      });
      console.log('🔍 Dados completos recebidos:', fullEmployeeData);

      // Verificar se os dados foram recebidos corretamente
      if (!fullEmployeeData || !fullEmployeeData.id) {
        throw new Error('Dados do funcionário não foram retornados corretamente');
      }

      // Garantir workPost: se a API não retornou mas a lista tem (paged inclui work_post)
      const fullData = fullEmployeeData as any;
      const listWp = (employee as any).workPost;
      if (listWp && !fullData.workPost) {
        fullData.workPost = listWp;
      }
      const wpId = listWp?.id ?? (employee as any).workPostId;
      if (wpId && !fullData.workPostId) {
        fullData.workPostId = String(wpId);
      }

      // Definir dados primeiro, depois abrir modal
      // IMPORTANTE: Garantir que modalOpen está false antes de abrir editModalOpen
      setModalOpen(false);
      setEmployeeToEdit(fullData);
      setEditModalOpen(true);

      console.log('🔍 Estado após setEditModalOpen:', true);

      console.log('🔍 Estado após setEmployeeToEdit:', fullEmployeeData);
    } catch (error) {
      console.error('❌ Erro ao buscar dados do funcionário:', error);
      toast({
        title: 'Erro ao carregar dados do funcionário',
        description: 'Não foi possível carregar os dados completos do funcionário. Tente novamente.',
        variant: 'destructive',
      });
      // Garantir que os estados estão limpos em caso de erro
      setEditModalOpen(false);
      setEmployeeToEdit(null);
      setModalOpen(false);
    }
  };

  // Fechar modal de edição
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEmployeeToEdit(null);
  };

  // Funcionário editado com sucesso — invalida o cache de funcionários (lista + detalhes)
  // e recarrega a lista com os filtros atuais.
  const handleEmployeeEdited = () => {
    invalidateEmployees();
    loadEmployeesWithFilters();
  };

  // Normalizar valor de filtro (vazio ou 'all' = todos)
  const isAll = (v: string) => !v || v === 'all';
  const norm = (s: string | undefined) => (s || '').trim().toLowerCase();
  const same = (a: string | undefined, b: string | undefined) => norm(a) === norm(b);

  // Filtrar funcionários por todos os critérios (filtro local)
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const searchDigits = searchTerm.replace(/\D/g, '');
  const filteredEmployees = employees.filter(employee => {
    const matchesStatus = isAll(statusFilter) || (employee.status || '').toUpperCase() === (statusFilter || '').toUpperCase();

    const matchesCompany = isAll(companyFilter) ||
      String((employee.company as any)?.id) === String(companyFilter);

    const matchesPosition = isAll(positionFilter) ||
      same((employee.position as any)?.name, positionFilter) ||
      String((employee.position as any)?.id) === String(positionFilter);

    const matchesWorkPost = isAll(workPostFilter) ||
      same((employee.workPost as any)?.name, workPostFilter) ||
      String((employee.workPost as any)?.id) === String(workPostFilter);

    const hireStr = employee.hireDate;
    const hireDate = hireStr ? new Date(`${String(hireStr).split('T')[0]}T12:00:00`) : null;
    const matchesHireDateFrom = !hireDateFrom || (hireDate && hireDate >= new Date(hireDateFrom + 'T12:00:00'));
    const matchesHireDateTo = !hireDateTo || (hireDate && hireDate <= new Date(hireDateTo + 'T23:59:59'));

    const termStr = employee.dataRescisao || employee.terminationDate;
    const termDate = termStr ? new Date(`${String(termStr).split('T')[0]}T12:00:00`) : null;
    const matchesTerminationDateFrom = !terminationDateFrom || (termDate && termDate >= new Date(terminationDateFrom));
    const matchesTerminationDateTo = !terminationDateTo || (termDate && termDate <= new Date(terminationDateTo + 'T23:59:59'));

    const matchesSearch = !normalizedSearch || (() => {
      const nameMatch = (employee.name || '').toLowerCase().includes(normalizedSearch);
      const emailMatch = (employee.email || '').toLowerCase().includes(normalizedSearch);
      const registrationMatch = (employee.registration || '').toLowerCase().includes(normalizedSearch);
      const cpfMatch = searchDigits ? (employee.cpf || '').replace(/\D/g, '').includes(searchDigits) : false;
      const positionMatch = (employee.position?.name || '').toLowerCase().includes(normalizedSearch);
      const workPostMatch = ((employee.workPost as any)?.name || '').toLowerCase().includes(normalizedSearch);

      return nameMatch || emailMatch || registrationMatch || cpfMatch || positionMatch || workPostMatch;
    })();

    return matchesStatus && matchesSearch && matchesCompany && matchesPosition && matchesWorkPost
      && matchesHireDateFrom && matchesHireDateTo && matchesTerminationDateFrom && matchesTerminationDateTo;
  });

  const toggleSort = (key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      // Admissão e Demissão: primeiro clique = mais recente primeiro (desc)
      const newestFirstKeys: SortKey[] = ['hireDate', 'terminationDate'];
      setSortDir(newestFirstKeys.includes(key) ? 'desc' : 'asc');
      return key;
    });
  };

  const sortedEmployees = React.useMemo(() => {
    // Admissão/Demissão: ordem já vem do servidor na página atual; o filtro local preserva essa ordem
    if (sortKey === 'hireDate' || sortKey === 'terminationDate') {
      return filteredEmployees;
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    const getString = (e: Employee, k: SortKey) => {
      switch (k) {
        case 'name': return e.name || '';
        case 'position': return e.position?.name || '';
        case 'company': return (e.company as any)?.sigla || (e.company as any)?.name || '';
        case 'workPost': return (e.workPost as any)?.name || '';
        case 'status': return e.status || '';
        case 'escalaTrabalho': return e.escalaTrabalho || '';
        case 'horarioTrabalho': return e.horarioTrabalho || '';
        default: return '';
      }
    };

    return [...filteredEmployees].sort((a, b) =>
      getString(a, sortKey).localeCompare(getString(b, sortKey), 'pt-BR', { sensitivity: 'base' }) * dir
    );
  }, [filteredEmployees, sortKey, sortDir]);

  // Limpar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCompanyFilter('all');
    setPositionFilter('all');
    setWorkPostFilter('all');
    setHireDateFrom('');
    setHireDateTo('');
    setTerminationDateFrom('');
    setTerminationDateTo('');
    setSortKey('name');
    setSortDir('asc');
    setCurrentPage(0);
    void loadEmployees({}, 0);
  };

  // Atualizar status do funcionário
  const updateEmployeeStatus = async (employeeId: string, newStatus: string) => {
    try {
      await employeeService.updateEmployeeStatus(employeeId, newStatus);
      toast({
        title: "Sucesso",
        description: "Status do funcionário atualizado com sucesso.",
      });
      loadEmployeesWithFilters(); // Recarregar lista
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do funcionário.",
        variant: "destructive"
      });
    }
  };

  // Excluir funcionário
  const deleteEmployee = async (employee: Employee) => {
    const employeeId = employee.id;

    // 1. Verificar status (apenas demitidos podem ser excluídos)
    if (employee.status !== 'TERMINATED') {
      toast({
        title: "❌ Não é possível excluir",
        description: `Apenas funcionários com status "Demitido" podem ser excluídos. 
        
Status atual: ${getStatusText(employee.status)}

Para excluir este funcionário:
1. Clique no botão "Demitir" 
2. Confirme a alteração de status
3. Depois clique em "Excluir"`,
        variant: "destructive"
      });
      return;
    }

    // 2. Verificar dependências (dependentes, documentos)
    toast({
      title: "🔍 Verificando dependências...",
      description: "Aguarde enquanto conferimos se há dados vinculados a este funcionário.",
    });

    try {
      const deps = await employeeService.checkDeletionDependencies(employeeId);

      if (deps.hasDependencies) {
        toast({
          title: "⚠️ Ação Necessária",
          description: (
            <div className="mt-2 space-y-2">
              <p>Este funcionário não pode ser excluído ainda pois possui vínculos ativos:</p>
              <ul className="list-disc pl-4 text-sm">
                {deps.messages.map((msg, i) => <li key={i}>{msg}</li>)}
              </ul>
              <p className="font-semibold text-xs mt-2">Por favor, remova os dependentes e documentos antes de excluir o cadastro do funcionário.</p>
            </div>
          ),
          variant: "destructive",
          duration: 6000
        });
        return;
      }

      // 3. Se não houver dependências, prosseguir para confirmação
      setConfirmConfig({
        open: true,
        title: '🗑️ Confirmar Exclusão Permanente',
        description: `Tem certeza que deseja excluir o funcionário "${employee.name}"? Esta ação é irreversível e removerá permanentemente todos os dados (Status: ${getStatusText(employee.status)}, CPF: ${employee.cpf}) do sistema.`,
        variant: 'destructive',
        onConfirm: async () => {
          try {
            await employeeService.deleteEmployee(employeeId);
            toast({
              title: "✅ Sucesso",
              description: `Funcionário "${employee.name}" foi excluído permanentemente do sistema.`,
            });
            loadEmployeesWithFilters(); // Recarregar lista
          } catch (err: any) {
            console.error('Erro ao excluir funcionário:', err);
            toast({
              title: "❌ Erro ao excluir",
              description: err.message || "Não foi possível realizar a exclusão. Tente novamente mais tarde.",
              variant: "destructive"
            });
          }
        }
      });
    } catch (err) {
      console.error('Erro ao verificar dependências:', err);
      toast({
        title: "❌ Erro de Verificação",
        description: "Houve um problema ao verificar as dependências do funcionário. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Alterar status do funcionário para TERMINATED
  const handleTerminateEmployee = async (employee: Employee) => {
    setConfirmConfig({
      open: true,
      title: 'Confirmar Demissão',
      description: `Tem certeza que deseja alterar o status do funcionário "${employee.name}" para "Demitido"? Esta ação desativará o acesso do usuário.`,
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await employeeService.updateEmployeeStatus(employee.id, 'TERMINATED');
          toast({
            title: "Sucesso",
            description: "Status do funcionário alterado para Demitido.",
          });
          loadEmployeesWithFilters();
        } catch (err) {
          console.error('Erro ao alterar status:', err);
          toast({
            title: "Erro",
            description: "Não foi possível alterar o status do funcionário.",
            variant: "destructive"
          });
        }
      }
    });
  };

  // Seleção individual
  const handleSelectEmployee = (id: string, selected: boolean) => {
    setSelectedIds(prev =>
      selected ? [...prev, id] : prev.filter(i => i !== id)
    );
  };

  // Selecionar todos os carregados
  const handleSelectAllEmployees = (checked: boolean) => {
    setSelectedIds(checked ? employees.map(e => e.id) : []);
  };

  // Demissão em massa
  const handleBulkTerminate = async () => {
    if (selectedIds.length === 0) return;

    setConfirmConfig({
      open: true,
      title: 'Confirmar Demissão em Massa',
      description: `Tem certeza que deseja demitir os ${selectedIds.length} funcionários selecionados? Esta ação é irreversível e desativará o acesso de todos.`,
      variant: 'destructive',
      onConfirm: async () => {
        try {
          setBulkActionLoading(true);
          const terminationDate = new Date().toISOString().split('T')[0];
          await employeeService.bulkTerminate(selectedIds, terminationDate);

          toast({
            title: "🚀 Sucesso",
            description: `${selectedIds.length} funcionários demitidos com sucesso.`,
          });

          setSelectedIds([]);
          loadEmployeesWithFilters();
        } catch (err: any) {
          console.error('Erro ao demitir em massa:', err);
          toast({
            title: "❌ Erro",
            description: err.message || "Não foi possível demitir os funcionários.",
            variant: "destructive"
          });
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
  };

  // Exclusão em massa
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    // 1. Validar se todos os selecionados estão demitidos
    const nonTerminated = employees.filter(e => selectedIds.includes(e.id) && e.status !== 'TERMINATED');

    if (nonTerminated.length > 0) {
      toast({
        title: "❌ Não é possível excluir em lote",
        description: `Existem ${nonTerminated.length} funcionários selecionados que não estão demitidos. Apenas funcionários demitidos podem ser excluídos permanentemente.`,
        variant: "destructive"
      });
      return;
    }

    // 2. Verificar pendências (dependentes/documentos/documentos gerados)
    toast({
      title: "🔍 Verificando pendências...",
      description: "Vamos conferir se existem dados vinculados aos funcionários selecionados.",
    });

    const depsByEmployee = await Promise.all(selectedIds.map(async (id) => {
      const deps = await employeeService.checkDeletionDependencies(id);
      return { id, deps };
    }));

    const withDeps = depsByEmployee.filter(x => x.deps.hasDependencies);
    const totalDependents = withDeps.reduce((acc, x) => acc + x.deps.dependentsCount, 0);
    const totalDocuments = withDeps.reduce((acc, x) => acc + x.deps.documentsCount, 0);
    const totalGenerated = withDeps.reduce((acc, x) => acc + x.deps.generatedDocsCount, 0);

    setConfirmConfig({
      open: true,
      title: '🗑️ Confirmar Exclusão em Massa',
      description: withDeps.length > 0
        ? `Existem pendências vinculadas aos funcionários selecionados.\n\nPendências encontradas:\n- Dependentes: ${totalDependents}\n- Documentos anexados: ${totalDocuments}\n- Documentos gerados: ${totalGenerated}\n\nAo confirmar, o sistema irá excluir TODAS as pendências e em seguida excluir definitivamente os ${selectedIds.length} funcionários.\n\n⚠️ Exclusão definitiva: todos serão removidos, perderá o histórico do funcionário e NÃO será possível restaurar.`
        : `Tem certeza que deseja excluir permanentemente os ${selectedIds.length} funcionários selecionados? Esta ação é irreversível e removerá todos os dados do sistema.\n\n⚠️ Exclusão definitiva: perderá o histórico do funcionário e NÃO será possível restaurar.`,
      variant: 'destructive',
      onConfirm: async () => {
        try {
          setBulkActionLoading(true);
          if (withDeps.length > 0) {
            // Excluir pendências de todos os selecionados antes do bulk-delete
            for (const { id } of withDeps) {
              await employeeService.deleteDeletionDependencies(id);
            }
          }
          await employeeService.bulkDeleteEmployees(selectedIds);

          toast({
            title: "✅ Sucesso",
            description: `${selectedIds.length} funcionários excluídos permanentemente.`,
          });

          setSelectedIds([]);
          loadEmployeesWithFilters();
        } catch (err: any) {
          console.error('Erro ao excluir em massa:', err);
          toast({
            title: "❌ Erro ao excluir",
            description: err.message || "Não foi possível excluir os funcionários. Pode haver pendências adicionais vinculadas (ex.: folha, ponto, histórico, etc.).",
            variant: "destructive"
          });
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'INACTIVE': return 'bg-red-100 text-red-800';
      case 'VACATION': return 'bg-yellow-100 text-yellow-800';
      case 'MATERNITY_LEAVE': return 'bg-pink-100 text-pink-800';
      case 'MEDICAL_CERTIFICATE': return 'bg-blue-100 text-blue-800';
      case 'TERMINATED': return 'bg-gray-100 text-gray-800';
      case 'SUSPENDED': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Ativo';
      case 'INACTIVE': return 'Inativo';
      case 'VACATION': return 'Férias';
      case 'MATERNITY_LEAVE': return 'Licença Maternidade';
      case 'MEDICAL_CERTIFICATE': return 'Atestado';
      case 'TERMINATED': return 'Demitido';
      case 'SUSPENDED': return 'Suspenso';
      default: return 'Desconhecido';
    }
  };

  const handleViewDocuments = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDocumentsModalOpen(true);
  };

  const handleCloseDocumentsModal = () => {
    setDocumentsModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleViewDetails = (employee: Employee) => {
    setEmployeeForDetails(employee);
    setDetailsModalOpen(true);
  };

  const handleEditFromDetails = async (employee: Employee) => {
    setDetailsModalOpen(false);
    try {
      const full = await employeeService.getEmployeeById(employee.id);
      if (!full?.id) {
        toast({
          title: 'Erro ao carregar dados do funcionário',
          description: 'Não foi possível carregar os dados completos. Tente novamente.',
          variant: 'destructive',
        });
        return;
      }
      setModalOpen(false);
      setEmployeeToEdit(full);
      setEditModalOpen(true);
    } catch (e) {
      console.error('Erro ao abrir edição a partir dos detalhes:', e);
      toast({
        title: 'Erro ao carregar dados do funcionário',
        description: 'Não foi possível carregar os dados completos. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  // Loading state
  if (loading && employees.length === 0) {
    return (
      <StandardLayout title="Funcionários" subtitle="Carregando...">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-seguranca-red mb-4" />
            <p className="text-seguranca-lightgray">Carregando funcionários...</p>
          </div>
        </div>
      </StandardLayout>
    );
  }

  // Error state
  if (error && employees.length === 0) {
    return (
      <StandardLayout title="Funcionários" subtitle="Erro ao carregar">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-4" />
            <p className="text-seguranca-lightgray mb-4">{error}</p>
            <Button
              onClick={() => loadEmployees()}
              className="bg-seguranca-red hover:bg-seguranca-darkred"
            >
              Tentar Novamente
            </Button>
          </div>
        </div>
      </StandardLayout>
    );
  }

  // Estatísticas: usar API (totais por empresa) quando disponível; senão, calcular dos dados carregados
  const stats = statsFromApi ? {
    total: statsFromApi.total,
    active: statsFromApi.active,
    vacation: statsFromApi.vacation,
    medicalCertificate: statsFromApi.medicalCertificate,
    terminated: statsFromApi.terminated,
    suspended: statsFromApi.suspended,
  } : {
    total: (totalCount != null && !searchTerm?.trim()) ? totalCount : employees.length,
    active: employees.filter(e => e.status === 'ACTIVE').length,
    vacation: employees.filter(e => e.status === 'VACATION').length,
    medicalCertificate: employees.filter(e => e.status === 'MEDICAL_CERTIFICATE').length,
    terminated: employees.filter(e => e.status === 'TERMINATED').length,
    suspended: employees.filter(e => e.status === 'SUSPENDED').length,
  };

  const subtitleLoaded = employees.length;
  // Total para exibição: quando há filtro de status, usar a estatística correspondente
  const displayTotal = statsFromApi && statusFilter && statusFilter !== 'all'
    ? (statusFilter === 'ACTIVE' ? statsFromApi.active
      : statusFilter === 'TERMINATED' ? statsFromApi.terminated
      : statusFilter === 'SUSPENDED' ? statsFromApi.suspended
      : statusFilter === 'VACATION' ? statsFromApi.vacation
      : statusFilter === 'MEDICAL_CERTIFICATE' || statusFilter === 'MATERNITY_LEAVE' ? statsFromApi.medicalCertificate
      : statsFromApi.total)
    : (statsFromApi?.total ?? totalCount ?? subtitleLoaded);
  const subtitleTotal = displayTotal;
  const subtitleText = subtitleTotal > subtitleLoaded
    ? `${subtitleTotal} funcionários no sistema (${subtitleLoaded} carregados)`
    : `${subtitleLoaded} funcionário${subtitleLoaded !== 1 ? 's' : ''} no sistema`;

  return (
    <StandardLayout
      title="Gestão de Funcionários"
      subtitle={subtitleText}
    >
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value);
        navigate(`/rh/funcionarios?tab=${value}`, { replace: true });
      }} className="w-full">
        <TabsList className="mb-4 bg-seguranca-black/50 border border-gray-600/30 p-1 flex-wrap h-auto justify-start">
          <TabsTrigger value="lista" className="data-[state='active']:bg-seguranca-red data-[state='active']:text-white flex-grow sm:flex-grow-0">
            <Users className="h-4 w-4 mr-2" />
            Lista de Funcionários
          </TabsTrigger>
          <TabsTrigger value="documentos" className="data-[state='active']:bg-seguranca-red data-[state='active']:text-white">
            <FileText className="h-4 w-4 mr-2" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="dependentes" className="data-[state='active']:bg-seguranca-red data-[state='active']:text-white">
            <UserPlus className="h-4 w-4 mr-2" />
            Dependentes
          </TabsTrigger>
          <TabsTrigger value="treinamento" className="data-[state='active']:bg-seguranca-red data-[state='active']:text-white">
            <Award className="h-4 w-4 mr-2" />
            Treinamento
          </TabsTrigger>
          <TabsTrigger value="gerar" className="data-[state='active']:bg-seguranca-red data-[state='active']:text-white">
            <FileText className="h-4 w-4 mr-2" />
            Gerar Documentos
          </TabsTrigger>
        </TabsList>
        <TabsContent value="dependentes">
          <Card className="bg-seguranca-graphite border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="text-seguranca-yellow" size={24} />
                Gerenciamento de Dependentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedEmployee ? (
                <div>
                  <div className="mb-4 flex items-center justify-between bg-seguranca-black/30 p-3 rounded-lg border border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-seguranca-yellow/20 flex items-center justify-center text-seguranca-yellow font-bold">
                        {selectedEmployee.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-white">{selectedEmployee.name}</p>
                        <p className="text-xs text-gray-400">{selectedEmployee.position?.name || 'Cargo não definido'}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEmployee(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      Trocar Funcionário
                    </Button>
                  </div>

                  <DependenteModal
                    employeeId={selectedEmployee.id}
                    employeeName={selectedEmployee.name}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 space-y-6">
                  <div className="text-center max-w-lg">
                    <UserPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-300 mb-2">Selecione um funcionário</h3>
                    <p className="text-gray-400 mb-6">Selecione um funcionário abaixo para gerenciar seus dependentes.</p>

                    <div className="w-full max-w-md mx-auto space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <Input
                          placeholder="Buscar por nome ou CPF..."
                          value={dependentSearchTerm}
                          onChange={(e) => setDependentSearchTerm(e.target.value)}
                          className="pl-10 bg-seguranca-black border-gray-600 text-seguranca-lightgray focus-visible:ring-seguranca-yellow"
                        />
                      </div>

                      <div className="bg-seguranca-black/30 border border-gray-700 rounded-md max-h-80 overflow-y-auto text-left">
                        {employees
                          .filter(emp =>
                            !dependentSearchTerm ||
                            emp.name.toLowerCase().includes(dependentSearchTerm.toLowerCase()) ||
                            (emp.document && emp.document.includes(dependentSearchTerm))
                          )
                          .map(emp => (
                            <div
                              key={emp.id}
                              className="p-3 hover:bg-gray-700 cursor-pointer flex items-center justify-between border-b border-gray-700/50 last:border-0 transition-colors group"
                              onClick={() => setSelectedEmployee(emp)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-gray-700 group-hover:bg-gray-600 flex items-center justify-center text-gray-300 text-xs font-bold transition-colors">
                                  {emp.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-200 text-sm">{emp.name}</p>
                                  <p className="text-xs text-gray-400">{emp.position?.name || 'Sem cargo'} • {emp.document || 'S/ CPF'}</p>
                                </div>
                              </div>
                              <ChevronRight size={16} className="text-gray-500 group-hover:text-seguranca-yellow transition-colors" />
                            </div>
                          ))}

                        {employees.filter(emp => !dependentSearchTerm || emp.name.toLowerCase().includes(dependentSearchTerm.toLowerCase())).length === 0 && (
                          <div className="p-8 text-center text-gray-500">
                            <p>Nenhum funcionário encontrado.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-700/50 w-full max-w-md text-center">
                    <Button
                      variant="link"
                      className="text-gray-400 hover:text-seguranca-yellow"
                      onClick={() => {
                        const tabsList = document.querySelector('[role="tablist"]');
                        const listaTab = tabsList?.querySelector('[value="lista"]');
                        if (listaTab) {
                          (listaTab as HTMLElement).click();
                        }
                      }}
                    >
                      Ver lista completa de funcionários
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lista">
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-animate="fadeDown">
              <Card className="bg-gradient-to-br from-seguranca-graphite to-seguranca-black border-gray-600/50 hover:border-blue-500/50 transition-all duration-300 group">
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm font-medium">Total de Funcionários</p>
                      <p className="text-3xl font-bold text-white mt-2">{stats.total}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/30 group-hover:bg-blue-500/30 transition-colors">
                      <Users className="h-6 w-6 text-blue-400" />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-seguranca-graphite to-seguranca-black border-gray-600/50 hover:border-green-500/50 transition-all duration-300 group">
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm font-medium">Funcionários Ativos</p>
                      <p className="text-3xl font-bold text-green-400 mt-2">{stats.active}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-green-500/20 border border-green-500/30 group-hover:bg-green-500/30 transition-colors">
                      <CheckCircle2 className="h-6 w-6 text-green-400" />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-seguranca-graphite to-seguranca-black border-gray-600/50 hover:border-purple-500/50 transition-all duration-300 group">
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm font-medium">Em Férias / Atestado</p>
                      <p className="text-3xl font-bold text-purple-400 mt-2">{stats.vacation + stats.medicalCertificate}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/30 group-hover:bg-purple-500/30 transition-colors">
                      <Clock className="h-6 w-6 text-purple-400" />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-seguranca-graphite to-seguranca-black border-gray-600/50 hover:border-red-500/50 transition-all duration-300 group">
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm font-medium">Demitidos / Suspensos</p>
                      <p className="text-3xl font-bold text-red-400 mt-2">{stats.terminated + stats.suspended}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 group-hover:bg-red-500/30 transition-colors">
                      <AlertCircle className="h-6 w-6 text-red-400" />
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" data-animate="fadeDown">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRefreshing(true);
                    loadEmployees();
                    loadAdmissionIntegration();
                    setTimeout(() => setRefreshing(false), 1000);
                  }}
                  disabled={refreshing}
                  className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-graphite hover:border-seguranca-red/50"
                >
                  <RefreshCw size={20} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
                <Button
                  onClick={() => setIsMobileSelectionMode(!isMobileSelectionMode)}
                  variant={isMobileSelectionMode ? "destructive" : "outline"}
                  className={`lg:hidden h-11 px-4 border-gray-600 transition-all duration-300 ${isMobileSelectionMode ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'text-seguranca-lightgray hover:bg-seguranca-graphite hover:text-white'}`}
                >
                  {isMobileSelectionMode ? (
                    <><CheckCircle2 className="mr-2 h-4 w-4" /> Pronto</>
                  ) : (
                    <><Shuffle className="mr-2 h-4 w-4" /> Selecionar</>
                  )}
                </Button>
                <Button
                  className="bg-gradient-to-r from-seguranca-red to-seguranca-darkred hover:from-seguranca-darkred hover:to-seguranca-red shadow-lg shadow-seguranca-red/20"
                  onClick={handleOpenModal}
                >
                  <Plus size={20} className="mr-2" />
                  Novo Funcionário
                </Button>
                <Button
                  variant="outline"
                  className="border-emerald-600/50 text-emerald-400 hover:bg-emerald-900/20"
                  onClick={() => setRelatoriosModalOpen(true)}
                >
                  <BarChart2 size={20} className="mr-2" />
                  Relatórios
                </Button>
              </div>
            </div>

            {/* Notificação sobre regras de exclusão */}
            <Card className="bg-blue-900/20 border-blue-600/50" data-animate="fadeUp">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-blue-400 font-semibold">Regras de Exclusão de Funcionários</h4>
                    <p className="text-blue-300 text-sm mt-1">
                      <strong>⚠️ Importante:</strong> Apenas funcionários com status "Demitido" podem ser excluídos do sistema.
                      Para excluir um funcionário ativo, primeiro altere seu status para "Demitido" usando o botão "Demitir".
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>


            {/* Filtros Modernos */}
            <Card className="bg-gradient-to-br from-seguranca-graphite to-seguranca-black border-gray-600/50 p-6" data-animate="fadeUp">
              {/* Search Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-seguranca-red/20 border border-seguranca-red/30">
                    <Search className="h-5 w-5 text-seguranca-red" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Pesquisar Funcionários</h3>
                    <p className="text-sm text-gray-400">Filtre e encontre funcionários rapidamente</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRefreshing(true);
                    clearFilters();
                    setTimeout(() => setRefreshing(false), 1000);
                  }}
                  disabled={refreshing}
                  className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-graphite"
                >
                  {refreshing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw size={16} className="mr-2" />
                  )}
                  Limpar
                </Button>
              </div>

              {/* Search Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <div className="relative sm:col-span-2 lg:col-span-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <Input
                    placeholder="Digite o nome, CPF ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 bg-seguranca-black/70 border-gray-600 text-seguranca-lightgray placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow/20"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="h-11 bg-seguranca-black/70 border border-gray-600 rounded-md px-3 py-2 text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow/20 outline-none"
                >
                  <option value="all">📋 Todos os status</option>
                  <option value="ACTIVE">✅ Ativo</option>
                  <option value="INACTIVE">⭕ Inativo</option>
                  <option value="VACATION">🏖️ Férias</option>
                  <option value="MATERNITY_LEAVE">👶 Licença Maternidade</option>
                  <option value="MEDICAL_CERTIFICATE">🏥 Atestado</option>
                  <option value="TERMINATED">❌ Demitido</option>
                  <option value="SUSPENDED">⏸️ Suspenso</option>
                </select>

                <SearchableSelect
                  value={companyFilter}
                  onChange={setCompanyFilter}
                  options={[
                    { value: "all", label: "🏢 Todas as Empresas" },
                    ...filterCompanies.map(c => ({
                      value: c.id,
                      label: c.sigla ? `${c.sigla} - ${c.name}` : (c.name || 'Sem nome')
                    }))
                  ]}
                  placeholder="🏢 Todas as Empresas"
                  searchPlaceholder="Buscar empresa..."
                />

                <SearchableSelect
                  value={positionFilter}
                  onChange={setPositionFilter}
                  options={[
                    { value: "all", label: "💼 Todos os cargos" },
                    ...filterPositions.map(p => ({
                      value: p.name,
                      label: p.name
                    }))
                  ]}
                  placeholder="💼 Todos os cargos"
                  searchPlaceholder="Buscar cargo..."
                />

                <SearchableSelect
                  value={workPostFilter}
                  onChange={setWorkPostFilter}
                  options={[
                    { value: "all", label: "📍 Todos os postos" },
                    ...filterWorkPosts.map(wp => ({
                      value: wp.name,
                      label: wp.name
                    }))
                  ]}
                  placeholder="📍 Todos os postos"
                  searchPlaceholder="Buscar posto..."
                />

                <div className="flex flex-col gap-1">
                  <label htmlFor="hire-date-from" className="text-xs text-gray-400">Admissão (de)</label>
                  <DatePicker
                    date={hireDateFrom ? parseISO(hireDateFrom) : undefined}
                    onDateChange={(date) => setHireDateFrom(date ? format(date, 'yyyy-MM-dd') : '')}
                    className="h-11 bg-seguranca-black/70 border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="hire-date-to" className="text-xs text-gray-400">Admissão (até)</label>
                  <DatePicker
                    date={hireDateTo ? parseISO(hireDateTo) : undefined}
                    onDateChange={(date) => setHireDateTo(date ? format(date, 'yyyy-MM-dd') : '')}
                    className="h-11 bg-seguranca-black/70 border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="termination-date-from" className="text-xs text-gray-400">Demissão (de)</label>
                  <DatePicker
                    date={terminationDateFrom ? parseISO(terminationDateFrom) : undefined}
                    onDateChange={(date) => setTerminationDateFrom(date ? format(date, 'yyyy-MM-dd') : '')}
                    className="h-11 bg-seguranca-black/70 border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="termination-date-to" className="text-xs text-gray-400">Demissão (até)</label>
                  <DatePicker
                    date={terminationDateTo ? parseISO(terminationDateTo) : undefined}
                    onDateChange={(date) => setTerminationDateTo(date ? format(date, 'yyyy-MM-dd') : '')}
                    className="h-11 bg-seguranca-black/70 border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow"
                  />
                </div>
              </div>
            </Card>

            {/* Resumo admissão/demissão (cadastro + processos em aberto) */}
            {admissionIntegration && (
              <Card className="bg-seguranca-black/40 border-amber-600/30 p-4">
                <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3 text-sm text-gray-300">
                  {admissionIntegration.lastHire && (
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-green-400 shrink-0" />
                      <span>
                        <span className="text-gray-500">Última admissão no cadastro:</span>{' '}
                        <span className="text-seguranca-lightgray font-medium">{admissionIntegration.lastHire.name}</span>
                        {' · '}
                        {new Date(admissionIntegration.lastHire.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                  {admissionIntegration.lastTermination && (
                    <div className="flex items-center gap-2">
                      <UserMinus className="h-4 w-4 text-red-400 shrink-0" />
                      <span>
                        <span className="text-gray-500">Última demissão no cadastro:</span>{' '}
                        <span className="text-seguranca-lightgray font-medium">{admissionIntegration.lastTermination.name}</span>
                        {' · '}
                        {new Date(admissionIntegration.lastTermination.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                  {(admissionIntegration.pendingAdmissionEmployeeIds.length > 0 ||
                    admissionIntegration.pendingDismissalEmployeeIds.length > 0) && (
                    <div className="text-xs text-amber-200/90 lg:ml-auto">
                      Há solicitações de admissão ou demissão em andamento; veja os avisos na coluna Status.
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Lista de Funcionários Moderna */}
            <Card className="bg-gradient-to-br from-seguranca-graphite to-seguranca-black border-gray-600/50 p-6" data-animate="fadeUp">
              <FuncionariosTable
                employees={sortedEmployees}
                pendingAdmissionEmployeeIds={new Set(admissionIntegration?.pendingAdmissionEmployeeIds ?? [])}
                pendingDismissalEmployeeIds={new Set(admissionIntegration?.pendingDismissalEmployeeIds ?? [])}
                selectedIds={selectedIds}
                onSelect={handleSelectEmployee}
                onSelectAll={handleSelectAllEmployees}
                onEdit={handleEditEmployee}
                onDelete={deleteEmployee}
                onTerminate={handleTerminateEmployee}
                onViewDocuments={handleViewDocuments}
                onViewDependents={(employee) => {
                  setSelectedEmployee(employee);
                  setActiveTab('dependentes');
                  navigate('/rh/funcionarios?tab=dependentes', { replace: true });
                }}
                onViewDetails={handleViewDetails}
                onViewQrCode={handleViewQrCode}
                isLoading={loading}
                isMobileSelectionMode={isMobileSelectionMode}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />

              {/* Paginação */}
              {subtitleTotal > pageSize && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-seguranca-black/30 p-4 rounded-lg border border-gray-700/50">
                  <div className="text-sm text-gray-400">
                    Mostrando <span className="text-white font-medium">{employees.length}</span> de <span className="text-white font-medium">{subtitleTotal}</span> funcionários
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(0)}
                      disabled={currentPage === 0 || loading}
                      className="border-gray-700 text-gray-400 hover:text-white"
                    >
                      Primeira
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                      disabled={currentPage === 0 || loading}
                      className="border-gray-700 text-gray-400 hover:text-white"
                    >
                      Anterior
                    </Button>

                    <div className="h-8 px-4 flex items-center justify-center bg-seguranca-red text-white text-sm font-bold rounded-md min-w-[32px]">
                      {currentPage + 1}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={employees.length < pageSize || loading}
                      className="border-gray-700 text-gray-400 hover:text-white"
                    >
                      Próxima
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.floor((subtitleTotal - 1) / pageSize))}
                      disabled={employees.length < pageSize || loading}
                      className="border-gray-700 text-gray-400 hover:text-white"
                    >
                      Última
                    </Button>
                  </div>
                </div>
              )}

              {/* Barra de Ações em Massa */}
              {selectedIds.length > 0 && (
                <div
                  className="fixed z-50 animate-in fade-in zoom-in-95 duration-200"
                  style={{
                    left: bulkBarPos?.x ?? window.innerWidth / 2,
                    top: bulkBarPos?.y ?? window.innerHeight / 2,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <Card
                    className={`bg-seguranca-black border-seguranca-red shadow-2xl shadow-seguranca-red/20 px-6 py-4 flex items-center gap-6 select-none ${bulkBarDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                    style={{ touchAction: 'none' }}
                    onPointerDown={(e) => {
                      const target = e.target as HTMLElement | null;
                      // Se clicou em um botão/link/checkbox dentro da barra, não iniciar drag
                      if (target?.closest('button,[role="button"],a,input,select,textarea,label')) return;
                      e.preventDefault();
                      const x = bulkBarPos?.x ?? window.innerWidth / 2;
                      const y = bulkBarPos?.y ?? window.innerHeight / 2;
                      setBulkBarDragOffset({ dx: e.clientX - x, dy: e.clientY - y });
                      setBulkBarDragging(true);
                      try {
                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      } catch {
                        // ignore
                      }
                    }}
                    onPointerUp={(e) => {
                      try {
                        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                      } catch {
                        // ignore
                      }
                      setBulkBarDragging(false);
                    }}
                  >
                    <div className="flex items-center gap-2 border-r border-gray-700 pr-6">
                      <div className="bg-seguranca-red/20 text-seguranca-red h-8 w-8 rounded-full flex items-center justify-center font-bold">
                        {selectedIds.length}
                      </div>
                      <span className="text-sm font-medium text-white">Selecionados</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedIds([])}
                        className="text-gray-400 border-gray-700 hover:bg-gray-800"
                        disabled={bulkActionLoading}
                      >
                        Cancelar
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={bulkActionLoading}
                        onClick={handleBulkDelete}
                        className="border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500"
                      >
                        {bulkActionLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Excluir Selecionados
                      </Button>

                      <Button
                        size="sm"
                        disabled={bulkActionLoading}
                        onClick={handleBulkTerminate}
                        className="bg-seguranca-red hover:bg-seguranca-darkred text-white"
                      >
                        {bulkActionLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <UserMinus className="h-4 w-4 mr-2" />
                        )}
                        Demitir Selecionados
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="documentos">
          <EmployeeDocumentsPanel />
        </TabsContent>
        <TabsContent value="treinamento">
          <EmployeeTrainingTab />
        </TabsContent>



        <TabsContent value="gerar">
          <DocumentosGerarTab />
        </TabsContent>
      </Tabs>

      {/* Modal de Documentos */}
      <Dialog open={documentsModalOpen} onOpenChange={handleCloseDocumentsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Documentos de {selectedEmployee?.name}</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <EmployeeDocuments
              employeeId={selectedEmployee.id}
              employeeName={selectedEmployee.name}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Importação Excel */}
      <ExcelImportModal
        open={excelImportModalOpen}
        onOpenChange={(open) => {
          setExcelImportModalOpen(open);
          if (!open && shouldOpenExcelImport) {
            navigate('/rh/funcionarios', { replace: true });
          }
        }}
        onSuccess={() => {
          loadEmployeesWithFilters();
          setExcelImportModalOpen(false);
          if (shouldOpenExcelImport) {
            navigate('/rh/funcionarios', { replace: true });
          }
        }}
      />

      {/* Modal de Importação Planilha Promover */}
      <Dialog open={promoverImportModalOpen} onOpenChange={setPromoverImportModalOpen}>
        <DialogContent className="max-w-lg bg-seguranca-black border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Upload className="text-seguranca-yellow" size={20} />
              Importar Planilha Promover
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-400">
              Selecione a empresa e o arquivo <strong className="text-white">.xlsx ou .csv</strong> da planilha de funcionários rede Promover.
              O sistema irá criar ou atualizar os funcionários pelo CPF automaticamente.
            </p>

            <div className="flex flex-col gap-2 mb-4">
              <label className="text-sm font-semibold text-gray-300">Empresa de Destino:</label>
              <select
                value={promoverCnpj}
                onChange={(e) => setPromoverCnpj(e.target.value)}
                className="bg-seguranca-black border border-gray-700 text-white rounded-lg px-3 py-2 text-sm w-full outline-none focus:border-seguranca-yellow transition-all"
              >
                {companies.length === 0 && (
                  <>
                    <option value="43576260000112">Promover Vigilância Patrimonial (CNPJ: 43.576.260/0001-12)</option>
                    <option value="36698521000101">Promover Terceirização (CNPJ: 36.698.521/0001-01)</option>
                  </>
                )}
                {companies.map((c) => {
                  const normalizedCnpj = (c.cnpj || '').replace(/[^0-9]/g, '');
                  const sigla = c.sigla ? `${c.sigla} - ` : '';
                  const cnpjLabel = c.cnpj ? ` (CNPJ: ${c.cnpj})` : '';
                  return (
                    <option key={c.id || normalizedCnpj} value={normalizedCnpj}>
                      {sigla}{c.name}{cnpjLabel}
                    </option>
                  );
                })}
              </select>
            </div>

            {!promoverImportLoading && !promoverImportResult && (
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-seguranca-yellow/40 rounded-xl cursor-pointer hover:border-seguranca-yellow/70 hover:bg-seguranca-yellow/5 transition-all">
                <Upload className="text-seguranca-yellow mb-2" size={32} />
                <span className="text-sm text-gray-400">Clique para selecionar o arquivo .xlsx ou .csv</span>
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPromoverImportLoading(true);
                    setPromoverImportResult(null);
                    try {
                      const formData = new FormData();
                      formData.append('file', file);
                      formData.append('cnpj', promoverCnpj);
                      const { default: api } = await import('@/services/api');
                      const resp = await api.post('/api/employees/import/promover', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      });
                      setPromoverImportResult(resp.data);
                      loadEmployeesWithFilters();
                    } catch (err: any) {
                      setPromoverImportResult({
                        success: false,
                        message: err?.response?.data?.message || err.message || 'Erro ao importar',
                      });
                    } finally {
                      setPromoverImportLoading(false);
                    }
                  }}
                />
              </label>
            )}

            {promoverImportLoading && (
              <div className="flex flex-col items-center justify-center h-36 gap-3">
                <Loader2 className="text-seguranca-yellow animate-spin" size={40} />
                <p className="text-sm text-gray-400">Processando importação...</p>
              </div>
            )}

            {promoverImportResult && (
              <div className={`rounded-xl p-4 border ${promoverImportResult.success
                ? 'bg-green-900/20 border-green-600/40'
                : 'bg-red-900/20 border-red-600/40'
                }`}>
                <p className={`font-semibold mb-2 ${promoverImportResult.success ? 'text-green-400' : 'text-red-400'
                  }`}>
                  {promoverImportResult.success ? '✅ Importação concluída!' : '❌ Erro na importação'}
                </p>
                <p className="text-sm text-gray-300">{promoverImportResult.message}</p>
                {promoverImportResult.success && (
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-seguranca-black/40 rounded-lg p-2">
                      <p className="text-gray-500">Total</p>
                      <p className="text-white font-bold text-lg">{promoverImportResult.total}</p>
                    </div>
                    <div className="bg-seguranca-black/40 rounded-lg p-2">
                      <p className="text-gray-500">Criados</p>
                      <p className="text-green-400 font-bold text-lg">{promoverImportResult.criados}</p>
                    </div>
                    <div className="bg-seguranca-black/40 rounded-lg p-2">
                      <p className="text-gray-500">Atualizados</p>
                      <p className="text-blue-400 font-bold text-lg">{promoverImportResult.atualizados}</p>
                    </div>
                  </div>
                )}

                {/* Exibir erros detalhados se existirem */}
                {!promoverImportResult.success && promoverImportResult.mensagens && promoverImportResult.mensagens.length > 0 && (
                  <div className="mt-3 text-left">
                    <p className="text-xs text-red-400 font-bold mb-1">Detalhes dos Erros:</p>
                    <div className="max-h-40 overflow-y-auto bg-seguranca-black/50 p-2 rounded-lg text-xs font-mono text-gray-300 border border-red-900/30">
                      <ul>
                        {promoverImportResult.mensagens.map((msg: string, idx: number) => (
                          <li key={idx} className="mb-1 pb-1 border-b border-gray-800/50 last:border-0">{msg}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <Button
                  className="mt-4 w-full border-gray-600 text-gray-300 hover:bg-gray-800"
                  variant="outline"
                  onClick={() => { setPromoverImportResult(null); }}
                >
                  Importar outro arquivo
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Criação/Edição de Funcionário */}
      {/* 
        Prioridade: Se editModalOpen estiver true E employeeToEdit existir, abre em modo EDICIÃO
        Caso contrário, abre em modo CRIAÇÃO se modalOpen estiver true
      */}
      <FuncionarioNovoModal
        open={(editModalOpen && !!employeeToEdit) || modalOpen}
        onClose={() => {
          // Se estiver em modo de edição, usar handleCloseEditModal
          if (editModalOpen && employeeToEdit) {
            handleCloseEditModal();
          } else {
            // Caso contrário, usar handleCloseModal (modo criação)
            handleCloseModal();
          }
        }}
        onCreated={() => {
          // Se estiver em modo de edição, usar handleEmployeeEdited
          if (editModalOpen && employeeToEdit) {
            handleEmployeeEdited();
          } else {
            // Caso contrário, apenas recarregar (sem fechar o modal)
            loadEmployeesWithFilters();
          }
        }}
        employeeToEdit={editModalOpen && employeeToEdit ? employeeToEdit : null}
      />

      {/* Modal de Confirmação Customizado */}
      <AlertDialog
        open={confirmConfig.open}
        onOpenChange={(open) => setConfirmConfig(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent className="bg-seguranca-black/90 backdrop-blur-xl border-gray-700/50 max-w-[420px] p-0 overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] border-t-seguranca-red/30">
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfirmConfig(prev => ({ ...prev, open: false }))}
              className="h-8 w-8 rounded-full text-gray-500 hover:text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-8">
            <div className="flex flex-col items-center text-center space-y-5">
              <div className={`p-5 rounded-2xl shadow-inner ${confirmConfig.variant === 'destructive' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                {confirmConfig.variant === 'destructive' ? (
                  <AlertTriangle className="h-10 w-10 animate-pulse" />
                ) : (
                  <CheckCircle className="h-10 w-10" />
                )}
              </div>
              <div className="space-y-3">
                <AlertDialogTitle className="text-2xl font-bold text-white tracking-tight">
                  {confirmConfig.title}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400 text-sm leading-relaxed px-2">
                  {confirmConfig.description}
                </AlertDialogDescription>
              </div>
            </div>
          </div>
          <AlertDialogFooter className="bg-seguranca-graphite/40 border-t border-gray-800/50 p-6 gap-3 sm:gap-0 mt-0">
            <AlertDialogCancel className="bg-transparent border-gray-700 text-gray-400 hover:bg-seguranca-black hover:text-white transition-all duration-300 px-6">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmConfig.onConfirm}
              className={`px-8 transition-all duration-300 ${confirmConfig.variant === 'destructive'
                ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                : 'bg-gradient-to-r from-seguranca-red to-red-700 hover:from-red-500 hover:to-red-600 shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                } text-white border-0`}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Modal de Detalhes Completo */}
      <EmployeeViewDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        employee={employeeForDetails}
        onEdit={handleEditFromDetails}
      />

      {/* Modal de Relatórios Avançado */}
      <RelatoriosModal
        open={relatoriosModalOpen}
        onOpenChange={setRelatoriosModalOpen}
        employees={employees}
        filterCompanies={filterCompanies}
        filterWorkPosts={filterWorkPosts}
        filterPositions={filterPositions}
      />

      {/* Modal de Crachá / QR Code (Onda 1) */}
      <EmployeeQrCodeBadgeModal
        open={qrCodeModalOpen}
        onOpenChange={(open) => {
          setQrCodeModalOpen(open);
          if (!open) setEmployeeForQrCode(null);
        }}
        employeeId={employeeForQrCode?.id ?? null}
        employeeName={employeeForQrCode?.name}
      />
    </StandardLayout>
  );
};

export default Funcionarios;
