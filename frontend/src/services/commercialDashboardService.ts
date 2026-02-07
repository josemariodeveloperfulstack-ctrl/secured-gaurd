import api from '@/lib/axios';

export interface CommercialKpis {
  leadsRecebidos: number;
  leadsQualificados: number;
  propostasEnviadas: number;
  propostasAprovadas: number;
  taxaConversao: number;
  ticketMedio: number;
  receitaContratada: number;
  tempoMedioFechamentoDias: number;
  contratosAtivos: number;
  leadsPorMes: Record<string, number>;
  receitaPorMes: Record<string, number>;
  conversaoPorMes: Record<string, number>;
  funilVendas: Record<string, number>;
  userId?: string;
  userName?: string;
  periodo: string;
}

export interface TeamKpis {
  receitaTotal: number;
  totalLeads: number;
  totalPropostas: number;
  propostasAprovadas: number;
  contratosGanhos: number;
  contratosAtivos: number;
  taxaConversaoGeral: number;
  ticketMedioGeral: number;
  leadsPorVendedor: Record<string, number>;
  conversaoPorVendedor: Record<string, number>;
  receitaPorVendedor: Record<string, number>;
  pipelinePorEtapa: Record<string, number>;
  receitaPorMes: Record<string, number>;
  periodo: string;
}

export interface VendedorRanking {
  userId: string;
  userName: string;
  leadsRecebidos: number;
  leadsQualificados: number;
  propostasEnviadas: number;
  propostasAprovadas: number;
  taxaConversao: number;
  receita: number;
  ticketMedio: number;
  posicao: number;
}

export interface ExpiringContract {
  id: string;
  contractNumber: string;
  description: string;
  endDate: string;
  value: number;
  status: string;
  clientName: string;
  diasRestantes: number;
  urgencia: 'URGENTE' | 'ATENÇÃO' | 'NORMAL';
}

export interface DashboardFilters {
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export const commercialDashboardService = {
  async getKpis(filters: DashboardFilters = {}): Promise<CommercialKpis> {
    const params = new URLSearchParams();
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    const query = params.toString();
    const url = query ? `/api/commercial-dashboard/kpis?${query}` : '/api/commercial-dashboard/kpis';
    const { data } = await api.get(url);
    return data;
  },

  async getTeamKpis(filters: Omit<DashboardFilters, 'userId'> = {}): Promise<TeamKpis> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    const query = params.toString();
    const url = query ? `/api/commercial-dashboard/team-kpis?${query}` : '/api/commercial-dashboard/team-kpis';
    const { data } = await api.get(url);
    return data;
  },

  async getRanking(filters: DashboardFilters & { orderBy?: string } = {}): Promise<VendedorRanking[]> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.orderBy) params.append('orderBy', filters.orderBy);
    const query = params.toString();
    const url = query ? `/api/commercial-dashboard/ranking?${query}` : '/api/commercial-dashboard/ranking';
    const { data } = await api.get(url);
    return data;
  },

  async getPipeline(): Promise<Record<string, number>> {
    const { data } = await api.get('/api/commercial-dashboard/pipeline');
    return data;
  },

  async getRevenueBySegment(filters: Omit<DashboardFilters, 'userId'> = {}): Promise<{ segmentos: Record<string, number>; total: number }> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    const query = params.toString();
    const url = query ? `/api/commercial-dashboard/revenue-by-segment?${query}` : '/api/commercial-dashboard/revenue-by-segment';
    const { data } = await api.get(url);
    return data;
  },

  async getExpiringContracts(days: number = 30): Promise<ExpiringContract[]> {
    const { data } = await api.get(`/api/commercial-dashboard/expiring-contracts?days=${days}`);
    return data;
  },
};
