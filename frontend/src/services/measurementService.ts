import api from '@/lib/axios';

export interface MeasurementBulletin {
  id: string;
  clientId?: string;
  clientName?: string;
  contractId?: string;
  contractNumber?: string;
  unitId?: string;
  unitName?: string;
  periodStart?: string;
  periodEnd?: string;
  status?: string;
  subtotal?: number;
}

class MeasurementService {
  async getAll(): Promise<MeasurementBulletin[]> {
    const res = await api.get('/measurements/all');
    return Array.isArray(res.data) ? res.data : [];
  }

  async getBulletins(): Promise<MeasurementBulletin[]> {
    const res = await api.get('/api/measurements/all');
    return Array.isArray(res.data) ? res.data : [];
  }

  async search(params: {
    status?: string;
    contractNumber?: string;
    clientId?: string;
    unitId?: string;
    periodStart?: string; // YYYY-MM-DD
    periodEnd?: string;   // YYYY-MM-DD
    page?: number;
    size?: number;
  }): Promise<{ content: MeasurementBulletin[] } | MeasurementBulletin[]> {
    const res = await api.get('/measurements/search', { params });
    return res.data;
  }
}

export const measurementService = new MeasurementService();