import { api } from '@/lib/axios';

export interface ContaAReceber {
  id: string;
  cliente: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado';
  categoria: 'servico' | 'produto' | 'consultoria' | 'outros';
  formaPagamento?: 'pix' | 'boleto' | 'transferencia' | 'cartao' | 'dinheiro';
  numeroNF?: string;
  observacoes?: string;
  comprovante?: string;
  juros?: number;
  multa?: number;
  desconto?: number;
  valorOriginal: number;
  diasAtraso?: number;
  tentativasCobranca: number;
  proximaCobranca?: string;
  responsavelCobranca?: string;
  historicoCobranca: HistoricoCobranca[];
  cliente_id?: string;
  contrato_id?: string;
}

export interface HistoricoCobranca {
  id: string;
  data: string;
  tipo: 'email' | 'telefone' | 'whatsapp' | 'carta' | 'visita';
  responsavel: string;
  observacoes: string;
  sucesso: boolean;
}

export interface ClienteCobranca {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  whatsapp?: string;
  endereco: string;
  cpfCnpj: string;
  contasEmAberto: number;
  valorTotalDevido: number;
  diasMedioAtraso: number;
  ultimoPagamento?: string;
  scoreCredito: 'baixo' | 'medio' | 'alto';
  bloqueado: boolean;
}

export interface RelatorioInadimplencia {
  totalContas: number;
  valorTotal: number;
  contasVencidas: number;
  valorVencido: number;
  contasPendentes: number;
  valorPendente: number;
  ticketMedio: number;
  diasMedioRecebimento: number;
  taxaInadimplencia: number;
  projecaoRecebimento: ProjecaoRecebimento[];
  topDevedores: ClienteCobranca[];
}

export interface ProjecaoRecebimento {
  mes: string;
  valorPrevisto: number;
  valorRealizado: number;
  percentualRealizacao: number;
}

export interface ConfiguracaoCobranca {
  id: string;
  diasAvisoVencimento: number;
  diasPrimeiraCobranca: number;
  intervaloDiasCobranca: number;
  maxTentativasCobranca: number;
  jurosMensal: number;
  multaAtraso: number;
  emailTemplate: string;
  whatsappTemplate: string;
  ativo: boolean;
}

class ContasAReceberService {
  private baseURL = '/api/contas-receber';

  // CRUD básico
  async listarContas(filtros?: {
    status?: string;
    cliente?: string;
    dataInicio?: string;
    dataFim?: string;
    categoria?: string;
  }): Promise<ContaAReceber[]> {
    try {
      const response = await api.get(this.baseURL, { params: filtros });
      return response.data;
    } catch (error) {
      console.error('Erro ao listar contas a receber:', error);
      throw error;
    }
  }

  async obterConta(id: string): Promise<ContaAReceber> {
    try {
      const response = await api.get(`${this.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao obter conta a receber:', error);
      throw error;
    }
  }

  async criarConta(conta: Omit<ContaAReceber, 'id' | 'historicoCobranca' | 'tentativasCobranca'>): Promise<ContaAReceber> {
    try {
      const response = await api.post(this.baseURL, conta);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar conta a receber:', error);
      throw error;
    }
  }

  async atualizarConta(id: string, conta: Partial<ContaAReceber>): Promise<ContaAReceber> {
    try {
      const response = await api.put(`${this.baseURL}/${id}`, conta);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar conta a receber:', error);
      throw error;
    }
  }

  async excluirConta(id: string): Promise<void> {
    try {
      await api.delete(`${this.baseURL}/${id}`);
    } catch (error) {
      console.error('Erro ao excluir conta a receber:', error);
      throw error;
    }
  }

  // Funcionalidades específicas
  async registrarPagamento(id: string, dados: {
    dataPagamento: string;
    valorPago: number;
    formaPagamento: string;
    comprovante?: string;
    observacoes?: string;
  }): Promise<ContaAReceber> {
    try {
      const response = await api.post(`${this.baseURL}/${id}/pagamento`, dados);
      return response.data;
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      throw error;
    }
  }

  async registrarCobranca(id: string, cobranca: Omit<HistoricoCobranca, 'id'>): Promise<HistoricoCobranca> {
    try {
      const response = await api.post(`${this.baseURL}/${id}/cobranca`, cobranca);
      return response.data;
    } catch (error) {
      console.error('Erro ao registrar cobrança:', error);
      throw error;
    }
  }

  async enviarCobrancaAutomatica(ids: string[]): Promise<{ sucesso: number; erro: number; detalhes: any[] }> {
    try {
      const response = await api.post(`${this.baseURL}/cobranca-automatica`, { ids });
      return response.data;
    } catch (error) {
      console.error('Erro ao enviar cobrança automática:', error);
      throw error;
    }
  }

  async calcularJurosMulta(id: string): Promise<{ juros: number; multa: number; valorTotal: number }> {
    try {
      const response = await api.get(`${this.baseURL}/${id}/juros-multa`);
      return response.data;
    } catch (error) {
      console.error('Erro ao calcular juros e multa:', error);
      throw error;
    }
  }

  // Relatórios e análises
  async obterRelatorioInadimplencia(periodo?: {
    dataInicio: string;
    dataFim: string;
  }): Promise<RelatorioInadimplencia> {
    try {
      const response = await api.get(`${this.baseURL}/relatorio-inadimplencia`, { params: periodo });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter relatório de inadimplência:', error);
      throw error;
    }
  }

  async obterProjecaoRecebimento(meses: number = 12): Promise<ProjecaoRecebimento[]> {
    try {
      const response = await api.get(`${this.baseURL}/projecao-recebimento`, { params: { meses } });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter projeção de recebimento:', error);
      throw error;
    }
  }

  async obterClientesInadimplentes(): Promise<ClienteCobranca[]> {
    try {
      const response = await api.get(`${this.baseURL}/clientes-inadimplentes`);
      return response.data;
    } catch (error) {
      console.error('Erro ao obter clientes inadimplentes:', error);
      throw error;
    }
  }

  async obterEstatisticas(periodo?: {
    dataInicio: string;
    dataFim: string;
  }): Promise<{
    totalRecebido: number;
    totalPendente: number;
    totalVencido: number;
    ticketMedio: number;
    taxaRecebimento: number;
    crescimentoMensal: number;
  }> {
    try {
      const response = await api.get(`${this.baseURL}/estatisticas`, { params: periodo });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }

  // Configurações de cobrança
  async obterConfiguracaoCobranca(): Promise<ConfiguracaoCobranca> {
    try {
      const response = await api.get(`${this.baseURL}/configuracao-cobranca`);
      return response.data;
    } catch (error) {
      console.error('Erro ao obter configuração de cobrança:', error);
      throw error;
    }
  }

  async atualizarConfiguracaoCobranca(config: Partial<ConfiguracaoCobranca>): Promise<ConfiguracaoCobranca> {
    try {
      const response = await api.put(`${this.baseURL}/configuracao-cobranca`, config);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar configuração de cobrança:', error);
      throw error;
    }
  }

  // Exportação de dados
  async exportarRelatorio(formato: 'pdf' | 'excel', filtros?: any): Promise<Blob> {
    try {
      const response = await api.get(`${this.baseURL}/exportar`, {
        params: { formato, ...filtros },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      throw error;
    }
  }

  // Integração com sistemas externos
  async sincronizarComERP(): Promise<{ sincronizadas: number; erros: number }> {
    try {
      const response = await api.post(`${this.baseURL}/sincronizar-erp`);
      return response.data;
    } catch (error) {
      console.error('Erro ao sincronizar com ERP:', error);
      throw error;
    }
  }

  async gerarBoletos(ids: string[]): Promise<{ boletos: string[]; erros: string[] }> {
    try {
      const response = await api.post(`${this.baseURL}/gerar-boletos`, { ids });
      return response.data;
    } catch (error) {
      console.error('Erro ao gerar boletos:', error);
      throw error;
    }
  }
}

export const contasAReceberService = new ContasAReceberService();
export default contasAReceberService;