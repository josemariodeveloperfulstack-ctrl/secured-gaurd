import api from '@/lib/axios';

export interface Department {
  id: string;
  name: string;
  description?: string;
  emailDomain?: string;
  managerId?: string;
  isActive?: boolean;
}

/** Nomes que não devem aparecer como departamento (dados legados/incorretos). */
const INVALID_DEPARTMENT_NAMES = new Set([
  'SOLTEIRO',
  'CASADO',
  'DIVORCIADO',
  'VIUVO',
  'VIÚVO',
  'UNIAO ESTAVEL',
  'UNIÃO ESTÁVEL',
  'SEPARADO',
  'OUTROS',
]);

export function filterCompanyDepartments(departments: Department[]): Department[] {
  return departments.filter((department) => {
    const name = department.name?.trim().toUpperCase() ?? '';
    return name.length > 0 && !INVALID_DEPARTMENT_NAMES.has(name);
  });
}

export const departmentService = {
  async listActive(): Promise<Department[]> {
    const { data } = await api.get('/api/departments/active');
    return data;
  },
  async listAll(): Promise<Department[]> {
    const { data } = await api.get('/api/departments');
    return data;
  },
  async create(payload: Omit<Department, 'id'>): Promise<Department> {
    const { data } = await api.post('/api/departments', payload);
    return data;
  },
  async update(id: string, payload: Partial<Department>): Promise<Department> {
    const { data } = await api.put(`/api/departments/${id}`, payload);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/api/departments/${id}`);
  },
};

export default departmentService;


