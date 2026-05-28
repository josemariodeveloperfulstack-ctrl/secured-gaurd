import type { EmailCampaignRecipientInput } from '@/services/emailCampaignService';
import leadService, { type LeadImportItem } from '@/services/leadService';
import { sanitizeLeadImportItem } from '@/components/comercial-marketing/utils/sanitizeMarketingPayload';

const CHUNK_SIZE = 500;

export function recipientToLeadImportItem(r: EmailCampaignRecipientInput): LeadImportItem | null {
  const meta = (r.metadata ?? {}) as Record<string, unknown>;
  const email = r.email.trim().toLowerCase();
  const rawName = (r.name ?? '').toString().trim();
  const name =
    rawName ||
    (email.includes('@') ? email.split('@')[0].replace(/[._]/g, ' ').trim() : 'Contato');

  return sanitizeLeadImportItem({
    email,
    name,
    company: meta.company ? String(meta.company).trim() : undefined,
    position: meta.position ? String(meta.position).trim() : undefined,
    phone: meta.phone ? String(meta.phone).trim() : undefined,
    city: (meta.city ?? meta.cidade) ? String(meta.city ?? meta.cidade).trim() : undefined,
    state: (meta.state ?? meta.estado) ? String(meta.state ?? meta.estado).trim() : undefined,
    companyType: (meta.companyType ?? meta.tipoEmpresa)
      ? String(meta.companyType ?? meta.tipoEmpresa).trim()
      : undefined,
  });
}

/** Grava leads no CRM em lotes (upsert por e-mail). */
export async function persistImportedLeadsToCrm(
  recipients: EmailCampaignRecipientInput[],
): Promise<{ created: number; updated: number; skipped: number; emailToLeadId: Map<string, string> }> {
  const items = recipients
    .map(recipientToLeadImportItem)
    .filter((item): item is LeadImportItem => item != null);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const emailToLeadId = new Map<string, string>();

  if (items.length === 0) {
    return { created, updated, skipped, emailToLeadId };
  }

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    if (chunk.length === 0) continue;
    const result = await leadService.bulkImportFromMarketing(chunk);
    created += result.created ?? 0;
    updated += result.updated ?? 0;
    skipped += result.skipped ?? 0;
    for (const ref of result.leads ?? []) {
      if (ref.email && ref.id) {
        emailToLeadId.set(ref.email.toLowerCase(), String(ref.id));
      }
    }
  }

  return { created, updated, skipped, emailToLeadId };
}

export function attachLeadIdsToRecipients(
  recipients: EmailCampaignRecipientInput[],
  emailToLeadId: Map<string, string>,
): EmailCampaignRecipientInput[] {
  return recipients.map((r) => {
    const leadId = emailToLeadId.get(r.email.toLowerCase());
    if (!leadId) return r;
    return { ...r, leadId, sourceType: r.sourceType ?? 'LEAD' };
  });
}
