import api from '@/lib/axios';
import {
  BankAccount,
  BankStatement,
  BankReconciliation,
  ReconciliationItem,
  ReconciliationSummary,
  CreateBankAccountRequest,
  CreateReconciliationRequest,
  ImportStatementRequest,
  ReconciliationFilters,
  StatementFilters
} from '@/types/bankReconciliation';

export const bankReconciliationService = {
  // ===== CONTAS BANCÁRIAS =====
  
  // Buscar todas as contas bancárias
  async getBankAccounts(): Promise<BankAccount[]> {
    const response = await api.get('/api/financial/bank-accounts');
    return response.data;
  },

  // Buscar conta bancária por ID
  async getBankAccount(id: string): Promise<BankAccount> {
    const response = await api.get(`/api/financial/bank-accounts/${id}`);
    return response.data;
  },

  // Criar nova conta bancária
  async createBankAccount(data: CreateBankAccountRequest): Promise<BankAccount> {
    const response = await api.post('/api/financial/bank-accounts', data);
    return response.data;
  },

  // Atualizar conta bancária
  async updateBankAccount(id: string, data: Partial<CreateBankAccountRequest>): Promise<BankAccount> {
    const response = await api.put(`/api/financial/bank-accounts/${id}`, data);
    return response.data;
  },

  // Excluir conta bancária
  async deleteBankAccount(id: string): Promise<void> {
    await api.delete(`/api/financial/bank-accounts/${id}`);
  },

  // Ativar/Desativar conta bancária
  async toggleBankAccountStatus(id: string): Promise<BankAccount> {
    const response = await api.patch(`/api/financial/bank-accounts/${id}/toggle-status`);
    return response.data;
  },

  // ===== EXTRATOS BANCÁRIOS =====

  // Buscar extratos bancários
  async getBankStatements(filters: StatementFilters = {}): Promise<BankStatement[]> {
    const params = new URLSearchParams();
    
    if (filters.accountId) params.append('accountId', filters.accountId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.isReconciled !== undefined) params.append('isReconciled', filters.isReconciled.toString());
    if (filters.type) params.append('type', filters.type);
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.size !== undefined) params.append('size', filters.size.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortDir) params.append('sortDir', filters.sortDir);

    const response = await api.get(`/api/financial/bank-statements?${params.toString()}`);
    return response.data;
  },

  // Importar extrato bancário
  async importBankStatement(data: ImportStatementRequest): Promise<{ imported: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('accountId', data.accountId);
    formData.append('format', data.format);
    
    if (data.dateColumn) formData.append('dateColumn', data.dateColumn);
    if (data.descriptionColumn) formData.append('descriptionColumn', data.descriptionColumn);
    if (data.amountColumn) formData.append('amountColumn', data.amountColumn);
    if (data.typeColumn) formData.append('typeColumn', data.typeColumn);

    const response = await api.post('/api/financial/bank-statements/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Criar lançamento manual no extrato
  async createBankStatement(data: {
    accountId: string;
    date: string;
    description: string;
    amount: number;
    type: 'DEBIT' | 'CREDIT';
    reference?: string;
    category?: string;
  }): Promise<BankStatement> {
    const response = await api.post('/api/financial/bank-statements', data);
    return response.data;
  },

  // Atualizar lançamento do extrato
  async updateBankStatement(id: string, data: Partial<BankStatement>): Promise<BankStatement> {
    const response = await api.put(`/api/financial/bank-statements/${id}`, data);
    return response.data;
  },

  // Excluir lançamento do extrato
  async deleteBankStatement(id: string): Promise<void> {
    await api.delete(`/api/financial/bank-statements/${id}`);
  },

  // ===== CONCILIAÇÕES BANCÁRIAS =====

  // Buscar conciliações bancárias
  async getReconciliations(filters: ReconciliationFilters = {}): Promise<BankReconciliation[]> {
    const params = new URLSearchParams();
    
    if (filters.accountId) params.append('accountId', filters.accountId);
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.size !== undefined) params.append('size', filters.size.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortDir) params.append('sortDir', filters.sortDir);

    const response = await api.get(`/api/financial/reconciliations?${params.toString()}`);
    return response.data;
  },

  // Buscar conciliação por ID
  async getReconciliation(id: string): Promise<BankReconciliation> {
    const response = await api.get(`/api/financial/reconciliations/${id}`);
    return response.data;
  },

  // Criar nova conciliação
  async createReconciliation(data: CreateReconciliationRequest): Promise<BankReconciliation> {
    const response = await api.post('/api/financial/reconciliations', data);
    return response.data;
  },

  // Iniciar processo de conciliação automática
  async startAutoReconciliation(reconciliationId: string): Promise<BankReconciliation> {
    const response = await api.post(`/api/financial/reconciliations/${reconciliationId}/auto-reconcile`);
    return response.data;
  },

  // Confirmar item de conciliação
  async confirmReconciliationItem(reconciliationId: string, itemId: string): Promise<ReconciliationItem> {
    const response = await api.patch(`/api/financial/reconciliations/${reconciliationId}/items/${itemId}/confirm`);
    return response.data;
  },

  // Rejeitar item de conciliação
  async rejectReconciliationItem(reconciliationId: string, itemId: string, notes?: string): Promise<ReconciliationItem> {
    const response = await api.patch(`/api/financial/reconciliations/${reconciliationId}/items/${itemId}/reject`, { notes });
    return response.data;
  },

  // Criar ajuste manual
  async createManualAdjustment(reconciliationId: string, data: {
    description: string;
    amount: number;
    type: 'DEBIT' | 'CREDIT';
    notes?: string;
  }): Promise<ReconciliationItem> {
    const response = await api.post(`/api/financial/reconciliations/${reconciliationId}/adjustments`, data);
    return response.data;
  },

  // Finalizar conciliação
  async completeReconciliation(reconciliationId: string, notes?: string): Promise<BankReconciliation> {
    const response = await api.patch(`/api/financial/reconciliations/${reconciliationId}/complete`, { notes });
    return response.data;
  },

  // Cancelar conciliação
  async cancelReconciliation(reconciliationId: string, reason?: string): Promise<BankReconciliation> {
    const response = await api.patch(`/api/financial/reconciliations/${reconciliationId}/cancel`, { reason });
    return response.data;
  },

  // ===== RELATÓRIOS E ESTATÍSTICAS =====

  // Buscar resumo das conciliações
  async getReconciliationSummary(accountId?: string, startDate?: string, endDate?: string): Promise<ReconciliationSummary> {
    const params = new URLSearchParams();
    if (accountId) params.append('accountId', accountId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get(`/api/financial/reconciliations/summary?${params.toString()}`);
    return response.data;
  },

  // Exportar relatório de conciliação
  async exportReconciliationReport(reconciliationId: string, format: 'PDF' | 'EXCEL'): Promise<Blob> {
    const response = await api.get(`/api/financial/reconciliations/${reconciliationId}/export`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  },

  // Buscar diferenças não conciliadas
  async getUnreconciledDifferences(accountId: string, startDate?: string, endDate?: string): Promise<{
    bankOnly: BankStatement[];
    systemOnly: any[];
    totalDifference: number;
  }> {
    const params = new URLSearchParams();
    params.append('accountId', accountId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get(`/api/financial/reconciliations/unreconciled-differences?${params.toString()}`);
    return response.data;
  }
};

export default bankReconciliationService;