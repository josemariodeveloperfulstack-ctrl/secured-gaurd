import api from '@/lib/axios';
import { isRetryableConnectionError } from '@/utils/connectionError';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withConnectionRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries && isRetryableConnectionError(error)) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export interface ProposalItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface Proposal {
  id: number | string; // Pode ser UUID (string) ou number
  title: string;
  proposalNumber: string;
  client?: {
    id: number | string;
    name: string;
  };
  clientName?: string;
  lead?: {
    id: number | string;
    name: string;
  };
  leadName?: string;
  status: string;
  totalValue: number;
  validUntil: string;
  description: string;
  assignedTo?: {
    id: number | string;
    name: string;
  };
  assignedToName?: string;
  createdBy: {
    id: number | string;
    name: string;
  };
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  items?: ProposalItem[];
  contractId?: number | string;
  contract?: { id: number | string };
}

export interface CreateProposalRequest {
  title: string;
  clientId?: number | string; // Pode ser UUID (string) ou number
  leadId?: number | string; // Pode ser UUID (string) ou number
  totalValue: number;
  validUntil?: string;
  description?: string;
  assignedToId?: number | string; // Pode ser UUID (string) ou number
  items?: {
    description: string;
    quantity: number;
    unitPrice: number;
    notes?: string; // Seção: MAO_DE_OBRA, MATERIAIS, BDI, IMPOSTOS
  }[];
}

export interface UpdateProposalRequest extends CreateProposalRequest {
  status?: string;
  termsConditions?: string;
  notes?: string;
}

export interface ProposalStats {
  DRAFT: number;
  SENT: number;
  UNDER_REVIEW: number;
  APPROVED: number;
  REJECTED: number;
  EXPIRED: number;
  CONVERTED: number;
}

export interface ProposalValueStats {
  DRAFT: number;
  SENT: number;
  UNDER_REVIEW: number;
  APPROVED: number;
  REJECTED: number;
  EXPIRED: number;
  CONVERTED: number;
}

export const proposalService = {
  async getAllProposals(): Promise<Proposal[]> {
    const response = await withConnectionRetry(() => api.get('/api/proposals/all'));
    return response.data;
  },

  async getProposals(page: number = 0, size: number = 10): Promise<{ content: Proposal[]; totalElements: number }> {
    const response = await api.get(`/api/proposals?page=${page}&size=${size}`);
    return response.data;
  },

  async getProposalById(id: number | string): Promise<Proposal> {
    const response = await api.get(`/api/proposals/${id}`);
    return response.data;
  },

  async createProposal(proposalData: CreateProposalRequest): Promise<Proposal> {
    const response = await api.post('/api/proposals', proposalData);
    return response.data;
  },

  async updateProposal(id: number | string, proposalData: UpdateProposalRequest): Promise<Proposal> {
    const response = await api.put(`/api/proposals/${id}`, proposalData);
    return response.data;
  },

  async updateProposalStatus(id: number | string, status: string): Promise<Proposal> {
    const response = await api.patch(`/api/proposals/${id}/status`, { status });
    return response.data;
  },

  async deleteProposal(id: number | string, reason: string): Promise<void> {
    await api.delete(`/api/proposals/${id}`, { params: { reason } });
  },

  async deleteProposalsBulk(ids: (number | string)[], reason: string): Promise<void> {
    await api.delete('/api/proposals/bulk', {
      data: { ids, reason }
    });
  },

  async deleteAllProposals(reason: string): Promise<void> {
    await api.delete('/api/proposals/all', { params: { reason } });
  },

  async getProposalsByStatus(status: string): Promise<Proposal[]> {
    const response = await api.get(`/api/proposals/status/${status}`);
    return response.data;
  },

  async getProposalsByClient(clientId: number): Promise<Proposal[]> {
    const response = await api.get(`/api/proposals/client/${clientId}`);
    return response.data;
  },

  async getProposalsByLead(leadId: number): Promise<Proposal[]> {
    const response = await api.get(`/api/proposals/lead/${leadId}`);
    return response.data;
  },

  async getProposalsByAssignedTo(userId: number): Promise<Proposal[]> {
    const response = await api.get(`/api/proposals/assigned/${userId}`);
    return response.data;
  },

  async getProposalsByCreatedBy(userId: number): Promise<Proposal[]> {
    const response = await api.get(`/api/proposals/created/${userId}`);
    return response.data;
  },

  async getExpiredProposals(): Promise<Proposal[]> {
    const response = await api.get('/api/proposals/expired');
    return response.data;
  },

  async getProposalsExpiringSoon(days: number): Promise<Proposal[]> {
    const response = await api.get(`/api/proposals/expiring-soon/${days}`);
    return response.data;
  },

  async searchProposals(term: string): Promise<Proposal[]> {
    const response = await api.get(`/api/proposals/search?term=${encodeURIComponent(term)}`);
    return response.data;
  },

  async getStatsByStatus(): Promise<ProposalStats> {
    const response = await api.get('/api/proposals/stats/count-by-status');
    return response.data;
  },

  async getTotalValueByStatus(): Promise<ProposalStats> {
    const response = await api.get('/api/proposals/stats/total-value-by-status');
    return response.data;
  },

  async getProposalPdf(id: number | string): Promise<Blob> {
    const response = await api.get(`/api/proposals/${id}/pdf`, { responseType: 'blob' });
    return response.data;
  },

  async generatePdfFromSimulation(data: {
    descricaoServico: string;
    maoDeObra: Record<string, number>;
    materiais: Record<string, number>;
    bdi: Record<string, number>;
    impostos: Record<string, number>;
    resultado: { valorMensal: number; valorAnual: number };
    clientName?: string;
    clientAddress?: string;
  }): Promise<Blob> {
    const response = await api.post('/api/proposals/pdf/from-simulation', data, { responseType: 'blob' });
    return response.data;
  },

  async generateReportPDF(filters: { status?: string; clientName?: string; searchTerm?: string }): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.clientName && filters.clientName !== 'all') params.append('clientName', filters.clientName);
    if (filters.searchTerm?.trim()) params.append('searchTerm', filters.searchTerm.trim());

    const query = params.toString();
    const url = query ? `/api/proposals/reports/pdf?${query}` : '/api/proposals/reports/pdf';
    const response = await api.get(url, { responseType: 'blob' });
    return response.data;
  },

  async generateReportExcel(filters: { status?: string; clientName?: string; searchTerm?: string }): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.clientName && filters.clientName !== 'all') params.append('clientName', filters.clientName);
    if (filters.searchTerm?.trim()) params.append('searchTerm', filters.searchTerm.trim());

    const query = params.toString();
    const url = query ? `/api/proposals/reports/excel?${query}` : '/api/proposals/reports/excel';
    const response = await api.get(url, { responseType: 'blob' });
    return response.data;
  }
};