import api from '@/lib/axios';

export interface WorkPost {
  id: string;
  postCode: string;
  name: string;
  description?: string;
  address?: string;
  clientId?: string;
  clientName?: string;
  status?: string;
  type?: string;
}

export const workPostService = {
  // Buscar todos os postos de trabalho
  async getAllWorkPosts(): Promise<WorkPost[]> {
    try {
      const response = await api.get('/work-posts/all');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar postos de trabalho:', error);
      throw new Error('Falha ao buscar postos de trabalho');
    }
  },

  // Buscar postos por cliente
  async getWorkPostsByClient(clientId: string): Promise<WorkPost[]> {
    try {
      const response = await api.get(`/work-posts/client/${clientId}/all`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar postos por cliente:', error);
      throw new Error('Falha ao buscar postos por cliente');
    }
  },

  // Buscar posto por ID
  async getWorkPostById(id: string): Promise<WorkPost> {
    try {
      const response = await api.get(`/work-posts/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar posto de trabalho:', error);
      throw new Error('Falha ao buscar posto de trabalho');
    }
  }
};

export default workPostService;