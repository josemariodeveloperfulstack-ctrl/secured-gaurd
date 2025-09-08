import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Building,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  DollarSign,
  Shield,
  Zap,
  FileText,
  Download,
  Upload,
  Settings,
  Target,
  TrendingDown,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Send,
  RefreshCw,
  Lock,
  Unlock,
  History,
  Bell,
  CheckSquare,
  X,
  GitBranch,
  Loader2
} from 'lucide-react';
import { PagamentosGuard } from './FinanceiroPermissionGuard';
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Pagamento {
  id: string;
  fornecedor: string;
  descricao: string;
  valor: number;
  dataSolicitacao: string;
  dataAprovacao?: string;
  dataExecucao?: string;
  status: 'pendente' | 'aprovado' | 'executado' | 'rejeitado' | 'cancelado';
  categoria: 'fornecedor' | 'servico' | 'equipamento' | 'imposto' | 'outros';
  formaPagamento: 'pix' | 'boleto' | 'transferencia' | 'cartao' | 'dinheiro';
  aprovador?: string;
  observacoes?: string;
  comprovante?: string;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  centroCusto?: string;
  numeroNF?: string;
  dataVencimento?: string;
  workflow: WorkflowEtapa[];
  limitesValidados: boolean;
  integracaoBancaria?: IntegracaoBancaria;
}

interface WorkflowEtapa {
  id: string;
  etapa: 'solicitacao' | 'aprovacao_gestor' | 'aprovacao_financeiro' | 'aprovacao_diretoria' | 'execucao' | 'confirmacao';
  responsavel: string;
  dataInicio?: string;
  dataConclusao?: string;
  status: 'pendente' | 'em_andamento' | 'concluido' | 'rejeitado';
  observacoes?: string;
  valorLimite?: number;
}

interface IntegracaoBancaria {
  banco: string;
  agencia: string;
  conta: string;
  chavePix?: string;
  codigoBarras?: string;
  statusIntegracao: 'pendente' | 'processando' | 'concluido' | 'erro';
  idTransacao?: string;
  comprovanteBancario?: string;
  dataProcessamento?: string;
}

interface LimitePagamento {
  id: string;
  tipo: 'diario' | 'mensal' | 'categoria' | 'fornecedor';
  valor: number;
  valorUtilizado: number;
  periodo: string;
  categoria?: string;
  fornecedor?: string;
  ativo: boolean;
}

interface NotificacaoPagamento {
  id: string;
  tipo: 'aprovacao_pendente' | 'limite_excedido' | 'vencimento_proximo' | 'pagamento_executado';
  titulo: string;
  descricao: string;
  pagamentoId: string;
  destinatario: string;
  dataEnvio: string;
  lida: boolean;
}

export const Pagamentos: React.FC = () => {
  const { toast } = useToast();
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [limites, setLimites] = useState<LimitePagamento[]>([]);
  const [notificacoes, setNotificacoes] = useState<NotificacaoPagamento[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [filterPrioridade, setFilterPrioridade] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [showLimitesModal, setShowLimitesModal] = useState(false);
  const [showIntegracaoModal, setShowIntegracaoModal] = useState(false);
  const [selectedPagamento, setSelectedPagamento] = useState<Pagamento | null>(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [integracaoLoading, setIntegracaoLoading] = useState(false);

  // Dados mockados para demonstração
  useEffect(() => {
    const mockPagamentos: Pagamento[] = [
      {
        id: 'PAG-001',
        fornecedor: 'Fornecedor ABC Ltda',
        descricao: 'Equipamentos de Segurança',
        valor: 2500.00,
        dataSolicitacao: '2024-01-15',
        dataAprovacao: '2024-01-16',
        status: 'aprovado',
        categoria: 'equipamento',
        formaPagamento: 'transferencia',
        aprovador: 'João Silva',
        prioridade: 'media',
        centroCusto: 'CC-001',
        numeroNF: 'NF-12345',
        dataVencimento: '2024-01-25',
        limitesValidados: true,
        workflow: [
          {
            id: 'wf-001-1',
            etapa: 'solicitacao',
            responsavel: 'Solicitante',
            dataInicio: '2024-01-15',
            dataConclusao: '2024-01-15',
            status: 'concluido'
          },
          {
            id: 'wf-001-2',
            etapa: 'aprovacao_gestor',
            responsavel: 'João Silva',
            dataInicio: '2024-01-15',
            dataConclusao: '2024-01-16',
            status: 'concluido',
            valorLimite: 5000
          },
          {
            id: 'wf-001-3',
            etapa: 'execucao',
            responsavel: 'Financeiro',
            dataInicio: '2024-01-16',
            status: 'pendente'
          }
        ],
        integracaoBancaria: {
          banco: 'Banco do Brasil',
          agencia: '1234-5',
          conta: '12345-6',
          statusIntegracao: 'pendente'
        }
      },
      {
        id: 'PAG-002',
        fornecedor: 'Empresa de Limpeza XYZ',
        descricao: 'Serviços de Limpeza - Janeiro 2024',
        valor: 1800.00,
        dataSolicitacao: '2024-01-10',
        status: 'pendente',
        categoria: 'servico',
        formaPagamento: 'boleto',
        prioridade: 'baixa',
        centroCusto: 'CC-002',
        dataVencimento: '2024-01-30',
        limitesValidados: true,
        workflow: [
          {
            id: 'wf-002-1',
            etapa: 'solicitacao',
            responsavel: 'Solicitante',
            dataInicio: '2024-01-10',
            dataConclusao: '2024-01-10',
            status: 'concluido'
          },
          {
            id: 'wf-002-2',
            etapa: 'aprovacao_gestor',
            responsavel: 'João Silva',
            dataInicio: '2024-01-10',
            status: 'pendente',
            valorLimite: 5000
          }
        ]
      },
      {
        id: 'PAG-003',
        fornecedor: 'Receita Federal',
        descricao: 'Impostos - DAS',
        valor: 3200.00,
        dataSolicitacao: '2024-01-05',
        dataAprovacao: '2024-01-06',
        dataExecucao: '2024-01-07',
        status: 'executado',
        categoria: 'imposto',
        formaPagamento: 'pix',
        aprovador: 'Maria Santos',
        comprovante: 'comprovante_pagamento.pdf',
        prioridade: 'urgente',
        centroCusto: 'CC-003',
        dataVencimento: '2024-01-08',
        limitesValidados: true,
        workflow: [
          {
            id: 'wf-003-1',
            etapa: 'solicitacao',
            responsavel: 'Solicitante',
            dataInicio: '2024-01-05',
            dataConclusao: '2024-01-05',
            status: 'concluido'
          },
          {
            id: 'wf-003-2',
            etapa: 'aprovacao_financeiro',
            responsavel: 'Maria Santos',
            dataInicio: '2024-01-05',
            dataConclusao: '2024-01-06',
            status: 'concluido',
            valorLimite: 10000
          },
          {
            id: 'wf-003-3',
            etapa: 'execucao',
            responsavel: 'Financeiro',
            dataInicio: '2024-01-06',
            dataConclusao: '2024-01-07',
            status: 'concluido'
          }
        ],
        integracaoBancaria: {
          banco: 'Banco do Brasil',
          agencia: '1234-5',
          conta: '12345-6',
          chavePix: 'empresa@email.com',
          statusIntegracao: 'concluido',
          idTransacao: 'TXN-789456',
          comprovanteBancario: 'comprovante_banco.pdf',
          dataProcessamento: '2024-01-07'
        }
      }
    ];

    const mockLimites: LimitePagamento[] = [
      {
        id: 'LIM-001',
        tipo: 'diario',
        valor: 10000,
        valorUtilizado: 3200,
        periodo: '2024-01-20',
        ativo: true
      },
      {
        id: 'LIM-002',
        tipo: 'mensal',
        valor: 50000,
        valorUtilizado: 7500,
        periodo: '2024-01',
        ativo: true
      },
      {
        id: 'LIM-003',
        tipo: 'categoria',
        valor: 15000,
        valorUtilizado: 2500,
        periodo: '2024-01',
        categoria: 'equipamento',
        ativo: true
      }
    ];

    const mockNotificacoes: NotificacaoPagamento[] = [
      {
        id: 'NOT-001',
        tipo: 'aprovacao_pendente',
        titulo: 'Aprovação Pendente',
        descricao: 'Pagamento PAG-002 aguarda aprovação do gestor',
        pagamentoId: 'PAG-002',
        destinatario: 'joao.silva@empresa.com',
        dataEnvio: '2024-01-10',
        lida: false
      },
      {
        id: 'NOT-002',
        tipo: 'vencimento_proximo',
        titulo: 'Vencimento Próximo',
        descricao: 'Pagamento PAG-001 vence em 3 dias',
        pagamentoId: 'PAG-001',
        destinatario: 'financeiro@empresa.com',
        dataEnvio: '2024-01-22',
        lida: true
      }
    ];

    setPagamentos(mockPagamentos);
    setLimites(mockLimites);
    setNotificacoes(mockNotificacoes);
  }, []);

  // Filtrar pagamentos
  const filteredPagamentos = pagamentos.filter(pagamento => {
    const matchesSearch = pagamento.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pagamento.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || pagamento.status === filterStatus;
    const matchesCategoria = filterCategoria === 'all' || pagamento.categoria === filterCategoria;
    const matchesPrioridade = filterPrioridade === 'all' || pagamento.prioridade === filterPrioridade;

    return matchesSearch && matchesStatus && matchesCategoria && matchesPrioridade;
  });

  // Estatísticas
  const stats = {
    total: pagamentos.length,
    pendente: pagamentos.filter(p => p.status === 'pendente').length,
    aprovado: pagamentos.filter(p => p.status === 'aprovado').length,
    executado: pagamentos.filter(p => p.status === 'executado').length,
    valorTotal: pagamentos.reduce((sum, p) => sum + p.valor, 0),
    valorPendente: pagamentos.filter(p => p.status === 'pendente').reduce((sum, p) => sum + p.valor, 0),
    valorAprovado: pagamentos.filter(p => p.status === 'aprovado').reduce((sum, p) => sum + p.valor, 0),
    valorExecutado: pagamentos.filter(p => p.status === 'executado').reduce((sum, p) => sum + p.valor, 0)
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'aprovado': return 'bg-blue-100 text-blue-800';
      case 'executado': return 'bg-green-100 text-green-800';
      case 'rejeitado': return 'bg-red-100 text-red-800';
      case 'cancelado': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente': return <Clock className="w-4 h-4" />;
      case 'aprovado': return <Shield className="w-4 h-4" />;
      case 'executado': return <CheckCircle className="w-4 h-4" />;
      case 'rejeitado': return <XCircle className="w-4 h-4" />;
      case 'cancelado': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const handleAprovarPagamento = (id: string) => {
    setPagamentos(prev => prev.map(p => 
      p.id === id 
        ? { ...p, status: 'aprovado', dataAprovacao: new Date().toISOString(), aprovador: 'Usuário Atual' }
        : p
    ));
  };

  const handleExecutarPagamento = (id: string) => {
    setPagamentos(prev => prev.map(p => 
      p.id === id 
        ? { ...p, status: 'executado', dataExecucao: new Date().toISOString() }
        : p
    ));
  };

  // Função para obter cor da prioridade
  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'urgente': return 'text-red-600 bg-red-50';
      case 'alta': return 'text-orange-600 bg-orange-50';
      case 'media': return 'text-yellow-600 bg-yellow-50';
      case 'baixa': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Função para obter ícone da prioridade
  const getPrioridadeIcon = (prioridade: string) => {
    switch (prioridade) {
      case 'urgente': return AlertTriangle;
      case 'alta': return TrendingUp;
      case 'media': return Clock;
      case 'baixa': return TrendingDown;
      default: return Clock;
    }
  };

  // Função para verificar limites
  const verificarLimites = (valor: number, categoria?: string) => {
    const limiteDiario = limites.find(l => l.tipo === 'diario' && l.ativo);
    const limiteMensal = limites.find(l => l.tipo === 'mensal' && l.ativo);
    const limiteCategoria = limites.find(l => l.tipo === 'categoria' && l.categoria === categoria && l.ativo);

    const alertas = [];

    if (limiteDiario && (limiteDiario.valorUtilizado + valor) > limiteDiario.valor) {
      alertas.push(`Limite diário excedido: R$ ${((limiteDiario.valorUtilizado + valor) - limiteDiario.valor).toFixed(2)}`);
    }

    if (limiteMensal && (limiteMensal.valorUtilizado + valor) > limiteMensal.valor) {
      alertas.push(`Limite mensal excedido: R$ ${((limiteMensal.valorUtilizado + valor) - limiteMensal.valor).toFixed(2)}`);
    }

    if (limiteCategoria && (limiteCategoria.valorUtilizado + valor) > limiteCategoria.valor) {
      alertas.push(`Limite da categoria excedido: R$ ${((limiteCategoria.valorUtilizado + valor) - limiteCategoria.valor).toFixed(2)}`);
    }

    return alertas;
  };

  // Função para processar workflow
  const processarWorkflow = async (pagamentoId: string, etapa: string) => {
    setWorkflowLoading(true);
    try {
      // Simular processamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPagamentos(prev => prev.map(pagamento => {
        if (pagamento.id === pagamentoId) {
          const workflowAtualizado = pagamento.workflow?.map(w => 
            w.etapa === etapa 
              ? { ...w, status: 'concluido', dataConclusao: format(new Date(), 'yyyy-MM-dd') }
              : w
          ) || [];
          
          return { ...pagamento, workflow: workflowAtualizado };
        }
        return pagamento;
      }));
      
      toast({
        title: "Workflow atualizado",
        description: `Etapa ${etapa} concluída com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro no workflow",
        description: "Não foi possível processar a etapa do workflow.",
        variant: "destructive",
      });
    } finally {
      setWorkflowLoading(false);
    }
  };

  // Função para integração bancária
  const processarIntegracaoBancaria = async (pagamentoId: string) => {
    setIntegracaoLoading(true);
    try {
      // Simular integração bancária
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setPagamentos(prev => prev.map(pagamento => {
        if (pagamento.id === pagamentoId && pagamento.integracaoBancaria) {
          return {
            ...pagamento,
            integracaoBancaria: {
              ...pagamento.integracaoBancaria,
              statusIntegracao: 'concluido',
              idTransacao: `TXN-${Date.now()}`,
              dataProcessamento: format(new Date(), 'yyyy-MM-dd')
            },
            status: 'executado',
            dataExecucao: format(new Date(), 'yyyy-MM-dd')
          };
        }
        return pagamento;
      }));
      
      toast({
        title: "Integração bancária concluída",
        description: "Pagamento processado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro na integração",
        description: "Não foi possível processar o pagamento.",
        variant: "destructive",
      });
    } finally {
      setIntegracaoLoading(false);
    }
  };

  return (
    <PagamentosGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Pagamentos</h1>
            <p className="text-muted-foreground">
              Gerencie pagamentos, aprovações e execução de despesas
            </p>
          </div>
          <PagamentosGuard action="manage">
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Pagamento
            </Button>
          </PagamentosGuard>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
            <TabsTrigger value="aprovacoes">Aprovações</TabsTrigger>
            <TabsTrigger value="execucao">Execução</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="limites">Limites</TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-4">
            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-sm text-muted-foreground">Total de Pagamentos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">R$ {stats.valorTotal.toLocaleString('pt-BR')}</p>
                      <p className="text-sm text-muted-foreground">Valor Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="text-2xl font-bold">R$ {stats.valorPendente.toLocaleString('pt-BR')}</p>
                      <p className="text-sm text-muted-foreground">Pendente</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">R$ {stats.valorExecutado.toLocaleString('pt-BR')}</p>
                      <p className="text-sm text-muted-foreground">Executado</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status dos Pagamentos */}
            <Card>
              <CardHeader>
                <CardTitle>Status dos Pagamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{stats.pendente}</div>
                    <div className="text-sm text-muted-foreground">Pendentes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.aprovado}</div>
                    <div className="text-sm text-muted-foreground">Aprovados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.executado}</div>
                    <div className="text-sm text-muted-foreground">Executados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {pagamentos.filter(p => p.status === 'rejeitado').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Rejeitados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {pagamentos.filter(p => p.status === 'cancelado').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Cancelados</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lista de Pagamentos */}
          <TabsContent value="pagamentos" className="space-y-4">
            {/* Filtros */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="w-5 h-5 mr-2" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Buscar por fornecedor ou descrição..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="executado">Executado</SelectItem>
                      <SelectItem value="rejeitado">Rejeitado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterPrioridade} onValueChange={setFilterPrioridade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Prioridades</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                    <SelectTrigger>
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Categorias</SelectItem>
                      <SelectItem value="fornecedor">Fornecedor</SelectItem>
                      <SelectItem value="servico">Serviço</SelectItem>
                      <SelectItem value="equipamento">Equipamento</SelectItem>
                      <SelectItem value="imposto">Imposto</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Pagamentos */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Fornecedor</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Descrição</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Valor</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Prioridade</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Vencimento</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Centro de Custo</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredPagamentos.map((pagamento) => {
                        const PrioridadeIcon = getPrioridadeIcon(pagamento.prioridade || 'media');
                        return (
                          <tr key={pagamento.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                <Building className="w-4 h-4 text-gray-400" />
                                <span className="font-medium">{pagamento.fornecedor}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                              {pagamento.descricao}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-medium text-red-600">
                                R$ {pagamento.valor.toLocaleString('pt-BR')}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${
                                getPrioridadeColor(pagamento.prioridade || 'media')
                              }`}>
                                <PrioridadeIcon className="h-3 w-3" />
                                {(pagamento.prioridade || 'media').charAt(0).toUpperCase() + (pagamento.prioridade || 'media').slice(1)}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={getStatusColor(pagamento.status)}>
                                {getStatusIcon(pagamento.status)}
                                <span className="ml-1 capitalize">{pagamento.status}</span>
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              {pagamento.dataVencimento ? (
                                <span className={`${
                                  new Date(pagamento.dataVencimento) < new Date() ? 'text-red-600 font-medium' :
                                  new Date(pagamento.dataVencimento) <= addDays(new Date(), 3) ? 'text-yellow-600 font-medium' :
                                  'text-muted-foreground'
                                }`}>
                                  {format(new Date(pagamento.dataVencimento), 'dd/MM/yyyy', { locale: ptBR })}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-muted-foreground">
                                {pagamento.centroCusto || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPagamento(pagamento);
                                    setShowWorkflowModal(true);
                                  }}
                                >
                                  <History className="w-4 h-4" />
                                </Button>
                                {pagamento.integracaoBancaria && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedPagamento(pagamento);
                                      setShowIntegracaoModal(true);
                                    }}
                                  >
                                    <CreditCard className="w-4 h-4" />
                                  </Button>
                                )}
                                <PagamentosGuard action="manage">
                                  <Button variant="outline" size="sm">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </PagamentosGuard>
                                <Button variant="outline" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aprovações */}
          <TabsContent value="aprovacoes" className="space-y-4">
            <PagamentosGuard action="manage">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Pagamentos Pendentes de Aprovação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pagamentos.filter(p => p.status === 'pendente').map((pagamento) => (
                      <div key={pagamento.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{pagamento.fornecedor}</h4>
                            <p className="text-sm text-gray-600">{pagamento.descricao}</p>
                            <p className="text-lg font-bold text-red-600">
                              R$ {pagamento.valor.toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="outline" 
                              onClick={() => handleAprovarPagamento(pagamento.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Aprovar
                            </Button>
                            <Button variant="outline" className="text-red-600">
                              <XCircle className="w-4 h-4 mr-2" />
                              Rejeitar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {pagamentos.filter(p => p.status === 'pendente').length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        Nenhum pagamento pendente de aprovação.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </PagamentosGuard>
          </TabsContent>

          {/* Execução */}
          <TabsContent value="execucao" className="space-y-4">
            <PagamentosGuard action="execute">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2" />
                    Pagamentos Aprovados para Execução
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pagamentos.filter(p => p.status === 'aprovado').map((pagamento) => (
                      <div key={pagamento.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{pagamento.fornecedor}</h4>
                            <p className="text-sm text-gray-600">{pagamento.descricao}</p>
                            <p className="text-lg font-bold text-red-600">
                              R$ {pagamento.valor.toLocaleString('pt-BR')}
                            </p>
                            <p className="text-sm text-gray-500">
                              Aprovado por: {pagamento.aprovador}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button 
                              onClick={() => handleExecutarPagamento(pagamento.id)}
                            >
                              <DollarSign className="w-4 h-4 mr-2" />
                              Executar Pagamento
                            </Button>
                            <Button variant="outline">
                              <CreditCard className="w-4 h-4 mr-2" />
                              Gerar Comprovante
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {pagamentos.filter(p => p.status === 'aprovado').length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        Nenhum pagamento aprovado para execução.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </PagamentosGuard>
          </TabsContent>

            {/* Aba Workflow */}
            <TabsContent value="workflow" className="space-y-4">
              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GitBranch className="h-5 w-5" />
                      Gestão de Workflow
                    </CardTitle>
                    <CardDescription>
                      Acompanhe o fluxo de aprovação dos pagamentos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {pagamentos.filter(p => p.workflow && p.workflow.length > 0).map((pagamento) => (
                        <div key={pagamento.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-medium">{pagamento.id} - {pagamento.fornecedor}</h4>
                              <p className="text-sm text-muted-foreground">
                                R$ {pagamento.valor.toFixed(2)} • {pagamento.descricao}
                              </p>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              getPrioridadeColor(pagamento.prioridade || 'media')
                            }`}>
                              {pagamento.prioridade?.toUpperCase()}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            {pagamento.workflow?.map((etapa, index) => {
                              const Icon = etapa.status === 'concluido' ? CheckCircle : 
                                          etapa.status === 'pendente' ? Clock : AlertCircle;
                              const statusColor = etapa.status === 'concluido' ? 'text-green-600' :
                                                 etapa.status === 'pendente' ? 'text-yellow-600' : 'text-red-600';
                              
                              return (
                                <div key={etapa.id} className="flex items-center gap-3">
                                  <Icon className={`h-4 w-4 ${statusColor}`} />
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium capitalize">
                                        {etapa.etapa.replace('_', ' ')}
                                      </span>
                                      <span className="text-sm text-muted-foreground">
                                        {etapa.responsavel}
                                      </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Início: {format(new Date(etapa.dataInicio), 'dd/MM/yyyy', { locale: ptBR })}
                                      {etapa.dataConclusao && (
                                        <> • Conclusão: {format(new Date(etapa.dataConclusao), 'dd/MM/yyyy', { locale: ptBR })}</>
                                      )}
                                    </div>
                                  </div>
                                  {etapa.status === 'pendente' && (
                                    <Button
                                      size="sm"
                                      onClick={() => processarWorkflow(pagamento.id, etapa.etapa)}
                                      disabled={workflowLoading}
                                    >
                                      {workflowLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        'Processar'
                                      )}
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="mt-3 pt-3 border-t">
                            <Progress 
                              value={(pagamento.workflow?.filter(w => w.status === 'concluido').length || 0) / (pagamento.workflow?.length || 1) * 100}
                              className="h-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {pagamento.workflow?.filter(w => w.status === 'concluido').length || 0} de {pagamento.workflow?.length || 0} etapas concluídas
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Aba Limites */}
            <TabsContent value="limites" className="space-y-4">
              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Controle de Limites
                    </CardTitle>
                    <CardDescription>
                      Gerencie os limites de pagamento e monitore o uso
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {limites.map((limite) => {
                        const percentualUso = (limite.valorUtilizado / limite.valor) * 100;
                        const corStatus = percentualUso >= 90 ? 'text-red-600' :
                                         percentualUso >= 70 ? 'text-yellow-600' : 'text-green-600';
                        
                        return (
                          <Card key={limite.id} className="relative">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium capitalize">
                                  {limite.tipo} {limite.categoria && `- ${limite.categoria}`}
                                </h4>
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  limite.ativo ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-600'
                                }`}>
                                  {limite.ativo ? 'Ativo' : 'Inativo'}
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Utilizado:</span>
                                  <span className={corStatus}>
                                    R$ {limite.valorUtilizado.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>Limite:</span>
                                  <span>R$ {limite.valor.toFixed(2)}</span>
                                </div>
                                <Progress value={percentualUso} className="h-2" />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>{percentualUso.toFixed(1)}% utilizado</span>
                                  <span>Período: {limite.periodo}</span>
                                </div>
                              </div>
                              
                              {percentualUso >= 90 && (
                                <Alert className="mt-3">
                                  <AlertTriangle className="h-4 w-4" />
                                  <AlertDescription>
                                    Limite quase esgotado! Restam apenas R$ {(limite.valor - limite.valorUtilizado).toFixed(2)}
                                  </AlertDescription>
                                </Alert>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                    
                    <div className="mt-6">
                      <Button onClick={() => setShowLimitesModal(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Limite
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notificações
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {notificacoes.map((notificacao) => (
                        <div key={notificacao.id} className={`p-3 rounded-lg border ${
                          notificacao.lida ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{notificacao.titulo}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {notificacao.descricao}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {format(new Date(notificacao.dataEnvio), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                              </p>
                            </div>
                            {!notificacao.lida && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </PagamentosGuard>
    );
  };
