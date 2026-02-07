import api from '@/lib/axios';

export type QuotationStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface Quotation {
  id: string;
  quoteNumber: string;
  title: string;
  description?: string;
  supplierId?: string;
  supplierName?: string;
  unitId?: string;
  unitName?: string;
  purchaseRequestId?: string;
  purchaseRequestNumber?: string;
  purchaseRequestTitle?: string;
  status: QuotationStatus;
  totalValue: number;
  validUntil: string;
  terms?: string;
  paymentMethod?: string;
  deliveryMethod?: string;
  notes?: string;
  createdById?: string;
  createdByName?: string;
  assignedToId?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuotationRequest {
  title: string;
  description?: string;
  supplierId?: string;
  purchaseRequestId?: string;
  unitId?: string;
  totalValue: number;
  validUntil: string;
  terms?: string;
  paymentMethod?: string;
  deliveryMethod?: string;
  notes?: string;
  assignedToId?: string;
}

export interface UpdateQuotationRequest extends Partial<CreateQuotationRequest> {
  status?: QuotationStatus;
}

export interface QuotationReportFilters {
  quoteNumber?: string;
  title?: string;
  supplierId?: string;
  status?: string;
  startValidUntil?: string;
  endValidUntil?: string;
  assignedToId?: string;
  minValue?: number;
  maxValue?: number;
}

class QuotationService {
  private base = '/api/purchase-quotations';

  async getAll(): Promise<Quotation[]> {
    const { data } = await api.get(this.base);
    return data;
  }

  async getById(id: string): Promise<Quotation> {
    const { data } = await api.get(`${this.base}/${id}`);
    return data;
  }

  async create(payload: CreateQuotationRequest): Promise<Quotation> {
    const { data } = await api.post(this.base, payload);
    return data;
  }

  async update(id: string, payload: UpdateQuotationRequest): Promise<Quotation> {
    const { data } = await api.put(`${this.base}/${id}`, payload);
    return data;
  }

  async remove(id: string): Promise<void> {
    await api.delete(`${this.base}/${id}`);
  }

  async search(term: string): Promise<Quotation[]> {
    const { data } = await api.get(`${this.base}/search?term=${encodeURIComponent(term)}`);
    return data;
  }

  async bySupplier(supplierId: string): Promise<Quotation[]> {
    const { data } = await api.get(`${this.base}/supplier/${supplierId}`);
    return data;
  }

  async byStatus(status: QuotationStatus): Promise<Quotation[]> {
    const { data } = await api.get(`${this.base}/status/${status}`);
    return data;
  }

  async expiringSoon(days: number): Promise<Quotation[]> {
    const { data } = await api.get(`${this.base}/expiring-soon/${days}`);
    return data;
  }

  async updateStatus(id: string, status: QuotationStatus): Promise<Quotation> {
    const { data } = await api.patch(`${this.base}/${id}/status`, { status });
    return data;
  }

  async generateReportPDF(filters: QuotationReportFilters): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters.quoteNumber?.trim()) params.append('quoteNumber', filters.quoteNumber.trim());
    if (filters.title?.trim()) params.append('title', filters.title.trim());
    if (filters.supplierId) params.append('supplierId', filters.supplierId);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.startValidUntil) params.append('startValidUntil', filters.startValidUntil);
    if (filters.endValidUntil) params.append('endValidUntil', filters.endValidUntil);
    if (filters.assignedToId) params.append('assignedToId', filters.assignedToId);
    if (filters.minValue != null && filters.minValue > 0) params.append('minValue', filters.minValue.toString());
    if (filters.maxValue != null && filters.maxValue > 0) params.append('maxValue', filters.maxValue.toString());

    const query = params.toString();
    const url = query ? `${this.base}/reports/pdf?${query}` : `${this.base}/reports/pdf`;

    const { data } = await api.get(url, { responseType: 'blob' });
    return data;
  }
}

export const quotationService = new QuotationService();
export default quotationService;