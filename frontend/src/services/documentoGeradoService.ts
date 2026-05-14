import api from '@/lib/axios';

export enum StatusDocumento {
  PENDENTE = 'PENDENTE',
  ASSINADO = 'ASSINADO',
  CANCELADO = 'CANCELADO',
  VENCIDO = 'VENCIDO'
}

/**
 * Categorias de documentos gerados pelo sistema (templates fixos).
 * Espelha o enum {@code TipoDocumentoGerado} no backend.
 */
export enum TipoDocumentoGerado {
  EMPLOYMENT_CONTRACT = 'EMPLOYMENT_CONTRACT',
  DECLARATION = 'DECLARATION',
  LGPD_CONSENT = 'LGPD_CONSENT',
  TRANSPORT_VOUCHER = 'TRANSPORT_VOUCHER',
  DISCIPLINARY_WARNING = 'DISCIPLINARY_WARNING',
  EQUIPMENT_RESPONSIBILITY = 'EQUIPMENT_RESPONSIBILITY',
  SERVICE_PROVIDER_AWARENESS = 'SERVICE_PROVIDER_AWARENESS',
  SERVICE_ORDER = 'SERVICE_ORDER',
  NPPS = 'NPPS',
  ACTIVITY_REPORT = 'ACTIVITY_REPORT',
  EPI_DELIVERY = 'EPI_DELIVERY',
  OTHER = 'OTHER',
}

/** Rótulos amigáveis em pt-BR para exibição no frontend. */
export const TIPO_DOCUMENTO_GERADO_LABEL: Record<TipoDocumentoGerado, string> = {
  [TipoDocumentoGerado.EMPLOYMENT_CONTRACT]: 'Contrato de Trabalho',
  [TipoDocumentoGerado.DECLARATION]: 'Declaração',
  [TipoDocumentoGerado.LGPD_CONSENT]: 'Termo de Consentimento LGPD',
  [TipoDocumentoGerado.TRANSPORT_VOUCHER]: 'Termo de Vale-Transporte',
  [TipoDocumentoGerado.DISCIPLINARY_WARNING]: 'Advertência Disciplinar',
  [TipoDocumentoGerado.EQUIPMENT_RESPONSIBILITY]: 'Termo de Responsabilidade (Equipamento)',
  [TipoDocumentoGerado.SERVICE_PROVIDER_AWARENESS]: 'Termo de Ciência (Prestador)',
  [TipoDocumentoGerado.SERVICE_ORDER]: 'Ordem de Serviço',
  [TipoDocumentoGerado.NPPS]: 'NPPS',
  [TipoDocumentoGerado.ACTIVITY_REPORT]: 'Relatório de Atividade',
  [TipoDocumentoGerado.EPI_DELIVERY]: 'Ficha de Entrega de EPI',
  [TipoDocumentoGerado.OTHER]: 'Outro Documento',
};

export interface DocumentoGerado {
  id: string;
  modeloId?: string;
  tipo?: TipoDocumentoGerado;
  funcionarioId: string;
  conteudoFinal?: string;
  nomeArquivoGerado: string;
  tamanhoArquivoGerado?: number;
  status: StatusDocumento;
  dataCriacao: string;
  dataAssinatura?: string;
  dataVencimento?: string;
}

export const documentoGeradoService = {
  async gerarDocumento(payload: {
    modeloId: string;
    funcionarioId: string;
    dadosPreenchidos: Record<string, any>;
  }): Promise<DocumentoGerado> {
    const response = await api.post('/api/documentos-gerados/gerar', payload);
    return response.data;
  },

  async listarPorFuncionario(funcionarioId: string): Promise<DocumentoGerado[]> {
    const response = await api.get(`/api/documentos-gerados/funcionario/${funcionarioId}`);
    return response.data;
  },

  /**
   * Lista os documentos gerados a partir de templates fixos do sistema,
   * filtrando por funcionário e tipo (ex: EMPLOYMENT_CONTRACT).
   */
  async listarPorFuncionarioETipo(
    funcionarioId: string,
    tipo: TipoDocumentoGerado,
  ): Promise<DocumentoGerado[]> {
    const response = await api.get(
      `/api/documentos-gerados/funcionario/${funcionarioId}/tipo/${tipo}`,
    );
    return response.data;
  },

  /**
   * Lista todos os documentos do usuário logado.
   * Usado pelo Dashboard do Colaborador.
   */
  async listarMeus(): Promise<DocumentoGerado[]> {
    const response = await api.get('/api/documentos-gerados/meus');
    return response.data;
  },

  async assinarDocumento(id: string): Promise<DocumentoGerado> {
    const response = await api.post(`/api/documentos-gerados/${id}/assinar`);
    return response.data;
  },

  async downloadArquivo(id: string): Promise<Blob> {
    const response = await api.get(`/api/documentos-gerados/${id}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  async excluirDocumento(id: string): Promise<void> {
    await api.delete(`/api/documentos-gerados/${id}`);
  }
};
