import api from '@/lib/axios';

export interface CompanyDefaultEPI {
  id?: string;
  epiName: string;
  quantity: number;
  caNumber?: string;
  validity?: string;
  observations?: string;
  orderIndex?: number;
}

export interface CreateCompanyRequest {
  name: string;
  cnpj: string;
  email?: string;
  phone?: string;
  address?: string;
  enderecoRua?: string;
  enderecoNumero?: string;
  enderecoComplemento?: string;
  enderecoBairro?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  sigla?: string;
  description?: string;
  website?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED';
  logoUrl?: string;
  defaultEpis?: CompanyDefaultEPI[];
}

export const DEFAULT_GROUP_COMPANIES = [
  { id: '8b63e5ce-0a98-490d-b11f-82990b3dc5be', name: 'PROMOVER TERCEIRIZAÇÃO & SERVIÇOS LTDA', sigla: 'TERC', status: 'ACTIVE' },
  { id: '9c74f6df-1b09-501e-c22g-93001c4ed6cf', name: 'PROMOVER VIGILÂNCIA PATRIMONIAL LTDA', sigla: 'VIG', status: 'ACTIVE' },
  { id: '0d85a7ee-2c10-612f-d33h-04112d5fe7da', name: 'PROMOVER ADMINISTRAÇÃO & GESTÃO LTDA', sigla: 'ADM', status: 'ACTIVE' }
];

export const companyService = {
  async createCompany(data: CreateCompanyRequest) {
    const response = await api.post('/api/companies', data);
    return response.data;
  },

  async getAllCompanies() {
    try {
      const response = await api.get('/api/companies');
      const list = (response.data as Array<any>) ?? [];
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
      console.warn('API /api/companies retornou lista vazia. Utilizando empresas padrão do grupo.');
      return DEFAULT_GROUP_COMPANIES;
    } catch (err: any) {
      console.warn('Erro ao carregar empresas via API, utilizando empresas padrão do grupo:', err?.response?.status, err?.message);
      return DEFAULT_GROUP_COMPANIES;
    }
  },

  async getCompanies() {
    return this.getAllCompanies();
  },

  async getCompanyById(id: string) {
    try {
      const response = await api.get(`/api/companies/${id}`);
      return response.data;
    } catch (err) {
      const fallback = DEFAULT_GROUP_COMPANIES.find(c => c.id === id);
      if (fallback) return fallback;
      throw err;
    }
  },

  async updateCompany(id: string, data: Partial<CreateCompanyRequest>) {
    const response = await api.put(`/api/companies/${id}`, data);
    return response.data;
  },

  async deleteCompany(id: string) {
    await api.delete(`/api/companies/${id}`);
  }
};

export default companyService;