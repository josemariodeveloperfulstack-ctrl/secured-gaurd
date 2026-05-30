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
  defaultTemplateId?: string | null;
  defaultTemplateName?: string | null;
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
  recipientId: string | null;
  leadId: string | null;
  recipientEmail: string | null;
  recipientName: string | null;
  status: string;
  providerMessageId: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  clickedAt: string | null;
  repliedAt: string | null;
  replySubject: string | null;
  replyText: string | null;
  replyHtml: string | null;
  bounceReason: string | null;
}

export interface InactiveEmailRecipient {
  recipientId: string;
  email: string;
  name: string | null;
  reason: string | null;
  inactivatedAt: string | null;
}

export type ImportedListSourceType = 'IMPORT' | 'PASTE' | 'MIXED';

export interface EmailMarketingImportedListSummary {
  id: string;
  name: string;
  description?: string | null;
  sourceType: ImportedListSourceType | string;
  recipientCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmailMarketingImportedListDetail extends EmailMarketingImportedListSummary {
  recipients: EmailCampaignRecipientInput[];
}

export interface SaveEmailMarketingImportedListPayload {
  name: string;
  description?: string | null;
  sourceType?: ImportedListSourceType | string;
  recipients: EmailCampaignRecipientInput[];
}

export interface EmailCampaignRecipientInput {
  email: string;
  name?: string | null;
  metadata?: Record<string, unknown>;
  sourceType?: EmailRecipientSource;
  leadId?: string | null;
}

/** Destinatário persistido na campanha (GET /recipients). */
export interface EmailCampaignRecipientRow {
  id: string;
  email: string;
  name: string | null;
  metadata: Record<string, unknown>;
  sourceType: string;
  leadId: string | null;
  cityLabel: string;
  emailMarketingSuppressed: boolean;
  createdAt: string;
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

export interface UpdateInactiveEmailRecipientPayload {
  email: string;
  name?: string | null;
  reactivate?: boolean;
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
    const defaultTemplateId = data.defaultTemplate?.id ?? data.defaultTemplateId ?? null;
    const defaultTemplateName = data.defaultTemplate?.name ?? data.defaultTemplateName ?? null;
    return {
      ...data,
      defaultTemplateId,
      defaultTemplateName,
      defaultTemplate: defaultTemplateId ? { id: String(defaultTemplateId), name: defaultTemplateName ?? undefined } : null,
    };
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

  async listRecipients(campaignId: string): Promise<EmailCampaignRecipientRow[]> {
    const { data } = await api.get<EmailCampaignRecipientRow[]>(
      `/api/v1/email-campaigns/${campaignId}/recipients`,
    );
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
  async checkRejected(emails: string[]): Promise<string[]> {
    const unique = [
      ...new Set(emails.map((e) => e.trim().toLowerCase()).filter((e) => isValidEmail(e))),
    ];
    if (unique.length === 0) return [];
    const out: string[] = [];
    const size = 500;
    for (let i = 0; i < unique.length; i += size) {
      const slice = unique.slice(i, i + size);
      if (!slice.length) continue;
      const { data } = await api.post<{ rejected: string[] }>(
        '/api/v1/email-campaigns/rejected-check',
        { emails: slice }
      );
      out.push(...(data.rejected ?? []));
    }
    return out;
  }

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
    const payload = recipients.map(({ email, name, metadata, sourceType, leadId }) => {
      const row: EmailCampaignRecipientInput = { email, name, metadata, sourceType };
      if (leadId) row.leadId = leadId;
      return row;
    });
    await api.put(`/api/v1/email-campaigns/${campaignId}/recipients`, { recipients: payload });
  }

  async listInactiveRecipients(campaignId: string): Promise<InactiveEmailRecipient[]> {
    const { data } = await api.get<InactiveEmailRecipient[]>(
      `/api/v1/email-campaigns/${campaignId}/inactive-recipients`
    );
    return data;
  }

  async updateInactiveRecipient(
    campaignId: string,
    recipientId: string,
    payload: UpdateInactiveEmailRecipientPayload
  ): Promise<InactiveEmailRecipient> {
    const { data } = await api.patch<InactiveEmailRecipient>(
      `/api/v1/email-campaigns/${campaignId}/inactive-recipients/${recipientId}`,
      payload
    );
    return data;
  }

  async deleteInactiveRecipient(campaignId: string, recipientId: string): Promise<void> {
    await api.delete(`/api/v1/email-campaigns/${campaignId}/inactive-recipients/${recipientId}`);
  }

  /** Remove destinatário da campanha (e envios pendentes associados). */
  async removeRecipientFromCampaign(campaignId: string, recipientId: string): Promise<void> {
    await api.delete(`/api/v1/email-campaigns/${campaignId}/recipients/${recipientId}`);
  }

  async listImportedLists(): Promise<EmailMarketingImportedListSummary[]> {
    const { data } = await api.get<EmailMarketingImportedListSummary[]>(
      '/api/v1/email-campaigns/imported-lists'
    );
    return data;
  }

  async getImportedList(listId: string): Promise<EmailMarketingImportedListDetail> {
    const { data } = await api.get<EmailMarketingImportedListDetail>(
      `/api/v1/email-campaigns/imported-lists/${listId}`
    );
    return data;
  }

  async createImportedList(payload: SaveEmailMarketingImportedListPayload): Promise<EmailMarketingImportedListDetail> {
    const { data } = await api.post<EmailMarketingImportedListDetail>(
      '/api/v1/email-campaigns/imported-lists',
      payload
    );
    return data;
  }

  async updateImportedList(
    listId: string,
    payload: SaveEmailMarketingImportedListPayload
  ): Promise<EmailMarketingImportedListDetail> {
    const { data } = await api.put<EmailMarketingImportedListDetail>(
      `/api/v1/email-campaigns/imported-lists/${listId}`,
      payload
    );
    return data;
  }

  async deleteImportedList(listId: string): Promise<void> {
    await api.delete(`/api/v1/email-campaigns/imported-lists/${listId}`);
  }
}

const emailCampaignService = new EmailCampaignService();
export default emailCampaignService;
