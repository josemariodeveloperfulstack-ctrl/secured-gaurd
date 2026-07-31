export interface CardInteraction {
  id: string;
  opportunityId?: string | null;
  leadId?: string | null;
  userName?: string | null;
  action: string;
  note?: string | null;
  createdAt?: string | null;
}

/** Referência estável — evita `|| []` / default `[]` recriados a cada render (loop no KanbanCard). */
export const EMPTY_INTERACTIONS: CardInteraction[] = [];

export function interactionsEqual(a: CardInteraction[], b: CardInteraction[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every(
    (item, i) =>
      item.id === b[i]?.id &&
      item.action === b[i]?.action &&
      item.createdAt === b[i]?.createdAt &&
      item.note === b[i]?.note
  );
}

export const INTERACTION_ACTION_LABEL: Record<string, string> = {
  EMAIL_SENT: 'E-mail',
  WHATSAPP_SENT: 'WhatsApp',
  MESSAGE_SENT: 'Mensagem',
  NOTE_ADDED: 'Negociação',
  CREATED: 'Criado',
  UPDATED: 'Atualizado',
  STATUS_CHANGED: 'Status',
  OPPORTUNITY_CREATED: 'Oportunidade',
};

export function interactionActionLabel(action?: string): string {
  if (!action) return 'Contato';
  return INTERACTION_ACTION_LABEL[action] || action;
}

export function sortInteractionsDesc(items: CardInteraction[]): CardInteraction[] {
  return [...items].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
}

export function daysSince(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.max(0, Math.round((start.getTime() - target.getTime()) / (1000 * 60 * 60 * 24)));
}
