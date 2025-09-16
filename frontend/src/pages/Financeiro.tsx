import React, { useState, useEffect, useRef } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Eye, DollarSign, TrendingUp, TrendingDown, Calendar, Loader2, AlertCircle, RefreshCw, Trash, Calculator, Clock, CheckCircle, FileText } from 'lucide-react';
import { TransacaoFormModal } from '@/components/financeiro/TransacaoFormModal';
import { ContaReceberModal } from '@/components/financeiro/ContaReceberModal';
import { FaturaViewModal } from '@/components/financeiro/FaturaViewModal';
import { ConfirmarPagamentoModal } from '@/components/financeiro/ConfirmarPagamentoModal';
import { FinanceiroDashboard } from '@/components/financeiro/FinanceiroDashboard';
import { FinanceiroRelatorios } from '@/components/financeiro/FinanceiroRelatorios';
import MeasurementCompleteTable from '@/components/financeiro/MeasurementCompleteTable';
import MeasurementSimpleTable from '@/components/financeiro/MeasurementSimpleTable';
import { MeasurementBulletinModal } from '@/components/financeiro/MeasurementBulletinModal';
import { SimplifiedMeasurementModal } from '@/components/financeiro/SimplifiedMeasurementModal';
import { useToast } from '@/hooks/use-toast';
import { financialService, FinancialTransaction, Invoice, FinancialReport } from '@/services/financialService';
import { measurementService } from '@/services/measurementService';
import { MeasurementBulletin } from '@/types/measurement';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { clientService } from '@/services/clientService';
import { contractService } from '@/services/contractService';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { EmptyState } from '@/components/ui/EmptyState';
import { unitService, Unit } from '@/services/unitService';
import ProvisioningTable from '@/components/financeiro/ProvisioningTable';
import { provisioningService } from '@/services/provisioningService';
import { Provisioning } from '@/types/provisioning';

// Definir type union para status de fatura
export type InvoiceStatus = 'PENDENTE' | 'PAGA' | 'CANCELADA' | 'PENDENTE_ERRO';

const Financeiro: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showTransacaoModal, setShowTransacaoModal] = useState(false);
  const [showContaReceberModal, setShowContaReceberModal] = useState(false);
  const [showFaturaModal, setShowFaturaModal] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [selectedFatura, setSelectedFatura] = useState<Invoice | null>(null);
  const [resumoFinanceiro, setResumoFinanceiro] = useState<FinancialReport | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  const [showNovaFaturaModal, setShowNovaFaturaModal] = useState(false);
  const [editandoFatura, setEditandoFatura] = useState(false);
  const [novaFatura, setNovaFatura] = useState<{
    id: string;
    description: string;
    client: any;
    contract: any;
    amount: number;
    issueDate: string;
    dueDate: string;
    notes: string;
    unit: any;
    status: InvoiceStatus;
  }>({
    id: '',
    description: '',
    client: null,
    contract: null,
    amount: 0,
    issueDate: '',
    dueDate: '',
    notes: '',
    unit: null,
    status: 'PENDENTE',
  });
  const [salvandoFatura, setSalvandoFatura] = useState(false);
  const [clientesSelect, setClientesSelect] = useState([]);
  const [contratosSelect, setContratosSelect] = useState([]);
  const [editandoTransacao, setEditandoTransacao] = useState<FinancialTransaction | null>(null);
  const [modoEdicaoTransacao, setModoEdicaoTransacao] = useState(false);
  const [novaFaturaErro, setNovaFaturaErro] = useState<string | null>(null);
  const [unidadesSelect, setUnidadesSelect] = useState<Unit[]>([]);
  const [loadingEditData, setLoadingEditData] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Estados para medição
  const [measurementBulletins, setMeasurementBulletins] = useState<MeasurementBulletin[]>([]);
  const [selectedBulletin, setSelectedBulletin] = useState<MeasurementBulletin | null>(null);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationData, setValidationData] = useState({ validatedBy: '', checkedBy: '' });
  
  // Estados para modal de medição
  const [showMeasurementBulletinModal, setShowMeasurementBulletinModal] = useState(false);
  const [showSimplifiedMeasurementModal, setShowSimplifiedMeasurementModal] = useState(false);
  const [editingBulletin, setEditingBulletin] = useState<MeasurementBulletin | null>(null);

  // Estados para provisionamento
  const [provisionings, setProvisionings] = useState<Provisioning[]>([]);
  const [selectedProvisioning, setSelectedProvisioning] = useState<Provisioning | null>(null);
  const [showProvisioningModal, setShowProvisioningModal] = useState(false);

  // Ajustar statusOptions para usar InvoiceStatus
  const statusOptions: { value: InvoiceStatus; label: string }[] = [
    { value: 'PENDENTE', label: 'Pendente' },
    { value: 'PAGA', label: 'Pago' },
    { value: 'CANCELADA', label: 'Cancelada' },
    { value: 'PENDENTE_ERRO', label: 'Atrasada' }
  ];

  // Carregar dados financeiros
  const loadFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('DEBUG: Iniciando carregamento de dados financeiros...');
      
      const [summary, transactionsData, invoicesData] = await Promise.all([
        financialService.getFinancialReport(),
        financialService.getTransactions(),
        financialService.getInvoices()
      ]);
      
      console.log('DEBUG: Dados carregados:', {
        summary,
        transactionsData: transactionsData?.length,
        invoicesData: invoicesData?.length
      });
      
      if (invoicesData && Array.isArray(invoicesData)) {
        console.log('DEBUG: Primeira fatura:', invoicesData[0]);
        console.log('DEBUG: Campos da fatura:', Object.keys(invoicesData[0] || {}));
        console.log('DEBUG: Todas as faturas:', invoicesData);
        
        // Verificar se as faturas têm clientName
        const faturasSemCliente = invoicesData.filter(f => !f.clientName);
        if (faturasSemCliente.length > 0) {
          console.warn('DEBUG: Faturas sem clientName:', faturasSemCliente);
          console.warn('DEBUG: Campos das faturas sem cliente:', faturasSemCliente.map(f => Object.keys(f)));
        }
        
        // Verificar se as faturas têm clientId
        const faturasComClientId = invoicesData.filter(f => f.clientId);
        if (faturasComClientId.length > 0) {
          console.log('DEBUG: Faturas com clientId:', faturasComClientId.map(f => ({ id: f.id, clientId: f.clientId, clientName: f.clientName })));
        }
      }
      
      setResumoFinanceiro(summary);
      setTransactions(transactionsData);
      setInvoices(invoicesData);
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err);
      setError('Erro ao carregar dados financeiros. Tente novamente.');
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados financeiros.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingEditData(true);
        console.log('DEBUG: Iniciando carregamento de dados...');
        
        // Carregar clientes
        const clientesResponse = await clientService.getAllClients();
        console.log('DEBUG: Resposta completa do serviço de clientes:', clientesResponse);
        
        // Extrair clientes da resposta paginada
        let clientes = [];
        if (Array.isArray(clientesResponse)) {
          clientes = clientesResponse;
        } else if (clientesResponse && typeof clientesResponse === 'object') {
          if (Array.isArray(clientesResponse.content)) {
            clientes = clientesResponse.content;
          }
        }
        
        console.log('DEBUG: Clientes extraídos:', clientes.length, clientes);
        setClientesSelect(clientes.map((c: any) => ({ id: c.id, label: c.name, ...c })));
        
        // Carregar contratos (opcional)
        let contratos = [];
        try {
          const contratosResponse = await contractService.getContracts();
          contratos = Array.isArray(contratosResponse) ? contratosResponse : [];
          console.log('DEBUG: Contratos carregados:', contratos.length, contratos);
          setContratosSelect(contratos.map((c: any) => ({ id: c.id, label: c.contractNumber + (c.description ? ' - ' + c.description : ''), ...c })));
        } catch (error) {
          console.warn('DEBUG: Erro ao carregar contratos (opcional):', error);
          setContratosSelect([]);
        }
        
        // Carregar unidades
        const unidadesResponse = await unitService.getAllUnits();
        const unidades = Array.isArray(unidadesResponse) ? unidadesResponse : [];
        console.log('DEBUG: Unidades carregadas:', unidades.length, unidades);
        setUnidadesSelect(unidades);
        
        console.log('DEBUG: Todos os dados carregados com sucesso');
        console.log('DEBUG: clientesSelect final:', clientes.length);
        console.log('DEBUG: unidadesSelect final:', unidades.length);
        console.log('DEBUG: contratosSelect final:', contratos.length);
        setRetryCount(0); // Resetar contador de tentativas
      } catch (error) {
        console.error('DEBUG: Erro ao carregar dados:', error);
        toast({
          title: "Erro",
          description: "Falha ao carregar dados necessários para edição",
          variant: "destructive"
        });
      } finally {
        setLoadingEditData(false);
      }
    };
    
    loadData();
    loadFinancialData();
  }, []);

  // Limpar filtros
  const clearFilters = () => {
    setSearchTerm('');
    loadFinancialData();
  };

  // Atualizar dados
  const refreshData = async () => {
    setRefreshing(true);
    try {
      await loadFinancialData();
      toast({
        title: "Sucesso",
        description: "Dados financeiros atualizados.",
      });
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os dados financeiros.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Filtrar dados localmente
  const invoicesArray = Array.isArray(invoices) ? invoices : [];
  const filteredInvoices = invoicesArray.filter(invoice =>
    (invoice.invoiceNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (invoice.clientName?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const transactionsArray = Array.isArray(transactions) ? transactions : [];
  const filteredTransactions = transactionsArray.filter(transaction =>
    (transaction.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (transaction.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleTransacaoSuccess = () => {
    toast({
      title: "Sucesso",
      description: modoEdicaoTransacao ? "Transação editada com sucesso!" : "Transação salva com sucesso!",
    });
    setShowTransacaoModal(false);
    setEditandoTransacao(null);
    setModoEdicaoTransacao(false);
    loadFinancialData(); // Recarregar dados
  };

  const handlePagamentoSuccess = () => {
    toast({
      title: "Sucesso",
      description: "Pagamento confirmado com sucesso!",
    });
    setShowPagamentoModal(false);
    loadFinancialData(); // Recarregar dados
  };

  const handleViewFatura = (fatura: Invoice) => {
    setSelectedFatura(fatura);
    setShowFaturaModal(true);
  };

  const handleConfirmarPagamento = (fatura: Invoice) => {
    setSelectedFatura(fatura);
    setShowPagamentoModal(true);
  };

  const abrirModalNovaFatura = () => {
    setEditandoFatura(false);
    setNovaFatura({ id: '', description: '', client: null, contract: null, amount: 0, issueDate: '', dueDate: '', notes: '', unit: null, status: 'PENDENTE' });
    setShowNovaFaturaModal(true);
  };

  const abrirModalEditarFatura = async (fatura, retryAttempt = 0) => {
    console.log('DEBUG: Abrindo modal de edição para fatura:', fatura, 'Tentativa:', retryAttempt);
    console.log('DEBUG: clientesSelect.length:', clientesSelect.length);
    console.log('DEBUG: unidadesSelect.length:', unidadesSelect.length);
    console.log('DEBUG: contratosSelect.length:', contratosSelect.length);
    console.log('DEBUG: clientesSelect:', clientesSelect);
    console.log('DEBUG: unidadesSelect:', unidadesSelect);
    console.log('DEBUG: contratosSelect:', contratosSelect);
    
    // Evitar recursão infinita
    if (retryAttempt > 2) {
      console.error('DEBUG: Máximo de tentativas atingido');
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados necessários para edição. Tente recarregar a página.",
        variant: "destructive"
      });
      return;
    }
    
    // Se os dados não estão carregados, tentar carregar uma vez
    if (
      clientesSelect.length === 0 ||
      unidadesSelect.length === 0
      // Remover verificação de contratos pois são opcionais
    ) {
      console.log('DEBUG: Dados não carregados ainda, tentando recarregar...');
      
      if (retryAttempt === 0) {
        toast({
          title: "Aguarde",
          description: "Carregando dados necessários para edição...",
          variant: "default"
        });
        
        // Tentar recarregar os dados apenas uma vez
        try {
          setLoadingEditData(true);
          await Promise.all([
            clientService.getClients().then((res: any) => {
              console.log('DEBUG: Clientes carregados do serviço:', res);
              // Extrair clientes da resposta paginada
              let clientes = [];
              if (Array.isArray(res)) {
                clientes = res;
              } else if (res && typeof res === 'object') {
                if (Array.isArray(res.content)) {
                  clientes = res.content;
                }
              }
              console.log('DEBUG: Clientes extraídos do serviço:', clientes);
              setClientesSelect(clientes.map((c: any) => ({ id: c.id, label: c.name, ...c })));
              return clientes;
            }),
            // Carregar contratos (opcional)
            contractService.getContracts().then((res: any) => {
              const contratos = Array.isArray(res) ? res : [];
              setContratosSelect(contratos.map((c: any) => ({ id: c.id, label: c.contractNumber + (c.description ? ' - ' + c.description : ''), ...c })));
              return contratos;
            }).catch(error => {
              console.warn('DEBUG: Erro ao carregar contratos (opcional):', error);
              setContratosSelect([]);
              return [];
            }),
            unitService.getAllUnits().then((res: any) => {
              const unidades = Array.isArray(res) ? res : [];
              console.log('DEBUG: Unidades carregadas do serviço:', unidades);
              setUnidadesSelect(unidades);
              return unidades;
            })
          ]);
          
          // Aguardar um pouco para os estados serem atualizados
          setTimeout(() => {
            console.log('DEBUG: Dados recarregados, tentando abrir modal novamente...');
            setLoadingEditData(false);
            abrirModalEditarFatura(fatura, retryAttempt + 1);
          }, 1000); // Aumentar o tempo de espera
          
        } catch (error) {
          console.error('DEBUG: Erro ao recarregar dados:', error);
          setLoadingEditData(false);
          toast({
            title: "Erro",
            description: "Falha ao carregar dados necessários para edição",
            variant: "destructive"
          });
        }
        return;
      } else {
        // Se já tentou recarregar e ainda não tem dados, mostrar erro
        toast({
          title: "Erro",
          description: "Dados não disponíveis para edição. Tente recarregar a página.",
          variant: "destructive"
        });
        return;
      }
    }
    
    // Buscar objetos completos nas opções
    const clienteSelecionado = fatura.clientId
      ? clientesSelect.find(c => c.id.toString() === fatura.clientId.toString()) || null
      : null;
    const unidadeSelecionada = fatura.unitId
      ? unidadesSelect.find(u => u.id.toString() === fatura.unitId.toString()) || null
      : null;
    const contratoSelecionado = fatura.contractId
      ? contratosSelect.find(c => c.id.toString() === fatura.contractId.toString()) || null
      : null;
    
    console.log('DEBUG: Cliente selecionado:', clienteSelecionado);
    console.log('DEBUG: Unidade selecionada:', unidadeSelecionada);
    console.log('DEBUG: Contrato selecionado:', contratoSelecionado);
    
    setEditandoFatura(true);
    setNovaFatura({ ...fatura, client: clienteSelecionado, unit: unidadeSelecionada, contract: contratoSelecionado });
    setShowNovaFaturaModal(true);
    
    console.log('DEBUG: Modal aberto com dados:', { ...fatura, client: clienteSelecionado, unit: unidadeSelecionada, contract: contratoSelecionado });
  };

  const handleNovaFaturaChange = (field, value) => {
    setNovaFatura(prev => ({ ...prev, [field]: value }));
  };

  const handleSalvarNovaFatura = async () => {
    console.log('DEBUG: Iniciando salvamento de fatura');
    console.log('DEBUG: editandoFatura:', editandoFatura);
    console.log('DEBUG: novaFatura:', novaFatura);
    
    setNovaFaturaErro(null);
    if (!novaFatura.description || novaFatura.description.trim() === '') {
      setNovaFaturaErro('A descrição da fatura é obrigatória.');
      return;
    }
    if (!novaFatura.client || !novaFatura.client.id) {
      setNovaFaturaErro('O cliente é obrigatório.');
      return;
    }
    if (!novaFatura.amount || isNaN(novaFatura.amount) || novaFatura.amount < 0) {
      setNovaFaturaErro('O valor da fatura não pode ser negativo.');
      if (novaFatura.amount < 0) return;
    }
    if (!novaFatura.issueDate) {
      setNovaFaturaErro('A data de emissão é obrigatória.');
      return;
    }
    if (!novaFatura.dueDate) {
      setNovaFaturaErro('A data de vencimento é obrigatória.');
      return;
    }
    if (!novaFatura.unit || !novaFatura.unit.id) {
      setNovaFaturaErro('A unidade é obrigatória.');
      return;
    }
    
    console.log('DEBUG: Validações passaram, salvando...');
    setSalvandoFatura(true);
    try {
      let valorDelta = 0;
      if (editandoFatura) {
        console.log('DEBUG: Editando fatura existente');
        // Para edição, buscar a fatura original para comparar status/valor
        const faturaAntiga = invoices.find(f => f.id === novaFatura.id);
        console.log('DEBUG: Fatura antiga encontrada:', faturaAntiga);
        
        const dadosParaEnviar = {
          description: novaFatura.description,
          clientId: novaFatura.client?.id,
          contractId: novaFatura.contract?.id,
          amount: novaFatura.amount,
          issueDate: novaFatura.issueDate,
          dueDate: novaFatura.dueDate,
          notes: novaFatura.notes,
          unitId: novaFatura.unit?.id,
          status: novaFatura.status,
        };
        
        console.log('DEBUG: Dados para enviar:', dadosParaEnviar);
        
        await financialService.updateInvoice(novaFatura.id, dadosParaEnviar);
        // Se a fatura era pendente e continua pendente, atualiza diferença de valor
        if (faturaAntiga && faturaAntiga.status === 'PENDENTE') {
          valorDelta = novaFatura.amount - faturaAntiga.amount;
        }
        toast({ title: 'Sucesso', description: 'Fatura editada com sucesso!' });
      } else {
        console.log('DEBUG: Criando nova fatura');
        // Nova fatura sempre entra como pendente
        valorDelta = novaFatura.amount;
        await financialService.createInvoice({
          description: novaFatura.description,
          clientId: novaFatura.client?.id,
          contractId: novaFatura.contract?.id,
          amount: novaFatura.amount,
          issueDate: novaFatura.issueDate,
          dueDate: novaFatura.dueDate,
          notes: novaFatura.notes,
          unitId: novaFatura.unit?.id,
          status: novaFatura.status,
        });
        toast({ title: 'Sucesso', description: `Fatura criada com sucesso!` });
      }
      // Atualização instantânea do card
      setResumoFinanceiro(prev => prev ? { ...prev, accountsReceivable: (prev.accountsReceivable || 0) + valorDelta } : prev);
      setShowNovaFaturaModal(false);
      setNovaFatura({ id: '', description: '', client: null, contract: null, amount: 0, issueDate: '', dueDate: '', notes: '', unit: null, status: 'PENDENTE' });
      loadFinancialData();
    } catch (err) {
      console.error('DEBUG: Erro ao salvar fatura:', err);
      toast({ title: 'Erro', description: 'Erro ao salvar fatura', variant: 'destructive' });
    } finally {
      setSalvandoFatura(false);
    }
  };

  // Sincronizar cliente selecionado ao carregar clientesSelect
  useEffect(() => {
    if (showNovaFaturaModal && editandoFatura && clientesSelect.length > 0 && novaFatura.client) {
      const clienteSelecionado = clientesSelect.find(c => c.id.toString() === novaFatura.client.id.toString());
      if (clienteSelecionado) {
        setNovaFatura(prev => ({ ...prev, client: clienteSelecionado }));
        console.log('DEBUG Cliente preenchido:', clienteSelecionado);
      }
    }
  }, [showNovaFaturaModal, editandoFatura, clientesSelect]);

  // Sincronizar unidade selecionada ao carregar unidadesSelect
  useEffect(() => {
    if (showNovaFaturaModal && editandoFatura && unidadesSelect.length > 0 && novaFatura.unit) {
      const unidadeSelecionada = unidadesSelect.find(u => u.id.toString() === novaFatura.unit.id.toString());
      if (unidadeSelecionada) {
        setNovaFatura(prev => ({ ...prev, unit: unidadeSelecionada }));
        console.log('DEBUG Unidade preenchida:', unidadeSelecionada);
      }
    }
  }, [showNovaFaturaModal, editandoFatura, unidadesSelect]);

  // Sincronizar contrato selecionado ao carregar contratosSelect
  useEffect(() => {
    if (showNovaFaturaModal && editandoFatura && contratosSelect.length > 0 && novaFatura.contract) {
      const contratoSelecionado = contratosSelect.find(c => c.id.toString() === novaFatura.contract.id.toString());
      if (contratoSelecionado) {
        setNovaFatura(prev => ({ ...prev, contract: contratoSelecionado }));
        console.log('DEBUG Contrato preenchido:', contratoSelecionado);
      }
    }
  }, [showNovaFaturaModal, editandoFatura, contratosSelect]);

  const abrirModalNovaTransacao = () => {
    setModoEdicaoTransacao(false);
    setEditandoTransacao(null);
    setShowTransacaoModal(true);
  };

  const abrirModalEditarTransacao = (transacao: FinancialTransaction) => {
    setModoEdicaoTransacao(true);
    setEditandoTransacao(transacao);
    setShowTransacaoModal(true);
  };

  const handleDeleteFatura = async (fatura) => {
    if (!window.confirm('Tem certeza que deseja excluir esta fatura?')) return;
    try {
      await financialService.deleteInvoice(fatura.id);
      // Se a fatura era pendente, subtrai do total instantaneamente
      if (fatura.status === 'PENDENTE') {
        setResumoFinanceiro(prev => prev ? { ...prev, accountsReceivable: (prev.accountsReceivable || 0) - (fatura.amount || 0) } : prev);
      }
      toast({ title: 'Sucesso', description: 'Fatura excluída com sucesso!' });
      loadFinancialData();
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao excluir fatura', variant: 'destructive' });
    }
  };

  // Receita Total: transações INCOME + faturas pagas
  const receitaTransacoes = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const receitaFaturasPagas = invoices
    .filter(f => f.status === 'PAGA')
    .reduce((acc, f) => acc + (Number(f.amount) || 0), 0);
  const receitaTotal = receitaTransacoes + receitaFaturasPagas;

  // Contas a Receber: faturas pendentes/vencidas + transações INCOME pendentes
  const contasAReceberFaturas = invoices
    .filter(f => f.status === 'PENDENTE' || f.status === 'PENDENTE_ERRO')
    .reduce((acc, f) => acc + (Number(f.amount) || 0), 0);
  const contasAReceberTransacoes = transactions
    .filter(t => t.type === 'INCOME' && t.status === 'PENDING')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const contasAReceber = contasAReceberFaturas + contasAReceberTransacoes;

  // Despesa Total: transações EXPENSE
  const despesaTotal = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  // Lucro Líquido
  const lucroLiquido = receitaTotal - despesaTotal;

  // Calcular contas a pagar (transações com status PENDING)
  const contasAPagar = transactions
    .filter(t => t.type === 'EXPENSE' && t.status === 'PENDING')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  // Handlers para medição
  const handleViewBulletin = (bulletin: MeasurementBulletin) => {
    setSelectedBulletin(bulletin);
    setShowMeasurementModal(true);
  };

  const handleDeleteBulletin = async (bulletin: MeasurementBulletin) => {
    try {
      await measurementService.deleteBulletin(bulletin.id);
      toast({
        title: 'Sucesso!',
        description: 'Boletim de medição excluído com sucesso.',
      });
      loadMeasurementData();
    } catch (error) {
      toast({
        title: 'Erro!',
        description: 'Não foi possível excluir o boletim de medição.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateBulletin = () => {
    setEditingBulletin(null);
    setShowMeasurementBulletinModal(true);
  };

  const handleCreateSimplifiedBulletin = () => {
    setShowSimplifiedMeasurementModal(true);
  };

  const handleEditBulletin = (bulletin: MeasurementBulletin) => {
    setEditingBulletin(bulletin);
    setShowMeasurementBulletinModal(true);
  };

  const handleValidateBulletin = (bulletin: MeasurementBulletin) => {
    setSelectedBulletin(bulletin);
    setValidationData({ validatedBy: '', checkedBy: '' });
    setShowValidationModal(true);
  };

  const handleMeasurementSuccess = () => {
    // Recarregar dados de medição
    loadMeasurementData();
    setShowMeasurementBulletinModal(false);
    setEditingBulletin(null);
  };

  const handleConfirmValidation = async () => {
    if (!selectedBulletin) return;
    
    try {
      await measurementService.validateBulletin(selectedBulletin.id, validationData);
      toast({
        title: 'Sucesso!',
        description: 'Boletim de medição validado com sucesso.',
      });
      setShowValidationModal(false);
      loadMeasurementData();
    } catch (error) {
      toast({
        title: 'Erro!',
        description: 'Não foi possível validar o boletim de medição.',
        variant: 'destructive',
      });
    }
  };

  const loadMeasurementData = async () => {
    try {
      const data = await measurementService.getBulletins();
      setMeasurementBulletins(data);
    } catch (error) {
      console.error('Erro ao carregar boletins de medição:', error);
    }
  };

  const loadProvisioningData = async () => {
    try {
      const data = await provisioningService.getProvisionings();
      setProvisionings(data);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível carregar provisionamentos.', variant: 'destructive' });
    }
  };

  // Carregar dados de medição junto com os financeiros
  useEffect(() => {
    loadFinancialData();
    loadMeasurementData();
    loadProvisioningData();
  }, []);

  // Loading state
  if (loading && !resumoFinanceiro) {
    return (
      <StandardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-seguranca-red mb-4" />
            <p className="text-seguranca-lightgray">Carregando dados financeiros...</p>
          </div>
        </div>
      </StandardLayout>
    );
  }

  // Error state
  if (error && !resumoFinanceiro) {
    return (
      <StandardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-4" />
            <p className="text-seguranca-lightgray mb-4">{error}</p>
            <Button 
              onClick={() => loadFinancialData()}
              className="bg-seguranca-red hover:bg-seguranca-darkred"
            >
              Tentar Novamente
            </Button>
          </div>
        </div>
      </StandardLayout>
    );
  }

  const handleViewProvisioning = (prov: Provisioning) => {
    setSelectedProvisioning(prov);
    setShowProvisioningModal(true);
  };
  const handleEditProvisioning = (prov: Provisioning) => {
    setSelectedProvisioning(prov);
    setShowProvisioningModal(true);
  };
  const handleDeleteProvisioning = async (prov: Provisioning) => {
    await provisioningService.deleteProvisioning(prov.id);
    toast({ title: 'Provisionamento excluído!' });
    loadProvisioningData();
  };
  const handleCreateProvisioning = () => {
    setSelectedProvisioning(null);
    setShowProvisioningModal(true);
  };

  return (
    <StandardLayout>
      <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-seguranca-lightgray">Financeiro</h1>
            <p className="text-sm sm:text-base text-gray-400 mt-1">
              Gestão financeira, faturas e movimentações
              {loadingEditData && (
                <span className="ml-2 text-seguranca-yellow flex items-center">
                  <Loader2 size={14} className="animate-spin mr-1" />
                  Carregando dados de edição...
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              onClick={() => setShowTransacaoModal(true)}
              className="bg-seguranca-red hover:bg-seguranca-darkred text-sm"
            >
              <Plus size={18} className="mr-2" />
              <span className="hidden sm:inline">Nova Transação</span>
              <span className="sm:hidden">Nova Transação</span>
            </Button>
            <Button
              onClick={abrirModalNovaFatura}
              variant="outline"
              className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black text-sm"
            >
              <Plus size={18} className="mr-2" />
              <span className="hidden sm:inline">Nova Fatura</span>
              <span className="sm:hidden">Nova Fatura</span>
            </Button>
            <Button
              onClick={async () => {
                console.log('DEBUG: Testando APIs...');
                try {
                  const clientes = await clientService.getClients();
                  console.log('DEBUG: API Clientes:', clientes);
                  const contratos = await contractService.getContracts();
                  console.log('DEBUG: API Contratos:', contratos);
                  const unidades = await unitService.getAllUnits();
                  console.log('DEBUG: API Unidades:', unidades);
                  toast({
                    title: "Teste",
                    description: "APIs testadas, verifique o console",
                    variant: "default"
                  });
                } catch (error) {
                  console.error('DEBUG: Erro ao testar APIs:', error);
                  toast({
                    title: "Erro",
                    description: "Falha ao testar APIs",
                    variant: "destructive"
                  });
                }
              }}
              variant="outline"
              className="border-yellow-600 text-yellow-400 hover:bg-yellow-600/20 text-sm"
            >
              🧪 Testar APIs
            </Button>
            <Button
              onClick={async () => {
                console.log('DEBUG: Recarregando dados de edição...');
                try {
                  setLoadingEditData(true);
                  await Promise.all([
                    clientService.getClients().then((res: any) => {
                      let clientes = [];
                      if (Array.isArray(res)) {
                        clientes = res;
                      } else if (res && typeof res === 'object') {
                        if (Array.isArray(res.content)) {
                          clientes = res.content;
                        }
                      }
                      setClientesSelect(clientes.map((c: any) => ({ id: c.id, label: c.name, ...c })));
                      return clientes;
                    }),
                    // Carregar contratos (opcional)
                    contractService.getContracts().then((res: any) => {
                      const contratos = Array.isArray(res) ? res : [];
                      setContratosSelect(contratos.map((c: any) => ({ id: c.id, label: c.contractNumber + (c.description ? ' - ' + c.description : ''), ...c })));
                      return contratos;
                    }).catch(error => {
                      console.warn('DEBUG: Erro ao carregar contratos (opcional):', error);
                      setContratosSelect([]);
                      return [];
                    }),
                    unitService.getAllUnits().then((res: any) => {
                      const unidades = Array.isArray(res) ? res : [];
                      setUnidadesSelect(unidades);
                      return unidades;
                    })
                  ]);
                  toast({
                    title: "Sucesso",
                    description: "Dados de edição recarregados",
                    variant: "default"
                  });
                } catch (error) {
                  console.error('DEBUG: Erro ao recarregar dados:', error);
                  toast({
                    title: "Erro",
                    description: "Falha ao recarregar dados",
                    variant: "destructive"
                  });
                } finally {
                  setLoadingEditData(false);
                }
              }}
              variant="outline"
              className="border-blue-600 text-blue-400 hover:bg-blue-600/20 text-sm"
              disabled={loadingEditData}
            >
              {loadingEditData ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" />
                  Recarregando...
                </>
              ) : (
                '🔄 Recarregar Dados'
              )}
            </Button>
          </div>
        </div>

        {/* Resumo Financeiro */}
        {resumoFinanceiro && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-seguranca-graphite border-gray-600 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Receita Total</p>
                  <p className="text-2xl font-bold text-green-500">
                    R$ {receitaTotal.toLocaleString('pt-BR')}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </Card>

            <Card className="bg-seguranca-graphite border-gray-600 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Despesa Total</p>
                  <p className="text-2xl font-bold text-red-500">
                    R$ {despesaTotal.toLocaleString('pt-BR')}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-500" />
              </div>
            </Card>

            <Card className="bg-seguranca-graphite border-gray-600 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Lucro Líquido</p>
                  <p className="text-2xl font-bold text-seguranca-yellow">
                    R$ {lucroLiquido.toLocaleString('pt-BR')}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-seguranca-yellow" />
              </div>
            </Card>

            <Card className="bg-seguranca-graphite border-gray-600 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Contas a Receber</p>
                  <p className="text-2xl font-bold text-blue-500">
                    R$ {contasAReceber.toLocaleString('pt-BR')}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </Card>

            <Card className="bg-seguranca-graphite border-gray-600 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Contas a Pagar</p>
                  <p className="text-2xl font-bold text-orange-500">
                    R$ {contasAPagar.toLocaleString('pt-BR')}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-orange-500" />
              </div>
            </Card>
          </div>
        )}

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="bg-seguranca-graphite border-gray-600 p-1 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-1">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-seguranca-black data-[state=active]:text-seguranca-yellow text-xs px-2 py-1">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="contas-pagar" className="data-[state=active]:bg-seguranca-black data-[state=active]:text-seguranca-yellow text-xs px-2 py-1">
              Contas a Pagar
            </TabsTrigger>
            <TabsTrigger value="contas-receber" className="data-[state=active]:bg-seguranca-black data-[state=active]:text-seguranca-yellow text-xs px-2 py-1">
              Contas a Receber
            </TabsTrigger>
            <TabsTrigger value="fluxo-caixa" className="data-[state=active]:bg-seguranca-black data-[state=active]:text-seguranca-yellow text-xs px-2 py-1">
              Fluxo de Caixa
            </TabsTrigger>
            <TabsTrigger value="pagamentos" className="data-[state=active]:bg-seguranca-black data-[state=active]:text-seguranca-yellow text-xs px-2 py-1">
              Pagamentos
            </TabsTrigger>
            <TabsTrigger value="relatorios-financeiros" className="data-[state=active]:bg-seguranca-black data-[state=active]:text-seguranca-yellow text-xs px-2 py-1">
              Relatórios Financeiros
            </TabsTrigger>
            <TabsTrigger value="centro-custos" className="data-[state=active]:bg-seguranca-black data-[state=active]:text-seguranca-yellow text-xs px-2 py-1">
              Centro de Custos
            </TabsTrigger>
            <TabsTrigger value="faturas" className="data-[state=active]:bg-seguranca-black data-[state=active]:text-seguranca-yellow text-xs px-2 py-1">
              Faturas
            </TabsTrigger>
            <TabsTrigger value="medicao" className="data-[state=active]:bg-seguranca-black data-[state=active]:text-seguranca-yellow text-xs px-2 py-1">
              Medição
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Card className="bg-seguranca-graphite border-gray-600 p-3 sm:p-6">
              <FinanceiroDashboard 
                transactions={transactions}
                invoices={invoices}
                refreshData={refreshData}
              />
            </Card>
          </TabsContent>

          <TabsContent value="faturas">
            <Card className="bg-seguranca-graphite border-gray-600 p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    placeholder="Buscar faturas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-seguranca-black border-gray-600 text-seguranca-lightgray text-sm"
                  />
                </div>
                <Button
                  className="bg-seguranca-red hover:bg-seguranca-darkred text-sm"
                  onClick={abrirModalNovaFatura}
                >
                  <Plus size={18} className="mr-2" />
                  <span className="hidden sm:inline">Nova Fatura</span>
                  <span className="sm:hidden">Nova</span>
                </Button>
                <Button variant="outline" className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black text-sm">
                  <Filter size={18} className="mr-2" />
                  <span className="hidden sm:inline">Filtros</span>
                  <span className="sm:hidden">Filtros</span>
                </Button>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 size={32} className="animate-spin text-seguranca-yellow" />
                  <span className="ml-2 text-seguranca-lightgray">Carregando faturas...</span>
                </div>
              ) : filteredInvoices.length === 0 ? (
                <EmptyState
                  message={searchTerm ? 'Nenhuma fatura encontrada para sua busca.' : 'Nenhuma fatura cadastrada ainda.'}
                  icon={DollarSign}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="border-b border-gray-600">
                        <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-seguranca-lightgray text-xs sm:text-sm">Número</th>
                        <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-seguranca-lightgray text-xs sm:text-sm">Cliente</th>
                        <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-seguranca-lightgray text-xs sm:text-sm">Valor</th>
                        <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-seguranca-lightgray text-xs sm:text-sm">Vencimento</th>
                        <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-seguranca-lightgray text-xs sm:text-sm">Status</th>
                        <th className="text-center py-2 sm:py-3 px-2 sm:px-4 font-medium text-seguranca-lightgray text-xs sm:text-sm">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((fatura) => (
                        <tr key={fatura.id} className="border-b border-gray-700 hover:bg-seguranca-black/50">
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-seguranca-lightgray text-xs sm:text-sm">{fatura.invoiceNumber}</td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-seguranca-lightgray text-xs sm:text-sm max-w-[150px] truncate" title={fatura.clientName}>{fatura.clientName}</td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-seguranca-lightgray text-xs sm:text-sm">
                            {fatura.amount !== undefined && fatura.amount !== null && !isNaN(Number(fatura.amount)) ? `R$ ${(Number(fatura.amount)).toLocaleString('pt-BR')}` : '-'}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-400 text-xs sm:text-sm">
                            {fatura.dueDate ? new Date(fatura.dueDate).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4">
                            <Badge
                              className={`text-xs ${
                                fatura.status === 'PAGA' ? 'bg-green-100 text-green-800' :
                                fatura.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-800' :
                                fatura.status === 'CANCELADA' ? 'bg-red-100 text-red-800' :
                                fatura.status === 'PENDENTE_ERRO' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-200 text-gray-800'
                              }`}
                            >
                              {fatura.status === 'PAGA' ? 'Pago' :
                               fatura.status === 'PENDENTE' ? 'Pendente' :
                               fatura.status === 'CANCELADA' ? 'Cancelado' :
                               fatura.status === 'PENDENTE_ERRO' ? 'Atrasada' :
                               fatura.status || '-'}
                            </Badge>
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4">
                            <div className="flex justify-center gap-1 sm:gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewFatura(fatura)}
                                className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black p-1 sm:p-2"
                              >
                                <Eye size={14} className="sm:w-4 sm:h-4" />
                              </Button>
                              {fatura.status === 'PENDENTE' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleConfirmarPagamento(fatura)}
                                  className="border-green-500 text-green-600 hover:bg-green-50 p-1 sm:p-2"
                                >
                                  <span className="hidden sm:inline">Confirmar</span>
                                  <span className="sm:hidden">✓</span>
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => abrirModalEditarFatura(fatura)}
                                disabled={loadingEditData}
                                className="border-blue-500 text-blue-600 hover:bg-blue-50 p-1 sm:p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {loadingEditData ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <>
                                    <span className="hidden sm:inline">Editar</span>
                                    <span className="sm:hidden">✎</span>
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteFatura(fatura)}
                                className="border-red-500 text-red-600 hover:bg-red-50 p-1 sm:p-2"
                              >
                                <Trash size={14} className="sm:w-4 sm:h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="medicao">
            <Tabs defaultValue="dashboard" className="space-y-4">
              <TabsList className="bg-seguranca-graphite border-gray-600">
                <TabsTrigger value="dashboard" className="data-[state=active]:bg-seguranca-black data-[state=active]:text-seguranca-yellow">
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="completa" className="data-[state=active]:bg-seguranca-black data-[state=active]:text-seguranca-yellow">
                  Completa
                </TabsTrigger>
                <TabsTrigger value="simplificada" className="data-[state=active]:bg-seguranca-black data-[state=active]:text-seguranca-yellow">
                  Simplificada
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard">
                <Card className="bg-seguranca-graphite border-gray-600 p-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-white mb-4">Dashboard de Medição</h3>
                    <p className="text-seguranca-lightgray mb-6">
                      Visão geral das medições completas e simplificadas
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-seguranca-black p-4 rounded-lg">
                        <h4 className="text-seguranca-yellow font-medium mb-2">Medições Completas</h4>
                        <p className="text-white text-2xl font-bold">0</p>
                        <p className="text-seguranca-lightgray text-sm">Total de medições</p>
                      </div>
                      <div className="bg-seguranca-black p-4 rounded-lg">
                        <h4 className="text-seguranca-yellow font-medium mb-2">Medições Simplificadas</h4>
                        <p className="text-white text-2xl font-bold">0</p>
                        <p className="text-seguranca-lightgray text-sm">Total de medições</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="completa">
                <MeasurementCompleteTable
                  onView={handleViewBulletin}
                  onEdit={handleEditBulletin}
                  onDelete={handleDeleteBulletin}
                  onCreate={handleCreateBulletin}
                  onCreateSimplified={handleCreateSimplifiedBulletin}
                  onValidate={handleValidateBulletin}
                />
              </TabsContent>

              <TabsContent value="simplificada">
                <MeasurementSimpleTable
                  onView={handleViewBulletin}
                  onEdit={handleEditBulletin}
                  onDelete={handleDeleteBulletin}
                  onCreate={handleCreateSimplifiedBulletin}
                  onValidate={handleValidateBulletin}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="contas-pagar">
            <Card className="bg-seguranca-graphite border-gray-600 p-3 sm:p-6">
              {/* Cabeçalho com resumo */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-seguranca-lightgray">Contas a Pagar</h3>
                    <p className="text-gray-400">Gerencie suas contas e compromissos financeiros</p>
                  </div>
                  <Button
                    onClick={() => setShowTransacaoModal(true)}
                    className="bg-seguranca-red hover:bg-seguranca-darkred"
                  >
                    <Plus size={18} className="mr-2" />
                    Nova Conta a Pagar
                  </Button>
                </div>

                {/* Cards de Resumo */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card className="bg-seguranca-black border-gray-600 p-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Total a Pagar</p>
                      <p className="text-2xl font-bold text-orange-500">R$ {contasAPagar.toLocaleString('pt-BR')}</p>
                    </div>
                  </Card>
                  <Card className="bg-seguranca-black border-gray-600 p-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Vencidas</p>
                      <p className="text-2xl font-bold text-red-500">
                        R$ {filteredTransactions
                          .filter(t => t.type === 'EXPENSE' && t.status === 'PENDING' && new Date(t.date) < new Date())
                          .reduce((acc, t) => acc + (Number(t.amount) || 0), 0)
                          .toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </Card>
                  <Card className="bg-seguranca-black border-gray-600 p-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-400">A Vencer (30 dias)</p>
                      <p className="text-2xl font-bold text-yellow-500">
                        R$ {filteredTransactions
                          .filter(t => {
                            const vencimento = new Date(t.date);
                            const hoje = new Date();
                            const em30Dias = new Date();
                            em30Dias.setDate(hoje.getDate() + 30);
                            return t.type === 'EXPENSE' && t.status === 'PENDING' && vencimento >= hoje && vencimento <= em30Dias;
                          })
                          .reduce((acc, t) => acc + (Number(t.amount) || 0), 0)
                          .toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </Card>
                  <Card className="bg-seguranca-black border-gray-600 p-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Pagas no Mês</p>
                      <p className="text-2xl font-bold text-green-500">
                        R$ {filteredTransactions
                          .filter(t => {
                            const dataTransacao = new Date(t.date);
                            const hoje = new Date();
                            return t.type === 'EXPENSE' && t.status === 'CONFIRMED' && 
                                   dataTransacao.getMonth() === hoje.getMonth() && 
                                   dataTransacao.getFullYear() === hoje.getFullYear();
                          })
                          .reduce((acc, t) => acc + (Number(t.amount) || 0), 0)
                          .toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Filtros */}
              <div className="space-y-4 mb-6">
                {/* Primeira linha - Busca */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    placeholder="Buscar por descrição, fornecedor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                  />
                </div>
                
                {/* Segunda linha - Filtros */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  <select className="bg-seguranca-black border-gray-600 text-seguranca-lightgray rounded px-3 py-2 text-sm border">
                    <option value="">Status</option>
                    <option value="PENDING">Pendente</option>
                    <option value="CONFIRMED">Pago</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                  <select className="bg-seguranca-black border-gray-600 text-seguranca-lightgray rounded px-3 py-2 text-sm border">
                    <option value="">Centro de Custo</option>
                    <option value="OPERACIONAL">Operacional</option>
                    <option value="ADMINISTRATIVO">Administrativo</option>
                    <option value="COMERCIAL">Comercial</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                  <Input
                    type="date"
                    placeholder="Data início"
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray text-sm"
                  />
                  <Input
                    type="date"
                    placeholder="Data fim"
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray text-sm"
                  />
                <Button variant="outline" className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black text-sm">
                    <Filter size={16} className="sm:mr-2" />
                    <span className="hidden sm:inline">Filtrar</span>
                  </Button>
                  <Button variant="outline" className="border-blue-600 text-blue-400 hover:bg-blue-600/20 text-sm">
                    <span className="hidden sm:inline">📊 Relatório</span>
                    <span className="sm:hidden">📊</span>
                </Button>
                </div>
              </div>

              {/* Lista de Contas a Pagar */}
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 size={32} className="animate-spin text-seguranca-yellow" />
                  <span className="ml-2 text-seguranca-lightgray">Carregando contas a pagar...</span>
                </div>
              ) : filteredTransactions.filter(t => t.type === 'EXPENSE').length === 0 ? (
                <div className="text-center py-12">
                  <TrendingDown className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                  <p className="text-gray-400">Nenhuma conta a pagar encontrada</p>
                  <Button
                    onClick={() => setShowTransacaoModal(true)}
                    className="mt-4 bg-seguranca-red hover:bg-seguranca-darkred"
                  >
                    <Plus size={18} className="mr-2" />
                    Criar primeira conta
                  </Button>
                </div>
              ) : (
                <>
                  {/* Tabela Desktop (md e acima) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b border-gray-600">
                          <th className="text-left py-3 px-2 lg:px-4 font-medium text-seguranca-lightgray text-sm">Data</th>
                          <th className="text-left py-3 px-2 lg:px-4 font-medium text-seguranca-lightgray text-sm">Descrição</th>
                          <th className="text-left py-3 px-2 lg:px-4 font-medium text-seguranca-lightgray text-sm">Fornecedor</th>
                          <th className="text-left py-3 px-2 lg:px-4 font-medium text-seguranca-lightgray text-sm">Categoria</th>
                          <th className="text-left py-3 px-2 lg:px-4 font-medium text-seguranca-lightgray text-sm">Centro</th>
                          <th className="text-left py-3 px-2 lg:px-4 font-medium text-seguranca-lightgray text-sm">Vencimento</th>
                          <th className="text-left py-3 px-2 lg:px-4 font-medium text-seguranca-lightgray text-sm">Valor</th>
                          <th className="text-left py-3 px-2 lg:px-4 font-medium text-seguranca-lightgray text-sm">Status</th>
                          <th className="text-center py-3 px-2 lg:px-4 font-medium text-seguranca-lightgray text-sm">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions
                          .filter(transaction => transaction.type === 'EXPENSE')
                          .map((conta) => {
                            const isVencida = new Date(conta.date) < new Date() && conta.status === 'PENDING';
                            const diasAteVencimento = Math.ceil((new Date(conta.date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                            
                            return (
                              <tr key={conta.id} className={`border-b border-gray-700 hover:bg-seguranca-black/50 ${isVencida ? 'bg-red-900/20' : ''}`}>
                                <td className="py-3 px-2 lg:px-4 text-gray-400 text-sm">
                                  {new Date(conta.date).toLocaleDateString('pt-BR')}
                          </td>
                                <td className="py-3 px-2 lg:px-4 text-seguranca-lightgray text-sm max-w-[150px] lg:max-w-[200px] truncate" title={conta.description}>
                                  {conta.description}
                          </td>
                                <td className="py-3 px-2 lg:px-4 text-seguranca-lightgray text-sm max-w-[120px] lg:max-w-[150px] truncate" title={conta.supplierName || '-'}>
                                  {conta.supplierName || '-'}
                          </td>
                                <td className="py-3 px-2 lg:px-4 text-seguranca-lightgray text-sm max-w-[100px] lg:max-w-[120px] truncate" title={conta.category}>
                                  {conta.category || '-'}
                          </td>
                                <td className="py-3 px-2 lg:px-4 text-sm">
                                  <Badge className="bg-cyan-100 text-cyan-800 text-xs">
                                    {conta.costCenter?.substring(0, 5) || 'Oper'}
                            </Badge>
                          </td>
                                <td className="py-3 px-2 lg:px-4 text-sm">
                                  <div className="flex flex-col">
                                    <span className={`text-sm ${isVencida ? 'text-red-400' : diasAteVencimento <= 7 ? 'text-yellow-400' : 'text-gray-400'}`}>
                                      {new Date(conta.date).toLocaleDateString('pt-BR')}
                                    </span>
                                    {conta.status === 'PENDING' && (
                                      <span className={`text-xs ${isVencida ? 'text-red-400' : diasAteVencimento <= 7 ? 'text-yellow-400' : 'text-gray-500'}`}>
                                        {isVencida 
                                          ? `Vencida há ${Math.abs(diasAteVencimento)} dias` 
                                          : diasAteVencimento <= 7 
                                          ? `Vence em ${diasAteVencimento} dias`
                                          : ''
                                        }
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-2 lg:px-4 font-medium text-sm text-red-500">
                                  R$ {(Number(conta.amount) || 0).toLocaleString('pt-BR')}
                                </td>
                                <td className="py-3 px-2 lg:px-4">
                            <Badge
                              className={`text-xs ${
                                      conta.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                                      conta.status === 'PENDING' ? (isVencida ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800') :
                                      conta.status === 'CANCELLED' ? 'bg-gray-100 text-gray-800' :
                                'bg-gray-200 text-gray-800'
                              }`}
                            >
                                    {conta.status === 'CONFIRMED' ? 'Pago' :
                                     conta.status === 'PENDING' ? (isVencida ? 'Vencida' : 'Pendente') :
                                     conta.status === 'CANCELLED' ? 'Cancelado' :
                                     conta.status || '-'}
                            </Badge>
                          </td>
                                <td className="py-3 px-2 lg:px-4">
                                  <div className="flex justify-center gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => abrirModalEditarTransacao(conta)}
                                      className="border-blue-500 text-blue-600 hover:bg-blue-50 p-1 h-8 w-8"
                                    >
                                      ✏️
                                    </Button>
                                    {conta.status === 'PENDING' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          console.log('Marcar como pago:', conta.id);
                                        }}
                                        className="border-green-500 text-green-600 hover:bg-green-50 p-1 h-8 w-8"
                                      >
                                        ✓
                                      </Button>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        if (confirm('Deseja excluir esta conta?')) {
                                          console.log('Excluir conta:', conta.id);
                                        }
                                      }}
                                      className="border-red-500 text-red-600 hover:bg-red-50 p-1 h-8 w-8"
                                    >
                                      🗑️
                                    </Button>
                                  </div>
                          </td>
                        </tr>
                            );
                          })}
                    </tbody>
                  </table>
                </div>

                  {/* Cards Mobile (sm e abaixo) */}
                  <div className="md:hidden space-y-4">
                    {filteredTransactions
                      .filter(transaction => transaction.type === 'EXPENSE')
                      .map((conta) => {
                        const isVencida = new Date(conta.date) < new Date() && conta.status === 'PENDING';
                        const diasAteVencimento = Math.ceil((new Date(conta.date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                        
                        return (
                          <Card key={conta.id} className={`bg-seguranca-black border-gray-600 p-4 ${isVencida ? 'border-red-500' : ''}`}>
                            <div className="space-y-3">
                              {/* Header */}
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-medium text-seguranca-lightgray text-sm mb-1">{conta.description}</h4>
                                  <p className="text-gray-400 text-xs">{conta.supplierName || 'Fornecedor não informado'}</p>
                                </div>
                                <Badge
                                  className={`text-xs ml-2 ${
                                    conta.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                                    conta.status === 'PENDING' ? (isVencida ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800') :
                                    conta.status === 'CANCELLED' ? 'bg-gray-100 text-gray-800' :
                                    'bg-gray-200 text-gray-800'
                                  }`}
                                >
                                  {conta.status === 'CONFIRMED' ? 'Pago' :
                                   conta.status === 'PENDING' ? (isVencida ? 'Vencida' : 'Pendente') :
                                   conta.status === 'CANCELLED' ? 'Cancelado' :
                                   conta.status || '-'}
                                </Badge>
                              </div>

                              {/* Valor */}
                              <div className="text-right">
                                <span className="text-xl font-bold text-red-500">
                                  R$ {(Number(conta.amount) || 0).toLocaleString('pt-BR')}
                                </span>
                              </div>

                              {/* Informações */}
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-400">Data:</span>
                                  <p className="text-seguranca-lightgray">{new Date(conta.date).toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400">Categoria:</span>
                                  <p className="text-seguranca-lightgray">{conta.category || '-'}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400">Centro de Custo:</span>
                                  <Badge className="bg-cyan-100 text-cyan-800 text-xs mt-1">
                                    {conta.costCenter || 'Operacional'}
                                  </Badge>
                                </div>
                                <div>
                                  <span className="text-gray-400">Vencimento:</span>
                                  <div className="flex flex-col">
                                    <span className={`text-sm ${isVencida ? 'text-red-400' : diasAteVencimento <= 7 ? 'text-yellow-400' : 'text-seguranca-lightgray'}`}>
                                      {new Date(conta.date).toLocaleDateString('pt-BR')}
                                    </span>
                                    {conta.status === 'PENDING' && (
                                      <span className={`text-xs ${isVencida ? 'text-red-400' : diasAteVencimento <= 7 ? 'text-yellow-400' : 'text-gray-500'}`}>
                                        {isVencida 
                                          ? `Vencida há ${Math.abs(diasAteVencimento)} dias` 
                                          : diasAteVencimento <= 7 
                                          ? `Vence em ${diasAteVencimento} dias`
                                          : ''
                                        }
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Ações */}
                              <div className="flex gap-2 pt-2 border-t border-gray-700">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => abrirModalEditarTransacao(conta)}
                                  className="flex-1 border-blue-500 text-blue-600 hover:bg-blue-50 text-xs"
                                >
                                  ✏️ Editar
                                </Button>
                                {conta.status === 'PENDING' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      console.log('Marcar como pago:', conta.id);
                                    }}
                                    className="flex-1 border-green-500 text-green-600 hover:bg-green-50 text-xs"
                                  >
                                    ✓ Pagar
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('Deseja excluir esta conta?')) {
                                      console.log('Excluir conta:', conta.id);
                                    }
                                  }}
                                  className="border-red-500 text-red-600 hover:bg-red-50 text-xs px-3"
                                >
                                  🗑️
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                  </div>
                </>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="contas-receber">
            <Card className="bg-seguranca-graphite border-gray-600 p-3 sm:p-6">
              {/* Cabeçalho */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-seguranca-lightgray">Contas a Receber</h3>
                    <p className="text-gray-400">Gerencie suas contas a receber e controle de inadimplência</p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
                    >
                      <FileText size={16} className="mr-2" />
                      Relatório Inadimplência
                    </Button>
                    <Button
                      onClick={() => setShowContaReceberModal(true)}
                      className="bg-seguranca-red hover:bg-seguranca-darkred"
                    >
                      <Plus size={16} className="mr-2" />
                      Nova Conta
                    </Button>
                  </div>
                </div>

                {/* Cards de Resumo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Card className="bg-seguranca-black border-gray-600 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Total a Receber</p>
                        <p className="text-2xl font-bold text-blue-500">
                          R$ 35.500
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-blue-500" />
                    </div>
                  </Card>
                  <Card className="bg-seguranca-black border-gray-600 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Valor Recebido</p>
                        <p className="text-2xl font-bold text-green-500">
                          R$ 14.500
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </Card>
                  <Card className="bg-seguranca-black border-gray-600 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Valor Vencido</p>
                        <p className="text-2xl font-bold text-red-500">
                          R$ 15.000
                        </p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-red-500" />
                    </div>
                  </Card>
                  <Card className="bg-seguranca-black border-gray-600 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Taxa Inadimplência</p>
                        <p className="text-2xl font-bold text-orange-500">33,3%</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-orange-500" />
                    </div>
                  </Card>
                </div>
              </div>

              {/* Filtros */}
              <div className="space-y-4 mb-6">
                {/* Primeira linha - Busca e Filtros */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      placeholder="Buscar por cliente, fatura ou descrição..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                    />
                  </div>
                  <div className="flex gap-3">
                    <select className="bg-seguranca-black border-gray-600 text-seguranca-lightgray rounded px-3 py-2 text-sm border">
                      <option value="">Todos Status</option>
                      <option value="PENDENTE">Pendente</option>
                      <option value="PARCIAL">Parcial</option>
                      <option value="PAGO">Pago</option>
                      <option value="VENCIDO">Vencido</option>
                    </select>
                    <select className="bg-seguranca-black border-gray-600 text-seguranca-lightgray rounded px-3 py-2 text-sm border">
                      <option value="">Todas</option>
                      <option value="30">Últimos 30 dias</option>
                      <option value="60">Últimos 60 dias</option>
                      <option value="90">Últimos 90 dias</option>
                    </select>
                    <Button variant="outline" className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black">
                      <Filter size={16} className="mr-2" />
                      Filtros Avançados
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tabs Lista/Dashboard */}
              <div className="mb-6">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="bg-seguranca-black border-gray-600 text-gray-400 hover:bg-seguranca-black"
                  >
                    Lista de Contas
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                  >
                    Dashboard
                  </Button>
                </div>
              </div>

              {/* Dashboard com dois cards lado a lado */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status das Contas */}
                <Card className="bg-seguranca-black border-gray-600 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <h4 className="text-lg font-semibold text-seguranca-lightgray">Status das Contas</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-seguranca-lightgray">Vencido</span>
                      <span className="text-lg font-bold text-red-500">R$ 15.000</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-seguranca-lightgray">Pago</span>
                      <span className="text-lg font-bold text-green-500">R$ 8.500</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-seguranca-lightgray">Parcial</span>
                      <span className="text-lg font-bold text-yellow-500">R$ 12.000</span>
                    </div>
                  </div>
                </Card>

                {/* Contas Vencidas */}
                <Card className="bg-seguranca-black border-gray-600 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <h4 className="text-lg font-semibold text-seguranca-lightgray">Contas Vencidas</h4>
                  </div>
                  <div className="text-center py-12">
                    <p className="text-gray-400 mb-2">Nenhuma conta vencida encontrada</p>
                    <p className="text-gray-400">no período selecionado</p>
                  </div>
                </Card>
              </div>

              {/* Lista de Contas (quando não estiver vazia) */}
              {loading ? (
                <div className="flex justify-center items-center py-8 mt-6">
                  <Loader2 size={32} className="animate-spin text-seguranca-yellow" />
                  <span className="ml-2 text-seguranca-lightgray">Carregando contas a receber...</span>
                </div>
              ) : filteredTransactions.filter(t => t.type === 'INCOME').length === 0 ? (
                <div className="text-center py-12 mt-6">
                  <TrendingUp className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                  <p className="text-gray-400">Nenhuma conta a receber encontrada</p>
                  <Button
                    onClick={() => setShowContaReceberModal(true)}
                    className="mt-4 bg-seguranca-red hover:bg-seguranca-darkred"
                  >
                    <Plus size={18} className="mr-2" />
                    Criar primeira conta
                  </Button>
                </div>
              ) : (
                <div className="mt-6">
                  {/* Tabela Desktop */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                      <thead>
                        <tr className="border-b border-gray-600">
                          <th className="text-left py-3 px-2 lg:px-4 font-medium text-seguranca-lightgray text-sm">Data</th>
                          <th className="text-left py-3 px-2 lg:px-4 font-medium text-seguranca-lightgray text-sm">Cliente</th>
                          <th className="text-left py-3 px-2 lg:px-4 font-medium text-seguranca-lightgray text-sm">Descrição</th>
                          <th className="text-left py-3 px-2 lg:px-4 font-medium text-seguranca-lightgray text-sm">Vencimento</th>
                          <th className="text-left py-3 px-2 lg:px-4 font-medium text-seguranca-lightgray text-sm">Valor</th>
                          <th className="text-left py-3 px-2 lg:px-4 font-medium text-seguranca-lightgray text-sm">Status</th>
                          <th className="text-center py-3 px-2 lg:px-4 font-medium text-seguranca-lightgray text-sm">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions
                          .filter(transaction => transaction.type === 'INCOME')
                          .map((conta) => {
                            const isVencida = new Date(conta.date) < new Date() && conta.status === 'PENDING';
                            const diasAteVencimento = Math.ceil((new Date(conta.date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                            
                            return (
                              <tr key={conta.id} className={`border-b border-gray-700 hover:bg-seguranca-black/50 ${isVencida ? 'bg-red-900/20' : ''}`}>
                                <td className="py-3 px-2 lg:px-4 text-gray-400 text-sm">
                                  {new Date(conta.date).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="py-3 px-2 lg:px-4 text-seguranca-lightgray text-sm max-w-[150px] lg:max-w-[200px] truncate" title={conta.supplierName || 'Cliente'}>
                                  {conta.supplierName || 'Cliente não informado'}
                                </td>
                                <td className="py-3 px-2 lg:px-4 text-seguranca-lightgray text-sm max-w-[150px] lg:max-w-[200px] truncate" title={conta.description}>
                                  {conta.description}
                                </td>
                                <td className="py-3 px-2 lg:px-4 text-sm">
                                  <div className="flex flex-col">
                                    <span className={`text-sm ${isVencida ? 'text-red-400' : diasAteVencimento <= 7 ? 'text-yellow-400' : 'text-gray-400'}`}>
                                      {new Date(conta.date).toLocaleDateString('pt-BR')}
                                    </span>
                                    {conta.status === 'PENDING' && (
                                      <span className={`text-xs ${isVencida ? 'text-red-400' : diasAteVencimento <= 7 ? 'text-yellow-400' : 'text-gray-500'}`}>
                                        {isVencida 
                                          ? `Vencida há ${Math.abs(diasAteVencimento)} dias` 
                                          : diasAteVencimento <= 7 
                                          ? `Vence em ${diasAteVencimento} dias`
                                          : ''
                                        }
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-2 lg:px-4 font-medium text-sm text-green-500">
                                  R$ {(Number(conta.amount) || 0).toLocaleString('pt-BR')}
                                </td>
                                <td className="py-3 px-2 lg:px-4">
                                  <Badge
                                    className={`text-xs ${
                                      conta.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                                      conta.status === 'PENDING' ? (isVencida ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800') :
                                      conta.status === 'CANCELLED' ? 'bg-gray-100 text-gray-800' :
                                      'bg-yellow-100 text-yellow-800'
                                    }`}
                                  >
                                    {conta.status === 'CONFIRMED' ? 'Recebido' :
                                     conta.status === 'PENDING' ? (isVencida ? 'Vencido' : 'Pendente') :
                                     conta.status === 'CANCELLED' ? 'Cancelado' :
                                     'Parcial'}
                                  </Badge>
                                </td>
                                <td className="py-3 px-2 lg:px-4">
                                  <div className="flex justify-center gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => abrirModalEditarTransacao(conta)}
                                      className="border-blue-500 text-blue-600 hover:bg-blue-50 p-1 h-8 w-8"
                                    >
                                      ✏️
                                    </Button>
                                    {conta.status === 'PENDING' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          console.log('Marcar como recebido:', conta.id);
                                        }}
                                        className="border-green-500 text-green-600 hover:bg-green-50 p-1 h-8 w-8"
                                      >
                                        ✓
                                      </Button>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        console.log('Enviar cobrança:', conta.id);
                                      }}
                                      className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 p-1 h-8 w-8"
                                    >
                                      📧
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* Cards Mobile */}
                  <div className="md:hidden space-y-4">
                    {filteredTransactions
                      .filter(transaction => transaction.type === 'INCOME')
                      .map((conta) => {
                        const isVencida = new Date(conta.date) < new Date() && conta.status === 'PENDING';
                        const diasAteVencimento = Math.ceil((new Date(conta.date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                        
                        return (
                          <Card key={conta.id} className={`bg-seguranca-black border-gray-600 p-4 ${isVencida ? 'border-red-500' : ''}`}>
                            <div className="space-y-3">
                              {/* Header */}
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-medium text-seguranca-lightgray text-sm mb-1">{conta.description}</h4>
                                  <p className="text-gray-400 text-xs">{conta.supplierName || 'Cliente não informado'}</p>
                                </div>
                                <Badge
                                  className={`text-xs ml-2 ${
                                    conta.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                                    conta.status === 'PENDING' ? (isVencida ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800') :
                                    conta.status === 'CANCELLED' ? 'bg-gray-100 text-gray-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {conta.status === 'CONFIRMED' ? 'Recebido' :
                                   conta.status === 'PENDING' ? (isVencida ? 'Vencido' : 'Pendente') :
                                   conta.status === 'CANCELLED' ? 'Cancelado' :
                                   'Parcial'}
                                </Badge>
                              </div>

                              {/* Valor */}
                              <div className="text-right">
                                <span className="text-xl font-bold text-green-500">
                                  R$ {(Number(conta.amount) || 0).toLocaleString('pt-BR')}
                                </span>
                              </div>

                              {/* Informações */}
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-400">Data:</span>
                                  <p className="text-seguranca-lightgray">{new Date(conta.date).toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400">Vencimento:</span>
                                  <div className="flex flex-col">
                                    <span className={`text-sm ${isVencida ? 'text-red-400' : diasAteVencimento <= 7 ? 'text-yellow-400' : 'text-seguranca-lightgray'}`}>
                                      {new Date(conta.date).toLocaleDateString('pt-BR')}
                                    </span>
                                    {conta.status === 'PENDING' && (
                                      <span className={`text-xs ${isVencida ? 'text-red-400' : diasAteVencimento <= 7 ? 'text-yellow-400' : 'text-gray-500'}`}>
                                        {isVencida 
                                          ? `Vencida há ${Math.abs(diasAteVencimento)} dias` 
                                          : diasAteVencimento <= 7 
                                          ? `Vence em ${diasAteVencimento} dias`
                                          : ''
                                        }
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Ações */}
                              <div className="flex gap-2 pt-2 border-t border-gray-700">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => abrirModalEditarTransacao(conta)}
                                  className="flex-1 border-blue-500 text-blue-600 hover:bg-blue-50 text-xs"
                                >
                                  ✏️ Editar
                                </Button>
                                {conta.status === 'PENDING' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      console.log('Marcar como recebido:', conta.id);
                                    }}
                                    className="flex-1 border-green-500 text-green-600 hover:bg-green-50 text-xs"
                                  >
                                    ✓ Receber
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    console.log('Enviar cobrança:', conta.id);
                                  }}
                                  className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 text-xs px-3"
                                >
                                  📧
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                  </div>
                </div>
              )}
            </Card>
              </TabsContent>

          <TabsContent value="fluxo-caixa">
            <Card className="bg-seguranca-graphite border-gray-600 p-3 sm:p-6">
              <div className="text-center py-12">
                <DollarSign className="mx-auto h-12 w-12 text-seguranca-yellow mb-4" />
                <h3 className="text-xl font-semibold text-seguranca-lightgray mb-2">Fluxo de Caixa</h3>
                <p className="text-gray-400 mb-6">Controle detalhado das entradas e saídas financeiras</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card className="bg-seguranca-black border-gray-600 p-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Saldo Atual</p>
                      <p className="text-2xl font-bold text-seguranca-yellow">R$ {lucroLiquido.toLocaleString('pt-BR')}</p>
                    </div>
                  </Card>
                  <Card className="bg-seguranca-black border-gray-600 p-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Entradas</p>
                      <p className="text-2xl font-bold text-green-500">R$ {receitaTotal.toLocaleString('pt-BR')}</p>
                    </div>
                  </Card>
                  <Card className="bg-seguranca-black border-gray-600 p-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Saídas</p>
                      <p className="text-2xl font-bold text-red-500">R$ {despesaTotal.toLocaleString('pt-BR')}</p>
                    </div>
                  </Card>
                  <Card className="bg-seguranca-black border-gray-600 p-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Projeção</p>
                      <p className="text-2xl font-bold text-blue-500">R$ {(lucroLiquido * 1.1).toLocaleString('pt-BR')}</p>
                    </div>
                  </Card>
                </div>
              </div>
            </Card>
              </TabsContent>

          <TabsContent value="pagamentos">
            <Card className="bg-seguranca-graphite border-gray-600 p-3 sm:p-6">
              <div className="text-center py-12">
                <Calculator className="mx-auto h-12 w-12 text-purple-500 mb-4" />
                <h3 className="text-xl font-semibold text-seguranca-lightgray mb-2">Pagamentos</h3>
                <p className="text-gray-400 mb-6">Gerencie pagamentos e transferências</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-seguranca-black border-gray-600 p-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Pagamentos Hoje</p>
                      <p className="text-2xl font-bold text-purple-500">R$ 0</p>
                    </div>
                  </Card>
                  <Card className="bg-seguranca-black border-gray-600 p-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Agendados</p>
                      <p className="text-2xl font-bold text-yellow-500">R$ {contasAPagar.toLocaleString('pt-BR')}</p>
                    </div>
                  </Card>
                  <Card className="bg-seguranca-black border-gray-600 p-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Processados</p>
                      <p className="text-2xl font-bold text-green-500">R$ {despesaTotal.toLocaleString('pt-BR')}</p>
                    </div>
                  </Card>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="relatorios-financeiros">
            <Card className="bg-seguranca-graphite border-gray-600 p-6">
              <FinanceiroRelatorios 
                transactions={transactions}
                invoices={invoices}
                refreshData={refreshData}
              />
            </Card>
          </TabsContent>

          <TabsContent value="centro-custos">
            <Card className="bg-seguranca-graphite border-gray-600 p-3 sm:p-6">
              <div className="text-center py-12">
                <Calculator className="mx-auto h-12 w-12 text-cyan-500 mb-4" />
                <h3 className="text-xl font-semibold text-seguranca-lightgray mb-2">Centro de Custos</h3>
                <p className="text-gray-400 mb-6">Organize e categorize seus gastos por departamento</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card className="bg-seguranca-black border-gray-600 p-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Operacional</p>
                      <p className="text-2xl font-bold text-cyan-500">R$ {(despesaTotal * 0.6).toLocaleString('pt-BR')}</p>
                    </div>
                  </Card>
                  <Card className="bg-seguranca-black border-gray-600 p-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Administrativo</p>
                      <p className="text-2xl font-bold text-blue-500">R$ {(despesaTotal * 0.2).toLocaleString('pt-BR')}</p>
                    </div>
                  </Card>
                  <Card className="bg-seguranca-black border-gray-600 p-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Comercial</p>
                      <p className="text-2xl font-bold text-green-500">R$ {(despesaTotal * 0.15).toLocaleString('pt-BR')}</p>
                    </div>
                  </Card>
                  <Card className="bg-seguranca-black border-gray-600 p-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Outros</p>
                      <p className="text-2xl font-bold text-gray-500">R$ {(despesaTotal * 0.05).toLocaleString('pt-BR')}</p>
                    </div>
                  </Card>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="relatorios">
            <Card className="bg-seguranca-graphite border-gray-600 p-6">
              <FinanceiroRelatorios 
                transactions={transactions}
                invoices={invoices}
                refreshData={refreshData}
              />
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modais */}
        <TransacaoFormModal
          open={showTransacaoModal}
          onOpenChange={(open) => {
            setShowTransacaoModal(open);
            if (!open) {
              setEditandoTransacao(null);
              setModoEdicaoTransacao(false);
            }
          }}
          onSuccess={handleTransacaoSuccess}
          editMode={modoEdicaoTransacao}
          initialData={editandoTransacao}
        />

        <ContaReceberModal
          open={showContaReceberModal}
          onOpenChange={setShowContaReceberModal}
          onSuccess={() => {
            toast({
              title: "Sucesso",
              description: "Conta a receber salva com sucesso!",
            });
            setShowContaReceberModal(false);
            loadFinancialData(); // Recarregar dados
          }}
        />

        {selectedFatura && (
          <>
            <FaturaViewModal
              fatura={{
                id: Number(selectedFatura.id),
                cliente: selectedFatura.clientName,
                contrato: selectedFatura.contractNumber || 'N/A',
                valor: selectedFatura.amount,
                emissao: selectedFatura.issueDate,
                vencimento: selectedFatura.dueDate,
                status: selectedFatura.status === 'PAGA' ? 'Pago' : selectedFatura.status === 'PENDENTE' ? 'Pendente' : selectedFatura.status === 'CANCELADA' ? 'Cancelado' : selectedFatura.status === 'PENDENTE_ERRO' ? 'Atrasado' : selectedFatura.status,
                notes: selectedFatura.notes
              }}
              open={showFaturaModal}
              onOpenChange={setShowFaturaModal}
            />
            <ConfirmarPagamentoModal
              fatura={{
                id: Number(selectedFatura.id),
                cliente: selectedFatura.clientName,
                contrato: selectedFatura.contractNumber || 'N/A',
                valor: selectedFatura.amount,
                emissao: selectedFatura.issueDate,
                vencimento: selectedFatura.dueDate,
                status: selectedFatura.status === 'PAGA' ? 'Pago' : selectedFatura.status === 'PENDENTE' ? 'Pendente' : selectedFatura.status === 'CANCELADA' ? 'Cancelado' : selectedFatura.status === 'PENDENTE_ERRO' ? 'Atrasado' : selectedFatura.status
              }}
              open={showPagamentoModal}
              onOpenChange={setShowPagamentoModal}
              onSuccess={handlePagamentoSuccess}
            />
          </>
        )}

        {/* Modal Nova Fatura */}
        <Dialog open={showNovaFaturaModal} onOpenChange={setShowNovaFaturaModal}>
          <DialogContent className="sm:max-w-[600px] bg-seguranca-graphite border-gray-600">
            <DialogHeader>
              <DialogTitle className="text-seguranca-lightgray">{editandoFatura ? 'Editar Fatura' : 'Nova Fatura'}</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleSalvarNovaFatura(); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-seguranca-lightgray">Cliente</label>
                  <select
                    value={novaFatura.client?.id?.toString() || ''}
                    onChange={e => {
                      const selected = clientesSelect.find(c => c.id.toString() === e.target.value);
                      handleNovaFaturaChange('client', selected || null);
                    }}
                    required
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray rounded w-full h-10 px-3"
                  >
                    <option value="">Selecione um cliente...</option>
                    {clientesSelect.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-seguranca-lightgray">Unidade</label>
                  <select
                    value={novaFatura.unit?.id || ''}
                    onChange={e => {
                      const selected = unidadesSelect.find(u => u.id === e.target.value);
                      handleNovaFaturaChange('unit', selected || null);
                    }}
                    required
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray rounded w-full h-10 px-3"
                  >
                    <option value="">Selecione uma unidade...</option>
                    {unidadesSelect.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-seguranca-lightgray">Contrato</label>
                  <select
                    value={novaFatura.contract?.id?.toString() || ''}
                    onChange={e => {
                      const selected = contratosSelect.find(c => c.id.toString() === e.target.value);
                      handleNovaFaturaChange('contract', selected || null);
                    }}
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray rounded w-full h-10 px-3"
                  >
                    <option value="">Selecione um contrato...</option>
                    {contratosSelect.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-seguranca-lightgray">Valor</label>
                  <Input 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    value={novaFatura.amount || ''} 
                    onChange={e => {
                      const valor = e.target.value.replace(',', '.');
                      handleNovaFaturaChange('amount', valor === '' ? 0 : Number(valor));
                    }} 
                    required 
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-seguranca-lightgray">Data de Emissão</label>
                  <DatePicker
                    selected={novaFatura.issueDate ? new Date(novaFatura.issueDate) : null}
                    onChange={(date: Date | null) => handleNovaFaturaChange('issueDate', date ? date.toISOString().split('T')[0] : '')}
                    dateFormat="dd/MM/yyyy"
                    className="form-input"
                    placeholderText="Selecione a data de emissão"
                  />
                </div>
                <div>
                  <label className="text-sm text-seguranca-lightgray">Data de Vencimento</label>
                  <DatePicker
                    selected={novaFatura.dueDate ? new Date(novaFatura.dueDate) : null}
                    onChange={(date: Date | null) => handleNovaFaturaChange('dueDate', date ? date.toISOString().split('T')[0] : '')}
                    dateFormat="dd/MM/yyyy"
                    className="form-input"
                    placeholderText="Selecione a data de vencimento"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-seguranca-lightgray">Descrição <span className="text-red-500">*</span></label>
                <Input
                  type="text"
                  value={novaFatura.description || ''}
                  onChange={e => handleNovaFaturaChange('description', e.target.value)}
                  required
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                  maxLength={255}
                  placeholder="Descrição da fatura"
                />
                {novaFaturaErro && (
                  <p className="text-red-500 text-xs mt-1">{novaFaturaErro}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-seguranca-lightgray">Observações</label>
                <Textarea 
                  value={novaFatura.notes || ''} 
                  onChange={e => handleNovaFaturaChange('notes', e.target.value)} 
                  className="bg-seguranca-black border-gray-600 text-seguranca-lightgray" 
                  rows={3} 
                  maxLength={1000} 
                  placeholder="Informações adicionais sobre a fatura..." 
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-seguranca-lightgray">Status</label>
                  <select
                    value={novaFatura.status || 'PENDENTE'}
                    onChange={e => handleNovaFaturaChange('status', e.target.value as InvoiceStatus)}
                    required
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray rounded w-full h-10 px-3"
                  >
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-600">
                <Button type="button" variant="outline" onClick={() => setShowNovaFaturaModal(false)} disabled={salvandoFatura}>Cancelar</Button>
                <Button type="submit" className="bg-seguranca-red hover:bg-seguranca-darkred" disabled={salvandoFatura}>
                  {salvandoFatura ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal de Visualização/Edição de Boletim */}
        {showMeasurementModal && (
          <Dialog open={showMeasurementModal} onOpenChange={setShowMeasurementModal}>
            <DialogContent className="bg-seguranca-graphite border-gray-600 max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-seguranca-lightgray">
                  {selectedBulletin ? 'Visualizar Boletim de Medição' : 'Novo Boletim de Medição'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-gray-400">
                  {selectedBulletin ? 'Detalhes do boletim de medição' : 'Preencha os dados do novo boletim'}
                </p>
                {/* Se for criação, exibir um formulário simples mockado */}
                {!selectedBulletin && (
                  <form className="space-y-4" onSubmit={e => { e.preventDefault(); /* salvar mock */ setShowMeasurementModal(false); }}>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">Período</label>
                        <Input type="date" required />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Contrato</label>
                        <Input type="text" required placeholder="Nº Contrato" />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">NF</label>
                        <Input type="text" required placeholder="Número da NF" />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Valor Total</label>
                        <Input type="number" min="0" step="0.01" required placeholder="0,00" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Itens (mock)</label>
                      <div className="mt-2 space-y-2">
                        <div className="p-3 bg-seguranca-black rounded border border-gray-700">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-seguranca-lightgray font-medium">Item 1</p>
                              <p className="text-gray-400 text-sm">Posto de vigilância 12h noturno</p>
                              <p className="text-gray-400 text-sm">1 x R$ 12.000,00 = R$ 12.000,00</p>
                            </div>
                            <Badge className="bg-seguranca-red/20 text-seguranca-red border-0">Operacional</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-600">
                      <Button type="button" variant="outline" onClick={() => setShowMeasurementModal(false)}>Cancelar</Button>
                      <Button type="submit" className="bg-seguranca-red hover:bg-seguranca-darkred">Salvar</Button>
                    </div>
                  </form>
                )}
                {/* Visualização detalhada se selectedBulletin */}
                {selectedBulletin && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">Período</label>
                        <p className="text-seguranca-lightgray">
                          {new Date(selectedBulletin.periodStart).toLocaleDateString('pt-BR')} - {new Date(selectedBulletin.periodEnd).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Contrato</label>
                        <p className="text-seguranca-lightgray font-mono">{selectedBulletin.contractNumber}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">NF</label>
                        <p className="text-seguranca-lightgray">{selectedBulletin.nfNumber}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Valor Total</label>
                        <p className="text-seguranca-yellow font-bold">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedBulletin.subtotal)}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-400">Itens</label>
                      <div className="mt-2 space-y-2">
                        {selectedBulletin.items.map((item) => (
                          <div key={item.id} className="p-3 bg-seguranca-black rounded border border-gray-700">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-seguranca-lightgray font-medium">Item {item.itemNumber}</p>
                                <p className="text-gray-400 text-sm">{item.description}</p>
                                <p className="text-gray-400 text-sm">
                                  {item.quantity} x {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice)} = {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalValue)}
                                </p>
                              </div>
                              <Badge className="bg-seguranca-red/20 text-seguranca-red border-0">
                                {item.costCenterName}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal de Validação */}
        {showValidationModal && (
          <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
            <DialogContent className="bg-seguranca-graphite border-gray-600">
              <DialogHeader>
                <DialogTitle className="text-seguranca-lightgray">
                  Validar Boletim de Medição
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">Validado por</label>
                  <Input
                    value={validationData.validatedBy}
                    onChange={(e) => setValidationData(prev => ({ ...prev, validatedBy: e.target.value }))}
                    placeholder="Nome do responsável pela validação"
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400">Conferido por</label>
                  <Input
                    value={validationData.checkedBy}
                    onChange={(e) => setValidationData(prev => ({ ...prev, checkedBy: e.target.value }))}
                    placeholder="Nome do responsável pela conferência"
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowValidationModal(false)}
                    className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleConfirmValidation}
                    disabled={!validationData.validatedBy || !validationData.checkedBy}
                    className="bg-seguranca-red hover:bg-seguranca-darkred"
                  >
                    Validar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal de Boletim de Medição */}
        <MeasurementBulletinModal
          open={showMeasurementBulletinModal}
          onOpenChange={setShowMeasurementBulletinModal}
          bulletin={editingBulletin || undefined}
          onSuccess={handleMeasurementSuccess}
        />

        {/* Modal de Medição Simplificada */}
        <SimplifiedMeasurementModal
          open={showSimplifiedMeasurementModal}
          onOpenChange={setShowSimplifiedMeasurementModal}
          onSuccess={handleMeasurementSuccess}
        />

        {/* Modal de Visualização de Provisionamento */}
        {showProvisioningModal && (
          <Dialog open={showProvisioningModal} onOpenChange={setShowProvisioningModal}>
            <DialogContent className="bg-seguranca-graphite border-gray-600 max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-seguranca-lightgray">
                  {selectedProvisioning ? 'Visualizar Composição de Preços' : 'Nova Simulação de Provisionamento'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Formulário de criação mock */}
                {!selectedProvisioning && (
                  <form className="space-y-4" onSubmit={e => { e.preventDefault(); setShowProvisioningModal(false); }}>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">Serviço</label>
                        <Input type="text" required placeholder="Ex: Portaria 24h" />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Descrição</label>
                        <Input type="text" required placeholder="Descrição da simulação" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">Valor Mensal</label>
                        <Input type="number" min="0" step="0.01" required placeholder="0,00" />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Valor Anual</label>
                        <Input type="number" min="0" step="0.01" required placeholder="0,00" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Itens (mock)</label>
                      <div className="mt-2 space-y-2">
                        <div className="p-3 bg-seguranca-black rounded border border-gray-700">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-seguranca-lightgray font-medium">Salário do Porteiro</p>
                              <p className="text-gray-400 text-sm">4 x R$ 2.134,80 = R$ 8.539,20</p>
                            </div>
                            <Badge className="bg-seguranca-red/20 text-seguranca-red border-0">Mão de Obra</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-gray-600">
                      <Button type="button" variant="outline" onClick={() => setShowProvisioningModal(false)}>Cancelar</Button>
                      <Button type="submit" className="bg-seguranca-red hover:bg-seguranca-darkred">Salvar</Button>
                    </div>
                  </form>
                )}
                {/* Visualização detalhada se selectedProvisioning */}
                {selectedProvisioning && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">Serviço</label>
                        <p className="text-seguranca-lightgray font-bold">{selectedProvisioning.serviceName}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Criado em</label>
                        <p className="text-gray-400">{new Date(selectedProvisioning.createdAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Descrição</label>
                      <p className="text-gray-400">{selectedProvisioning.description}</p>
                    </div>
                    {[selectedProvisioning.labor, selectedProvisioning.materials, selectedProvisioning.bdi, selectedProvisioning.taxes].map((section, idx) => (
                      <div key={idx} className="bg-seguranca-black rounded p-4 border border-gray-700 mb-2">
                        <h4 className="text-seguranca-yellow font-semibold mb-2">{section.title}</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr>
                                <th className="text-left text-gray-400 font-normal">Item</th>
                                <th className="text-left text-gray-400 font-normal">Qtd</th>
                                <th className="text-left text-gray-400 font-normal">% Alíquota</th>
                                <th className="text-left text-gray-400 font-normal">Custo Unitário</th>
                                <th className="text-left text-gray-400 font-normal">Custo Mensal</th>
                                <th className="text-left text-gray-400 font-normal">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {section.items.map(item => (
                                <tr key={item.id}>
                                  <td className="text-seguranca-lightgray">{item.name}</td>
                                  <td className="text-gray-400">{item.quantity ?? '-'}</td>
                                  <td className="text-gray-400">{item.percent ? `${item.percent}%` : '-'}</td>
                                  <td className="text-gray-400">{item.unitCost ? item.unitCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td>
                                  <td className="text-gray-400">{item.monthlyCost ? item.monthlyCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td>
                                  <td className="text-gray-400">{item.total ? item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="text-right mt-2">
                          <span className="text-seguranca-yellow font-bold">Subtotal: {section.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <span className="text-gray-400">Valor Mensal:</span>
                        <span className="text-seguranca-yellow font-bold ml-2">{selectedProvisioning.totalMonthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Valor Anual:</span>
                        <span className="text-seguranca-yellow font-bold ml-2">{selectedProvisioning.totalYearly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </StandardLayout>
  );
};

export default Financeiro;
