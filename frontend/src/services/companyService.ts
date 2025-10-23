import api from '@/lib/axios';

export interface CreateCompanyRequest {
  name: string;
  cnpj: string;
  email?: string;
  phone?: string;
  address?: string;
  sigla?: string;
  description?: string;
  website?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED';
}

export const companyService = {
  async createCompany(data: CreateCompanyRequest) {
    const response = await api.post('/api/companies', data);
    return response.data;
  },

  async getAllCompanies() {
    const response = await api.get('/api/companies');
    return response.data as Array<any>;
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
// Removed duplicated and outdated service definitions