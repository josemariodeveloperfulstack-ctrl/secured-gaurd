import api from '@/lib/axios';

export type OvertimeStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPENSATED';
export type OvertimeType = 'EXTRA' | 'COMPENSATION' | 'HOLIDAY' | 'WEEKEND';

export interface Overtime {
  id: string;
  employee: { id: string; name?: string; registrationNumber?: string };
  overtimeDate: string;
  startTime: string;
  endTime: string;
  totalHours?: number;
  type: OvertimeType;
  reason: string;
  justification?: string;
  status: OvertimeStatus;
  approvedBy?: { id: string; name: string };
  approvalDate?: string;
  workPost?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

/** Payload para atualização de hora extra (apenas campos editáveis). */
export interface OvertimeUpdatePayload {
  overtimeDate: string;
  startTime: string;
  endTime: string;
  totalHours?: number;
  type: OvertimeType;
  reason: string;
  workPost?: { id: string };
}

export const overtimeService = {
  async getAll(status?: string): Promise<Overtime[]> {
    const params = status ? { status } : {};
    const res = await api.get<Overtime[]>('/api/overtimes', { params });
    return Array.isArray(res.data) ? res.data : [];
  },

  async getApprovedByMonth(year: number, month: number): Promise<Overtime[]> {
    const res = await api.get<Overtime[]>('/api/overtimes/approved', { params: { year, month } });
    return Array.isArray(res.data) ? res.data : [];
  },

  async approve(id: string, approvedBy: string): Promise<Overtime> {
    const res = await api.post<Overtime>(`/api/overtimes/${id}/approve`, null, { params: { approvedBy } });
    return res.data;
  },

  async reject(id: string, justification: string): Promise<Overtime> {
    const res = await api.post<Overtime>(`/api/overtimes/${id}/reject`, null, { params: { justification } });
    return res.data;
  },

  async getById(id: string): Promise<Overtime> {
    const res = await api.get<Overtime>(`/api/overtimes/${id}`);
    return res.data;
  },

  async update(id: string, payload: OvertimeUpdatePayload): Promise<Overtime> {
    const res = await api.put<Overtime>(`/api/overtimes/${id}`, payload);
    return res.data;
  },

  async downloadExcel(year: number, month: number): Promise<Blob> {
    const res = await api.get<Blob>('/api/overtimes/export/excel', {
      params: { year, month },
      responseType: 'blob',
    });
    return res.data;
  },

  async downloadPdf(year: number, month: number): Promise<Blob> {
    const res = await api.get<Blob>('/api/overtimes/export/pdf', {
      params: { year, month },
      responseType: 'blob',
    });
    return res.data;
  },
};
