import api from '@/lib/axios';

export interface EPIDeliveryFormItem {
  id?: string;
  epiName: string;
  quantity: number;
  ca?: string; // Número do CA
  caName?: string; // Nome/Descrição do CA
  validityDate?: string;
  uniformType?: string;
  uniformPiece?: string;
  observations?: string;
  stockItemId?: string; // ID do item no estoque para baixa automática
  /** Data da substituição — coluna SUBSTITUÍDO no PDF */
  substitutedDate?: string;
  /** Motivo da substituição — coluna MOTIVO DA SUBST. no PDF */
  replacementReason?: string;
}

export type EPIDeliveryType = 'PRIMEIRA_ENTREGA' | 'SUBSTITUICAO' | 'DEVOLUCAO' | 'TROCA';
export type EPIDeliveryFormStatus = 'DRAFT' | 'COMPLETED';

export interface CreateEPIDeliveryForm {
  employeeId: string;
  companyId: string;
  deliveryDate: string;
  responsibleEmployeeId?: string;
  observations?: string;
  pdfUrl?: string;
  deliveryType?: EPIDeliveryType;
  items: EPIDeliveryFormItem[];
  signatureBase64?: string;
  signatureType?: 'ON_SCREEN' | 'PHYSICAL_ACKNOWLEDGEMENT' | 'WHATSAPP_CONFIRM';
  status?: EPIDeliveryFormStatus;
}

export interface EPIDeliveryForm {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCpf?: string;
  companyId: string;
  companyName: string;
  companyCnpj?: string;
  deliveryDate: string;
  responsibleEmployeeId?: string;
  responsibleEmployeeName?: string;
  observations?: string;
  pdfUrl?: string;
  createdById?: string;
  createdByName?: string;
  deliveryType?: EPIDeliveryType;
  employeeWorkSector?: string;
  createdAt: string;
  updatedAt: string;
  items: EPIDeliveryFormItem[];
  status?: EPIDeliveryFormStatus;
  signatureType?: 'ON_SCREEN' | 'PHYSICAL_ACKNOWLEDGEMENT' | 'WHATSAPP_CONFIRM';
  confirmationSentAt?: string;
  confirmationExpiresAt?: string;
  confirmationPending?: boolean;
}

export interface EpiConfirmationSendResponse {
  formId: string;
  confirmationToken: string;
  confirmationCode: string;
  confirmUrl: string;
  whatsappUrl: string;
  phoneMasked: string;
  sent: boolean;
  mode: 'AUTO' | 'MANUAL';
  expiresAt: string;
  message: string;
}

export interface PublicEpiConfirmation {
  employeeName: string;
  companyName?: string;
  deliveryDate: string;
  deliveryType?: string;
  items: Array<{ epiName: string; quantity: number; ca?: string; caName?: string }>;
  alreadyConfirmed: boolean;
  expired: boolean;
  awaitingConfirmation: boolean;
}

export interface EPIDeliveryFormFilters {
  employeeId?: string;
  companyId?: string;
  sectorId?: string;
  reportType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface EPIDeliveryFormPage {
  content: EPIDeliveryForm[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const epiDeliveryFormService = {
  /**
   * Criar uma nova ficha de entrega de EPI
   */
  async create(data: CreateEPIDeliveryForm): Promise<EPIDeliveryForm> {
    try {
      const response = await api.post('/epi-delivery-forms', data);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar ficha de entrega de EPI:', error);
      throw error;
    }
  },

  /**
   * Buscar ficha por ID
   */
  async getById(id: string): Promise<EPIDeliveryForm> {
    try {
      const response = await api.get(`/epi-delivery-forms/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar ficha de entrega de EPI:', error);
      throw error;
    }
  },

  /**
   * Atualizar uma ficha de entrega de EPI
   */
  async update(id: string, data: CreateEPIDeliveryForm): Promise<EPIDeliveryForm> {
    try {
      const response = await api.put(`/epi-delivery-forms/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar ficha de entrega de EPI:', error);
      throw error;
    }
  },

  /**
   * Listar todas as fichas com paginação
   */
  async getAll(page = 0, size = 10, sortBy = 'createdAt', sortDir: 'ASC' | 'DESC' = 'DESC'): Promise<EPIDeliveryFormPage> {
    try {
      const response = await api.get('/epi-delivery-forms', {
        params: { page, size, sortBy, sortDir }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao listar fichas de entrega de EPI:', error);
      throw error;
    }
  },

  /**
   * Buscar fichas com filtros
   */
  async search(filters: EPIDeliveryFormFilters): Promise<EPIDeliveryFormPage> {
    try {
      // Remover filtros vazios ou undefined antes de enviar
      const cleanFilters: any = {};
      if (filters.page !== undefined) cleanFilters.page = filters.page;
      if (filters.size !== undefined) cleanFilters.size = filters.size;
      if (filters.sortBy) cleanFilters.sortBy = filters.sortBy;
      if (filters.sortDir) cleanFilters.sortDir = filters.sortDir;
      if (filters.employeeId) cleanFilters.employeeId = filters.employeeId;
      if (filters.companyId) cleanFilters.companyId = filters.companyId;
      if (filters.startDate) cleanFilters.startDate = filters.startDate;
      if (filters.endDate) cleanFilters.endDate = filters.endDate;

      console.log('📤 Enviando requisição de busca:', cleanFilters);
      const response = await api.get('/epi-delivery-forms/search', {
        params: cleanFilters
      });
      console.log('📥 Resposta da busca:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao buscar fichas de entrega de EPI:', error);
      console.error('Detalhes do erro:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      });
      throw error;
    }
  },

  /**
   * Buscar fichas do funcionário autenticado (resolve Employee no servidor).
   */
  async getMine(): Promise<EPIDeliveryForm[]> {
    try {
      const response = await api.get('/epi-delivery-forms/me');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar minhas fichas de EPI:', error);
      throw error;
    }
  },

  /**
   * Buscar fichas por funcionário
   */
  async getByEmployeeId(employeeId: string): Promise<EPIDeliveryForm[]> {
    try {
      const response = await api.get(`/epi-delivery-forms/employee/${employeeId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar fichas por funcionário:', error);
      throw error;
    }
  },

  async confirmOwnReceipt(id: string, code?: string): Promise<EPIDeliveryForm> {
    const response = await api.post(`/epi-delivery-forms/${id}/confirm-own-receipt`, {
      code: code || undefined,
    });
    return response.data;
  },

  /**
   * Buscar fichas por empresa
   */
  async getByCompanyId(companyId: string): Promise<EPIDeliveryForm[]> {
    try {
      const response = await api.get(`/epi-delivery-forms/company/${companyId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar fichas por empresa:', error);
      throw error;
    }
  },

  /**
   * Deletar ficha
   */
  async delete(id: string): Promise<void> {
    try {
      await api.delete(`/epi-delivery-forms/${id}`);
    } catch (error) {
      console.error('Erro ao deletar ficha de entrega de EPI:', error);
      throw error;
    }
  },

  async sendWhatsAppConfirmation(
    id: string,
    mode: 'AUTO' | 'MANUAL',
    frontendBaseUrl: string
  ): Promise<EpiConfirmationSendResponse> {
    const response = await api.post(`/epi-delivery-forms/${id}/send-whatsapp-confirmation`, {
      mode,
      frontendBaseUrl,
    });
    return response.data;
  },

  async confirmWithCode(id: string, code: string): Promise<EPIDeliveryForm> {
    const response = await api.post(`/epi-delivery-forms/${id}/confirm-with-code`, { code });
    return response.data;
  },

  async getPublicConfirmation(token: string): Promise<PublicEpiConfirmation> {
    const response = await api.get(`/public/epi-delivery-forms/token/${token}`);
    return response.data;
  },

  async confirmPublicReceipt(
    token: string,
    code: string,
    signatureBase64?: string
  ): Promise<PublicEpiConfirmation> {
    const response = await api.post(`/public/epi-delivery-forms/token/${token}/confirm`, {
      code,
      signatureBase64,
    });
    return response.data;
  },

  /**
   * Gerar PDF de uma ficha de entrega de EPI existente (por ID)
   */
  async generatePdfById(id: string): Promise<Blob> {
    try {
      const response = await api.get(`/epi-delivery-forms/${id}/generate-pdf`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao gerar PDF da ficha de entrega de EPI:', error);
      throw error;
    }
  },

  /**
   * Gerar PDF da ficha de entrega de EPI e salvar no banco
   */
  async generateAndSavePdf(data: CreateEPIDeliveryForm): Promise<Blob> {
    try {
      const response = await api.post('/epi-delivery-forms/generate-pdf', data, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao gerar PDF da ficha de entrega de EPI:', error);
      throw error;
    }
  },

  /**
   * Gerar Excel da ficha de entrega de EPI e salvar no banco
   */
  async generateAndSaveExcel(data: CreateEPIDeliveryForm): Promise<Blob> {
    try {
      const response = await api.post('/epi-delivery-forms/generate-excel', data, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao gerar Excel da ficha de entrega de EPI:', error);
      throw error;
    }
  },

  /**
   * Gerar PDF em branco da ficha de entrega de EPI (Manual).
   * Se employeeId for informado, a ficha vem com nome, função, CPF, RG, admissão e demissão preenchidos.
   */
  async generateBlankPdf(companyId: string, employeeId?: string | null): Promise<Blob> {
    try {
      const params: { companyId: string; employeeId?: string } = { companyId };
      if (employeeId) params.employeeId = employeeId;
      const response = await api.get('/epi-delivery-forms/generate-blank-pdf', {
        params,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao gerar PDF em branco da ficha de entrega de EPI:', error);
      throw error;
    }
  },

  /**
   * Exportar relatório analítico de entregas de EPI (Excel)
   */
  async exportReport(filters: EPIDeliveryFormFilters): Promise<Blob> {
    try {
      const response = await api.get('/epi-delivery-forms/report/export', {
        params: filters,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao exportar relatório de EPI (Excel):', error);
      throw error;
    }
  },

  /**
   * Exportar relatório analítico de entregas de EPI (PDF)
   */
  async exportReportPdf(filters: EPIDeliveryFormFilters): Promise<Blob> {
    try {
      const response = await api.get('/epi-delivery-forms/report/export-pdf', {
        params: filters,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao exportar relatório de EPI (PDF):', error);
      throw error;
    }
  },
};


