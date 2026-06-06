import api from '@/lib/axios';
import type { EmployeeIdentification } from '@/services/employeeQrCodeService';

export type PostAllocationType =
  | 'EFETIVO'
  | 'REMANEJADO'
  | 'COBERTURA_FERIAS'
  | 'NAO_ALOCADO';

export interface PostAllocation {
  type: PostAllocationType;
  typeDescription: string;
  message: string;
  effectiveWorkPostName?: string;
  coveredEmployeeName?: string;
  coverageStartDate?: string;
  coverageEndDate?: string;
}

export interface SupervisorVisitResult {
  visitId?: string;
  workPostId: string;
  workPostName: string;
  workPostCode?: string;
  workPostAddress?: string;
  clientName?: string;
  employee?: EmployeeIdentification;
  allocation?: PostAllocation;
  latitude?: number;
  longitude?: number;
  locationAddress?: string;
  qrCodeVerified?: boolean;
  visitDate?: string;
  visitTime?: string;
  createdAt?: string;
}

export interface SupervisorVisitReportRow {
  id: string;
  visitDate: string;
  visitTime?: string;
  supervisorName?: string;
  employeeName?: string;
  workPostName?: string;
  clientName?: string;
  allocationType?: PostAllocationType;
  allocationDescription?: string;
  latitude?: number;
  longitude?: number;
  locationAddress?: string;
  qrCodeVerified?: boolean;
  /** Quando true, a visita coincide com a escala de visita → destacar em azul. */
  visitedAsScheduled?: boolean;
  matchedScheduleId?: string;
}

export interface EmployeePresenceHistoryRow {
  visitId: string;
  visitDate: string;
  visitTime?: string;
  supervisorName?: string;
  workPostName?: string;
  clientName?: string;
  allocationType?: PostAllocationType;
  allocationDescription?: string;
  latitude?: number;
  longitude?: number;
  locationAddress?: string;
  qrCodeVerified?: boolean;
  createdAt?: string;
}

export interface CheckinPayload {
  /** Conteúdo lido do QR Code do posto. */
  qrCode?: string;
  /** Alternativa: posto selecionado manualmente. */
  workPostId?: string;
  /** QR do crachá, CPF ou matrícula. */
  employeeValue: string;
  latitude?: number;
  longitude?: number;
  locationAddress?: string;
  description?: string;
  observations?: string;
  supervisorId?: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
}

export const ALLOCATION_LABEL: Record<PostAllocationType, string> = {
  EFETIVO: 'Efetivo do posto',
  REMANEJADO: 'Remanejado',
  COBERTURA_FERIAS: 'Cobertura de férias',
  NAO_ALOCADO: 'Sem alocação',
};

/** Cores (tailwind) por tipo de vínculo, usadas nos badges. */
export const ALLOCATION_BADGE_CLASS: Record<PostAllocationType, string> = {
  EFETIVO: 'bg-emerald-600 text-white',
  REMANEJADO: 'bg-amber-500 text-white',
  COBERTURA_FERIAS: 'bg-violet-600 text-white',
  NAO_ALOCADO: 'bg-slate-500 text-white',
};

export const supervisorVisitService = {
  /** Confirma posto + funcionário + vínculo sem gravar. */
  async preview(payload: CheckinPayload): Promise<SupervisorVisitResult> {
    const { data } = await api.post<ApiEnvelope<SupervisorVisitResult>>(
      '/api/supervisor-visits/preview',
      payload,
    );
    if (!data.success || !data.data) {
      throw new Error(data.error || 'Não foi possível confirmar a visita.');
    }
    return data.data;
  },

  /** Grava o check-in com geolocalização e endereço. */
  async checkin(payload: CheckinPayload): Promise<SupervisorVisitResult> {
    const { data } = await api.post<ApiEnvelope<SupervisorVisitResult>>(
      '/api/supervisor-visits/checkin',
      payload,
    );
    if (!data.success || !data.data) {
      throw new Error(data.error || 'Não foi possível registrar o check-in.');
    }
    return data.data;
  },

  /** Relatório de visitas (Gestão Operacional). */
  async report(params: {
    startDate?: string;
    endDate?: string;
    supervisorId?: string;
    workPostId?: string;
  } = {}): Promise<SupervisorVisitReportRow[]> {
    const query = new URLSearchParams();
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.supervisorId) query.append('supervisorId', params.supervisorId);
    if (params.workPostId) query.append('workPostId', params.workPostId);
    const { data } = await api.get<ApiEnvelope<SupervisorVisitReportRow[]>>(
      `/api/supervisor-visits/report?${query.toString()}`,
    );
    return data.data ?? [];
  },

  /** Histórico de confirmações de presença do funcionário (visitas do supervisor). */
  async employeeHistory(employeeId: string): Promise<EmployeePresenceHistoryRow[]> {
    const { data } = await api.get<ApiEnvelope<EmployeePresenceHistoryRow[]>>(
      `/api/supervisor-visits/employee/${employeeId}/history`,
    );
    return data.data ?? [];
  },

  /** Geolocalização atual do navegador. */
  async getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada neste dispositivo.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => reject(new Error(err.message)),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
      );
    });
  },

  /**
   * Reverse geocoding via OpenStreetMap (Nominatim) — retorna o nome do endereço.
   * Falha silenciosamente (retorna undefined) para não bloquear o check-in.
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string | undefined> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
        { headers: { Accept: 'application/json' } },
      );
      if (!res.ok) return undefined;
      const json = await res.json();
      return json?.display_name as string | undefined;
    } catch {
      return undefined;
    }
  },
};

export default supervisorVisitService;
