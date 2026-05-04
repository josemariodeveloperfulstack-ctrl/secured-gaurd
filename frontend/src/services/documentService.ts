import api from './api';
import { Document, DocumentType } from '@/types/document';

class DocumentService {
  /**
   * Busca documentos por ID do funcionário
   */
  async getByEmployeeId(employeeId: string): Promise<Document[]> {
    const response = await api.get(`/documents/employee/${employeeId}`);
    return response.data;
  }

  /**
   * Busca todos os tipos de documentos disponíveis
   */
  async getTypes(): Promise<DocumentType[]> {
    const response = await api.get('/documents/types');
    return response.data;
  }

  /**
   * Faz upload de um arquivo para um documento existente
   */
  async upload(documentId: string, file: File): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/documents/${documentId}/upload`, formData);
    return response.data;
  }

  /**
   * Cria um novo registro de documento
   */
  async create(data: any): Promise<Document> {
    const formatDate = (d: any) => {
      if (!d) return null;
      if (d instanceof Date) return d.toISOString().split('T')[0];
      if (typeof d === 'string') return d.split('T')[0];
      return d;
    };

    const payload = {
      ...data,
      employeeId: data.employeeId || data.employee?.id,
      issueDate: formatDate(data.issueDate),
      expirationDate: formatDate(data.expirationDate)
    };
    delete payload.employee;
    
    const response = await api.post('/documents', payload);
    return response.data;
  }

  /**
   * Atualiza um documento existente
   */
  async update(id: string, data: Partial<Document>): Promise<Document> {
    const response = await api.put(`/documents/${id}`, data);
    return response.data;
  }

  /**
   * Remove um documento
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/documents/${id}`);
  }

  /**
   * Busca todos os documentos (para admin/gestor)
   */
  async getAllDocuments(): Promise<Document[]> {
    const response = await api.get('/documents');
    return response.data;
  }

  /**
   * Faz o download do arquivo (retorna Blob)
   */
  async downloadAsBlob(id: string): Promise<Blob> {
    const response = await api.get(`/documents/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Faz o download do arquivo e inicia o salvamento no navegador
   */
  async download(id: string): Promise<void> {
    const response = await api.get(`/documents/${id}/download`, {
      responseType: 'blob',
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Tentar pegar o nome do arquivo do header content-disposition
    const contentDisposition = response.headers['content-disposition'];
    let fileName = 'documento.pdf';
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
      if (fileNameMatch && fileNameMatch.length > 1) {
        fileName = fileNameMatch[1];
      }
    }
    
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  // --- Aliases para compatibilidade com componentes legados ---

  async getDocumentsByEmployee(employeeId: string): Promise<Document[]> {
    return this.getByEmployeeId(employeeId);
  }

  async getDocumentTypes(): Promise<DocumentType[]> {
    return this.getTypes();
  }

  async createDocument(data: Partial<Document>): Promise<Document> {
    return this.create(data);
  }

  async uploadFile(documentId: string, file: File): Promise<Document> {
    return this.upload(documentId, file);
  }

  async deleteDocument(id: string): Promise<void> {
    return this.delete(id);
  }

  async downloadFile(id: string): Promise<Blob> {
    return this.downloadAsBlob(id);
  }
}

export const documentService = new DocumentService();
export type { Document, DocumentType };