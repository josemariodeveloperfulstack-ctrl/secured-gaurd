import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Building,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  X,
  Mail,
  Phone,
  FileText,
  ChevronDown,
  Download,
  Send,
  Eye,
  Edit,
  Trash2,
  CreditCard,
  BarChart3,
  PieChart,
  FileDown,
  Check
} from 'lucide-react';
import { ContasAReceberGuard } from './FinanceiroPermissionGuard';
import { ContasAReceberFormModal } from './ContasAReceberFormModal';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, isAfter, isBefore, startOfMonth, endOfMonth, startOfDay, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { DateRange } from 'react-day-picker';
import { contasAReceberService, Cliente, ContaAReceber } from '@/services/contasAReceberService';
import { unitService } from '@/services/unitService';

interface HistoricoCobranca {
  id: string;
  data: string;
  tipo: 'email' | 'telefone' | 'whatsapp' | 'carta' | 'visita';
  descricao: string;
  usuario: string;
  resultado: 'enviado' | 'lido' | 'respondido' | 'promessa' | 'sem_resposta';
}

/** Status vindo do serviço (mapBackendStatusToFrontend) ou legado da API */
function isStatusVencida(s: string | undefined) {
  return s === 'VENCIDA' || s === 'OVERDUE';
}
function isStatusRecebida(s: string | undefined) {
  return s === 'RECEBIDA' || s === 'PAID' || s === 'PAID_PREVIOUSLY';
}
function isStatusAberta(s: string | undefined) {
  return s === 'ABERTA' || s === 'PENDING' || s === 'PENDING_ERROR' || s === 'SOLICITADA';
}
function isStatusCancelada(s: string | undefined) {
  return s === 'CANCELADA' || s === 'CANCELLED';
}

function mapBackendStatusToFrontend(s: string | undefined): 'ABERTA' | 'RECEBIDA' | 'VENCIDA' | 'CANCELADA' {
  if (isStatusRecebida(s)) return 'RECEBIDA';
  if (isStatusCancelada(s)) return 'CANCELADA';
  if (isStatusVencida(s)) return 'VENCIDA';
  return 'ABERTA';
}

/** Dias até o vencimento (0 = hoje) para considerar "vencendo" em amarelo */
const DIAS_ALERTA_VENCIMENTO = 7;

const statusPillClass =
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ring-offset-background';

/**
 * Cores: pago → verde; vencendo (até N dias) → amarelo; vencida → vermelho.
 * Pendente distante e cancelado usam tons neutros.
 */
function getContaReceberStatusVisual(conta: ContaAReceber): { label: string; className: string } {
  if (isStatusCancelada(conta.status)) {
    return {
      label: 'Cancelado',
      className: 'border-gray-600 bg-gray-800/90 text-gray-300'
    };
  }
  if (isStatusRecebida(conta.status)) {
    return {
      label: 'Pago',
      className: 'border-transparent bg-green-600 text-white shadow-sm hover:bg-green-600/90'
    };
  }

  let due: Date;
  try {
    due = startOfDay(new Date(conta.dueDate || conta.vencimento));
    if (Number.isNaN(due.getTime())) {
      due = startOfDay(new Date());
    }
  } catch {
    due = startOfDay(new Date());
  }
  const today = startOfDay(new Date());
  const daysUntil = differenceInCalendarDays(due, today);

  const emAtraso =
    isStatusVencida(conta.status) || (conta.overdueDays ?? 0) > 0 || daysUntil < 0;

  if (emAtraso) {
    return {
      label: 'Vencido',
      className: 'border-transparent bg-red-600 text-white shadow-sm hover:bg-red-600/90'
    };
  }

  if (daysUntil >= 0 && daysUntil <= DIAS_ALERTA_VENCIMENTO) {
    return {
      label: daysUntil === 0 ? 'Vence hoje' : 'Vencendo',
      className: 'border-transparent bg-amber-500 text-black shadow-sm hover:bg-amber-500/90'
    };
  }

  return {
    label: 'Pendente',
    className: 'border-gray-600 bg-gray-700/90 text-seguranca-lightgray hover:bg-gray-700'
  };
}

export const ContasAReceber: React.FC = () => {
  const { user } = useAuth();
  const [contas, setContas] = useState<ContaAReceber[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [filterCliente, setFilterCliente] = useState('all');
  const [filterUnit, setFilterUnit] = useState('all');
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');
  const [units, setUnits] = useState<any[]>([]);
  // Período por padrão: mês atual (igual ao Contas a Pagar)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  // Estados do modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedConta, setSelectedConta] = useState<ContaAReceber | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showCobrancaModal, setShowCobrancaModal] = useState(false);
  const [cobrancaTexto, setCobrancaTexto] = useState('');
  const [cobrancaTipo, setCobrancaTipo] = useState<'email' | 'whatsapp' | 'telefone'>('email');
  const [exportLoading, setExportLoading] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contaToDelete, setContaToDelete] = useState<ContaAReceber | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [contaParaMarcarPaga, setContaParaMarcarPaga] = useState<ContaAReceber | null>(null);
  
  // Novos estados para alteração de status
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<'ABERTA' | 'RECEBIDA' | 'VENCIDA' | 'CANCELADA'>('ABERTA');
  const [selectedPaymentDate, setSelectedPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const { toast } = useToast();

  const canEditReceivable = Boolean(user?.permissions?.FINANCIAL_RECEIVABLE_WRITE);

  // Funções de cobrança e gestão

  // Funções do modal
  const handleOpenFormModal = (conta?: ContaAReceber) => {
    if (conta) {
      setSelectedConta(conta);
      setEditMode(true);
    } else {
      setSelectedConta(null);
      setEditMode(false);
    }
    setShowFormModal(true);
  };

  const handleCloseFormModal = () => {
    setShowFormModal(false);
    setSelectedConta(null);
    setEditMode(false);
  };

  const handleFormSuccess = () => {
    loadContas();
    handleCloseFormModal();
  };
  const handleCobrancaAutomatica = async (contaId: string, tipo: 'email' | 'whatsapp' | 'telefone') => {
    try {
      // Implementar envio de cobrança automática
      const conta = contas.find(c => c.id === contaId);
      if (!conta) return;

      const novoHistorico: HistoricoCobranca = {
        id: Date.now().toString(),
        data: new Date().toISOString(),
        tipo,
        descricao: `Cobrança automática enviada via ${tipo}`,
        usuario: 'Sistema',
        resultado: 'enviado'
      };

      // Atualizar histórico da conta
      setContas(prev => prev.map(c =>
        c.id === contaId
          ? { ...c, historicoCobranca: [...c.historicoCobranca, novoHistorico] }
          : c
      ));

      toast({
        title: 'Cobrança Enviada',
        description: `Cobrança enviada via ${tipo} para ${conta.client?.name || 'cliente'}`
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao enviar cobrança',
        variant: 'destructive'
      });
    }
  };

  const handleCobrancaPersonalizada = async () => {
    if (!selectedConta || !cobrancaTexto.trim()) return;

    try {
      const novoHistorico: HistoricoCobranca = {
        id: Date.now().toString(),
        data: new Date().toISOString(),
        tipo: cobrancaTipo,
        descricao: cobrancaTexto,
        usuario: 'Usuário Atual',
        resultado: 'enviado'
      };

      setContas(prev => prev.map(c =>
        c.id === selectedConta.id
          ? { ...c, historicoCobranca: [...c.historicoCobranca, novoHistorico] }
          : c
      ));

      setShowCobrancaModal(false);
      setCobrancaTexto('');
      setSelectedConta(null);

      toast({
        title: 'Cobrança Enviada',
        description: `Cobrança personalizada enviada para ${selectedConta.client?.name || 'cliente'}`
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao enviar cobrança personalizada',
        variant: 'destructive'
      });
    }
  };

  const downloadContasReceberPdf = async (opts: {
    segment?: string | null;
    includePeriod?: boolean;
    filePrefix: string;
    successDescription: string;
  }) => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams();
      if (opts.includePeriod) {
        const startDate = dateRange?.from
          ? format(dateRange.from, 'yyyy-MM-dd')
          : format(startOfMonth(new Date()), 'yyyy-MM-dd');
        const endDate = dateRange?.to
          ? format(dateRange.to, 'yyyy-MM-dd')
          : format(endOfMonth(new Date()), 'yyyy-MM-dd');
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      }
      
      if (filterStatus !== 'all') params.set('statusFilter', filterStatus);
      if (filterCliente !== 'all') params.set('clientFilter', filterCliente);
      if (filterUnit !== 'all') params.set('unitFilter', filterUnit);
      if (filterCategoria !== 'all') params.set('categoryFilter', filterCategoria);
      if (filterAmountMin) params.set('amountMin', filterAmountMin);
      if (filterAmountMax) params.set('amountMax', filterAmountMax);
      
      if (opts.segment) {
        params.set('reportSegment', opts.segment);
      }

      const qs = params.toString();
      const url = `/api/accounts-receivable/reports/pdf${qs ? `?${qs}` : ''}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Falha ao gerar relatório no servidor');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `${opts.filePrefix}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: 'Sucesso',
        description: opts.successDescription
      });
    } catch (error) {
      console.error('Erro ao exportar PDF de contas a receber:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar relatório no servidor. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setExportLoading(false);
    }
  };

  const downloadSingleAccountPdf = async (conta: ContaAReceber) => {
    if (!conta.id) return;
    setExportLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('selectedIds', conta.id);
      
      const qs = params.toString();
      const url = `/api/accounts-receivable/reports/pdf?${qs}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Falha ao gerar PDF');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `fatura-${conta.invoiceNumber || conta.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: 'Sucesso',
        description: 'PDF da conta gerado com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao gerar PDF individual:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar o PDF. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedConta?.id) return;
    
    setUpdatingStatus(true);
    try {
      if (newStatus === 'RECEBIDA') {
        // Se for marcar como paga, usa o método específico que aceita a data
        await contasAReceberService.markContaAReceberAsPaid(selectedConta.id, selectedPaymentDate);
      } else {
        // Para outros status, usa o update genérico
        await contasAReceberService.updateContaAReceber(selectedConta.id, {
          status: newStatus
        });
      }
      
      toast({
        title: 'Sucesso',
        description: 'Status da conta atualizado com sucesso!'
      });
      loadContas();
      setShowStatusModal(false);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleViewConta = (conta: ContaAReceber) => {
    setSelectedConta(conta);
    setShowViewModal(true);
  };

  const handleEditConta = (conta: ContaAReceber) => {
    handleOpenFormModal(conta);
  };

  const handleMarkPaidFromStatus = async (conta: ContaAReceber) => {
    if (!conta.id) return;
    setMarkingPaidId(conta.id);
    try {
      const hoje = format(new Date(), 'yyyy-MM-dd');
      await contasAReceberService.markContaAReceberAsPaid(conta.id, hoje);
      toast({
        title: 'Conta atualizada',
        description: 'Marcada como paga com a data de hoje.'
      });
      await loadContas();
      setContaParaMarcarPaga(null);
    } catch (error) {
      console.error('Erro ao marcar como pago:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar como pago. Verifique sua permissão ou tente pelo formulário de edição.',
        variant: 'destructive'
      });
    } finally {
      setMarkingPaidId(null);
    }
  };

  const handleDeleteClick = (conta: ContaAReceber) => {
    setContaToDelete(conta);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!contaToDelete?.id) return;

    setDeleting(true);
    try {
      await contasAReceberService.deleteContaAReceber(contaToDelete.id);
      toast({
        title: 'Sucesso',
        description: 'Conta a receber excluída com sucesso!'
      });
      loadContas();
      setShowDeleteConfirm(false);
      setContaToDelete(null);
    } catch (error) {
      console.error('Erro ao deletar conta:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir conta a receber. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
    }
  };

  const calcularEstatisticas = (listaParaCalcular: ContaAReceber[]) => {
    const total = listaParaCalcular.length;
    const valorTotal = listaParaCalcular.reduce((sum, c) => sum + (c?.amount || c?.valor || 0), 0);
    const valorPago = listaParaCalcular.reduce((sum, c) => sum + (c?.amountPaid || 0), 0);
    const valorPendente = listaParaCalcular.reduce((sum, c) => sum + (c?.pendingAmount || 0), 0);
    const vencidas = listaParaCalcular.filter(c => c?.status === 'OVERDUE' || c?.status === 'VENCIDA').length;
    const valorVencido = listaParaCalcular
      .filter(c => c?.status === 'OVERDUE' || c?.status === 'VENCIDA')
      .reduce((sum, c) => sum + (c?.pendingAmount || c?.amount || c?.valor || 0), 0);

    const contasComAtraso = listaParaCalcular.filter(c => (c?.overdueDays || 0) > 0);
    const mediaAtraso = contasComAtraso.length > 0
      ? contasComAtraso.reduce((sum, c) => sum + (c?.overdueDays || 0), 0) / contasComAtraso.length
      : 0;

    // Distribuição por status (somatório de valores por status)
    const porStatus: Record<string, number> = listaParaCalcular.reduce((acc, conta) => {
      if (!conta) return acc;
      const key = conta.status || 'UNKNOWN';
      const valor = typeof conta.amount === 'number' ? conta.amount : (conta.valor || 0);
      acc[key] = (acc[key] || 0) + valor;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      valorTotal: isNaN(valorTotal) ? 0 : valorTotal,
      valorPago: isNaN(valorPago) ? 0 : valorPago,
      valorPendente: isNaN(valorPendente) ? 0 : valorPendente,
      vencidas,
      valorVencido: isNaN(valorVencido) ? 0 : valorVencido,
      mediaAtraso: Math.round(mediaAtraso) || 0,
      taxaInadimplencia: total > 0 ? (vencidas / total * 100) : 0,
      porStatus
    };
  };

  // Função para carregar contas e clientes
  const loadContas = async () => {
    try {
      setLoading(true);
      console.log('Carregando dados de Contas a Receber...');

      // Carregar contas a receber
      const contasData = await contasAReceberService.getContasAReceber();
      console.log('Contas carregadas:', contasData);
      setContas(contasData);

      // Carregar clientes
      const clientesData = await contasAReceberService.getClientes();
      console.log('Clientes carregados:', clientesData);
      setClientes(clientesData);

      // Carregar filiais (empresas)
      try {
        const unitsData = await unitService.getUnits();
        setUnits(unitsData);
      } catch (err) {
        console.error('Erro ao carregar filiais:', err);
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados reais da API
  useEffect(() => {
    loadContas();
  }, []);

  // Filtros aplicados
  const filteredContas = contas.filter(conta => {
    if (!conta) return false;

    const q = searchTerm.toLowerCase();
    const matchesSearch =
      (conta.client?.name?.toLowerCase().includes(q) || false) ||
      (typeof conta.cliente === 'string' && conta.cliente.toLowerCase().includes(q)) ||
      (conta.invoiceNumber?.toLowerCase().includes(q) || false) ||
      (conta.numeroFatura?.toLowerCase().includes(q) || false) ||
      (conta.description?.toLowerCase().includes(q) || false) ||
      (conta.descricao?.toLowerCase().includes(q) || false);
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'ABERTA' && isStatusAberta(conta.status)) ||
      (filterStatus === 'RECEBIDA' && isStatusRecebida(conta.status)) ||
      (filterStatus === 'VENCIDA' && isStatusVencida(conta.status)) ||
      (filterStatus === 'CANCELADA' && isStatusCancelada(conta.status));
    const matchesCategoria = filterCategoria === 'all' || conta.categoria === filterCategoria;
    const matchesCliente = filterCliente === 'all' || conta.client?.id === filterCliente;
    const matchesUnit = filterUnit === 'all' || conta.unit?.id === filterUnit || conta.empresaId === filterUnit;

    // Filtro por data
    let matchesDate = true;
    if (dateRange?.from && dateRange?.to) {
      try {
        const contaDate = new Date(conta.dueDate);
        if (isNaN(contaDate.getTime())) return false;
        matchesDate = contaDate >= dateRange.from && contaDate <= dateRange.to;
      } catch {
        matchesDate = false;
      }
    }

    return matchesSearch && matchesStatus && matchesCategoria && matchesCliente && matchesUnit && matchesDate;
  });

  const stats = calcularEstatisticas(filteredContas);

  return (
    <ContasAReceberGuard requiredPermission="VIEW_ACCOUNTS_RECEIVABLE">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-seguranca-lightgray">Contas a Receber</h1>
            <p className="text-gray-400">Gerencie suas contas a receber e controle de inadimplência</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  disabled={exportLoading}
                  className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-graphite hover:text-seguranca-yellow"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Relatórios PDF
                  <ChevronDown className="w-4 h-4 ml-2 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-[14rem] border-gray-600 bg-seguranca-black text-seguranca-lightgray"
              >
                <DropdownMenuItem
                  className="cursor-pointer focus:bg-seguranca-graphite focus:text-seguranca-yellow"
                  onClick={() =>
                    downloadContasReceberPdf({
                      includePeriod: true,
                      filePrefix: 'relatorio-contas-a-receber',
                      successDescription: 'Relatório por período (data de vencimento) gerado com sucesso.'
                    })
                  }
                >
                  Por período (Vencimento)
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer focus:bg-seguranca-graphite focus:text-seguranca-yellow"
                  onClick={() =>
                    downloadContasReceberPdf({
                      segment: 'RECEBIDOS',
                      filePrefix: 'relatorio-contas-recebidas',
                      successDescription: 'Relatório de contas recebidas (pagas) gerado com sucesso.'
                    })
                  }
                >
                  Recebidos
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer focus:bg-seguranca-graphite focus:text-seguranca-yellow"
                  onClick={() =>
                    downloadContasReceberPdf({
                      segment: 'A_VENCER',
                      filePrefix: 'relatorio-contas-a-vencer',
                      successDescription: 'Relatório de contas a vencer gerado com sucesso.'
                    })
                  }
                >
                  A vencer
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer focus:bg-seguranca-graphite focus:text-seguranca-yellow"
                  onClick={() =>
                    downloadContasReceberPdf({
                      segment: 'VENCIDOS',
                      filePrefix: 'relatorio-contas-vencidas',
                      successDescription: 'Relatório de contas vencidas (não pagas) gerado com sucesso.'
                    })
                  }
                >
                  Vencidos
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer focus:bg-seguranca-graphite focus:text-seguranca-yellow"
                  onClick={() =>
                    downloadContasReceberPdf({
                      segment: 'INADIMPLENCIA',
                      filePrefix: 'relatorio-inadimplencia',
                      successDescription: 'Relatório de inadimplência (status vencido) gerado com sucesso.'
                    })
                  }
                >
                  Inadimplência
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={() => handleOpenFormModal()}
              className="flex items-center gap-2 bg-seguranca-red text-white hover:bg-seguranca-red/90"
            >
              <Plus className="w-4 h-4" />
              Nova Conta
            </Button>
          </div>
        </div>


        {/* Filtros */}
        <Card className="bg-seguranca-graphite border-gray-700">
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Campo de busca */}
              <div className="w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por cliente, fatura ou descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-600 bg-seguranca-black text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                  />
                </div>
              </div>

              {/* Filtros básicos */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-black border-gray-600">
                      <SelectItem value="all" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Todos Status</SelectItem>
                      <SelectItem value="ABERTA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Pendente / Aberta</SelectItem>
                      <SelectItem value="RECEBIDA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Pago / Recebida</SelectItem>
                      <SelectItem value="VENCIDA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Vencido</SelectItem>
                      <SelectItem value="CANCELADA" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                    <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-black border-gray-600">
                      <SelectItem value="all" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Todas</SelectItem>
                      <SelectItem value="servicos" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Serviços</SelectItem>
                      <SelectItem value="produtos" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Produtos</SelectItem>
                      <SelectItem value="consultoria" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Consultoria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-graphite hover:text-seguranca-yellow"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros Avançados
                </Button>
              </div>
            </div>

            {/* Filtros Avançados */}
            {showAdvancedFilters && (
              <div className="mt-4 pt-4 border-t border-gray-700 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-seguranca-lightgray mb-2 block">Período de Vencimento</label>
                    <DatePickerWithRange
                      date={dateRange}
                      onDateChange={setDateRange}
                      placeholder="Selecione o período"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="text-sm font-medium text-seguranca-lightgray mb-2 block">Empresa</label>
                    <Select value={filterUnit} onValueChange={setFilterUnit}>
                      <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                        <SelectValue placeholder="Selecionar empresa" />
                      </SelectTrigger>
                      <SelectContent className="bg-seguranca-black border-gray-600">
                        <SelectItem value="all" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Todas as Empresas</SelectItem>
                        {units && Array.isArray(units) ? units
                          .filter(unit => unit && unit.id && unit.name)
                          .map(unit => (
                            <SelectItem key={unit.id} value={unit.id} className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                              {unit.name}
                            </SelectItem>
                          )) : null}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1">
                    <label className="text-sm font-medium text-seguranca-lightgray mb-2 block">Cliente</label>
                    <Select value={filterCliente} onValueChange={setFilterCliente}>
                      <SelectTrigger className="border-gray-600 bg-seguranca-black text-seguranca-lightgray focus:border-seguranca-yellow focus:ring-seguranca-yellow">
                        <SelectValue placeholder="Selecionar cliente" />
                      </SelectTrigger>
                      <SelectContent className="bg-seguranca-black border-gray-600">
                        <SelectItem value="all" className="text-seguranca-lightgray hover:bg-seguranca-graphite">Todos os Clientes</SelectItem>
                        {clientes && Array.isArray(clientes) ? clientes
                          .filter(cliente => cliente && cliente.id && cliente.name)
                          .map(cliente => (
                            <SelectItem key={cliente.id} value={cliente.id} className="text-seguranca-lightgray hover:bg-seguranca-graphite">
                              {cliente.name}
                            </SelectItem>
                          )) : null}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1">
                    <label className="text-sm font-medium text-seguranca-lightgray mb-2 block">Valor Mínimo</label>
                    <Input
                      type="number"
                      placeholder="R$ 0,00"
                      value={filterAmountMin}
                      onChange={(e) => setFilterAmountMin(e.target.value)}
                      className="border-gray-600 bg-seguranca-black text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="text-sm font-medium text-seguranca-lightgray mb-2 block">Valor Máximo</label>
                    <Input
                      type="number"
                      placeholder="R$ 0,00"
                      value={filterAmountMax}
                      onChange={(e) => setFilterAmountMax(e.target.value)}
                      className="border-gray-600 bg-seguranca-black text-seguranca-lightgray placeholder:text-gray-400 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterStatus('all');
                      setFilterCategoria('all');
                      setFilterCliente('all');
                      setFilterUnit('all');
                      setFilterAmountMin('');
                      setFilterAmountMax('');
                      setDateRange(undefined);
                    }}
                    className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-graphite hover:text-seguranca-yellow"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Limpar Filtros
                  </Button>
                </div>

                <div className="text-sm text-gray-400">
                  Mostrando {filteredContas.length} de {contas.length} contas
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="lista">Lista de Contas</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="space-y-6">
              {/* Cards de Resumo */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-seguranca-graphite border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-seguranca-lightgray">Total a Receber</p>
                        <p className="text-2xl font-bold text-seguranca-yellow">
                          R$ {(contas.reduce((sum, c) => sum + (c?.amount || 0), 0) || 0).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-seguranca-yellow/20 rounded-lg flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-seguranca-yellow" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-seguranca-graphite border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-seguranca-lightgray">Valor Recebido</p>
                        <p className="text-2xl font-bold text-seguranca-yellow">
                          R$ {(contas.reduce((sum, c) => sum + (c?.amountPaid || 0), 0) || 0).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-seguranca-yellow/20 rounded-lg flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-seguranca-yellow" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-seguranca-graphite border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-seguranca-lightgray">Valor Vencido</p>
                        <p className="text-2xl font-bold text-seguranca-red">
                          R$ {(contas.filter(c => isStatusVencida(c?.status)).reduce((sum, c) => sum + (c?.amount || 0), 0) || 0).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-seguranca-red/20 rounded-lg flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-seguranca-red" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-seguranca-graphite border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-seguranca-lightgray">Taxa Inadimplência</p>
                        <p className="text-2xl font-bold text-seguranca-red">
                          {contas.length > 0 ? ((contas.filter(c => isStatusVencida(c.status)).length / contas.length) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-seguranca-red/20 rounded-lg flex items-center justify-center">
                        <TrendingDown className="h-6 w-6 text-seguranca-red" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos Principais */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico de Status - Pizza */}
                <Card className="bg-seguranca-graphite border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-seguranca-lightgray">
                      <PieChart className="h-5 w-5 text-seguranca-yellow" />
                      Distribuição por Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { status: 'ABERTA', label: 'Abertas / Pendentes', color: 'bg-seguranca-lightgray', count: contas.filter(c => isStatusAberta(c.status)).length },
                        { status: 'RECEBIDA', label: 'Recebidas', color: 'bg-seguranca-yellow', count: contas.filter(c => isStatusRecebida(c.status)).length },
                        { status: 'VENCIDA', label: 'Vencidas', color: 'bg-seguranca-red', count: contas.filter(c => isStatusVencida(c.status)).length },
                        { status: 'CANCELADA', label: 'Canceladas', color: 'bg-gray-500', count: contas.filter(c => isStatusCancelada(c.status)).length }
                      ].map((item) => {
                        const percentage = contas.length > 0 ? (item.count / contas.length) * 100 : 0;
                        return (
                          <div key={item.status} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 ${item.color} rounded-full`}></div>
                                <span className="text-sm text-seguranca-lightgray">{item.label}</span>
                              </div>
                              <span className="font-semibold text-seguranca-lightgray">{item.count}</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${item.color}`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-400 text-right">{percentage.toFixed(1)}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Gráfico de Valores - Barras */}
                <Card className="bg-seguranca-graphite border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-seguranca-lightgray">
                      <BarChart3 className="h-5 w-5 text-seguranca-yellow" />
                      Valores por Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        {
                          label: 'Total a Receber',
                          value: contas.reduce((sum, c) => sum + c.amount, 0),
                          color: 'bg-seguranca-yellow',
                          textColor: 'text-seguranca-yellow'
                        },
                        {
                          label: 'Valor Recebido',
                          value: contas.reduce((sum, c) => sum + (c?.amountPaid || 0), 0),
                          color: 'bg-seguranca-yellow',
                          textColor: 'text-seguranca-yellow'
                        },
                        {
                          label: 'Valor Pendente',
                          value: contas.reduce((sum, c) => sum + (c?.pendingAmount || 0), 0),
                          color: 'bg-seguranca-red',
                          textColor: 'text-seguranca-red'
                        },
                        {
                          label: 'Valor Vencido',
                          value: contas.filter(c => isStatusVencida(c.status)).reduce((sum, c) => sum + c.amount, 0),
                          color: 'bg-seguranca-red',
                          textColor: 'text-seguranca-red'
                        }
                      ].map((item) => {
                        const maxValue = Math.max(
                          contas.reduce((sum, c) => sum + (c?.amount || c?.valor || 0), 0),
                          contas.reduce((sum, c) => sum + (c?.amountPaid || 0), 0),
                          contas.reduce((sum, c) => sum + (c?.pendingAmount || 0), 0),
                          contas.filter(c => c?.status === 'OVERDUE' || c?.status === 'VENCIDA').reduce((sum, c) => sum + (c?.amount || c?.valor || 0), 0)
                        );
                        const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;

                        return (
                          <div key={item.label} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-seguranca-lightgray">{item.label}</span>
                              <span className={`font-semibold ${item.textColor}`}>
                                R$ {item.value.toLocaleString('pt-BR')}
                              </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full ${item.color}`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Análise de Inadimplência */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Clientes por Valor */}
                <Card className="bg-seguranca-graphite border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-seguranca-lightgray">
                      <User className="h-5 w-5 text-seguranca-yellow" />
                      Top Clientes por Valor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {contas
                        .sort((a, b) => (b?.amount || b?.valor || 0) - (a?.amount || a?.valor || 0))
                        .slice(0, 5)
                        .map((conta, index) => {
                          const statusVisual = getContaReceberStatusVisual(conta);
                          return (
                          <div key={conta.id} className="flex items-center justify-between p-3 bg-seguranca-black/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-seguranca-yellow/20 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-seguranca-yellow">{index + 1}</span>
                              </div>
                              <div>
                                <p className="font-medium text-seguranca-lightgray">{conta.client?.name || '-'}</p>
                                <p className="text-xs text-gray-400">{conta.invoiceNumber || '-'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-seguranca-yellow">
                                R$ {((conta?.amount || conta?.valor || 0) as number).toLocaleString('pt-BR')}
                              </p>
                              <span
                                className={cn(
                                  statusPillClass,
                                  'text-xs',
                                  statusVisual.className
                                )}
                              >
                                {statusVisual.label}
                              </span>
                            </div>
                          </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>

                {/* Contas Vencidas */}
                <Card className="bg-seguranca-graphite border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-seguranca-lightgray">
                      <AlertCircle className="h-5 w-5 text-seguranca-red" />
                      Contas Vencidas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {contas
                        .filter(c => isStatusVencida(c.status))
                        .sort((a, b) => b.overdueDays - a.overdueDays)
                        .slice(0, 5)
                        .map((conta) => (
                          <div key={conta.id} className="flex items-center justify-between p-3 bg-seguranca-red/10 border border-seguranca-red/20 rounded-lg">
                            <div>
                              <p className="font-medium text-seguranca-lightgray">{conta.client?.name || '-'}</p>
                              <p className="text-xs text-gray-400">{conta.invoiceNumber || '-'}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-seguranca-red">
                                R$ {((conta?.amount || conta?.valor || 0) as number).toLocaleString('pt-BR')}
                              </p>
                              <p className="text-xs text-seguranca-red">
                                {conta.overdueDays} dias em atraso
                              </p>
                            </div>
                          </div>
                        ))}
                      {contas.filter(c => isStatusVencida(c.status)).length === 0 && (
                        <div className="text-center py-8">
                          <CheckCircle className="h-12 w-12 text-seguranca-yellow mx-auto mb-2" />
                          <p className="text-seguranca-lightgray">Nenhuma conta vencida!</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="lista" className="space-y-4">
            {/* Tabela de Contas */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-seguranca-graphite border-b border-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-seguranca-lightgray uppercase tracking-wider">
                          Cliente / Fatura
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-seguranca-lightgray uppercase tracking-wider">
                          Medição
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-seguranca-lightgray uppercase tracking-wider">
                          Valor
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-seguranca-lightgray uppercase tracking-wider">
                          Vencimento
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-seguranca-lightgray uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-seguranca-lightgray uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-seguranca-black divide-y divide-gray-700">
                      {filteredContas.map((conta) => (
                        <tr key={conta.id} className="hover:bg-seguranca-graphite/50">
                          <td className="px-4 py-4">
                            <div>
                              <div className="font-medium text-seguranca-lightgray">{conta.client?.name || conta.cliente || '-'}</div>
                              <div className="text-sm text-gray-400">
                                Fatura: {conta.invoiceNumber || conta.numeroFatura || '-'}
                              </div>
                              <div className="text-sm text-gray-400">{conta.description || conta.descricao || '-'}</div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-seguranca-lightgray">
                              {conta.measurementNumber || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div>
                              <div className="font-medium text-seguranca-yellow">
                                R$ {((conta?.amount || conta?.valor || 0) as number).toLocaleString('pt-BR')}
                              </div>
                              {(conta?.amountPaid || 0) > 0 && (
                                <div className="text-sm text-seguranca-yellow">
                                  Pago: R$ {((conta?.amountPaid || 0) as number).toLocaleString('pt-BR')}
                                </div>
                              )}
                              {(conta?.pendingAmount || 0) > 0 && (
                                <div className="text-sm text-seguranca-red">
                                  Pendente: R$ {((conta?.pendingAmount || 0) as number).toLocaleString('pt-BR')}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div>
                              <div className="text-sm text-seguranca-lightgray">
                                {format(new Date(conta.dueDate || conta.vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                              </div>
                              {conta.overdueDays > 0 && (
                                <div className="text-sm text-seguranca-red">
                                  {conta.overdueDays} dias em atraso
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {(() => {
                              const visual = getContaReceberStatusVisual(conta);
                              const podeAtalhoStatus =
                                canEditReceivable &&
                                !isStatusRecebida(conta.status) &&
                                !isStatusCancelada(conta.status);
                              if (podeAtalhoStatus) {
                                return (
                                  <button
                                    type="button"
                                    disabled={markingPaidId === conta.id}
                                    title="Clique para marcar como pago (com confirmação)"
                                    onClick={() => setContaParaMarcarPaga(conta)}
                                    className={cn(
                                      statusPillClass,
                                      visual.className,
                                      'cursor-pointer disabled:opacity-60'
                                    )}
                                  >
                                    {markingPaidId === conta.id ? 'Salvando…' : visual.label}
                                  </button>
                                );
                              }
                              return (
                                <span className={cn(statusPillClass, visual.className)}>
                                  {visual.label}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-graphite hover:text-seguranca-yellow"
                                onClick={() => handleViewConta(conta)}
                                title="Visualizar detalhes"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-graphite hover:text-seguranca-yellow"
                                onClick={() => handleEditConta(conta)}
                                title="Editar conta"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-graphite hover:text-seguranca-yellow"
                                onClick={() => {
                                  setSelectedConta(conta);
                                  setNewStatus(mapBackendStatusToFrontend(conta.status) as any);
                                  setShowStatusModal(true);
                                }}
                                title="Alterar status"
                              >
                                <DollarSign className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-graphite hover:text-seguranca-yellow"
                                onClick={() => downloadSingleAccountPdf(conta)}
                                title="Gerar PDF"
                                disabled={exportLoading}
                              >
                                <FileDown className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-gray-600 text-seguranca-red hover:bg-seguranca-graphite hover:text-red-700"
                                onClick={() => handleDeleteClick(conta)}
                                title="Excluir conta"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* Modal de Alteração de Status */}
        <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
          <DialogContent className="max-w-md bg-seguranca-graphite border-gray-600 text-white">
            <DialogHeader>
              <DialogTitle className="text-seguranca-yellow flex items-center gap-2">
                <Check className="w-5 h-5" />
                Alterar Status da Cobrança
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                Atualize o status da conta para {selectedConta?.client?.name || selectedConta?.cliente || 'o cliente'}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-seguranca-lightgray">Novo Status</Label>
                <Select value={newStatus} onValueChange={(val: any) => setNewStatus(val)}>
                  <SelectTrigger className="bg-seguranca-black border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-seguranca-black border-gray-600 text-white">
                    <SelectItem value="ABERTA">Pendente / Aberta</SelectItem>
                    <SelectItem value="RECEBIDA">Pago / Recebida</SelectItem>
                    <SelectItem value="VENCIDA">Vencido</SelectItem>
                    <SelectItem value="CANCELADA">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newStatus === 'RECEBIDA' && (
                <div className="space-y-2">
                  <Label className="text-seguranca-lightgray">Data do Recebimento</Label>
                  <Input
                    type="date"
                    value={selectedPaymentDate}
                    onChange={(e) => setSelectedPaymentDate(e.target.value)}
                    className="bg-seguranca-black border-gray-600 text-white"
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowStatusModal(false)}
                className="border-gray-600 text-white hover:bg-seguranca-black"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleUpdateStatus}
                disabled={updatingStatus}
                className="bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-black"
              >
                {updatingStatus ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Confirmar Alteração
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Formulário */}
        <ContasAReceberFormModal
          open={showFormModal}
          onOpenChange={handleCloseFormModal}
          onSuccess={handleFormSuccess}
          editMode={editMode}
          initialData={selectedConta}
        />

        {/* Modal de Visualização */}
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-seguranca-graphite border-gray-600 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-seguranca-yellow flex items-center gap-2">
                <Eye size={20} />
                Detalhes da Conta a Receber
              </DialogTitle>
            </DialogHeader>
            {selectedConta && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-seguranca-lightgray">Cliente</Label>
                    <p className="text-white font-medium">{selectedConta.client?.name || selectedConta.cliente || 'Não informado'}</p>
                  </div>
                  <div>
                    <Label className="text-seguranca-lightgray">Número da Fatura</Label>
                    <p className="text-white font-medium">{selectedConta.invoiceNumber || selectedConta.numeroFatura || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-seguranca-lightgray">Descrição</Label>
                    <p className="text-white font-medium">{selectedConta.descricao || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-seguranca-lightgray">Valor Total</Label>
                    <p className="text-seguranca-yellow font-bold text-lg">
                      R$ {((selectedConta.amount || selectedConta.valor || 0) as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-seguranca-lightgray">Valor Pago</Label>
                    <p className="text-seguranca-yellow font-medium">
                      R$ {((selectedConta.amountPaid || 0) as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-seguranca-lightgray">Valor Pendente</Label>
                    <p className="text-seguranca-red font-medium">
                      R$ {((selectedConta.pendingAmount || 0) as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-seguranca-lightgray">Data de Emissão</Label>
                    <p className="text-white font-medium">
                      {selectedConta.dataEmissao ? format(new Date(selectedConta.dataEmissao), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-seguranca-lightgray">Data de Vencimento</Label>
                    <p className="text-white font-medium">
                      {format(new Date(selectedConta.dueDate || selectedConta.vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-seguranca-lightgray">Status</Label>
                    <span
                      className={cn(
                        statusPillClass,
                        'mt-1',
                        getContaReceberStatusVisual(selectedConta).className
                      )}
                    >
                      {getContaReceberStatusVisual(selectedConta).label}
                    </span>
                  </div>
                  <div>
                    <Label className="text-seguranca-lightgray">Forma de Pagamento</Label>
                    <p className="text-white font-medium">{selectedConta.paymentMethod || 'PIX'}</p>
                  </div>
                  {selectedConta.overdueDays && selectedConta.overdueDays > 0 && (
                    <div>
                      <Label className="text-seguranca-lightgray">Dias em Atraso</Label>
                      <p className="text-seguranca-red font-medium">{selectedConta.overdueDays} dias</p>
                    </div>
                  )}
                  {selectedConta.observacoes && (
                    <div className="col-span-2">
                      <Label className="text-seguranca-lightgray">Observações</Label>
                      <p className="text-white">{selectedConta.observacoes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => setShowViewModal(false)}
                className="border-gray-600 text-white hover:bg-seguranca-black"
              >
                Fechar
              </Button>
              {selectedConta && (
                <Button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEditConta(selectedConta);
                  }}
                  className="bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-black"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!contaParaMarcarPaga}
          onOpenChange={(open) => {
            if (!open && !markingPaidId) {
              setContaParaMarcarPaga(null);
            }
          }}
        >
          <AlertDialogContent className="bg-seguranca-graphite border-gray-600 text-white sm:max-w-[440px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-seguranca-yellow">
                Marcar como pago?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                A conta será registrada como <strong>totalmente paga</strong>, com data de pagamento{' '}
                <strong>hoje</strong> ({format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}).
              </AlertDialogDescription>
            </AlertDialogHeader>
            {contaParaMarcarPaga && (
              <div className="space-y-1 text-sm text-seguranca-lightgray border border-gray-600/50 rounded-md p-3 bg-seguranca-black/40">
                <p>
                  <span className="text-gray-400">Cliente:</span>{' '}
                  {contaParaMarcarPaga.client?.name || contaParaMarcarPaga.cliente || '—'}
                </p>
                <p>
                  <span className="text-gray-400">Valor:</span>{' '}
                  R${' '}
                  {((contaParaMarcarPaga.amount || contaParaMarcarPaga.valor || 0) as number).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                  })}
                </p>
                {(contaParaMarcarPaga.invoiceNumber || contaParaMarcarPaga.numeroFatura) && (
                  <p>
                    <span className="text-gray-400">Fatura:</span>{' '}
                    {contaParaMarcarPaga.invoiceNumber || contaParaMarcarPaga.numeroFatura}
                  </p>
                )}
              </div>
            )}
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel
                disabled={!!markingPaidId}
                className="border-gray-600 bg-transparent text-white hover:bg-seguranca-black hover:text-white"
              >
                Cancelar
              </AlertDialogCancel>
              <Button
                disabled={!!markingPaidId}
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  if (contaParaMarcarPaga) {
                    void handleMarkPaidFromStatus(contaParaMarcarPaga);
                  }
                }}
              >
                {markingPaidId ? (
                  <>
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Salvando…
                  </>
                ) : (
                  'Confirmar pagamento'
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de Confirmação de Exclusão */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="sm:max-w-[425px] bg-seguranca-graphite border-gray-600 text-white">
            <DialogHeader>
              <DialogTitle className="text-seguranca-red">Confirmar Exclusão</DialogTitle>
              <DialogDescription className="text-gray-300">
                Tem certeza que deseja excluir esta conta a receber? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            {contaToDelete && (
              <div className="py-4">
                <p className="text-seguranca-lightgray">
                  <strong>Cliente:</strong> {contaToDelete.client?.name || contaToDelete.cliente || 'Não informado'}
                </p>
                <p className="text-seguranca-lightgray">
                  <strong>Valor:</strong> R$ {((contaToDelete.amount || contaToDelete.valor || 0) as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                {contaToDelete.invoiceNumber || contaToDelete.numeroFatura ? (
                  <p className="text-seguranca-lightgray">
                    <strong>Fatura:</strong> {contaToDelete.invoiceNumber || contaToDelete.numeroFatura}
                  </p>
                ) : null}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setContaToDelete(null);
                }}
                disabled={deleting}
                className="border-gray-600 text-white hover:bg-seguranca-black"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="bg-seguranca-red hover:bg-red-700 text-white"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ContasAReceberGuard>
  );
};

export default ContasAReceber;
