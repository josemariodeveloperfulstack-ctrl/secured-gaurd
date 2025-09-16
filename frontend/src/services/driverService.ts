import api from '@/lib/axios';
import { Driver } from '@/types/driver';

export interface CreateDriverDTO {
  name: string;
  licenseNumber?: string;
  status?: 'ATIVO' | 'INATIVO';
}

const driverService = {
  async getDrivers(): Promise<Driver[]> {
    const response = await api.get('/drivers');
    return response.data;
  },

  async getDriver(id: string): Promise<Driver> {
    const response = await api.get(`/drivers/${id}`);
    return response.data;
  },

  async createDriver(data: CreateDriverDTO): Promise<Driver> {
    const response = await api.post('/drivers', data);
    return response.data;
  },

  async updateDriver(id: string, data: CreateDriverDTO): Promise<Driver> {
    const response = await api.put(`/drivers/${id}`, data);
    return response.data;
  },

  async deactivateDriver(id: string): Promise<void> {
    await api.patch(`/drivers/${id}/deactivate`);
  },

  async deleteDriver(id: string): Promise<void> {
    await api.delete(`/drivers/${id}`);
  },
};

export default driverService; 