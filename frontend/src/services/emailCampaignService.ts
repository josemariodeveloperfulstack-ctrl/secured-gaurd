import api from '@/lib/axios';

export interface EmailCampaignSummary {
  id: string;
  title: string;
  templateId: string | null;
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
}

export interface CreateEmailCampaignPayload {
  title: string;
  templateId?: string | null;
  recipients: EmailCampaignRecipientInput[];
}

export interface SendEmailCampaignPayload {
  subject: string;
  htmlBody: string;
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

  async getLogs(campaignId: string): Promise<EmailLogRow[]> {
    const { data } = await api.get<EmailLogRow[]>(`/api/v1/email-campaigns/${campaignId}/logs`);
    return data;
  }

  async create(payload: CreateEmailCampaignPayload): Promise<{ id: string }> {
    const { data } = await api.post<{ id: string }>('/api/v1/email-campaigns', payload);
    return { id: String(data.id) };
  }

  async send(campaignId: string, payload: SendEmailCampaignPayload): Promise<void> {
    await api.post(`/api/v1/email-campaigns/${campaignId}/send`, payload);
  }
}

const emailCampaignService = new EmailCampaignService();
export default emailCampaignService;
