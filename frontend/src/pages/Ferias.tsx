import React, { useState, useMemo } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { 
  Calendar, 
  Plus, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Download,
  Filter,
  Search,
  Eye,
  Edit,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { employeeService, Employee } from '@/services/employeeService';
import { feriasService } from '@/services/feriasService';
import { calcularPeriodoAquisitivo, formatBr } from '@/utils/feriasPeriodo';
import FeriasFormModal from '@/components/ferias/FeriasFormModal';
import FeriasDetailsModal from '@/components/ferias/FeriasDetailsModal';
import AfastamentoFormModal from '@/components/ferias/AfastamentoFormModal';
import FeriasReportModal from '@/components/ferias/FeriasReportModal';
import ApprovalModal from '@/components/ferias/ApprovalModal';
import { MEDICAL_TYPE_LABELS } from '@/services/medicalDocumentService';


interface FeriasPeriodo {
  id: string;
  employeeId: string;
  employeeName: string;
  periodoAquisitivo: string; // ex: "2024/2025"
  empresa?: string; // sigla: VIG, ADM ou TERC
  setor?: string; // setor de trabalho
  dataInicio: string;
  dataFim: string;
  status: 'PENDENTE' | 'APROVADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
  tipo: 'FERIAS_NORMAIS' | 'FERIAS_VENDIDAS' | 'ABONO_PECUNIARIO';
  observacoes?: string;
  createdAt: string;
}

interface Afastamento {
  id: string;
  employeeId: string;
  employeeName: string;
  tipo: 'ATESTADO' | 'LICENCA_MEDICA' | 'LICENCA_MATERNIDADE' | 'LICENCA_PATERNIDADE' | 'SUSPENSAO' | 'OUTROS';
  dataInicio: string;
  dataFim: string;
  status: 'PENDENTE' | 'APROVADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
  motivo: string;
  documento?: string;
  observacoes?: string;
  createdAt: string;
}

const isFeriasPeriodo = (item: FeriasPeriodo | Afastamento | null): item is FeriasPeriodo => {
  if (!item) return false;
  return 'periodoAquisitivo' in item || (
    'tipo' in item && (item.tipo === 'FERIAS_NORMAIS' || item.tipo === 'FERIAS_VENDIDAS' || item.tipo === 'ABONO_PECUNIARIO')
  );
};

const isAfastamento = (item: FeriasPeriodo | Afastamento | null): item is Afastamento => {
  if (!item) return false;
  return 'motivo' in item || (
    'tipo' in item && item.tipo !== 'FERIAS_NORMAIS' && item.tipo !== 'FERIAS_VENDIDAS' && item.tipo !== 'ABONO_PECUNIARIO'
  );
};

const FeriasPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('ferias');
  const [searchTerm, setSearchTerm] = useState('');
  const [feriasModalOpen, setFeriasModalOpen] = useState(false);
  const [afastamentoModalOpen, setAfastamentoModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [empresaFilter, setEmpresaFilter] = useState('');
  const [agendarEmployeeId, setAgendarEmployeeId] = useState<string | undefined>(undefined);
  const [selectedItem, setSelectedItem] = useState<FeriasPeriodo | Afastamento | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { canApproveVacations, canApproveAbsences, canAccessReports } = useUserPermissions();

  // Buscar dados reais da API
  const { data: feriasPeriodos = [], isLoading: feriasLoading, error: feriasError } = useQuery({
    queryKey: ['ferias'],
    queryFn: () => feriasService.getFerias(),
    retry: 2,
    retryDelay: 1000
  });

  const { data: afastamentos = [], isLoading: afastamentosLoading, error: afastamentosError } = useQuery({
    queryKey: ['afastamentos'],
    queryFn: () => feriasService.getAfastamentos(),
    retry: 2,
    retryDelay: 1000
  });

  // Buscar funcionários para filtros e nomes
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        const all = await employeeService.fetchAllEmployeesForReport();
        if (all && all.length > 0) return all;
      } catch (err) {
        console.warn('Erro ao carregar lista completa de funcionários para férias:', err);
      }
      return employeeService.getAllEmployees(undefined, 0, 1000);
    },
  });

  const employeesById = useMemo(() => {
    const map: Record<string, Employee> = {};
    (employees || []).forEach(emp => {
      if (emp?.id) map[emp.id] = emp;
    });
    return map;
  }, [employees]);

  const empresaOf = (ferias: FeriasPeriodo) =>
    ferias.empresa || employeesById[ferias.employeeId]?.company?.sigla || '';

  const setorOf = (ferias: FeriasPeriodo) =>
    ferias.setor || employeesById[ferias.employeeId]?.department?.name || '';

  const employeeNameOf = (ferias: FeriasPeriodo) => {
    if (ferias.employeeName && !ferias.employeeName.toLowerCase().includes('não encontrado') && !ferias.employeeName.toLowerCase().includes('removido')) {
      return ferias.employeeName;
    }
    return employeesById[ferias.employeeId]?.name || ferias.employeeName || 'Funcionário';
  };

  // Filtros da lista de férias (busca por nome + empresa VIG/ADM/TERC)
  const filteredFerias = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase();
    return feriasPeriodos.map(ferias => ({
      ...ferias,
      employeeName: employeeNameOf(ferias)
    })).filter(ferias => {
      const empresa = ferias.empresa || employeesById[ferias.employeeId]?.company?.sigla || '';
      const matchBusca = !termo || ferias.employeeName.toLowerCase().includes(termo);
      const matchEmpresa = !empresaFilter || empresa === empresaFilter;
      return matchBusca && matchEmpresa;
    });
  }, [feriasPeriodos, searchTerm, empresaFilter, employeesById]);

  // Filtros da lista de afastamentos (busca por nome ou motivo)
  const filteredAfastamentos = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase();
    return afastamentos.filter(afastamento => {
      if (!termo) return true;
      const matchNome = afastamento.employeeName?.toLowerCase().includes(termo);
      const matchMotivo = afastamento.motivo?.toLowerCase().includes(termo);
      const matchTipo = afastamento.tipo?.toLowerCase().includes(termo);
      return matchNome || matchMotivo || matchTipo;
    });
  }, [afastamentos, searchTerm]);

  // Alertas de período aquisitivo: quem ainda não tem e quem está com o período a vencer
  const alertasPeriodo = useMemo(() => {
    if (!employees?.length) return [];

    const feriasPorFuncionario: Record<string, { dataInicio?: string; status?: string }[]> = {};
    feriasPeriodos.forEach(f => {
      if (!feriasPorFuncionario[f.employeeId]) feriasPorFuncionario[f.employeeId] = [];
      feriasPorFuncionario[f.employeeId].push({ dataInicio: f.dataInicio, status: f.status });
    });

    return employees
      .filter(emp => {
        if (!emp?.id || !emp.hireDate) return false;
        if (emp.terminationDate) return false;
        const status = String(emp.status || '').toUpperCase();
        return status !== 'TERMINATED' && status !== 'INACTIVE';
      })
      .map(emp => ({
        emp,
        info: calcularPeriodoAquisitivo(emp.hireDate, feriasPorFuncionario[emp.id] || [])
      }))
      .filter(a => a.info.status === 'SEM_PERIODO' || a.info.status === 'VENCENDO')
      .sort((a, b) => {
        const peso = (s: string) => (s === 'VENCENDO' ? 0 : 1);
        const diff = peso(a.info.status) - peso(b.info.status);
        if (diff !== 0) return diff;
        return (a.info.diasParaDisponibilizar ?? a.info.diasParaVencer ?? 0) -
          (b.info.diasParaDisponibilizar ?? b.info.diasParaVencer ?? 0);
      })
      .slice(0, 8);
  }, [employees, feriasPeriodos]);

  // Calcular estatísticas dos dados carregados
  const feriasPendentes = feriasPeriodos.filter(f => f.status === 'PENDENTE').length;
  const feriasAprovadas = feriasPeriodos.filter(f => f.status === 'APROVADO').length;
  const afastamentosAtivos = afastamentos.filter(a => a.status === 'EM_ANDAMENTO' || a.status === 'APROVADO').length;
  const totalFuncionarios = employees?.length || 0;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'PENDENTE': return 'bg-yellow-500 text-black';
      case 'APROVADO': return 'bg-green-500 text-white';
      case 'REJECTED': return 'bg-red-500 text-white';
      case 'CANCELADO': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getTipoLabel = (tipo?: string) => {
    if (!tipo) return '-';
    if ((MEDICAL_TYPE_LABELS as any)[tipo]) {
      return (MEDICAL_TYPE_LABELS as any)[tipo];
    }
    const customLabels: Record<string, string> = {
      'FERIAS_NORMAIS': 'Férias Normais',
      'FERIAS_VENDIDAS': 'Férias Vendidas',
      'ABONO_PECUNIARIO': 'Abono Pecuniário',
      'LICENCA_MEDICA': 'Licença Médica',
      'LICENCA_MATERNIDADE': 'Licença Maternidade',
      'LICENCA_PATERNIDADE': 'Licença Paternidade',
      'SUSPENSAO': 'Suspensão',
      'OUTROS': 'Outros'
    };
    return customLabels[tipo] || tipo.replace(/_/g, ' ');
  };

  const getTipoColor = (tipo?: string) => {
    switch (tipo) {
      case 'FERIAS_NORMAIS': return 'bg-blue-500 text-white';
      case 'FERIAS_VENDIDAS': return 'bg-orange-500 text-white';
      case 'ABONO_PECUNIARIO': return 'bg-purple-500 text-white';
      case 'ATESTADO':
      case 'ATESTADO_ACOMPANHAMENTO':
      case 'ATESTADO_APTIDAO_SANIDADE': return 'bg-yellow-500 text-black';
      case 'DECLARACAO_COMPARECIMENTO':
      case 'DECLARACAO_MEDICA': return 'bg-blue-600 text-white';
      case 'AFASTAMENTO_DOENCA_ACIDENTE':
      case 'ACIDENTE_TRABALHO':
      case 'CAT': return 'bg-red-600 text-white';
      case 'AFASTAMENTO_INSS': return 'bg-amber-600 text-white';
      case 'LICENCA_MEDICA': return 'bg-red-500 text-white';
      case 'LICENCA_MATERNIDADE':
      case 'LICENCA_MATERNIDADE_PATERNIDADE': return 'bg-pink-500 text-white';
      case 'LICENCA_PATERNIDADE': return 'bg-cyan-500 text-white';
      case 'LICENCA_GALA_MATRIMONIAL': return 'bg-emerald-600 text-white';
      case 'TESTEMUNHA_JUDICIAL':
      case 'PROCESSO_TRABALHISTA': return 'bg-indigo-600 text-white';
      case 'SUSPENSAO': return 'bg-red-600 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatDate = (date?: string | null) => {
    if (!date) return '-';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return String(date);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return String(date);
    }
  };

  const calculateDays = (start?: string | null, end?: string | null) => {
    if (!start) return 0;
    try {
      const startDate = new Date(start);
      const endDate = end ? new Date(end) : new Date(start);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 1;
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    } catch {
      return 1;
    }
  };

  const handleOpenFeriasModal = () => {
    setSelectedItem(null);
    setAgendarEmployeeId(undefined);
    setFeriasModalOpen(true);
  };

  const handleAgendar = (employeeId: string) => {
    setSelectedItem(null);
    setAgendarEmployeeId(employeeId);
    setFeriasModalOpen(true);
  };

  const handleOpenAfastamentoModal = () => {
    setSelectedItem(null);
    setAgendarEmployeeId(undefined);
    setAfastamentoModalOpen(true);
  };

  const handleCloseModals = () => {
    console.log('Fechando modais');
    setFeriasModalOpen(false);
    setAfastamentoModalOpen(false);
    setViewModalOpen(false);
    setEditModalOpen(false);
    setReportModalOpen(false);
    setApprovalModalOpen(false);
    setSelectedItem(null);
    setAgendarEmployeeId(undefined);
    // Recarregar dados após criar/editar
    queryClient.invalidateQueries({ queryKey: ['ferias'] });
    queryClient.invalidateQueries({ queryKey: ['afastamentos'] });
  };

  const handleView = (item: FeriasPeriodo | Afastamento) => {
    setSelectedItem(item);
    setViewModalOpen(true);
  };

  const handleEdit = (item: FeriasPeriodo | Afastamento) => {
    console.log('Editando item:', item);
    setSelectedItem(item);
    setAgendarEmployeeId(undefined);
    
    // Determinar qual modal abrir baseado no tipo do item
    if ('tipo' in item && (item.tipo === 'FERIAS_NORMAIS' || item.tipo === 'FERIAS_VENDIDAS' || item.tipo === 'ABONO_PECUNIARIO')) {
      // É uma férias
      console.log('Abrindo modal de férias');
      setFeriasModalOpen(true);
      setAfastamentoModalOpen(false); // Garantir que o outro modal esteja fechado
    } else {
      // É um afastamento
      console.log('Abrindo modal de afastamento');
      setAfastamentoModalOpen(true);
      setFeriasModalOpen(false); // Garantir que o outro modal esteja fechado
    }
  };

  const handleApprove = (item: FeriasPeriodo | Afastamento) => {
    console.log('Abrindo modal de aprovação:', item);
    setSelectedItem(item);
    setApprovalModalOpen(true);
  };

  const handleApprovalClose = () => {
    setApprovalModalOpen(false);
    setSelectedItem(null);
    // Recarregar dados após aprovar/rejeitar
    queryClient.invalidateQueries({ queryKey: ['ferias'] });
    queryClient.invalidateQueries({ queryKey: ['afastamentos'] });
  };

  const handleDelete = async (item: FeriasPeriodo | Afastamento, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('Excluindo item:', item);
    
    const confirmMessage = isFeriasPeriodo(item)
      ? `Tem certeza que deseja excluir esta solicitação de férias (${item.employeeName || 'Funcionário'})?`
      : `Tem certeza que deseja excluir este afastamento?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setIsDeleting(true);
      setDeletingId(item.id);
      
      if (isFeriasPeriodo(item)) {
        console.log('Excluindo férias com ID:', item.id);
        await feriasService.deleteFerias(item.id);
        
        // Atualização otimista no cache para refletir imediatamente na tela
        queryClient.setQueryData<FeriasPeriodo[]>(['ferias'], (old = []) => 
          old.filter(f => f.id !== item.id)
        );

        toast({
          title: "Sucesso",
          description: "Solicitação de férias excluída com sucesso.",
          variant: "default"
        });
      } else {
        console.log('Excluindo afastamento com ID:', item.id);
        await feriasService.deleteAfastamento(item.id);
        
        // Atualização otimista no cache
        queryClient.setQueryData<Afastamento[]>(['afastamentos'], (old = []) => 
          old.filter(a => a.id !== item.id)
        );

        toast({
          title: "Sucesso",
          description: "Afastamento excluído com sucesso.",
          variant: "default"
        });
      }

      // Sincronizar e revalidar com o servidor
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ferias'] }),
        queryClient.invalidateQueries({ queryKey: ['afastamentos'] }),
        queryClient.invalidateQueries({ queryKey: ['expiringVacations'] })
      ]);
      await queryClient.refetchQueries({ queryKey: ['ferias'] });
    } catch (error: any) {
      console.error('Erro ao excluir férias/afastamento:', error);
      const status = error?.response?.status;
      const errorMsg = error?.response?.data?.message || error?.response?.data?.error || error?.message || "Erro ao excluir solicitação. Tente novamente.";
      toast({
        title: status === 403 ? "Permissão Negada (403)" : "Erro ao excluir",
        description: errorMsg,
        variant: "destructive"
      });
      // Reverter/revalidar caso tenha falhado
      queryClient.invalidateQueries({ queryKey: ['ferias'] });
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  return (
    <StandardLayout title="Férias e Afastamentos">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-seguranca-lightgray">Férias e Afastamentos</h1>
            <p className="text-gray-400 mt-1">Controle de período aquisitivo, concessivo e afastamentos</p>
          </div>
          <div className="flex gap-2">
          {canAccessReports && (
            <Button 
              onClick={() => setReportModalOpen(true)}
              variant="outline" 
              className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-yellow hover:text-seguranca-black"
            >
              <Download className="mr-2 h-4 w-4" />
              Relatórios
            </Button>
          )}
            <div className="relative">
              <Button 
                className="bg-seguranca-yellow text-black hover:bg-yellow-500"
                onClick={activeTab === 'ferias' ? handleOpenFeriasModal : handleOpenAfastamentoModal}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova Solicitação
              </Button>
            </div>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-seguranca-graphite border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Férias Pendentes</p>
                  <p className="text-2xl font-bold text-seguranca-yellow">{feriasPendentes}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-seguranca-graphite border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Afastamentos Ativos</p>
                  <p className="text-2xl font-bold text-red-400">{afastamentosAtivos}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-seguranca-graphite border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Férias Aprovadas</p>
                  <p className="text-2xl font-bold text-green-400">{feriasAprovadas}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-seguranca-graphite border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Funcionários</p>
                  <p className="text-2xl font-bold text-blue-400">{totalFuncionarios}</p>
                </div>
                <Users className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 bg-seguranca-graphite">
            <TabsTrigger value="ferias" className="data-[state='active']:bg-seguranca-yellow data-[state='active']:text-black">
              <Calendar className="mr-2 h-4 w-4" />
              Férias
            </TabsTrigger>
            <TabsTrigger value="afastamentos" className="data-[state='active']:bg-seguranca-yellow data-[state='active']:text-black">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Afastamentos
            </TabsTrigger>
          </TabsList>

          {/* Tab Férias */}
          <TabsContent value="ferias" className="space-y-4">
            {/* Alertas de período aquisitivo */}
            {alertasPeriodo.length > 0 && (
              <Card className="bg-seguranca-graphite border-gray-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-seguranca-yellow" />
                    Alertas de Período Aquisitivo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {alertasPeriodo.map(({ emp, info }) => (
                    <div
                      key={emp.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-gray-700 rounded p-3 bg-seguranca-black"
                    >
                      <div className="flex items-start gap-2">
                        {info.status === 'VENCENDO'
                          ? <Clock className="h-4 w-4 mt-0.5 text-orange-400 shrink-0" />
                          : <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-400 shrink-0" />}
                        <div>
                          <p className="text-sm text-seguranca-lightgray font-medium">
                            {emp.name}
                            <span className="text-gray-500 font-normal">
                              {' '}({emp.company?.sigla || 'S/I'} / {emp.department?.name || 'S/SETOR'})
                            </span>
                          </p>
                          <p className={`text-xs ${info.status === 'VENCENDO' ? 'text-orange-400' : 'text-yellow-400'}`}>
                            {info.status === 'VENCENDO'
                              ? `Período ${info.periodo} vence em ${formatBr(info.fim)} (faltam ${info.diasParaVencer} dias) — programe as férias.`
                              : `Ainda sem período aquisitivo de férias. Disponível a partir de ${formatBr(info.disponivelEm)} (faltam ${info.diasParaDisponibilizar} dias).`}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-seguranca-yellow text-seguranca-yellow hover:bg-seguranca-yellow hover:text-black self-start sm:self-auto"
                        onClick={() => handleAgendar(emp.id)}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Agendar
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Filtros */}
            <Card className="bg-seguranca-graphite border-gray-600">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Buscar funcionário..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-seguranca-black border border-gray-600 rounded text-seguranca-lightgray focus:border-seguranca-yellow focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <select
                      value={empresaFilter}
                      onChange={(e) => setEmpresaFilter(e.target.value)}
                      aria-label="Filtrar por empresa"
                      className="py-2 px-3 bg-seguranca-black border border-gray-600 rounded text-seguranca-lightgray focus:border-seguranca-yellow focus:outline-none"
                    >
                      <option value="">Todas as empresas</option>
                      <option value="VIG">VIG</option>
                      <option value="ADM">ADM</option>
                      <option value="TERC">TERC</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Férias */}
            <Card className="bg-seguranca-graphite border-gray-600">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray">Períodos de Férias</CardTitle>
              </CardHeader>
              <CardContent>
                {feriasLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-seguranca-yellow"></div>
                    <span className="ml-2 text-seguranca-lightgray">Carregando férias...</span>
                  </div>
                ) : feriasError ? (
                  <div className="flex items-center justify-center h-32 text-red-400">
                    <AlertTriangle className="h-6 w-6 mr-2" />
                    <span>Erro ao carregar férias. Tente novamente.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-seguranca-yellow text-left border-b border-gray-700">
                          <th className="p-3 text-sm">Funcionário</th>
                          <th className="p-3 text-sm">Empresa</th>
                          <th className="p-3 text-sm">Setor de Trabalho</th>
                          <th className="p-3 text-sm">Período Aquisitivo</th>
                          <th className="p-3 text-sm">Data Início</th>
                          <th className="p-3 text-sm">Data Fim</th>
                          <th className="p-3 text-sm">Dias</th>
                          <th className="p-3 text-sm">Tipo</th>
                          <th className="p-3 text-sm">Status</th>
                          <th className="p-3 text-sm">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFerias.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="p-8 text-center text-gray-400">
                              Nenhuma solicitação de férias encontrada.
                            </td>
                          </tr>
                        ) : (
                          filteredFerias.map((ferias) => (
                            <tr key={ferias.id} className="border-b border-gray-700 text-seguranca-lightgray hover:bg-seguranca-black transition-colors">
                              <td className="p-3 text-sm">{ferias.employeeName}</td>
                              <td className="p-3 text-sm">
                                <Badge className="bg-seguranca-graphite text-seguranca-yellow border border-gray-600">
                                  {empresaOf(ferias) || '-'}
                                </Badge>
                              </td>
                              <td className="p-3 text-sm">{setorOf(ferias) || '-'}</td>
                              <td className="p-3 text-sm">{ferias.periodoAquisitivo}</td>
                              <td className="p-3 text-sm">{formatDate(ferias.dataInicio)}</td>
                              <td className="p-3 text-sm">{formatDate(ferias.dataFim)}</td>
                              <td className="p-3 text-sm">{calculateDays(ferias.dataInicio, ferias.dataFim)} dias</td>
                              <td className="p-3 text-sm">
                                <Badge className={getTipoColor(ferias.tipo)}>
                                  {ferias.tipo.replace('_', ' ')}
                                </Badge>
                              </td>
                              <td className="p-3 text-sm">
                                <Badge className={getStatusColor(ferias.status)}>
                                  {ferias.status.replace('_', ' ')}
                                </Badge>
                              </td>
                              <td className="p-3 text-sm">
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-seguranca-black"
                                    onClick={() => handleView(ferias)}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-green-400 border-green-400 hover:bg-green-400 hover:text-seguranca-black"
                                    onClick={() => handleEdit(ferias)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  {ferias.status === 'PENDENTE' && canApproveVacations && (
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-amber-400 border-amber-400 hover:bg-amber-400 hover:text-seguranca-black"
                                      onClick={() => handleApprove(ferias)}
                                      title="Aprovar/Rejeitar"
                                    >
                                      <CheckCircle2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button 
                                    type="button"
                                    size="sm" 
                                    variant="outline" 
                                    className="text-red-400 border-red-400 hover:bg-red-400 hover:text-seguranca-black"
                                    onClick={(e) => handleDelete(ferias, e)}
                                    disabled={isDeleting && deletingId === ferias.id}
                                    title="Excluir solicitação"
                                  >
                                    <Trash2 className={`h-3 w-3 ${isDeleting && deletingId === ferias.id ? 'animate-spin' : ''}`} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Afastamentos */}
          <TabsContent value="afastamentos" className="space-y-4">
            {/* Filtros */}
            <Card className="bg-seguranca-graphite border-gray-600">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Buscar funcionário..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-seguranca-black border border-gray-600 rounded text-seguranca-lightgray focus:border-seguranca-yellow focus:outline-none"
                      />
                    </div>
                  </div>
                  <Button variant="outline" className="border-gray-600 text-seguranca-lightgray">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtros
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Afastamentos */}
            <Card className="bg-seguranca-graphite border-gray-600">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray">Afastamentos</CardTitle>
              </CardHeader>
              <CardContent>
                {afastamentosLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-seguranca-yellow"></div>
                    <span className="ml-2 text-seguranca-lightgray">Carregando afastamentos...</span>
                  </div>
                ) : afastamentosError ? (
                  <div className="flex items-center justify-center h-32 text-red-400">
                    <AlertTriangle className="h-6 w-6 mr-2" />
                    <span>Erro ao carregar afastamentos. Tente novamente.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-seguranca-yellow text-left border-b border-gray-700">
                          <th className="p-3 text-sm">Funcionário</th>
                          <th className="p-3 text-sm">Tipo</th>
                          <th className="p-3 text-sm">Data Início</th>
                          <th className="p-3 text-sm">Data Fim</th>
                          <th className="p-3 text-sm">Dias</th>
                          <th className="p-3 text-sm">Motivo</th>
                          <th className="p-3 text-sm">Status</th>
                          <th className="p-3 text-sm">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAfastamentos.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-gray-400">
                              Nenhum afastamento encontrado.
                            </td>
                          </tr>
                        ) : (
                          filteredAfastamentos.map((afastamento) => (
                            <tr key={afastamento.id} className="border-b border-gray-700 text-seguranca-lightgray hover:bg-seguranca-black transition-colors">
                              <td className="p-3 text-sm">{afastamento.employeeName}</td>
                              <td className="p-3 text-sm">
                                <Badge className={getTipoColor(afastamento.tipo)}>
                                  {getTipoLabel(afastamento.tipo)}
                                </Badge>
                              </td>
                              <td className="p-3 text-sm">{formatDate(afastamento.dataInicio)}</td>
                              <td className="p-3 text-sm">{formatDate(afastamento.dataFim)}</td>
                              <td className="p-3 text-sm">{calculateDays(afastamento.dataInicio, afastamento.dataFim)} dia{calculateDays(afastamento.dataInicio, afastamento.dataFim) !== 1 ? 's' : ''}</td>
                              <td className="p-3 text-sm max-w-xs truncate">{afastamento.motivo}</td>
                              <td className="p-3 text-sm">
                                <Badge className={getStatusColor(afastamento.status)}>
                                  {afastamento.status.replace('_', ' ')}
                                </Badge>
                              </td>
                              <td className="p-3 text-sm">
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-seguranca-black"
                                    onClick={() => handleView(afastamento)}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-green-400 border-green-400 hover:bg-green-400 hover:text-seguranca-black"
                                    onClick={() => handleEdit(afastamento)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  {afastamento.status === 'PENDENTE' && canApproveAbsences && (
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-amber-400 border-amber-400 hover:bg-amber-400 hover:text-seguranca-black"
                                      onClick={() => handleApprove(afastamento)}
                                      title="Aprovar/Rejeitar"
                                    >
                                      <CheckCircle2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button 
                                    type="button"
                                    size="sm" 
                                    variant="outline" 
                                    className="text-red-400 border-red-400 hover:bg-red-400 hover:text-seguranca-black"
                                    onClick={(e) => handleDelete(afastamento, e)}
                                    disabled={isDeleting && deletingId === afastamento.id}
                                    title="Excluir afastamento"
                                  >
                                    <Trash2 className={`h-3 w-3 ${isDeleting && deletingId === afastamento.id ? 'animate-spin' : ''}`} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modais */}
      {feriasModalOpen && (
        <FeriasFormModal
          onSuccess={handleCloseModals}
          onClose={handleCloseModals}
          editingId={isFeriasPeriodo(selectedItem) ? selectedItem.id : undefined}
          initialEmployeeId={agendarEmployeeId}
          initialData={isFeriasPeriodo(selectedItem) ? {
            employeeId: selectedItem.employeeId,
            periodoAquisitivo: selectedItem.periodoAquisitivo || '',
            dataInicio: selectedItem.dataInicio,
            dataFim: selectedItem.dataFim,
            tipo: selectedItem.tipo,
            observacoes: selectedItem.observacoes || ''
          } : undefined}
        />
      )}

      {afastamentoModalOpen && (
        <AfastamentoFormModal
          onSuccess={handleCloseModals}
          onClose={handleCloseModals}
          editingId={isAfastamento(selectedItem) ? selectedItem.id : undefined}
          initialData={isAfastamento(selectedItem) ? {
            employeeId: selectedItem.employeeId,
            tipo: selectedItem.tipo as any,
            dataInicio: selectedItem.dataInicio,
            dataFim: selectedItem.dataFim,
            motivo: selectedItem.motivo,
            documento: selectedItem.documento || '',
            observacoes: selectedItem.observacoes || ''
          } : undefined}
        />
      )}

      {/* Modal de Visualização de Detalhes */}
      {viewModalOpen && selectedItem && (
        'periodoAquisitivo' in selectedItem ? (
          <FeriasDetailsModal
            isOpen={viewModalOpen}
            onClose={() => setViewModalOpen(false)}
            ferias={selectedItem as FeriasPeriodo}
            employee={employeesById[(selectedItem as FeriasPeriodo).employeeId]}
            onEdit={(ferias) => {
              setViewModalOpen(false);
              handleEdit(ferias);
            }}
            onDelete={(ferias) => {
              setViewModalOpen(false);
              handleDelete(ferias);
            }}
          />
        ) : (
          <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
            <DialogContent className="max-w-2xl bg-seguranca-graphite border-gray-600">
              <DialogHeader>
                <DialogTitle className="text-seguranca-lightgray flex items-center gap-2">
                  <Eye className="h-5 w-5 text-seguranca-yellow" />
                  Detalhes do Afastamento
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm">Funcionário</label>
                    <p className="text-seguranca-lightgray font-medium">{selectedItem.employeeName}</p>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Status</label>
                    <Badge className={getStatusColor(selectedItem.status)}>
                      {selectedItem.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm">Data de Início</label>
                    <p className="text-seguranca-lightgray">{formatDate(selectedItem.dataInicio)}</p>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Data de Fim</label>
                    <p className="text-seguranca-lightgray">{formatDate(selectedItem.dataFim)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm">Dias</label>
                    <p className="text-seguranca-lightgray">{calculateDays(selectedItem.dataInicio, selectedItem.dataFim)} dias</p>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Tipo</label>
                    <Badge className={getTipoColor(selectedItem.tipo)}>
                      {getTipoLabel(selectedItem.tipo)}
                    </Badge>
                  </div>
                </div>

                {'motivo' in selectedItem && (
                  <div>
                    <label className="text-gray-400 text-sm">Motivo</label>
                    <p className="text-seguranca-lightgray">{selectedItem.motivo}</p>
                  </div>
                )}

                {'observacoes' in selectedItem && selectedItem.observacoes && (
                  <div>
                    <label className="text-gray-400 text-sm">Observações</label>
                    <p className="text-seguranca-lightgray">{selectedItem.observacoes}</p>
                  </div>
                )}

                <div>
                  <label className="text-gray-400 text-sm">Data de Criação</label>
                  <p className="text-seguranca-lightgray">{formatDate(selectedItem.createdAt)}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )
      )}

      {/* Modal de Relatórios */}
      {reportModalOpen && (
        <FeriasReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
        />
      )}

      {/* Modal de Aprovação */}
      {approvalModalOpen && selectedItem && (
        <ApprovalModal
          isOpen={approvalModalOpen}
          onClose={handleApprovalClose}
          item={selectedItem}
          type={selectedItem && 'tipo' in selectedItem && (selectedItem.tipo === 'FERIAS_NORMAIS' || selectedItem.tipo === 'FERIAS_VENDIDAS' || selectedItem.tipo === 'ABONO_PECUNIARIO') ? 'ferias' : 'afastamento'}
        />
      )}
    </StandardLayout>
  );
};

export default FeriasPage; 