import api from '@/lib/axios';

export interface Cliente {
  id: string;
  name: string;
  email: string;
  phone: string;
  mobile: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  notes?: string;
}

export interface ContaAReceber {
  id: string;
  client: Cliente;
  invoiceNumber: string;
  measurementNumber?: string;
  description: string;
  amount: number;
  amountPaid: number;
  pendingAmount: number;
  issueDate: string;
  dueDate: string;
  paymentDate?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'PARTIAL';
  category: 'INVOICE' | 'NOTE' | 'ADVANCE' | 'SERVICE' | 'PRODUCT' | 'OTHER';
  paymentMethod: 'PIX' | 'BOLETO' | 'TRANSFER' | 'CASH' | 'CARD';
  overdueDays: number;
  lateFee: number;
  latePenalty: number;
  notes?: string;
}

export interface CreateContaAReceberRequest {
  clientId: string;
  invoiceNumber: string;
  measurementNumber?: string;
  description: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  category: string;
  paymentMethod: string;
  notes?: string;
}

export interface UpdateContaAReceberRequest extends CreateContaAReceberRequest {
  id: string;
}

class ContasAReceberService {
  // Buscar todas as contas a receber
  async getContasAReceber(): Promise<ContaAReceber[]> {
    // TODO: Temporariamente usando dados mockados devido a problemas no backend
    console.log('Usando dados mockados para contas a receber (backend com problemas)');
    return this.getMockContasAReceber();
    
    /* Código original comentado temporariamente
    try {
      console.log('Buscando contas a receber da API...');
      const response = await api.get('/accounts-receivable/all');
      console.log('Contas a receber recebidas:', response.data);
      // Garantir que sempre retornamos um array
      return Array.isArray(response.data) ? response.data : this.getMockContasAReceber();
    } catch (error) {
      console.error('Erro ao buscar contas a receber:', error);
      // Retornar dados mockados temporariamente
      return this.getMockContasAReceber();
    }
    */
  }

  // Buscar conta por ID
  async getContaAReceberById(id: string): Promise<ContaAReceber | null> {
    try {
      console.log('Buscando conta a receber por ID:', id);
      const response = await api.get(`/api/accounts-receivable/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar conta a receber:', error);
      return null;
    }
  }

  // Criar nova conta a receber
  async createContaAReceber(conta: CreateContaAReceberRequest): Promise<ContaAReceber> {
    try {
      console.log('Criando conta a receber:', conta);
      
      const requestData = {
        clientId: conta.clientId,
        invoiceNumber: conta.invoiceNumber,
        measurementNumber: conta.measurementNumber,
        description: conta.description,
        amount: Number(conta.amount) || 0,
        issueDate: this.formatDateForBackend(conta.issueDate),
        dueDate: this.formatDateForBackend(conta.dueDate),
        category: conta.category,
        paymentMethod: conta.paymentMethod,
        notes: conta.notes || undefined
      };

      console.log('Dados da requisição:', requestData);

      const response = await api.post('/accounts-receivable', requestData);
      console.log('Conta a receber criada:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Erro detalhado ao criar conta a receber:', error);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      throw error;
    }
  }

  // Atualizar conta a receber
  async updateContaAReceber(id: string, conta: UpdateContaAReceberRequest): Promise<ContaAReceber> {
    try {
      console.log('Atualizando conta a receber:', id, conta);
      
      const requestData = {
        clientId: conta.clientId,
        invoiceNumber: conta.invoiceNumber,
        measurementNumber: conta.measurementNumber,
        description: conta.description,
        amount: Number(conta.amount) || 0,
        issueDate: this.formatDateForBackend(conta.issueDate),
        dueDate: this.formatDateForBackend(conta.dueDate),
        category: conta.category,
        paymentMethod: conta.paymentMethod,
        notes: conta.notes || undefined
      };

      console.log('Dados da requisição de atualização:', requestData);
      console.log('ID da conta:', id);

      const response = await api.put(`/api/accounts-receivable/${id}`, requestData);
      console.log('Conta a receber atualizada:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Erro detalhado ao atualizar conta a receber:', error);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      throw error;
    }
  }

  // Excluir conta a receber
  async deleteContaAReceber(id: string): Promise<void> {
    try {
      console.log('Excluindo conta a receber:', id);
      await api.delete(`/api/accounts-receivable/${id}`);
      console.log('Conta a receber excluída com sucesso');
    } catch (error) {
      console.error('Erro ao excluir conta a receber:', error);
      throw error;
    }
  }

  // Marcar como paga
  async markAsPaid(id: string, dataPagamento: string): Promise<ContaAReceber> {
    try {
      console.log('Marcando conta como paga:', id, dataPagamento);
      const response = await api.put(`/api/accounts-receivable/${id}/mark-paid?paymentDate=${this.formatDateForBackend(dataPagamento)}`);
      console.log('Conta marcada como paga:', response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao marcar como paga:', error);
      throw error;
    }
  }

  // Buscar clientes
  async getClientes(): Promise<Cliente[]> {
    try {
      console.log('Buscando clientes da API...');
      const response = await api.get('/clients/all');
      console.log('Clientes recebidos:', response.data);
      // Garantir que sempre retornamos um array
      return Array.isArray(response.data) ? response.data : this.getMockClientes();
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      return this.getMockClientes();
    }
  }

  // Buscar cliente por ID
  async getClienteById(id: string): Promise<Cliente | null> {
    try {
      const response = await api.get(`/api/clients/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      return null;
    }
  }

  // Gerar relatório de inadimplência
  async generateDefaultReport(): Promise<Blob> {
    try {
      const response = await api.get('/receivables/reports/default', {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      throw error;
    }
  }

  // Formatar data para o backend (YYYY-MM-DD)
  private formatDateForBackend(date: string | Date): string {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString().split('T')[0];
  }

  // Formatar data para exibição (DD/MM/YYYY)
  formatDateForDisplay(date: string | Date): string {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('pt-BR');
  }

  // Calcular dias de atraso
  calculateDaysOverdue(dataVencimento: string | Date): number {
    const vencimento = typeof dataVencimento === 'string' ? new Date(dataVencimento) : dataVencimento;
    const hoje = new Date();
    const diffTime = hoje.getTime() - vencimento.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  // Calcular valor pendente
  calculatePendingValue(valor: number, valorPago: number): number {
    return Math.max(0, valor - valorPago);
  }

  // Determinar status da conta
  determineStatus(dataVencimento: string | Date, valorPago: number, valor: number): string {
    const hoje = new Date();
    const vencimento = typeof dataVencimento === 'string' ? new Date(dataVencimento) : dataVencimento;
    
    if (valorPago >= valor) {
      return 'pago';
    } else if (valorPago > 0) {
      return 'parcial';
    } else if (vencimento < hoje) {
      return 'vencido';
    } else {
      return 'pendente';
    }
  }

  // Buscar números de fatura
  async searchInvoiceNumbers(term: string): Promise<string[]> {
    try {
      console.log('Buscando números de fatura para termo:', term);
      const response = await api.get(`/api/accounts-receivable/search/invoice-number?term=${encodeURIComponent(term)}`);
      console.log('Números de fatura encontrados:', response.data);
      return response.data || [];
    } catch (error) {
      console.error('Erro ao buscar números de fatura:', error);
      return [];
    }
  }

  // Buscar números de medição
  async searchMeasurementNumbers(term: string): Promise<string[]> {
    try {
      console.log('Buscando números de medição para termo:', term);
      const response = await api.get(`/api/accounts-receivable/search/measurement-number?term=${encodeURIComponent(term)}`);
      console.log('Números de medição encontrados:', response.data);
      return response.data || [];
    } catch (error) {
      console.error('Erro ao buscar números de medição:', error);
      return [];
    }
  }

  // Buscar categorias
  async searchCategories(term: string): Promise<string[]> {
    try {
      console.log('Buscando categorias para termo:', term);
      const response = await api.get(`/api/accounts-receivable/search/categories?term=${encodeURIComponent(term)}`);
      console.log('Categorias encontradas:', response.data);
      return response.data || [];
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      return [];
    }
  }

  // Buscar formas de pagamento
  async searchPaymentMethods(term: string): Promise<string[]> {
    try {
      console.log('Buscando formas de pagamento para termo:', term);
      const response = await api.get(`/api/accounts-receivable/search/payment-methods?term=${encodeURIComponent(term)}`);
      console.log('Formas de pagamento encontradas:', response.data);
      return response.data || [];
    } catch (error) {
      console.error('Erro ao buscar formas de pagamento:', error);
      return [];
    }
  }

  // Método para retornar clientes mockados temporariamente
  private getMockClientes(): Cliente[] {
    return [
      {
        id: 'CLI-001',
        name: 'Empresa ABC Ltda',
        email: 'contato@empresaabc.com',
        phone: '(11) 1234-5678',
        mobile: '(11) 98765-4321',
        cnpj: '12.345.678/0001-90',
        address: 'Rua das Flores, 123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        contactName: 'João Silva',
        contactEmail: 'joao@empresaabc.com',
        contactPhone: '(11) 1234-5678',
        status: 'ACTIVE',
        notes: 'Cliente preferencial'
      },
      {
        id: 'CLI-002',
        name: 'Tech Solutions S.A.',
        email: 'financeiro@techsolutions.com',
        phone: '(21) 2345-6789',
        mobile: '(21) 98765-4321',
        cnpj: '98.765.432/0001-10',
        address: 'Av. Tecnologia, 456',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '20000-000',
        contactName: 'Maria Santos',
        contactEmail: 'maria@techsolutions.com',
        contactPhone: '(21) 2345-6789',
        status: 'ACTIVE',
        notes: 'Cliente corporativo'
      }
    ];
  }

  // Método para retornar dados mockados temporariamente
  private getMockContasAReceber(): ContaAReceber[] {
    return [
      {
        id: 'CAR-001',
        client: {
          id: 'CLI-001',
          name: 'Empresa ABC Ltda',
          email: 'contato@empresaabc.com',
          phone: '(11) 1234-5678',
          mobile: '(11) 98765-4321',
          cnpj: '12.345.678/0001-90',
          address: 'Rua das Flores, 123',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567',
          contactName: 'João Silva',
          contactEmail: 'joao@empresaabc.com',
          contactPhone: '(11) 1234-5678',
          status: 'ACTIVE',
          notes: 'Cliente preferencial'
        },
        invoiceNumber: 'FAT-2024-001',
        measurementNumber: 'MED-2024-001',
        description: 'Serviços de segurança - Janeiro 2024',
        amount: 15000.00,
        amountPaid: 0,
        pendingAmount: 15000.00,
        issueDate: '2024-01-01',
        dueDate: '2024-01-31',
        status: 'PENDING',
        category: 'SERVICE',
        paymentMethod: 'BOLETO',
        overdueDays: 0,
        lateFee: 0,
        latePenalty: 0,
        notes: 'Pagamento em dia'
      },
      {
        id: 'CAR-002',
        client: {
          id: 'CLI-002',
          name: 'Tech Solutions S.A.',
          email: 'financeiro@techsolutions.com',
          phone: '(21) 2345-6789',
          mobile: '(21) 98765-4321',
          cnpj: '98.765.432/0001-10',
          address: 'Av. Tecnologia, 456',
          city: 'Rio de Janeiro',
          state: 'RJ',
          zipCode: '20000-000',
          contactName: 'Maria Santos',
          contactEmail: 'maria@techsolutions.com',
          contactPhone: '(21) 2345-6789',
          status: 'ACTIVE',
          notes: 'Cliente corporativo'
        },
        invoiceNumber: 'FAT-2024-002',
        measurementNumber: 'MED-2024-002',
        description: 'Consultoria em segurança digital',
        amount: 25000.00,
        amountPaid: 12500.00,
        pendingAmount: 12500.00,
        issueDate: '2024-01-15',
        dueDate: '2024-02-15',
        status: 'PARTIAL',
        category: 'SERVICE',
        paymentMethod: 'PIX',
        overdueDays: 0,
        lateFee: 0,
        latePenalty: 0,
        notes: 'Pagamento parcial realizado'
      }
    ];
  }
}

export const contasAReceberService = new ContasAReceberService();