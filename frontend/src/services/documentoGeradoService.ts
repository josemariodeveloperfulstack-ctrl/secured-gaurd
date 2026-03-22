import api from '@/lib/axios';

export enum StatusDocumento {
  PENDENTE = 'PENDENTE',
  ASSINADO = 'ASSINADO',
  CANCELADO = 'CANCELADO',
  VENCIDO = 'VENCIDO'
}

export interface DocumentoGerado {
  id: string;
  modeloId: string;
  funcionarioId: string;
  conteudoFinal: string;
  nomeArquivoGerado: string;
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
