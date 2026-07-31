import api from '@/lib/axios';

export type MedicalDocumentType =
  | 'ATESTADO'
  | 'DECLARACAO_COMPARECIMENTO'
  | 'DECLARACAO_MEDICA'
  | 'CAT'
  | 'AFASTAMENTO';

export interface MedicalDocument {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCpf?: string;
  employeeDepartment?: string;
  employeePosition?: string;
  companyId?: string;
  companyName?: string;
  documentType: MedicalDocumentType;
  startDate: string;
  endDate?: string;
  days?: number;
  hours?: number;
  cidCode?: string;
  cidDescription?: string;
  specialty?: string;
  crm?: string;
  doctorName?: string;
  documentUrl?: string;
  observations?: string;
  inssAlert?: boolean;
  inssAlertMessage?: string;
  relatedDaysInWindow?: number;
  status?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MedicalDocumentFilters {
  employeeId?: string;
  companyId?: string;
  type?: MedicalDocumentType;
  from?: string;
  to?: string;
  cid?: string;
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface MedicalDashboard {
  total: number;
  atestados: number;
  declaracoes: number;
  diasAfastados: number;
  horasAusentes: number;
  alertasInss: number;
  cidMaisRecorrente?: string;
  porTipo?: Record<string, number>;
}

export const MEDICAL_TYPE_LABELS: Record<MedicalDocumentType, string> = {
  ATESTADO: 'Atestado Médico',
  DECLARACAO_COMPARECIMENTO: 'Declaração de Comparecimento',
  DECLARACAO_MEDICA: 'Declaração Médica',
  CAT: 'CAT',
  AFASTAMENTO: 'Afastamento',
};

export interface CidSuggestion {
  code: string;
  description: string;
  source?: 'CID10' | 'CID11' | 'LOCAL' | string;
}

export const medicalDocumentService = {
  async search(filters: MedicalDocumentFilters = {}) {
    const params = new URLSearchParams();
    if (filters.employeeId) params.append('employeeId', filters.employeeId);
    if (filters.companyId) params.append('companyId', filters.companyId);
    if (filters.type) params.append('type', filters.type);
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);
    if (filters.cid) params.append('cid', filters.cid);
    if (filters.search) params.append('search', filters.search);
    params.append('page', String(filters.page ?? 0));
    params.append('size', String(filters.size ?? 20));
    params.append('sort', filters.sort || 'createdAt,desc');
    const { data } = await api.get(`/api/medical-documents?${params.toString()}`);
    return data as {
      content: MedicalDocument[];
      totalElements: number;
      totalPages: number;
      number: number;
    };
  },

  async dashboard(from?: string, to?: string, companyId?: string) {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (companyId) params.append('companyId', companyId);
    const { data } = await api.get(`/api/medical-documents/dashboard?${params.toString()}`);
    return data as MedicalDashboard;
  },

  async searchCid(query: string, limit = 20) {
    const q = query.trim();
    if (q.length < 3) return [] as CidSuggestion[];
    const params = new URLSearchParams({ q, limit: String(limit) });
    const { data } = await api.get(`/api/medical-documents/cid/search?${params.toString()}`);
    return (data || []) as CidSuggestion[];
  },

  async lookupCid(code: string) {
    const cid = code.trim();
    if (!cid) return { cidCode: '', cidDescription: '' };
    const { data } = await api.get(`/api/medical-documents/cid/${encodeURIComponent(cid)}`);
    return data as { cidCode: string; cidDescription: string };
  },

  async getById(id: string) {
    const { data } = await api.get(`/api/medical-documents/${id}`);
    return data as MedicalDocument;
  },

  async historyByEmployee(employeeId: string) {
    const { data } = await api.get(`/api/medical-documents/employee/${employeeId}/history`);
    return data as MedicalDocument[];
  },

  async create(payload: Partial<MedicalDocument>) {
    const { data } = await api.post('/api/medical-documents', payload);
    return data as MedicalDocument;
  },

  async update(id: string, payload: Partial<MedicalDocument>) {
    const { data } = await api.put(`/api/medical-documents/${id}`, payload);
    return data as MedicalDocument;
  },

  async remove(id: string) {
    await api.delete(`/api/medical-documents/${id}`);
  },

  async uploadAttachment(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/api/uploads/atestados', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data as { url: string; filename: string };
  },
};
