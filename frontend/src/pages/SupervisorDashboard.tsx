import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { visitControlService, type VisitControl } from '@/services/visitControlService';
import { workPostService, type WorkPost } from '@/services/workPostService';
import {
  remanejamentoApprovalService,
  REMANEJAMENTO_STATUS_LABEL,
  type RemanejamentoSummary,
} from '@/services/remanejamentoApprovalService';

const STATUS_BADGE: Record<VisitControl['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  SCHEDULED: { label: 'Agendada', variant: 'outline' },
  IN_PROGRESS: { label: 'Em andamento', variant: 'default' },
  COMPLETED: { label: 'Concluída', variant: 'secondary' },
  CANCELLED: { label: 'Cancelada', variant: 'destructive' },
  PENDING: { label: 'Pendente', variant: 'outline' },
};

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return iso;
  }
};

const SupervisorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [visits, setVisits] = useState<VisitControl[]>([]);
  const [workPosts, setWorkPosts] = useState<WorkPost[]>([]);
  const [myRequests, setMyRequests] = useState<RemanejamentoSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const [visitsAll, posts, mine] = await Promise.all([
        visitControlService.getAllVisitControls().catch(() => []),
        workPostService.getAllWorkPosts().catch(() => []),
        remanejamentoApprovalService.myRequests().catch(() => []),
      ]);

      const supervisorId = user?.id;
      const myVisits = supervisorId
        ? visitsAll.filter(
            (v) =>
              v.supervisorId === supervisorId ||
              v.createdBy === supervisorId ||
              v.assignedTo === supervisorId,
          )
        : visitsAll;

      setVisits(myVisits.slice(0, 50));
      setWorkPosts(posts);
      setMyRequests(mine);
    } catch (err) {
      console.error(err);
      toast.error('Falha ao carregar dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const todayVisits = useMemo(
    () =>
      visits.filter((v) => {
        const d = v.visitDate || v.scheduledAt;
        if (!d) return false;
        try {
          return isToday(parseISO(d));
        } catch {
          return false;
        }
      }),
    [visits],
  );

  const inProgress = useMemo(
    () => visits.filter((v) => v.status === 'IN_PROGRESS'),
    [visits],
  );

  const completed = useMemo(
    () => visits.filter((v) => v.status === 'COMPLETED'),
    [visits],
  );

  const pendingRequests = useMemo(
    () => myRequests.filter((r) => r.status === 'PENDING'),
    [myRequests],
  );

  return (
    <StandardLayout>
      <div className="space-y-4 p-4 md:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Painel do Supervisor
            </h1>
            <p className="text-sm text-muted-foreground">
              Olá, <strong>{user?.name || 'Supervisor'}</strong>. Visão geral das suas
              visitas e solicitações.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
              <RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('/supervisao/checkin-posto')}
            >
              <MapPin className="mr-1 h-4 w-4" />
              Check-in no posto
            </Button>
            <Button size="sm" onClick={() => navigate('/supervisao/visitas/nova')}>
              <Plus className="mr-1 h-4 w-4" />
              Nova visita
            </Button>
          </div>
        </header>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            title="Visitas de hoje"
            value={loading ? null : todayVisits.length}
            icon={<Clock className="h-5 w-5 text-blue-500" />}
          />
          <KpiCard
            title="Em andamento"
            value={loading ? null : inProgress.length}
            icon={<ClipboardList className="h-5 w-5 text-amber-500" />}
          />
          <KpiCard
            title="Concluídas"
            value={loading ? null : completed.length}
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          />
          <KpiCard
            title="Postos disponíveis"
            value={loading ? null : workPosts.length}
            icon={<Building2 className="h-5 w-5 text-violet-500" />}
          />
        </div>

        <Tabs defaultValue="visits" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto">
            <TabsTrigger value="visits">Visitas</TabsTrigger>
            <TabsTrigger value="requests">
              Meus pedidos
              {pendingRequests.length > 0 && (
                <Badge variant="default" className="ml-2 text-[10px]">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="posts">Postos</TabsTrigger>
          </TabsList>

          {/* VISITAS */}
          <TabsContent value="visits" className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Últimas visitas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading && (
                  <>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                )}

                {!loading && visits.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <ClipboardList className="mb-2 h-8 w-8" />
                    <p className="text-sm">Nenhuma visita registrada por você ainda.</p>
                    <Button
                      className="mt-3"
                      size="sm"
                      onClick={() => navigate('/supervisao/visitas/nova')}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Registrar primeira visita
                    </Button>
                  </div>
                )}

                {!loading &&
                  visits.map((v) => (
                    <div
                      key={v.id}
                      className="flex flex-wrap items-start justify-between gap-2 rounded border bg-card p-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate font-medium">
                            {v.workPostName || v.location || 'Posto'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {fmtDate(v.visitDate || v.scheduledAt)}
                        </p>
                      </div>
                      <Badge variant={STATUS_BADGE[v.status].variant} className="text-[10px]">
                        {STATUS_BADGE[v.status].label}
                      </Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* MEUS PEDIDOS */}
          <TabsContent value="requests" className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Solicitações de remanejamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading && (
                  <>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                )}

                {!loading && myRequests.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground">
                    Você não abriu solicitações de remanejamento.
                  </p>
                )}

                {!loading &&
                  myRequests.map((r) => {
                    let Icon = Clock;
                    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
                    if (r.status === 'APPROVED') {
                      Icon = CheckCircle2;
                      variant = 'secondary';
                    } else if (r.status === 'REJECTED') {
                      Icon = XCircle;
                      variant = 'destructive';
                    } else if (r.status === 'CANCELLED') {
                      Icon = AlertTriangle;
                      variant = 'outline';
                    }
                    return (
                      <div
                        key={r.id}
                        className="flex flex-wrap items-start justify-between gap-2 rounded border bg-card p-3 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Icon className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate font-medium">
                              {r.employeeName || 'Funcionário'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {r.originWorkstationName || '—'} →{' '}
                            {r.destinationWorkstationName || '—'} · {fmtDate(r.requestedAt)}
                          </p>
                          {r.status === 'REJECTED' && r.rejectionReason && (
                            <p className="mt-1 text-xs text-destructive">
                              {r.rejectionReason}
                            </p>
                          )}
                        </div>
                        <Badge variant={variant} className="text-[10px]">
                          {REMANEJAMENTO_STATUS_LABEL[r.status]}
                        </Badge>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* POSTOS */}
          <TabsContent value="posts" className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Postos de trabalho</CardTitle>
              </CardHeader>
              <CardContent>
                {loading && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                )}
                {!loading && workPosts.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground">
                    Nenhum posto cadastrado.
                  </p>
                )}
                {!loading && workPosts.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {workPosts.slice(0, 40).map((p) => (
                      <div key={p.id} className="rounded border bg-card p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-sm">{p.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.postCode || '—'}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate('/supervisao/visitas/nova')}
                            title="Iniciar visita neste posto"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </StandardLayout>
  );
};

interface KpiCardProps {
  readonly title: string;
  readonly value: number | null;
  readonly icon: React.ReactNode;
}

const KpiCard = ({ title, value, icon }: KpiCardProps) => (
  <Card>
    <CardContent className="flex items-center justify-between p-3">
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        {value === null ? (
          <Skeleton className="mt-1 h-7 w-12" />
        ) : (
          <p className="text-2xl font-bold leading-none">{value}</p>
        )}
      </div>
      {icon}
    </CardContent>
  </Card>
);

export default SupervisorDashboard;
