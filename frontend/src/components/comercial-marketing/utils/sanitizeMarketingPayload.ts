import type { EmailCampaignRecipientInput } from '@/services/emailCampaignService';
import type { LeadImportItem } from '@/services/leadService';
import { isValidEmail } from '@/components/comercial-marketing/utils/recipientParser';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function truncate(value: string | undefined | null, max: number): string | undefined {
  if (value == null) return undefined;
  const t = value.trim();
  if (!t) return undefined;
  return t.length <= max ? t : t.slice(0, max);
}

export function isValidLeadId(id: string | null | undefined): boolean {
  return typeof id === 'string' && UUID_RE.test(id.trim());
}

/** Alinha campos com limites do DTO/backend antes de POST /api/leads/import. */
export function sanitizeLeadImportItem(item: LeadImportItem): LeadImportItem | null {
  const email = item.email?.trim().toLowerCase() ?? '';
  if (!isValidEmail(email)) return null;

  const rawName = (item.name ?? '').trim();
  const name =
    truncate(rawName, 255) ||
    (email.includes('@') ? truncate(email.split('@')[0].replace(/[._]/g, ' '), 255) : 'Contato') ||
    'Contato';

  return {
    email: truncate(email, 255)!,
    name,
    company: truncate(item.company, 255),
    position: truncate(item.position, 255),
    phone: truncate(item.phone, 20),
    city: truncate(item.city, 120),
    state: truncate(item.state, 10),
    companyType: truncate(item.companyType, 120),
  };
}

/** Prepara destinatários para PUT .../recipients (evita 400 por validação Jackson/Bean Validation). */
export function sanitizeRecipientForCampaign(
  r: EmailCampaignRecipientInput,
): EmailCampaignRecipientInput | null {
  const email = r.email?.trim().toLowerCase() ?? '';
  if (!isValidEmail(email)) return null;

  const meta = r.metadata ?? {};
  const cleanMeta: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(meta)) {
    if (val == null) continue;
    if (typeof val === 'string') {
      const t = val.trim();
      if (t) cleanMeta[key] = t.length <= 500 ? t : t.slice(0, 500);
    } else if (typeof val === 'number' || typeof val === 'boolean') {
      cleanMeta[key] = val;
    } else {
      const s = String(val).trim();
      if (s) cleanMeta[key] = s.length <= 500 ? s : s.slice(0, 500);
    }
  }

  const out: EmailCampaignRecipientInput = {
    email,
    name: truncate((r.name ?? '').toString(), 500) ?? undefined,
    metadata: Object.keys(cleanMeta).length > 0 ? cleanMeta : undefined,
    sourceType: r.sourceType,
  };

  if (isValidLeadId(r.leadId)) {
    out.leadId = r.leadId!.trim();
    out.sourceType = r.sourceType ?? 'LEAD';
  }

  return out;
}

export function sanitizeRecipientsForCampaign(
  recipients: EmailCampaignRecipientInput[],
): EmailCampaignRecipientInput[] {
  const out: EmailCampaignRecipientInput[] = [];
  const seen = new Set<string>();
  for (const r of recipients) {
    const s = sanitizeRecipientForCampaign(r);
    if (!s) continue;
    const key = s.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}
