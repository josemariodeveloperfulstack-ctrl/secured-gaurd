import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';

import {
  remanejamentoApprovalService,
  REMANEJAMENTO_MOTIVO_LABEL,
  REMANEJAMENTO_STATUS_LABEL,
  type RemanejamentoStatus,
  type RemanejamentoSummary,
} from '@/services/remanejamentoApprovalService';

const TAB_TO_STATUS: Record<string, RemanejamentoStatus> = {
  pending: 'PENDING',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  cancelled: 'CANCELLED',
};

const STATUS_VARIANT: Record<
  RemanejamentoStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  PENDING: 'default',
  APPROVED: 'secondary',
  REJECTED: 'destructive',
  CANCELLED: 'outline',
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return iso;
  }
};

const fmtDay = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return iso;
  }
};

const GestorRemanejamentos = () => {
  const [activeTab, setActiveTab] = useState<keyof typeof TAB_TO_STATUS>('pending');
  const [items, setItems] = useState<RemanejamentoSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const [approveTarget, setApproveTarget] = useState<RemanejamentoSummary | null>(null);
  const [approving, setApproving] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<RemanejamentoSummary | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const status = useMemo(() => TAB_TO_STATUS[activeTab], [activeTab]);

  const reload = async () => {
    setLoading(true);
    try {
      const [data, count] = await Promise.all([
        remanejamentoApprovalService.listByStatus(status),
        remanejamentoApprovalService.countPending().catch(() => 0),
      ]);
      setItems(data);
      setPendingCount(count);
    } catch (err) {
      console.error(err);
      toast.error('Falha ao carregar solicitações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleApprove = async () => {
    if (!approveTarget) return;
    setApproving(true);
    try {
      await remanejamentoApprovalService.approve(approveTarget.id);
      toast.success('Remanejamento aprovado. O supervisor foi notificado.');
      setApproveTarget(null);
      await reload();
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Falha ao aprovar remanejamento.';
      toast.error(msg);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      toast.error('Informe o motivo da rejeição.');
      return;
    }
    setRejecting(true);
    try {
      await remanejamentoApprovalService.reject(rejectTarget.id, rejectReason.trim());
      toast.success('Remanejamento rejeitado. O supervisor foi notificado.');
      setRejectTarget(null);
      setRejectReason('');
      await reload();
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Falha ao rejeitar remanejamento.';
      toast.error(msg);
    } finally {
      setRejecting(false);
    }
  };

  return (
    <StandardLayout>
      <div className="space-y-4 p-4 md:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Aprovações de Remanejamento
            </h1>
            <p className="text-sm text-muted-foreground">
              Solicitações abertas pelos supervisores aguardando sua decisão.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Badge variant="default" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {pendingCount} pendente{pendingCount === 1 ? '' : 's'}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
              <RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as keyof typeof TAB_TO_STATUS)}>
          <TabsList className="grid w-full grid-cols-4 sm:w-auto">
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="approved">Aprovados</TabsTrigger>
            <TabsTrigger value="rejected">Rejeitados</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelados</TabsTrigger>
          </TabsList>

          {Object.keys(TAB_TO_STATUS).map((tab) => {
            const tabStatus = TAB_TO_STATUS[tab];
            let body: JSX.Element;
            if (loading) {
              body = (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Carregando...
                </div>
              );
            } else if (items.length === 0) {
              body = (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                    <Users className="mb-2 h-10 w-10" />
                    <p>Nenhuma solicitação {REMANEJAMENTO_STATUS_LABEL[tabStatus].toLowerCase()}.</p>
                  </CardContent>
                </Card>
              );
            } else {
              body = (
                <>
                  {items.map((r) => (
                  <Card key={r.id}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          {r.employeeName || 'Funcionário desconhecido'}
                          <Badge variant={STATUS_VARIANT[r.status]} className="text-[10px]">
                            {REMANEJAMENTO_STATUS_LABEL[r.status]}
                          </Badge>
                        </CardTitle>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>Solicitado por {r.requestedByName || '—'}</div>
                          <div>{fmtDate(r.requestedAt)}</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                          <span className="text-muted-foreground">Motivo: </span>
                          <span className="font-medium">
                            {r.motivo ? REMANEJAMENTO_MOTIVO_LABEL[r.motivo] : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Data: </span>
                          <span className="font-medium">{fmtDay(r.dataRemanejamento)}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 rounded border bg-muted/30 p-2 text-sm">
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground">Origem</div>
                          <div className="font-medium">{r.originWorkstationName || '—'}</div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground">Destino</div>
                          <div className="font-medium">{r.destinationWorkstationName || '—'}</div>
                        </div>
                      </div>

                      {r.coverageEmployeeName && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Cobertura: </span>
                          <span className="font-medium">{r.coverageEmployeeName}</span>
                        </div>
                      )}

                      {r.observacao && (
                        <div className="rounded bg-muted/40 p-2 text-xs">
                          <span className="font-medium">Observação do supervisor: </span>
                          {r.observacao}
                        </div>
                      )}

                      {r.status === 'REJECTED' && r.rejectionReason && (
                        <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/10 p-2 text-xs">
                          <AlertTriangle className="mt-0.5 h-3 w-3 text-destructive" />
                          <div>
                            <span className="font-medium">Motivo da rejeição: </span>
                            {r.rejectionReason}
                          </div>
                        </div>
                      )}
                      {r.status === 'APPROVED' && r.approvedAt && (
                        <div className="text-xs text-muted-foreground">
                          Aprovado em {fmtDate(r.approvedAt)} por {r.approvedByName || '—'}
                        </div>
                      )}

                      {r.status === 'PENDING' && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            className="flex-1"
                            size="sm"
                            onClick={() => setApproveTarget(r)}
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            Aprovar
                          </Button>
                          <Button
                            className="flex-1"
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setRejectTarget(r);
                              setRejectReason('');
                            }}
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Rejeitar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  ))}
                </>
              );
            }
            return (
              <TabsContent key={tab} value={tab} className="space-y-3">
                {body}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      {/* Confirmação de aprovação */}
      <Dialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar aprovação</DialogTitle>
          </DialogHeader>
          {approveTarget && (
            <div className="space-y-2 text-sm">
              <p>
                Aprovar o remanejamento de{' '}
                <strong>{approveTarget.employeeName}</strong> para o posto{' '}
                <strong>{approveTarget.destinationWorkstationName || '—'}</strong>?
              </p>
              <p className="text-xs text-muted-foreground">
                Esta ação atualiza o posto atual do funcionário e notifica o supervisor.
              </p>
            </div>
          )}
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setApproveTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={handleApprove} disabled={approving}>
              {approving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Aprovando...
                </>
              ) : (
                'Confirmar aprovação'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejeição */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => {
          if (o === false) {
            setRejectTarget(null);
            setRejectReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar remanejamento</DialogTitle>
          </DialogHeader>
          {rejectTarget && (
            <div className="space-y-3 text-sm">
              <p>
                Rejeitar a solicitação para{' '}
                <strong>{rejectTarget.employeeName}</strong>?
              </p>
              <div>
                <Label className="text-xs">Motivo da rejeição *</Label>
                <Textarea
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explique para o supervisor por que a solicitação não pode ser aprovada agora."
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason('');
              }}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejecting}>
              {rejecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejeitando...
                </>
              ) : (
                'Confirmar rejeição'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StandardLayout>
  );
};

export default GestorRemanejamentos;
