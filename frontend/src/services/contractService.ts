import api from '@/lib/axios';

export type ContractStatusType = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'PENDING' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';
export type ContractOriginType = 'PROPOSAL' | 'RENEWAL' | 'MANUAL';
export type ContractTypeType = 'VIGILANCIA_PATRIMONIAL' | 'PORTARIA' | 'FACILITIES';
export type AdjustmentTypeType = 'INPC' | 'IPCA' | 'MANUAL';
export type AmendmentTypeType = 'INCLUSAO_POSTO' | 'ALTERACAO_ESCALA' | 'REAJUSTE_EXTRAORDINARIO' | 'REDUCAO_POSTO' | 'MUDANCA_LOCAL';
export type AmendmentStatusType = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ContractAmendment {
  id: string;
  contractId: string;
  type: AmendmentTypeType;
  description?: string;
  effectiveDate?: string;
  financialImpact?: number;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  status: AmendmentStatusType;
  createdAt: string;
  updatedAt: string;
}

export interface ContractAdjustment {
  id: string;
  contractId: string;
  adjustmentType: AdjustmentTypeType;
  previousValue: number;
  newValue: number;
  adjustmentDate: string;
  createdAt: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  description: string;
  startDate: string;
  endDate?: string;
  value: number;
  status: ContractStatusType;
  notes?: string;
  // Dados do cliente vêm como campos separados do backend
  clientId: string;
  clientName: string;
  clientCnpj?: string;
  // Campos PRD
  contractOrigin?: ContractOriginType;
  contractType?: ContractTypeType;
  responsibleCommercialId?: string;
  responsibleCommercialName?: string;
  responsibleManagerId?: string;
  responsibleManagerName?: string;
  proposalId?: string;
  monthlyValue?: number;
  annualValue?: number;
  adjustmentType?: AdjustmentTypeType;
  nextAdjustmentDate?: string;
  autoRenewal?: boolean;
  replacementTimeHours?: number;
  maxAbsenceMinutes?: number;
  patrolFrequency?: string;
  reportsRequired?: string;
  obligationsContractor?: string;
  obligationsContracted?: string;
  penalties?: string;
  terminationReason?: string;
  terminationDate?: string;
  terminationChecklist?: string;
  // Campos adicionais para relacionamentos
  client?: {
    id: string;
    name: string;
    cnpj?: string;
  };
  unit?: {
    id: string;
    name: string;
    code?: string;
  };
  unitId?: string;
  unitName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContractRequest {
  contractNumber: string;
  description: string;
  startDate: string;
  endDate?: string;
  value: number;
  status: ContractStatusType;
  clientId: string;
  notes?: string;
  contractOrigin?: ContractOriginType;
  contractType?: ContractTypeType;
  responsibleCommercialId?: string;
  responsibleManagerId?: string;
  proposalId?: string;
  monthlyValue?: number;
  annualValue?: number;
  adjustmentType?: AdjustmentTypeType;
  nextAdjustmentDate?: string;
  autoRenewal?: boolean;
  replacementTimeHours?: number;
  maxAbsenceMinutes?: number;
  patrolFrequency?: string;
  reportsRequired?: string;
  obligationsContractor?: string;
  obligationsContracted?: string;
  penalties?: string;
}

export type ContractDocumentTypeType = 'CONTRACT' | 'AMENDMENT' | 'LEGAL_ATTACHMENT';
export type DocumentSignatureStatusType = 'PENDING' | 'SIGNED' | 'REJECTED';

export interface ContractDocument {
  id: string;
  contractId: string;
  type: ContractDocumentTypeType;
  fileUrl?: string;
  fileName?: string;
  signatureStatus: DocumentSignatureStatusType;
  signedAt?: string;
  signedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractExpiringAlert {
  contractId: string;
  contractNumber: string;
  clientName: string;
  endDate: string;
  daysRemaining: number;
  urgencyLevel: string;
  value: number;
}

export interface ContractDashboardStats {
  activeCount: number;
  expiringCount: number;
  suspendedCount: number;
  mrr: number;
  byType: Record<string, number>;
  byClient: Record<string, number>;
  amendmentsThisMonth: number;
}

export interface UpdateContractRequest extends Partial<CreateContractRequest> {
  id: string;
}

export interface ContractFilters {
  searchTerm?: string;
  status?: string;
  clientId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export const contractService = {
  // Buscar todos os contratos com filtros
  async getContracts(filters: ContractFilters = {}): Promise<Contract[]> {
    const hasPagination = filters.page !== undefined && filters.size !== undefined;
    if (!hasPagination && Object.keys(filters).length === 0) {
      // Busca todos sem paginação
      try {
        const response = await api.get('/api/contracts/all');
        return Array.isArray(response.data) ? response.data : [];
      } catch (error) {
        console.error('Erro ao buscar contratos:', error);
        throw error;
      }
    }
    const params = new URLSearchParams();
    if (filters.searchTerm) params.append('searchTerm', filters.searchTerm);
    if (filters.status) params.append('status', filters.status);
    if (filters.clientId) params.append('clientId', filters.clientId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.size !== undefined) params.append('size', filters.size.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortDir) params.append('sortDir', filters.sortDir);
    const response = await api.get(`/api/contracts?${params.toString()}`);
    return response.data;
  },

  // Buscar contrato por ID
  async getContractById(id: string): Promise<Contract> {
    const response = await api.get(`/api/contracts/${id}`);
    return response.data;
  },

  // Buscar contratos por número
  async getContractByNumber(contractNumber: string): Promise<Contract> {
    const response = await api.get(`/api/contracts/number/${contractNumber}`);
    return response.data;
  },

  // Buscar contratos por cliente
  async getContractsByClient(clientId: string): Promise<Contract[]> {
    const response = await api.get(`/api/contracts/client/${clientId}`);
    if (response.data && Array.isArray(response.data.content)) {
      return response.data.content; // Extrai o array de contratos da resposta paginada
    } else if (Array.isArray(response.data)) {
      return response.data; // Caso o backend retorne um array direto
    } else {
      return []; // Retorna um array vazio se o formato for inesperado
    }
  },

  // Buscar contratos por status
  async getContractsByStatus(status: string): Promise<Contract[]> {
    const response = await api.get(`/api/contracts/status/${status}`);
    return response.data;
  },

  // Buscar contratos por período
  async getContractsByDateRange(startDate: string, endDate: string): Promise<Contract[]> {
    const response = await api.get(`/api/contracts/date-range?startDate=${startDate}&endDate=${endDate}`);
    return response.data;
  },

  // Criar novo contrato
  async createContract(contractData: CreateContractRequest): Promise<Contract> {
    const response = await api.post('/api/contracts', contractData);
    return response.data;
  },

  // Criar contrato a partir de proposta aprovada
  async createFromProposal(proposalId: string): Promise<Contract> {
    const response = await api.post(`/api/contracts/from-proposal/${proposalId}`);
    return response.data;
  },

  // Aditivos
  async getAmendments(contractId: string): Promise<ContractAmendment[]> {
    const response = await api.get(`/api/contracts/${contractId}/amendments`);
    return response.data;
  },
  async createAmendment(contractId: string, data: { type: AmendmentTypeType; description?: string; effectiveDate?: string; financialImpact?: number }): Promise<ContractAmendment> {
    const response = await api.post(`/api/contracts/${contractId}/amendments`, data);
    return response.data;
  },
  async approveAmendment(contractId: string, amendmentId: string): Promise<ContractAmendment> {
    const response = await api.post(`/api/contracts/${contractId}/amendments/${amendmentId}/approve`);
    return response.data;
  },
  async rejectAmendment(contractId: string, amendmentId: string): Promise<ContractAmendment> {
    const response = await api.post(`/api/contracts/${contractId}/amendments/${amendmentId}/reject`);
    return response.data;
  },
  async deleteAmendment(contractId: string, amendmentId: string): Promise<void> {
    await api.delete(`/api/contracts/${contractId}/amendments/${amendmentId}`);
  },

  // Histórico de Reajustes
  async getAdjustments(contractId: string): Promise<ContractAdjustment[]> {
    const response = await api.get(`/api/contracts/${contractId}/adjustments`);
    return response.data;
  },
  async createAdjustment(contractId: string, data: { adjustmentType: AdjustmentTypeType; previousValue: number; newValue: number; adjustmentDate?: string }): Promise<ContractAdjustment> {
    const response = await api.post(`/api/contracts/${contractId}/adjustments`, data);
    return response.data;
  },

  // Documentos
  async getDocuments(contractId: string): Promise<ContractDocument[]> {
    const response = await api.get(`/api/contracts/${contractId}/documents`);
    return response.data;
  },
  async createDocument(contractId: string, data: { type: ContractDocumentTypeType; fileUrl?: string; fileName?: string }): Promise<ContractDocument> {
    const response = await api.post(`/api/contracts/${contractId}/documents`, data);
    return response.data;
  },
  async deleteDocument(contractId: string, documentId: string): Promise<void> {
    await api.delete(`/api/contracts/${contractId}/documents/${documentId}`);
  },

  // Alertas e Renovação
  async getDashboardStats(): Promise<ContractDashboardStats> {
    const response = await api.get('/api/contracts/dashboard/stats');
    return response.data;
  },
  async getExpiringAlerts(): Promise<ContractExpiringAlert[]> {
    const response = await api.get('/api/contracts/expiring-alerts');
    return response.data;
  },
  async renewContract(contractId: string, newValue?: number): Promise<Contract> {
    const params = newValue != null ? `?newValue=${newValue}` : '';
    const response = await api.post(`/api/contracts/${contractId}/renew${params}`);
    return response.data;
  },
  async terminateContract(contractId: string, data: {
    terminationReason: string;
    terminationDate: string;
    avisoPrevio: boolean;
    desmobilizacaoEquipe: boolean;
    encerramentoFinanceiro: boolean;
    notes?: string;
  }): Promise<Contract> {
    const response = await api.post(`/api/contracts/${contractId}/terminate`, data);
    return response.data;
  },

  // Atualizar contrato
  async updateContract(id: string, contractData: UpdateContractRequest): Promise<Contract> {
    const response = await api.put(`/api/contracts/${id}`, contractData);
    return response.data;
  },

  // Excluir contrato
  async deleteContract(id: string): Promise<void> {
    await api.delete(`/api/contracts/${id}`);
  },

  // Atualizar status do contrato
  async updateContractStatus(id: string, status: string): Promise<Contract> {
    const response = await api.patch(`/api/contracts/${id}/status?status=${status}`);
    return response.data;
  },

  // Verificar se número do contrato já existe
  async checkContractNumberExists(contractNumber: string): Promise<boolean> {
    try {
      await api.get(`/api/contracts/number/${contractNumber}`);
      return true;
    } catch (error) {
      return false;
    }
  },

  // Buscar contratos com filtros avançados
  async searchContracts(query: string): Promise<Contract[]> {
    const response = await api.get(`/api/contracts/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  // Buscar contratos ativos
  async getActiveContracts(): Promise<Contract[]> {
    return this.getContractsByStatus('ACTIVE');
  },

  // Buscar contratos inativos
  async getInactiveContracts(): Promise<Contract[]> {
    return this.getContractsByStatus('INACTIVE');
  },

  // Buscar contratos pendentes
  async getPendingContracts(): Promise<Contract[]> {
    return this.getContractsByStatus('PENDING');
  },

  // Buscar contratos finalizados
  async getTerminatedContracts(): Promise<Contract[]> {
    return this.getContractsByStatus('TERMINATED');
  },

  // Buscar contratos que vencem em breve
  async getContractsExpiringSoon(days: number = 30): Promise<Contract[]> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    const endDateStr = endDate.toISOString().split('T')[0];

    return this.getContractsByDateRange(new Date().toISOString().split('T')[0], endDateStr);
  },

  // Calcular valor total dos contratos ativos
  async getTotalActiveContractsValue(): Promise<number> {
    const activeContracts = await this.getActiveContracts();
    return activeContracts.reduce((total, contract) => total + contract.value, 0);
  },

  // Gerar relatório de contratos
  async generateContractsReport(filters: ContractFilters = {}): Promise<any> {
    const contracts = await this.getContracts(filters);

    const report = {
      totalContracts: contracts.length,
      totalValue: contracts.reduce((total, contract) => total + contract.value, 0),
      byStatus: contracts.reduce((acc, contract) => {
        acc[contract.status] = (acc[contract.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byClient: contracts.reduce((acc, contract) => {
        const clientName = contract.clientName || 'N/A';
        acc[clientName] = (acc[clientName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      contracts
    };

    return report;
  },

  // Gerar PDF do contrato (backend - layout corporativo)
  async generateContractPdf(contractData: any): Promise<Blob> {
    try {
      const response = await api.post('/contracts/pdf', contractData, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error: unknown) {
      const ax = error as { response?: { data?: Blob; status?: number } };
      const blob = ax.response?.data;
      if (blob instanceof Blob && ax.response && ax.response.status >= 400) {
        const text = await blob.text();
        try {
          const json = JSON.parse(text) as { message?: string; error?: string };
          throw new Error(json.message || json.error || 'Erro ao gerar o contrato');
        } catch (inner) {
          if (inner instanceof SyntaxError) {
            throw new Error(text?.slice(0, 300) || 'Erro ao gerar o contrato');
          }
          throw inner;
        }
      }
      throw error;
    }
  },

  /** @deprecated Apenas referência de estrutura — não usar em produção */
  getMockContracts(): Contract[] {
    console.warn('getMockContracts() não deve ser usado — dados fictícios com IDs inválidos (CON-001, CON-002)');
    return [];
  }
}; 