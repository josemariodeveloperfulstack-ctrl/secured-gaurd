import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Megaphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import emailCampaignService, {
  type EmailCampaignRecipientInput,
  type EmailCampaignSummary,
} from '@/services/emailCampaignService';
import { appendRecipientsToCampaigns } from '@/components/comercial-marketing/utils/appendRecipientsToCampaigns';

const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  SCHEDULED: 'Agendada',
};

export interface LinkListToCampaignsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Destinatários já em memória (cidade selecionada ou lista carregada). */
  recipients?: EmailCampaignRecipientInput[];
  /** Ou carregar destinatários de uma lista guardada. */
  listId?: string | null;
  listLabel?: string;
  /** Campanhas pré-marcadas (ex.: campanha atual na aba Lista de Leads). */
  initialCampaignIds?: string[];
  onLinked?: () => void;
}

const LinkListToCampaignsDialog: React.FC<LinkListToCampaignsDialogProps> = ({
  open,
  onOpenChange,
  recipients: recipientsProp,
  listId,
  listLabel,
  initialCampaignIds = [],
  onLinked,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingList, setLoadingList] = useState(false);
  const [listRecipients, setListRecipients] = useState<EmailCampaignRecipientInput[]>([]);
  const [linking, setLinking] = useState(false);

  const campaignsQuery = useQuery({
    queryKey: ['email-campaigns'],
    queryFn: () => emailCampaignService.list(),
    enabled: open,
  });

  const appendableCampaigns = useMemo(
    () =>
      (campaignsQuery.data ?? []).filter(
        (c) => c.status === 'DRAFT' || c.status === 'SCHEDULED',
      ),
    [campaignsQuery.data],
  );

  const recipients = recipientsProp?.length ? recipientsProp : listRecipients;

  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set(initialCampaignIds.filter(Boolean)));
  }, [open, initialCampaignIds]);

  useEffect(() => {
    if (!open || !listId || recipientsProp?.length) {
      setListRecipients([]);
      return;
    }
    setLoadingList(true);
    emailCampaignService
      .getImportedList(listId)
      .then((detail) => setListRecipients(detail.recipients ?? []))
      .catch(() => {
        toast({
          title: 'Erro ao carregar lista',
          description: 'Não foi possível ler os destinatários guardados.',
          variant: 'destructive',
        });
        setListRecipients([]);
      })
      .finally(() => setLoadingList(false));
  }, [open, listId, recipientsProp?.length, toast]);

  const toggleCampaign = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === appendableCampaigns.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(appendableCampaigns.map((c) => c.id)));
    }
  };

  const handleLink = async () => {
    if (selectedIds.size === 0) {
      toast({ title: 'Selecione ao menos uma campanha', variant: 'destructive' });
      return;
    }
    if (recipients.length === 0) {
      toast({ title: 'Lista sem destinatários', variant: 'destructive' });
      return;
    }
    setLinking(true);
    try {
      const count = await appendRecipientsToCampaigns(Array.from(selectedIds), recipients);
      await queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      for (const id of selectedIds) {
        await queryClient.invalidateQueries({ queryKey: ['email-campaign-recipients', id] });
      }
      toast({
        title: 'Listas vinculadas',
        description: `${count.toLocaleString('pt-BR')} contato(s) acrescentados em ${selectedIds.size} campanha(s).`,
      });
      onLinked?.();
      onOpenChange(false);
    } catch (e) {
      const axiosErr = e as { response?: { data?: { message?: string } } };
      toast({
        title: 'Erro ao vincular',
        description: axiosErr.response?.data?.message ?? (e instanceof Error ? e.message : 'Falha ao atualizar campanhas.'),
        variant: 'destructive',
      });
    } finally {
      setLinking(false);
    }
  };

  const titleLabel = listLabel ?? (recipients.length > 0 ? `${recipients.length} contato(s)` : 'Lista');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-seguranca-graphite bg-seguranca-graphite text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-seguranca-yellow" />
            Vincular a campanhas
          </DialogTitle>
          <DialogDescription className="text-seguranca-lightgray">
            Acrescenta <strong className="font-normal text-white">{titleLabel}</strong> às campanhas
            selecionadas (rascunho ou agendada, antes do envio). E-mails duplicados são ignorados no servidor.
          </DialogDescription>
        </DialogHeader>

        {loadingList ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-seguranca-yellow" />
          </div>
        ) : (
          <>
            {appendableCampaigns.length === 0 ? (
              <p className="py-6 text-center text-sm text-seguranca-lightgray">
                Não há campanhas em rascunho ou agendadas. Crie uma na aba Campanhas.
              </p>
            ) : (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-seguranca-yellow hover:text-seguranca-yellow/80"
                  onClick={toggleAll}
                >
                  {selectedIds.size === appendableCampaigns.length ? 'Desmarcar todas' : 'Selecionar todas'}
                </Button>
                <ScrollArea className="h-[min(280px,45vh)] rounded-md border border-white/10">
                  <ul className="divide-y divide-white/5 p-1">
                    {appendableCampaigns.map((c: EmailCampaignSummary) => {
                      const checked = selectedIds.has(c.id);
                      return (
                        <li key={c.id}>
                          <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-white/5">
                            <Checkbox checked={checked} onCheckedChange={() => toggleCampaign(c.id)} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-white">{c.title}</p>
                              <p className="text-xs text-seguranca-lightgray">
                                {CAMPAIGN_STATUS_LABELS[c.status ?? ''] ?? c.status} ·{' '}
                                {(c.recipientCount ?? 0).toLocaleString('pt-BR')} destinatário(s)
                              </p>
                            </div>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              </div>
            )}
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" className="border-white/20" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
            disabled={linking || loadingList || appendableCampaigns.length === 0 || recipients.length === 0}
            onClick={() => void handleLink()}
          >
            {linking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A vincular…
              </>
            ) : (
              `Vincular em ${selectedIds.size || 0} campanha(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LinkListToCampaignsDialog;
