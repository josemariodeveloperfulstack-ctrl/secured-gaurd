import api from '@/lib/axios';

export interface EPIDeliveryFormItem {
  id?: string;
  epiName: string;
  quantity: number;
  ca?: string;
  validityDate?: string;
  uniformType?: string;
  uniformPiece?: string;
  observations?: string;
}

export interface CreateEPIDeliveryForm {
  employeeId: string;
  companyId: string;
  deliveryDate: string;
  responsibleEmployeeId?: string;
  observations?: string;
  pdfUrl?: string;
  items: EPIDeliveryFormItem[];
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
  createdAt: string;
  updatedAt: string;
  items: EPIDeliveryFormItem[];
}

export interface EPIDeliveryFormFilters {
  employeeId?: string;
  companyId?: string;
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
      const response = await api.post('/api/epi-delivery-forms', data);
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
      const response = await api.get(`/api/epi-delivery-forms/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar ficha de entrega de EPI:', error);
      throw error;
    }
  },

  /**
   * Listar todas as fichas com paginação
   */
  async getAll(page = 0, size = 10, sortBy = 'createdAt', sortDir: 'ASC' | 'DESC' = 'DESC'): Promise<EPIDeliveryFormPage> {
    try {
      const response = await api.get('/api/epi-delivery-forms', {
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
      const response = await api.get('/api/epi-delivery-forms/search', {
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar fichas de entrega de EPI:', error);
      throw error;
    }
  },

  /**
   * Buscar fichas por funcionário
   */
  async getByEmployeeId(employeeId: string): Promise<EPIDeliveryForm[]> {
    try {
      const response = await api.get(`/api/epi-delivery-forms/employee/${employeeId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar fichas por funcionário:', error);
      throw error;
    }
  },

  /**
   * Buscar fichas por empresa
   */
  async getByCompanyId(companyId: string): Promise<EPIDeliveryForm[]> {
    try {
      const response = await api.get(`/api/epi-delivery-forms/company/${companyId}`);
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
      await api.delete(`/api/epi-delivery-forms/${id}`);
    } catch (error) {
      console.error('Erro ao deletar ficha de entrega de EPI:', error);
      throw error;
    }
  }
};

