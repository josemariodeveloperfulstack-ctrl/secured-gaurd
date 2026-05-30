import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
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
import { formatDate } from '@/utils/formatters';
import emailCampaignService, {
  type EmailCampaignSummary,
  type EmailLogRow,
  type InactiveEmailRecipient,
} from '@/services/emailCampaignService';
import CampaignRecipientEngagementSheet from './CampaignRecipientEngagementSheet';
import CampaignRecipientsPanel from './CampaignRecipientsPanel';
import {
  Loader2,
  Send,
  CheckCircle2,
  Eye,
  MousePointerClick,
  MessageSquareText,
  AlertTriangle,
  Clock,
  Inbox,
  UserX2,
  Pencil,
  Trash2,
  Server,
  ChevronRight,
} from 'lucide-react';

interface CampaignDetailPanelProps {
  campaign: EmailCampaignSummary;
  /** Abre direto a aba de registros (ex.: `replied` ao vir da caixa de respostas dos leads). */
  initialRecipientLogTab?: string;
  /** Navega para Lista de Leads com a campanha pré-selecionada (envio por cidade). */
  onAddRecipientsByCity?: (campaignId: string) => void;
}

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

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'BOUNCED' || status === 'DROPPED') return 'destructive';
  if (status === 'REPLIED' || status === 'CLICKED') return 'default';
  if (status === 'OPENED' || status === 'DELIVERED') return 'secondary';
  return 'outline';
}

interface FunnelStep {
  key: string;
  label: string;
  /** Conjunto de status que contam para este nível do funil (cumulativo: quem clicou já abriu). */
  statuses: string[];
  icon: React.ReactNode;
  color: string;
}

/**
 * Cada nível é cumulativo — quem clicou também foi entregue. Por isso somamos
 * todos os {@code statuses} de cada degrau.
 */
const FUNNEL: FunnelStep[] = [
  {
    key: 'SENT',
    label: 'Enviados',
    statuses: ['SENT', 'DEFERRED', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'],
    icon: <Send className="h-4 w-4" />,
    color: 'from-blue-500/40 to-blue-500/10 border-blue-500/40',
  },
  {
    key: 'DELIVERED',
    label: 'Entregues',
    // SMTP antigo podia gravar SENT; ambos indicam aceite pelo servidor de e-mail
    statuses: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'],
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'from-sky-500/40 to-sky-500/10 border-sky-500/40',
  },
  {
    key: 'OPENED',
    label: 'Abertos',
    statuses: ['OPENED', 'CLICKED', 'REPLIED'],
    icon: <Eye className="h-4 w-4" />,
    color: 'from-yellow-500/40 to-yellow-500/10 border-yellow-500/40',
  },
  {
    key: 'CLICKED',
    label: 'Clicados',
    statuses: ['CLICKED', 'REPLIED'],
    icon: <MousePointerClick className="h-4 w-4" />,
    color: 'from-orange-500/40 to-orange-500/10 border-orange-500/40',
  },
  {
    key: 'REPLIED',
    label: 'Respondidos',
    statuses: ['REPLIED'],
    icon: <MessageSquareText className="h-4 w-4" />,
    color: 'from-emerald-500/40 to-emerald-500/10 border-emerald-500/40',
  },
];

interface TabSpec {
  value: string;
  label: string;
  statuses: string[] | undefined; // undefined => todos
  icon: React.ReactNode;
}

/** Registros ativos da campanha — rejeitados ficam só na aba Rejeitados. */
const ACTIVE_LOG_STATUSES = ['PENDING', 'SENT', 'DEFERRED', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'];

const TABS: TabSpec[] = [
  { value: 'all', label: 'Todos', statuses: ACTIVE_LOG_STATUSES, icon: <Inbox className="h-3.5 w-3.5" /> },
  { value: 'pending', label: 'Pendentes', statuses: ['PENDING'], icon: <Clock className="h-3.5 w-3.5" /> },
  {
    value: 'sent',
    label: 'Enviados',
    statuses: ['SENT', 'DEFERRED', 'DELIVERED'],
    icon: <Send className="h-3.5 w-3.5" />,
  },
  {
    value: 'opened',
    label: 'Lidos',
    statuses: ['OPENED', 'CLICKED', 'REPLIED'],
    icon: <Eye className="h-3.5 w-3.5" />,
  },
  { value: 'clicked', label: 'Clicados', statuses: ['CLICKED'], icon: <MousePointerClick className="h-3.5 w-3.5" /> },
  { value: 'replied', label: 'Respondidos', statuses: ['REPLIED'], icon: <MessageSquareText className="h-3.5 w-3.5" /> },
  {
    value: 'errors',
    label: 'Erros',
    statuses: ['BOUNCED', 'DROPPED'],
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  { value: 'inactive', label: 'Rejeitados', statuses: undefined, icon: <UserX2 className="h-3.5 w-3.5" /> },
];

const VALID_LOG_TAB_VALUES = new Set(TABS.map((t) => t.value));

function normalizeRecipientLogTab(tab: string | undefined): string {
  if (tab && VALID_LOG_TAB_VALUES.has(tab)) return tab;
  return 'all';
}

const CampaignDetailPanel: React.FC<CampaignDetailPanelProps> = ({
  campaign,
  initialRecipientLogTab,
  onAddRecipientsByCity,
}) => {
  const campaignId = campaign.id;
  const isLive = campaign.status === 'RUNNING' || campaign.status === 'SCHEDULED';

  const defaultLogTab = normalizeRecipientLogTab(initialRecipientLogTab);
  const [recipientLogTab, setRecipientLogTab] = useState(defaultLogTab);
  const [selectedLog, setSelectedLog] = useState<EmailLogRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setRecipientLogTab(normalizeRecipientLogTab(initialRecipientLogTab));
  }, [campaignId, initialRecipientLogTab]);

  const isSmtp = campaign.providerType === 'SMTP';

  const metricsQuery = useQuery({
    queryKey: ['email-campaign-metrics', campaignId],
    queryFn: () => emailCampaignService.getMetrics(campaignId),
    refetchInterval: isLive ? 5000 : false,
  });

  const rejectedQuery = useQuery({
    queryKey: ['email-campaign-inactive-recipients', campaignId],
    queryFn: () => emailCampaignService.listInactiveRecipients(campaignId),
    refetchInterval: isLive ? 5000 : false,
  });

  const counts = metricsQuery.data?.countsByStatus ?? {};

  // Funil — soma cumulativa por nível
  const funnel = useMemo(
    () =>
      FUNNEL.map((step) => ({
        ...step,
        value: step.statuses.reduce((acc, s) => acc + (counts[s] ?? 0), 0),
      })),
    [counts]
  );
  const funnelTop = funnel[0]?.value ?? 0;

  const totals = useMemo(() => {
    const sent = funnel[0]?.value ?? 0;
    const delivered = funnel[1]?.value ?? 0;
    const opened = funnel[2]?.value ?? 0;
    const clicked = funnel[3]?.value ?? 0;
    const replied = funnel[4]?.value ?? 0;
    const errors = (counts['BOUNCED'] ?? 0) + (counts['DROPPED'] ?? 0);
    const pending = counts['PENDING'] ?? 0;
    return { sent, delivered, opened, clicked, replied, errors, pending };
  }, [counts, funnel]);

  const pct = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);

  const showTrackingHint =
    !isLive && totals.sent > 0 && totals.opened === 0 && totals.clicked === 0;

  const openEngagement = (row: EmailLogRow) => {
    setSelectedLog(row);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-seguranca-graphite bg-seguranca-black/50 px-3 py-2">
        <span className="text-xs uppercase tracking-wider text-seguranca-lightgray">Canal de envio</span>
        <Badge
          variant="outline"
          className={
            isSmtp
              ? 'border-sky-500/40 text-sky-300 gap-1'
              : 'border-violet-500/40 text-violet-300 gap-1'
          }
        >
          {isSmtp ? <Server className="h-3 w-3" /> : <Send className="h-3 w-3" />}
          {isSmtp ? 'SMTP' : campaign.providerType ?? 'SendGrid'}
        </Badge>
        <span className="text-xs text-seguranca-lightgray">
          Leitura e cliques usam pixel + links rastreados (requer URL pública no servidor).
        </span>
      </div>

      {showTrackingHint && (
        <div className="rounded-lg border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-transparent px-4 py-3 text-sm text-amber-100">
          <p className="font-medium text-amber-200">Rastreamento ainda não registrou leituras</p>
          <p className="mt-1 text-amber-100/90">
            Com <strong>SMTP</strong> ou SendGrid, abertura só conta se{' '}
            <code className="text-xs rounded bg-black/30 px-1">EMAIL_MARKETING_TRACKING_BASE_URL</code> apontar
            para um endereço acessível na internet (não <code className="text-xs">localhost</code>). Envie uma{' '}
            <strong>nova</strong> campanha após configurar. Detalhes em{' '}
            <code className="text-xs">docs/EMAIL_MARKETING_RASTREAMENTO.md</code>.
          </p>
        </div>
      )}

      {isSmtp && totals.replied > 0 && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2 text-xs text-emerald-100">
          Respostas com texto completo exigem <strong>SendGrid Inbound Parse</strong>. Com SMTP puro, a data de
          resposta pode aparecer sem o corpo do e-mail.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BigKpi
          label="Total enviado"
          value={totals.sent}
          subtitle={
            campaign.recipientCount > 0
              ? `${pct(totals.sent, campaign.recipientCount).toFixed(0)}% dos destinatários`
              : undefined
          }
          icon={<Send className="h-5 w-5" />}
          accent="text-blue-300"
          ring="ring-blue-500/20"
        />
        <BigKpi
          label="Lidos / abertos"
          value={totals.opened}
          subtitle={`${pct(totals.opened, totals.delivered).toFixed(0)}% — horário na linha do tempo`}
          icon={<Eye className="h-5 w-5" />}
          accent="text-amber-300"
          ring="ring-amber-500/25"
          highlight={totals.opened > 0}
        />
        <BigKpi
          label="Cliques"
          value={totals.clicked}
          subtitle={`${pct(totals.clicked, totals.opened).toFixed(0)}% dos que leram`}
          icon={<MousePointerClick className="h-5 w-5" />}
          accent="text-orange-300"
          ring="ring-orange-500/20"
        />
        <BigKpi
          label="Respondidos"
          value={totals.replied}
          subtitle={`${pct(totals.replied, totals.sent).toFixed(0)}% — clique na linha para ver e-mail`}
          icon={<MessageSquareText className="h-5 w-5" />}
          accent="text-emerald-300"
          ring="ring-emerald-500/25"
          highlight={totals.replied > 0}
        />
      </div>

      <Card className="border-seguranca-graphite bg-seguranca-graphite/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Leads da campanha</CardTitle>
          <CardDescription className="text-seguranca-lightgray">
            Destinatários vinculados a esta campanha, agrupados por cidade. Para incluir um lote regional, use{' '}
            <strong className="font-normal text-white">Acrescentar por cidade</strong> na Lista de Leads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignRecipientsPanel
            campaign={campaign}
            onAddByCity={onAddRecipientsByCity}
          />
        </CardContent>
      </Card>

      {/* Funil */}
      <Card className="border-seguranca-graphite bg-seguranca-graphite/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Funil de conversão</CardTitle>
          <CardDescription className="text-seguranca-lightgray">
            Acompanhe cada etapa do engajamento — da entrega ao retorno.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {funnel.map((step) => {
            const width = funnelTop > 0 ? Math.max((step.value / funnelTop) * 100, 6) : 6;
            const rate = funnelTop > 0 ? (step.value / funnelTop) * 100 : 0;
            return (
              <div key={step.key} className="flex items-center gap-3">
                <div className="flex w-28 shrink-0 items-center gap-2 text-xs text-seguranca-lightgray">
                  <span className="text-seguranca-yellow">{step.icon}</span>
                  {step.label}
                </div>
                <div className="flex-1">
                  <div
                    className={`relative h-9 overflow-hidden rounded-md border bg-gradient-to-r ${step.color}`}
                    style={{ width: `${width}%`, transition: 'width 600ms ease-out' }}
                  >
                    <div className="absolute inset-0 flex items-center justify-between px-3">
                      <span className="text-sm font-semibold text-white">{step.value}</span>
                      <span className="text-xs text-white/80">{rate.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {(totals.errors > 0 || totals.pending > 0) && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-seguranca-graphite pt-3">
              {totals.pending > 0 && (
                <Badge variant="outline" className="border-amber-500/40 text-amber-300">
                  <Clock className="mr-1 h-3 w-3" /> {totals.pending} aguardando envio
                </Badge>
              )}
              {totals.errors > 0 && (
                <Badge variant="destructive">
                  <AlertTriangle className="mr-1 h-3 w-3" /> {totals.errors} falhas
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs filtradas por status */}
      <Card className="border-seguranca-graphite bg-seguranca-graphite/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Registros de envio</CardTitle>
          <CardDescription className="text-seguranca-lightgray">
            Filtre por estágio e clique em um destinatário para ver{' '}
            <strong className="text-white font-normal">quando leu</strong>, clicou e o texto da resposta.
            Pontos: âmbar = lido, laranja = clique, verde = respondeu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={recipientLogTab} onValueChange={setRecipientLogTab}>
            <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-seguranca-black/40">
              {TABS.map((tab) => {
                const isRejectedTab = tab.value === 'inactive';
                const tabCount = tab.statuses
                  ? tab.statuses.reduce((acc, s) => acc + (counts[s] ?? 0), 0)
                  : isRejectedTab
                    ? (rejectedQuery.data?.length ?? 0)
                    : Object.values(counts).reduce((a, b) => a + b, 0);
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="data-[state=active]:bg-seguranca-yellow data-[state=active]:text-seguranca-black"
                  >
                    <span className="mr-1.5">{tab.icon}</span>
                    {tab.label}
                    <span className="ml-1.5 rounded bg-seguranca-graphite/80 px-1.5 py-0.5 text-[10px] font-semibold">
                      {tabCount}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="mt-4">
                {tab.value === 'inactive' ? (
                  <InactiveRecipientsTable campaignId={campaignId} />
                ) : (
                  <LogsTable
                    campaignId={campaignId}
                    statuses={tab.statuses}
                    isLive={isLive}
                    onSelectRow={openEngagement}
                  />
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <CampaignRecipientEngagementSheet
        row={selectedLog}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        providerType={campaign.providerType}
      />
    </div>
  );
};

const InactiveRecipientsTable: React.FC<{ campaignId: string }> = ({ campaignId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<InactiveEmailRecipient | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');

  const query = useQuery({
    queryKey: ['email-campaign-inactive-recipients', campaignId],
    queryFn: () => emailCampaignService.listInactiveRecipients(campaignId),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      emailCampaignService.updateInactiveRecipient(campaignId, editing!.recipientId, {
        email: editEmail.trim(),
        name: editName.trim() || null,
      }),
    onSuccess: async () => {
      toast({ title: 'E-mail rejeitado atualizado' });
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ['email-campaign-inactive-recipients', campaignId] });
      await queryClient.invalidateQueries({ queryKey: ['email-campaign-metrics', campaignId] });
    },
    onError: (err: unknown) =>
      toast({
        title: 'Erro ao atualizar',
        description: err instanceof Error ? err.message : 'Falha ao atualizar e-mail rejeitado.',
        variant: 'destructive',
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (recipientId: string) => emailCampaignService.deleteInactiveRecipient(campaignId, recipientId),
    onSuccess: async () => {
      toast({ title: 'E-mail removido da lista de rejeitados' });
      await queryClient.invalidateQueries({ queryKey: ['email-campaign-inactive-recipients', campaignId] });
      await queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      await queryClient.invalidateQueries({ queryKey: ['email-campaign-metrics', campaignId] });
    },
    onError: (err: unknown) =>
      toast({
        title: 'Erro ao remover',
        description: err instanceof Error ? err.message : 'Falha ao remover e-mail inativo.',
        variant: 'destructive',
      }),
  });

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-7 w-7 animate-spin text-seguranca-yellow" />
      </div>
    );
  }

  const rows = query.data ?? [];
  if (!rows.length) {
    return (
      <p className="py-8 text-center text-sm text-seguranca-lightgray">
        Nenhum e-mail rejeitado nesta campanha. Rejeições aparecem aqui automaticamente para avaliação.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-seguranca-graphite hover:bg-transparent">
              <TableHead className="text-seguranca-lightgray">E-mail</TableHead>
              <TableHead className="text-seguranca-lightgray">Nome</TableHead>
              <TableHead className="text-seguranca-lightgray">Motivo</TableHead>
              <TableHead className="text-seguranca-lightgray">Data</TableHead>
              <TableHead className="text-right text-seguranca-lightgray">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.recipientId} className="border-seguranca-graphite">
                <TableCell className="font-medium text-white">{row.email}</TableCell>
                <TableCell className="text-seguranca-lightgray">{row.name ?? '—'}</TableCell>
                <TableCell className="max-w-[340px] truncate text-red-300">{row.reason ?? '—'}</TableCell>
                <TableCell className="text-xs text-seguranca-lightgray">
                  {row.inactivatedAt ? formatDate(row.inactivatedAt) : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-seguranca-lightgray hover:text-seguranca-yellow"
                      onClick={() => {
                        setEditing(row);
                        setEditEmail(row.email);
                        setEditName(row.name ?? '');
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-seguranca-lightgray hover:text-red-400"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(row.recipientId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="border-seguranca-graphite bg-seguranca-graphite text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar e-mail inativo</DialogTitle>
            <DialogDescription className="text-seguranca-lightgray">
              Ajuste os dados do contato inativo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-seguranca-lightgray">E-mail</label>
              <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-seguranca-lightgray">Nome</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-seguranca-yellow text-seguranca-black"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || !editEmail.trim()}
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

interface BigKpiProps {
  label: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  accent: string;
  ring?: string;
  highlight?: boolean;
}

const BigKpi: React.FC<BigKpiProps> = ({
  label,
  value,
  subtitle,
  icon,
  accent,
  ring = 'ring-seguranca-graphite/40',
  highlight,
}) => (
  <Card
    className={`border-seguranca-graphite bg-seguranca-black/40 ring-1 ${ring} ${
      highlight ? 'shadow-[0_0_24px_-8px_rgba(234,179,8,0.35)]' : ''
    }`}
  >
    <CardContent className="flex items-start justify-between p-4">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-seguranca-lightgray">{label}</p>
        <p className={`mt-1 text-3xl font-bold tabular-nums ${accent}`}>{value.toLocaleString('pt-BR')}</p>
        {subtitle && <p className="mt-1.5 text-xs leading-snug text-seguranca-lightgray">{subtitle}</p>}
      </div>
      <div className={`shrink-0 rounded-lg border border-seguranca-graphite/80 bg-seguranca-graphite/40 p-2.5 ${accent}`}>
        {icon}
      </div>
    </CardContent>
  </Card>
);

interface LogsTableProps {
  campaignId: string;
  statuses?: string[];
  isLive: boolean;
  onSelectRow: (row: EmailLogRow) => void;
}

function engagementDots(row: EmailLogRow) {
  return (
    <span className="inline-flex items-center gap-1" title="Lido / Clicou / Respondeu">
      <span
        className={`h-2 w-2 rounded-full ${row.readAt ? 'bg-amber-400' : 'bg-seguranca-graphite'}`}
        aria-hidden
      />
      <span
        className={`h-2 w-2 rounded-full ${row.clickedAt ? 'bg-orange-400' : 'bg-seguranca-graphite'}`}
        aria-hidden
      />
      <span
        className={`h-2 w-2 rounded-full ${row.repliedAt ? 'bg-emerald-400' : 'bg-seguranca-graphite'}`}
        aria-hidden
      />
    </span>
  );
}

const LogsTable: React.FC<LogsTableProps> = ({ campaignId, statuses, isLive, onSelectRow }) => {
  const query = useQuery({
    queryKey: ['email-campaign-logs', campaignId, statuses ?? 'all'],
    queryFn: () => emailCampaignService.getLogs(campaignId, statuses),
    refetchInterval: isLive ? 5000 : false,
  });

  const rows = useMemo(() => {
    const list = query.data ?? [];
    return [...list].sort((a, b) => {
      const aReply = a.repliedAt ? 1 : 0;
      const bReply = b.repliedAt ? 1 : 0;
      if (bReply !== aReply) return bReply - aReply;
      const aRead = a.readAt ? new Date(a.readAt).getTime() : 0;
      const bRead = b.readAt ? new Date(b.readAt).getTime() : 0;
      return bRead - aRead;
    });
  }, [query.data]);

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-7 w-7 animate-spin text-seguranca-yellow" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-seguranca-lightgray">
        Nenhum registro nesta categoria. Quando houver envios, clique em uma linha para ver quando foi lido e a
        resposta do lead.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-seguranca-graphite hover:bg-transparent">
            <TableHead className="text-seguranca-lightgray">Engajamento</TableHead>
            <TableHead className="text-seguranca-lightgray">Destinatário</TableHead>
            <TableHead className="text-seguranca-lightgray">Status</TableHead>
            <TableHead className="text-seguranca-lightgray">Enviado</TableHead>
            <TableHead className="text-seguranca-lightgray">Lido em</TableHead>
            <TableHead className="text-seguranca-lightgray">Clicou em</TableHead>
            <TableHead className="text-seguranca-lightgray">Respondeu</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row: EmailLogRow) => (
            <TableRow
              key={row.id}
              className="border-seguranca-graphite cursor-pointer transition-colors hover:bg-seguranca-yellow/5"
              onClick={() => onSelectRow(row)}
            >
              <TableCell className="w-14">{engagementDots(row)}</TableCell>
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
              <TableCell className="text-xs text-seguranca-lightgray whitespace-nowrap">
                {row.sentAt ? formatDate(row.sentAt) : '—'}
              </TableCell>
              <TableCell className="text-xs whitespace-nowrap">
                {row.readAt ? (
                  <span className="text-amber-200/90 font-medium">{formatDate(row.readAt)}</span>
                ) : (
                  <span className="text-seguranca-lightgray/60">—</span>
                )}
              </TableCell>
              <TableCell className="text-xs whitespace-nowrap">
                {row.clickedAt ? (
                  <span className="text-orange-200/90">{formatDate(row.clickedAt)}</span>
                ) : (
                  <span className="text-seguranca-lightgray/60">—</span>
                )}
              </TableCell>
              <TableCell className="text-xs whitespace-nowrap">
                {row.repliedAt ? (
                  <span className="text-emerald-300 font-medium">{formatDate(row.repliedAt)}</span>
                ) : (
                  <span className="text-seguranca-lightgray/60">—</span>
                )}
              </TableCell>
              <TableCell>
                <ChevronRight className="h-4 w-4 text-seguranca-lightgray" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CampaignDetailPanel;
