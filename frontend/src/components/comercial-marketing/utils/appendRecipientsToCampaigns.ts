import emailCampaignService, { type EmailCampaignRecipientInput } from '@/services/emailCampaignService';
import { sanitizeRecipientsForCampaign } from '@/components/comercial-marketing/utils/sanitizeMarketingPayload';

export const APPEND_RECIPIENTS_CHUNK_SIZE = 400;

/** Acrescenta destinatários a várias campanhas (rascunho/agendada), em lotes. */
export async function appendRecipientsToCampaigns(
  campaignIds: string[],
  recipients: EmailCampaignRecipientInput[],
): Promise<number> {
  const sanitized = sanitizeRecipientsForCampaign(recipients);
  if (sanitized.length === 0 || campaignIds.length === 0) return 0;

  for (const campaignId of campaignIds) {
    for (let i = 0; i < sanitized.length; i += APPEND_RECIPIENTS_CHUNK_SIZE) {
      const chunk = sanitized.slice(i, i + APPEND_RECIPIENTS_CHUNK_SIZE);
      await emailCampaignService.appendRecipients(campaignId, chunk);
    }
  }
  return sanitized.length;
}
