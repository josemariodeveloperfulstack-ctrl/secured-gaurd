import api from '@/lib/axios';

/**
 * Onda 3 — Cliente do fluxo de aprovação de remanejamento.
 * Backend: /api/remanejamentos/approval
 */

export type RemanejamentoStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type RemanejamentoMotivo =
  | 'TRAINING_PENDING'
  | 'UNCOVERED_ABSENCE'
  | 'HEALTH_ISSUE'
  | 'DISCIPLINARY'
  | 'OTHER';

export type RemanejamentoTipo =
  | 'TRANSFERENCIA_UNIDADE'
  | 'TRANSFERENCIA_POSTO_TRABALHO'
  | 'TROCA_FUNCAO'
  | 'PROMOCAO'
  | 'COBRIR_FERIAS'
  | 'COBRIR_FALTA'
  | 'PLANTAO'
  | 'OUTROS';

export interface RemanejamentoRequestPayload {
  employeeId: string;
  coverageEmployeeId?: string | null;
  originWorkstationId?: string | null;
  destinationWorkstationId?: string | null;
  tipo: RemanejamentoTipo;
  motivo?: RemanejamentoMotivo | null;
  dataRemanejamento: string;
  observacao?: string | null;
  visitControlId?: string | null;
}

export interface RemanejamentoSummary {
  id: string;
  status: RemanejamentoStatus;
  motivo: RemanejamentoMotivo | null;
  tipo: RemanejamentoTipo;
  employeeId: string | null;
  employeeName: string | null;
  coverageEmployeeId: string | null;
  coverageEmployeeName: string | null;
  originWorkstationId: string | null;
  originWorkstationName: string | null;
  destinationWorkstationId: string | null;
  destinationWorkstationName: string | null;
  dataRemanejamento: string;
  observacao: string | null;
  requestedById: string | null;
  requestedByName: string | null;
  requestedAt: string | null;
  approvedById: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  visitControlId: string | null;
}

const BASE = '/api/remanejamentos/approval';

export const remanejamentoApprovalService = {
  request: async (payload: RemanejamentoRequestPayload): Promise<RemanejamentoSummary> => {
    const { data } = await api.post<RemanejamentoSummary>(`${BASE}/request`, payload);
    return data;
  },

  myRequests: async (): Promise<RemanejamentoSummary[]> => {
    const { data } = await api.get<RemanejamentoSummary[]>(`${BASE}/my-requests`);
    return data;
  },

  cancel: async (id: string): Promise<RemanejamentoSummary> => {
    const { data } = await api.post<RemanejamentoSummary>(`${BASE}/${id}/cancel`);
    return data;
  },

  listPending: async (): Promise<RemanejamentoSummary[]> => {
    const { data } = await api.get<RemanejamentoSummary[]>(`${BASE}/pending`);
    return data;
  },

  listByStatus: async (status?: RemanejamentoStatus): Promise<RemanejamentoSummary[]> => {
    const url = status ? `${BASE}?status=${encodeURIComponent(status)}` : BASE;
    const { data } = await api.get<RemanejamentoSummary[]>(url);
    return data;
  },

  countPending: async (): Promise<number> => {
    const { data } = await api.get<{ pending: number }>(`${BASE}/pending/count`);
    return data.pending ?? 0;
  },

  approve: async (id: string): Promise<RemanejamentoSummary> => {
    const { data } = await api.post<RemanejamentoSummary>(`${BASE}/${id}/approve`);
    return data;
  },

  reject: async (id: string, reason: string): Promise<RemanejamentoSummary> => {
    const { data } = await api.post<RemanejamentoSummary>(`${BASE}/${id}/reject`, { reason });
    return data;
  },

  getById: async (id: string): Promise<RemanejamentoSummary> => {
    const { data } = await api.get<RemanejamentoSummary>(`${BASE}/${id}`);
    return data;
  },
};

export const REMANEJAMENTO_STATUS_LABEL: Record<RemanejamentoStatus, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  CANCELLED: 'Cancelado',
};

export const REMANEJAMENTO_MOTIVO_LABEL: Record<RemanejamentoMotivo, string> = {
  TRAINING_PENDING: 'Treinamento pendente',
  UNCOVERED_ABSENCE: 'Cobertura de ausência',
  HEALTH_ISSUE: 'Questão de saúde',
  DISCIPLINARY: 'Disciplinar',
  OTHER: 'Outro motivo',
};
