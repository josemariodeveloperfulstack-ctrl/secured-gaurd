import api from '@/lib/axios';

export interface PayrollClosure {
  id: string;
  employee: any;
  referenceMonth: number;
  referenceYear: number;
  totalHoursWorked: number;
  regularHours: number;
  overtime50: number;
  overtime100: number;
  nightShiftHours: number;
  totalDelaysMinutes: number;
  totalAbsencesDays: number;
  workedDays: number;
  expectedDays: number;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'CLOSED' | 'APPROVED' | 'PROCESSED';
  closedAt?: string;
  observations?: string;
}

export const payrollClosureService = {
  async generateClosure(employeeId: string, month: number, year: number, closedById: string) {
    const response = await api.post('/payroll-closures/generate', {
      employeeId,
      month,
      year,
      closedById
    });
    return response.data;
  },

  async generateBatchClosures(month: number, year: number, closedById: string) {
    const response = await api.post('/payroll-closures/generate-batch', {
      month,
      year,
      closedById
    });
    return response.data;
  },

  async getClosuresByEmployee(employeeId: string, page = 0, size = 12) {
    const response = await api.get(`/payroll-closures/employee/${employeeId}`, {
      params: { page, size }
    });
    return response.data;
  },

  async getClosuresByPeriod(month: number, year: number) {
    const response = await api.get('/payroll-closures/period', {
      params: { month, year }
    });
    return response.data;
  },

  async closeClosure(closureId: string, closedById: string) {
    const response = await api.put(`/payroll-closures/${closureId}/close`, { closedById });
    return response.data;
  }
};

export default payrollClosureService;

