import api from '@/lib/axios';

export interface Employee {
  id: string;
  name: string;
  document?: string;
  birthDate?: string;
  registrationNumber?: string;
  hireDate?: string;
  terminationDate?: string;
  status?: string;
  notes?: string;
  address?: string;
  phone?: string;
  email?: string;
  cnhNumber?: string;
  ctps?: string;
  cbo?: string;
  pis?: string;
  salario?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SimpleEmployee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  document?: string;
}

export const employeeService = {
  /**
   * Buscar todos os funcionários
   */
  async getAllEmployees(): Promise<Employee[]> {
    try {
      const response = await api.get('/api/employees');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
      return [];
    }
  },

  /**
   * Buscar funcionários simplificados para seleção
   */
  async getSimpleEmployees(): Promise<SimpleEmployee[]> {
    try {
      const response = await api.get('/api/employees/basic');
      const data = response.data;
      
      if (data && data.employees) {
        return data.employees.map((emp: any) => ({
          id: emp.id,
          name: emp.name,
          email: emp.email,
          phone: emp.phone,
          document: emp.document
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Erro ao buscar funcionários simplificados:', error);
      return [];
    }
  },

  /**
   * Buscar funcionário por ID
   */
  async getEmployeeById(id: string): Promise<Employee | null> {
    try {
      const response = await api.get(`/api/employees/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar funcionário:', error);
      return null;
    }
  },

  /**
   * Buscar funcionários por nome
   */
  async searchEmployeesByName(name: string): Promise<Employee[]> {
    try {
      const response = await api.get(`/api/employees/search/name?name=${encodeURIComponent(name)}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar funcionários por nome:', error);
      return [];
    }
  },

  /**
   * Buscar funcionários por termo (nome ou documento)
   */
  async searchEmployees(query: string): Promise<Employee[]> {
    try {
      const response = await api.get(`/api/employees/search?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
      return [];
    }
  },

  /**
   * Buscar funcionários simplificados por termo
   */
  async searchSimpleEmployees(query: string): Promise<SimpleEmployee[]> {
    try {
      const response = await api.get(`/api/employees/search/simple?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar funcionários simplificados:', error);
      return [];
    }
  }
};

export default employeeService;