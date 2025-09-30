import api from '@/lib/axios';

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  activeContracts: number;
  monthlyRevenue: number;
  totalRevenue: number;
  totalEquipment: number;
  equipmentInUse: number;
  equipmentInMaintenance: number;
  equipmentExpiring: number;
  pendingTasks: number;
  completedTasks: number;
  totalAlerts: number;
  unreadAlerts: number;
  totalEmployees: number;
  totalClients: number;
  totalServices: number;
  totalVehicles: number;
  totalMaintenances: number;
  totalMeasurements: number;
  pendingMeasurements: number;
  totalInvoices: number;
  pendingInvoices: number;
  dailyStats: Record<string, number>;
  recentActivities: Array<{
    id: string;
    user: string;
    action: string;
    module: string;
    timestamp: string;
    details?: string;
  }>;
  systemAlerts: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    createdAt: string;
  }>;
  lastUpdate: string;
  systemVersion: string;
  environment: string;
}

export interface QuickStats {
  totalUsers: number;
  activeUsers: number;
  activeContracts: number;
  monthlyRevenue: number;
  totalEquipment: number;
  pendingTasks: number;
  totalAlerts: number;
  unreadAlerts: number;
  lastUpdate: string;
}

export interface DashboardHealth {
  status: string;
  timestamp: string;
  service: string;
  error?: string;
}

export const dashboardService = {
  /**
   * Obter resumo completo do dashboard
   */
  async getDashboardSummary(): Promise<DashboardStats> {
    try {
      const response = await api.get('/api/dashboard/summary');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar resumo do dashboard:', error);
      throw error;
    }
  },

  /**
   * Obter estatísticas rápidas para widgets
   */
  async getQuickStats(): Promise<QuickStats> {
    try {
      const response = await api.get('/api/dashboard/stats/quick');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar estatísticas rápidas:', error);
      throw error;
    }
  },

  /**
   * Verificar saúde do dashboard
   */
  async getDashboardHealth(): Promise<DashboardHealth> {
    try {
      const response = await api.get('/api/dashboard/health');
      return response.data;
    } catch (error) {
      console.error('Erro ao verificar saúde do dashboard:', error);
      throw error;
    }
  },

  /**
   * Formatar valor monetário para exibição
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  },

  /**
   * Formatar número para exibição com separadores
   */
  formatNumber(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(value);
  },

  /**
   * Calcular porcentagem de crescimento
   */
  calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  },

  /**
   * Obter cor baseada no status
   */
  getStatusColor(status: string): string {
    const colors = {
      'success': 'text-green-600',
      'warning': 'text-yellow-600',
      'error': 'text-red-600',
      'info': 'text-blue-600',
      'pending': 'text-orange-600',
      'completed': 'text-green-600'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600';
  },

  /**
   * Obter ícone baseado no tipo de atividade
   */
  getActivityIcon(module: string): string {
    const icons = {
      'users': '👥',
      'clients': '🏢',
      'contracts': '📋',
      'financial': '💰',
      'equipment': '🔧',
      'vehicles': '🚗',
      'maintenance': '🔨',
      'measurements': '📏',
      'invoices': '🧾',
      'stock': '📦',
      'hr': '👤',
      'sst': '🛡️',
      'operational': '⚙️'
    };
    return icons[module.toLowerCase() as keyof typeof icons] || '📄';
  },

  /**
   * Obter tempo relativo (ex: "há 2 horas")
   */
  getRelativeTime(timestamp: string): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return 'agora mesmo';
    if (diffInSeconds < 3600) return `há ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `há ${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `há ${Math.floor(diffInSeconds / 86400)} dias`;
    
    return time.toLocaleDateString('pt-BR');
  }
};
