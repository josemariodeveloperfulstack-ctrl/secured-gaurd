import api from '@/lib/axios';

export type RemanejamentoTipo = 
  | 'TRANSFERENCIA_UNIDADE' 
  | 'TRANSFERENCIA_POSTO_TRABALHO'
  | 'TROCA_FUNCAO' 
  | 'PROMOCAO' 
  | 'COBRIR_FERIAS'
  | 'COBRIR_FALTA'
  | 'PLANTAO'
  | 'OUTROS';

export interface Remanejamento {
  id: string;
  employeeId: string;
  employeeName?: string;
  tipo: RemanejamentoTipo;
  origem: string;
  destino: string;
  dataRemanejamento: string;
  observacao?: string;
  remanejamentoDate?: string; // Compatibilidade com RH
  notes?: string; // Compatibilidade com RH
  status?: string; // Compatibilidade com RH
  originWorkstationId?: string;
  destinationWorkstationId?: string;
}

export interface CreateRemanejamentoDTO {
  employeeId: string;
  tipo: RemanejamentoTipo;
  origem: string;
  destino: string;
  dataRemanejamento: string;
  observacao?: string;
}

class RemanejamentoService {
  async getAllRemanejamentos(): Promise<Remanejamento[]> {
    const response = await api.get('/api/remanejamentos');
    return response.data;
  }

  // Alias para compatibilidade
  async getRemanejamentosTyped(): Promise<Remanejamento[]> {
    return this.getAllRemanejamentos();
  }

  async getRemanejamentoById(id: string): Promise<Remanejamento> {
    const response = await api.get(`/api/remanejamentos/${id}`);
    return response.data;
  }

  async getRemanejamentosByEmployee(employeeId: string): Promise<Remanejamento[]> {
    const response = await api.get(`/api/remanejamentos/employee/${employeeId}`);
    return response.data;
  }

  async createRemanejamento(data: CreateRemanejamentoDTO): Promise<Remanejamento> {
    const response = await api.post('/api/remanejamentos', data);
    return response.data;
  }

  async updateRemanejamento(id: string, data: Partial<CreateRemanejamentoDTO>): Promise<Remanejamento> {
    const response = await api.put(`/api/remanejamentos/${id}`, data);
    return response.data;
  }

  async deleteRemanejamento(id: string): Promise<void> {
    await api.delete(`/api/remanejamentos/${id}`);
  }
}

const remanejamentoServiceInstance = new RemanejamentoService();

// Exportar instância e também funções individuais para compatibilidade
export const remanejamentoService = remanejamentoServiceInstance;

// Exportar função diretamente para compatibilidade com import *
export const getRemanejamentosTyped = () => remanejamentoServiceInstance.getRemanejamentosTyped();
