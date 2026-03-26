import api from './api';

export interface AcordoRecolhimentoItem {
  id?: string;
  descricao: string;
  quantidade: number;
  unidade: string;
}

export interface AcordoRecolhimento {
  id?: string;
  numeroAcordo?: string;
  fornecedorId: string;
  fornecedorNome?: string;
  fornecedorCnpj?: string;
  dataAcordo: string;
  motivo: string;
  status?: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
  observacoes?: string;
  createdById?: string;
  approvedById?: string;
  approvedAt?: string;
  itens: AcordoRecolhimentoItem[];
  createdAt?: string;
  updatedAt?: string;
}

export const acordoRecolhimentoService = {
  getAll: async (): Promise<AcordoRecolhimento[]> => {
    const response = await api.get('/purchases/agreements');
    return response.data;
  },

  getById: async (id: string): Promise<AcordoRecolhimento> => {
    const response = await api.get(`/purchases/agreements/${id}`);
    return response.data;
  },

  create: async (data: AcordoRecolhimento): Promise<AcordoRecolhimento> => {
    const response = await api.post('/purchases/agreements', data);
    return response.data;
  },

  update: async (id: string, data: AcordoRecolhimento): Promise<AcordoRecolhimento> => {
    const response = await api.put(`/purchases/agreements/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/purchases/agreements/${id}`);
  },

  approve: async (id: string, approvedBy: string): Promise<AcordoRecolhimento> => {
    const response = await api.put(`/purchases/agreements/${id}/approve?approvedBy=${approvedBy}`);
    return response.data;
  },

  reject: async (id: string, rejectedBy: string): Promise<AcordoRecolhimento> => {
    const response = await api.put(`/purchases/agreements/${id}/reject?rejectedBy=${rejectedBy}`);
    return response.data;
  }
};

export default acordoRecolhimentoService;
