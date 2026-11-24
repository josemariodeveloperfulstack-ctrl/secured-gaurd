import React, { useState, useEffect, useMemo } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Bell,
  FileText,
  BarChart3,
  Download,
  Filter,
  Eye,
  FileSpreadsheet,
  FileImage,
  Settings,
  PieChart,
  TrendingDown,
  Clock,
  CheckCircle,
  RefreshCw,
  Building,
  ArrowLeft,
  X,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';
import { ContasAPagarFormModal, ContaAPagar } from '@/components/financeiro/ContasAPagarFormModal';
import { ContasAPagarTable } from '@/components/financeiro/ContasAPagarTable';
import { ContasAPagarDashboard } from '@/components/financeiro/ContasAPagarDashboard';
import { ContasAPagarViewModal } from '@/components/financeiro/ContasAPagarViewModal';
import { ContasAPagarReportCustomModal } from '@/components/financeiro/ContasAPagarReportCustomModal';
import ImportInvoicesModal from '@/components/financeiro/ImportInvoicesModal';
import { contasAPagarService, formatContaPlanoDeContas, resolveFornecedorOuFuncionario } from '@/services/contasAPagarService';
import { companyService } from '@/services/companyService';
import { format, addDays, isBefore, parseISO } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';

const ContasAPagar: React.FC = () => {
  const { toast } = useToast();

  // Estados
  const [contas, setContas] = useState<ContaAPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCustomReportModal, setShowCustomReportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaAPagar | null>(null);
  const [viewingConta, setViewingConta] = useState<ContaAPagar | null>(null);
  const [alertasVencimento, setAlertasVencimento] = useState<ContaAPagar[]>([]);
  const [alertasSlideIndex, setAlertasSlideIndex] = useState<number>(0);
  const [showDashboard, setShowDashboard] = useState(false);

  // Estados para filtros
  const [anoSelecionado, setAnoSelecionado] = useState<number>(new Date().getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState<number>(new Date().getMonth() + 1);
  const [contasFiltradas, setContasFiltradas] = useState<ContaAPagar[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [tipoFilter, setTipoFilter] = useState<string>('TODOS');

  // Estados para relatórios
  const [activeTab, setActiveTab] = useState<'contas' | 'relatorios'>('contas');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [empresasList, setEmpresasList] = useState<any[]>([]);
  const [reportFilters, setReportFilters] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1), // 1º de janeiro do ano atual
    endDate: new Date(new Date().getFullYear(), 11, 31), // 31 de dezembro do ano atual
    status: 'TODOS',
    tipo: 'TODOS',
    fornecedor: 'TODOS',
    empresa: 'TODAS'
  });

  // Estados para filtro por empresa no relatório
  const [empresaFilterRelatorio, setEmpresaFilterRelatorio] = useState<string>('TODAS');
  const [showEmpresaFilterRelatorio, setShowEmpresaFilterRelatorio] = useState<boolean>(false);

  // Estados para paginação (aba Relatórios)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Estado de carregamento para exportação da lista principal
  const [listExportLoading, setListExportLoading] = useState(false);

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
      console.log('🔍 DEBUG: Iniciando carregamento de dados...');

      const [contasData, estatisticas, companiesData] = await Promise.all([
        // Carregar todas as contas (sem paginação do backend) para permitir paginação completa no frontend
        contasAPagarService.getAllContasAPagar(),
        contasAPagarService.getEstatisticas(),
        companyService.getAllCompanies().catch(() => [])
      ]);

      if (companiesData && companiesData.length > 0) {
        setEmpresasList(companiesData);
      }

      console.log('🔍 DEBUG: Contas carregadas da API:', contasData);
      console.log('🔍 DEBUG: Quantidade de contas:', contasData.length);
      console.log('🔍 DEBUG: Primeiras 3 contas:', contasData.slice(0, 3));
      console.log('🔍 DEBUG: Estatísticas carregadas:', estatisticas);

      setContas(contasData);

      // Calcular estatísticas
      const hoje = new Date();
      const contasVencidas = contasData.filter(c =>
        c.status === 'VENCIDA' || (c.status === 'ABERTA' && isBefore(new Date(c.vencimento), hoje))
      );
      const contasVencendoEm7Dias = contasData.filter(c =>
        c.status === 'ABERTA' &&
        new Date(c.vencimento) >= hoje &&
        new Date(c.vencimento) <= addDays(hoje, 7)
      );

      setStats({
        totalContas: contasData.length,
        contasAbertas: contasData.filter(c => c.status === 'ABERTA').length,
        contasVencidas: contasVencidas.length,
        contasPagas: contasData.filter(c => c.status === 'PAGA').length,
        valorTotal: contasData.reduce((sum, c) => sum + c.valor, 0),
        valorVencidas: contasVencidas.reduce((sum, c) => sum + c.valor, 0),
        vencendoEm7Dias: contasVencendoEm7Dias.length
      });

      // Alertas de vencimento
      setAlertasVencimento(contasVencendoEm7Dias);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados das contas a pagar.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };



  // Função para filtrar contas com todos os filtros
  const filtrarContas = (contasData: ContaAPagar[]) => {
    const contasFiltradas = contasData.filter(conta => {
      // Filtro por data de vencimento
      const dataVencimento = new Date(conta.vencimento);
      const anoConta = dataVencimento.getFullYear();
      const mesConta = dataVencimento.getMonth() + 1;
      const filtroData = anoConta === anoSelecionado && mesConta === mesSelecionado;

      // Filtro por busca
      const filtroBusca = !searchTerm ||
        conta.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conta.fornecedor.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro por status
      const filtroStatus = statusFilter === 'TODOS' || conta.status === statusFilter;

      // Filtro por tipo
      const filtroTipo = tipoFilter === 'TODOS' || conta.tipo === tipoFilter;

      return filtroData && filtroBusca && filtroStatus && filtroTipo;
    });

    setContasFiltradas(contasFiltradas);
  };



  // Carregar dados ao montar o componente
  useEffect(() => {
    loadData();
  }, []);

  // Aplicar filtros quando os dados ou filtros mudarem
  useEffect(() => {
    if (contas.length > 0) {
      filtrarContas(contas);
    }
  }, [anoSelecionado, mesSelecionado, searchTerm, statusFilter, tipoFilter, contas]);

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
    setViewingConta(conta);
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewingConta(null);
  };



  const handleFormSuccess = () => {
    setShowFormModal(false);
    setEditingConta(null);
    loadData();
  };

  // Exportar todas as contas a pagar do período selecionado (aba Contas)
  const handleExportContasPeriodoPdf = async () => {
    if (contasFiltradas.length === 0) {
      toast({
        title: "Aviso",
        description: "Não há contas para exportar no período e filtros selecionados.",
        variant: "destructive"
      });
      return;
    }

    try {
      setListExportLoading(true);

      const inicioMes = new Date(anoSelecionado, mesSelecionado - 1, 1);
      const fimMes = new Date(anoSelecionado, mesSelecionado, 0);

      const startDate = format(inicioMes, 'yyyy-MM-dd');
      const endDate = format(fimMes, 'yyyy-MM-dd');

      const url = `/api/reports/contas-a-pagar?startDate=${startDate}&endDate=${endDate}&format=pdf`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao gerar relatório no servidor');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      const mesStr = String(mesSelecionado).padStart(2, '0');
      const filename = `contas-a-pagar-${anoSelecionado}-${mesStr}.pdf`;

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Sucesso",
        description: `PDF de Contas a Pagar gerado para ${mesStr}/${anoSelecionado}.`
      });
    } catch (error) {
      console.error('Erro ao exportar PDF de Contas a Pagar do período:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar PDF de Contas a Pagar para o período selecionado.",
        variant: "destructive"
      });
    } finally {
      setListExportLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusDisplayName = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'PAGA': 'Paga',
      'ABERTA': 'Aberta',
      'VENCIDA': 'Vencida',
      'CANCELADA': 'Cancelada',
      'CANCELADO': 'Cancelada',
      'PENDENTE': 'Pendente',
      'EM_ANALISE': 'Em Análise',
      'PROGRAMADA': 'Programada',
      'BLOQUEADA': 'Bloqueada'
    };
    return statusMap[status] || status;
  };

  // Função para filtrar por empresa no relatório
  const handleEmpresaFilterRelatorio = (empresa: string) => {
    setEmpresaFilterRelatorio(empresa);
    setShowEmpresaFilterRelatorio(true);
    setCurrentPage(1); // Reset para primeira página ao filtrar

    // Atualizar apenas o subtítulo do relatório
    if (reportData) {
      setReportData({
        ...reportData,
        subtitle: `Contas filtradas para a empresa: ${empresa}`
      });
    }

    toast({
      title: "Filtro Aplicado",
      description: `Mostrando apenas contas da empresa: ${empresa}`,
      duration: 3000
    });
  };

  // Função para limpar filtro de empresa e voltar à lista completa
  const handleLimparFiltroEmpresa = () => {
    setEmpresaFilterRelatorio('TODAS');
    setShowEmpresaFilterRelatorio(false);
    setCurrentPage(1);

    if (reportData) {
      setReportData({
        ...reportData,
        subtitle: reportData.type === 'empresa' ? 'Agrupamento das contas por empresa' : reportData.subtitle
      });
    }

    toast({
      title: "Filtro Removido",
      description: "Exibindo todas as empresas",
      duration: 2000
    });
  };

  // Função para limpar filtro de empresa no relatório
  const clearEmpresaFilterRelatorio = () => {
    setEmpresaFilterRelatorio('TODAS');
    setShowEmpresaFilterRelatorio(false);

    // Restaurar dados originais (se necessário, recarregar o relatório)
    if (reportData) {
      // Recarregar o relatório original
      generateReport(reportData.type);
    }

    toast({
      title: "Filtro Removido",
      description: "Mostrando contas de todas as empresas",
      duration: 2000
    });
  };

  // Funções para relatórios
  const generateReport = async (reportType: string) => {
    try {
      setReportLoading(true);

      // Resetar filtro de empresa quando gerar novo relatório
      setEmpresaFilterRelatorio('TODAS');
      setShowEmpresaFilterRelatorio(false);

      console.log('🔍 DEBUG: Gerando relatório do tipo:', reportType);
      console.log('🔍 DEBUG: Total de contas disponíveis:', contas.length);
      console.log('🔍 DEBUG: Filtros aplicados:', reportFilters);
      console.log('🔍 DEBUG: Contas disponíveis:', contas);

      const contasFiltradas = contas.filter(conta => {
        const dataVencimento = new Date(conta.vencimento);
        const dataInicio = reportFilters.startDate;
        const dataFim = reportFilters.endDate;

        const filtroData = dataVencimento >= dataInicio && dataVencimento <= dataFim;
        const filtroStatus = reportFilters.status === 'TODOS' || conta.status === reportFilters.status;
        const filtroTipo = reportFilters.tipo === 'TODOS' || conta.tipo === reportFilters.tipo;
        const filtroFornecedor = reportFilters.fornecedor === 'TODOS' || conta.fornecedor === reportFilters.fornecedor;
        const empresaConta = (conta.companySigla || conta.empresa || '').trim().toUpperCase();
        const filtroEmpresa = !reportFilters.empresa || reportFilters.empresa === 'TODAS' || empresaConta === reportFilters.empresa.trim().toUpperCase();

        return filtroData && filtroStatus && filtroTipo && filtroFornecedor && filtroEmpresa;
      });

      console.log('🔍 DEBUG: Contas filtradas:', contasFiltradas.length, contasFiltradas);

      // Ordena rigorosamente por data de vencimento crescente (01/11 a 30/11)
      let contasParaRelatorio = [...contasFiltradas].sort((a, b) => {
        const dateA = a.vencimento ? new Date(a.vencimento).getTime() : 0;
        const dateB = b.vencimento ? new Date(b.vencimento).getTime() : 0;
        return dateA - dateB;
      });
      if (contasParaRelatorio.length === 0 && contas.length > 0 && reportFilters.empresa === 'TODAS') {
        console.log('🔍 DEBUG: Nenhuma conta passou nos filtros, usando todas as contas para demonstração');
        contasParaRelatorio = [...contas].slice(0, 5).sort((a, b) => {
          const dateA = a.vencimento ? new Date(a.vencimento).getTime() : 0;
          const dateB = b.vencimento ? new Date(b.vencimento).getTime() : 0;
          return dateA - dateB;
        });
      }

      let reportData = {
        title: '',
        subtitle: '',
        type: reportType,
        period: `${format(reportFilters.startDate, 'dd/MM/yyyy')} - ${format(reportFilters.endDate, 'dd/MM/yyyy')}`,
        data: contasParaRelatorio,
        summary: {}
      };

      switch (reportType) {
        case 'resumo':
          // Ordena as contas começando pela VIG e depois as demais
          contasParaRelatorio.sort((a, b) => {
            const siglaA = (a.companySigla || a.empresa || '').toUpperCase();
            const siglaB = (b.companySigla || b.empresa || '').toUpperCase();
            const isVigA = siglaA.includes('VIG');
            const isVigB = siglaB.includes('VIG');
            if (isVigA && !isVigB) return -1;
            if (!isVigA && isVigB) return 1;
            return siglaA.localeCompare(siglaB);
          });

          reportData = {
            ...reportData,
            title: 'Relatório Resumo - Contas a Pagar',
            subtitle: 'Visão geral das contas organizada por empresa (iniciando pela VIG)',
            data: [...contasParaRelatorio],
            summary: {
              totalContas: contasParaRelatorio.length,
              valorTotal: contasParaRelatorio.reduce((sum, c) => sum + c.valor, 0),
              contasPagas: contasParaRelatorio.filter(c => c.status === 'PAGA').length,
              contasAbertas: contasParaRelatorio.filter(c => c.status === 'ABERTA').length,
              contasVencidas: contasParaRelatorio.filter(c => c.status === 'VENCIDA').length,
              valorPagas: contasParaRelatorio.filter(c => c.status === 'PAGA').reduce((sum, c) => sum + c.valor, 0),
              valorAbertas: contasParaRelatorio.filter(c => c.status === 'ABERTA').reduce((sum, c) => sum + c.valor, 0),
              valorVencidas: contasParaRelatorio.filter(c => c.status === 'VENCIDA').reduce((sum, c) => sum + c.valor, 0)
            }
          };
          break;
        case 'periodo':
          contasParaRelatorio.sort((a, b) => {
            const dateA = a.vencimento ? new Date(a.vencimento).getTime() : 0;
            const dateB = b.vencimento ? new Date(b.vencimento).getTime() : 0;
            return dateA - dateB;
          });
          reportData = {
            ...reportData,
            title: 'Relatório por Período - Contas a Pagar',
            subtitle: 'Detalhamento das contas por período de vencimento (ordem cronológica)',
            data: [...contasParaRelatorio],
            summary: {
              totalContas: contasParaRelatorio.length,
              valorTotal: contasParaRelatorio.reduce((sum, c) => sum + c.valor, 0)
            }
          };
          break;
        case 'fornecedor':
          // Agrupa por fornecedor e/ou funcionário beneficiário
          const fornecedores = contasParaRelatorio.reduce((acc, conta) => {
            const benef = (conta.employeeName && conta.employeeName.trim()) 
              ? conta.employeeName.trim() 
              : (conta.fornecedor && conta.fornecedor.trim()) 
                ? conta.fornecedor.trim() 
                : 'Não informado';
            if (!acc[benef]) {
              acc[benef] = { count: 0, valor: 0 };
            }
            acc[benef].count++;
            acc[benef].valor += conta.valor;
            return acc;
          }, {} as any);

          reportData = {
            ...reportData,
            title: 'Relatório por Fornecedor / Beneficiário - Contas a Pagar',
            subtitle: 'Agrupamento das contas por fornecedor e funcionários beneficiários',
            summary: {
              totalFornecedores: Object.keys(fornecedores).length,
              fornecedores: fornecedores,
              totalContas: contasParaRelatorio.length,
              valorTotal: contasParaRelatorio.reduce((sum, c) => sum + c.valor, 0)
            }
          };
          break;
        case 'status':
          const statusGroups = contasParaRelatorio.reduce((acc, conta) => {
            if (!acc[conta.status]) {
              acc[conta.status] = { count: 0, valor: 0 };
            }
            acc[conta.status].count++;
            acc[conta.status].valor += conta.valor;
            return acc;
          }, {} as any);

          reportData = {
            ...reportData,
            title: 'Relatório por Status - Contas a Pagar',
            subtitle: 'Distribuição das contas por status',
            summary: {
              statusGroups: statusGroups,
              totalContas: contasParaRelatorio.length,
              valorTotal: contasParaRelatorio.reduce((sum, c) => sum + c.valor, 0)
            }
          };
          break;
        case 'empresa':
          const empresas = contasParaRelatorio.reduce((acc, conta) => {
            const empresa = conta.empresa || conta.companySigla || 'Não informado';
            if (!acc[empresa]) {
              acc[empresa] = { count: 0, valor: 0 };
            }
            acc[empresa].count++;
            acc[empresa].valor += conta.valor;
            return acc;
          }, {} as any);

          // Ordena as contas começando pela VIG
          contasParaRelatorio.sort((a, b) => {
            const siglaA = (a.companySigla || a.empresa || '').toUpperCase();
            const siglaB = (b.companySigla || b.empresa || '').toUpperCase();
            const isVigA = siglaA.includes('VIG');
            const isVigB = siglaB.includes('VIG');
            if (isVigA && !isVigB) return -1;
            if (!isVigA && isVigB) return 1;
            return siglaA.localeCompare(siglaB);
          });

          reportData = {
            ...reportData,
            title: 'Relatório por Empresa - Contas a Pagar',
            subtitle: 'Agrupamento das contas por empresa (iniciando pela VIG)',
            data: [...contasParaRelatorio],
            summary: {
              totalEmpresas: Object.keys(empresas).length,
              empresas: empresas,
              totalContas: contasParaRelatorio.length,
              valorTotal: contasParaRelatorio.reduce((sum, c) => sum + c.valor, 0)
            }
          };
          break;
      }

      setReportData(reportData);

      toast({
        title: "Sucesso",
        description: "Relatório gerado com sucesso!"
      });

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar relatório",
        variant: "destructive"
      });
    } finally {
      setReportLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData || !filteredReportDisplayData || filteredReportDisplayData.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhum dado disponível para exportação",
        variant: "destructive"
      });
      return;
    }

    try {
      const headers = ['Descrição', 'Fornecedor', 'Valor', 'Vencimento', 'Status', 'Tipo', 'Empresa', 'Conta', 'Categoria'];
      const csvContent = [
        headers.join(','),
        ...filteredReportDisplayData.map((conta: ContaAPagar) => [
          `"${conta.descricao}"`,
          `"${conta.fornecedor}"`,
          conta.valor,
          format(conta.vencimento, 'dd/MM/yyyy'),
          getStatusDisplayName(conta.status),
          conta.tipo,
          conta.empresa || conta.companySigla || 'Não informado',
          `"${formatContaPlanoDeContas(conta)}"`,
          conta.categoria || ''
        ].join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      // Nome do arquivo com indicação de filtro
      let fileName = `contas-a-pagar-${reportData.title.toLowerCase().replace(/\s+/g, '-')}`;
      if (empresaFilterRelatorio !== 'TODAS') {
        fileName += `-${empresaFilterRelatorio.toLowerCase()}`;
      }
      fileName += `-${new Date().toISOString().split('T')[0]}.csv`;

      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Sucesso",
        description: `Relatório CSV exportado com sucesso! (${filteredReportDisplayData.length} registros)${empresaFilterRelatorio !== 'TODAS' ? ` - Filtrado por: ${empresaFilterRelatorio}` : ''}`
      });
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar arquivo CSV",
        variant: "destructive"
      });
    }
  };

  const exportToExcel = () => {
    if (!reportData || !filteredReportDisplayData || filteredReportDisplayData.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhum dado disponível para exportação",
        variant: "destructive"
      });
      return;
    }

    try {
      // Criar uma planilha HTML simples que pode ser aberta no Excel
      const headers = ['Descrição', 'Fornecedor', 'Valor', 'Vencimento', 'Status', 'Tipo', 'Empresa', 'Conta', 'Categoria'];

      let htmlContent = `
        <html>
        <head>
          <meta charset="utf-8">
          <title>${reportData.title}</title>
        </head>
        <body>
          <h1>${reportData.title}</h1>
          <h2>${reportData.subtitle}</h2>
          <p><strong>Período:</strong> ${reportData.period}</p>
          ${empresaFilterRelatorio !== 'TODAS' ? `<p><strong>Filtrado por Empresa:</strong> ${empresaFilterRelatorio}</p>` : ''}
          <p><strong>Total de registros:</strong> ${filteredReportDisplayData.length}</p>
          <br>
          <table border="1" cellpadding="5" cellspacing="0">
            <thead>
              <tr style="background-color: #f0f0f0;">
                ${headers.map(header => `<th>${header}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${filteredReportDisplayData.map((conta: ContaAPagar) => `
                <tr>
                  <td>${conta.descricao}</td>
                  <td>${conta.fornecedor}</td>
                  <td>${formatCurrency(conta.valor)}</td>
                  <td>${format(conta.vencimento, 'dd/MM/yyyy')}</td>
                  <td>${getStatusDisplayName(conta.status)}</td>
                  <td>${conta.tipo}</td>
                  <td>${conta.empresa || conta.companySigla || 'Não informado'}</td>
                  <td>${formatContaPlanoDeContas(conta)}</td>
                  <td>${conta.categoria || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      // Nome do arquivo com indicação de filtro
      let fileName = `contas-a-pagar-${reportData.title.toLowerCase().replace(/\s+/g, '-')}`;
      if (empresaFilterRelatorio !== 'TODAS') {
        fileName += `-${empresaFilterRelatorio.toLowerCase()}`;
      }
      fileName += `-${new Date().toISOString().split('T')[0]}.xls`;

      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Sucesso",
        description: `Relatório Excel exportado com sucesso! (${filteredReportDisplayData.length} registros)${empresaFilterRelatorio !== 'TODAS' ? ` - Filtrado por: ${empresaFilterRelatorio}` : ''}`
      });
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar arquivo Excel",
        variant: "destructive"
      });
    }
  };

  const exportToPDF = async () => {
    if (!reportData || !filteredReportDisplayData || filteredReportDisplayData.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhum dado disponível para exportação",
        variant: "destructive"
      });
      return;
    }

    try {
      setReportLoading(true);

      // Determinar qual endpoint usar baseado no tipo de relatório
      let url = '';

      // Formatar datas para o backend
      const startDate = format(reportFilters.startDate, 'yyyy-MM-dd');
      const endDate = format(reportFilters.endDate, 'yyyy-MM-dd');

      if (reportData.type === 'resumo') {
        url = `/api/reports/contas-a-pagar/resumo?format=pdf`;
      } else if (reportData.type === 'empresa') {
        const sigla = empresaFilterRelatorio === 'TODAS' ? 'TODAS' : empresaFilterRelatorio;
        url = `/api/reports/contas-a-pagar/empresa/${sigla}?format=pdf&startDate=${startDate}&endDate=${endDate}`;
      } else if (reportData.type === 'periodo') {
        url = `/api/reports/contas-a-pagar?startDate=${startDate}&endDate=${endDate}&format=pdf`;
      } else if (reportData.type === 'status') {
        const status = reportFilters.status !== 'TODOS' ? reportFilters.status : 'ABERTA';
        url = `/api/reports/contas-a-pagar/status/${status}?format=pdf`;
      } else {
        url = `/api/reports/contas-a-pagar?startDate=${startDate}&endDate=${endDate}&format=pdf`;
      }

      // Chamar endpoint do backend para gerar PDF com layout padrão
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Falha ao gerar relatório no servidor');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      // Nome do arquivo baseado no tipo de relatório
      let filename = 'relatorio-contas-a-pagar';
      if (reportData.type === 'resumo') {
        filename = 'relatorio-resumo-contas-a-pagar';
      } else if (reportData.type === 'empresa' && empresaFilterRelatorio !== 'TODAS') {
        filename = `relatorio-contas-a-pagar-empresa-${empresaFilterRelatorio}`;
      }
      filename += `.pdf`;

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Sucesso",
        description: `Relatório PDF gerado com layout padrão!`
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar arquivo PDF. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setReportLoading(false);
    }
  };

  // Memoized filtered data for display in the report table and summary cards
  const filteredReportDisplayData = useMemo(() => {
    if (!reportData || !reportData.data) return [];
    if (empresaFilterRelatorio === 'TODAS') return reportData.data;

    return reportData.data.filter((conta: ContaAPagar) => {
      const sigla = conta.companySigla || conta.empresa || 'Não informado';
      return sigla === empresaFilterRelatorio;
    });
  }, [reportData, empresaFilterRelatorio]);

  // Cálculo de paginação
  const totalPages = Math.ceil((filteredReportDisplayData?.length || 0) / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredReportDisplayData.slice(startIndex, endIndex);
  }, [filteredReportDisplayData, currentPage, itemsPerPage]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Memoized summary for display in the report cards
  const displaySummary = useMemo(() => {
    if (!reportData || !reportData.data) return {};

    const dataToSummarize = filteredReportDisplayData; // Use the filtered data for summary

    let currentSummary: any = {};

    // Recalculate summary based on the filtered data
    switch (reportData.type) {
      case 'periodo':
        currentSummary = {
          totalContas: dataToSummarize.length,
          valorTotal: dataToSummarize.reduce((sum, conta) => sum + conta.valor, 0),
          porPeriodo: dataToSummarize.reduce((acc, conta) => {
            const periodo = format(new Date(conta.vencimento), 'MM/yyyy');
            acc[periodo] = (acc[periodo] || 0) + conta.valor;
            return acc;
          }, {}),
        };
        break;
      case 'fornecedor':
        currentSummary = {
          totalContas: dataToSummarize.length,
          valorTotal: dataToSummarize.reduce((sum, conta) => sum + conta.valor, 0),
          fornecedores: dataToSummarize.reduce((acc, conta) => {
            const benef = (conta.employeeName && conta.employeeName.trim()) 
              ? conta.employeeName.trim() 
              : (conta.fornecedor && conta.fornecedor.trim()) 
                ? conta.fornecedor.trim() 
                : 'Não informado';
            acc[benef] = (acc[benef] || 0) + conta.valor;
            return acc;
          }, {}),
        };
        break;
      case 'status':
        currentSummary = {
          totalContas: dataToSummarize.length,
          valorTotal: dataToSummarize.reduce((sum, conta) => sum + conta.valor, 0),
          status: dataToSummarize.reduce((acc, conta) => {
            acc[conta.status] = (acc[conta.status] || 0) + conta.valor;
            return acc;
          }, {}),
        };
        break;
      case 'tipo':
        currentSummary = {
          totalContas: dataToSummarize.length,
          valorTotal: dataToSummarize.reduce((sum, conta) => sum + conta.valor, 0),
          tipos: dataToSummarize.reduce((acc, conta) => {
            acc[conta.tipo] = (acc[conta.tipo] || 0) + conta.valor;
            return acc;
          }, {}),
        };
        break;
      case 'empresa':
      case 'resumo': {
        const rawEmpresas = dataToSummarize.reduce((acc: any, conta: ContaAPagar) => {
          const sigla = (conta.companySigla || conta.empresa || 'Não informado').trim().toUpperCase();
          acc[sigla] = (acc[sigla] || 0) + conta.valor;
          return acc;
        }, {});

        // Organizar empresas começando sempre pela VIG
        const sortedEmpresas: Record<string, number> = {};
        Object.keys(rawEmpresas)
          .filter(k => k.includes('VIG'))
          .forEach(k => { sortedEmpresas[k] = rawEmpresas[k]; });
        Object.keys(rawEmpresas)
          .filter(k => !k.includes('VIG'))
          .sort()
          .forEach(k => { sortedEmpresas[k] = rawEmpresas[k]; });

        currentSummary = {
          totalContas: dataToSummarize.length,
          valorTotal: dataToSummarize.reduce((sum, conta) => sum + conta.valor, 0),
          contasPagas: dataToSummarize.filter(c => c.status === 'PAGA').length,
          valorPagas: dataToSummarize.filter(c => c.status === 'PAGA').reduce((sum, c) => sum + c.valor, 0),
          contasAbertas: dataToSummarize.filter(c => c.status === 'ABERTA').length,
          valorAbertas: dataToSummarize.filter(c => c.status === 'ABERTA').reduce((sum, c) => sum + c.valor, 0),
          contasVencidas: dataToSummarize.filter(c => c.status === 'VENCIDA').length,
          valorVencidas: dataToSummarize.filter(c => c.status === 'VENCIDA').reduce((sum, c) => sum + c.valor, 0),
          empresas: sortedEmpresas,
        };
        break;
      }
      default:
        currentSummary = {};
        break;
    }
    return currentSummary;
  }, [reportData, filteredReportDisplayData]);

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
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCustomReportModal(true)}
              className="flex items-center gap-2 border-seguranca-yellow/40 text-seguranca-yellow hover:bg-seguranca-yellow/10"
            >
              <FileText size={16} />
              Relatório Personalizado (PDF)
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 border-green-500/60 text-green-400 hover:bg-green-500/10 font-semibold shadow-sm"
            >
              <FileSpreadsheet size={16} />
              Importar Planilha (.xlsx)
            </Button>
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
              className="flex items-center gap-2 bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-black font-semibold"
            >
              <Plus size={16} />
              Nova Conta a Pagar
            </Button>
          </div>
        </div>

        {/* Abas principais */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'contas' | 'relatorios')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contas" className="flex items-center gap-2">
              <FileText size={16} />
              Contas a Pagar
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="flex items-center gap-2">
              <BarChart3 size={16} />
              Relatórios
            </TabsTrigger>
          </TabsList>

          {/* Aba de Contas */}
          <TabsContent value="contas" className="space-y-6">

            {/* Dashboard de Gráficos */}
            {showDashboard && (
              <ContasAPagarDashboard
                contas={contas}
                refreshData={loadData}
              />
            )}

            {/* Alertas de Vencimento com Slider Interativo e Design Dark Executivo */}
            {alertasVencimento.length > 0 && (() => {
              const itemsPerPage = 3;
              const totalSlides = Math.ceil(alertasVencimento.length / itemsPerPage);
              const currentSlide = Math.min(alertasSlideIndex, totalSlides - 1);
              const startIdx = currentSlide * itemsPerPage;
              const visibleAlerts = alertasVencimento.slice(startIdx, startIdx + itemsPerPage);
              const totalValorAlertas = alertasVencimento.reduce((acc, c) => acc + (c.valor || 0), 0);

              return (
                <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 p-4 sm:p-5 shadow-2xl backdrop-blur-md transition-all">
                  {/* Glow decorativo no topo */}
                  <div className="absolute -top-12 -left-12 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                  
                  {/* Cabeçalho do Card de Alertas */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5 mb-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-400 shadow-inner">
                        <Bell className="w-5 h-5 animate-pulse" />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                            Alertas de Vencimento
                          </h3>
                          <Badge className="bg-amber-500/20 border-amber-500/40 text-amber-300 text-xs px-2 py-0.5">
                            {alertasVencimento.length} {alertasVencimento.length === 1 ? 'conta' : 'contas'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Despesas em aberto com vencimento previsto para os próximos 7 dias • Total: <span className="text-amber-300 font-semibold">{formatCurrency(totalValorAlertas)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Controles de Slides / Paginação */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowCustomReportModal(true)}
                        className="text-xs h-8 border-amber-500/30 text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/60 transition-colors"
                      >
                        <FileText size={14} className="mr-1.5" />
                        Relatório PDF
                      </Button>

                      {totalSlides > 1 && (
                        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => setAlertasSlideIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentSlide === 0}
                            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded transition-colors"
                            title="Despesas anteriores"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-[11px] font-medium text-slate-400 px-1.5 min-w-[40px] text-center">
                            {currentSlide + 1} / {totalSlides}
                          </span>
                          <button
                            type="button"
                            onClick={() => setAlertasSlideIndex(prev => Math.min(totalSlides - 1, prev + 1))}
                            disabled={currentSlide === totalSlides - 1}
                            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded transition-colors"
                            title="Próximas despesas"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lista de Contas com Transição e Visual Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {visibleAlerts.map((conta) => {
                      const isVencendoHoje = isBefore(new Date(conta.vencimento), addDays(new Date(), 1)) &&
                        !isBefore(new Date(conta.vencimento), new Date(new Date().setHours(0, 0, 0, 0)));
                      
                      return (
                        <div
                          key={conta.id}
                          onClick={() => {
                            setViewingConta(conta);
                            setShowViewModal(true);
                          }}
                          className="group relative flex flex-col justify-between p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/40 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:shadow-amber-500/5 hover:-translate-y-0.5"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                                {conta.fornecedor || 'Fornecedor não informado'}
                              </span>
                              {isVencendoHoje ? (
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] px-1.5 py-0 shrink-0">
                                  Vence Hoje
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20 text-[10px] px-1.5 py-0 shrink-0">
                                  Próximo
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {conta.descricao || 'Sem descrição'}
                            </p>
                          </div>

                          <div className="flex items-baseline justify-between pt-3 mt-2 border-t border-slate-800/60">
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <Clock size={12} className="text-amber-400 shrink-0" />
                              <span>{format(new Date(conta.vencimento), 'dd/MM/yyyy')}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm sm:text-base font-extrabold text-amber-400 tracking-tight">
                                {formatCurrency(conta.valor)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Barra de Paginação / Dots quando houver mais de 1 página */}
                  {totalSlides > 1 && (
                    <div className="flex items-center justify-center gap-1.5 pt-3 mt-1">
                      {Array.from({ length: Math.min(totalSlides, 8) }).map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAlertasSlideIndex(idx)}
                          className={`h-1.5 rounded-full transition-all ${
                            idx === currentSlide
                              ? 'w-6 bg-amber-400 shadow-sm shadow-amber-400/50'
                              : 'w-1.5 bg-slate-700 hover:bg-slate-500'
                          }`}
                          aria-label={`Slide ${idx + 1}`}
                        />
                      ))}
                      {totalSlides > 8 && (
                        <span className="text-[10px] text-slate-500 ml-1">+{totalSlides - 8}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Total a Pagar</p>
                      <p className="text-xl font-bold text-blue-800">{formatCurrency(stats.valorTotal)}</p>
                    </div>
                    <div className="h-10 w-10 bg-blue-200 rounded-lg flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-blue-700" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-blue-600">{stats.totalContas} contas</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-700">Vencidas</p>
                      <p className="text-xl font-bold text-yellow-800">{formatCurrency(stats.valorVencidas)}</p>
                    </div>
                    <div className="h-10 w-10 bg-yellow-200 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-yellow-700" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-yellow-600">{stats.contasVencidas} contas</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">A Vencer (30 dias)</p>
                      <p className="text-xl font-bold text-green-800">{stats.vencendoEm7Dias}</p>
                    </div>
                    <div className="h-10 w-10 bg-green-200 rounded-lg flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-green-700" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs border-green-300 text-green-700">
                      Próximas
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Pagas no Mês</p>
                      <p className="text-xl font-bold text-gray-800">{stats.contasPagas}</p>
                    </div>
                    <div className="h-10 w-10 bg-gray-200 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-gray-700" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs border-gray-300 text-gray-700">
                      Quitadas
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filtros */}
            <Card className="bg-gray-900/90 border border-gray-800 shadow-xl rounded-xl">
              <CardHeader className="pb-3 border-b border-gray-800/80">
                <CardTitle className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-2 text-base font-bold">
                    <Filter className="text-seguranca-yellow h-5 w-5" />
                    Filtros e Busca
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Campo de Busca */}
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Search className="h-3.5 w-3.5 text-seguranca-yellow" /> Pesquisar por Descrição / Fornecedor
                    </label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Digite para pesquisar..."
                      className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white placeholder-gray-400 font-medium focus:outline-none focus:ring-1 focus:ring-seguranca-yellow focus:border-seguranca-yellow shadow-inner"
                    />
                  </div>

                  {/* Filtro por Status */}
                  <div>
                    <label className="text-xs font-bold text-gray-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-blue-400" /> Status da Conta
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white font-medium focus:outline-none focus:ring-1 focus:ring-seguranca-yellow focus:border-seguranca-yellow shadow-inner"
                    >
                      <option value="TODOS" className="text-gray-900 bg-gray-100 font-semibold">Todos os Status</option>
                      <option value="ABERTA" className="text-gray-900 bg-gray-100 font-semibold">Aberta</option>
                      <option value="PAGA" className="text-gray-900 bg-gray-100 font-semibold">Paga</option>
                      <option value="VENCIDA" className="text-gray-900 bg-gray-100 font-semibold">Vencida</option>
                    </select>
                  </div>

                  {/* Filtro por Tipo */}
                  <div>
                    <label className="text-xs font-bold text-gray-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-cyan-400" /> Tipo de Despesa
                    </label>
                    <select
                      value={tipoFilter}
                      onChange={(e) => setTipoFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white font-medium focus:outline-none focus:ring-1 focus:ring-seguranca-yellow focus:border-seguranca-yellow shadow-inner"
                    >
                      <option value="TODOS" className="text-gray-900 bg-gray-100 font-semibold">Todos os Tipos</option>
                      <option value="FIXA" className="text-gray-900 bg-gray-100 font-semibold">Fixa</option>
                      <option value="VARIAVEL" className="text-gray-900 bg-gray-100 font-semibold">Variável</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seletor de Data */}
            <Card className="bg-gray-900/90 border border-gray-800 shadow-xl rounded-xl">
              <CardHeader className="pb-3 border-b border-gray-800/80">
                <CardTitle className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-2 text-base font-bold">
                    <Calendar className="text-seguranca-yellow h-5 w-5" />
                    Período de Vencimento
                  </div>
                  <Badge variant="outline" className="text-xs border-seguranca-yellow/40 text-seguranca-yellow font-semibold px-2.5 py-1">
                    {contasFiltradas.length} conta(s) encontrada(s)
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-5">
                {/* Seletor de Ano */}
                <div>
                  <label className="text-xs font-bold text-gray-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-seguranca-yellow" /> Selecione o Ano
                  </label>
                  <div className="flex gap-2">
                    {[2025, 2026].map(ano => (
                      <Button
                        key={ano}
                        variant={ano === anoSelecionado ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAnoSelecionado(ano)}
                        className={`min-w-[70px] font-bold ${
                          ano === anoSelecionado 
                            ? "bg-seguranca-yellow text-black hover:bg-yellow-500 shadow-md" 
                            : "bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700 hover:text-white"
                        }`}
                      >
                        {ano}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Seletor de Mês */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-xs font-bold text-gray-200 uppercase tracking-wider">Mês Selecionado:</label>
                    <span className="text-sm font-bold text-seguranca-yellow bg-seguranca-yellow/10 px-2.5 py-0.5 rounded border border-seguranca-yellow/30">
                      {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][mesSelecionado - 1]} {anoSelecionado}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
                    {[
                      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
                    ].map((mes, index) => (
                      <Button
                        key={index + 1}
                        variant={index + 1 === mesSelecionado ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMesSelecionado(index + 1)}
                        className={`text-xs font-semibold ${
                          index + 1 === mesSelecionado 
                            ? "bg-seguranca-yellow text-black hover:bg-yellow-500 font-bold shadow-md scale-105" 
                            : "bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700 hover:text-white"
                        }`}
                      >
                        {mes}
                      </Button>
                    ))}
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
              onExportPeriodo={handleExportContasPeriodoPdf}
              exportLoading={listExportLoading}
            />
          </TabsContent>

          {/* Aba de Relatórios */}
          <TabsContent value="relatorios" className="space-y-6">
            {/* Filtros de Relatórios */}
            <Card className="bg-gradient-to-br from-seguranca-graphite via-seguranca-black to-seguranca-graphite border border-gray-600/50 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-white">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                    <Filter className="h-5 w-5 text-white" />
                  </div>
                  Filtros para Relatórios
                </CardTitle>
                <p className="text-gray-400 text-sm mt-2">
                  Configure os parâmetros para gerar relatórios personalizados
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <label className="text-sm font-medium text-seguranca-lightgray mb-2 block">Data Início</label>
                    <DatePicker
                      date={reportFilters.startDate}
                      onDateChange={(date) => setReportFilters(prev => ({ ...prev, startDate: date || new Date() }))}
                      className="w-full bg-seguranca-black/50 border border-gray-600/50 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-seguranca-lightgray mb-2 block">Data Fim</label>
                    <DatePicker
                      date={reportFilters.endDate}
                      onDateChange={(date) => setReportFilters(prev => ({ ...prev, endDate: date || new Date() }))}
                      className="w-full bg-seguranca-black/50 border border-gray-600/50 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-seguranca-lightgray mb-2 block">Empresa</label>
                    <select
                      value={reportFilters.empresa || 'TODAS'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setReportFilters(prev => ({ ...prev, empresa: val }));
                        setEmpresaFilterRelatorio(val);
                      }}
                      className="w-full px-3 py-2.5 bg-seguranca-black/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    >
                      <option value="TODAS">Todas as Empresas</option>
                      {empresasList && empresasList.length > 0 ? (
                        empresasList.map((comp: any) => {
                          const sigla = (comp.sigla || comp.name || '').trim();
                          const label = comp.sigla ? `${comp.sigla} - ${comp.name}` : comp.name;
                          return (
                            <option key={comp.id || sigla} value={sigla}>
                              {label}
                            </option>
                          );
                        })
                      ) : (
                        <>
                          <option value="VIG">VIG - Promover Vigilância</option>
                          <option value="TERC">TERC - Promover Terceirização</option>
                          <option value="ADM">ADM - Promover Administração</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-seguranca-lightgray mb-2 block">Status</label>
                    <select
                      value={reportFilters.status}
                      onChange={(e) => setReportFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-seguranca-black/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    >
                      <option value="TODOS">Todos os Status</option>
                      <option value="ABERTA">Aberta</option>
                      <option value="PAGA">Paga</option>
                      <option value="VENCIDA">Vencida</option>
                      <option value="CANCELADA">Cancelada</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-seguranca-lightgray mb-2 block">Tipo</label>
                    <select
                      value={reportFilters.tipo}
                      onChange={(e) => setReportFilters(prev => ({ ...prev, tipo: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-seguranca-black/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    >
                      <option value="TODOS">Todos os Tipos</option>
                      <option value="FIXA">Fixa</option>
                      <option value="VARIAVEL">Variável</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tipos de Relatórios */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 border border-blue-500/30 hover:border-blue-400/50 hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300 cursor-pointer group" onClick={() => generateReport('resumo')}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white text-lg group-hover:text-blue-300 transition-colors">Resumo Geral</h3>
                      <p className="text-sm text-gray-400 mt-1">Visão geral das contas</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl group-hover:from-blue-500/30 group-hover:to-blue-600/30 transition-all duration-300">
                      <PieChart className="h-7 w-7 text-blue-400 group-hover:text-blue-300 transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-900/30 to-green-800/30 border border-green-500/30 hover:border-green-400/50 hover:shadow-xl hover:shadow-green-500/20 transition-all duration-300 cursor-pointer group" onClick={() => generateReport('periodo')}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white text-lg group-hover:text-green-300 transition-colors">Por Período</h3>
                      <p className="text-sm text-gray-400 mt-1">Detalhamento temporal</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl group-hover:from-green-500/30 group-hover:to-green-600/30 transition-all duration-300">
                      <Calendar className="h-7 w-7 text-green-400 group-hover:text-green-300 transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-900/30 to-purple-800/30 border border-purple-500/30 hover:border-purple-400/50 hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 cursor-pointer group" onClick={() => generateReport('fornecedor')}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white text-lg group-hover:text-purple-300 transition-colors">Por Fornecedor</h3>
                      <p className="text-sm text-gray-400 mt-1">Agrupamento por fornecedor</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl group-hover:from-purple-500/30 group-hover:to-purple-600/30 transition-all duration-300">
                      <TrendingUp className="h-7 w-7 text-purple-400 group-hover:text-purple-300 transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-900/30 to-orange-800/30 border border-orange-500/30 hover:border-orange-400/50 hover:shadow-xl hover:shadow-orange-500/20 transition-all duration-300 cursor-pointer group" onClick={() => generateReport('status')}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white text-lg group-hover:text-orange-300 transition-colors">Por Status</h3>
                      <p className="text-sm text-gray-400 mt-1">Distribuição por status</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl group-hover:from-orange-500/30 group-hover:to-orange-600/30 transition-all duration-300">
                      <CheckCircle className="h-7 w-7 text-orange-400 group-hover:text-orange-300 transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-indigo-900/30 to-indigo-800/30 border border-indigo-500/30 hover:border-indigo-400/50 hover:shadow-xl hover:shadow-indigo-500/20 transition-all duration-300 cursor-pointer group" onClick={() => generateReport('empresa')}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white text-lg group-hover:text-indigo-300 transition-colors">Por Empresa</h3>
                      <p className="text-sm text-gray-400 mt-1">Agrupamento por empresa</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 rounded-xl group-hover:from-indigo-500/30 group-hover:to-indigo-600/30 transition-all duration-300">
                      <Building className="h-7 w-7 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Visualização do Relatório */}
            {reportData && (
              <Card className="bg-gradient-to-br from-seguranca-graphite via-seguranca-black to-seguranca-graphite border border-gray-600/50 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-3 text-white text-xl">
                        <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                          <Eye className="h-5 w-5 text-white" />
                        </div>
                        {reportData.title}
                      </CardTitle>
                      <p className="text-gray-400 text-sm mt-2">{reportData.subtitle}</p>
                      <p className="text-gray-500 text-sm">Período: {reportData.period}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportToCSV}
                        className="flex items-center gap-2 border-gray-600 text-gray-300 hover:bg-seguranca-black"
                      >
                        <FileSpreadsheet size={16} />
                        CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportToExcel}
                        className="flex items-center gap-2 border-gray-600 text-gray-300 hover:bg-seguranca-black"
                      >
                        <FileImage size={16} />
                        Excel
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={exportToPDF}
                        disabled={reportLoading}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white border-none"
                      >
                        {reportLoading ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                        PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Alerta de Filtro Ativo */}
                  {empresaFilterRelatorio !== 'TODAS' && (
                    <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Filter className="h-5 w-5 text-blue-300" />
                        <div>
                          <p className="text-blue-100 font-medium">Filtro Ativo</p>
                          <p className="text-blue-300 text-sm">Exibindo apenas contas da empresa: <strong>{empresaFilterRelatorio}</strong></p>
                        </div>
                      </div>
                      <Button
                        onClick={handleLimparFiltroEmpresa}
                        variant="outline"
                        size="sm"
                        className="border-blue-600 text-blue-300 hover:bg-blue-900/50 hover:text-blue-200"
                      >
                        <X size={16} className="mr-2" />
                        Limpar Filtro
                      </Button>
                    </div>
                  )}

                  {/* Resumo do Relatório */}
                  {displaySummary && Object.keys(displaySummary).length > 0 && (
                    <div className="space-y-6 mb-8">
                      {/* Resumo Geral */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-seguranca-black/50 rounded-xl text-center border border-gray-600/30 hover:border-gray-500/50 transition-all duration-200">
                          <p className="text-sm text-gray-400 mb-2">Total Contas</p>
                          <p className="text-xl font-bold text-white">{displaySummary.totalContas || 0}</p>
                        </div>
                        <div className="p-4 bg-seguranca-black/50 rounded-xl text-center border border-gray-600/30 hover:border-gray-500/50 transition-all duration-200">
                          <p className="text-sm text-gray-400 mb-2">Valor Total</p>
                          <p className="text-xl font-bold text-green-400">{formatCurrency(displaySummary.valorTotal || 0)}</p>
                        </div>
                        <div className="p-4 bg-seguranca-black/50 rounded-xl text-center border border-gray-600/30 hover:border-gray-500/50 transition-all duration-200">
                          <p className="text-sm text-gray-400 mb-2">Contas Pagas</p>
                          <p className="text-xl font-bold text-blue-400">{displaySummary.contasPagas || 0}</p>
                        </div>
                        <div className="p-4 bg-seguranca-black/50 rounded-xl text-center border border-gray-600/30 hover:border-gray-500/50 transition-all duration-200">
                          <p className="text-sm text-gray-400 mb-2">Contas Abertas</p>
                          <p className="text-xl font-bold text-yellow-400">{displaySummary.contasAbertas || 0}</p>
                        </div>
                      </div>

                      {/* Detalhamento por Empresa (exibido em Empresa e no Resumo Geral) */}
                      {(reportData?.type === 'empresa' || reportData?.type === 'resumo') && displaySummary.empresas && Object.keys(displaySummary.empresas).length > 0 && (
                        <div className="bg-seguranca-black/30 rounded-xl border border-gray-600/30 p-6">
                          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Building className="h-5 w-5 text-blue-400" />
                            Detalhamento por Empresa
                            {empresaFilterRelatorio !== 'TODAS' && (
                              <Badge variant="outline" className="ml-2 bg-blue-500/20 text-blue-300 border-blue-500">
                                Filtrado: {empresaFilterRelatorio}
                              </Badge>
                            )}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(displaySummary.empresas).map(([empresa, valor]: [string, any]) => (
                              <div key={empresa} className="p-4 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-lg border border-gray-600/30 hover:border-gray-500/50 transition-all duration-200">
                                <div className="flex items-center justify-between mb-2">
                                  <Badge
                                    variant="outline"
                                    className={`text-sm font-medium ${empresa === 'ADM' ? 'border-blue-500 text-blue-300 bg-blue-500/10' :
                                      empresa === 'TERC' ? 'border-green-500 text-green-300 bg-green-500/10' :
                                        empresa === 'VIG' ? 'border-purple-500 text-purple-300 bg-purple-500/10' :
                                          'border-gray-500 text-gray-300 bg-gray-500/10'
                                      }`}
                                  >
                                    {empresa}
                                  </Badge>
                                  {empresaFilterRelatorio === 'TODAS' && (
                                    <button
                                      onClick={() => handleEmpresaFilterRelatorio(empresa)}
                                      className="text-xs text-blue-400 hover:text-blue-300 underline"
                                      title={`Filtrar apenas por ${empresa}`}
                                    >
                                      Ver Detalhes
                                    </button>
                                  )}
                                </div>
                                <div className="text-center">
                                  <p className="text-sm text-gray-400 mb-1">Valor Total</p>
                                  <p className="text-lg font-bold text-white">{formatCurrency(valor)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tabela de Dados */}
                  {filteredReportDisplayData && filteredReportDisplayData.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-gray-600/30">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-seguranca-black/70">
                            <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-600/50">Empresa</th>
                            <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-600/50">Descrição</th>
                            <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-600/50">Conta</th>
                            <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-600/50">Fornecedor / Beneficiário</th>
                            <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-600/50">Valor</th>
                            <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-600/50">Vencimento</th>
                            <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-600/50">Status</th>
                            <th className="px-4 py-3 text-left text-white font-semibold border-b border-gray-600/50">Tipo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedData.map((conta: ContaAPagar, index: number) => {
                            const empresaSigla = conta.companySigla || conta.empresa || 'Não informado';
                            const beneficiario = resolveFornecedorOuFuncionario(conta);
                            return (
                              <tr key={conta.id || index} className={index % 2 === 0 ? 'bg-seguranca-graphite/30' : 'bg-seguranca-black/30'}>
                                <td className="px-4 py-3 border-b border-gray-700/30">
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className={`text-xs font-medium ${empresaSigla === 'ADM' ? 'border-blue-500 text-blue-300 bg-blue-500/10' :
                                        empresaSigla === 'TERC' ? 'border-green-500 text-green-300 bg-green-500/10' :
                                          empresaSigla === 'VIG' ? 'border-purple-500 text-purple-300 bg-purple-500/10' :
                                            'border-gray-500 text-gray-300 bg-gray-500/10'
                                        }`}
                                    >
                                      {empresaSigla}
                                    </Badge>
                                    {empresaFilterRelatorio === 'TODAS' && (
                                      <button
                                        onClick={() => handleEmpresaFilterRelatorio(empresaSigla)}
                                        className="text-xs text-blue-400 hover:text-blue-300 underline"
                                        title={`Filtrar apenas por ${empresaSigla}`}
                                      >
                                        Filtrar
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-gray-300 border-b border-gray-700/30">{conta.descricao}</td>
                                <td className="px-4 py-3 text-gray-400 border-b border-gray-700/30">
                                  <div className="max-w-xs truncate" title={formatContaPlanoDeContas(conta)}>
                                    {formatContaPlanoDeContas(conta) || '-'}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-gray-300 border-b border-gray-700/30">{beneficiario}</td>
                                <td className="px-4 py-3 text-green-400 font-medium border-b border-gray-700/30">{formatCurrency(conta.valor)}</td>
                                <td className="px-4 py-3 text-gray-300 border-b border-gray-700/30">
                                  {conta.vencimento ? format(conta.vencimento, 'dd/MM/yyyy') : '-'}
                                </td>
                                <td className="px-4 py-3 border-b border-gray-700/30">
                                  <Badge variant={conta.status === 'PAGA' ? 'default' : conta.status === 'VENCIDA' ? 'destructive' : 'secondary'} className="text-xs">
                                    {getStatusDisplayName(conta.status)}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-gray-300 border-b border-gray-700/30">{conta.tipo}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Controles de Paginação */}
                  {filteredReportDisplayData && filteredReportDisplayData.length > 0 && totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between bg-seguranca-black/30 rounded-lg p-4 border border-gray-600/30">
                      <div className="text-sm text-gray-400">
                        Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filteredReportDisplayData.length)} - {Math.min(currentPage * itemsPerPage, filteredReportDisplayData.length)} de {filteredReportDisplayData.length} registros
                        {empresaFilterRelatorio !== 'TODAS' && ` (Filtrado por: ${empresaFilterRelatorio})`}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handlePreviousPage}
                          disabled={currentPage === 1}
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300 hover:bg-seguranca-black disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft size={16} className="mr-1" />
                          Anterior
                        </Button>

                        <div className="flex items-center gap-1">
                          {[...Array(totalPages)].map((_, idx) => {
                            const pageNum = idx + 1;
                            // Mostrar apenas páginas próximas à atual
                            if (
                              pageNum === 1 ||
                              pageNum === totalPages ||
                              (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                            ) {
                              return (
                                <Button
                                  key={pageNum}
                                  onClick={() => setCurrentPage(pageNum)}
                                  variant={currentPage === pageNum ? "default" : "outline"}
                                  size="sm"
                                  className={`min-w-[40px] ${currentPage === pageNum
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : "border-gray-600 text-gray-300 hover:bg-seguranca-black"
                                    }`}
                                >
                                  {pageNum}
                                </Button>
                              );
                            } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                              return <span key={pageNum} className="text-gray-500 px-2">...</span>;
                            }
                            return null;
                          })}
                        </div>

                        <Button
                          onClick={handleNextPage}
                          disabled={currentPage === totalPages}
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300 hover:bg-seguranca-black disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Próxima
                          <ChevronRight size={16} className="ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Mensagem quando não há dados filtrados */}
                  {filteredReportDisplayData && filteredReportDisplayData.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      {empresaFilterRelatorio !== 'TODAS'
                        ? `Nenhuma conta encontrada para a empresa: ${empresaFilterRelatorio}`
                        : 'Nenhuma conta encontrada para os filtros aplicados.'
                      }
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

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

        {/* Modal de Relatório Personalizado (PDF) */}
        <ContasAPagarReportCustomModal
          open={showCustomReportModal}
          onOpenChange={setShowCustomReportModal}
        />

        {/* Modal de Importação de Planilha Excel */}
        <ImportInvoicesModal
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={loadData}
        />
      </div>
    </StandardLayout>
  );
};

export default ContasAPagar;