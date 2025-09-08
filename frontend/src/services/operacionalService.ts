import axios from '../lib/axios';

// ===== TIPOS =====
export interface WorkSchedule {
  id: string;
  employee: {
    id: string;
    name: string;
  };
  location: {
    id: string;
    name: string;
  };
  scheduleDate: string;
  shift: 'DAY' | 'NIGHT' | 'MIXED';
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  observations?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperationalOccurrence {
  id: string;
  type: 'SEGURANCA' | 'DISCIPLINAR' | 'EQUIPAMENTO' | 'INCIDENTE' | 'MANUTENCAO';
  title: string;
  description?: string;
  employee: {
    id: string;
    name: string;
  };
  location?: string;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'RESOLVIDO' | 'CONCLUIDO';
  priority: 'BAIXA' | 'MEDIA' | 'ALTA';
  date: string;
  responsible?: string;
  warningNumber?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SystemNotification {
  id: string;
  type: 'NOVO_CLIENTE' | 'CONTRATO_VENCENDO' | 'FUNCIONARIO_ATRASADO' | 'OCORRENCIA' | 'ESCALA' | 'ADVERTENCIA' | 'NOVO_CONTRATO' | 'LEAD_NOVO' | 'PROPOSTA_ENVIADA' | 'ORCAMENTO_APROVADO';
  title: string;
  description?: string;
  priority: 'BAIXA' | 'MEDIA' | 'ALTA';
  timestamp: string;
  read: boolean;
  recipient?: {
    id: string;
    name: string;
  };
  employeeName?: string;
  clientName?: string;
  contractReference?: string;
  value?: number;
  department?: string;
  createdAt: string;
}

// ===== WORK SCHEDULE SERVICE =====
export const workScheduleService = {
  // Criar nova escala
  async createSchedule(schedule: Omit<WorkSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkSchedule> {
    const response = await axios.post('/api/operational/schedules', schedule);
    return response.data;
  },

  // Buscar escala por ID
  async getScheduleById(id: string): Promise<WorkSchedule> {
    const response = await axios.get(`/api/operational/schedules/${id}`);
    return response.data;
  },

  // Listar todas as escalas
  async getAllSchedules(): Promise<WorkSchedule[]> {
    const response = await axios.get('/api/operational/schedules');
    return response.data;
  },

  // Buscar escalas por funcionário
  async getSchedulesByEmployee(employeeId: string): Promise<WorkSchedule[]> {
    const response = await axios.get(`/api/operational/schedules/employee/${employeeId}`);
    return response.data;
  },

  // Buscar escalas por local
  async getSchedulesByLocation(locationId: string): Promise<WorkSchedule[]> {
    const response = await axios.get(`/api/operational/schedules/location/${locationId}`);
    return response.data;
  },

  // Buscar escalas por data
  async getSchedulesByDate(date: string): Promise<WorkSchedule[]> {
    const response = await axios.get(`/api/operational/schedules/date/${date}`);
    return response.data;
  },

  // Buscar escalas por período
  async getSchedulesByPeriod(startDate: string, endDate: string): Promise<WorkSchedule[]> {
    const response = await axios.get('/api/operational/schedules/period', {
      params: { startDate, endDate }
    });
    return response.data;
  },

  // Buscar escalas por status
  async getSchedulesByStatus(status: WorkSchedule['status']): Promise<WorkSchedule[]> {
    const response = await axios.get(`/api/operational/schedules/status/${status}`);
    return response.data;
  },

  // Buscar escalas pendentes
  async getPendingSchedules(): Promise<WorkSchedule[]> {
    const response = await axios.get('/api/operational/schedules/pending');
    return response.data;
  },

  // Atualizar escala
  async updateSchedule(id: string, schedule: Partial<WorkSchedule>): Promise<WorkSchedule> {
    const response = await axios.put(`/api/operational/schedules/${id}`, schedule);
    return response.data;
  },

  // Confirmar escala
  async confirmSchedule(id: string): Promise<WorkSchedule> {
    const response = await axios.patch(`/api/operational/schedules/${id}/confirm`);
    return response.data;
  },

  // Cancelar escala
  async cancelSchedule(id: string, reason: string): Promise<WorkSchedule> {
    const response = await axios.patch(`/api/operational/schedules/${id}/cancel`, null, {
      params: { reason }
    });
    return response.data;
  },

  // Marcar escala como concluída
  async completeSchedule(id: string): Promise<WorkSchedule> {
    const response = await axios.patch(`/api/operational/schedules/${id}/complete`);
    return response.data;
  },

  // Deletar escala
  async deleteSchedule(id: string): Promise<void> {
    await axios.delete(`/api/operational/schedules/${id}`);
  },

  // Verificar disponibilidade do funcionário
  async checkEmployeeAvailability(employeeId: string, date: string): Promise<boolean> {
    const response = await axios.get(`/api/operational/schedules/availability/${employeeId}`, {
      params: { date }
    });
    return response.data;
  }
};

// ===== OPERATIONAL OCCURRENCE SERVICE =====
export const occurrenceService = {
  // Criar nova ocorrência
  async createOccurrence(occurrence: Omit<OperationalOccurrence, 'id' | 'createdAt' | 'updatedAt'>): Promise<OperationalOccurrence> {
    const response = await axios.post('/api/operational/occurrences', occurrence);
    return response.data;
  },

  // Buscar ocorrência por ID
  async getOccurrenceById(id: string): Promise<OperationalOccurrence> {
    const response = await axios.get(`/api/operational/occurrences/${id}`);
    return response.data;
  },

  // Listar todas as ocorrências
  async getAllOccurrences(): Promise<OperationalOccurrence[]> {
    const response = await axios.get('/api/operational/occurrences');
    return response.data;
  },

  // Buscar ocorrências por funcionário
  async getOccurrencesByEmployee(employeeId: string): Promise<OperationalOccurrence[]> {
    const response = await axios.get(`/api/operational/occurrences/employee/${employeeId}`);
    return response.data;
  },

  // Buscar ocorrências por tipo
  async getOccurrencesByType(type: OperationalOccurrence['type']): Promise<OperationalOccurrence[]> {
    const response = await axios.get(`/api/operational/occurrences/type/${type}`);
    return response.data;
  },

  // Buscar ocorrências por status
  async getOccurrencesByStatus(status: OperationalOccurrence['status']): Promise<OperationalOccurrence[]> {
    const response = await axios.get(`/api/operational/occurrences/status/${status}`);
    return response.data;
  },

  // Buscar ocorrências por prioridade
  async getOccurrencesByPriority(priority: OperationalOccurrence['priority']): Promise<OperationalOccurrence[]> {
    const response = await axios.get(`/api/operational/occurrences/priority/${priority}`);
    return response.data;
  },

  // Buscar ocorrências por período
  async getOccurrencesByPeriod(startDate: string, endDate: string): Promise<OperationalOccurrence[]> {
    const response = await axios.get('/api/operational/occurrences/period', {
      params: { startDate, endDate }
    });
    return response.data;
  },

  // Buscar ocorrências pendentes
  async getPendingOccurrences(): Promise<OperationalOccurrence[]> {
    const response = await axios.get('/api/operational/occurrences/pending');
    return response.data;
  },

  // Buscar ocorrências não resolvidas por funcionário
  async getUnresolvedOccurrencesByEmployee(employeeId: string): Promise<OperationalOccurrence[]> {
    const response = await axios.get(`/api/operational/occurrences/unresolved/employee/${employeeId}`);
    return response.data;
  },

  // Buscar ocorrências por responsável
  async getOccurrencesByResponsible(responsible: string): Promise<OperationalOccurrence[]> {
    const response = await axios.get('/api/operational/occurrences/responsible', {
      params: { responsible }
    });
    return response.data;
  },

  // Buscar ocorrências por local
  async getOccurrencesByLocation(location: string): Promise<OperationalOccurrence[]> {
    const response = await axios.get('/api/operational/occurrences/location', {
      params: { location }
    });
    return response.data;
  },

  // Buscar ocorrência por número de advertência
  async getOccurrenceByWarningNumber(warningNumber: number): Promise<OperationalOccurrence> {
    const response = await axios.get(`/api/operational/occurrences/warning/${warningNumber}`);
    return response.data;
  },

  // Atualizar ocorrência
  async updateOccurrence(id: string, occurrence: Partial<OperationalOccurrence>): Promise<OperationalOccurrence> {
    const response = await axios.put(`/api/operational/occurrences/${id}`, occurrence);
    return response.data;
  },

  // Atualizar status da ocorrência
  async updateOccurrenceStatus(id: string, newStatus: OperationalOccurrence['status']): Promise<OperationalOccurrence> {
    const response = await axios.patch(`/api/operational/occurrences/${id}/status`, null, {
      params: { newStatus }
    });
    return response.data;
  },

  // Atualizar prioridade da ocorrência
  async updateOccurrencePriority(id: string, newPriority: OperationalOccurrence['priority']): Promise<OperationalOccurrence> {
    const response = await axios.patch(`/api/operational/occurrences/${id}/priority`, null, {
      params: { newPriority }
    });
    return response.data;
  },

  // Deletar ocorrência
  async deleteOccurrence(id: string): Promise<void> {
    await axios.delete(`/api/operational/occurrences/${id}`);
  },

  // Gerar próximo número de advertência
  async generateNextWarningNumber(): Promise<number> {
    const response = await axios.get('/api/operational/occurrences/next-warning-number');
    return response.data;
  }
};

// ===== SYSTEM NOTIFICATION SERVICE =====
export const notificationService = {
  // Criar nova notificação
  async createNotification(notification: Omit<SystemNotification, 'id' | 'createdAt'>): Promise<SystemNotification> {
    const response = await axios.post('/api/operational/notifications', notification);
    return response.data;
  },

  // Criar notificação para novo cliente
  async createNewClientNotification(clientName: string, department: string): Promise<SystemNotification> {
    const response = await axios.post('/api/operational/notifications/new-client', null, {
      params: { clientName, department }
    });
    return response.data;
  },

  // Criar notificação para contrato vencendo
  async createContractExpiringNotification(
    clientName: string, 
    contractReference: string, 
    expirationDate: string, 
    value: number
  ): Promise<SystemNotification> {
    const response = await axios.post('/api/operational/notifications/contract-expiring', null, {
      params: { clientName, contractReference, expirationDate, value }
    });
    return response.data;
  },

  // Criar notificação para funcionário atrasado
  async createEmployeeLateNotification(employeeName: string, location: string): Promise<SystemNotification> {
    const response = await axios.post('/api/operational/notifications/employee-late', null, {
      params: { employeeName, location }
    });
    return response.data;
  },

  // Criar notificação para ocorrência
  async createOccurrenceNotification(
    employeeName: string, 
    occurrenceType: string, 
    location: string, 
    priority: SystemNotification['priority']
  ): Promise<SystemNotification> {
    const response = await axios.post('/api/operational/notifications/occurrence', null, {
      params: { employeeName, occurrenceType, location, priority }
    });
    return response.data;
  },

  // Criar notificação para nova escala
  async createScheduleNotification(
    employeeName: string, 
    location: string, 
    scheduleDate: string
  ): Promise<SystemNotification> {
    const response = await axios.post('/api/operational/notifications/schedule', null, {
      params: { employeeName, location, scheduleDate }
    });
    return response.data;
  },

  // Buscar notificação por ID
  async getNotificationById(id: string): Promise<SystemNotification> {
    const response = await axios.get(`/api/operational/notifications/${id}`);
    return response.data;
  },

  // Listar todas as notificações
  async getAllNotifications(): Promise<SystemNotification[]> {
    const response = await axios.get('/api/operational/notifications');
    return response.data;
  },

  // Buscar notificações por destinatário
  async getNotificationsByRecipient(recipientId: string): Promise<SystemNotification[]> {
    const response = await axios.get(`/api/operational/notifications/recipient/${recipientId}`);
    return response.data;
  },

  // Buscar notificações não lidas por destinatário
  async getUnreadNotificationsByRecipient(recipientId: string): Promise<SystemNotification[]> {
    const response = await axios.get(`/api/operational/notifications/unread/recipient/${recipientId}`);
    return response.data;
  },

  // Buscar notificações por tipo
  async getNotificationsByType(type: SystemNotification['type']): Promise<SystemNotification[]> {
    const response = await axios.get(`/api/operational/notifications/type/${type}`);
    return response.data;
  },

  // Buscar notificações por prioridade
  async getNotificationsByPriority(priority: SystemNotification['priority']): Promise<SystemNotification[]> {
    const response = await axios.get(`/api/operational/notifications/priority/${priority}`);
    return response.data;
  },

  // Buscar notificações por período
  async getNotificationsByPeriod(startDate: string, endDate: string): Promise<SystemNotification[]> {
    const response = await axios.get('/api/operational/notifications/period', {
      params: { startDate, endDate }
    });
    return response.data;
  },

  // Buscar notificações não lidas
  async getUnreadNotifications(): Promise<SystemNotification[]> {
    const response = await axios.get('/api/operational/notifications/unread');
    return response.data;
  },

  // Buscar notificações por departamento
  async getNotificationsByDepartment(department: string): Promise<SystemNotification[]> {
    const response = await axios.get('/api/operational/notifications/department', {
      params: { department }
    });
    return response.data;
  },

  // Buscar notificações por funcionário
  async getNotificationsByEmployee(employeeName: string): Promise<SystemNotification[]> {
    const response = await axios.get('/api/operational/notifications/employee', {
      params: { employeeName }
    });
    return response.data;
  },

  // Buscar notificações por cliente
  async getNotificationsByClient(clientName: string): Promise<SystemNotification[]> {
    const response = await axios.get('/api/operational/notifications/client', {
      params: { clientName }
    });
    return response.data;
  },

  // Buscar notificações por contrato
  async getNotificationsByContract(contractReference: string): Promise<SystemNotification[]> {
    const response = await axios.get('/api/operational/notifications/contract', {
      params: { contractReference }
    });
    return response.data;
  },

  // Buscar notificações por valor mínimo
  async getNotificationsByValueGreaterThan(minValue: number): Promise<SystemNotification[]> {
    const response = await axios.get('/api/operational/notifications/value', {
      params: { minValue }
    });
    return response.data;
  },

  // Buscar notificações recentes
  async getRecentNotifications(): Promise<SystemNotification[]> {
    const response = await axios.get('/api/operational/notifications/recent');
    return response.data;
  },

  // Atualizar notificação
  async updateNotification(id: string, notification: Partial<SystemNotification>): Promise<SystemNotification> {
    const response = await axios.put(`/api/operational/notifications/${id}`, notification);
    return response.data;
  },

  // Marcar notificação como lida
  async markNotificationAsRead(id: string): Promise<void> {
    await axios.patch(`/api/operational/notifications/${id}/read`);
  },

  // Marcar todas as notificações de um destinatário como lidas
  async markAllNotificationsAsReadByRecipient(recipientId: string): Promise<void> {
    await axios.patch(`/api/operational/notifications/read-all/recipient/${recipientId}`);
  },

  // Contar notificações não lidas por destinatário
  async countUnreadNotificationsByRecipient(recipientId: string): Promise<number> {
    const response = await axios.get(`/api/operational/notifications/count/unread/recipient/${recipientId}`);
    return response.data;
  },

  // Deletar notificação
  async deleteNotification(id: string): Promise<void> {
    await axios.delete(`/api/operational/notifications/${id}`);
  },

  // Deletar notificações antigas
  async deleteOldNotifications(): Promise<void> {
    await axios.delete('/api/operational/notifications/old');
  }
};

// ===== EXPORT DEFAULT =====
export default {
  workSchedule: workScheduleService,
  occurrence: occurrenceService,
  notification: notificationService
};
