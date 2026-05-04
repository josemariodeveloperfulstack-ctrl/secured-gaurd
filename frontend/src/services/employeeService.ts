import api from '@/lib/axios';

export interface EmployeeWorkPost {
  id: string;
  name?: string;
}

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
  ctpsSeries?: string;
  cbo?: string;
  pis?: string;
  nationality?: string;
  maritalStatus?: string;
  salario?: number;
  createdAt?: string;
  updatedAt?: string;
  rg?: string;
  nomePai?: string;
  nomeMae?: string;
  workPost?: EmployeeWorkPost;
  workPostId?: string;
  /** Preenchido em /api/employees/birthdays */
  birthDayOfMonth?: number;
  ageTurning?: number;
  position?: { id?: string; name?: string };
  unit?: { id?: string; name?: string };
  company?: { id?: string; sigla?: string };
  department?: { id?: string; name?: string };
}

export interface BirthdaysByMonthResult {
  month: number;
  referenceYear: number;
  count: number;
  employees: Employee[];
}

export interface SimpleEmployee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  document?: string;
  cpf?: string;
  address?: string;
  registrationNumber?: string;
  hireDate?: string;
  terminationDate?: string;
  rg?: string;
  companyId?: string;
  companySigla?: string;
  positionName?: string;
  unitName?: string;
  departmentName?: string;
  workPostName?: string;
  workPostId?: string;
}

export interface EmployeeFilters {
  searchTerm?: string;
  status?: string;
  companyId?: string;
  unitId?: string;
  workPostId?: string;
  /** Ordenação no servidor (lista paginada): admissão ou demissão mais recente primeiro com sortDir desc */
  sortBy?: 'hireDate' | 'terminationDate';
  sortDir?: 'asc' | 'desc';
}

export const employeeService = {
  /**
   * Buscar todos os funcionários (paginado - até 500 por página)
   */
  async getAllEmployees(filters?: EmployeeFilters, page = 0, size = 500): Promise<Employee[]> {
    try {
      const params: any = { page, size };
      if (filters?.searchTerm && filters.searchTerm.trim()) {
        params.searchTerm = filters.searchTerm.trim();
      }
      if (filters?.status && filters.status !== 'all') {
        params.status = filters.status; // Enviado para API filtrar no backend (ACTIVE, TERMINATED, etc.)
      }
      if (filters?.companyId && filters.companyId !== 'all') {
        params.companyId = filters.companyId;
      }
      if (filters?.unitId && filters.unitId !== 'all') {
        params.unitId = filters.unitId;
      }
      if (filters?.workPostId && filters.workPostId !== 'all') {
        params.workPostId = filters.workPostId;
      }
      if (filters?.sortBy && filters?.sortDir) {
        params.sortBy = filters.sortBy;
        params.sortDir = filters.sortDir;
      }

      const response = await api.get('/api/employees/paged', { params });
      const employees = response.data || [];
      return employees.map((e: any) => this.normalizeEmployee(e));
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
      return [];
    }
  },

  /**
   * Obter estatísticas de funcionários (total, ativos, férias, demitidos/suspensos).
   * Se companyId for informado, retorna estatísticas da empresa.
   */
  async getEmployeesStats(companyId?: string): Promise<{
    total: number;
    active: number;
    vacation: number;
    medicalCertificate: number;
    terminated: number;
    suspended: number;
  }> {
    try {
      const params = companyId && companyId !== 'all' ? { companyId } : {};
      const response = await api.get('/api/employees/stats', { params });
      const d = response.data ?? {};
      return {
        total: Number(d.total ?? 0),
        active: Number(d.active ?? 0),
        vacation: Number(d.vacation ?? 0),
        medicalCertificate: Number(d.medicalCertificate ?? 0),
        terminated: Number(d.terminated ?? 0),
        suspended: Number(d.suspended ?? 0),
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas de funcionários:', error);
      return { total: 0, active: 0, vacation: 0, medicalCertificate: 0, terminated: 0, suspended: 0 };
    }
  },

  /**
   * Obter contagem total de funcionários no sistema
   */
  async getEmployeesCount(): Promise<number> {
    try {
      const response = await api.get('/api/employees/count');
      return response.data?.count ?? 0;
    } catch (error) {
      console.error('Erro ao obter contagem de funcionários:', error);
      return 0;
    }
  },

  /**
   * Aniversariantes do mês (RH / Departamento Pessoal).
   */
  async getBirthdaysByMonth(params: {
    month: number;
    onlyActive?: boolean;
    referenceYear?: number;
    companyId?: string;
  }): Promise<BirthdaysByMonthResult> {
    const query: Record<string, string | number | boolean> = {
      month: params.month,
      onlyActive: params.onlyActive !== false,
    };
    if (params.referenceYear != null) query.referenceYear = params.referenceYear;
    if (params.companyId && params.companyId !== 'all') query.companyId = params.companyId;

    const response = await api.get('/api/employees/birthdays', { params: query });
    const d = response.data ?? {};
    const raw = Array.isArray(d.employees) ? d.employees : [];
    const employees = raw
      .map((e: any) => this.normalizeEmployee(e))
      .filter((e: Employee | null): e is Employee => e != null);

    return {
      month: Number(d.month ?? params.month),
      referenceYear: Number(d.referenceYear ?? new Date().getFullYear()),
      count: Number(d.count ?? employees.length),
      employees,
    };
  },

  /**
   * Buscar funcionários com filtros
   */
  async getEmployees(filters?: {
    registrationNumber?: string;
    positionId?: string;
    positionDescription?: string;
    unitId?: string;
    status?: string;
  }): Promise<Employee[]> {
    try {
      console.log('[EmployeeService] getEmployees chamado com filtros:', filters);
      const params: any = {};
      if (filters?.registrationNumber) params.registrationNumber = filters.registrationNumber;
      if (filters?.positionId) params.positionId = filters.positionId;
      if (filters?.positionDescription) params.positionDescription = filters.positionDescription;
      if (filters?.unitId) params.unitId = filters.unitId;
      if (filters?.status) params.status = filters.status;

      console.log('[EmployeeService] Parâmetros da requisição:', params);
      const response = await api.get('/api/employees', { params });
      console.log('[EmployeeService] Resposta recebida:', response.data?.length || 0, 'funcionários');
      return response.data || [];
    } catch (error) {
      console.error('[EmployeeService] Erro ao buscar funcionários com filtros:', error);
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
          document: emp.document,
          workPostId: emp.workPostId || emp.workPost?.id,
          workPostName: emp.workPostName || emp.workPost?.name
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
      return this.normalizeEmployee(response.data);
    } catch (error) {
      console.error('Erro ao buscar funcionário:', error);
      return null;
    }
  },

  /**
   * Normaliza dados do funcionário do backend para o frontend
   */
  normalizeEmployee(data: any): Employee | null {
    if (!data) return null;

    // Criar cópia para não mutar o original se necessário
    const employee = { ...data };

    // Mapear bankInfo (backend) para bankData (frontend) se necessário
    if (data.bankInfo && !data.bankData) {
      employee.bankData = {
        bank: data.bankInfo.bank || '',
        agency: data.bankInfo.agency || '',
        account: data.bankInfo.account || '',
        accountDigit: data.bankInfo.accountDigit || '',
        type: data.bankInfo.accountType || 'CORRENTE',
        chavePix: data.bankInfo.pixKey || data.bankInfo.chavePix || ''
      };
    }

    // Mapear pai/mae para nomePai/nomeMae (compatibilidade com planilhas e DTOs variados)
    if (data.pai && !data.nomePai) employee.nomePai = data.pai;
    if (data.mae && !data.nomeMae) employee.nomeMae = data.mae;
    // Mapear work_post para workPost (snake_case -> camelCase)
    if (data.work_post && !data.workPost) {
      employee.workPost = data.work_post;
    }
    
    // Suporte para quando workPost vem apenas como ID em formato string
    if (typeof employee.workPost === 'string') {
      const id = employee.workPost;
      employee.workPost = { id, name: data.workPostName || data.work_post_name || data.department?.name || '' };
    }

    // Se workPost existe mas não tem nome, tentar buscar em outros lugares
    if (employee.workPost && !employee.workPost.name) {
      const foundName = data.workPostName || data.work_post_name || data.department?.name || (data as any).nomePosto;
      if (foundName) {
        employee.workPost.name = foundName;
      }
    }

    // Garantir que workPostId esteja sincronizado
    if (employee.workPost?.id && !employee.workPostId) {
      employee.workPostId = employee.workPost.id;
    } else if (data.work_post_id && !employee.workPostId) {
      employee.workPostId = data.work_post_id;
    }

    // Mapear array de work_posts se existir
    if (data.work_posts && !data.workPosts) {
      employee.workPosts = data.work_posts;
    }

    // Garantir que campos de data estão em formato string ISO ou similar
    return employee as Employee;
  },

  /**
   * Exportar dados completos de funcionários por IDs
   */
  async getFullDataForExport(ids: string[]): Promise<any[]> {
    try {
      const response = await api.post('/api/employees/export-full', { ids });
      return response.data || [];
    } catch (error) {
      console.error('Erro ao buscar dados completos para exportação:', error);
      return [];
    }
  },

  /**
   * Buscar funcionários por nome
   */
  async searchEmployeesByName(name: string): Promise<Employee[]> {
    try {
      const response = await api.get(`/api/employees/search/name?name=${encodeURIComponent(name)}`);
      const employees = response.data || [];
      return employees.map((e: any) => this.normalizeEmployee(e));
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
      const employees = response.data || [];
      return employees.map((e: any) => this.normalizeEmployee(e));
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
      
      const rawEmployees = Array.isArray(response.data) ? response.data : [];
      return rawEmployees.map((e: any) => this.normalizeEmployee(e));
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

      // Endpoint disponível no backend: /api/employees/search?q=
      const response = await api.get(`/api/employees/search?q=${encodeURIComponent(normalizedCpf)}`);
      const employees = Array.isArray(response.data) ? response.data : [];
      const exact = employees.find((emp: any) => {
        const empCpf = (emp.document || emp.cpf || '').replace(/\D/g, '');
        return empCpf === normalizedCpf;
      });
      return exact ? this.normalizeEmployee(exact) : (employees[0] ? this.normalizeEmployee(employees[0]) : null);
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
          accountDigit: payload.bankData.accountDigit || '',
          accountType: payload.bankData.type || 'CORRENTE',
          pixKey: payload.bankData.chavePix || ''
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
          accountDigit: payload.bankData.accountDigit || '',
          accountType: payload.bankData.type || 'CORRENTE',
          pixKey: payload.bankData.chavePix || ''
        };
        delete payload.bankData;
      }

      const response = await api.put(`/api/employees/${id}`, payload);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao atualizar funcionário:', error);
      throw new Error(error.response?.data?.message || 'Erro ao atualizar funcionário');
    }
  },

  /**
   * Atualizar status do funcionário
   */
  async updateEmployeeStatus(id: string, status: string): Promise<Employee> {
    try {
      const response = await api.patch(`/api/employees/${id}/status`, null, {
        params: { status }
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao atualizar status do funcionário:', error);
      throw new Error(error.response?.data?.message || 'Erro ao atualizar status do funcionário');
    }
  },

  /**
   * Gerar PDF do histórico completo do funcionário (postos, alterações, ASO, treinamentos)
   */
  async generateEmployeeHistoryPdf(id: string): Promise<Blob> {
    try {
      const response = await api.get(`/api/employees/${id}/generate-history-pdf`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao gerar PDF do histórico:', error);
      throw new Error(error.response?.data?.message || 'Erro ao gerar PDF do histórico');
    }
  },

  /**
   * Gerar PDF da ficha de registro do funcionário
   */
  async generateEmployeeRecordPdf(id: string): Promise<Blob> {
    try {
      const response = await api.get(`/api/employees/${id}/generate-record-pdf`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao gerar PDF da ficha de registro:', error);
      throw new Error(error.response?.data?.message || 'Erro ao gerar PDF da ficha de registro');
    }
  },

  /**
   * Gerar PDF do relatório detalhado de funcionários (mesmo layout do Relatório de Veículos).
   * companyId opcional (quando filtro "Todas as Empresas", o backend usa empresa dos funcionários ou primeira ativa).
   * employeeIds opcional (lista vazia = todos).
   * columns opcional (lista de colunas a exibir no PDF; se vazia, usa padrão).
   */
  async exportEmployeesReportPdf(
    companyId: string | null | undefined,
    employeeIds: string[],
    columns?: string[],
    groupBy?: 'FUNCIONARIO' | 'POSTO_TRABALHO',
    orderBy?: 'FUNCIONARIO' | 'POSTO_TRABALHO'
  ): Promise<Blob> {
    try {
      const response = await api.post(
        '/api/employees/report/pdf',
        {
          companyId: companyId || null,
          employeeIds: employeeIds || [],
          columns: columns && columns.length > 0 ? columns : undefined,
          groupBy: groupBy || null,
          orderBy: orderBy || null,
        },
        { responseType: 'blob' }
      );
      if (response.data instanceof Blob && response.data.type === 'application/json') {
        const text = await response.data.text();
        const err = JSON.parse(text);
        throw new Error(err.message || err.error || 'Erro ao gerar relatório PDF');
      }
      return response.data;
    } catch (error: any) {
      if (error.response?.data instanceof Blob && error.response.data.type === 'application/json') {
        try {
          const text = await error.response.data.text();
          const err = JSON.parse(text);
          throw new Error(err.message || err.error || 'Erro ao gerar relatório PDF');
        } catch (parseError: any) {
          // Re-throw if it's already our parsed error
          if (parseError instanceof Error && parseError.message !== 'Erro ao processar resposta do servidor') {
            throw parseError;
          }
          throw new Error('Erro ao processar resposta do servidor');
        }
      }
      console.error('Erro ao gerar relatório PDF:', error?.response?.status, error?.message);
      throw error;
    }
  },

  /**
   * Gerar Excel da ficha de registro do funcionário
   */
  async generateEmployeeRecordExcel(id: string): Promise<Blob> {
    try {
      const response = await api.get(`/api/employees/${id}/generate-record-excel`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao gerar Excel da ficha de registro:', error);
      throw new Error(error.response?.data?.message || 'Erro ao gerar Excel da ficha de registro');
    }
  },

  /**
   * Importar funcionários de planilha Excel
   */
  async importEmployeesFromExcel(file: File): Promise<{
    success: boolean;
    created: number;
    updated: number;
    errors: string[];
    warnings: string[];
    message: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/api/employees/import/excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutos
      });

      return response.data;
    } catch (error: any) {
      console.error('Erro ao importar funcionários:', error);
      throw new Error(error.response?.data?.message || 'Erro ao importar funcionários');
    }
  },

  /**
   * Atualizar status de múltiplos funcionários em lote
   */
  async bulkUpdateStatus(ids: string[], status: string): Promise<void> {
    try {
      await api.post('/api/employees/bulk-status', { ids, status });
    } catch (error: any) {
      console.error('Erro ao atualizar status em lote:', error);
      throw new Error(error.response?.data?.message || 'Erro ao atualizar status em lote');
    }
  },

  /**
   * Demitir múltiplos funcionários em lote
   */
  async bulkTerminate(ids: string[], terminationDate: string): Promise<void> {
    try {
      await api.post('/api/employees/bulk-terminate', { ids, terminationDate });
    } catch (error: any) {
      console.error('Erro ao demitir em lote:', error);
      throw new Error(error.response?.data?.message || 'Erro ao demitir em lote');
    }
  },

  /**
   * Excluir múltiplos funcionários em lote
   */
  async bulkDeleteEmployees(ids: string[]): Promise<void> {
    try {
      await api.post('/api/employees/bulk-delete', { ids });
    } catch (error: any) {
      console.error('Erro ao excluir em lote:', error);
      throw new Error(error.response?.data?.message || 'Erro ao excluir em lote');
    }
  },

  /**
   * Excluir um funcionário
   */
  async deleteEmployee(id: string): Promise<void> {
    try {
      await api.delete(`/api/employees/${id}`);
    } catch (error: any) {
      console.error('Erro ao excluir funcionário:', error);
      throw new Error(error.response?.data?.message || 'Erro ao excluir funcionário');
    }
  },

  /**
   * Verificar dependências que impedem a exclusão
   */
  async checkDeletionDependencies(id: string): Promise<{
    hasDependencies: boolean;
    dependentsCount: number;
    documentsCount: number;
    generatedDocsCount: number;
    messages: string[];
  }> {
    try {
      const messages: string[] = [];
      let hasDependencies = false;

      // Buscar dependências em paralelo
      const [dependents, documents, generatedDocs] = await Promise.all([
        api.get(`/dependents/employee/${id}`).then(res => res.data).catch(() => []),
        api.get(`/documents/employee/${id}`).then(res => res.data).catch(() => []),
        api.get(`/documentos-gerados/funcionario/${id}`).then(res => res.data).catch(() => [])
      ]);

      const dependentsCount = Array.isArray(dependents) ? dependents.length : 0;
      const documentsCount = Array.isArray(documents) ? documents.length : 0;
      const generatedDocsCount = Array.isArray(generatedDocs) ? generatedDocs.length : 0;

      if (dependentsCount > 0) {
        hasDependencies = true;
        messages.push(`Possui ${dependentsCount} dependente(s) cadastrado(s).`);
      }
      if (documentsCount > 0) {
        hasDependencies = true;
        messages.push(`Possui ${documentsCount} documento(s) anexado(s).`);
      }
      if (generatedDocsCount > 0) {
        hasDependencies = true;
        messages.push(`Possui ${generatedDocsCount} documento(s) gerado(s).`);
      }

      return {
        hasDependencies,
        dependentsCount,
        documentsCount,
        generatedDocsCount,
        messages
      };
    } catch (error) {
      console.error('Erro ao verificar dependências:', error);
      return {
        hasDependencies: false,
        dependentsCount: 0,
        documentsCount: 0,
        generatedDocsCount: 0,
        messages: []
      };
    }
  }
  ,

  /**
   * Excluir dependências que impedem a exclusão (dependentes, documentos anexados e documentos gerados)
   * ATENÇÃO: ação irreversível.
   */
  async deleteDeletionDependencies(id: string): Promise<{
    deletedDependents: number;
    deletedDocuments: number;
    deletedGeneratedDocs: number;
  }> {
    const [dependents, documents] = await Promise.all([
      api.get(`/dependents/employee/${id}`).then(res => res.data).catch(() => []),
      api.get(`/documents/employee/${id}`).then(res => res.data).catch(() => []),
    ]);

    const dependentsArr = Array.isArray(dependents) ? dependents : [];
    const documentsArr = Array.isArray(documents) ? documents : [];

    // Dependentes
    await Promise.allSettled(
      dependentsArr
        .map((d: any) => d?.id)
        .filter(Boolean)
        .map((depId: string) => api.delete(`/dependents/${depId}`))
    );

    // Documentos anexados
    await Promise.allSettled(
      documentsArr
        .map((d: any) => d?.id)
        .filter(Boolean)
        .map((docId: string) => api.delete(`/api/documents/${docId}`))
    );

    // Documentos gerados (endpoint novo no backend)
    let deletedGeneratedDocs = 0;
    try {
      const res = await api.delete(`/api/documentos-gerados/funcionario/${id}`);
      deletedGeneratedDocs = res.data?.deleted ?? 0;
    } catch {
      // se falhar, a exclusão do funcionário provavelmente vai continuar bloqueada; tratamos no caller
      deletedGeneratedDocs = 0;
    }

    return {
      deletedDependents: dependentsArr.length,
      deletedDocuments: documentsArr.length,
      deletedGeneratedDocs,
    };
  }
};

export default employeeService;