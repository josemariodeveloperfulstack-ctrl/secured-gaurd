import api from '@/lib/axios';

export interface Employee {
  id: string;
  name: string;
  cpf?: string;
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
   * Buscar funcionários por status
   */
  async getEmployeesByStatus(status: string): Promise<Employee[]> {
    try {
      console.log(`[EmployeeService] Buscando funcionários com status: ${status}`);
      const response = await api.get(`/api/employees/status/${status.toUpperCase()}`);
      console.log(`[EmployeeService] Resposta recebida:`, response.data);
      
      if (!response.data) {
        console.warn('[EmployeeService] Resposta vazia do backend');
        return [];
      }
      
      // Garantir que seja um array
      const employees = Array.isArray(response.data) ? response.data : [];
      console.log(`[EmployeeService] ${employees.length} funcionários encontrados`);
      
      return employees;
    } catch (error: any) {
      console.error('[EmployeeService] Erro ao buscar funcionários por status:', error);
      console.error('[EmployeeService] Status do erro:', error.response?.status);
      console.error('[EmployeeService] Mensagem do erro:', error.response?.data);
      return [];
    }
  },

  /**
   * Buscar funcionário por CPF exato (normalizado)
   */
  async searchEmployeeByCpf(cpf: string): Promise<Employee | null> {
    try {
      // Normalizar CPF (remover caracteres não numéricos)
      const normalizedCpf = cpf.replace(/\D/g, '');
      if (!normalizedCpf || normalizedCpf.length < 11) {
        return null;
      }
      
      const response = await api.get(`/api/employees/search/cpf/${normalizedCpf}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Funcionário não encontrado - não é erro
        return null;
      }
      console.error('Erro ao buscar funcionário por CPF:', error);
      return null;
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
  },

  /**
   * Criar novo funcionário
   */
  async createEmployee(employeeData: any): Promise<Employee> {
    try {
      // Converter bankData para bankInfo se existir
      const payload = { ...employeeData };
      if (payload.bankData) {
        payload.bankInfo = {
          bank: payload.bankData.bank || '',
          agency: payload.bankData.agency || '',
          account: payload.bankData.account || '',
          accountType: payload.bankData.type || 'CORRENTE'
        };
        delete payload.bankData;
      }
      
      const response = await api.post('/api/employees', payload);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao criar funcionário:', error);
      throw new Error(error.response?.data?.message || 'Erro ao criar funcionário');
    }
  },

  /**
   * Atualizar funcionário existente
   */
  async updateEmployee(id: string, employeeData: any): Promise<Employee> {
    try {
      // Converter bankData para bankInfo se existir
      const payload = { ...employeeData };
      if (payload.bankData) {
        payload.bankInfo = {
          bank: payload.bankData.bank || '',
          agency: payload.bankData.agency || '',
          account: payload.bankData.account || '',
          accountType: payload.bankData.type || 'CORRENTE'
        };
        delete payload.bankData;
      }
      
      const response = await api.put(`/api/employees/${id}`, payload);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao atualizar funcionário:', error);
      throw new Error(error.response?.data?.message || 'Erro ao atualizar funcionário');
    }
  }
};

export default employeeService;