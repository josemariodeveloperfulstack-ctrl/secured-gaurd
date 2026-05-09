import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StandardLayout } from '@/components/StandardLayout';
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
  type EmailCampaignRecipientInput,
  type EmailCampaignSummary,
  type EmailLogRow,
} from '@/services/emailCampaignService';
import {
  Megaphone,
  Plus,
  Send,
  RefreshCw,
  Loader2,
  Mail,
  Users,
  AlertCircle,
} from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  SENT: 'Enviado',
  DELIVERED: 'Entregue',
  OPENED: 'Aberto',
  CLICKED: 'Clicado',
  REPLIED: 'Respondido',
  BOUNCED: 'Devolvido',
  DROPPED: 'Rejeitado',
  DEFERRED: 'Adiado',
};

const METRIC_ORDER = [
  'PENDING',
  'SENT',
  'DELIVERED',
  'OPENED',
  'CLICKED',
  'REPLIED',
  'BOUNCED',
  'DROPPED',
  'DEFERRED',
] as const;

function parseRecipients(raw: string): EmailCampaignRecipientInput[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const out: EmailCampaignRecipientInput[] = [];
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const line of lines) {
    const parts = line.split(';').map((p) => p.trim());
    const email = parts[0];
    if (!email || !emailRe.test(email)) continue;
    const name = parts.length > 1 ? parts.slice(1).join(';').trim() || undefined : undefined;
    out.push({ email, name: name || undefined });
  }
  return out;
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'BOUNCED' || status === 'DROPPED') return 'destructive';
  if (status === 'REPLIED' || status === 'CLICKED') return 'default';
  if (status === 'OPENED' || status === 'DELIVERED') return 'secondary';
  return 'outline';
}

const ComercialMarketing: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTemplateId, setNewTemplateId] = useState('');
  const [newRecipientsText, setNewRecipientsText] = useState('');
  const [sendSubject, setSendSubject] = useState('');
  const [sendHtml, setSendHtml] = useState('');

  const campaignsQuery = useQuery({
    queryKey: ['email-campaigns'],
    queryFn: () => emailCampaignService.list(),
  });

  const metricsQuery = useQuery({
    queryKey: ['email-campaign-metrics', selectedId],
    queryFn: () => emailCampaignService.getMetrics(selectedId!),
    enabled: !!selectedId,
  });

  const logsQuery = useQuery({
    queryKey: ['email-campaign-logs', selectedId],
    queryFn: () => emailCampaignService.getLogs(selectedId!),
    enabled: !!selectedId,
  });

  const campaigns = campaignsQuery.data ?? [];

  useEffect(() => {
    if (!selectedId && campaigns.length > 0) {
      setSelectedId(campaigns[0].id);
    }
  }, [campaigns, selectedId]);

  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === selectedId) ?? null,
    [campaigns, selectedId]
  );

  const counts = metricsQuery.data?.countsByStatus ?? {};

  const createMutation = useMutation({
    mutationFn: () =>
      emailCampaignService.create({
        title: newTitle.trim(),
        templateId: newTemplateId.trim() || null,
        recipients: parseRecipients(newRecipientsText),
      }),
    onSuccess: async (res) => {
      toast({ title: 'Campanha criada', description: 'Destinatários salvos com sucesso.' });
      setCreateOpen(false);
      setNewTitle('');
      setNewTemplateId('');
      setNewRecipientsText('');
      await queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      setSelectedId(res.id);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro ao criar campanha.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    },
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      emailCampaignService.send(selectedId!, {
        subject: sendSubject.trim(),
        htmlBody: sendHtml,
      }),
    onSuccess: async () => {
      toast({ title: 'Envio iniciado', description: 'E-mails disparados via SendGrid (verifique a configuração da API).' });
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

  const handleCreateSubmit = () => {
    if (!newTitle.trim()) {
      toast({ title: 'Título obrigatório', variant: 'destructive' });
      return;
    }
    const rec = parseRecipients(newRecipientsText);
    if (rec.length === 0) {
      toast({ title: 'Destinatários', description: 'Informe ao menos um e-mail válido por linha.', variant: 'destructive' });
      return;
    }
    createMutation.mutate();
  };

  const handleSendSubmit = () => {
    if (!selectedId) return;
    if (!sendSubject.trim()) {
      toast({ title: 'Assunto obrigatório', variant: 'destructive' });
      return;
    }
    if (!sendHtml.trim()) {
      toast({ title: 'Corpo HTML', description: 'Preencha o conteúdo do e-mail.', variant: 'destructive' });
      return;
    }
    sendMutation.mutate();
  };

  const parsedPreviewCount = useMemo(() => parseRecipients(newRecipientsText).length, [newRecipientsText]);

  return (
    <StandardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-seguranca-black p-3 text-seguranca-yellow">
              <Megaphone className="h-8 w-8" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">E-mail marketing</h1>
              <p className="text-seguranca-lightgray text-sm">
                Campanhas, envio via SendGrid e acompanhamento de entregas, aberturas e respostas.
              </p>
            </div>
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
              <span className="ml-2">Enviar</span>
            </Button>
          </div>
        </div>

        <Card className="border-amber-500/30 bg-amber-950/20">
          <CardContent className="flex gap-3 pt-4 text-sm text-amber-100/90">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
            <p>
              Configure no backend as variáveis <code className="rounded bg-black/40 px-1">SENDGRID_API_KEY</code>,{' '}
              <code className="rounded bg-black/40 px-1">SENDGRID_FROM_EMAIL</code> e o webhook de eventos para
              atualizar aberturas e cliques automaticamente.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="border-seguranca-graphite bg-seguranca-graphite/40 lg:col-span-4">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Users className="h-4 w-4 text-seguranca-yellow" />
                Campanhas
              </CardTitle>
              <CardDescription className="text-seguranca-lightgray">
                Selecione uma campanha para ver métricas e registros de envio.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {campaignsQuery.isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
                </div>
              ) : campaigns.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-seguranca-lightgray">
                  Nenhuma campanha ainda. Clique em <strong className="text-seguranca-yellow">Nova campanha</strong> para
                  começar.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-seguranca-graphite hover:bg-transparent">
                      <TableHead className="text-seguranca-lightgray">Título</TableHead>
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
                        <TableCell className="max-w-[180px] truncate font-medium text-white">{c.title}</TableCell>
                        <TableCell className="text-right text-seguranca-lightgray">{c.recipientCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6 lg:col-span-8">
            {!selectedId ? null : (
              <>
                <div>
                  <h2 className="mb-3 text-lg font-semibold text-white">
                    {selectedCampaign?.title ?? 'Campanha'}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {METRIC_ORDER.map((key) => {
                      const n = counts[key] ?? 0;
                      const label = STATUS_LABELS[key] ?? key;
                      return (
                        <Card key={key} className="border-seguranca-graphite bg-seguranca-black/40">
                          <CardHeader className="pb-1 pt-4">
                            <CardDescription className="text-xs uppercase tracking-wide text-seguranca-lightgray">
                              {label}
                            </CardDescription>
                            <CardTitle className="text-2xl font-bold text-seguranca-yellow">{n}</CardTitle>
                          </CardHeader>
                        </Card>
                      );
                    })}
                  </div>
                  {metricsQuery.isLoading && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-seguranca-lightgray">
                      <Loader2 className="h-4 w-4 animate-spin" /> Carregando métricas…
                    </div>
                  )}
                </div>

                <Card className="border-seguranca-graphite bg-seguranca-graphite/40">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base text-white">
                      <Mail className="h-4 w-4 text-seguranca-yellow" />
                      Registros de envio
                    </CardTitle>
                    <CardDescription className="text-seguranca-lightgray">
                      Status por destinatário (atualizado por webhooks após configuração do SendGrid).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    {logsQuery.isLoading ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
                      </div>
                    ) : (logsQuery.data?.length ?? 0) === 0 ? (
                      <p className="py-8 text-center text-sm text-seguranca-lightgray">
                        Ainda não há envios registrados para esta campanha. Use <strong className="text-seguranca-yellow">Enviar</strong>.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-seguranca-graphite hover:bg-transparent">
                            <TableHead className="text-seguranca-lightgray">Destinatário</TableHead>
                            <TableHead className="text-seguranca-lightgray">Status</TableHead>
                            <TableHead className="text-seguranca-lightgray">Lido em</TableHead>
                            <TableHead className="text-seguranca-lightgray">Respondido</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(logsQuery.data ?? []).map((row: EmailLogRow) => (
                            <TableRow key={row.id} className="border-seguranca-graphite">
                              <TableCell>
                                <div className="font-medium text-white">{row.recipientEmail ?? '—'}</div>
                                {row.recipientName && (
                                  <div className="text-xs text-seguranca-lightgray">{row.recipientName}</div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={statusBadgeVariant(row.status)}>
                                  {STATUS_LABELS[row.status] ?? row.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-seguranca-lightgray">
                                {row.readAt ? formatDate(row.readAt) : '—'}
                              </TableCell>
                              <TableCell className="text-sm text-seguranca-lightgray">
                                {row.repliedAt ? formatDate(row.repliedAt) : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-seguranca-graphite bg-seguranca-graphite text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova campanha</DialogTitle>
            <DialogDescription className="text-seguranca-lightgray">
              Uma linha por destinatário: <code className="text-seguranca-yellow">email@dominio.com</code> ou{' '}
              <code className="text-seguranca-yellow">email@dominio.com;Nome</code>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="camp-title">Título da campanha</Label>
              <Input
                id="camp-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex.: Convite webinar Q2"
                className="border-seguranca-graphite bg-seguranca-black text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="camp-template">ID do template (opcional)</Label>
              <Input
                id="camp-template"
                value={newTemplateId}
                onChange={(e) => setNewTemplateId(e.target.value)}
                placeholder="Referência interna ou SendGrid template"
                className="border-seguranca-graphite bg-seguranca-black text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="camp-recipients">Destinatários</Label>
              <Textarea
                id="camp-recipients"
                rows={8}
                value={newRecipientsText}
                onChange={(e) => setNewRecipientsText(e.target.value)}
                placeholder={'contato@empresa.com\nrh@cliente.com;Maria Silva'}
                className="border-seguranca-graphite bg-seguranca-black font-mono text-sm text-white"
              />
              <p className="text-xs text-seguranca-lightgray">{parsedPreviewCount} e-mail(ns) válido(s) detectado(s)</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-seguranca-yellow text-seguranca-black"
              disabled={createMutation.isPending}
              onClick={handleCreateSubmit}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar campanha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-seguranca-graphite bg-seguranca-graphite text-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Enviar campanha</DialogTitle>
            <DialogDescription className="text-seguranca-lightgray">
              Gera um envio para todos os destinatários da campanha selecionada (HTML).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
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
                rows={12}
                value={sendHtml}
                onChange={(e) => setSendHtml(e.target.value)}
                className="border-seguranca-graphite bg-seguranca-black font-mono text-sm text-white"
                placeholder="<p>Olá...</p>"
              />
            </div>
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
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Disparar e-mails'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StandardLayout>
  );
};

export default ComercialMarketing;
