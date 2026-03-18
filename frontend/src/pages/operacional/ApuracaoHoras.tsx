import React, { useState, useEffect } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Clock, RefreshCw, Check, X, Loader2, Pencil } from 'lucide-react';
import { overtimeService, Overtime, OvertimeStatus, OvertimeType } from '@/services/overtimeService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const statusLabel: Record<OvertimeStatus, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  COMPENSATED: 'Compensada',
};

const statusVariant: Record<OvertimeStatus, 'secondary' | 'default' | 'destructive' | 'outline'> = {
  PENDING: 'outline',
  APPROVED: 'default',
  REJECTED: 'destructive',
  COMPENSATED: 'secondary',
};

/** Valor sentinela para "Todos" (Radix Select não permite value vazio em SelectItem) */
const ALL_STATUS = '__all__';

const typeLabel: Record<OvertimeType, string> = {
  EXTRA: 'Hora extra',
  COMPENSATION: 'Compensação',
  HOLIDAY: 'Feriado',
  WEEKEND: 'Fim de semana',
};

const defaultEditForm = {
  overtimeDate: '',
  startTime: '',
  endTime: '',
  type: 'EXTRA' as OvertimeType,
  reason: '',
};

export default function ApuracaoHoras() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [list, setList] = useState<Overtime[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [actionId, setActionId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Overtime | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState(defaultEditForm);

  const load = async () => {
    setLoading(true);
    try {
      const data = await overtimeService.getAll(statusFilter === ALL_STATUS ? undefined : statusFilter || undefined);
      setList(data);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', description: 'Falha ao carregar horas extras.', variant: 'destructive' });
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const handleApprove = async (id: string) => {
    if (!user?.id) {
      toast({ title: 'Erro', description: 'Usuário não identificado.', variant: 'destructive' });
      return;
    }
    setActionId(id);
    try {
      await overtimeService.approve(id, user.id);
      toast({ title: 'Sucesso', description: 'Hora extra aprovada.' });
      load();
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao aprovar.', variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Justificativa da rejeição:');
    if (reason == null) return;
    setActionId(id);
    try {
      await overtimeService.reject(id, reason.trim() || 'Rejeitado pelo gestor.');
      toast({ title: 'Sucesso', description: 'Hora extra rejeitada.' });
      load();
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao rejeitar.', variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };

  const openEdit = (o: Overtime) => {
    const dateStr = o.overtimeDate ? (o.overtimeDate.includes('T') ? o.overtimeDate.slice(0, 10) : o.overtimeDate.slice(0, 10)) : '';
    setEditItem(o);
    setEditForm({
      overtimeDate: dateStr,
      startTime: o.startTime ? o.startTime.slice(0, 5) : '08:00',
      endTime: o.endTime ? o.endTime.slice(0, 5) : '17:00',
      type: o.type || 'EXTRA',
      reason: o.reason || '',
    });
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditItem(null);
    setEditForm(defaultEditForm);
  };

  const handleEditSave = async () => {
    if (!editItem) return;
    if (!editForm.reason.trim()) {
      toast({ title: 'Erro', description: 'Informe o motivo.', variant: 'destructive' });
      return;
    }
    setEditLoading(true);
    try {
      await overtimeService.update(editItem.id, {
        overtimeDate: editForm.overtimeDate,
        startTime: editForm.startTime.length === 5 ? editForm.startTime : editForm.startTime + ':00',
        endTime: editForm.endTime.length === 5 ? editForm.endTime : editForm.endTime + ':00',
        type: editForm.type,
        reason: editForm.reason.trim(),
        workPost: editItem.workPost?.id ? { id: editItem.workPost.id } : undefined,
      });
      toast({ title: 'Sucesso', description: 'Lançamento atualizado.' });
      closeEdit();
      load();
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao salvar alterações.', variant: 'destructive' });
    } finally {
      setEditLoading(false);
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('pt-BR');
    } catch {
      return d;
    }
  };

  const formatTime = (t: string) => {
    if (!t) return '-';
    if (t.length >= 5) return t.substring(0, 5);
    return t;
  };

  return (
    <StandardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="bg-seguranca-black/60 border border-gray-800 rounded-2xl shadow-sm p-5 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
              <Clock className="h-4 w-4 text-seguranca-yellow" />
              Gestão Operacional
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-seguranca-lightgray">
              Apuração de Horas
            </h1>
            <p className="text-sm text-seguranca-lightgray/70">
              Lista de lançamentos de horas extras para aprovação pelo gestor operacional.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUS}>Todos</SelectItem>
                <SelectItem value="PENDING">Pendentes</SelectItem>
                <SelectItem value="APPROVED">Aprovadas</SelectItem>
                <SelectItem value="REJECTED">Rejeitadas</SelectItem>
                <SelectItem value="COMPENSATED">Compensadas</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="border-seguranca-yellow/60 text-seguranca-yellow hover:bg-seguranca-yellow/10"
              onClick={load}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        <Card className="bg-seguranca-black/60 border border-gray-800">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray">Lançamentos de Horas Extras</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
              </div>
            ) : list.length === 0 ? (
              <p className="text-center text-seguranca-lightgray/70 py-8">Nenhum registro encontrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-seguranca-lightgray">Funcionário</TableHead>
                    <TableHead className="text-seguranca-lightgray">Matrícula</TableHead>
                    <TableHead className="text-seguranca-lightgray">Data</TableHead>
                    <TableHead className="text-seguranca-lightgray">Início</TableHead>
                    <TableHead className="text-seguranca-lightgray">Fim</TableHead>
                    <TableHead className="text-seguranca-lightgray">Total (h)</TableHead>
                    <TableHead className="text-seguranca-lightgray">Posto</TableHead>
                    <TableHead className="text-seguranca-lightgray">Motivo</TableHead>
                    <TableHead className="text-seguranca-lightgray">Status</TableHead>
                    {(statusFilter === 'PENDING' || statusFilter === ALL_STATUS) && (
                      <TableHead className="text-seguranca-lightgray w-[180px]">Ações</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((o) => (
                    <TableRow key={o.id} className="border-gray-700">
                      <TableCell className="text-seguranca-lightgray font-medium">
                        {o.employee?.name ?? '-'}
                      </TableCell>
                      <TableCell className="text-seguranca-lightgray/80">
                        {o.employee?.registrationNumber ?? '-'}
                      </TableCell>
                      <TableCell className="text-seguranca-lightgray/80">{formatDate(o.overtimeDate)}</TableCell>
                      <TableCell className="text-seguranca-lightgray/80">{formatTime(o.startTime)}</TableCell>
                      <TableCell className="text-seguranca-lightgray/80">{formatTime(o.endTime)}</TableCell>
                      <TableCell className="text-seguranca-lightgray/80">
                        {o.totalHours != null ? Number(o.totalHours).toFixed(2) : '-'}
                      </TableCell>
                      <TableCell className="text-seguranca-lightgray/80">
                        {o.workPost?.name ?? '-'}
                      </TableCell>
                      <TableCell className="text-seguranca-lightgray/80 max-w-[200px] truncate" title={o.reason}>
                        {o.reason ?? '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[o.status]}>{statusLabel[o.status]}</Badge>
                      </TableCell>
                      {(statusFilter === 'PENDING' || statusFilter === ALL_STATUS) && o.status === 'PENDING' && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-seguranca-yellow/60 text-seguranca-yellow hover:bg-seguranca-yellow/10"
                              onClick={() => openEdit(o)}
                              disabled={actionId !== null}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleApprove(o.id)}
                              disabled={actionId !== null}
                            >
                              {actionId === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(o.id)}
                              disabled={actionId !== null}
                            >
                              {actionId === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      )}
                      {(statusFilter === 'PENDING' || statusFilter === ALL_STATUS) && o.status !== 'PENDING' && (
                        <TableCell />
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={editOpen} onOpenChange={(open) => !open && closeEdit()}>
          <DialogContent className="bg-seguranca-graphite border-gray-700 text-seguranca-lightgray sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar lançamento de hora extra</DialogTitle>
              <DialogDescription>
                Altere data, horários, tipo e motivo. Apenas lançamentos pendentes podem ser editados.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Data</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editForm.overtimeDate}
                    onChange={(e) => setEditForm((f) => ({ ...f, overtimeDate: e.target.value }))}
                    className="bg-seguranca-black border-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Tipo</Label>
                  <Select
                    value={editForm.type}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, type: v as OvertimeType }))}
                  >
                    <SelectTrigger id="edit-type" className="bg-seguranca-black border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(typeLabel) as OvertimeType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {typeLabel[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-start">Início</Label>
                  <Input
                    id="edit-start"
                    type="time"
                    value={editForm.startTime}
                    onChange={(e) => setEditForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="bg-seguranca-black border-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-end">Fim</Label>
                  <Input
                    id="edit-end"
                    type="time"
                    value={editForm.endTime}
                    onChange={(e) => setEditForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="bg-seguranca-black border-gray-600"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-reason">Motivo</Label>
                <Textarea
                  id="edit-reason"
                  value={editForm.reason}
                  onChange={(e) => setEditForm((f) => ({ ...f, reason: e.target.value }))}
                  rows={3}
                  className="bg-seguranca-black border-gray-600 resize-none"
                  placeholder="Descreva o motivo do lançamento"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeEdit} className="border-gray-600">
                Cancelar
              </Button>
              <Button
                className="bg-seguranca-yellow text-seguranca-black hover:bg-seguranca-yellow/90"
                onClick={handleEditSave}
                disabled={editLoading}
              >
                {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </StandardLayout>
  );
}
