import api from '@/lib/axios';

export interface RadioChecklist {
  id?: number;
  documentCode?: string;
  documentVersion?: string;
  documentDate?: string;
  movementType: 'RETIRADA' | 'DEVOLUCAO';

  // Dados da Retirada/Entrega
  checklistDate: string; // YYYY-MM-DD
  checklistTime?: string; // HH:mm:ss ou HH:mm
  vigilanteName: string;
  vigilanteRegistration?: string;
  workPostName?: string;
  radioAssetId?: string;
  radioSerialNumber?: string;

  // 1. Inspeção Física e Estrutural
  carcacaExterna: boolean;
  antena: boolean;
  clipCinto: boolean;
  conectorAcessorios: boolean;

  // 2. Alimentação e Bateria
  encaixeBateria: boolean;
  nivelCarga: boolean;
  contatosCarga: boolean;

  // 3. Teste de Funcionamento Operacional
  botaoVolume: boolean;
  seletorCanais: boolean;
  botaoPtt: boolean;
  testeComunicacaoPratica: boolean;

  // 4. Acessórios Adicionais
  foneOuvidoLapela: boolean;
  carregadorMesaFonte: boolean;

  // Declaração de Conformidade & Status
  conformityStatus?: string;
  observations?: string;

  // Assinaturas
  vigilanteSignatureBase64?: string;
  almoxarifeName?: string;
  almoxarifeSignatureBase64?: string;

  // Vínculos
  employeeId?: number;
  workPostId?: number;

  createdAt?: string;
  updatedAt?: string;
}

export interface RadioChecklistFilters {
  startDate?: string;
  endDate?: string;
  type?: 'RETIRADA' | 'DEVOLUCAO';
  workPost?: string;
  vigilante?: string;
}

export const radioChecklistService = {
  async getAll(filters?: RadioChecklistFilters): Promise<RadioChecklist[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.workPost) params.append('workPost', filters.workPost);
    if (filters?.vigilante) params.append('vigilante', filters.vigilante);

    const response = await api.get<RadioChecklist[]>(`/api/radio-checklists?${params.toString()}`);
    return response.data;
  },

  async getById(id: number): Promise<RadioChecklist> {
    const response = await api.get<RadioChecklist>(`/api/radio-checklists/${id}`);
    return response.data;
  },

  async create(data: RadioChecklist): Promise<RadioChecklist> {
    const response = await api.post<RadioChecklist>('/api/radio-checklists', data);
    return response.data;
  },

  async update(id: number, data: RadioChecklist): Promise<RadioChecklist> {
    const response = await api.put<RadioChecklist>(`/api/radio-checklists/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/radio-checklists/${id}`);
  },

  async downloadPdf(id: number): Promise<Blob> {
    const response = await api.get(`/api/radio-checklists/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
