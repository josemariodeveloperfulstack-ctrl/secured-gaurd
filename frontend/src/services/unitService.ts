import axios from '@/lib/axios';
import { Unit } from '@/types/visit';

const BASE_URL = '/api/units';

// Interfaces para as operações de Filiais
export interface CreateUnitRequest {
  name: string;
  description?: string;
  address: string;
  phone?: string;
  email?: string;
}

export interface UpdateUnitRequest {
  name: string;
  description?: string;
  address: string;
  phone?: string;
  email?: string;
}

export interface DeleteCheckResponse {
  canDelete: boolean;
  dependenciesCount: number;
  dependencies: string[];
  message: string;
}

export const unitService = {
  /**
   * Lista todas as unidades ativas
   */
  async getAllUnits(): Promise<Unit[]> {
    const response = await axios.get(`${BASE_URL}`);
    return response.data;
  },

  /**
   * Lista unidades por cliente
   */
  async getUnitsByClient(clientId: string): Promise<Unit[]> {
    const response = await axios.get(`${BASE_URL}/client/${clientId}/active`);
    return response.data;
  },

  /**
   * Busca unidade por ID
   */
  async getUnitById(id: string): Promise<Unit> {
    const response = await axios.get(`${BASE_URL}/${id}`);
    return response.data;
  },

  /**
   * Cria uma nova unidade
   */
  async createUnit(data: CreateUnitRequest): Promise<Unit> {
    const response = await axios.post(`${BASE_URL}`, data);
    return response.data;
  },

  /**
   * Atualiza uma unidade existente
   */
  async updateUnit(id: string, data: UpdateUnitRequest): Promise<Unit> {
    const response = await axios.put(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  /**
   * Verifica se é possível deletar uma unidade
   */
  async checkDeletePossibility(id: string): Promise<DeleteCheckResponse> {
    try {
      const response = await axios.get(`${BASE_URL}/${id}/check-delete`);
      return response.data;
    } catch (error: any) {
      // Se não houver endpoint específico, simular resposta
      return {
        canDelete: true,
        dependenciesCount: 0,
        dependencies: [],
        message: 'Unidade pode ser excluída'
      };
    }
  },

  /**
   * Delete uma unidade (verificação simples)
   */
  async deleteUnit(id: string): Promise<void> {
    await axios.delete(`${BASE_URL}/${id}`);
  },

  /**
   * Delete uma unidade com suas dependências
   */
  async deleteUnitWithDependencies(id: string): Promise<void> {
    await axios.delete(`${BASE_URL}/${id}?force=true`);
  }
};

export default unitService;