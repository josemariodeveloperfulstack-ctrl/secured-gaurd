import api from '@/lib/axios';
import { ContaAPagar } from '@/components/financeiro/ContasAPagarFormModal';
import { formatDateForBackend, parseDateFromBackend } from '@/utils/dateUtils';

export interface CreateContaAPagarRequest {
  invoiceNumber?: string;
  description: string;
  supplierId: string;
  clientId?: string;
  contractId?: string;
  unitId: string;
  amount: number;
  type: 'FIXA' | 'VARIAVEL';
  status: 'ABERTA' | 'PAGA' | 'ATRASADA' | 'CANCELADA' | 'VENCIDA';
  dueDate: string;
  issueDate?: string;
  paymentDate?: string;
  barcode?: string;
  baixa?: boolean;
  category?: string;
  notes?: string;
  centroCusto?: string;
}

export interface UpdateContaAPagarRequest extends Partial<CreateContaAPagarRequest> {
  id: string;
}

export interface ContasAPagarFilters {
  status?: string;
  type?: string;
  supplierId?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface Supplier {
  id: string;
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  category?: string;
  isActive: boolean;
}

export interface CreateSupplierRequest {
  name: string;
  cnpj: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  category?: string;
  notes?: string;
}

export type UpdateSupplierRequest = Partial<CreateSupplierRequest> & {
  isActive?: boolean;
};

export interface ContasAPagarReport {
  totalContas: number;
  totalValor: number;
  contasAbertas: number;
  valorAbertas: number;
  contasVencidas: number;
  valorVencidas: number;
  contasPagas: number;
  valorPagas: number;
  contasVencendoEm7Dias: number;
  valorVencendoEm7Dias: number;
  porTipo: {
    fixa: { count: number; valor: number };
    variavel: { count: number; valor: number };
  };
  porStatus: Array<{
    status: string;
    count: number;
    valor: number;
  }>;
}

export interface RelatorioDetalhado {
  periodo: {
    inicio: string;
    fim: string;
  };
  resumo: ContasAPagarReport;
  analiseTemporalMensal: {
    mes: string;
    totalContas: number;
    valorTotal: number;
    contasPagas: number;
    valorPago: number;
    percentualPagamento: number;
  }[];
  analisePorFornecedor: {
    fornecedor: string;
    totalContas: number;
    valorTotal: number;
    valorMedio: number;
    diasMedioPagamento: number;
    contasAtrasadas: number;
  }[];
  analisePorCategoria: {
    categoria: string;
    totalContas: number;
    valorTotal: number;
    percentualTotal: number;
  }[];
  indicadores: {
    ticketMedio: number;
    diasMedioPagamento: number;
    taxaPagamentoNoPrazo: number;
    crescimentoMensal: number;
    concentracaoFornecedores: number;
  };
  alertas: {
    tipo: 'vencimento_proximo' | 'valor_alto' | 'fornecedor_concentracao' | 'atraso_recorrente';
    descricao: string;
    valor?: number;
    quantidade?: number;
    severidade: 'baixa' | 'media' | 'alta';
  }[];
}

export interface DashboardContasAPagar {
  resumoGeral: {
    totalAbertas: number;
    valorTotalAberto: number;
    vencendoHoje: number;
    valorVencendoHoje: number;
    vencidas: number;
    valorVencido: number;
    pagas30Dias: number;
    valorPago30Dias: number;
  };
  proximosVencimentos: ContaAPagar[];
  maioresFornecedores: {
    fornecedor: string;
    valorTotal: number;
    quantidadeContas: number;
  }[];
  evolucaoMensal: {
    mes: string;
    valorPago: number;
    quantidadePaga: number;
  }[];
  distribuicaoPorCategoria: {
    categoria: string;
    valor: number;
    percentual: number;
  }[];
  kpis: {
    prazoMedioPagamento: number;
    ticketMedio: number;
    taxaAdimplencia: number;
    economiaDesconto: number;
  };
}

export interface PrevisaoPagamento {
  data: string;
  valorPrevisto: number;
  contasPrevistas: number;
  liquidezNecessaria: number;
  saldoProjetado: number;
  alertaLiquidez: boolean;
}

export interface AnaliseFluxoPagamento {
  proximosDias: PrevisaoPagamento[];
  proximasSemanas: PrevisaoPagamento[];
  proximosMeses: PrevisaoPagamento[];
  cenarios: {
    otimista: { valor: number; descricao: string };
    realista: { valor: number; descricao: string };
    pessimista: { valor: number; descricao: string };
  };
}

export const contasAPagarService = {
  // ===== CONTAS A PAGAR =====
  
  // Buscar todas as contas
  async getContasAPagar(filters: ContasAPagarFilters = {}): Promise<ContaAPagar[]> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.type) params.append('type', filters.type);
    if (filters.supplierId) params.append('supplierId', filters.supplierId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.searchTerm) params.append('searchTerm', filters.searchTerm);
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.size !== undefined) params.append('size', filters.size.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortDir) params.append('sortDir', filters.sortDir);

    const response = await api.get(`/api/invoices?${params.toString()}`);
    
    // Transformar dados do backend para o formato do frontend
    const invoices = Array.isArray(response.data) ? response.data : response.data.content || [];
    
    return invoices.map((invoice: any): ContaAPagar => ({
      id: invoice.id,
      vencimento: parseDateFromBackend(invoice.dueDate) || new Date(),
      fornecedor: invoice.supplierName || 'Não informado',
      fornecedorId: invoice.supplierId,
      descricao: invoice.description,
      tipo: invoice.type || 'VARIAVEL',
      valor: parseFloat(invoice.amount),
      codigoBarras: invoice.barcode,
      status: mapBackendStatusToFrontend(invoice.status),
      baixa: invoice.baixa || false,
      dataPagamento: parseDateFromBackend(invoice.paymentDate),
      observacoes: invoice.notes,
      categoria: invoice.category,
      centroCusto: invoice.centroCusto
    }));
  },

  // Buscar conta por ID
  async getContaAPagarById(id: string): Promise<ContaAPagar> {
    const response = await api.get(`/api/invoices/${id}`);
    const invoice = response.data;
    
    return {
      id: invoice.id,
      vencimento: parseDateFromBackend(invoice.dueDate) || new Date(),
      fornecedor: invoice.supplierName || 'Não informado',
      fornecedorId: invoice.supplierId,
      descricao: invoice.description,
      tipo: invoice.type || 'VARIAVEL',
      valor: parseFloat(invoice.amount),
      codigoBarras: invoice.barcode,
      status: mapBackendStatusToFrontend(invoice.status),
      baixa: invoice.baixa || false,
      dataPagamento: parseDateFromBackend(invoice.paymentDate),
      observacoes: invoice.notes,
      categoria: invoice.category,
      centroCusto: invoice.centroCusto
    };
  },

  // Criar nova conta
  async createContaAPagar(conta: Omit<ContaAPagar, 'id'>): Promise<ContaAPagar> {
    const requestData: CreateContaAPagarRequest = {
      description: conta.descricao,
      supplierId: conta.fornecedorId || '',
      unitId: '1', // TODO: Pegar da unidade selecionada
      amount: conta.valor,
      type: conta.tipo,
      status: conta.status,
      dueDate: formatDateForBackend(conta.vencimento) || '',
      paymentDate: formatDateForBackend(conta.dataPagamento),
      barcode: conta.codigoBarras,
      baixa: conta.baixa,
      category: conta.categoria,
      notes: conta.observacoes
    };

    const response = await api.post('/api/invoices', requestData);
    return this.getContaAPagarById(response.data.id);
  },

  // Atualizar conta
  async updateContaAPagar(id: string, conta: Partial<ContaAPagar>): Promise<ContaAPagar> {
    const requestData: Partial<CreateContaAPagarRequest> = {};
    
    if (conta.descricao) requestData.description = conta.descricao;
    if (conta.fornecedorId) requestData.supplierId = conta.fornecedorId;
    if (conta.valor !== undefined) requestData.amount = conta.valor;
    if (conta.tipo) requestData.type = conta.tipo;
    if (conta.status) requestData.status = conta.status;
    if (conta.vencimento) requestData.dueDate = formatDateForBackend(conta.vencimento);
    if (conta.dataPagamento) requestData.paymentDate = formatDateForBackend(conta.dataPagamento);
    if (conta.codigoBarras) requestData.barcode = conta.codigoBarras;
    if (conta.baixa !== undefined) requestData.baixa = conta.baixa;
    if (conta.categoria) requestData.category = conta.categoria;
    if (conta.observacoes) requestData.notes = conta.observacoes;

    const response = await api.put(`/api/invoices/${id}`, requestData);
    return this.getContaAPagarById(response.data.id);
  },

  // Excluir conta
  async deleteContaAPagar(id: string): Promise<void> {
    await api.delete(`/api/invoices/${id}`);
  },

  // Marcar conta como paga
  async marcarComoPaga(id: string, dataPagamento: Date): Promise<ContaAPagar> {
    const response = await api.patch(`/api/invoices/${id}/mark-as-paid`, {
      paymentDate: formatDateForBackend(dataPagamento)
    });
    return this.getContaAPagarById(response.data.id);
  },

  // Buscar contas vencidas
  async getContasVencidas(): Promise<ContaAPagar[]> {
    const response = await api.get('/api/invoices/overdue');
    return response.data.map((invoice: any) => this.mapInvoiceToContaAPagar(invoice));
  },

  // Buscar contas vencendo em breve
  async getContasVencendoEmBreve(dias: number = 7): Promise<ContaAPagar[]> {
    const response = await api.get(`/api/invoices/due-soon/${dias}`);
    return response.data.map((invoice: any) => this.mapInvoiceToContaAPagar(invoice));
  },

  // ===== FORNECEDORES =====
  
  // Buscar todos os fornecedores
  async getFornecedores(): Promise<Supplier[]> {
    const response = await api.get('/api/suppliers/all');
    return response.data;
  },

  // Criar fornecedor
  async createFornecedor(data: CreateSupplierRequest): Promise<Supplier> {
    const response = await api.post('/api/suppliers', data);
    return response.data;
  },

  // Atualizar fornecedor
  async updateFornecedor(id: string, data: UpdateSupplierRequest): Promise<Supplier> {
    const response = await api.put(`/api/suppliers/${id}`, data);
    return response.data;
  },

  // Excluir fornecedor
  async deleteFornecedor(id: string): Promise<void> {
    await api.delete(`/api/suppliers/${id}`);
  },

  // Alternar status (ativo/inativo)
  async toggleFornecedorStatus(id: string): Promise<Supplier> {
    const response = await api.patch(`/api/suppliers/${id}/toggle-status`);
    return response.data;
  },

  // Listar fornecedores ativos
  async getFornecedoresAtivos(): Promise<Supplier[]> {
    const response = await api.get('/api/suppliers/active');
    return response.data;
  },

  // Buscar por CNPJ
  async getFornecedorByCnpj(cnpj: string): Promise<Supplier | null> {
    try {
      const response = await api.get(`/api/suppliers/cnpj/${encodeURIComponent(cnpj)}`);
      return response.data;
    } catch {
      return null;
    }
  },

  // Buscar fornecedor por ID
  async getFornecedorById(id: string): Promise<Supplier> {
    const response = await api.get(`/api/suppliers/${id}`);
    return response.data;
  },

  // ===== RELATÓRIOS =====
  
  // Gerar relatório de contas a pagar
  async getRelatorioContasAPagar(startDate?: string, endDate?: string): Promise<ContasAPagarReport> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await api.get(`/api/invoices/reports/summary?${params.toString()}`);
    return response.data;
  },

  // Obter estatísticas rápidas
  async getEstatisticas(): Promise<any> {
    const [contasVencidas, contasVencendoEmBreve, resumo] = await Promise.all([
      this.getContasVencidas(),
      this.getContasVencendoEmBreve(),
      this.getRelatorioContasAPagar()
    ]);

    return {
      contasVencidas: contasVencidas.length,
      valorVencidas: contasVencidas.reduce((sum, c) => sum + c.valor, 0),
      contasVencendoEmBreve: contasVencendoEmBreve.length,
      valorVencendoEmBreve: contasVencendoEmBreve.reduce((sum, c) => sum + c.valor, 0),
      ...resumo
    };
  },

  // ===== RELATÓRIOS AVANÇADOS =====
  async getRelatorioDetalhado(periodo?: {
    dataInicio: string;
    dataFim: string;
  }): Promise<RelatorioDetalhado> {
    try {
      const response = await api.get('/api/contas-pagar/relatorio-detalhado', {
        params: periodo
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar relatório detalhado:', error);
      throw error;
    }
  },

  async getDashboard(): Promise<DashboardContasAPagar> {
    try {
      const response = await api.get('/api/contas-pagar/dashboard');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar dashboard:', error);
      throw error;
    }
  },

  async getAnaliseFluxoPagamento(dias: number = 90): Promise<AnaliseFluxoPagamento> {
    try {
      const response = await api.get('/api/contas-pagar/analise-fluxo', {
        params: { dias }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar análise de fluxo de pagamento:', error);
      throw error;
    }
  },

  async getPrevisaoPagamentos(periodo: {
    dataInicio: string;
    dataFim: string;
  }): Promise<PrevisaoPagamento[]> {
    try {
      const response = await api.get('/api/contas-pagar/previsao-pagamentos', {
        params: periodo
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar previsão de pagamentos:', error);
      throw error;
    }
  },

  async getAnalisePorFornecedor(fornecedorId?: string): Promise<{
    fornecedor: Supplier;
    estatisticas: {
      totalContas: number;
      valorTotal: number;
      valorMedio: number;
      diasMedioPagamento: number;
      taxaAdimplencia: number;
      evolucaoMensal: { mes: string; valor: number; quantidade: number }[];
    };
    contasRecentes: ContaAPagar[];
  }> {
    try {
      const response = await api.get(`/api/contas-pagar/analise-fornecedor/${fornecedorId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar análise por fornecedor:', error);
      throw error;
    }
  },

  async getComparativoMensal(meses: number = 12): Promise<{
    mes: string;
    valorPago: number;
    valorPrevisto: number;
    quantidadePaga: number;
    quantidadePrevista: number;
    variacao: number;
  }[]> {
    try {
      const response = await api.get('/api/contas-pagar/comparativo-mensal', {
        params: { meses }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar comparativo mensal:', error);
      throw error;
    }
  },

  // ===== FUNCIONALIDADES AVANÇADAS =====
  async processarPagamentoLote(contaIds: string[], dataPagamento: string): Promise<{
    processadas: number;
    erros: { id: string; erro: string }[];
  }> {
    try {
      const response = await api.post('/api/contas-pagar/pagamento-lote', {
        contaIds,
        dataPagamento: formatDateForBackend(new Date(dataPagamento))
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao processar pagamento em lote:', error);
      throw error;
    }
  },

  async agendarPagamento(contaId: string, dataAgendamento: string): Promise<ContaAPagar> {
    try {
      const response = await api.post(`/api/contas-pagar/${contaId}/agendar`, {
        dataAgendamento: formatDateForBackend(new Date(dataAgendamento))
      });
      return this.mapInvoiceToContaAPagar(response.data);
    } catch (error) {
      console.error('Erro ao agendar pagamento:', error);
      throw error;
    }
  },

  async aplicarDesconto(contaId: string, desconto: {
    tipo: 'percentual' | 'valor';
    valor: number;
    motivo: string;
  }): Promise<ContaAPagar> {
    try {
      const response = await api.post(`/api/contas-pagar/${contaId}/desconto`, desconto);
      return this.mapInvoiceToContaAPagar(response.data);
    } catch (error) {
      console.error('Erro ao aplicar desconto:', error);
      throw error;
    }
  },

  async duplicarConta(contaId: string, novaDataVencimento: string): Promise<ContaAPagar> {
    try {
      const response = await api.post(`/api/contas-pagar/${contaId}/duplicar`, {
        novaDataVencimento: formatDateForBackend(new Date(novaDataVencimento))
      });
      return this.mapInvoiceToContaAPagar(response.data);
    } catch (error) {
      console.error('Erro ao duplicar conta:', error);
      throw error;
    }
  },

  async gerarRelatorioPersonalizado(configuracao: {
    campos: string[];
    filtros: ContasAPagarFilters;
    agrupamento?: 'fornecedor' | 'categoria' | 'mes' | 'status';
    formato: 'pdf' | 'excel' | 'csv';
  }): Promise<Blob> {
    try {
      const response = await api.post('/api/contas-pagar/relatorio-personalizado', configuracao, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao gerar relatório personalizado:', error);
      throw error;
    }
  },

  async exportarDados(formato: 'excel' | 'csv' | 'pdf', filtros?: ContasAPagarFilters): Promise<Blob> {
    try {
      const response = await api.get('/api/contas-pagar/exportar', {
        params: { formato, ...filtros },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      throw error;
    }
  },

  async importarContas(arquivo: File): Promise<{
    importadas: number;
    erros: { linha: number; erro: string }[];
  }> {
    try {
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      const response = await api.post('/api/contas-pagar/importar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao importar contas:', error);
      throw error;
    }
  },

  async sincronizarComERP(): Promise<{
    sincronizadas: number;
    erros: number;
    detalhes: any[];
  }> {
    try {
      const response = await api.post('/api/contas-pagar/sincronizar-erp');
      return response.data;
    } catch (error) {
      console.error('Erro ao sincronizar com ERP:', error);
      throw error;
    }
  },

  async obterAuditoria(contaId: string): Promise<{
    id: string;
    acao: string;
    usuario: string;
    data: string;
    detalhes: any;
  }[]> {
    try {
      const response = await api.get(`/api/contas-pagar/${contaId}/auditoria`);
      return response.data;
    } catch (error) {
      console.error('Erro ao obter auditoria:', error);
      throw error;
    }
  },

  // Método auxiliar para mapear invoice para ContaAPagar
  mapInvoiceToContaAPagar(invoice: any): ContaAPagar {
    return {
      id: invoice.id,
      vencimento: parseDateFromBackend(invoice.dueDate) || new Date(),
      fornecedor: invoice.supplierName || 'Não informado',
      fornecedorId: invoice.supplierId,
      descricao: invoice.description,
      tipo: invoice.type || 'VARIAVEL',
      valor: parseFloat(invoice.amount),
      codigoBarras: invoice.barcode,
      status: mapBackendStatusToFrontend(invoice.status),
      baixa: invoice.baixa || false,
      dataPagamento: parseDateFromBackend(invoice.paymentDate),
      observacoes: invoice.notes,
      categoria: invoice.category,
      centroCusto: invoice.centroCusto
    };
  }
};

// Função auxiliar para mapear status do backend para frontend
function mapBackendStatusToFrontend(backendStatus: string): 'ABERTA' | 'PAGA' | 'ATRASADA' | 'CANCELADA' | 'VENCIDA' {
  switch (backendStatus) {
    case 'PENDENTE':
    case 'PENDING':
      return 'ABERTA';
    case 'PAGA':
    case 'PAID':
      return 'PAGA';
    case 'CANCELADA':
    case 'CANCELLED':
      return 'CANCELADA';
    case 'ATRASADA':
    case 'OVERDUE':
      return 'ATRASADA';
    case 'VENCIDA':
    case 'EXPIRED':
      return 'VENCIDA';
    default:
      return 'ABERTA';
  }
}