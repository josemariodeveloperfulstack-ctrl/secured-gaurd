import api from '@/lib/axios';

/**
 * DTO retornado pelo backend ao identificar um funcionário por QR/CPF/Matrícula.
 * Espelha {@code EmployeeIdentificationDTO} (Java).
 */
export interface EmployeeIdentification {
  id: string;
  name: string;
  cpf?: string;
  registrationNumber?: string;
  email?: string;
  phone?: string;
  positionName?: string;
  departmentName?: string;
  workPostName?: string;
  workPostId?: string;
  unitName?: string;
  companySigla?: string;
  hireDate?: string;
  status?: string;
  hasPendingTraining?: boolean;
  /** Como o backend encontrou: 'QR_TOKEN' | 'CPF' | 'MATRICULA'. */
  matchedBy?: 'QR_TOKEN' | 'CPF' | 'MATRICULA';
}

export interface QrCodeResponse {
  /** Token opaco — usado pelo supervisor ao identificar. */
  token: string;
  employee: EmployeeIdentification;
  /** Presente apenas em /regenerate. */
  warning?: string;
}

export interface IdentifyResponse {
  success: boolean;
  employee?: EmployeeIdentification;
  error?: string;
}

/**
 * Service do QR Code do funcionário.
 *
 * Convenções:
 *  - {@code ensure} é idempotente — pode ser chamado várias vezes.
 *  - {@code regenerate} INVALIDA o crachá anterior. Operação destrutiva — confirmar com usuário.
 *  - {@code getImageUrl} retorna URL direta para o {@code <img>}, sem fetch manual.
 *  - {@code identify} é o endpoint usado pela tela do Supervisor durante a visita.
 */
export const employeeQrCodeService = {
  /** Gera (ou retorna) o token do QR Code do funcionário. */
  async ensure(employeeId: string): Promise<QrCodeResponse> {
    const { data } = await api.post<QrCodeResponse>(`/api/employees/${employeeId}/qr-code`);
    return data;
  },

  /** Obtém apenas os dados do crachá (não gera token). */
  async get(employeeId: string): Promise<{ employee: EmployeeIdentification }> {
    const { data } = await api.get<{ employee: EmployeeIdentification }>(
      `/api/employees/${employeeId}/qr-code`,
    );
    return data;
  },

  /** Invalida o token atual e gera um novo. Usar quando crachá foi perdido. */
  async regenerate(employeeId: string): Promise<QrCodeResponse> {
    const { data } = await api.post<QrCodeResponse>(
      `/api/employees/${employeeId}/qr-code/regenerate`,
    );
    return data;
  },

  /**
   * URL absoluta da imagem PNG do QR Code (para usar em {@code <img src={...}/>}).
   * Inclui um sufixo de invalidação de cache opcional.
   */
  getImageUrl(employeeId: string, cacheBust?: string | number): string {
    const base = (api.defaults.baseURL ?? '').replace(/\/$/, '');
    const url = `${base}/api/employees/${employeeId}/qr-code/image`;
    if (cacheBust === undefined) return url;
    return `${url}?v=${encodeURIComponent(String(cacheBust))}`;
  },

  /**
   * Identifica um funcionário a partir do valor lido (QR Code, CPF ou matrícula).
   * Aceita JSON do QR ({@code {"t":"…"}}), token solto, CPF formatado ou matrícula.
   */
  async identify(value: string): Promise<IdentifyResponse> {
    try {
      const { data } = await api.post<IdentifyResponse>('/api/supervisor/identify-employee', {
        value,
      });
      return data;
    } catch (err: any) {
      const status = err?.response?.status;
      const errorMessage =
        err?.response?.data?.error ??
        (status === 404
          ? 'Funcionário não encontrado. Verifique o QR Code, CPF ou matrícula.'
          : 'Não foi possível identificar o funcionário.');
      return { success: false, error: errorMessage };
    }
  },
};

export default employeeQrCodeService;
