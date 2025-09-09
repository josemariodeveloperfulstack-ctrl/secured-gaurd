import api from '@/lib/axios';

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  balance: number;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankFile {
  id: string;
  fileName: string;
  fileType: 'PDF' | 'CSV' | 'EXCEL';
  bankName: string;
  accountNumber: string;
  period: string;
  status: 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  totalRecords: number;
  matchedRecords: number;
  unmatchedRecords: number;
  fileSize: string;
  description: string;
  errorMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransaction {
  id: string;
  bankFileId: string;
  transactionDate: string;
  description: string;
  amount: number;
  balance: number;
  status: 'PENDING' | 'MATCHED' | 'UNMATCHED' | 'MANUAL_REVIEW';
  referenceNumber: string;
  category: string;
  notes: string;
  systemTransactionId: string;
  systemTransactionType: string;
  reconciliationDate: string;
  reconciliationUser: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankFileStatistics {
  totalFiles: number;
  completedFiles: number;
  processingFiles: number;
  errorFiles: number;
}

export interface BankTransactionStatistics {
  totalTransactions: number;
  matchedTransactions: number;
  unmatchedTransactions: number;
}

export interface CreateBankAccountRequest {
  bankName: string;
  accountNumber: string;
  accountType?: string;
  balance?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  description?: string;
}

export interface UploadBankFileRequest {
  file: File;
  bankName: string;
  accountNumber: string;
  period: string;
  description?: string;
}

class BankReconciliationService {
  // ===== BANK ACCOUNTS =====
  
  async getBankAccounts(): Promise<BankAccount[]> {
    const response = await api.get('/api/bank-reconciliation/accounts');
    return response.data;
  }
  
  async getBankAccountById(id: string): Promise<BankAccount> {
    const response = await api.get(`/api/bank-reconciliation/accounts/${id}`);
    return response.data;
  }
  
  async createBankAccount(data: CreateBankAccountRequest): Promise<BankAccount> {
    const response = await api.post('/api/bank-reconciliation/accounts', data);
    return response.data;
  }
  
  // ===== BANK FILES =====
  
  async getBankFiles(page?: number, size?: number): Promise<{ content: BankFile[], totalElements: number, totalPages: number }> {
    const params = new URLSearchParams();
    if (page !== undefined) params.append('page', page.toString());
    if (size !== undefined) params.append('size', size.toString());
    
    const response = await api.get(`/api/bank-reconciliation/files?${params.toString()}`);
    return response.data;
  }
  
  async getAllBankFiles(): Promise<BankFile[]> {
    const response = await api.get('/api/bank-reconciliation/files/all');
    return response.data;
  }
  
  async getBankFileById(id: string): Promise<BankFile> {
    const response = await api.get(`/api/bank-reconciliation/files/${id}`);
    return response.data;
  }
  
  async uploadBankFile(data: UploadBankFileRequest): Promise<BankFile> {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('bankName', data.bankName);
    formData.append('accountNumber', data.accountNumber);
    formData.append('period', data.period);
    if (data.description) {
      formData.append('description', data.description);
    }
    
    const response = await api.post('/api/bank-reconciliation/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
  
  async deleteBankFile(id: string): Promise<void> {
    await api.delete(`/api/bank-reconciliation/files/${id}`);
  }
  
  // ===== BANK TRANSACTIONS =====
  
  async getTransactionsByFileId(fileId: string): Promise<BankTransaction[]> {
    const response = await api.get(`/api/bank-reconciliation/files/${fileId}/transactions`);
    return response.data;
  }
  
  async getTransactionsByStatus(status: string): Promise<BankTransaction[]> {
    const response = await api.get(`/api/bank-reconciliation/transactions/status/${status}`);
    return response.data;
  }
  
  // ===== STATISTICS =====
  
  async getFileStatistics(): Promise<BankFileStatistics> {
    const response = await api.get('/api/bank-reconciliation/statistics/files');
    return response.data;
  }
  
  async getTransactionStatistics(): Promise<BankTransactionStatistics> {
    const response = await api.get('/api/bank-reconciliation/statistics/transactions');
    return response.data;
  }
  
  // ===== REPORTS =====
  
  async generateFileReport(fileId: string, statusFilter?: string): Promise<Blob> {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'ALL') {
      params.append('status', statusFilter);
    }
    
    const response = await api.get(`/api/bank-reconciliation/reports/file/${fileId}?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  }
  
  async generateSummaryReport(startDate?: string, endDate?: string, bankName?: string): Promise<Blob> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (bankName) params.append('bankName', bankName);
    
    const response = await api.get(`/api/bank-reconciliation/reports/summary?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  }
  
  // ===== UTILITY METHODS =====
  
  downloadReport(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const bankReconciliationService = new BankReconciliationService();