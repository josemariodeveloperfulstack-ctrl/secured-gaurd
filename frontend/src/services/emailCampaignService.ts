import api from '@/lib/axios';
import { isValidEmail } from '@/components/comercial-marketing/utils/recipientParser';

export type EmailCampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELED';
export type EmailProviderType = 'SENDGRID' | 'SMTP';
export type EmailRecipientSource = 'LEAD' | 'IMPORT' | 'MANUAL';

export interface EmailCampaignSummary {
  id: string;
  title: string;
  description?: string | null;
  templateId: string | null;
  defaultTemplateId?: string | null;
  defaultTemplateName?: string | null;
  providerType?: EmailProviderType | null;
  status?: EmailCampaignStatus | null;
  totalLimit?: number | null;
  dailyLimit?: number | null;
  hourlyLimit?: number | null;
  minIntervalSeconds?: number | null;
  scheduledAt?: string | null;
  createdAt: string;
  recipientCount: number;
}

/** Resposta de GET /api/v1/email-campaigns/:id (entidade serializada). */
export interface EmailCampaignDetail {
  id: string;
  title: string;
  description?: string | null;
  templateId?: string | null;
  defaultTemplate?: { id: string; name?: string } | null;
  providerType?: EmailProviderType | string | null;
  status?: EmailCampaignStatus | string | null;
  totalLimit?: number | null;
  dailyLimit?: number | null;
  hourlyLimit?: number | null;
  minIntervalSeconds?: number | null;
  scheduledAt?: string | null;
}

export interface UpdateEmailCampaignPayload {
  title: string;
  description?: string | null;
  defaultTemplateId?: string | null;
  providerType?: EmailProviderType;
  totalLimit?: number | null;
  dailyLimit?: number | null;
  hourlyLimit?: number | null;
  minIntervalSeconds?: number | null;
  scheduledAt?: string | null;
}

export interface EmailCampaignMetrics {
  campaignId: string;
  countsByStatus: Record<string, number>;
}

export interface EmailLogRow {
  id: string;
  recipientEmail: string | null;
  recipientName: string | null;
  status: string;
  providerMessageId: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  clickedAt: string | null;
  repliedAt: string | null;
  bounceReason: string | null;
}

export interface EmailCampaignRecipientInput {
  email: string;
  name?: string | null;
  metadata?: Record<string, unknown>;
  sourceType?: EmailRecipientSource;
  leadId?: string | null;
}

export interface CreateEmailCampaignPayload {
  title: string;
  description?: string | null;
  templateId?: string | null;
  defaultTemplateId?: string | null;
  providerType?: EmailProviderType;
  totalLimit?: number | null;
  dailyLimit?: number | null;
  hourlyLimit?: number | null;
  minIntervalSeconds?: number | null;
  scheduledAt?: string | null;
  recipients: EmailCampaignRecipientInput[];
}

export interface SendEmailCampaignPayload {
  templateId?: string | null;
  subject?: string;
  htmlBody?: string;
  extraVariables?: Record<string, string>;
}

export interface ImportRecipientsResponse {
  recipients: EmailCampaignRecipientInput[];
  totalRows: number;
  invalidRows: number;
  detectedColumns: string[];
}

export interface MarketingUnsubscribeRow {
  email: string;
  source: string | null;
  reason: string | null;
  /** ISO-8601 (instant) */
  confirmedAt: string;
}

export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

class EmailCampaignService {
  async list(): Promise<EmailCampaignSummary[]> {
    const { data } = await api.get<EmailCampaignSummary[]>('/api/v1/email-campaigns');
    return data;
  }

  async getById(campaignId: string): Promise<EmailCampaignDetail> {
    const { data } = await api.get<EmailCampaignDetail>(`/api/v1/email-campaigns/${campaignId}`);
    return data;
  }

  async update(campaignId: string, payload: UpdateEmailCampaignPayload): Promise<void> {
    await api.patch(`/api/v1/email-campaigns/${campaignId}`, payload);
  }

  async delete(campaignId: string): Promise<void> {
    await api.delete(`/api/v1/email-campaigns/${campaignId}`);
  }

  async getMetrics(campaignId: string): Promise<EmailCampaignMetrics> {
    const { data } = await api.get<EmailCampaignMetrics>(`/api/v1/email-campaigns/${campaignId}/metrics`);
    return data;
  }

  async getLogs(campaignId: string, statuses?: string[]): Promise<EmailLogRow[]> {
    const params = statuses && statuses.length ? { status: statuses.join(',') } : undefined;
    const { data } = await api.get<EmailLogRow[]>(`/api/v1/email-campaigns/${campaignId}/logs`, { params });
    return data;
  }

  async create(payload: CreateEmailCampaignPayload): Promise<{ id: string }> {
    const { data } = await api.post<{ id: string }>('/api/v1/email-campaigns', payload);
    return { id: String(data.id) };
  }

  async send(campaignId: string, payload: SendEmailCampaignPayload): Promise<void> {
    await api.post(`/api/v1/email-campaigns/${campaignId}/send`, payload);
  }

  async pause(campaignId: string): Promise<void> {
    await api.post(`/api/v1/email-campaigns/${campaignId}/pause`);
  }

  async resume(campaignId: string): Promise<void> {
    await api.post(`/api/v1/email-campaigns/${campaignId}/resume`);
  }

  async cancel(campaignId: string): Promise<void> {
    await api.post(`/api/v1/email-campaigns/${campaignId}/cancel`);
  }

  async importRecipientsFile(file: File): Promise<ImportRecipientsResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<ImportRecipientsResponse>(
      '/api/v1/email-campaigns/import-recipients',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  }

  /** Lista paginada de e-mails com opt-out de marketing confirmado (área Comercial → Descadastrados). */
  async listMarketingUnsubscribes(page = 0, size = 25): Promise<SpringPage<MarketingUnsubscribeRow>> {
    const { data } = await api.get<SpringPage<MarketingUnsubscribeRow>>(
      '/api/v1/email-campaigns/marketing-unsubscribes',
      { params: { page, size } }
    );
    return data;
  }

  /** Até 500 e-mails por pedido; fatia automaticamente listas maiores. */
  async checkUnsubscribed(emails: string[]): Promise<string[]> {
    const unique = [
      ...new Set(emails.map((e) => e.trim().toLowerCase()).filter((e) => isValidEmail(e))),
    ];
    if (unique.length === 0) return [];
    const out: string[] = [];
    const size = 500;
    for (let i = 0; i < unique.length; i += size) {
      const slice = unique.slice(i, i + size);
      if (!slice.length) continue;
      const { data } = await api.post<{ unsubscribed: string[] }>(
        '/api/v1/email-campaigns/unsubscribe-check',
        { emails: slice }
      );
      out.push(...(data.unsubscribed ?? []));
    }
    return out;
  }

  /** Acrescenta destinatários a uma campanha em rascunho (dedupe no servidor). */
  async appendRecipients(campaignId: string, recipients: EmailCampaignRecipientInput[]): Promise<void> {
    await api.put(`/api/v1/email-campaigns/${campaignId}/recipients`, { recipients });
  }
}

const emailCampaignService = new EmailCampaignService();
export default emailCampaignService;
