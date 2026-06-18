import api from '@/lib/axios';
import { withConnectionRetry } from '@/utils/requestRetry';

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

function buildDateParams(filters: DashboardFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  return params;
}

export const commercialDashboardService = {
  async getKpis(filters: DashboardFilters = {}): Promise<CommercialKpis> {
    return withConnectionRetry(async () => {
      const params = buildDateParams(filters);
      if (filters.userId) params.append('userId', filters.userId);
      const query = params.toString();
      const url = query ? `/commercial-dashboard/kpis?${query}` : '/commercial-dashboard/kpis';
      const { data } = await api.get(url);
      return data;
    });
  },

  async getTeamKpis(filters: Omit<DashboardFilters, 'userId'> = {}): Promise<TeamKpis> {
    return withConnectionRetry(async () => {
      const params = buildDateParams(filters);
      const query = params.toString();
      const url = query ? `/commercial-dashboard/team-kpis?${query}` : '/commercial-dashboard/team-kpis';
      const { data } = await api.get(url);
      return data;
    });
  },

  async getRanking(filters: DashboardFilters & { orderBy?: string } = {}): Promise<VendedorRanking[]> {
    return withConnectionRetry(async () => {
      const params = buildDateParams(filters);
      if (filters.orderBy) params.append('orderBy', filters.orderBy);
      const query = params.toString();
      const url = query ? `/commercial-dashboard/ranking?${query}` : '/commercial-dashboard/ranking';
      const { data } = await api.get(url);
      return data;
    });
  },

  async getPipeline(): Promise<Record<string, number>> {
    return withConnectionRetry(async () => {
      const { data } = await api.get('/commercial-dashboard/pipeline');
      return data;
    });
  },

  async getRevenueBySegment(filters: Omit<DashboardFilters, 'userId'> = {}): Promise<{ segmentos: Record<string, number>; total: number }> {
    return withConnectionRetry(async () => {
      const params = buildDateParams(filters);
      const query = params.toString();
      const url = query ? `/commercial-dashboard/revenue-by-segment?${query}` : '/commercial-dashboard/revenue-by-segment';
      const { data } = await api.get(url);
      return data;
    });
  },

  async getExpiringContracts(days: number = 30): Promise<ExpiringContract[]> {
    return withConnectionRetry(async () => {
      const { data } = await api.get(`/commercial-dashboard/expiring-contracts?days=${days}`);
      return data;
    });
  },
};
