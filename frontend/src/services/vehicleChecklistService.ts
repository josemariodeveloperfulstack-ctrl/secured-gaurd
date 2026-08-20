import api from '@/lib/axios';

export interface VehicleChecklist {
  id?: number;
  plate: string;
  model?: string;
  currentKm?: number;
  checklistDate: string; // YYYY-MM-DD
  checklistTime?: string; // HH:mm
  shift: 'DIA' | 'NOITE';
  supervisorName?: string;
  employeeName?: string;
  employeeRegistration?: string;

  // 1. Inspeção Externa e Lataria (Visual)
  dianteira: boolean;
  laterais: boolean;
  vidrosRetrovisores: boolean;
  identificacaoVisual: boolean;

  // 2. Iluminação e Sinalização Sonora (Segurança)
  faroisLanternas: boolean;
  giroflexSirene: boolean;
  buzina: boolean;

  // 3. Mecânica Básica e Fluídos
  pneus: boolean;
  niveis: boolean;
  painel: boolean;

  // 4. Kit de Bordo e Equipamentos Operacionais
  documentacao: boolean;
  ferramentasEmergencia: boolean;
  extintorIncendio: boolean;
  kitPrancheta: boolean;

  // Status, Observações e Assinatura
  conformityStatus?: string;
  observations?: string;
  signatureBase64?: string;

  // Vínculos
  employeeId?: number;
  vehicleId?: number;

  createdAt?: string;
  updatedAt?: string;
}

export interface VehicleChecklistFilters {
  startDate?: string;
  endDate?: string;
  shift?: 'DIA' | 'NOITE';
  search?: string;
}

export const vehicleChecklistService = {
  async getAll(filters?: VehicleChecklistFilters): Promise<VehicleChecklist[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.shift) params.append('shift', filters.shift);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get<VehicleChecklist[]>(`/api/vehicle-checklists?${params.toString()}`);
    return response.data;
  },

  async getById(id: number): Promise<VehicleChecklist> {
    const response = await api.get<VehicleChecklist>(`/api/vehicle-checklists/${id}`);
    return response.data;
  },

  async create(data: VehicleChecklist): Promise<VehicleChecklist> {
    const response = await api.post<VehicleChecklist>('/api/vehicle-checklists', data);
    return response.data;
  },

  async update(id: number, data: VehicleChecklist): Promise<VehicleChecklist> {
    const response = await api.put<VehicleChecklist>(`/api/vehicle-checklists/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/vehicle-checklists/${id}`);
  },

  async downloadPdf(id: number): Promise<Blob> {
    const response = await api.get(`/api/vehicle-checklists/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
