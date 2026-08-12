import api from '@/lib/axios';

export type SstProfessionalType =
  | 'ENGENHEIRO_SEGURANCA'
  | 'TECNICO_SEGURANCA'
  | 'MEDICO_TRABALHO'
  | 'OUTRO';

export const SST_PROFESSIONAL_TYPE_LABELS: Record<SstProfessionalType, string> = {
  ENGENHEIRO_SEGURANCA: 'Engenheiro de Segurança do Trabalho',
  TECNICO_SEGURANCA: 'Técnico de Segurança do Trabalho',
  MEDICO_TRABALHO: 'Médico do Trabalho',
  OUTRO: 'Outro profissional de SST',
};

export interface SstProfessional {
  id: string;
  name: string;
  creaNumber: string;
  phone?: string;
  email?: string;
  professionalType: SstProfessionalType;
  stampImageUrl?: string;
  active?: boolean;
  notes?: string;
  companyId: string;
  companyName?: string;
  companyIds?: string[];
  companyNames?: string[];
  companyDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type SstProfessionalPayload = Omit<
  SstProfessional,
  'id' | 'companyName' | 'companyNames' | 'createdAt' | 'updatedAt'
> & { id?: string };

export const sstProfessionalService = {
  async listAll(): Promise<SstProfessional[]> {
    const { data } = await api.get('/api/safety-engineers');
    return data;
  },

  async listByCompany(companyId: string): Promise<SstProfessional[]> {
    const { data } = await api.get(`/api/safety-engineers/company/${companyId}`);
    return data;
  },

  async getById(id: string): Promise<SstProfessional> {
    const { data } = await api.get(`/api/safety-engineers/${id}`);
    return data;
  },

  async create(payload: SstProfessionalPayload): Promise<SstProfessional> {
    const { data } = await api.post('/api/safety-engineers', payload);
    return data;
  },

  async update(id: string, payload: SstProfessionalPayload): Promise<SstProfessional> {
    const { data } = await api.put(`/api/safety-engineers/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/safety-engineers/${id}`);
  },

  async setAsDefault(id: string): Promise<SstProfessional> {
    const { data } = await api.post(`/api/safety-engineers/${id}/set-default`);
    return data;
  },

  async uploadStamp(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/api/uploads/safety-engineers/stamps', formData);
    return data;
  },

  async updateStampUrl(id: string, stampImageUrl: string): Promise<SstProfessional> {
    const { data } = await api.patch(`/api/safety-engineers/${id}/stamp-image-url`, { stampImageUrl });
    return data;
  },
};
