import api from '@/lib/axios';

export interface Training {
  id: string;
  name: string;
  description?: string;
  provider?: string;
  duration?: number;
  renewalPeriodMonths?: number;
  mandatoryForGuards?: boolean;
}

export interface Position {
  id: string;
  name: string;
  description?: string;
  baseSalary?: number;
  unitId?: string;
}

export interface Unit {
  id: string;
  name: string;
  code: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  active: boolean;
}

export interface EmployeeCertification {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeDocument?: string;
  trainingId: string;
  trainingName?: string;
  renewalPeriodMonths?: number;
  certificationNumber: string;
  issueDate: string;
  expirationDate?: string;
  status: 'ACTIVE' | 'RENEWED' | 'CANCELLED';
  documentUrl?: string;
}

class TrainingService {
  async getTrainings(params?: { name?: string; provider?: string }): Promise<Training[]> {
    const response = await api.get('/trainings', { params });
    return response.data;
  }

  async getPositions(): Promise<Position[]> {
    const response = await api.get('/positions');
    return response.data;
  }

  async getUnits(): Promise<Unit[]> {
    const response = await api.get('/units/active');
    return response.data;
  }

  async getEmployeeCertifications(params?: { employeeId?: string; trainingId?: string; status?: string; expiringBefore?: string; }): Promise<EmployeeCertification[]> {
    const response = await api.get('/employee-certifications', { params });
    return response.data;
  }

  async createTraining(training: Omit<Training, 'id'>): Promise<Training> {
    const response = await api.post('/trainings', training);
    return response.data;
  }

  async createEmployeeCertification(payload: {
    employeeId: string;
    trainingId: string;
    certificationNumber: string;
    issueDate: string; // ISO date
    expirationDate?: string; // ISO date
    documentUrl?: string;
  }): Promise<EmployeeCertification> {
    const response = await api.post('/employee-certifications', {
      employee: { id: payload.employeeId },
      training: { id: payload.trainingId },
      certificationNumber: payload.certificationNumber,
      issueDate: payload.issueDate,
      expirationDate: payload.expirationDate || null,
      documentUrl: payload.documentUrl ?? 'N/A'
    });
    return response.data;
  }

  async renewEmployeeCertification(id: string, expirationDate: string): Promise<EmployeeCertification> {
    const response = await api.put(`/employee-certifications/${id}/renew`, undefined, {
      params: { expirationDate }
    });
    return response.data;
  }
}

export const trainingService = new TrainingService();