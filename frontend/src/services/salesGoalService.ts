import api from '@/lib/axios';
import { withConnectionRetry } from '@/utils/requestRetry';

export interface SalesGoal {
  id: string;
  userId?: string;
  userName?: string;
  type: 'REVENUE' | 'CONTRACTS';
  targetValue: number;
  currentValue: number;
  progressPercent: number;
  period: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  referenceMonth: number;
  referenceYear: number;
  description?: string;
  createdById?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalesGoalRequest {
  userId?: string;
  type: 'REVENUE' | 'CONTRACTS';
  targetValue: number;
  period: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  referenceMonth: number;
  referenceYear: number;
  description?: string;
}

export const salesGoalService = {
  async getAll(year?: number, month?: number): Promise<SalesGoal[]> {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    const query = params.toString();
    const url = query ? `/api/sales-goals?${query}` : '/api/sales-goals';
    const { data } = await api.get(url);
    return data;
  },

  async getById(id: string): Promise<SalesGoal> {
    const { data } = await api.get(`/api/sales-goals/${id}`);
    return data;
  },

  async getByUser(userId: string): Promise<SalesGoal[]> {
    const { data } = await api.get(`/api/sales-goals/user/${userId}`);
    return data;
  },

  async getProgress(month: number, year: number): Promise<SalesGoal[]> {
    return withConnectionRetry(async () => {
      const { data } = await api.get(`/sales-goals/progress?month=${month}&year=${year}`);
      return data;
    });
  },

  async create(goal: CreateSalesGoalRequest): Promise<SalesGoal> {
    const { data } = await api.post('/api/sales-goals', goal);
    return data;
  },

  async update(id: string, goal: CreateSalesGoalRequest): Promise<SalesGoal> {
    const { data } = await api.put(`/api/sales-goals/${id}`, goal);
    return data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/sales-goals/${id}`);
  },
};
