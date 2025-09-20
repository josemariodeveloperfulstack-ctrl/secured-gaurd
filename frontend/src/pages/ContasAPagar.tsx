import React, { useState, useEffect } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  DollarSign, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Bell,
  FileText,
  BarChart3
} from 'lucide-react';
import { ContasAPagarFormModal, ContaAPagar } from '@/components/financeiro/ContasAPagarFormModal';
import { ContasAPagarTable } from '@/components/financeiro/ContasAPagarTable';
import { ContasAPagarDashboard } from '@/components/financeiro/ContasAPagarDashboard';
import { ContasAPagarViewModal } from '@/components/financeiro/ContasAPagarViewModal';
import { contasAPagarService } from '@/services/contasAPagarService';
import { format, addDays, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

const ContasAPagar: React.FC = () => {
  const { toast } = useToast();
  
  // Estados
  const [contas, setContas] = useState<ContaAPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaAPagar | null>(null);
  const [viewingConta, setViewingConta] = useState<ContaAPagar | null>(null);
  const [alertasVencimento, setAlertasVencimento] = useState<ContaAPagar[]>([]);
  const [showDashboard, setShowDashboard] = useState(false);
  
  // Estados para filtro por data
  const [anoSelecionado, setAnoSelecionado] = useState<number>(new Date().getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState<number>(new Date().getMonth() + 1);
  const [contasFiltradas, setContasFiltradas] = useState<ContaAPagar[]>([]);
  
  // Estados para filtros gerais
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [tipoFilter, setTipoFilter] = useState<string>('TODOS');
  
  // Estatísticas do dashboard
  const [stats, setStats] = useState({
    totalContas: 0,
    contasAbertas: 0,
    contasVencidas: 0,
    contasPagas: 0,
    valorTotal: 0,
    valorVencidas: 0,
    vencendoEm7Dias: 0
  });

  // Carregar dados
  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔍 DEBUG: Iniciando carregamento de contas a pagar...');
      
      const [contasData, estatisticas] = await Promise.all([
        contasAPagarService.getContasAPagar(),
        contasAPagarService.getEstatisticas()
      ]);
      
      console.log('🔍 DEBUG: Contas carregadas:', contasData);
      console.log('🔍 DEBUG: Estatísticas:', estatisticas);
      
      setContas(contasData);
      setStats({
        totalContas: contasData.length,
        contasAbertas: contasData.filter(c => c.status === 'ABERTA').length,
        contasVencidas: contasData.filter(c => c.status === 'VENCIDA' || (c.status === 'ABERTA' && isBefore(c.vencimento, new Date()))).length,
        contasPagas: contasData.filter(c => c.status === 'PAGA').length,
        valorTotal: contasData.reduce((sum, c) => sum + c.valor, 0),
        valorVencidas: contasData.filter(c => c.status === 'VENCIDA' || (c.status === 'ABERTA' && isBefore(c.vencimento, new Date()))).reduce((sum, c) => sum + c.valor, 0),
        vencendoEm7Dias: contasData.filter(c => c.status === 'ABERTA' && c.vencimento >= new Date() && c.vencimento <= addDays(new Date(), 7)).length
      });

      // Filtrar contas com todos os filtros
      filtrarContas(contasData);

      // Alertas de vencimento
      const alertas = contasData.filter(conta => 
        conta.status === 'ABERTA' && 
        conta.vencimento <= addDays(new Date(), 7)
      );
      setAlertasVencimento(alertas);
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados das contas a pagar.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para filtrar contas por data
  const filtrarContasPorData = (contasData: ContaAPagar[]) => {
    const contasFiltradas = contasData.filter(conta => {
      const dataVencimento = new Date(conta.vencimento);
      const anoConta = dataVencimento.getFullYear();
      const mesConta = dataVencimento.getMonth() + 1;
      
      return anoConta === anoSelecionado && mesConta === mesSelecionado;
    });
    
    setContasFiltradas(contasFiltradas);
    console.log('🔍 DEBUG: Contas filtradas por data:', contasFiltradas);
  };

  // Função para filtrar contas com todos os filtros
  const filtrarContas = (contasData: ContaAPagar[]) => {
    console.log('🔍 DEBUG: Filtrando contas com:', {
      totalContas: contasData.length,
      anoSelecionado,
      mesSelecionado,
      searchTerm,
      statusFilter,
      tipoFilter
    });
    
    let contasFiltradas = contasData.filter(conta => {
      // Usar data de lançamento (createdAt) ao invés de vencimento para o filtro
      const dataLancamento = conta.createdAt ? new Date(conta.createdAt) : new Date(conta.dataEmissao);
      const anoConta = dataLancamento.getFullYear();
      const mesConta = dataLancamento.getMonth() + 1;
      
      console.log('🔍 DEBUG: Conta:', {
        descricao: conta.descricao,
        vencimento: conta.vencimento,
        dataLancamento: conta.createdAt || conta.dataEmissao,
        anoConta,
        mesConta,
        status: conta.status,
        tipo: conta.tipo
      });
      
      // Filtro por data de lançamento
      const filtroData = anoConta === anoSelecionado && mesConta === mesSelecionado;
      
      // Filtro por busca
      const filtroBusca = !searchTerm || 
        conta.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conta.fornecedor.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtro por status
      const filtroStatus = statusFilter === 'TODOS' || conta.status === statusFilter;
      
      // Filtro por tipo
      const filtroTipo = tipoFilter === 'TODOS' || conta.tipo === tipoFilter;
      
      const passaFiltro = filtroData && filtroBusca && filtroStatus && filtroTipo;
      
      console.log('🔍 DEBUG: Filtros da conta:', {
        filtroData,
        filtroBusca,
        filtroStatus,
        filtroTipo,
        passaFiltro
      });
      
      return passaFiltro;
    });
    
    setContasFiltradas(contasFiltradas);
    console.log('🔍 DEBUG: Contas filtradas:', contasFiltradas);
  };

  // Função para alterar ano
  const handleAnoChange = (ano: number) => {
    setAnoSelecionado(ano);
    filtrarContas(contas);
  };

  // Função para alterar mês
  const handleMesChange = (mes: number) => {
    setMesSelecionado(mes);
    filtrarContas(contas);
  };

  // Função para alterar busca
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    filtrarContas(contas);
  };

  // Função para alterar status
  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    filtrarContas(contas);
  };

  // Função para alterar tipo
  const handleTipoChange = (tipo: string) => {
    setTipoFilter(tipo);
    filtrarContas(contas);
  };

  // Carregar dados ao montar o componente
  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  const handleCreateConta = () => {
    setEditingConta(null);
    setShowFormModal(true);
  };

  const handleEditConta = (conta: ContaAPagar) => {
    setEditingConta(conta);
    setShowFormModal(true);
  };

  const handleDeleteConta = async (id: string) => {
    try {
      await contasAPagarService.deleteContaAPagar(id);
      toast({
        title: "Sucesso",
        description: "Conta excluída com sucesso!"
      });
      loadData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir conta.",
        variant: "destructive"
      });
    }
  };

  const handleViewConta = (conta: ContaAPagar) => {
    console.log('handleViewConta chamado com:', conta);
    setViewingConta(conta);
    setShowViewModal(true);
    console.log('showViewModal definido como true');
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewingConta(null);
  };

  const handleMarkAsPaid = async (id: string, dataPagamento: Date) => {
    try {
      await contasAPagarService.marcarComoPaga(id, dataPagamento);
      toast({
        title: "Sucesso",
        description: "Conta marcada como paga!"
      });
      loadData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao marcar conta como paga.",
        variant: "destructive"
      });
    }
  };

  const handleFormSuccess = () => {
    setShowFormModal(false);
    setEditingConta(null);
    loadData();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <StandardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <DollarSign className="text-green-600" />
              Contas a Pagar
            </h1>
            <p className="text-gray-600 mt-1">
              Gerencie o controle de contas a pagar da empresa
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDashboard(!showDashboard)}
              className="flex items-center gap-2"
            >
              <BarChart3 size={16} />
              {showDashboard ? 'Ocultar Gráficos' : 'Mostrar Gráficos'}
            </Button>
            <Button 
              onClick={handleCreateConta}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              Nova Conta a Pagar
            </Button>
          </div>
        </div>

        {/* Dashboard de Gráficos */}
        {showDashboard && (
          <ContasAPagarDashboard 
            contas={contas}
            refreshData={loadData}
          />
        )}

        {/* Alertas de Vencimento */}
        {alertasVencimento.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <Bell className="text-yellow-600" />
                Alertas de Vencimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alertasVencimento.slice(0, 3).map(conta => (
                  <div key={conta.id} className="flex justify-between items-center p-2 bg-white rounded border">
                    <div>
                      <span className="font-medium">{conta.fornecedor}</span>
                      <span className="text-sm text-gray-600 ml-2">{conta.descricao}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-yellow-700">
                        {formatCurrency(conta.valor)}
                      </div>
                      <div className="text-sm text-yellow-600">
                        Vence em {format(conta.vencimento, 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                ))}
                {alertasVencimento.length > 3 && (
                  <p className="text-sm text-yellow-600 text-center">
                    E mais {alertasVencimento.length - 3} conta(s) vencendo em breve...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Contas</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalContas}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  Valor total: {formatCurrency(stats.valorTotal)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Contas Abertas</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.contasAbertas}</p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              <div className="mt-4">
                <Badge variant="secondary" className="text-xs">
                  Aguardando pagamento
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Contas Vencidas</p>
                  <p className="text-2xl font-bold text-red-600">{stats.contasVencidas}</p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-red-600">
                  Valor: {formatCurrency(stats.valorVencidas)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Contas Pagas</p>
                  <p className="text-2xl font-bold text-green-600">{stats.contasPagas}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4">
                <Badge variant="default" className="bg-green-600 text-xs">
                  Quitadas
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Próximos Vencimentos */}
        {stats.vencendoEm7Dias > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="text-orange-600" />
                Próximos Vencimentos (7 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.vencendoEm7Dias}
                </div>
                <div className="text-sm text-gray-600">
                  conta(s) vencendo nos próximos 7 dias
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros Gerais */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="bg-gradient-to-r from-gray-700 to-gray-600 text-white">
            <CardTitle className="flex items-center gap-2 text-white">
              <FileText className="text-white" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-gray-800 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Campo de Busca */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 block">
                  Buscar por descrição, fornecedor
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Digite para buscar..."
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* Filtro por Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 block">
                  Filtrar por status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="TODOS" className="bg-gray-700">Todos os Status</option>
                  <option value="ABERTA" className="bg-gray-700">Aberta</option>
                  <option value="PAGA" className="bg-gray-700">Paga</option>
                  <option value="VENCIDA" className="bg-gray-700">Vencida</option>
                </select>
              </div>

              {/* Filtro por Tipo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 block">
                  Filtrar por tipo
                </label>
                <select
                  value={tipoFilter}
                  onChange={(e) => handleTipoChange(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="TODOS" className="bg-gray-700">Todos os Tipos</option>
                  <option value="FIXA" className="bg-gray-700">Fixa</option>
                  <option value="VARIAVEL" className="bg-gray-700">Variável</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seletor de Data */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardTitle className="flex items-center gap-2 text-white">
              <Calendar className="text-white" />
              Filtrar por Data
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-gray-800 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Seletor de Ano */}
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">Selecione o Ano</h3>
                  <div className="flex justify-center gap-3">
                    {[2025, 2026].map(ano => (
                      <Button
                        key={ano}
                        variant={ano === anoSelecionado ? "default" : "outline"}
                        size="lg"
                        onClick={() => handleAnoChange(ano)}
                        className={`min-w-[80px] h-12 font-bold transition-all duration-200 ${
                          ano === anoSelecionado 
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg transform scale-105" 
                            : "bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600 hover:border-gray-500"
                        }`}
                      >
                        {ano}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Seletor de Mês */}
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">Selecione o Mês</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                    ].map((mes, index) => (
                      <Button
                        key={index + 1}
                        variant={index + 1 === mesSelecionado ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleMesChange(index + 1)}
                        className={`text-xs font-medium transition-all duration-200 ${
                          index + 1 === mesSelecionado 
                            ? "bg-red-600 hover:bg-red-700 text-white shadow-lg transform scale-105" 
                            : "bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600 hover:border-gray-500"
                        }`}
                      >
                        {mes}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Resumo do Filtro */}
            <div className="mt-8 p-4 bg-gradient-to-r from-gray-700 to-gray-600 rounded-lg border border-gray-600">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-white font-semibold">
                    Mostrando contas lançadas em {mesSelecionado === 1 ? 'Janeiro' : 
                    mesSelecionado === 2 ? 'Fevereiro' : 
                    mesSelecionado === 3 ? 'Março' : 
                    mesSelecionado === 4 ? 'Abril' : 
                    mesSelecionado === 5 ? 'Maio' : 
                    mesSelecionado === 6 ? 'Junho' : 
                    mesSelecionado === 7 ? 'Julho' : 
                    mesSelecionado === 8 ? 'Agosto' : 
                    mesSelecionado === 9 ? 'Setembro' : 
                    mesSelecionado === 10 ? 'Outubro' : 
                    mesSelecionado === 11 ? 'Novembro' : 'Dezembro'} de {anoSelecionado}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-gray-300">
                    {contasFiltradas.length} conta(s) encontrada(s)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Contas */}
        <ContasAPagarTable
          contas={contasFiltradas}
          onEdit={handleEditConta}
          onDelete={handleDeleteConta}
          onView={handleViewConta}
          onRefresh={loadData}
          loading={loading}
        />

        {/* Modal de Formulário */}
        <ContasAPagarFormModal
          open={showFormModal}
          onOpenChange={setShowFormModal}
          onSuccess={handleFormSuccess}
          editMode={!!editingConta}
          initialData={editingConta}
        />

        {/* Modal de Visualização */}
        <ContasAPagarViewModal
          isOpen={showViewModal}
          onClose={handleCloseViewModal}
          conta={viewingConta}
          onEdit={handleEditConta}
        />
      </div>
    </StandardLayout>
  );
};

export default ContasAPagar;