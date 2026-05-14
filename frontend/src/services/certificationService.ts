import api from '@/lib/axios';
import {
  Certification,
  CertificationStats,
  CertificationStatus,
  CertificationType,
} from '../types/certification';

/**
 * Payload bruto retornado pelo endpoint `GET /api/employee-certifications`.
 * Mapeia 1:1 com {@code EmployeeCertificationResponse} do backend.
 */
interface EmployeeCertificationApi {
  id: string;
  employeeId: string | null;
  employeeName: string | null;
  employeeDocument: string | null;
  employeePosition: string | null;
  employeeDepartment: string | null;
  trainingId: string | null;
  trainingName: string | null;
  renewalPeriodMonths: number | null;
  workPostId: string | null;
  workPostName: string | null;
  certificationNumber: string | null;
  issueDate: string | null;
  expirationDate: string | null;
  status: CertificationStatus | null;
  documentUrl: string | null;
}

/**
 * Payload bruto de `GET /api/employee-certifications/stats`.
 * Mapeia 1:1 com {@code CertificationStatsResponse} do backend.
 */
interface CertificationStatsApi {
  total: number;
  active: number;
  expired: number;
  pending: number;
  cancelled: number;
  expiringSoon: number;
  totalCost: number;
  byType: Record<string, number>;
  byOrganization: Record<string, number>;
}

const EMPTY_STATS: CertificationStats = {
  total: 0,
  active: 0,
  expired: 0,
  pending: 0,
  cancelled: 0,
  expiringSoon: 0,
  totalCost: 0,
  byType: { SAFETY: 0, TECHNICAL: 0, MANAGEMENT: 0, COMPLIANCE: 0, OTHER: 0 },
  byOrganization: {},
};

function toCertificationType(byTypeKey: string | undefined | null): CertificationType {
  const allowed: CertificationType[] = ['SAFETY', 'TECHNICAL', 'MANAGEMENT', 'COMPLIANCE', 'OTHER'];
  if (byTypeKey && (allowed as string[]).includes(byTypeKey)) {
    return byTypeKey as CertificationType;
  }
  return 'OTHER';
}

function mapApiToCertification(cert: EmployeeCertificationApi): Certification {
  return {
    id: cert.id as unknown as number, // o frontend ainda declara number, mas o backend usa UUID (string)
    name: cert.trainingName ?? 'Treinamento',
    description: cert.employeePosition ?? '',
    type: 'TECHNICAL', // não há tipo na entidade do backend; default seguro
    status: cert.status ?? 'ACTIVE',
    employeeId: cert.employeeId as unknown as number,
    employeeName: cert.employeeName ?? '—',
    employeeCpf: cert.employeeDocument ?? '',
    issuingOrganization: cert.workPostName ?? cert.employeeDepartment ?? '—',
    certificateNumber: cert.certificationNumber ?? '',
    issueDate: cert.issueDate ?? '',
    expiryDate: cert.expirationDate ?? '',
    renewalDate: undefined,
    cost: 0,
    location: cert.employeeDepartment ?? cert.workPostName ?? '',
    notes: '',
    attachments: cert.documentUrl ? [cert.documentUrl] : [],
    createdBy: '',
    createdAt: '',
    updatedAt: '',
  };
}

function mapApiToStats(api: CertificationStatsApi | null | undefined): CertificationStats {
  if (!api) return EMPTY_STATS;
  const safeByType: CertificationStats['byType'] = {
    SAFETY: 0,
    TECHNICAL: 0,
    MANAGEMENT: 0,
    COMPLIANCE: 0,
    OTHER: 0,
  };
  if (api.byType && typeof api.byType === 'object') {
    Object.entries(api.byType).forEach(([k, v]) => {
      const key = toCertificationType(k);
      safeByType[key] = (safeByType[key] ?? 0) + (typeof v === 'number' ? v : 0);
    });
  }

  return {
    total: api.total ?? 0,
    active: api.active ?? 0,
    expired: api.expired ?? 0,
    pending: api.pending ?? 0,
    cancelled: api.cancelled ?? 0,
    expiringSoon: api.expiringSoon ?? 0,
    totalCost: api.totalCost ?? 0,
    byType: safeByType,
    byOrganization: api.byOrganization ?? {},
  };
}

class CertificationService {
  /**
   * Lista certificações (visão global de RH/DP/Admin). Aplica filtros opcionais.
   * Os erros são propagados ao chamador — sem fallback de mock.
   */
  async getCertifications(filters?: {
    status?: CertificationStatus;
    employeeId?: string;
  }): Promise<Certification[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);

    const query = params.toString();
    const url = query ? `/employee-certifications?${query}` : '/employee-certifications';
    const response = await api.get<EmployeeCertificationApi[]>(url);
    return (response.data ?? []).map(mapApiToCertification);
  }

  /**
   * Lista somente as certificações do funcionário autenticado (Área do Funcionário).
   * Resolução do Employee é feita no backend a partir do JWT.
   */
  async getMyCertifications(): Promise<Certification[]> {
    const response = await api.get<EmployeeCertificationApi[]>('/employee-certifications/me');
    return (response.data ?? []).map(mapApiToCertification);
  }

  /** Estatísticas globais — apenas RH/DP/Admin. */
  async getCertificationStats(): Promise<CertificationStats> {
    const response = await api.get<CertificationStatsApi>('/employee-certifications/stats');
    return mapApiToStats(response.data);
  }

  /** Estatísticas restritas ao funcionário autenticado. */
  async getMyCertificationStats(): Promise<CertificationStats> {
    const response = await api.get<CertificationStatsApi>('/employee-certifications/me/stats');
    return mapApiToStats(response.data);
  }

  async getCertification(id: string): Promise<Certification | null> {
    const response = await api.get<EmployeeCertificationApi>(`/employee-certifications/${id}`);
    return response.data ? mapApiToCertification(response.data) : null;
  }

  async createCertification(payload: unknown): Promise<Certification> {
    const response = await api.post<EmployeeCertificationApi>('/employee-certifications', payload);
    return mapApiToCertification(response.data);
  }

  async updateCertification(id: string, payload: unknown): Promise<Certification> {
    const response = await api.put<EmployeeCertificationApi>(`/employee-certifications/${id}`, payload);
    return mapApiToCertification(response.data);
  }

  async deleteCertification(id: string): Promise<void> {
    await api.delete(`/employee-certifications/${id}`);
  }

  async renewCertification(id: string, expirationDate: string): Promise<Certification> {
    const response = await api.put<EmployeeCertificationApi>(
      `/employee-certifications/${id}/renew`,
      null,
      { params: { expirationDate } }
    );
    return mapApiToCertification(response.data);
  }

  async cancelCertification(id: string): Promise<void> {
    await api.delete(`/employee-certifications/${id}`);
  }

  async getCertificationsByEmployee(employeeId: string): Promise<Certification[]> {
    return this.getCertifications({ employeeId });
  }

  async getExpiringCertifications(days = 30): Promise<Certification[]> {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const isoDate = date.toISOString().split('T')[0];
    const response = await api.get<EmployeeCertificationApi[]>(
      `/employee-certifications?expiringBefore=${isoDate}`
    );
    return (response.data ?? []).map(mapApiToCertification);
  }
}

export default new CertificationService();
