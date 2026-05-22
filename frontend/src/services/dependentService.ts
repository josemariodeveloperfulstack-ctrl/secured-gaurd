import api from '@/lib/axios';
import { Dependent, DependentCreateRequest, DependentUpdateRequest, DependentFilters } from '@/types/dependent';

// Usa paths relativos - o axios já tem baseURL configurado (getApiUrl)
const dependentService = {
  // Buscar todos os dependentes
  async getAllDependents(): Promise<Dependent[]> {
    const response = await api.get('/dependents');
    return response.data;
  },

  // Buscar dependente por ID
  async getDependentById(id: string): Promise<Dependent> {
    const response = await api.get(`/dependents/${id}`);
    return response.data;
  },

  // Buscar dependentes por funcionário
  async getDependentsByEmployee(employeeId: string): Promise<Dependent[]> {
    const response = await api.get(`/dependents/employee/${encodeURIComponent(employeeId)}`);
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as { content?: unknown }).content)) {
      return (data as { content: Dependent[] }).content;
    }
    if (data && Array.isArray((data as { data?: unknown }).data)) {
      return (data as { data: Dependent[] }).data;
    }
    return [];
  },

  // Buscar dependentes por CPF
  async getDependentsByCpf(cpf: string): Promise<Dependent[]> {
    const response = await api.get(`/dependents/cpf/${cpf}`);
    return response.data;
  },

  // Buscar dependentes por relacionamento
  async getDependentsByRelationship(relationship: string): Promise<Dependent[]> {
    const response = await api.get(`/dependents/relationship/${relationship}`);
    return response.data;
  },

  // Criar novo dependente
  async createDependent(dependent: DependentCreateRequest): Promise<Dependent> {
    // Strip fields that are undefined, null, or empty string so the backend
    // never receives an empty email/CPF triggering a UNIQUE constraint conflict.
    const payload = Object.fromEntries(
      Object.entries(dependent).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ) as DependentCreateRequest;
    const response = await api.post('/dependents', payload);
    return response.data;
  },

  // Atualizar dependente
  async updateDependent(id: string, dependent: DependentUpdateRequest): Promise<Dependent> {
    const response = await api.put(`/dependents/${id}`, dependent);
    return response.data;
  },

  // Excluir dependente
  async deleteDependent(id: string): Promise<void> {
    await api.delete(`/dependents/${id}`);
  },

  // Buscar dependentes com filtros
  async getDependentsWithFilters(filters: DependentFilters): Promise<Dependent[]> {
    let dependents: Dependent[] = [];
    
    if (filters.employeeId) {
      dependents = await this.getDependentsByEmployee(filters.employeeId);
    } else {
      dependents = await this.getAllDependents();
    }

    // Aplicar filtros adicionais
    return dependents.filter(dependent => {
      if (filters.relationship && dependent.relationship !== filters.relationship) {
        return false;
      }
      if (filters.isStudent !== undefined && dependent.isStudent !== filters.isStudent) {
        return false;
      }
      if (filters.isBeneficiary !== undefined && dependent.isBeneficiary !== filters.isBeneficiary) {
        return false;
      }
      return true;
    });
  }
};

export default dependentService;