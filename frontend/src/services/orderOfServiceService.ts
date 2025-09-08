import { OrderOfService, CreateOrderOfServiceDTO } from '@/types/orderOfService';
import api from '@/lib/axios';

export const orderOfServiceService = {
  async listByEmployee(employeeId: number): Promise<OrderOfService[]> {
    const { data } = await api.get(`/api/orders-of-service?employeeId=${employeeId}`);
    return data;
  },
  
  async listAll(): Promise<OrderOfService[]> {
    const { data } = await api.get('/api/orders-of-service');
    return data;
  },
  
  async findById(id: number): Promise<OrderOfService> {
    const { data } = await api.get(`/api/orders-of-service/${id}`);
    return data;
  },
  
  async create(dto: CreateOrderOfServiceDTO): Promise<OrderOfService> {
    const { data } = await api.post('/api/orders-of-service', dto);
    return data;
  },
  
  async update(id: number, dto: CreateOrderOfServiceDTO): Promise<OrderOfService> {
    const { data } = await api.put(`/api/orders-of-service/${id}`, dto);
    return data;
  },
  
  async sign(orderId: number, signature: string): Promise<OrderOfService> {
    const { data } = await api.post(`/api/orders-of-service/${orderId}/sign`, { signature });
    return data;
  },
  
  async uploadDocument(orderId: number, file: File): Promise<OrderOfService> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post(`/api/orders-of-service/${orderId}/document`, formData);
    return data;
  },
  
  async getDocument(orderId: number): Promise<Blob> {
    const { data } = await api.get(`/api/orders-of-service/${orderId}/document`, { responseType: 'blob' });
    return data;
  },
  
  async delete(id: number): Promise<void> {
    await api.delete(`/api/orders-of-service/${id}`);
  },
  
  async getOrdersOfService(): Promise<OrderOfService[]> {
    const { data } = await api.get('/api/orders-of-service');
    return data;
  }
}; 