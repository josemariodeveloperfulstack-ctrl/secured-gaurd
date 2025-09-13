import api from '@/lib/axios';
import { ActivityReport, CreateActivityReportDTO, ActivityReportFilters } from '@/types/activityReport';

export const activityReportService = {
  // Buscar todos os relatórios com filtros
  async getActivityReports(filters: ActivityReportFilters = {}): Promise<ActivityReport[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters.employeeId) params.append('employeeId', filters.employeeId);
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.workPostId) params.append('workPostId', filters.workPostId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.status) params.append('status', filters.status);
      if (filters.supervisorId) params.append('supervisorId', filters.supervisorId);
      
      const response = await api.get(`/api/activity-reports?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar relatórios de atividade:', error);
      // Retornar dados mock para desenvolvimento
      return this.getMockActivityReports();
    }
  },

  // Buscar relatório por ID
  async getActivityReportById(id: string): Promise<ActivityReport> {
    try {
      const response = await api.get(`/api/activity-reports/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar relatório de atividade:', error);
      throw new Error('Falha ao buscar relatório de atividade');
    }
  },

  // Criar novo relatório
  async createActivityReport(reportData: CreateActivityReportDTO): Promise<ActivityReport> {
    try {
      const response = await api.post('/activity-reports', reportData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar relatório de atividade:', error);
      throw new Error('Falha ao criar relatório de atividade');
    }
  },

  // Atualizar relatório
  async updateActivityReport(id: string, reportData: Partial<CreateActivityReportDTO>): Promise<ActivityReport> {
    try {
      const response = await api.put(`/api/activity-reports/${id}`, reportData);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar relatório de atividade:', error);
      throw new Error('Falha ao atualizar relatório de atividade');
    }
  },

  // Excluir relatório
  async deleteActivityReport(id: string): Promise<void> {
    try {
      await api.delete(`/api/activity-reports/${id}`);
    } catch (error) {
      console.error('Erro ao excluir relatório de atividade:', error);
      throw new Error('Falha ao excluir relatório de atividade');
    }
  },

  // Upload de foto
  async uploadPhoto(reportId: string, file: File, description: string): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('description', description);

      await api.post(`/api/activity-reports/${reportId}/photos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      throw new Error('Falha ao fazer upload da foto');
    }
  },

  // Upload de documento
  async uploadDocument(reportId: string, file: File): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('document', file);

      await api.post(`/api/activity-reports/${reportId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } catch (error) {
      console.error('Erro ao fazer upload do documento:', error);
      throw new Error('Falha ao fazer upload do documento');
    }
  },

  // Aprovar relatório (supervisor)
  async approveReport(id: string): Promise<ActivityReport> {
    try {
      const response = await api.patch(`/api/activity-reports/${id}/approve`);
      return response.data;
    } catch (error) {
      console.error('Erro ao aprovar relatório:', error);
      throw new Error('Falha ao aprovar relatório');
    }
  },

  // Rejeitar relatório (supervisor)
  async rejectReport(id: string, reason: string): Promise<ActivityReport> {
    try {
      const response = await api.patch(`/api/activity-reports/${id}/reject`, { reason });
      return response.data;
    } catch (error) {
      console.error('Erro ao rejeitar relatório:', error);
      throw new Error('Falha ao rejeitar relatório');
    }
  },

  // Gerar relatório em PDF
  async generatePDFReport(filters: ActivityReportFilters): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await api.get(`/api/activity-reports/pdf?${params.toString()}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao gerar relatório PDF:', error);
      throw new Error('Falha ao gerar relatório PDF');
    }
  },

  // Dados mock para desenvolvimento
  getMockActivityReports(): ActivityReport[] {
    return [
      {
        id: '1',
        employeeId: 'emp-001',
        employeeName: 'João Silva',
        clientId: 'client-001',
        clientName: 'Empresa ABC Ltda',
        workPostId: 'post-001',
        workPostName: 'Portaria Principal',
        date: '2025-08-18',
        startTime: '08:00',
        endTime: '17:00',
        description: 'Serviço de portaria realizado normalmente. Controle de acesso de funcionários e visitantes. Rondas realizadas conforme programação.',
        ballisticPlate: {
          number: 'BP-001-2025',
          validUntil: '2031-08-18'
        },
        weaponRegistry: {
          number: 'AR-12345',
          validUntil: '2026-03-15'
        },
        absenceStatus: 'PRESENT',
        divergences: '',
        photos: [
          {
            id: 'photo-1',
            url: '/mock-photos/portaria-1.jpg',
            description: 'Portaria no início do turno',
            timestamp: '2025-08-18T08:00:00Z'
          }
        ],
        documents: [],
        supervisorId: 'sup-001',
        supervisorName: 'Maria Santos',
        status: 'APPROVED',
        createdAt: '2025-08-18T08:00:00Z',
        updatedAt: '2025-08-18T18:00:00Z'
      },
      {
        id: '2',
        employeeId: 'emp-002',
        employeeName: 'Carlos Lima',
        clientId: 'client-002',
        clientName: 'Indústria XYZ S.A.',
        workPostId: 'post-002',
        workPostName: 'Ronda Noturna',
        date: '2025-08-17',
        startTime: '22:00',
        endTime: '06:00',
        description: 'Ronda noturna realizada em todos os setores. Verificação de portas, janelas e sistemas de segurança. Pequeno incidente no setor B às 02:30.',
        ballisticPlate: {
          number: 'BP-002-2025',
          validUntil: '2031-07-20'
        },
        weaponRegistry: {
          number: 'AR-67890',
          validUntil: '2025-12-10'
        },
        absenceStatus: 'PRESENT',
        divergences: 'Porta do setor B encontrada aberta às 02:30. Verificado com responsável do setor.',
        medicalConsultation: {
          date: '2025-08-16',
          reason: 'Consulta de rotina',
          doctor: 'Dr. Pedro Oliveira',
          result: 'Apto para o trabalho'
        },
        photos: [
          {
            id: 'photo-2',
            url: '/mock-photos/ronda-1.jpg',
            description: 'Setor B - porta encontrada aberta',
            timestamp: '2025-08-17T02:30:00Z'
          }
        ],
        documents: [
          {
            id: 'doc-1',
            name: 'atestado-medico.pdf',
            url: '/mock-docs/atestado-001.pdf',
            type: 'application/pdf',
            size: 245760,
            uploadedAt: '2025-08-17T06:30:00Z'
          }
        ],
        supervisorId: 'sup-001',
        supervisorName: 'Maria Santos',
        status: 'SUBMITTED',
        createdAt: '2025-08-17T22:00:00Z',
        updatedAt: '2025-08-18T06:30:00Z'
      }
    ];
  }
};