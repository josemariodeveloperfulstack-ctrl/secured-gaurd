import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ClipboardList, FileText, Link2, Loader2, MapPin, Save } from 'lucide-react';
import SaveCityImportedListDialog from '@/components/comercial-marketing/SaveCityImportedListDialog';
import LinkListToCampaignsDialog from '@/components/comercial-marketing/LinkListToCampaignsDialog';
import { appendRecipientsToCampaigns } from '@/components/comercial-marketing/utils/appendRecipientsToCampaigns';
import { RecipientPicker } from '@/components/comercial-marketing/RecipientPicker';
import {
  RecipientListGrouped,
  type SelectedCityBatch,
} from '@/components/comercial-marketing/RecipientListGrouped';
import { RecipientSegmentSelector } from '@/components/comercial-marketing/RecipientSegmentSelector';
import {
  applySegmentRules,
  type RecipientSegmentRule,
} from '@/components/comercial-marketing/utils/recipientMetadata';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import emailCampaignService, { type EmailCampaignRecipientInput } from '@/services/emailCampaignService';
import { isValidEmail } from '@/components/comercial-marketing/utils/recipientParser';
import {
  attachLeadIdsToRecipients,
  persistImportedLeadsToCrm,
} from '@/components/comercial-marketing/utils/persistImportedLeads';
interface CampaignLeadsListTabProps {
  /** Campanha pré-selecionada (ex.: vinda do painel Campanhas → Acrescentar por cidade). */
  initialCampaignId?: string;
}

const CampaignLeadsListTab: React.FC<CampaignLeadsListTabProps> = ({ initialCampaignId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [recipients, setRecipients] = useState<EmailCampaignRecipientInput[]>([]);
  const [segmentRules, setSegmentRules] = useState<RecipientSegmentRule[]>([]);
  const [campaignId, setCampaignId] = useState<string>('');
  const [checkingOptOut, setCheckingOptOut] = useState(false);
  const [savingLeadsToCrm, setSavingLeadsToCrm] = useState(false);
  const [selectedCityBatch, setSelectedCityBatch] = useState<SelectedCityBatch | null>(null);
  const [saveCityOpen, setSaveCityOpen] = useState(false);
  const [saveFullOpen, setSaveFullOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [masterListName, setMasterListName] = useState<string | undefined>();
  const [loadListId, setLoadListId] = useState<string>('');

  const importedListsQuery = useQuery({
    queryKey: ['email-marketing-imported-lists'],
    queryFn: () => emailCampaignService.listImportedLists(),
  });

  const filteredRecipients = React.useMemo(
    () => applySegmentRules(recipients, segmentRules),
    [recipients, segmentRules],
  );

  /** Destinatários da cidade selecionada (já refletem segmentação via `filteredRecipients`). */
  const recipientsToAppend = selectedCityBatch?.recipients ?? [];

  const campaignsQuery = useQuery({
    queryKey: ['email-campaigns'],
    queryFn: () => emailCampaignService.list(),
  });

  /** Rascunho ou agendada — ainda dá para acrescentar destinatários por cidade. */
  const appendableCampaigns = (campaignsQuery.data ?? []).filter(
    (c) => c.status === 'DRAFT' || c.status === 'SCHEDULED',
  );

  useEffect(() => {
    if (initialCampaignId && appendableCampaigns.some((c) => c.id === initialCampaignId)) {
      setCampaignId(initialCampaignId);
      return;
    }
    if (campaignId || appendableCampaigns.length !== 1) return;
    setCampaignId(appendableCampaigns[0].id);
  }, [appendableCampaigns, campaignId, initialCampaignId]);

  const appendDisabledReason = useMemo(() => {
    if (checkingOptOut) return 'Aguarde a verificação de descadastros (opt-out).';
    if (savingLeadsToCrm) return 'Gravando leads importados no CRM…';
    if (appendableCampaigns.length === 0) {
      return 'Não há campanha em rascunho ou agendada. Crie ou agende uma na aba Campanhas e volte aqui.';
    }
    if (!campaignId) return 'Selecione a campanha de destino no campo acima.';
    if (recipients.length > 0 && !selectedCityBatch) {
      return 'Selecione uma cidade na lista à esquerda para acrescentar à campanha.';
    }
    if (recipientsToAppend.length === 0) {
      return 'Nenhum destinatário nesta cidade após os filtros de segmentação.';
    }
    return null;
  }, [
    checkingOptOut,
    savingLeadsToCrm,
    appendableCampaigns.length,
    campaignId,
    recipients.length,
    selectedCityBatch,
    recipientsToAppend.length,
  ]);

  const appendMutation = useMutation({
    mutationFn: async () => {
      if (!campaignId) throw new Error('Selecione uma campanha de destino.');
      if (recipientsToAppend.length === 0) {
        throw new Error('Selecione uma cidade com destinatários antes de enviar.');
      }
      const total = await appendRecipientsToCampaigns([campaignId], recipientsToAppend);
      if (total === 0) throw new Error('Nenhum destinatário válido nesta cidade após validação.');
      return total;
    },
    onSuccess: (total) => {
      void queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      void queryClient.invalidateQueries({ queryKey: ['email-campaign-recipients', campaignId] });
      toast({
        title: 'Lista aplicada à campanha',
        description: `${total?.toLocaleString('pt-BR') ?? ''} destinatário(s) de ${selectedCityBatch?.cityLabel ?? 'cidade selecionada'} acrescentados à campanha.`,
      });
    },
    onError: (e: unknown) => {
      const axiosErr = e as { response?: { data?: { message?: string; errors?: Record<string, string> } } };
      const apiMsg = axiosErr.response?.data?.message;
      const msg =
        apiMsg ||
        (e instanceof Error ? e.message : 'Não foi possível atualizar a campanha.');
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    },
  });

  const applyRecipientsAfterImport = useCallback(
    async (sanitized: EmailCampaignRecipientInput[], batchToPersist: EmailCampaignRecipientInput[]) => {
      setSavingLeadsToCrm(true);
      try {
        const { created, updated, skipped, emailToLeadId } = await persistImportedLeadsToCrm(batchToPersist);
        const withLeadIds = attachLeadIdsToRecipients(sanitized, emailToLeadId);
        setRecipients(withLeadIds);
        void queryClient.invalidateQueries({ queryKey: ['leads'] });
        void queryClient.invalidateQueries({ queryKey: ['leads', 'all'] });
        if (batchToPersist.length > 0) {
          toast({
            title: 'Leads gravados no CRM',
            description: `${created.toLocaleString('pt-BR')} novo(s), ${updated.toLocaleString('pt-BR')} atualizado(s)${skipped > 0 ? `, ${skipped} ignorado(s)` : ''}. Disponíveis na aba Leads do CRM.`,
          });
        }
      } catch (e) {
        console.error('Erro ao gravar leads no CRM:', e);
        setRecipients(sanitized);
        const axiosErr = e as { response?: { data?: { message?: string } } };
        const apiMsg = axiosErr.response?.data?.message;
        toast({
          title: 'Lista importada, mas CRM não atualizado',
          description:
            apiMsg ||
            (e instanceof Error
              ? e.message
              : 'Os contatos estão na lista local; tente importar novamente ou verifique a conexão.'),
          variant: 'destructive',
        });
      } finally {
        setSavingLeadsToCrm(false);
      }
    },
    [queryClient, toast],
  );

  const handleRecipientsChange = async (next: EmailCampaignRecipientInput[]) => {
    const sanitized = next.filter((r) => isValidEmail(r.email));
    const droppedInvalid = next.length - sanitized.length;
    if (droppedInvalid > 0) {
      toast({
        title: 'E-mails inválidos ignorados',
        description: `${droppedInvalid} linha(s) sem e-mail válido foram excluídas da lista.`,
        variant: 'destructive',
      });
    }
    const prevLower = new Set(recipients.map((r) => r.email.toLowerCase()));
    const added = sanitized.filter((r) => !prevLower.has(r.email.toLowerCase()));
    if (added.length === 0) {
      setRecipients(sanitized);
      setSelectedCityBatch(null);
      return;
    }
    setCheckingOptOut(true);
    try {
      const emails = added.map((r) => r.email);
      const unsubscribed = await emailCampaignService.checkUnsubscribed(emails);
      let afterOptOut = sanitized;
      if (unsubscribed.length > 0) {
        const block = new Set(unsubscribed.map((e) => e.toLowerCase()));
        afterOptOut = sanitized.filter((r) => !block.has(r.email.toLowerCase()));
        toast({
          title: 'Opt-out aplicado',
          description: `${unsubscribed.length} e-mail(is) descadastrado(s) foram excluídos da seleção.`,
        });
      }
      const rejected = await emailCampaignService.checkRejected(added.map((r) => r.email));
      let afterFilters = afterOptOut;
      if (rejected.length > 0) {
        const blockRejected = new Set(rejected.map((e) => e.toLowerCase()));
        afterFilters = afterOptOut.filter((r) => !blockRejected.has(r.email.toLowerCase()));
        toast({
          title: 'Rejeitados excluídos',
          description: `${rejected.length} e-mail(is) da lista de rejeitados não foram incluídos.`,
        });
      }
      const addedAfterOptOut = afterFilters.filter((r) => !prevLower.has(r.email.toLowerCase()));
      await applyRecipientsAfterImport(afterFilters, addedAfterOptOut);
    } catch {
      toast({
        title: 'Não foi possível verificar descadastros',
        description: 'A lista foi atualizada; confira os destinatários antes de enviar.',
        variant: 'destructive',
      });
      await applyRecipientsAfterImport(sanitized, added);
    } finally {
      setCheckingOptOut(false);
    }
  };

  const exportCsv = () => {
    const lines = [
      ['email', 'name', 'sourceType', 'leadId', 'company', 'city', 'state', 'companyType', 'segment'].join(','),
      ...filteredRecipients.map((r) => {
        const meta = r.metadata ?? {};
        const esc = (s: string) => (s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s);
        return [
          esc(r.email),
          esc((r.name ?? '').toString()),
          esc((r.sourceType ?? '').toString()),
          esc((r.leadId ?? '').toString()),
          esc(String(meta.company ?? '')),
          esc(String(meta.city ?? meta.cidade ?? '')),
          esc(String(meta.state ?? meta.estado ?? '')),
          esc(String(meta.companyType ?? meta.tipoEmpresa ?? '')),
          esc(String(meta.segment ?? '')),
        ].join(',');
      }),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lista-leads-campanha-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
      <div className="mx-auto max-w-6xl space-y-6 text-center">
      <div className="space-y-2">
        <div className="inline-flex items-center justify-center gap-2">
          <FileText className="h-8 w-8 text-seguranca-yellow" />
          <h2 className="text-xl font-semibold text-slate-100">Lista de leads para campanhas</h2>
        </div>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto">
          <strong className="text-slate-300">1.</strong> Importe a planilha completa (mapeie a coluna cidade).{' '}
          <strong className="text-slate-300">2.</strong> Selecione uma cidade e guarde como lista reutilizável.{' '}
          <strong className="text-slate-300">3.</strong> Vincule essa lista a uma ou mais campanhas — ou acrescente
          direto à campanha selecionada abaixo.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-seguranca-graphite/40 p-5 text-left shadow-sm">
        {(importedListsQuery.data?.length ?? 0) > 0 && (
          <div className="mb-6 space-y-2">
            <Label className="text-slate-200">Carregar lista guardada</Label>
            <div className="flex flex-wrap gap-2">
              <Select
                value={loadListId}
                onValueChange={async (id) => {
                  setLoadListId(id);
                  if (!id) return;
                  try {
                    const detail = await emailCampaignService.getImportedList(id);
                    setRecipients(detail.recipients ?? []);
                    setSegmentRules([]);
                    setSelectedCityBatch(null);
                    toast({
                      title: 'Lista carregada',
                      description: `${(detail.recipients?.length ?? 0).toLocaleString('pt-BR')} contato(s) — «${detail.name}».`,
                    });
                  } catch {
                    toast({
                      title: 'Erro ao carregar lista',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                <SelectTrigger className="max-w-md border-white/10 bg-seguranca-black/30 text-slate-100">
                  <SelectValue placeholder="Escolha uma lista importada…" />
                </SelectTrigger>
                <SelectContent>
                  {(importedListsQuery.data ?? []).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} ({l.recipientCount.toLocaleString('pt-BR')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadListId && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setLoadListId('')}>
                  Limpar seleção
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-slate-200">Campanha rápida (opcional — um clique)</Label>
          <Select value={campaignId} onValueChange={setCampaignId}>
            <SelectTrigger className="border-white/10 bg-seguranca-black/30 text-slate-100">
              <SelectValue placeholder="Selecione uma campanha…" />
            </SelectTrigger>
            <SelectContent>
              {appendableCampaigns.length === 0 ? (
                <div className="max-w-xs p-3 text-left text-sm text-slate-500">
                  Nenhuma campanha em rascunho ou agendada. Crie uma na aba Campanhas e volte aqui.
                </div>
              ) : (
                appendableCampaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                    {c.status === 'SCHEDULED' ? ' (agendada)' : ''}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">
            Acrescente destinatários por cidade enquanto a campanha estiver em rascunho ou agendada (antes do envio).
            {appendableCampaigns.length === 1 && campaignId && (
              <span className="text-seguranca-yellow"> Campanha selecionada automaticamente.</span>
            )}
          </p>
          {appendableCampaigns.length === 0 && !campaignsQuery.isLoading && (
            <p className="text-xs text-amber-400/90 flex items-start gap-1.5 mt-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Crie uma campanha na aba <strong>Campanhas</strong> (status rascunho) para habilitar o botão abaixo.
            </p>
          )}
        </div>

        <div className="relative mt-6">
          {(checkingOptOut || savingLeadsToCrm) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/40">
              <span className="flex items-center gap-2 text-sm text-slate-100">
                <Loader2 className="h-4 w-4 animate-spin" />
                {savingLeadsToCrm ? 'A gravar leads no CRM…' : 'A verificar descadastros…'}
              </span>
            </div>
          )}
          <RecipientPicker
            value={recipients}
            onChange={handleRecipientsChange}
            darkTabs
            columnMappingImport
            advancedLeadFilters
          />
        </div>

        {recipients.length > 0 && (
          <div className="mt-6 space-y-4">
            <RecipientSegmentSelector
              recipients={recipients}
              rules={segmentRules}
              onRulesChange={setSegmentRules}
              dark
            />
          <div className="rounded-lg border border-white/10 bg-seguranca-black/25 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-200">
                {filteredRecipients.length} destinatário(s) na lista
                {filteredRecipients.length !== recipients.length && (
                  <span className="ml-1 text-xs font-normal text-slate-500">
                    (de {recipients.length} importados)
                  </span>
                )}
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-white/20"
                  disabled={!selectedCityBatch}
                  onClick={() => setSaveCityOpen(true)}
                >
                  <MapPin className="mr-1.5 h-3.5 w-3.5" />
                  Criar lista desta cidade
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-white/20"
                  disabled={filteredRecipients.length === 0}
                  onClick={() => setSaveFullOpen(true)}
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Guardar importação completa
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-seguranca-yellow/40 text-seguranca-yellow"
                  disabled={!selectedCityBatch && filteredRecipients.length === 0}
                  onClick={() => setLinkOpen(true)}
                >
                  <Link2 className="mr-1.5 h-3.5 w-3.5" />
                  Vincular a campanhas…
                </Button>
                <Button type="button" variant="outline" size="sm" className="border-white/20" onClick={exportCsv}>
                  Exportar CSV
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRecipients([]);
                    setSegmentRules([]);
                    setSelectedCityBatch(null);
                    setLoadListId('');
                  }}
                >
                  Limpar lista
                </Button>
              </div>
            </div>
            <RecipientListGrouped
              recipients={filteredRecipients}
              dark
              onSelectedCityChange={setSelectedCityBatch}
              onRemove={(email) => {
                setRecipients((prev) => prev.filter((x) => x.email !== email));
                setSelectedCityBatch((prev) =>
                  prev
                    ? {
                        ...prev,
                        recipients: prev.recipients.filter((x) => x.email !== email),
                      }
                    : null,
                );
              }}
            />
          </div>
          </div>
        )}

        <div className="mt-6 space-y-2">
          {appendDisabledReason && recipients.length > 0 && (
            <p className="flex items-start gap-2 text-xs text-amber-300/90 justify-end text-right">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {appendDisabledReason}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-white/20"
              disabled={!selectedCityBatch}
              onClick={() => setLinkOpen(true)}
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              Vincular cidade a várias campanhas
            </Button>
            <Button
              type="button"
              className="bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
              disabled={!!appendDisabledReason || appendMutation.isPending}
              onClick={() => appendMutation.mutate()}
            >
              {appendMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A gravar…
                </>
              ) : (
                selectedCityBatch
                  ? `Acrescentar ${recipientsToAppend.length.toLocaleString('pt-BR')} de ${selectedCityBatch.cityLabel} à campanha`
                  : 'Selecione uma cidade'
              )}
            </Button>
          </div>
        </div>
      </div>

      {selectedCityBatch && (
        <SaveCityImportedListDialog
          open={saveCityOpen}
          onOpenChange={setSaveCityOpen}
          cityLabel={selectedCityBatch.cityLabel}
          recipients={recipientsToAppend}
          parentListName={masterListName}
          onSaved={(id) => {
            void queryClient.invalidateQueries({ queryKey: ['email-marketing-imported-lists'] });
            toast({
              title: 'Lista por cidade criada',
              description: 'Use «Vincular a campanhas» ou a aba Listas importadas.',
            });
            setLoadListId(id);
          }}
        />
      )}

      <SaveCityImportedListDialog
        open={saveFullOpen}
        onOpenChange={setSaveFullOpen}
        cityLabel={`Importação completa (${filteredRecipients.length.toLocaleString('pt-BR')} contatos)`}
        recipients={filteredRecipients}
        onSaved={(id) => {
          const name = `Importação ${new Date().toLocaleDateString('pt-BR')}`;
          setMasterListName(name);
          void queryClient.invalidateQueries({ queryKey: ['email-marketing-imported-lists'] });
          toast({
            title: 'Importação completa guardada',
            description: 'Agora pode criar listas por cidade a partir desta base.',
          });
          setLoadListId(id);
        }}
      />

      <LinkListToCampaignsDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        recipients={selectedCityBatch ? recipientsToAppend : filteredRecipients}
        listLabel={
          selectedCityBatch
            ? `${selectedCityBatch.cityLabel} (${recipientsToAppend.length})`
            : `Importação (${filteredRecipients.length})`
        }
        initialCampaignIds={campaignId ? [campaignId] : []}
        onLinked={() => {
          void queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
          if (campaignId) {
            void queryClient.invalidateQueries({ queryKey: ['email-campaign-recipients', campaignId] });
          }
        }}
      />
    </div>
  );
};

export default CampaignLeadsListTab;
