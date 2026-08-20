import api from '@/lib/axios';

export interface EquipmentCautela {
  id?: number;
  companyName?: string;

  // 1. Dados do Colaborador
  employeeName: string;
  registration?: string;
  cpf?: string;
  jobTitle?: string;
  workPostName?: string;

  // 2. Especificação dos Materiais / Equipamentos
  item1HtEntregue?: boolean;
  item1HtMarcaModelo?: string;

  item2CarregadorEntregue?: boolean;
  item2CarregadorMarcaModelo?: string;

  item3LanternaEntregue?: boolean;
  item3LanternaMarcaModelo?: string;

  item4BastaoEntregue?: boolean;
  item4BastaoMarcaModelo?: string;

  item5OutrosDescricao?: string;
  item5OutrosMarcaModelo?: string;

  // Metadados
  status?: string;
  cityUf?: string;
  termDate: string; // YYYY-MM-DD
  observations?: string;

  // Assinaturas
  employeeSignatureBase64?: string;
  almoxarifeName?: string;
  almoxarifeSignatureBase64?: string;

  // Vínculos
  employeeId?: number;
  workPostId?: number;

  createdAt?: string;
  updatedAt?: string;
}

export interface EquipmentCautelaFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  search?: string;
}

export const equipmentCautelaService = {
  async getAll(filters?: EquipmentCautelaFilters): Promise<EquipmentCautela[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get<EquipmentCautela[]>(`/api/equipment-cautelas?${params.toString()}`);
    return response.data;
  },

  async getById(id: number): Promise<EquipmentCautela> {
    const response = await api.get<EquipmentCautela>(`/api/equipment-cautelas/${id}`);
    return response.data;
  },

  async create(data: EquipmentCautela): Promise<EquipmentCautela> {
    const response = await api.post<EquipmentCautela>('/api/equipment-cautelas', data);
    return response.data;
  },

  async update(id: number, data: EquipmentCautela): Promise<EquipmentCautela> {
    const response = await api.put<EquipmentCautela>(`/api/equipment-cautelas/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/equipment-cautelas/${id}`);
  },

  async downloadPdf(id: number): Promise<Blob> {
    const response = await api.get(`/api/equipment-cautelas/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
