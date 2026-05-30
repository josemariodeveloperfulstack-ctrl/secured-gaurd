import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import emailCampaignService, {
  type EmailCampaignRecipientInput,
  type EmailCampaignRecipientRow,
  type EmailCampaignSummary,
} from '@/services/emailCampaignService';
import { RecipientListGrouped } from '@/components/comercial-marketing/RecipientListGrouped';
import { groupRecipientsByCity } from '@/components/comercial-marketing/utils/recipientMetadata';

function rowToInput(row: EmailCampaignRecipientRow): EmailCampaignRecipientInput {
  return {
    email: row.email,
    name: row.name,
    metadata: row.metadata,
    sourceType: (row.sourceType as EmailCampaignRecipientInput['sourceType']) ?? 'MANUAL',
    leadId: row.leadId,
  };
}

export interface CampaignRecipientsPanelProps {
  campaign: EmailCampaignSummary;
  onAddByCity?: (campaignId: string) => void;
}

const CampaignRecipientsPanel: React.FC<CampaignRecipientsPanelProps> = ({
  campaign,
  onAddByCity,
}) => {
  const canAppend =
    campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED';

  const query = useQuery({
    queryKey: ['email-campaign-recipients', campaign.id],
    queryFn: () => emailCampaignService.listRecipients(campaign.id),
  });

  const recipients = useMemo(
    () => (query.data ?? []).filter((r) => !r.emailMarketingSuppressed).map(rowToInput),
    [query.data],
  );

  const cityGroups = useMemo(() => groupRecipientsByCity(recipients), [recipients]);
  const suppressedCount = (query.data ?? []).filter((r) => r.emailMarketingSuppressed).length;

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-7 w-7 animate-spin text-seguranca-yellow" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <p className="py-6 text-center text-sm text-rose-300">
        Não foi possível carregar os destinatários desta campanha.
      </p>
    );
  }

  if (recipients.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-white/15 bg-seguranca-black/30 px-6 py-10 text-center">
        <Users className="mx-auto h-10 w-10 text-slate-500" />
        <p className="mt-3 text-sm font-medium text-slate-200">Nenhum lead na campanha</p>
        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
          Importe contatos na aba <strong className="text-slate-300">Lista de Leads</strong>, selecione uma
          cidade e acrescente o lote à campanha. Campanhas agendadas também aceitam novos destinatários antes do
          envio.
        </p>
        {canAppend && onAddByCity && (
          <Button
            type="button"
            className="mt-4 bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
            onClick={() => onAddByCity(campaign.id)}
          >
            <MapPin className="mr-2 h-4 w-4" />
            Acrescentar leads por cidade
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="gap-1 tabular-nums">
          <Users className="h-3 w-3" />
          {recipients.length.toLocaleString('pt-BR')} lead(s)
        </Badge>
        <Badge variant="outline" className="gap-1 border-white/15 tabular-nums">
          <MapPin className="h-3 w-3 text-seguranca-yellow" />
          {cityGroups.length.toLocaleString('pt-BR')} cidade(s)
        </Badge>
        {suppressedCount > 0 && (
          <span className="text-xs text-slate-500">
            + {suppressedCount} descadastrado(s) oculto(s)
          </span>
        )}
        {canAppend && onAddByCity && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="ml-auto border-seguranca-yellow/40 text-seguranca-yellow hover:bg-seguranca-yellow/10"
            onClick={() => onAddByCity(campaign.id)}
          >
            <MapPin className="mr-1.5 h-3.5 w-3.5" />
            Acrescentar por cidade
          </Button>
        )}
      </div>
      <RecipientListGrouped recipients={recipients} onRemove={() => {}} readOnly dark />
    </div>
  );
};

export default CampaignRecipientsPanel;
