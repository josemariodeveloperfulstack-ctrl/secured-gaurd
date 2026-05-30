import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
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

function canRemoveRecipients(status?: string | null): boolean {
  return status !== 'COMPLETED' && status !== 'CANCELED';
}

export interface CampaignRecipientsPanelProps {
  campaign: EmailCampaignSummary;
  onAddByCity?: (campaignId: string) => void;
}

const CampaignRecipientsPanel: React.FC<CampaignRecipientsPanelProps> = ({
  campaign,
  onAddByCity,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canAppend =
    campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED';
  const canRemove = canRemoveRecipients(campaign.status);

  const [emailToRemove, setEmailToRemove] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['email-campaign-recipients', campaign.id],
    queryFn: () => emailCampaignService.listRecipients(campaign.id),
  });

  const emailToRecipientId = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of query.data ?? []) {
      if (!row.emailMarketingSuppressed) {
        map.set(row.email.toLowerCase(), row.id);
      }
    }
    return map;
  }, [query.data]);

  const recipients = useMemo(
    () => (query.data ?? []).filter((r) => !r.emailMarketingSuppressed).map(rowToInput),
    [query.data],
  );

  const cityGroups = useMemo(() => groupRecipientsByCity(recipients), [recipients]);
  const suppressedCount = (query.data ?? []).filter((r) => r.emailMarketingSuppressed).length;

  const removeMutation = useMutation({
    mutationFn: async (email: string) => {
      const recipientId = emailToRecipientId.get(email.toLowerCase());
      if (!recipientId) throw new Error('Destinatário não encontrado na campanha.');
      await emailCampaignService.removeRecipientFromCampaign(campaign.id, recipientId);
    },
    onSuccess: async (_data, email) => {
      toast({ title: 'E-mail removido da campanha', description: email });
      setEmailToRemove(null);
      await queryClient.invalidateQueries({ queryKey: ['email-campaign-recipients', campaign.id] });
      await queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      await queryClient.invalidateQueries({ queryKey: ['email-campaign-metrics', campaign.id] });
    },
    onError: (err: unknown) =>
      toast({
        title: 'Erro ao remover',
        description: err instanceof Error ? err.message : 'Não foi possível remover o destinatário.',
        variant: 'destructive',
      }),
  });

  const handleRemoveClick = (email: string) => {
    if (!canRemove) {
      toast({
        title: 'Remoção não permitida',
        description: 'Campanhas concluídas ou canceladas não permitem alterar destinatários.',
        variant: 'destructive',
      });
      return;
    }
    setEmailToRemove(email);
  };

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
        {canRemove && (
          <span className="text-xs text-amber-200/80">
            Coluna <strong className="text-amber-100">Ações</strong> à direita da tabela (role para o lado se não aparecer).
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
      <RecipientListGrouped
        recipients={recipients}
        onRemove={handleRemoveClick}
        readOnly={!canRemove}
        dark
      />

      <AlertDialog open={!!emailToRemove} onOpenChange={(o) => !o && setEmailToRemove(null)}>
        <AlertDialogContent className="border-seguranca-graphite bg-seguranca-graphite text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover destinatário?</AlertDialogTitle>
            <AlertDialogDescription className="text-seguranca-lightgray">
              O e-mail <strong className="text-white">{emailToRemove}</strong> será retirado desta campanha.
              Envios pendentes para este endereço serão cancelados. O lead no CRM não é apagado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 bg-transparent text-white hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={removeMutation.isPending}
              onClick={() => emailToRemove && removeMutation.mutate(emailToRemove)}
            >
              {removeMutation.isPending ? 'A remover…' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CampaignRecipientsPanel;
