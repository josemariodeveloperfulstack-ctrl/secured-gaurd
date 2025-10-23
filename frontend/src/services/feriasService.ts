import api from '../lib/axios';
import { 
  FeriasPeriodo, 
  Afastamento, 
  CreateFeriasRequest, 
  UpdateFeriasRequest, 
  CreateAfastamentoRequest, 
  UpdateAfastamentoRequest,
  FeriasFilters,
  AfastamentoFilters
} from '../types/ferias';

export const feriasService = {
  // Férias
  async getFerias(filters: FeriasFilters = {}): Promise<FeriasPeriodo[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    const response = await api.get(`/api/vacations?${params.toString()}`);
    // Converter dados do backend para o formato esperado pelo frontend
    return response.data.map((vacation: any) => ({
      id: vacation.id,
      employeeId: vacation.employeeId,
      employeeName: vacation.employeeName || 'Funcionário não encontrado',
      periodoAquisitivo: `${new Date(vacation.startDate).getFullYear()}/${new Date(vacation.startDate).getFullYear() + 1}`,
      dataInicio: vacation.startDate,
      dataFim: vacation.endDate,
      status: vacation.status === 'PENDING' ? 'PENDENTE' : 
              vacation.status === 'APPROVED' ? 'APROVADO' : 
              vacation.status === 'REJECTED' ? 'CANCELADO' : 'PENDENTE',
      tipo: 'FERIAS_NORMAIS', // Valor padrão, pode ser ajustado conforme necessário
      observacoes: '',
      createdAt: vacation.createdAt
    }));
  },

  async getFeriasById(id: string): Promise<FeriasPeriodo> {
    const response = await api.get(`/api/vacations/${id}`);
    return response.data;
  },

  async getFeriasByEmployee(employeeId: string): Promise<FeriasPeriodo[]> {
    const response = await api.get(`/api/vacations/employee/${employeeId}`);
    return response.data;
  },

  async createFerias(data: CreateFeriasRequest): Promise<FeriasPeriodo> {
    // Converter dados do frontend para o formato esperado pelo backend
    const startDate = new Date(data.dataInicio).toISOString().split('T')[0];
    const endDate = new Date(data.dataFim).toISOString().split('T')[0];
    
    const backendData = {
      employeeId: data.employeeId,
      startDate: startDate,
      endDate: endDate,
      daysTaken: Math.ceil((new Date(data.dataFim).getTime() - new Date(data.dataInicio).getTime()) / (1000 * 60 * 60 * 24)) + 1,
      remainingDays: 30, // Valor padrão - será recalculado pelo backend
      status: 'PENDING'
    };
    const response = await api.post('/api/vacations', backendData);
    return response.data;
  },

  async updateFerias(id: string, data: UpdateFeriasRequest): Promise<FeriasPeriodo> {
    const response = await api.put(`/api/vacations/${id}`, data);
    return response.data;
  },

  async deleteFerias(id: string): Promise<void> {
    await api.delete(`/api/vacations/${id}`);
  },

  async approveFerias(id: string, observacoes?: string): Promise<FeriasPeriodo> {
    const response = await api.put(`/api/vacations/${id}/approve`, { observacoes });
    return response.data;
  },

  async rejectFerias(id: string, motivo: string): Promise<FeriasPeriodo> {
    const response = await api.put(`/api/vacations/${id}/reject`, { motivo });
    return response.data;
  },

  // Afastamentos
  async getAfastamentos(filters: AfastamentoFilters = {}): Promise<Afastamento[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    const response = await api.get(`/api/absences?${params.toString()}`);
    
    // Mapear tipos do backend (inglês) para frontend (português)
    const tipoMapInverso: Record<string, string> = {
      'SICK_LEAVE': 'ATESTADO',
      'MEDICAL_APPOINTMENT': 'ATESTADO',
      'PERSONAL_LEAVE': 'LICENCA_MEDICA',
      'UNAUTHORIZED': 'SUSPENSAO',
      'OTHER': 'OUTROS',
      'WEDDING': 'OUTROS',
      'FAMILY_EMERGENCY': 'OUTROS'
    };
    
    // Converter dados do backend para o formato esperado pelo frontend
    return response.data.map((absence: any) => ({
      id: absence.id,
      employeeId: absence.employeeId,
      employeeName: absence.employeeName || 'Funcionário não encontrado',
      tipo: tipoMapInverso[absence.absenceType] || 'OUTROS',
      dataInicio: absence.absenceDate, // Usar absenceDate em vez de startDate
      dataFim: absence.absenceDate, // Para afastamentos, usar a mesma data
      status: absence.status === 'PENDING' ? 'PENDENTE' :
              absence.status === 'APPROVED' ? 'APROVADO' :
              absence.status === 'REJECTED' ? 'CANCELADO' : 'PENDENTE',
      motivo: absence.reason || '',
      documento: absence.documentUrl || '',
      observacoes: absence.coverageNotes || '',
      createdAt: absence.createdAt
    }));
  },

  async getAfastamentoById(id: string): Promise<Afastamento> {
    const response = await api.get(`/api/absences/${id}`);
    return response.data;
  },

  async getAfastamentosByEmployee(employeeId: string): Promise<Afastamento[]> {
    const response = await api.get(`/api/absences/employee/${employeeId}`);
    return response.data;
  },

  async createAfastamento(data: CreateAfastamentoRequest): Promise<Afastamento> {
    // Mapear tipos do frontend (português) para backend (inglês)
    const tipoMap: Record<string, string> = {
      'ATESTADO': 'SICK_LEAVE',
      'LICENCA_MEDICA': 'SICK_LEAVE',
      'LICENCA_MATERNIDADE': 'PERSONAL_LEAVE',
      'LICENCA_PATERNIDADE': 'PERSONAL_LEAVE',
      'SUSPENSAO': 'UNAUTHORIZED',
      'OUTROS': 'OTHER'
    };

    // Converter dados do frontend para o formato do backend
    const backendData = {
      employeeId: data.employeeId,
      absenceType: tipoMap[data.tipo] || 'OTHER', // Mapear tipo do frontend para absenceType do backend
      absenceDate: data.dataInicio, // Usar dataInicio como absenceDate
      status: 'PENDING', // Status inicial
      reason: data.motivo,
      documentUrl: data.documento || null,
      coverageNotes: data.observacoes || null,
      isJustified: true
    };
    
    const response = await api.post('/api/absences', backendData);
    return response.data;
  },

  async updateAfastamento(id: string, data: UpdateAfastamentoRequest): Promise<Afastamento> {
    const response = await api.put(`/api/absences/${id}`, data);
    return response.data;
  },

  async deleteAfastamento(id: string): Promise<void> {
    await api.delete(`/api/absences/${id}`);
  },

  async approveAfastamento(id: string, observacoes?: string): Promise<Afastamento> {
    const response = await api.put(`/api/absences/${id}/approve`, { observacoes });
    return response.data;
  },

  async rejectAfastamento(id: string, motivo: string): Promise<Afastamento> {
    const response = await api.put(`/api/absences/${id}/reject`, { motivo });
    return response.data;
  },

  // Relatórios e Estatísticas
  async getFeriasStats(): Promise<{
    total: number;
    pendentes: number;
    aprovadas: number;
    rejeitadas: number;
    canceladas: number;
  }> {
    const response = await api.get('/api/reports/ferias/stats/ferias');
    return response.data;
  },

  async getAfastamentosStats(): Promise<{
    total: number;
    pendentes: number;
    aprovados: number;
    rejeitados: number;
    cancelados: number;
  }> {
    const response = await api.get('/api/reports/ferias/stats/afastamentos');
    return response.data;
  },

  async getAllStats(): Promise<{
    ferias: any;
    afastamentos: any;
  }> {
    const response = await api.get('/api/reports/ferias/stats');
    return response.data;
  },

  // Exportação
  async exportFerias(filters: FeriasFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    const response = await api.get(`/api/reports/ferias/ferias/excel?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  async exportAfastamentos(filters: AfastamentoFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    const response = await api.get(`/api/reports/ferias/afastamentos/excel?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  async exportConsolidado(filters: FeriasFilters & AfastamentoFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    const response = await api.get(`/api/reports/ferias/consolidado/excel?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  }
}; 