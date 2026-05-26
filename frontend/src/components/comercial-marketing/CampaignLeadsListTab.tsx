import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Loader2, X } from 'lucide-react';
import { RecipientPicker } from '@/components/comercial-marketing/RecipientPicker';
import { RecipientSegmentSelector } from '@/components/comercial-marketing/RecipientSegmentSelector';
import {
  applySegmentRules,
  type RecipientSegmentRule,
} from '@/components/comercial-marketing/utils/recipientMetadata';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import emailCampaignService, { type EmailCampaignRecipientInput } from '@/services/emailCampaignService';

const CampaignLeadsListTab: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [recipients, setRecipients] = useState<EmailCampaignRecipientInput[]>([]);
  const [segmentRules, setSegmentRules] = useState<RecipientSegmentRule[]>([]);
  const [campaignId, setCampaignId] = useState<string>('');
  const [checkingOptOut, setCheckingOptOut] = useState(false);

  const filteredRecipients = React.useMemo(
    () => applySegmentRules(recipients, segmentRules),
    [recipients, segmentRules],
  );

  const campaignsQuery = useQuery({
    queryKey: ['email-campaigns'],
    queryFn: () => emailCampaignService.list(),
  });

  const draftCampaigns = (campaignsQuery.data ?? []).filter((c) => c.status === 'DRAFT');

  const appendMutation = useMutation({
    mutationFn: async () => {
      if (!campaignId) throw new Error('Selecione uma campanha em rascunho.');
      if (filteredRecipients.length === 0) throw new Error('Monte a lista de destinatários antes de enviar.');
      await emailCampaignService.appendRecipients(campaignId, filteredRecipients);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast({
        title: 'Lista aplicada à campanha',
        description: 'Os destinatários foram acrescentados ao rascunho. Pode continuar a montar outro lote.',
      });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Não foi possível atualizar a campanha.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    },
  });

  const handleRecipientsChange = async (next: EmailCampaignRecipientInput[]) => {
    const prevLower = new Set(recipients.map((r) => r.email.toLowerCase()));
    const added = next.filter((r) => !prevLower.has(r.email.toLowerCase()));
    if (added.length === 0) {
      setRecipients(next);
      return;
    }
    setCheckingOptOut(true);
    try {
      const emails = added.map((r) => r.email);
      const unsubscribed = await emailCampaignService.checkUnsubscribed(emails);
      if (unsubscribed.length === 0) {
        setRecipients(next);
        return;
      }
      const block = new Set(unsubscribed.map((e) => e.toLowerCase()));
      const filtered = next.filter((r) => !block.has(r.email.toLowerCase()));
      setRecipients(filtered);
      toast({
        title: 'Opt-out aplicado',
        description: `${unsubscribed.length} e-mail(is) descadastrado(s) foram excluídos da seleção.`,
      });
    } catch {
      toast({
        title: 'Não foi possível verificar descadastros',
        description: 'A lista foi atualizada; confira os destinatários antes de enviar.',
        variant: 'destructive',
      });
      setRecipients(next);
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
    <div className="mx-auto max-w-4xl space-y-6 text-center">
      <div className="space-y-2">
        <div className="inline-flex items-center justify-center gap-2">
          <FileText className="h-8 w-8 text-seguranca-yellow" />
          <h2 className="text-xl font-semibold text-slate-100">Lista de leads para campanhas</h2>
        </div>
        <p className="text-sm text-slate-400">
          Importe contatos por CSV/Excel (mapeie cidade, estado e tipo de empresa), monte lotes por região com
          quantidade definida e remova automaticamente quem pediu descadastro (opt-out).
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-seguranca-graphite/40 p-5 text-left shadow-sm">
        <div className="space-y-2">
          <Label className="text-slate-200">Campanha em rascunho (destino da lista)</Label>
          <Select value={campaignId || undefined} onValueChange={setCampaignId}>
            <SelectTrigger className="border-white/10 bg-seguranca-black/30 text-slate-100">
              <SelectValue placeholder="Selecione uma campanha…" />
            </SelectTrigger>
            <SelectContent>
              {draftCampaigns.length === 0 ? (
                <div className="max-w-xs p-3 text-left text-sm text-slate-500">
                  Nenhuma campanha em rascunho. Crie uma na aba Campanhas e volte aqui.
                </div>
              ) : (
                draftCampaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">
            Só é possível acrescentar destinatários enquanto a campanha estiver em rascunho.
          </p>
        </div>

        <div className="relative mt-6">
          {checkingOptOut && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/40">
              <span className="flex items-center gap-2 text-sm text-slate-100">
                <Loader2 className="h-4 w-4 animate-spin" /> A verificar descadastros…
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
                  }}
                >
                  Limpar lista
                </Button>
              </div>
            </div>
            <ScrollArea className="max-h-40">
              <div className="flex flex-wrap gap-1.5">
                {filteredRecipients.slice(0, 80).map((r) => (
                  <Badge key={r.email} variant="outline" className="border-white/15 text-xs text-slate-200">
                    {r.email}
                    <button
                      type="button"
                      className="ml-1 text-slate-500 hover:text-rose-400"
                      onClick={() => setRecipients((prev) => prev.filter((x) => x.email !== r.email))}
                      aria-label="Remover"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {filteredRecipients.length > 80 && (
                  <Badge variant="outline" className="border-white/15">
                    +{filteredRecipients.length - 80} mais
                  </Badge>
                )}
              </div>
            </ScrollArea>
          </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            className="bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
            disabled={
              !campaignId ||
              filteredRecipients.length === 0 ||
              appendMutation.isPending ||
              checkingOptOut ||
              draftCampaigns.length === 0
            }
            onClick={() => appendMutation.mutate()}
          >
            {appendMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A gravar…
              </>
            ) : (
              'Acrescentar à campanha selecionada'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CampaignLeadsListTab;
