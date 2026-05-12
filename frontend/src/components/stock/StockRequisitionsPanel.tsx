import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ClipboardList, Edit, Eye, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { StockRequisitionListItem, StockRequisitionStatus } from '@/types/stock';
import StockRequisitionModal from '@/components/stock/StockRequisitionModal';
import CreateWarehouseRequisitionButton from '@/components/stock/CreateWarehouseRequisitionButton';
import { stockService } from '@/services/stockService';
import { useToast } from '@/hooks/use-toast';

const statusBadge = (s: StockRequisitionStatus) => {
  switch (s) {
    case StockRequisitionStatus.PENDING:
      return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40">Pendente</Badge>;
    case StockRequisitionStatus.APPROVED:
      return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">Aprovada</Badge>;
    case StockRequisitionStatus.DELIVERED:
      return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40">Entregue</Badge>;
    case StockRequisitionStatus.CANCELLED:
      return <Badge variant="outline">Cancelada</Badge>;
    default:
      return <Badge variant="outline">{s}</Badge>;
  }
};

function isPending(row: StockRequisitionListItem): boolean {
  return row.status === StockRequisitionStatus.PENDING;
}

interface StockRequisitionsPanelProps {
  items: StockRequisitionListItem[];
  loading?: boolean;
  onRefresh: () => void | Promise<void>;
}

const StockRequisitionsPanel: React.FC<StockRequisitionsPanelProps> = ({ items, loading, onRefresh }) => {
  const { toast } = useToast();
  const [viewId, setViewId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalOpenMode, setModalOpenMode] = useState<'view' | 'edit'>('view');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [singleDeleteRow, setSingleDeleteRow] = useState<StockRequisitionListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const pendingIds = useMemo(() => items.filter(isPending).map((r) => r.id), [items]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const allPendingSelected =
    pendingIds.length > 0 && pendingIds.every((id) => selectedSet.has(id));
  const somePendingSelected =
    !allPendingSelected && pendingIds.some((id) => selectedSet.has(id));
  const headerCheckboxState: boolean | 'indeterminate' = allPendingSelected
    ? true
    : somePendingSelected
      ? 'indeterminate'
      : false;

  const selectedPendingIds = useMemo(
    () => selectedIds.filter((id) => pendingIds.includes(id)),
    [selectedIds, pendingIds]
  );

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const openView = (id: string) => {
    setViewId(id);
    setModalOpenMode('view');
    setModalOpen(true);
  };

  const openEdit = (id: string) => {
    setViewId(id);
    setModalOpenMode('edit');
    setModalOpen(true);
  };

  const toggleRow = (row: StockRequisitionListItem, checked: boolean) => {
    if (!isPending(row)) return;
    setSelectedIds((prev) => {
      if (checked) return prev.includes(row.id) ? prev : [...prev, row.id];
      return prev.filter((x) => x !== row.id);
    });
  };

  const toggleSelectAllPending = () => {
    if (allPendingSelected) {
      const drop = new Set(pendingIds);
      setSelectedIds((prev) => prev.filter((id) => !drop.has(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...pendingIds])]);
    }
  };

  const runDeleteIds = async (ids: string[]) => {
    const unique = [...new Set(ids.map((x) => String(x).trim()).filter(Boolean))];
    if (unique.length === 0) return;
    setDeleting(true);
    try {
      if (unique.length === 1) {
        await stockService.deleteStockRequisition(unique[0]);
      } else {
        await stockService.deleteStockRequisitionsBulk(unique);
      }
      toast({
        title: 'Sucesso',
        description:
          unique.length === 1 ? 'Requisição excluída.' : `${unique.length} requisições excluídas.`,
      });
      setSelectedIds((prev) => prev.filter((id) => !unique.includes(id)));
      setBulkDeleteOpen(false);
      setSingleDeleteRow(null);
      await onRefresh();
    } catch (e: any) {
      toast({
        title: 'Não foi possível excluir',
        description: e?.response?.data?.error || e?.message || 'Só requisições pendentes podem ser excluídas.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card className="bg-seguranca-graphite border-gray-600">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-seguranca-lightgray flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-seguranca-yellow" />
              Requisições ao Almoxarifado ({items.length})
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-gray-600 text-seguranca-lightgray"
                onClick={handleRefresh}
                disabled={loading || refreshing}
              >
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Atualizar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-red-700/60 text-red-400 hover:bg-red-950/30 disabled:opacity-40"
                disabled={selectedPendingIds.length === 0 || deleting}
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir selecionadas
                {selectedPendingIds.length > 0 ? (
                  <span className="ml-1.5 rounded-full bg-red-900/80 px-2 py-0.5 text-xs font-semibold">
                    {selectedPendingIds.length}
                  </span>
                ) : null}
              </Button>
              <CreateWarehouseRequisitionButton
                size="sm"
                variant="default"
                className="bg-seguranca-red hover:bg-seguranca-darkred"
                onRecorded={() => void onRefresh()}
              />
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Requisições criadas pelo Operacional, RH/Departamento Pessoal ou Estoque aparecem aqui. Aprovação e entrega ficam com o almoxarifado. Apenas requisições{' '}
            <strong className="text-seguranca-lightgray">pendentes</strong> podem ser editadas ou excluídas (incluindo exclusão em massa).
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-gray-400 py-10">Nenhuma requisição registrada.</p>
          ) : (
            <div className="rounded-md border border-gray-600/50 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600 hover:bg-transparent">
                    <TableHead className="w-12 text-center text-seguranca-yellow">
                      <Checkbox
                        checked={headerCheckboxState}
                        onCheckedChange={() => toggleSelectAllPending()}
                        disabled={pendingIds.length === 0}
                        aria-label="Selecionar todas as requisições pendentes"
                        className="data-[state=checked]:bg-seguranca-red data-[state=checked]:border-seguranca-red"
                      />
                    </TableHead>
                    <TableHead className="text-seguranca-yellow">Número</TableHead>
                    <TableHead className="text-seguranca-yellow">Status</TableHead>
                    <TableHead className="text-seguranca-yellow">Funcionário</TableHead>
                    <TableHead className="text-seguranca-yellow">Motivo</TableHead>
                    <TableHead className="text-seguranca-yellow">Itens</TableHead>
                    <TableHead className="text-seguranca-yellow">Solicitante</TableHead>
                    <TableHead className="text-seguranca-yellow">Data</TableHead>
                    <TableHead className="text-right text-seguranca-yellow">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => {
                    const pending = isPending(row);
                    return (
                      <TableRow key={row.id} className="border-gray-600/50 text-seguranca-lightgray">
                        <TableCell className="text-center align-middle">
                          <Checkbox
                            checked={selectedSet.has(row.id)}
                            disabled={!pending}
                            title={pending ? 'Selecionar para exclusão em massa' : 'Só pendentes podem ser selecionadas'}
                            onCheckedChange={(v) => toggleRow(row, Boolean(v))}
                            className="data-[state=checked]:bg-seguranca-red data-[state=checked]:border-seguranca-red"
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{row.requisitionNumber}</TableCell>
                        <TableCell>{statusBadge(row.status)}</TableCell>
                        <TableCell className="max-w-[160px] truncate">{row.employeeName ?? '—'}</TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm">{row.movementReasonLabel ?? '—'}</TableCell>
                        <TableCell>{row.linesCount}</TableCell>
                        <TableCell className="max-w-[140px] truncate text-sm">{row.requestedByName ?? '—'}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {row.createdAt ? new Date(row.createdAt).toLocaleString('pt-BR') : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-seguranca-yellow hover:text-white"
                              onClick={() => openView(row.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Abrir
                            </Button>
                            {pending && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-amber-300 hover:text-white"
                                onClick={() => openEdit(row.id)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Editar
                              </Button>
                            )}
                            {pending && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-200"
                                onClick={() => setSingleDeleteRow(row)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Excluir
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <StockRequisitionModal
        open={modalOpen}
        onOpenChange={(v) => {
          if (!v) setViewId(null);
          setModalOpen(v);
        }}
        prefill={null}
        initialRequisitionId={viewId}
        initialOpenMode={modalOpenMode}
        onRecorded={() => void onRefresh()}
      />

      <AlertDialog open={bulkDeleteOpen} onOpenChange={(o) => !deleting && setBulkDeleteOpen(o)}>
        <AlertDialogContent className="bg-seguranca-graphite border-gray-600 text-white sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-seguranca-red">Excluir requisições selecionadas?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Serão excluídas <strong>{selectedPendingIds.length}</strong> requisição(ões) <strong>pendente(s)</strong>. Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              disabled={deleting}
              className="border-gray-600 bg-transparent text-white hover:bg-seguranca-black hover:text-white"
            >
              Cancelar
            </AlertDialogCancel>
            <Button
              type="button"
              className="bg-seguranca-red hover:bg-red-700 text-white"
              disabled={deleting || selectedPendingIds.length === 0}
              onClick={() => void runDeleteIds(selectedPendingIds)}
            >
              {deleting ? 'Excluindo…' : 'Excluir'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!singleDeleteRow} onOpenChange={(o) => !deleting && !o && setSingleDeleteRow(null)}>
        <AlertDialogContent className="bg-seguranca-graphite border-gray-600 text-white sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-seguranca-red">Excluir requisição?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Confirma a exclusão da requisição <span className="font-mono text-seguranca-yellow">{singleDeleteRow?.requisitionNumber}</span>? Só é permitido
              enquanto estiver pendente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              disabled={deleting}
              className="border-gray-600 bg-transparent text-white hover:bg-seguranca-black hover:text-white"
            >
              Cancelar
            </AlertDialogCancel>
            <Button
              type="button"
              className="bg-seguranca-red hover:bg-red-700 text-white"
              disabled={deleting || !singleDeleteRow}
              onClick={() => singleDeleteRow && void runDeleteIds([singleDeleteRow.id])}
            >
              {deleting ? 'Excluindo…' : 'Excluir'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default StockRequisitionsPanel;
