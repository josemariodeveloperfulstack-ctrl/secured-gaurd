import api from '@/lib/axios';
import { isConnectionError } from '@/utils/connectionError';
import { ContaAPagar } from '@/components/financeiro/ContasAPagarFormModal';
import { formatDateForBackend, parseDateFromBackend } from '@/utils/dateUtils';

export interface CreateContaAPagarRequest {
  invoiceNumber?: string;
  description: string;
  supplierId: string | null;
  unitId: string;
  amount: number;
  type: 'FIXA' | 'VARIAVEL';
  status: 'ABERTA' | 'PAGA' | 'ATRASADA' | 'CANCELADA' | 'VENCIDA';
  dueDate: string;
  issueDate: string;
  paymentDate?: string;
  barcode?: string;
  category?: string;
  subcategoriaId?: string | null;
  employeeId?: string | null;
  notes?: string;
  centroCusto?: string;
  companySigla?: string;
  workSector?: string;
  unitName?: string;
}

export interface UpdateContaAPagarRequest extends Partial<CreateContaAPagarRequest> {
  id: string;
}

export interface CustomContasAPagarReportRequest {
  startDate?: string;
  endDate?: string;
  dateField?: 'dueDate' | 'issueDate' | 'paymentDate';
  status?: string;
  type?: string;
  supplierId?: string;
  unitId?: string;
  workSector?: string;
  companySigla?: string;
  subcategoriaId?: string;
  employeeId?: string;
  selectedColumns?: string[];
  groupBy?: 'UNIT_SECTOR' | 'NONE';
}

export interface ContasAPagarFilters {
  status?: string;
  type?: string;
  supplierId?: string;
  unitId?: string;
  workSector?: string;
  companySigla?: string;
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
  cpf?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  category?: string;
  notes?: string;
  isActive: boolean;
}

export interface CreateSupplierRequest {
  name: string;
  cnpj: string;
  cpf?: string;
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

// === Interfaces do Plano de Contas ===
export interface CategoriaPai {
  id: string;
  nome: string;
  codigo: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subcategoria {
  id: string;
  categoriaPaiId: string;
  categoriaPaiNome?: string;
  categoriaPaiCodigo?: string;
  nome: string;
  codigo: string;
  requerVinculoFuncionario: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeSelect {
  id: string;
  name: string;
}

// Campos usados para formatar a conta do Plano de Contas (compartilhado por
// ContaAPagar e ContaAReceber, que possuem a mesma estrutura de subcategoria).
export interface ContaPlanoDeContasFields {
  subcategoriaNome?: string | null;
  subcategoriaCodigo?: string | null;
  categoriaPaiCodigo?: string | null;
}

// Formata a conta do plano de contas para exibição (ex.: "CODIGO - Nome")
export function formatContaPlanoDeContas(conta: ContaPlanoDeContasFields): string {
  if (conta.subcategoriaNome) {
    const codigo = conta.subcategoriaCodigo || conta.categoriaPaiCodigo || '';
    return `${codigo ? codigo + ' - ' : ''}${conta.subcategoriaNome}`;
  }
  return '';
}

// Em contas a pagar / despesas com funcionário vinculado (ex.: Pessoal / RH ou beneficiário),
// exibe o nome do funcionário na coluna Fornecedor/Funcionário. Nas demais, exibe o fornecedor.
function resolveFornecedorOuFuncionario(invoice: any): string {
  if (invoice.employeeName && typeof invoice.employeeName === 'string' && invoice.employeeName.trim()) {
    return invoice.employeeName.trim();
  }
  if (invoice.employee?.name && typeof invoice.employee.name === 'string' && invoice.employee.name.trim()) {
    return invoice.employee.name.trim();
  }
  if (invoice.supplierName && typeof invoice.supplierName === 'string' && invoice.supplierName.trim()) {
    return invoice.supplierName.trim();
  }
  if (invoice.supplier?.name && typeof invoice.supplier.name === 'string' && invoice.supplier.name.trim()) {
    return invoice.supplier.name.trim();
  }
  return 'Não informado';
}

export const contasAPagarService = {
  // ===== CONTAS A PAGAR =====

  // Buscar contas com paginação básica (usando /api/invoices)
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

    console.log('🔍 DEBUG: Fazendo requisição para /api/invoices com params:', params.toString());
    const response = await api.get(`/api/invoices?${params.toString()}`);

    console.log('🔍 DEBUG: Resposta da API /api/invoices:', response.data);

    // Transformar dados do backend para o formato do frontend
    const invoices = Array.isArray(response.data) ? response.data : response.data.content || [];

    console.log('🔍 DEBUG: Invoices processados:', invoices);

    return invoices.map((invoice: any): ContaAPagar => {
      // Garantir que supplierId seja convertido para string
      const fornecedorId = invoice.supplierId
        ? (typeof invoice.supplierId === 'string' ? invoice.supplierId : String(invoice.supplierId))
        : undefined;

      // Em rescisão de funcionários, exibe o funcionário vinculado em vez do fornecedor
      const fornecedorNome = resolveFornecedorOuFuncionario(invoice);

      return {
        id: invoice.id,
        dataEmissao: parseDateFromBackend(invoice.issueDate),
        vencimento: parseDateFromBackend(invoice.dueDate) || new Date(),
        fornecedor: fornecedorNome,
        fornecedorId: fornecedorId || '',
        empresa: invoice.companyName || (invoice.company && invoice.company.name) || undefined,
        empresaId: invoice.companyId || (invoice.company && invoice.company.id) || undefined,
        companySigla: invoice.companySigla || (invoice.company && invoice.company.sigla) || undefined,
        descricao: invoice.description,
        tipo: invoice.type || 'VARIAVEL',
        valor: parseFloat(invoice.amount),
        codigoBarras: invoice.barcode,
        status: mapBackendStatusToFrontend(invoice.status),
        baixa: invoice.baixa || false,
        dataPagamento: parseDateFromBackend(invoice.paymentDate),
        observacoes: invoice.notes,
        categoria: invoice.category,
        subcategoriaId: invoice.subcategoriaId,
        subcategoriaNome: invoice.subcategoriaNome,
        subcategoriaCodigo: invoice.subcategoriaCodigo,
        categoriaPaiNome: invoice.categoriaPaiNome,
        categoriaPaiCodigo: invoice.categoriaPaiCodigo,
        employeeId: invoice.employeeId,
        employeeName: invoice.employeeName,
        centroCusto: invoice.centroCusto,
        unitId: invoice.unitId || (invoice.unit && invoice.unit.id) || undefined,
        unitName: invoice.unitName || (invoice.unit && invoice.unit.name) || undefined,
        workSector: invoice.workSector || undefined,
        createdAt: parseDateFromBackend(invoice.createdAt),
        createdById: invoice.createdById,
        createdByName: invoice.createdByName,
      };
    });
  },

  // Buscar todas as contas (sem paginação) usando endpoint dedicado
  // Usado na tela principal de Contas a Pagar para garantir que
  // todas as contas sejam carregadas e a paginação seja feita no frontend.
  async getAllContasAPagar(): Promise<ContaAPagar[]> {
    console.log('🔍 DEBUG: Fazendo requisição para /api/invoices/all (sem paginação)');
    const response = await api.get('/api/invoices/all');
    const data = Array.isArray(response.data) ? response.data : response.data.content || [];
    console.log('🔍 DEBUG: Resposta da API /api/invoices/all:', {
      quantidade: Array.isArray(data) ? data.length : 0
    });

    return data.map((invoice: any) => this.mapInvoiceToContaAPagar(invoice));
  },

  // Buscar conta por ID
  async getContaAPagarById(id: string): Promise<ContaAPagar> {
    const response = await api.get(`/api/invoices/${id}`);
    const invoice = response.data;

    // Garantir que supplierId seja convertido para string
    const fornecedorId = invoice.supplierId
      ? (typeof invoice.supplierId === 'string' ? invoice.supplierId : String(invoice.supplierId))
      : undefined;

    const fornecedorNome = resolveFornecedorOuFuncionario(invoice);

    return {
      id: invoice.id,
      dataEmissao: parseDateFromBackend(invoice.issueDate),
      vencimento: parseDateFromBackend(invoice.dueDate) || new Date(),
      fornecedor: fornecedorNome,
      fornecedorId: fornecedorId || '',
      empresa: invoice.companyName || (invoice.company && invoice.company.name) || undefined,
      empresaId: invoice.companyId || (invoice.company && invoice.company.id) || undefined,
      companySigla: invoice.companySigla || (invoice.company && invoice.company.sigla) || undefined,
      cliente: invoice.clientName,
      clienteId: invoice.clientId,
      contrato: invoice.contractNumber,
      contratoId: invoice.contractId,
      descricao: invoice.description,
      tipo: invoice.type || 'VARIAVEL',
      valor: parseFloat(invoice.amount),
      codigoBarras: invoice.barcode,
      status: mapBackendStatusToFrontend(invoice.status),
      baixa: invoice.baixa || false,
      dataPagamento: parseDateFromBackend(invoice.paymentDate),
      observacoes: invoice.notes,
      categoria: invoice.category,
      subcategoriaId: invoice.subcategoriaId,
      subcategoriaNome: invoice.subcategoriaNome,
      subcategoriaCodigo: invoice.subcategoriaCodigo,
        categoriaPaiNome: invoice.categoriaPaiNome,
        categoriaPaiCodigo: invoice.categoriaPaiCodigo,
        employeeId: invoice.employeeId,
        employeeName: invoice.employeeName,
        centroCusto: invoice.centroCusto,
        unitId: invoice.unitId,
        unitName: invoice.unitName,
        workSector: invoice.workSector,
        createdById: invoice.createdById,
        createdByName: invoice.createdByName,
    };
  },

  // Criar nova conta
  async createContaAPagar(conta: Omit<ContaAPagar, 'id'>): Promise<ContaAPagar> {
    let unitId = conta.unitId;

    if (!unitId) {
      try {
        const unitsResponse = await api.get('/api/units');
        if (unitsResponse.data && unitsResponse.data.length > 0) {
          unitId = unitsResponse.data[0].id;
        } else {
          unitId = '11111111-1111-1111-1111-111111111111';
        }
      } catch (error) {
        console.warn('Não foi possível buscar unidades, usando UUID padrão:', error);
        unitId = '11111111-1111-1111-1111-111111111111';
      }
    }

    const requestData: CreateContaAPagarRequest = {
      description: conta.descricao,
      supplierId: conta.fornecedorId || null,
      unitId: unitId,
      amount: Number(conta.valor) || 0,
      type: conta.tipo,
      status: mapFrontendStatusToBackend(conta.status) as any,
      dueDate: formatDateForBackend(conta.vencimento) || '',
      issueDate: formatDateForBackend(conta.dataEmissao) || '',
      paymentDate: formatDateForBackend(conta.dataPagamento),
      barcode: conta.codigoBarras,
      category: conta.categoria === 'NENHUMA' ? undefined : conta.categoria,
      subcategoriaId: conta.subcategoriaId || null,
      employeeId: conta.employeeId || null,
      notes: conta.observacoes,
      centroCusto: conta.centroCusto === 'NENHUM' ? undefined : conta.centroCusto,
      companySigla: conta.companySigla,
      workSector: conta.workSector || undefined
    };

    console.log('Dados da requisição:', requestData);

    try {
      const response = await api.post('/api/invoices', requestData);
      return this.getContaAPagarById(response.data.id);
    } catch (error: any) {
      console.error('Erro detalhado ao criar conta a pagar:', error);
      throw error;
    }
  },

  // Atualizar conta
  async updateContaAPagar(id: string, conta: Partial<ContaAPagar>): Promise<ContaAPagar> {
    // Caso especial: se for apenas marcar como paga
    const keys = Object.keys(conta);
    if (conta.status === 'PAGA' && (keys.length === 1 || (keys.length === 2 && 'dataPagamento' in conta))) {
      return this.marcarComoPaga(id, conta.dataPagamento ? new Date(conta.dataPagamento) : new Date());
    }

    // Se faltarem campos obrigatórios, buscar conta existente para mesclar
    let fullConta: Partial<ContaAPagar> = { ...conta };
    if (!conta.descricao || conta.valor === undefined || !conta.vencimento || !conta.dataEmissao || !conta.status) {
      try {
        const existing = await this.getContaAPagarById(id);
        fullConta = { ...existing, ...conta };
      } catch (e) {
        console.warn('Não foi possível buscar a conta existente para mesclagem:', e);
      }
    }

    const requestData: Partial<CreateContaAPagarRequest> = {};

    if (fullConta.descricao) requestData.description = fullConta.descricao;
    if (fullConta.fornecedorId !== undefined) requestData.supplierId = fullConta.fornecedorId || null;
    if (fullConta.valor !== undefined) requestData.amount = fullConta.valor;
    if (fullConta.tipo) requestData.type = fullConta.tipo;
    if (fullConta.status) requestData.status = mapFrontendStatusToBackend(fullConta.status) as any;
    if (fullConta.dataEmissao) requestData.issueDate = formatDateForBackend(fullConta.dataEmissao);
    if (fullConta.vencimento) requestData.dueDate = formatDateForBackend(fullConta.vencimento);
    if (fullConta.dataPagamento) requestData.paymentDate = formatDateForBackend(fullConta.dataPagamento);
    if (fullConta.codigoBarras) requestData.barcode = fullConta.codigoBarras;
    if (fullConta.categoria !== undefined) requestData.category = fullConta.categoria === 'NENHUMA' ? undefined : fullConta.categoria;
    if (fullConta.subcategoriaId !== undefined) requestData.subcategoriaId = fullConta.subcategoriaId || null;
    if (fullConta.employeeId !== undefined) requestData.employeeId = fullConta.employeeId || null;
    if (fullConta.observacoes) requestData.notes = fullConta.observacoes;
    if (fullConta.centroCusto !== undefined) requestData.centroCusto = fullConta.centroCusto === 'NENHUM' ? undefined : fullConta.centroCusto;
    if (fullConta.companySigla !== undefined) requestData.companySigla = fullConta.companySigla;
    if (fullConta.unitId !== undefined) requestData.unitId = fullConta.unitId;
    if (fullConta.workSector !== undefined) requestData.workSector = fullConta.workSector;

    try {
      const response = await api.put(`/api/invoices/${id}`, requestData);
      return this.getContaAPagarById(response.data.id || id);
    } catch (error: any) {
      console.error('Erro ao atualizar conta a pagar:', error);
      throw error;
    }
  },

  /**
   * Gerar Relatório PDF Personalizado de Contas a Pagar
   */
  async generateCustomPdfReport(request: CustomContasAPagarReportRequest): Promise<Blob> {
    try {
      const response = await api.post('/api/reports/contas-a-pagar/custom-pdf', request, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao gerar relatório personalizado em PDF:', error);
      throw error;
    }
  },

  // Excluir conta
  async deleteContaAPagar(id: string): Promise<void> {
    await api.delete(`/api/invoices/${id}`);
  },

  // Exclusão em massa de alta performance
  async bulkDeleteContasAPagar(ids: string[]): Promise<{ deletedCount: number; requestedCount: number }> {
    const response = await api.post('/api/invoices/bulk-delete', { ids });
    return response.data;
  },

  async getCategories(): Promise<string[]> {
    try {
      const response = await api.get('/api/invoices/categories');
      // Verificar se a resposta é um array válido
      if (Array.isArray(response.data)) {
        return response.data;
      }
      // Se não for array ou for HTML, usar fallback
      throw new Error('Resposta inválida da API');
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      // Retornar categorias padrão
      return [
        'Aluguel',
        'Energia Elétrica',
        'Telefone/Internet',
        'Material de Escritório',
        'Manutenção',
        'Combustível',
        'Alimentação',
        'Transporte',
        'Seguros',
        'Impostos',
        'Outros'
      ];
    }
  },

  async getCostCenters(): Promise<string[]> {
    try {
      const response = await api.get('/api/cost-centers');
      // Verificar se a resposta é um array válido
      if (Array.isArray(response.data)) {
        return response.data.map((center: any) => center.name);
      }
      // Se não for array ou for HTML, usar fallback
      throw new Error('Resposta inválida da API');
    } catch (error) {
      console.error('Erro ao carregar centros de custo:', error);
      // Retornar centros de custo padrão
      return [
        'Administrativo',
        'Operacional',
        'Comercial',
        'Financeiro',
        'Recursos Humanos',
        'Tecnologia da Informação',
        'Marketing',
        'Vendas',
        'Produção',
        'Logística'
      ];
    }
  },

  // Marcar conta como paga
  async marcarComoPaga(id: string, dataPagamento?: Date | string): Promise<ContaAPagar> {
    const paymentDateStr = dataPagamento ? formatDateForBackend(dataPagamento) : undefined;
    const url = `/api/invoices/${id}/mark-as-paid` + (paymentDateStr ? `?paymentDate=${paymentDateStr}` : '');
    const response = await api.patch(url, {
      paymentDate: paymentDateStr
    });
    return this.getContaAPagarById(response.data.id || id);
  },

  // Buscar contas vencidas
  async getContasVencidas(): Promise<ContaAPagar[]> {
    const response = await api.get('/api/invoices/overdue');
    return (Array.isArray(response.data) ? response.data : []).map((invoice: any) => this.mapInvoiceToContaAPagar(invoice));
  },

  // Buscar contas vencendo em breve
  async getContasVencendoEmBreve(dias: number = 7): Promise<ContaAPagar[]> {
    const response = await api.get(`/api/invoices/due-soon/${dias}`);
    return (Array.isArray(response.data) ? response.data : []).map((invoice: any) => this.mapInvoiceToContaAPagar(invoice));
  },

  // ===== FORNECEDORES =====

  // Buscar todos os fornecedores
  async getFornecedores(): Promise<Supplier[]> {
    try {
      const response = await api.get('/api/suppliers/all');
      const data = response.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.content)) return data.content;
      return [];
    } catch (error: any) {
      // Fallback: lista só ativos
      try {
        const active = await api.get('/api/suppliers/active');
        const data = active.data;
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.content)) return data.content;
      } catch {
        /* ignore */
      }
      if (isConnectionError(error)) {
        console.warn('⚠️ Backend não está disponível. Retornando array vazio para fornecedores.');
      } else {
        console.error('❌ Erro ao buscar fornecedores:', error?.response?.status || error?.message);
      }
      return [];
    }
  },

  // Buscar todas as empresas
  async getEmpresas(): Promise<any[]> {
    // Buscar diretamente da tabela de empresas para obter a sigla correta
    const response = await api.get('/api/companies');
    console.log('🔍 DEBUG: Resposta da API /api/companies:', response.data);
    const data = Array.isArray(response.data) ? response.data : (response.data?.content ?? []);
    // Normalizar para sempre conter id, name e sigla
    return data.map((c: any) => ({ id: c.id, name: c.name, sigla: c.sigla }));
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
      const response = await api.get('/contas-pagar/relatorio-detalhado', {
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
      const response = await api.get('/contas-pagar/dashboard');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar dashboard:', error);
      throw error;
    }
  },

  async getAnaliseFluxoPagamento(dias: number = 90): Promise<AnaliseFluxoPagamento> {
    try {
      const response = await api.get('/contas-pagar/analise-fluxo', {
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
      const response = await api.get('/contas-pagar/previsao-pagamentos', {
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
      const response = await api.get(`/contas-pagar/analise-fornecedor/${fornecedorId}`);
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
      const response = await api.get('/contas-pagar/comparativo-mensal', {
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
      const response = await api.post('/contas-pagar/pagamento-lote', {
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
      const response = await api.post(`/contas-pagar/${contaId}/agendar`, {
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
      const response = await api.post(`/contas-pagar/${contaId}/desconto`, desconto);
      return this.mapInvoiceToContaAPagar(response.data);
    } catch (error) {
      console.error('Erro ao aplicar desconto:', error);
      throw error;
    }
  },

  async duplicarConta(contaId: string, novaDataVencimento: string): Promise<ContaAPagar> {
    try {
      const response = await api.post(`/contas-pagar/${contaId}/duplicar`, {
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
      const response = await api.post('/contas-pagar/relatorio-personalizado', configuracao, {
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
      const response = await api.get('/contas-pagar/exportar', {
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
      const response = await api.post('/contas-pagar/importar', formData, {
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
      const response = await api.post('/contas-pagar/sincronizar-erp');
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
      const response = await api.get(`/contas-pagar/${contaId}/auditoria`);
      return response.data;
    } catch (error) {
      console.error('Erro ao obter auditoria:', error);
      throw error;
    }
  },

  // ===== PLANO DE CONTAS =====

  async getCategoriasPai(): Promise<CategoriaPai[]> {
    const response = await api.get('/api/plano-contas/categorias');
    return Array.isArray(response.data) ? response.data : [];
  },

  async createCategoriaPai(data: Partial<CategoriaPai>): Promise<CategoriaPai> {
    const response = await api.post('/api/plano-contas/categorias', data);
    return response.data;
  },

  async updateCategoriaPai(id: string, data: Partial<CategoriaPai>): Promise<CategoriaPai> {
    const response = await api.put(`/api/plano-contas/categorias/${id}`, data);
    return response.data;
  },

  async deleteCategoriaPai(id: string): Promise<void> {
    await api.delete(`/api/plano-contas/categorias/${id}`);
  },

  async getSubcategorias(categoriaPaiId?: string): Promise<Subcategoria[]> {
    const url = categoriaPaiId
      ? `/api/plano-contas/subcategorias/por-categoria/${categoriaPaiId}`
      : '/api/plano-contas/subcategorias';
    const response = await api.get(url);
    return Array.isArray(response.data) ? response.data : [];
  },

  async createSubcategoria(data: Partial<Subcategoria>): Promise<Subcategoria> {
    const response = await api.post('/api/plano-contas/subcategorias', data);
    return response.data;
  },

  async updateSubcategoria(id: string, data: Partial<Subcategoria>): Promise<Subcategoria> {
    const response = await api.put(`/api/plano-contas/subcategorias/${id}`, data);
    return response.data;
  },

  async deleteSubcategoria(id: string): Promise<void> {
    await api.delete(`/api/plano-contas/subcategorias/${id}`);
  },

  // Buscar funcionários para o campo condicional
  async getEmployeeList(): Promise<EmployeeSelect[]> {
    try {
      const response = await api.get('/api/employees?size=200');
      const data = response.data?.content || response.data || [];
      return Array.isArray(data) ? data.map((e: any) => ({ id: e.id, name: e.name })) : [];
    } catch {
      // Fallback: buscar pelo endpoint de autocomplete
      try {
        const response = await api.get('/api/employees/search?q=');
        const data = Array.isArray(response.data) ? response.data : [];
        return data.map((e: any) => ({ id: e.id, name: e.name }));
      } catch {
        return [];
      }
    }
  },

  // Método auxiliar para mapear invoice para ContaAPagar
  mapInvoiceToContaAPagar(invoice: any): ContaAPagar {
    return {
      id: invoice.id,
      dataEmissao: parseDateFromBackend(invoice.issueDate),
      vencimento: parseDateFromBackend(invoice.dueDate) || new Date(),
      fornecedor: resolveFornecedorOuFuncionario(invoice),
      fornecedorId: invoice.supplierId ? String(invoice.supplierId) : '',
      empresa: invoice.companyName || (invoice.company && invoice.company.name) || undefined,
      empresaId: invoice.companyId || (invoice.company && invoice.company.id) || undefined,
      companySigla: invoice.companySigla || (invoice.company && invoice.company.sigla) || undefined,
      descricao: invoice.description,
      tipo: invoice.type || 'VARIAVEL',
      valor: parseFloat(invoice.amount),
      codigoBarras: invoice.barcode,
      status: mapBackendStatusToFrontend(invoice.status),
      baixa: invoice.baixa || false,
      dataPagamento: parseDateFromBackend(invoice.paymentDate),
      observacoes: invoice.notes,
      categoria: invoice.category,
      subcategoriaId: invoice.subcategoriaId,
      subcategoriaNome: invoice.subcategoriaNome,
      subcategoriaCodigo: invoice.subcategoriaCodigo,
      categoriaPaiNome: invoice.categoriaPaiNome,
      categoriaPaiCodigo: invoice.categoriaPaiCodigo,
      employeeId: invoice.employeeId,
      employeeName: invoice.employeeName,
      centroCusto: invoice.centroCusto,
      unitId: invoice.unitId || (invoice.unit && invoice.unit.id) || undefined,
      unitName: invoice.unitName || (invoice.unit && invoice.unit.name) || undefined,
      workSector: invoice.workSector || undefined,
      createdAt: parseDateFromBackend(invoice.createdAt),
      createdById: invoice.createdById,
      createdByName: invoice.createdByName,
    };
  }
};

// Função auxiliar para mapear status do frontend para backend
function mapFrontendStatusToBackend(frontendStatus: 'ABERTA' | 'PAGA' | 'ATRASADA' | 'CANCELADA' | 'VENCIDA'): string {
  switch (frontendStatus) {
    case 'ABERTA':
      return 'PENDENTE';
    case 'PAGA':
      return 'PAGA';
    case 'CANCELADA':
      return 'CANCELADA';
    case 'ATRASADA':
      return 'PENDENTE'; // Mapear para PENDENTE ao invés de ERRO
    case 'VENCIDA':
      return 'PENDENTE'; // Mapear para PENDENTE ao invés de ERRO
    default:
      return 'PENDENTE';
  }
}

// Função auxiliar para mapear status do backend para frontend
function mapBackendStatusToFrontend(backendStatus: string): 'ABERTA' | 'PAGA' | 'ATRASADA' | 'CANCELADA' | 'VENCIDA' {
  switch (backendStatus) {
    case 'PENDENTE':
    case 'PENDENTE_ERRO':
    case 'SOLICITADA':
      return 'ABERTA';
    case 'PAGA':
    case 'PAGA_ANTERIORMENTE':
      return 'PAGA';
    case 'CANCELADA':
      return 'CANCELADA';
    case 'ERRO':
      return 'ATRASADA';
    default:
      return 'ABERTA';
  }
}