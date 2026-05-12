import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/utils/formatters';
import emailCampaignService, {
  type EmailCampaignSummary,
} from '@/services/emailCampaignService';
import emailTemplateService from '@/services/emailTemplateService';
import CampaignWizardModal from './CampaignWizardModal';
import SmtpSettingsModal from './SmtpSettingsModal';
import CampaignDetailPanel from './CampaignDetailPanel';
import {
  Plus,
  Send,
  RefreshCw,
  Loader2,
  Mail,
  Users,
  PauseCircle,
  PlayCircle,
  XCircle,
  Server,
} from 'lucide-react';

const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  SCHEDULED: 'Agendada',
  RUNNING: 'Enviando',
  PAUSED: 'Pausada',
  COMPLETED: 'Concluída',
  CANCELED: 'Cancelada',
};

function campaignStatusVariant(status?: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'RUNNING':
    case 'SCHEDULED':
      return 'default';
    case 'COMPLETED':
      return 'secondary';
    case 'CANCELED':
      return 'destructive';
    case 'PAUSED':
      return 'outline';
    default:
      return 'outline';
  }
}

const CampaignsTab: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [smtpOpen, setSmtpOpen] = useState(false);
  const [sendMode, setSendMode] = useState<'template' | 'manual'>('template');
  const [sendTemplateId, setSendTemplateId] = useState<string>('');
  const [sendSubject, setSendSubject] = useState('');
  const [sendHtml, setSendHtml] = useState('');

  const campaignsQuery = useQuery({
    queryKey: ['email-campaigns'],
    queryFn: () => emailCampaignService.list(),
  });

  const templatesQuery = useQuery({
    queryKey: ['email-templates', 'active'],
    queryFn: () => emailTemplateService.list(true),
  });

  const campaigns = campaignsQuery.data ?? [];
  const templates = templatesQuery.data ?? [];

  useEffect(() => {
    if (!selectedId && campaigns.length > 0) {
      setSelectedId(campaigns[0].id);
    }
  }, [campaigns, selectedId]);

  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === selectedId) ?? null,
    [campaigns, selectedId]
  );

  const sendMutation = useMutation({
    mutationFn: () => {
      if (sendMode === 'template') {
        if (!sendTemplateId) throw new Error('Selecione um template.');
        return emailCampaignService.send(selectedId!, { templateId: sendTemplateId });
      }
      return emailCampaignService.send(selectedId!, {
        subject: sendSubject.trim(),
        htmlBody: sendHtml,
      });
    },
    onSuccess: async () => {
      toast({
        title: 'Envio iniciado',
        description: 'E-mails disparados via SendGrid (verifique a configuração da API).',
      });
      setSendOpen(false);
      setSendSubject('');
      setSendHtml('');
      await queryClient.invalidateQueries({ queryKey: ['email-campaign-metrics', selectedId] });
      await queryClient.invalidateQueries({ queryKey: ['email-campaign-logs', selectedId] });
      await queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Falha no envio.';
      toast({ title: 'Erro no envio', description: msg, variant: 'destructive' });
    },
  });

  const invalidateAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
    if (selectedId) {
      await queryClient.invalidateQueries({ queryKey: ['email-campaign-metrics', selectedId] });
      await queryClient.invalidateQueries({ queryKey: ['email-campaign-logs', selectedId] });
    }
  }, [queryClient, selectedId]);

  const pauseMutation = useMutation({
    mutationFn: () => emailCampaignService.pause(selectedId!),
    onSuccess: () => {
      toast({ title: 'Campanha pausada', description: 'O envio foi suspenso temporariamente.' });
      void invalidateAll();
    },
    onError: (err: unknown) => {
      toast({
        title: 'Não foi possível pausar',
        description: err instanceof Error ? err.message : 'Erro inesperado.',
        variant: 'destructive',
      });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => emailCampaignService.resume(selectedId!),
    onSuccess: () => {
      toast({ title: 'Campanha retomada' });
      void invalidateAll();
    },
    onError: (err: unknown) => {
      toast({
        title: 'Não foi possível retomar',
        description: err instanceof Error ? err.message : 'Erro inesperado.',
        variant: 'destructive',
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => emailCampaignService.cancel(selectedId!),
    onSuccess: () => {
      toast({ title: 'Campanha cancelada' });
      void invalidateAll();
    },
    onError: (err: unknown) => {
      toast({
        title: 'Não foi possível cancelar',
        description: err instanceof Error ? err.message : 'Erro inesperado.',
        variant: 'destructive',
      });
    },
  });

  const canPause =
    selectedCampaign?.status === 'RUNNING' || selectedCampaign?.status === 'SCHEDULED';
  const canResume = selectedCampaign?.status === 'PAUSED';
  const canCancel =
    selectedCampaign &&
    selectedCampaign.status !== 'COMPLETED' &&
    selectedCampaign.status !== 'CANCELED';

  const handleSendSubmit = () => {
    if (!selectedId) return;
    if (sendMode === 'template') {
      if (!sendTemplateId) {
        toast({ title: 'Selecione um template', variant: 'destructive' });
        return;
      }
    } else {
      if (!sendSubject.trim()) {
        toast({ title: 'Assunto obrigatório', variant: 'destructive' });
        return;
      }
      if (!sendHtml.trim()) {
        toast({
          title: 'Corpo HTML',
          description: 'Preencha o conteúdo do e-mail.',
          variant: 'destructive',
        });
        return;
      }
    }
    sendMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Campanhas</h2>
          <p className="text-sm text-seguranca-lightgray">
            Crie, dispare e acompanhe entregas, aberturas e respostas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-seguranca-graphite text-seguranca-lightgray hover:text-seguranca-yellow"
            onClick={() => void invalidateAll()}
            disabled={campaignsQuery.isFetching}
          >
            {campaignsQuery.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Atualizar</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-seguranca-graphite text-seguranca-lightgray hover:text-seguranca-yellow"
            onClick={() => setSmtpOpen(true)}
          >
            <Server className="h-4 w-4" />
            <span className="ml-2">SMTP</span>
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="ml-2">Nova campanha</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!selectedId}
            onClick={() => setSendOpen(true)}
          >
            <Send className="h-4 w-4" />
            <span className="ml-2">Iniciar envio</span>
          </Button>
          {canPause && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-amber-500 text-amber-300 hover:bg-amber-500/10"
              disabled={pauseMutation.isPending}
              onClick={() => pauseMutation.mutate()}
            >
              {pauseMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PauseCircle className="h-4 w-4" />
              )}
              <span className="ml-2">Pausar</span>
            </Button>
          )}
          {canResume && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-emerald-500 text-emerald-300 hover:bg-emerald-500/10"
              disabled={resumeMutation.isPending}
              onClick={() => resumeMutation.mutate()}
            >
              {resumeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              <span className="ml-2">Retomar</span>
            </Button>
          )}
          {canCancel && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-red-500 text-red-300 hover:bg-red-500/10"
              disabled={cancelMutation.isPending}
              onClick={() => {
                if (window.confirm('Tem certeza que deseja cancelar esta campanha? Envios pendentes serão descartados.')) {
                  cancelMutation.mutate();
                }
              }}
            >
              {cancelMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span className="ml-2">Cancelar</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="border-seguranca-graphite bg-seguranca-graphite/40 lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Users className="h-4 w-4 text-seguranca-yellow" />
              Lista de campanhas
            </CardTitle>
            <CardDescription className="text-seguranca-lightgray">
              Selecione uma campanha para ver métricas e registros.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {campaignsQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
              </div>
            ) : campaigns.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-seguranca-lightgray">
                Nenhuma campanha ainda. Clique em{' '}
                <strong className="text-seguranca-yellow">Nova campanha</strong> para começar.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-seguranca-graphite hover:bg-transparent">
                    <TableHead className="text-seguranca-lightgray">Título</TableHead>
                    <TableHead className="text-seguranca-lightgray">Status</TableHead>
                    <TableHead className="text-right text-seguranca-lightgray">Dest.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c: EmailCampaignSummary) => (
                    <TableRow
                      key={c.id}
                      className={`cursor-pointer border-seguranca-graphite ${
                        selectedId === c.id ? 'bg-seguranca-black/80' : 'hover:bg-seguranca-black/50'
                      }`}
                      onClick={() => setSelectedId(c.id)}
                    >
                      <TableCell className="max-w-[180px] truncate font-medium text-white">
                        {c.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant={campaignStatusVariant(c.status)} className="whitespace-nowrap">
                          {CAMPAIGN_STATUS_LABELS[c.status ?? 'DRAFT'] ?? (c.status ?? 'Rascunho')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-seguranca-lightgray">
                        {c.recipientCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-8">
          {!selectedCampaign ? (
            <Card className="border-seguranca-graphite bg-seguranca-graphite/40">
              <CardContent className="py-16 text-center">
                <Mail className="mx-auto mb-3 h-10 w-10 text-seguranca-graphite" />
                <p className="text-sm text-seguranca-lightgray">
                  Selecione uma campanha à esquerda para ver KPIs, funil e registros.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-1 flex flex-wrap items-center gap-3">
                <h3 className="text-base font-semibold text-white">{selectedCampaign.title}</h3>
                {selectedCampaign.status && (
                  <Badge variant={campaignStatusVariant(selectedCampaign.status)}>
                    {CAMPAIGN_STATUS_LABELS[selectedCampaign.status] ?? selectedCampaign.status}
                  </Badge>
                )}
                {selectedCampaign.dailyLimit && (
                  <span className="text-xs text-seguranca-lightgray">
                    Limite diário: <strong className="text-white">{selectedCampaign.dailyLimit}</strong>
                  </span>
                )}
                {selectedCampaign.hourlyLimit && (
                  <span className="text-xs text-seguranca-lightgray">
                    Por hora: <strong className="text-white">{selectedCampaign.hourlyLimit}</strong>
                  </span>
                )}
                {selectedCampaign.scheduledAt && (
                  <span className="text-xs text-seguranca-lightgray">
                    Agendada para:{' '}
                    <strong className="text-white">{formatDate(selectedCampaign.scheduledAt)}</strong>
                  </span>
                )}
                {selectedCampaign.providerType && (
                  <Badge variant="outline" className="border-seguranca-graphite text-seguranca-lightgray">
                    {selectedCampaign.providerType}
                  </Badge>
                )}
              </div>
              <CampaignDetailPanel campaign={selectedCampaign} />
            </>
          )}
        </div>
      </div>

      <CampaignWizardModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => setSelectedId(id)}
      />

      <SmtpSettingsModal open={smtpOpen} onOpenChange={setSmtpOpen} />

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-seguranca-graphite bg-seguranca-graphite text-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Enviar campanha</DialogTitle>
            <DialogDescription className="text-seguranca-lightgray">
              Escolha um template (com variáveis dinâmicas) ou redija manualmente em HTML.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="flex gap-2 rounded-md bg-seguranca-black p-1">
              <button
                type="button"
                className={`flex-1 rounded px-3 py-1.5 text-sm transition ${
                  sendMode === 'template'
                    ? 'bg-seguranca-yellow text-seguranca-black font-semibold'
                    : 'text-seguranca-lightgray hover:text-white'
                }`}
                onClick={() => setSendMode('template')}
              >
                Usar template
              </button>
              <button
                type="button"
                className={`flex-1 rounded px-3 py-1.5 text-sm transition ${
                  sendMode === 'manual'
                    ? 'bg-seguranca-yellow text-seguranca-black font-semibold'
                    : 'text-seguranca-lightgray hover:text-white'
                }`}
                onClick={() => setSendMode('manual')}
              >
                Manual (HTML)
              </button>
            </div>

            {sendMode === 'template' ? (
              <div className="space-y-2">
                <Label htmlFor="send-template">Template</Label>
                <Select value={sendTemplateId} onValueChange={setSendTemplateId}>
                  <SelectTrigger
                    id="send-template"
                    className="border-seguranca-graphite bg-seguranca-black text-white"
                  >
                    <SelectValue placeholder="Selecione um template…" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.length === 0 && (
                      <div className="px-3 py-2 text-xs text-seguranca-lightgray">
                        Nenhum template disponível. Crie um na aba Templates E-mail.
                      </div>
                    )}
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                        {t.isDefault && (
                          <span className="ml-2 text-[10px] text-seguranca-yellow">PADRÃO</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-seguranca-lightgray">
                  Variáveis como <code>{'{{nomeContato}}'}</code> e{' '}
                  <code>{'{{nomeEmpresa}}'}</code> são preenchidas por destinatário a partir dos
                  metadados informados.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="send-subject">Assunto</Label>
                  <Input
                    id="send-subject"
                    value={sendSubject}
                    onChange={(e) => setSendSubject(e.target.value)}
                    className="border-seguranca-graphite bg-seguranca-black text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="send-html">Corpo (HTML)</Label>
                  <Textarea
                    id="send-html"
                    rows={10}
                    value={sendHtml}
                    onChange={(e) => setSendHtml(e.target.value)}
                    className="border-seguranca-graphite bg-seguranca-black font-mono text-sm text-white"
                    placeholder="<p>Olá {{nomeContato}}, ...</p>"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSendOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-seguranca-yellow text-seguranca-black"
              disabled={sendMutation.isPending || !selectedId}
              onClick={handleSendSubmit}
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Disparar e-mails'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignsTab;
