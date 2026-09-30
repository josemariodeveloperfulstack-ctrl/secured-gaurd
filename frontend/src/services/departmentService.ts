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

/**
 * Valida se um nome é um setor de trabalho legítimo.
 * Rejeita: estado civil, nomes de empresa (CNPJ/SA/LTDA), strings muito longas.
 */
export function isValidSectorName(name: string): boolean {
  if (!name || name.trim().length === 0) return false;
  const upper = name.trim().toUpperCase();

  // Rejeitar estado civil e outros dados inválidos conhecidos
  if (INVALID_DEPARTMENT_NAMES.has(upper)) return false;

  // Rejeitar strings que parecem nomes de empresa (contêm padrões de CNPJ / sufixos jurídicos)
  const empresaSuffixes = [' SA', ' S.A', ' S/A', ' LTDA', ' ME ', ' EPP', ' EIRELI', ' SS '];
  if (empresaSuffixes.some(s => upper.includes(s))) return false;

  // Rejeitar strings muito longas (setores geralmente são curtos)
  if (name.trim().length > 60) return false;

  // Rejeitar se contiver números de CNPJ (padrão: XX.XXX.XXX/XXXX-XX)
  if (/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/.test(name)) return false;

  return true;
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


