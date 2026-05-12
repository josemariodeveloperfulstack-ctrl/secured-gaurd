import api from '@/lib/axios';

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
  scheduledAt?: string | null;
  createdAt: string;
  recipientCount: number;
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

class EmailCampaignService {
  async list(): Promise<EmailCampaignSummary[]> {
    const { data } = await api.get<EmailCampaignSummary[]>('/api/v1/email-campaigns');
    return data;
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
}

const emailCampaignService = new EmailCampaignService();
export default emailCampaignService;
