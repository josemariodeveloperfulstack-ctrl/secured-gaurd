import api from '@/lib/axios';

export type EmploymentAdmissionType = 'READMISSAO' | 'PROMOCAO';

export interface EmployeeEmploymentPeriod {
  id: string;
  employeeId: string;
  companyId?: string;
  companyName?: string;
  unitId?: string;
  unitName?: string;
  positionId?: string;
  positionName?: string;
  departmentId?: string;
  departmentName?: string;
  workPostId?: string;
  workPostName?: string;
  hireDate?: string;
  terminationDate?: string;
  terminationReason?: string;
  admissionType?: string;
  admissionTypeLabel?: string;
  status?: string;
  salario?: number;
  registrationNumber?: string;
  notes?: string;
  createdAt?: string;
}

export interface EligibleRehireEmployee {
  id: string;
  name: string;
  cpf?: string;
  status?: string;
  company?: { id: string; name?: string };
  hireDate?: string;
  dataRescisao?: string;
  terminationDate?: string;
  terminationReason?: string;
  position?: { id: string; name?: string };
}

export const employeeEmploymentPeriodService = {
  async findEligibleForRehire(cpf: string): Promise<EligibleRehireEmployee | null> {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return null;
    try {
      const response = await api.get(`/api/employees/eligible-for-rehire/cpf/${digits}`);
      return response.data;
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) return null;
      throw error;
    }
  },

  async getEmploymentPeriods(employeeId: string): Promise<EmployeeEmploymentPeriod[]> {
    const response = await api.get(`/api/employees/${employeeId}/employment-periods`);
    return response.data ?? [];
  },

  async cancelDismissal(
    employeeId: string,
    justification: string,
    periodId?: string,
  ): Promise<unknown> {
    const response = await api.post(`/api/employees/${employeeId}/cancel-dismissal`, {
      justification,
      periodId: periodId || undefined,
    });
    return response.data;
  },
};

export const ADMISSION_TYPE_LABELS: Record<EmploymentAdmissionType, string> = {
  READMISSAO: 'Readmissão',
  PROMOCAO: 'Promoção',
};
