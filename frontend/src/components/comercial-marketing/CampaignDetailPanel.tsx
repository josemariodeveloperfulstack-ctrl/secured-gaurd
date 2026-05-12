import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
} from '@/services/emailCampaignService';
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
} from 'lucide-react';

interface CampaignDetailPanelProps {
  campaign: EmailCampaignSummary;
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
    statuses: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'],
    icon: <Send className="h-4 w-4" />,
    color: 'from-blue-500/40 to-blue-500/10 border-blue-500/40',
  },
  {
    key: 'DELIVERED',
    label: 'Entregues',
    statuses: ['DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'],
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

const TABS: TabSpec[] = [
  { value: 'all', label: 'Todos', statuses: undefined, icon: <Inbox className="h-3.5 w-3.5" /> },
  { value: 'pending', label: 'Pendentes', statuses: ['PENDING'], icon: <Clock className="h-3.5 w-3.5" /> },
  { value: 'sent', label: 'Enviados', statuses: ['SENT', 'DELIVERED'], icon: <Send className="h-3.5 w-3.5" /> },
  { value: 'opened', label: 'Lidos', statuses: ['OPENED'], icon: <Eye className="h-3.5 w-3.5" /> },
  { value: 'clicked', label: 'Clicados', statuses: ['CLICKED'], icon: <MousePointerClick className="h-3.5 w-3.5" /> },
  { value: 'replied', label: 'Respondidos', statuses: ['REPLIED'], icon: <MessageSquareText className="h-3.5 w-3.5" /> },
  {
    value: 'errors',
    label: 'Erros',
    statuses: ['BOUNCED', 'DROPPED'],
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
];

const CampaignDetailPanel: React.FC<CampaignDetailPanelProps> = ({ campaign }) => {
  const campaignId = campaign.id;
  const isLive = campaign.status === 'RUNNING' || campaign.status === 'SCHEDULED';

  const metricsQuery = useQuery({
    queryKey: ['email-campaign-metrics', campaignId],
    queryFn: () => emailCampaignService.getMetrics(campaignId),
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

  return (
    <div className="space-y-6">
      {/* KPIs grandes */}
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
        />
        <BigKpi
          label="Aberturas"
          value={totals.opened}
          subtitle={`${pct(totals.opened, totals.delivered).toFixed(0)}% taxa de abertura`}
          icon={<Eye className="h-5 w-5" />}
          accent="text-yellow-300"
        />
        <BigKpi
          label="Cliques"
          value={totals.clicked}
          subtitle={`${pct(totals.clicked, totals.opened).toFixed(0)}% dos lidos`}
          icon={<MousePointerClick className="h-5 w-5" />}
          accent="text-orange-300"
        />
        <BigKpi
          label="Respondidos"
          value={totals.replied}
          subtitle={`${pct(totals.replied, totals.sent).toFixed(0)}% taxa de resposta`}
          icon={<MessageSquareText className="h-5 w-5" />}
          accent="text-emerald-300"
        />
      </div>

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
            Use as abas para filtrar destinatários por estágio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-seguranca-black/40">
              {TABS.map((tab) => {
                const tabCount = tab.statuses
                  ? tab.statuses.reduce((acc, s) => acc + (counts[s] ?? 0), 0)
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
                <LogsTable campaignId={campaignId} statuses={tab.statuses} isLive={isLive} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

interface BigKpiProps {
  label: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  accent: string;
}

const BigKpi: React.FC<BigKpiProps> = ({ label, value, subtitle, icon, accent }) => (
  <Card className="border-seguranca-graphite bg-seguranca-black/40">
    <CardContent className="flex items-start justify-between p-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-seguranca-lightgray">{label}</p>
        <p className={`mt-1 text-3xl font-bold ${accent}`}>{value.toLocaleString('pt-BR')}</p>
        {subtitle && <p className="mt-1 text-xs text-seguranca-lightgray">{subtitle}</p>}
      </div>
      <div className={`rounded-md bg-seguranca-graphite/60 p-2 ${accent}`}>{icon}</div>
    </CardContent>
  </Card>
);

interface LogsTableProps {
  campaignId: string;
  statuses?: string[];
  isLive: boolean;
}

const LogsTable: React.FC<LogsTableProps> = ({ campaignId, statuses, isLive }) => {
  const query = useQuery({
    queryKey: ['email-campaign-logs', campaignId, statuses ?? 'all'],
    queryFn: () => emailCampaignService.getLogs(campaignId, statuses),
    refetchInterval: isLive ? 5000 : false,
  });

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-7 w-7 animate-spin text-seguranca-yellow" />
      </div>
    );
  }
  const rows = query.data ?? [];
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-seguranca-lightgray">
        Nenhum registro nesta categoria.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-seguranca-graphite hover:bg-transparent">
            <TableHead className="text-seguranca-lightgray">Destinatário</TableHead>
            <TableHead className="text-seguranca-lightgray">Status</TableHead>
            <TableHead className="text-seguranca-lightgray">Enviado</TableHead>
            <TableHead className="text-seguranca-lightgray">Lido em</TableHead>
            <TableHead className="text-seguranca-lightgray">Respondido</TableHead>
            <TableHead className="text-seguranca-lightgray">Erro</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row: EmailLogRow) => (
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
              <TableCell className="text-xs text-seguranca-lightgray">
                {row.sentAt ? formatDate(row.sentAt) : '—'}
              </TableCell>
              <TableCell className="text-xs text-seguranca-lightgray">
                {row.readAt ? formatDate(row.readAt) : '—'}
              </TableCell>
              <TableCell className="text-xs text-seguranca-lightgray">
                {row.repliedAt ? formatDate(row.repliedAt) : '—'}
              </TableCell>
              <TableCell className="max-w-[260px] truncate text-xs text-red-300">
                {row.bounceReason ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CampaignDetailPanel;
