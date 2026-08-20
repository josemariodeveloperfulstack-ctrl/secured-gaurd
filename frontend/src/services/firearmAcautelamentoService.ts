import api from '@/lib/axios';

export interface FirearmAcautelamento {
  id?: number;
  companyName?: string;

  // 1. Dados do Vigilante
  vigilanteName: string;
  registration?: string;
  cnvNumber?: string;
  cpf?: string;
  workPostName?: string;
  recyclingExpirationDate?: string; // YYYY-MM-DD

  // 2. Especificação do Armamento
  weaponType: string; // Revólver, Pistola, Espingarda, Outra
  brand?: string;
  caliber?: string;
  shotCapacity?: number;
  serialNumber: string;
  crafNumber?: string;
  ammoQuantity?: number;
  ammoType?: string;
  ammoLot?: string;
  accessories?: string;

  // 3. Inspeção Visual e Funcional
  mecanismoDisparoOk: boolean;
  canoDesobstruidoOk: boolean;
  conservationState: string; // Excelente, Bom, Regular

  // Status e Dados do Termo
  status?: string;
  cityUf?: string;
  termDate: string; // YYYY-MM-DD
  observations?: string;

  // Assinaturas e Foto
  photoBase64?: string;
  vigilanteSignatureBase64?: string;
  armeiroName?: string;
  armeiroSignatureBase64?: string;

  // Vínculos
  employeeId?: number;
  equipmentId?: number;
  workPostId?: number;

  createdAt?: string;
  updatedAt?: string;
}

export interface FirearmAcautelamentoFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  search?: string;
}

export const firearmAcautelamentoService = {
  async getAll(filters?: FirearmAcautelamentoFilters): Promise<FirearmAcautelamento[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get<FirearmAcautelamento[]>(`/api/firearm-acautelamentos?${params.toString()}`);
    return response.data;
  },

  async getById(id: number): Promise<FirearmAcautelamento> {
    const response = await api.get<FirearmAcautelamento>(`/api/firearm-acautelamentos/${id}`);
    return response.data;
  },

  async create(data: FirearmAcautelamento): Promise<FirearmAcautelamento> {
    const response = await api.post<FirearmAcautelamento>('/api/firearm-acautelamentos', data);
    return response.data;
  },

  async update(id: number, data: FirearmAcautelamento): Promise<FirearmAcautelamento> {
    const response = await api.put<FirearmAcautelamento>(`/api/firearm-acautelamentos/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/firearm-acautelamentos/${id}`);
  },

  async downloadPdf(id: number): Promise<Blob> {
    const response = await api.get(`/api/firearm-acautelamentos/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
