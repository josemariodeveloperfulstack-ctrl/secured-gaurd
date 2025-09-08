import { api } from '@/lib/axios';

export interface Pagamento {
  id: string;
  fornecedor: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'pago' | 'cancelado';
  categoria: 'fornecedor' | 'funcionario' | 'imposto' | 'servico' | 'outros';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  centroCusto: string;
  numeroNF?: string;
  formaPagamento: 'pix' | 'ted' | 'doc' | 'boleto' | 'cheque' | 'dinheiro';
  contaBancaria?: string;
  observacoes?: string;
  anexos: string[];
  workflow: WorkflowEtapa[];
  limitesValidados: boolean;
  integracaoBancaria?: IntegracaoBancaria;
  criadoEm: string;
  criadoPor: string;
  atualizadoEm: string;
}

export interface WorkflowEtapa {
  id: string;
  ordem: number;
  nome: string;
  descricao: string;
  responsavel: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'pulado';
  dataProcessamento?: string;
  observacoes?: string;
  valorLimite?: number;
  obrigatoria: boolean;
}

export interface IntegracaoBancaria {
  id: string;
  banco: string;
  agencia: string;
  conta: string;
  chavePix?: string;
  statusTransacao?: 'pendente' | 'processando' | 'concluida' | 'falhou';
  codigoTransacao?: string;
  dataProcessamento?: string;
  taxas?: number;
  comprovante?: string;
}

export interface LimitePagamento {
  id: string;
  tipo: 'diario' | 'semanal' | 'mensal' | 'anual';
  categoria: string;
  valorLimite: number;
  valorUtilizado: number;
  percentualUtilizado: number;
  dataInicio: string;
  dataFim: string;
  ativo: boolean;
  alertaPercentual: number;
  responsavel: string;
}

export interface NotificacaoPagamento {
  id: string;
  tipo: 'aprovacao_pendente' | 'limite_excedido' | 'vencimento_proximo' | 'pagamento_realizado' | 'erro_integracao';
  titulo: string;
  descricao: string;
  pagamentoId?: string;
  destinatario: string;
  lida: boolean;
  dataEnvio: string;
  prioridade: 'baixa' | 'media' | 'alta';
}

export interface AprovacaoPagamento {
  id: string;
  pagamentoId: string;
  etapaId: string;
  aprovador: string;
  decisao: 'aprovado' | 'rejeitado';
  observacoes?: string;
  dataAprovacao: string;
  proximaEtapa?: string;
}

export interface RelatorioAprovacao {
  totalPendentes: number;
  totalAprovados: number;
  totalRejeitados: number;
  valorTotalPendente: number;
  valorTotalAprovado: number;
  tempoMedioAprovacao: number;
  aprovacoesPorUsuario: {
    usuario: string;
    aprovados: number;
    rejeitados: number;
    tempoMedio: number;
  }[];
  gargalosWorkflow: {
    etapa: string;
    tempoMedio: number;
    pendentes: number;
  }[];
}

export interface ConfiguracaoWorkflow {
  id: string;
  nome: string;
  descricao: string;
  etapas: {
    ordem: number;
    nome: string;
    responsavel: string;
    valorMinimo?: number;
    valorMaximo?: number;
    categorias: string[];
    obrigatoria: boolean;
    prazoHoras: number;
  }[];
  ativo: boolean;
  padrao: boolean;
}

export interface DashboardPagamentos {
  resumo: {
    totalPendentes: number;
    totalAprovados: number;
    totalPagos: number;
    valorTotal: number;
  };
  vencimentosProximos: Pagamento[];
  aprovacoesPendentes: Pagamento[];
  limitesProximosEsgotamento: LimitePagamento[];
  integracoesFalharam: Pagamento[];
  estatisticas: {
    tempoMedioAprovacao: number;
    taxaAprovacao: number;
    economiaAutomacao: number;
    satisfacaoFornecedores: number;
  };
}

class PagamentosService {
  private baseURL = '/api/pagamentos';

  // CRUD básico
  async listarPagamentos(filtros?: {
    status?: string;
    categoria?: string;
    prioridade?: string;
    dataInicio?: string;
    dataFim?: string;
    fornecedor?: string;
    centroCusto?: string;
  }): Promise<Pagamento[]> {
    try {
      const response = await api.get(this.baseURL, { params: filtros });
      return response.data;
    } catch (error) {
      console.error('Erro ao listar pagamentos:', error);
      throw error;
    }
  }

  async obterPagamento(id: string): Promise<Pagamento> {
    try {
      const response = await api.get(`${this.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao obter pagamento:', error);
      throw error;
    }
  }

  async criarPagamento(pagamento: Omit<Pagamento, 'id' | 'workflow' | 'limitesValidados' | 'criadoEm' | 'atualizadoEm'>): Promise<Pagamento> {
    try {
      const response = await api.post(this.baseURL, pagamento);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar pagamento:', error);
      throw error;
    }
  }

  async atualizarPagamento(id: string, pagamento: Partial<Pagamento>): Promise<Pagamento> {
    try {
      const response = await api.put(`${this.baseURL}/${id}`, pagamento);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
      throw error;
    }
  }

  async excluirPagamento(id: string): Promise<void> {
    try {
      await api.delete(`${this.baseURL}/${id}`);
    } catch (error) {
      console.error('Erro ao excluir pagamento:', error);
      throw error;
    }
  }

  // Workflow de Aprovação
  async processarEtapaWorkflow(pagamentoId: string, etapaId: string, dados: {
    decisao: 'aprovado' | 'rejeitado';
    observacoes?: string;
  }): Promise<AprovacaoPagamento> {
    try {
      const response = await api.post(`${this.baseURL}/${pagamentoId}/workflow/${etapaId}`, dados);
      return response.data;
    } catch (error) {
      console.error('Erro ao processar etapa do workflow:', error);
      throw error;
    }
  }

  async obterWorkflowPagamento(id: string): Promise<WorkflowEtapa[]> {
    try {
      const response = await api.get(`${this.baseURL}/${id}/workflow`);
      return response.data;
    } catch (error) {
      console.error('Erro ao obter workflow do pagamento:', error);
      throw error;
    }
  }

  async listarAprovacoesPendentes(usuario?: string): Promise<Pagamento[]> {
    try {
      const response = await api.get(`${this.baseURL}/aprovacoes-pendentes`, {
        params: { usuario }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao listar aprovações pendentes:', error);
      throw error;
    }
  }

  async aprovarLote(pagamentoIds: string[], observacoes?: string): Promise<{
    aprovados: string[];
    erros: { id: string; erro: string }[];
  }> {
    try {
      const response = await api.post(`${this.baseURL}/aprovar-lote`, {
        pagamentoIds,
        observacoes
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao aprovar lote:', error);
      throw error;
    }
  }

  // Controle de Limites
  async verificarLimites(pagamento: Partial<Pagamento>): Promise<{
    valido: boolean;
    limitesAfetados: LimitePagamento[];
    alertas: string[];
  }> {
    try {
      const response = await api.post(`${this.baseURL}/verificar-limites`, pagamento);
      return response.data;
    } catch (error) {
      console.error('Erro ao verificar limites:', error);
      throw error;
    }
  }

  async listarLimites(): Promise<LimitePagamento[]> {
    try {
      const response = await api.get(`${this.baseURL}/limites`);
      return response.data;
    } catch (error) {
      console.error('Erro ao listar limites:', error);
      throw error;
    }
  }

  async criarLimite(limite: Omit<LimitePagamento, 'id' | 'valorUtilizado' | 'percentualUtilizado'>): Promise<LimitePagamento> {
    try {
      const response = await api.post(`${this.baseURL}/limites`, limite);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar limite:', error);
      throw error;
    }
  }

  async atualizarLimite(id: string, limite: Partial<LimitePagamento>): Promise<LimitePagamento> {
    try {
      const response = await api.put(`${this.baseURL}/limites/${id}`, limite);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar limite:', error);
      throw error;
    }
  }

  // Integração Bancária
  async processarIntegracaoBancaria(pagamentoId: string): Promise<IntegracaoBancaria> {
    try {
      const response = await api.post(`${this.baseURL}/${pagamentoId}/integracao-bancaria`);
      return response.data;
    } catch (error) {
      console.error('Erro ao processar integração bancária:', error);
      throw error;
    }
  }

  async consultarStatusTransacao(pagamentoId: string): Promise<IntegracaoBancaria> {
    try {
      const response = await api.get(`${this.baseURL}/${pagamentoId}/status-transacao`);
      return response.data;
    } catch (error) {
      console.error('Erro ao consultar status da transação:', error);
      throw error;
    }
  }

  async reprocessarPagamento(pagamentoId: string): Promise<IntegracaoBancaria> {
    try {
      const response = await api.post(`${this.baseURL}/${pagamentoId}/reprocessar`);
      return response.data;
    } catch (error) {
      console.error('Erro ao reprocessar pagamento:', error);
      throw error;
    }
  }

  async obterComprovantePagamento(pagamentoId: string): Promise<Blob> {
    try {
      const response = await api.get(`${this.baseURL}/${pagamentoId}/comprovante`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter comprovante:', error);
      throw error;
    }
  }

  // Notificações
  async listarNotificacoes(usuario?: string): Promise<NotificacaoPagamento[]> {
    try {
      const response = await api.get(`${this.baseURL}/notificacoes`, {
        params: { usuario }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao listar notificações:', error);
      throw error;
    }
  }

  async marcarNotificacaoComoLida(id: string): Promise<void> {
    try {
      await api.put(`${this.baseURL}/notificacoes/${id}/lida`);
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      throw error;
    }
  }

  async enviarNotificacao(notificacao: Omit<NotificacaoPagamento, 'id' | 'dataEnvio' | 'lida'>): Promise<NotificacaoPagamento> {
    try {
      const response = await api.post(`${this.baseURL}/notificacoes`, notificacao);
      return response.data;
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      throw error;
    }
  }

  // Relatórios e Análises
  async obterRelatorioAprovacao(periodo?: {
    dataInicio: string;
    dataFim: string;
  }): Promise<RelatorioAprovacao> {
    try {
      const response = await api.get(`${this.baseURL}/relatorio-aprovacao`, {
        params: periodo
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter relatório de aprovação:', error);
      throw error;
    }
  }

  async obterDashboard(): Promise<DashboardPagamentos> {
    try {
      const response = await api.get(`${this.baseURL}/dashboard`);
      return response.data;
    } catch (error) {
      console.error('Erro ao obter dashboard:', error);
      throw error;
    }
  }

  async obterEstatisticasPagamentos(periodo?: {
    dataInicio: string;
    dataFim: string;
  }): Promise<{
    totalPagamentos: number;
    valorTotal: number;
    tempoMedioAprovacao: number;
    taxaAprovacao: number;
    distribuicaoPorCategoria: { categoria: string; valor: number; quantidade: number }[];
    distribuicaoPorStatus: { status: string; quantidade: number }[];
    tendenciaMensal: { mes: string; valor: number; quantidade: number }[];
  }> {
    try {
      const response = await api.get(`${this.baseURL}/estatisticas`, {
        params: periodo
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }

  // Configurações de Workflow
  async listarConfiguracaoWorkflow(): Promise<ConfiguracaoWorkflow[]> {
    try {
      const response = await api.get(`${this.baseURL}/configuracao-workflow`);
      return response.data;
    } catch (error) {
      console.error('Erro ao listar configurações de workflow:', error);
      throw error;
    }
  }

  async criarConfiguracaoWorkflow(config: Omit<ConfiguracaoWorkflow, 'id'>): Promise<ConfiguracaoWorkflow> {
    try {
      const response = await api.post(`${this.baseURL}/configuracao-workflow`, config);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar configuração de workflow:', error);
      throw error;
    }
  }

  async atualizarConfiguracaoWorkflow(id: string, config: Partial<ConfiguracaoWorkflow>): Promise<ConfiguracaoWorkflow> {
    try {
      const response = await api.put(`${this.baseURL}/configuracao-workflow/${id}`, config);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar configuração de workflow:', error);
      throw error;
    }
  }

  // Anexos e Documentos
  async uploadAnexo(pagamentoId: string, arquivo: File): Promise<{ url: string; nome: string }> {
    try {
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      const response = await api.post(`${this.baseURL}/${pagamentoId}/anexos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao fazer upload do anexo:', error);
      throw error;
    }
  }

  async removerAnexo(pagamentoId: string, anexoUrl: string): Promise<void> {
    try {
      await api.delete(`${this.baseURL}/${pagamentoId}/anexos`, {
        data: { anexoUrl }
      });
    } catch (error) {
      console.error('Erro ao remover anexo:', error);
      throw error;
    }
  }

  // Exportação
  async exportarRelatorio(formato: 'pdf' | 'excel', tipo: 'pagamentos' | 'aprovacoes' | 'limites', filtros?: any): Promise<Blob> {
    try {
      const response = await api.get(`${this.baseURL}/exportar`, {
        params: { formato, tipo, ...filtros },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      throw error;
    }
  }

  // Integração com ERP
  async sincronizarComERP(): Promise<{ sincronizados: number; erros: number }> {
    try {
      const response = await api.post(`${this.baseURL}/sincronizar-erp`);
      return response.data;
    } catch (error) {
      console.error('Erro ao sincronizar com ERP:', error);
      throw error;
    }
  }

  // Auditoria
  async obterLogAuditoria(pagamentoId: string): Promise<{
    id: string;
    acao: string;
    usuario: string;
    data: string;
    detalhes: any;
  }[]> {
    try {
      const response = await api.get(`${this.baseURL}/${pagamentoId}/auditoria`);
      return response.data;
    } catch (error) {
      console.error('Erro ao obter log de auditoria:', error);
      throw error;
    }
  }
}

export const pagamentosService = new PagamentosService();
export default pagamentosService;