import api from '@/lib/axios';

const BASE = '/api/fiscal/invoices';

export interface FiscalInvoice {
  id: string;
  clientName: string;
  periodMonth: number;
  periodYear: number;
  fileType: string;
  filePath: string;
  fileNameOriginal?: string;
  fileSize?: number;
  createdAt: string;
  createdBy?: { id: string; username?: string } | null;
}

export interface FiscalFilters {
  periodYear?: number;
  periodMonth?: number;
  clientName?: string;
  fileType?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface FiscalPage {
  content: FiscalInvoice[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export type ZipGroupBy = 'PERIOD' | 'CLIENT' | 'TYPE';

export const fiscalService = {
  async list(filters: FiscalFilters = {}): Promise<FiscalPage> {
    const params = new URLSearchParams();
    if (filters.periodYear != null && filters.periodYear > 0) params.append('periodYear', String(filters.periodYear));
    if (filters.periodMonth != null && filters.periodMonth > 0) params.append('periodMonth', String(filters.periodMonth));
    if (filters.clientName != null && filters.clientName.trim() !== '') params.append('clientName', filters.clientName.trim());
    if (filters.fileType != null && filters.fileType.trim() !== '') params.append('fileType', filters.fileType.trim());
    if (filters.page != null) params.append('page', String(filters.page));
    if (filters.size != null) params.append('size', String(filters.size));
    if (filters.sort != null) params.append('sort', filters.sort);
    const { data } = await api.get<FiscalPage>(`${BASE}?${params.toString()}`);
    return data;
  },

  async upload(file: File, clientName: string, periodMonth: number, periodYear: number): Promise<FiscalInvoice> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('clientName', clientName);
    formData.append('periodMonth', String(periodMonth));
    formData.append('periodYear', String(periodYear));
    const { data } = await api.post<FiscalInvoice>(BASE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async analyze(file: File): Promise<{ clientName: string; periodMonth: number; periodYear: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<{ clientName: string; periodMonth: number; periodYear: number }>(`${BASE}/analyze`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },


  async getById(id: string): Promise<FiscalInvoice> {
    const { data } = await api.get<FiscalInvoice>(`${BASE}/${id}`);
    return data;
  },

  getDownloadUrl(id: string): string {
    const baseURL = (api.defaults.baseURL || '').replace(/\/$/, '');
    const url = (api.defaults.baseURL && !BASE.startsWith('http')) ? `${baseURL}${BASE}/${id}/download` : `${BASE}/${id}/download`;
    return url;
  },

  async downloadFile(id: string, filename?: string): Promise<void> {
    const { data } = await api.get<Blob>(`${BASE}/${id}/download`, { responseType: 'blob' });
    const link = document.createElement('a');
    link.href = globalThis.URL.createObjectURL(data);
    link.download = filename || 'nota-fiscal';
    link.click();
    globalThis.URL.revokeObjectURL(link.href);
  },

  getDownloadZipUrl(params: { groupBy: ZipGroupBy; periodYear?: number; periodMonth?: number; clientName?: string; fileType?: string }): string {
    const search = new URLSearchParams();
    search.set('groupBy', params.groupBy);
    if (params.periodYear != null && params.periodYear > 0) search.set('periodYear', String(params.periodYear));
    if (params.periodMonth != null && params.periodMonth > 0) search.set('periodMonth', String(params.periodMonth));
    if (params.clientName != null && params.clientName.trim() !== '') search.set('clientName', params.clientName.trim());
    if (params.fileType != null && params.fileType.trim() !== '') search.set('fileType', params.fileType.trim());
    const baseURL = (api.defaults.baseURL || '').replace(/\/$/, '');
    return `${baseURL}${BASE}/download-zip?${search.toString()}`;
  },

  async downloadZip(params: { groupBy: ZipGroupBy; periodYear?: number; periodMonth?: number; clientName?: string; fileType?: string }): Promise<void> {
    const search = new URLSearchParams();
    search.set('groupBy', params.groupBy);
    if (params.periodYear != null && params.periodYear > 0) search.set('periodYear', String(params.periodYear));
    if (params.periodMonth != null && params.periodMonth > 0) search.set('periodMonth', String(params.periodMonth));
    if (params.clientName != null && params.clientName.trim() !== '') search.set('clientName', params.clientName.trim());
    if (params.fileType != null && params.fileType.trim() !== '') search.set('fileType', params.fileType.trim());
    const response = await api.get<Blob>(`${BASE}/download-zip?${search.toString()}`, { responseType: 'blob' });
    if (response.status === 204 || (response.data instanceof Blob && response.data.size === 0)) {
      throw new Error('Nenhum arquivo encontrado para os filtros selecionados.');
    }
    const data = response.data;
    const link = document.createElement('a');
    link.href = globalThis.URL.createObjectURL(data);
    link.download = 'notas-fiscais.zip';
    link.click();
    globalThis.URL.revokeObjectURL(link.href);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
