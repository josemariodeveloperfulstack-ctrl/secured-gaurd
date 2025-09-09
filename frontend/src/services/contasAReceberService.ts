import { api } from './api';

export interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  documento: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  limitCredito: number;
  diasVencimento: number;
  status: 'ativo' | 'inativo' | 'bloqueado';
}

export interface ContaAReceber {
  id: string;
  cliente: Cliente;
  numeroFatura: string;
  descricao: string;
  valor: number;
  valorPago: number;
  valorPendente: number;
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento?: string;
  status: 'pendente' | 'vencido' | 'pago' | 'cancelado' | 'parcial';
  categoria: 'fatura' | 'nota' | 'adiantamento' | 'servico' | 'produto' | 'outros';
  formaPagamento: 'pix' | 'boleto' | 'transferencia' | 'dinheiro' | 'cartao';
  diasAtraso: number;
  jurosAtraso: number;
  multaAtraso: number;
  observacoes?: string;
}

export interface CreateContaAReceberRequest {
  clienteId: string;
  numeroFatura: string;
  descricao: string;
  valor: number;
  dataEmissao: string;
  dataVencimento: string;
  categoria: string;
  formaPagamento: string;
  observacoes?: string;
}

export interface UpdateContaAReceberRequest extends CreateContaAReceberRequest {
  id: string;
}

class ContasAReceberService {
  // Buscar todas as contas a receber
  async getContasAReceber(): Promise<ContaAReceber[]> {
    try {
      const response = await api.get('/api/receivables');
      return response.data || [];
    } catch (error) {
      console.error('Erro ao buscar contas a receber:', error);
      return [];
    }
  }

  // Buscar conta por ID
  async getContaAReceberById(id: string): Promise<ContaAReceber | null> {
    try {
      const response = await api.get(`/api/receivables/${id}`);
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
        clienteId: conta.clienteId,
        numeroFatura: conta.numeroFatura,
        descricao: conta.descricao,
        valor: Number(conta.valor) || 0,
        dataEmissao: this.formatDateForBackend(conta.dataEmissao),
        dataVencimento: this.formatDateForBackend(conta.dataVencimento),
        categoria: conta.categoria,
        formaPagamento: conta.formaPagamento,
        observacoes: conta.observacoes || undefined
      };

      console.log('Dados da requisição:', requestData);

      const response = await api.post('/api/receivables', requestData);
      return this.getContaAReceberById(response.data.id);
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
        clienteId: conta.clienteId,
        numeroFatura: conta.numeroFatura,
        descricao: conta.descricao,
        valor: Number(conta.valor) || 0,
        dataEmissao: this.formatDateForBackend(conta.dataEmissao),
        dataVencimento: this.formatDateForBackend(conta.dataVencimento),
        categoria: conta.categoria,
        formaPagamento: conta.formaPagamento,
        observacoes: conta.observacoes || undefined
      };

      console.log('Dados da requisição de atualização:', requestData);
      console.log('ID da conta:', id);

      const response = await api.put(`/api/receivables/${id}`, requestData);
      return this.getContaAReceberById(response.data.id);
    } catch (error: any) {
      console.error('Erro detalhado ao atualizar conta a receber:', error);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      console.error('Request data enviado:', requestData);
      throw error;
    }
  }

  // Excluir conta a receber
  async deleteContaAReceber(id: string): Promise<void> {
    try {
      await api.delete(`/api/receivables/${id}`);
    } catch (error) {
      console.error('Erro ao excluir conta a receber:', error);
      throw error;
    }
  }

  // Marcar como paga
  async markAsPaid(id: string, dataPagamento: string): Promise<ContaAReceber> {
    try {
      const response = await api.patch(`/api/receivables/${id}/mark-paid`, {
        dataPagamento: this.formatDateForBackend(dataPagamento)
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao marcar como paga:', error);
      throw error;
    }
  }

  // Buscar clientes
  async getClientes(): Promise<Cliente[]> {
    try {
      const response = await api.get('/api/clients');
      return response.data || [];
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      return [];
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
      const response = await api.get('/api/receivables/reports/default', {
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
      const response = await api.get(`/api/invoices/search/invoice-number?term=${encodeURIComponent(term)}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar números de fatura:', error);
      throw error;
    }
  }
}

export const contasAReceberService = new ContasAReceberService();