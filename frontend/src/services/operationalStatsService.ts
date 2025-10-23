import api from '@/lib/axios';

export interface OperationalStats {
  activeWorkPosts: number;
  employeesOnDuty: number;
  activeEquipment: number;
  pendingAlerts: number;
  todayVisits: number;
  successRate: number;
  completedVisits: number;
  pendingVisits: number;
  activeSupervisors: number;
}

export interface WorkPostStats {
  total: number;
  active: number;
  inactive: number;
  byType: {
    POSTO_24H: number;
    POSTO_12H: number;
    POSTO_8H: number;
    OTHER: number;
  };
}

export interface EmployeeStats {
  total: number;
  onDuty: number;
  onVacation: number;
  absent: number;
}

export interface VisitStats {
  today: number;
  completed: number;
  pending: number;
  successRate: number;
  activeSupervisors: number;
}

export const operationalStatsService = {
  // Buscar estatísticas gerais operacionais
  async getOperationalStats(): Promise<OperationalStats> {
    try {
      const [workPostStats, employeeStats, visitStats, equipmentStats] = await Promise.all([
        this.getWorkPostStats(),
        this.getEmployeeStats(),
        this.getVisitStatsReal(),
        this.getEquipmentStats()
      ]);

      return {
        activeWorkPosts: workPostStats.active,
        employeesOnDuty: employeeStats.onDuty,
        activeEquipment: equipmentStats.active,
        pendingAlerts: equipmentStats.pendingAlerts,
        todayVisits: visitStats.today,
        successRate: visitStats.successRate,
        completedVisits: visitStats.completed,
        pendingVisits: visitStats.pending,
        activeSupervisors: visitStats.activeSupervisors
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas operacionais:', error);
      // Retornar dados padrão em caso de erro
      return {
        activeWorkPosts: 0,
        employeesOnDuty: 0,
        activeEquipment: 0,
        pendingAlerts: 0,
        todayVisits: 0,
        successRate: 0,
        completedVisits: 0,
        pendingVisits: 0,
        activeSupervisors: 0
      };
    }
  },

  // Buscar estatísticas de postos de trabalho
  async getWorkPostStats(): Promise<WorkPostStats> {
    try {
      const response = await api.get('/api/work-posts');
      const workPosts = response.data.content || response.data || [];
      
      const active = workPosts.filter((post: any) => post.status === 'ATIVO').length;
      const inactive = workPosts.filter((post: any) => post.status !== 'ATIVO').length;
      
      const byType = {
        POSTO_24H: workPosts.filter((post: any) => post.type === 'POSTO_24H').length,
        POSTO_12H: workPosts.filter((post: any) => post.type === 'POSTO_12H').length,
        POSTO_8H: workPosts.filter((post: any) => post.type === 'POSTO_8H').length,
        OTHER: workPosts.filter((post: any) => !['POSTO_24H', 'POSTO_12H', 'POSTO_8H'].includes(post.type)).length
      };

      return {
        total: workPosts.length,
        active,
        inactive,
        byType
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas de postos:', error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        byType: { POSTO_24H: 0, POSTO_12H: 0, POSTO_8H: 0, OTHER: 0 }
      };
    }
  },

  // Buscar estatísticas de funcionários
  async getEmployeeStats(): Promise<EmployeeStats> {
    try {
      const response = await api.get('/api/employees/basic');
      const employees = response.data.employees || [];
      
      // Simular funcionários em serviço (em um sistema real, isso viria de dados de presença)
      const onDuty = Math.floor(employees.length * 0.6); // 60% em serviço
      const onVacation = Math.floor(employees.length * 0.1); // 10% de férias
      const absent = Math.floor(employees.length * 0.05); // 5% ausentes

      return {
        total: employees.length,
        onDuty,
        onVacation,
        absent
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas de funcionários:', error);
      return {
        total: 0,
        onDuty: 0,
        onVacation: 0,
        absent: 0
      };
    }
  },

  // Buscar estatísticas de visitas
  async getVisitStats(): Promise<VisitStats> {
    try {
      // Simular dados de visitas (em um sistema real, isso viria de uma API de visitas)
      const today = Math.floor(Math.random() * 20) + 10; // 10-30 visitas hoje
      const completed = Math.floor(today * 0.9); // 90% completadas
      const pending = today - completed;
      const successRate = Math.floor(Math.random() * 20) + 80; // 80-100% taxa de sucesso
      const activeSupervisors = Math.floor(Math.random() * 10) + 8; // 8-18 supervisores

      return {
        today,
        completed,
        pending,
        successRate,
        activeSupervisors
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas de visitas:', error);
      return {
        today: 0,
        completed: 0,
        pending: 0,
        successRate: 0,
        activeSupervisors: 0
      };
    }
  },

  // Buscar estatísticas de equipamentos
  async getEquipmentStats(): Promise<{ active: number; pendingAlerts: number }> {
    try {
      // Usar endpoint de equipamentos existente
      const response = await api.get('/api/equipments');
      const equipments = response.data;
      
      // Contar equipamentos ativos
      const activeCount = equipments.filter((eq: any) => 
        eq.status === 'EM_ESTOQUE' || eq.status === 'EM_USO'
      ).length;
      
      // Contar alertas (equipamentos próximos do vencimento ou expirados)
      const today = new Date();
      const pendingAlerts = equipments.filter((eq: any) => {
        if (!eq.validityDate) return false;
        const validityDate = new Date(eq.validityDate);
        const daysUntilExpiry = Math.ceil((validityDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 30 || daysUntilExpiry < 0;
      }).length;
      
      return {
        active: activeCount,
        pendingAlerts: pendingAlerts
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas de equipamentos:', error);
      return {
        active: 0,
        pendingAlerts: 0
      };
    }
  },

  // Buscar estatísticas de visitas
  async getVisitStatsReal(): Promise<VisitStats> {
    try {
      const response = await api.get('/api/visit-controls/stats');
      const stats = response.data;
      
      return {
        today: stats.today || 0,
        completed: stats.completed || 0,
        pending: stats.pending || 0,
        successRate: stats.successRate || 0,
        activeSupervisors: 12 // Valor fixo por enquanto
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas de visitas:', error);
      return {
        today: 0,
        completed: 0,
        pending: 0,
        successRate: 0,
        activeSupervisors: 0
      };
    }
  },

  // Buscar visitas recentes
  async getRecentVisits(): Promise<any[]> {
    try {
      const response = await api.get('/api/visit-controls/recent');
      return response.data || [];
    } catch (error) {
      console.error('Erro ao buscar visitas recentes:', error);
      return [];
    }
  }
};

export default operationalStatsService;
