import api from '@/lib/axios';

export interface EmployeeChangeHistoryItem {
  id: string;
  employeeId: string;
  changedAt: string;
  changedByUserId?: string;
  changedByUserName?: string;
  category: string;
  categoryLabel: string;
  fieldName: string;
  fieldLabel: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}

export interface EmployeeChangeHistoryPage {
  content: EmployeeChangeHistoryItem[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface ChangeHistoryFilters {
  dateFrom?: string; // ISO instant
  dateTo?: string;
  category?: string;
  changedByUserId?: string;
}

export const employeeChangeHistoryService = {
  async getByEmployeeId(
    employeeId: string,
    page = 0,
    size = 20,
    filters?: ChangeHistoryFilters
  ): Promise<EmployeeChangeHistoryPage> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('size', String(size));
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    if (filters?.category) params.set('category', filters.category);
    if (filters?.changedByUserId) params.set('changedByUserId', filters.changedByUserId);
    const { data } = await api.get<EmployeeChangeHistoryPage>(
      `/api/employees/${employeeId}/change-history?${params.toString()}`
    );
    return data;
  },
};
