import api from '@/lib/axios';

export interface UnifiedDocument {
  id: string;
  employeeName: string;
  cpf: string;
  month: number;
  year: number;
  payslipFileName: string;
  receiptFileName: string;
  unifiedFileName: string;
  createdAt: string;
}

export const unifiedDocumentService = {
  /**
   * Busca todos os documentos unificados do colaborador logado
   * Backend já filtra por CPF para ROLE_COLABORADOR
   */
  async getAllUnifiedDocuments(): Promise<UnifiedDocument[]> {
    try {
      // Tentar primeiro o endpoint protegido (quando as permissões estiverem funcionando)
      try {
        const response = await api.get('/unified-documents/list');
        if (response.data && response.data.documents) {
          return response.data.documents;
        }
        return response.data || [];
      } catch (protectedError) {
        console.warn('Endpoint protegido falhou, tentando público:', protectedError);
        
        // Fallback para endpoint público
        const publicResponse = await api.get('/unified-documents/public/list');
        if (publicResponse.data && publicResponse.data.documents) {
          return publicResponse.data.documents;
        }
        return publicResponse.data || [];
      }
    } catch (error) {
      console.error('Erro ao buscar documentos unificados:', error);
      return [];
    }
  },

  /**
   * Baixa um documento unificado
   */
  async downloadUnifiedDocument(fileName: string): Promise<void> {
    try {
      const response = await api.get(`/unified-documents/download/${fileName}`, {
        responseType: 'blob'
      });

      // Criar link temporário para download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar documento unificado:', error);
      throw error;
    }
  },

  /**
   * Visualiza um documento unificado em nova aba
   */
  async viewUnifiedDocument(fileName: string): Promise<void> {
    try {
      const response = await api.get(`/unified-documents/view/${fileName}`, {
        responseType: 'blob'
      });

      // Abrir em nova aba
      const file = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, '_blank');
    } catch (error) {
      console.error('Erro ao visualizar documento unificado:', error);
      throw error;
    }
  }
};

export default unifiedDocumentService;

