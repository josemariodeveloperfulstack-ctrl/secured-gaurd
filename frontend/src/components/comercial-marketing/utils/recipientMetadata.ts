import type { EmailCampaignRecipientInput } from '@/services/emailCampaignService';

export type RecipientMetaField = 'city' | 'state' | 'companyType';

const META_KEYS: Record<RecipientMetaField, string[]> = {
  city: ['city', 'cidade', 'municipio', 'município'],
  state: ['state', 'estado', 'uf'],
  companyType: ['companyType', 'tipoEmpresa', 'tipo_empresa', 'tipo de empresa', 'segmento', 'segment', 'ramo', 'atividade'],
};

export function getRecipientMetaValue(
  metadata: Record<string, unknown> | undefined,
  field: RecipientMetaField,
): string {
  if (!metadata) return '';
  for (const key of META_KEYS[field]) {
    const v = metadata[key];
    if (v != null && String(v).trim() !== '') {
      return String(v).trim();
    }
  }
  return '';
}

/** Cidade para segmentação: cidade mapeada ou, em planilhas só com bairro/localidade, usa esses campos. */
export function getRecipientCityLabel(metadata: Record<string, unknown> | undefined): string {
  const city = getRecipientMetaValue(metadata, 'city');
  if (city) return city;
  if (!metadata) return '';
  for (const key of ['bairro', 'BAIRRO', 'localidade', 'LOCALIDADE', 'municipio', 'MUNICIPIO']) {
    const v = metadata[key];
    if (v != null && String(v).trim() !== '') {
      return String(v).trim();
    }
  }
  return '';
}

export function groupRecipientsByCity(
  recipients: EmailCampaignRecipientInput[],
): { label: string; items: EmailCampaignRecipientInput[] }[] {
  const map = new Map<string, EmailCampaignRecipientInput[]>();
  for (const r of recipients) {
    const label = getRecipientCityLabel(r.metadata) || 'Sem cidade / bairro';
    const list = map.get(label) ?? [];
    list.push(r);
    map.set(label, list);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
    .map(([label, items]) => ({ label, items }));
}

export function collectDistinctMetaValues(
  recipients: EmailCampaignRecipientInput[],
  field: RecipientMetaField,
  limit = 500,
): string[] {
  const set = new Set<string>();
  for (const r of recipients) {
    const v =
      field === 'city' ? getRecipientCityLabel(r.metadata) : getRecipientMetaValue(r.metadata, field);
    if (v) set.add(v);
    if (set.size >= limit) break;
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function filterRecipientsByMeta(
  recipients: EmailCampaignRecipientInput[],
  filters: { city: string; state: string; companyType: string },
): EmailCampaignRecipientInput[] {
  return recipients.filter((r) => {
    if (filters.city !== 'ALL') {
      if (getRecipientMetaValue(r.metadata, 'city') !== filters.city) return false;
    }
    if (filters.state !== 'ALL') {
      if (getRecipientMetaValue(r.metadata, 'state') !== filters.state) return false;
    }
    if (filters.companyType !== 'ALL') {
      if (getRecipientMetaValue(r.metadata, 'companyType') !== filters.companyType) return false;
    }
    return true;
  });
}

export function hasGeoMetaFilters(recipients: EmailCampaignRecipientInput[]): boolean {
  return (
    collectDistinctMetaValues(recipients, 'city', 1).length > 0 ||
    collectDistinctMetaValues(recipients, 'state', 1).length > 0 ||
    collectDistinctMetaValues(recipients, 'companyType', 1).length > 0
  );
}

/** Quantos destinatários têm ao menos cidade/bairro ou estado preenchidos. */
export function countRecipientsWithGeo(recipients: EmailCampaignRecipientInput[]): number {
  return recipients.filter(
    (r) => !!getRecipientCityLabel(r.metadata) || !!getRecipientMetaValue(r.metadata, 'state'),
  ).length;
}

export const ALL_META = 'ALL';

export interface RecipientMetaFilterState {
  city: string;
  state: string;
  companyType: string;
}

/** Um lote de envio: filtro + quantidade máxima (0 = todos do filtro). */
export interface RecipientSegmentRule {
  id: string;
  state: string;
  city: string;
  companyType: string;
  maxQuantity: number;
}

export function createSegmentRuleId(): string {
  return `seg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptySegmentRule(): RecipientSegmentRule {
  return {
    id: createSegmentRuleId(),
    state: ALL_META,
    city: ALL_META,
    companyType: ALL_META,
    maxQuantity: 0,
  };
}

export function countMatchingRecipients(
  recipients: EmailCampaignRecipientInput[],
  filters: RecipientMetaFilterState,
): number {
  return filterRecipientsByMeta(recipients, filters).length;
}

/**
 * Monta a lista final a partir de um ou mais lotes.
 * Cada lote pega até `maxQuantity` contatos (0 = sem limite), sem repetir e-mail.
 */
export function applySegmentRules(
  recipients: EmailCampaignRecipientInput[],
  rules: RecipientSegmentRule[],
): EmailCampaignRecipientInput[] {
  if (rules.length === 0) {
    return recipients;
  }

  const selected = new Map<string, EmailCampaignRecipientInput>();

  for (const rule of rules) {
    const pool = filterRecipientsByMeta(recipients, {
      city: rule.city,
      state: rule.state,
      companyType: rule.companyType,
    });
    const limit = rule.maxQuantity > 0 ? rule.maxQuantity : pool.length;
    let taken = 0;
    for (const r of pool) {
      if (taken >= limit) break;
      const key = r.email.toLowerCase();
      if (!selected.has(key)) {
        selected.set(key, r);
        taken++;
      }
    }
  }

  return Array.from(selected.values());
}

export interface SegmentSelectionSummary {
  selected: EmailCampaignRecipientInput[];
  totalImported: number;
  perRule: { ruleId: string; matched: number; taken: number }[];
}

export function summarizeSegmentSelection(
  recipients: EmailCampaignRecipientInput[],
  rules: RecipientSegmentRule[],
): SegmentSelectionSummary {
  const selected = applySegmentRules(recipients, rules);
  const perRule = rules.map((rule) => {
    const pool = filterRecipientsByMeta(recipients, {
      city: rule.city,
      state: rule.state,
      companyType: rule.companyType,
    });
    const limit = rule.maxQuantity > 0 ? rule.maxQuantity : pool.length;
    return {
      ruleId: rule.id,
      matched: pool.length,
      taken: Math.min(pool.length, limit),
    };
  });
  return { selected, totalImported: recipients.length, perRule };
}
