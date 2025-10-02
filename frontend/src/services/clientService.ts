import api from '@/lib/axios';

export interface Client {
  id: string;
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: string;
}

export const clientService = {
  // Buscar todos os clientes
  async getAllClients(): Promise<Client[]> {
    try {
      const response = await api.get('/clients/all');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      throw new Error('Falha ao buscar clientes');
    }
  },

  // Buscar clientes para seleção
  async getClientsForSelect(): Promise<Client[]> {
    try {
      const response = await api.get('/clients/select');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar clientes para seleção:', error);
      throw new Error('Falha ao buscar clientes para seleção');
    }
  },

  // Buscar cliente por ID
  async getClientById(id: string): Promise<Client> {
    try {
      const response = await api.get(`/clients/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      throw new Error('Falha ao buscar cliente');
    }
  }
};

export default clientService;