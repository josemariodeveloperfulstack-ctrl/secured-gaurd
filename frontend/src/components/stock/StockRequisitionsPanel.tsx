import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClipboardList, Eye, Loader2, RefreshCw } from 'lucide-react';
import { StockRequisitionListItem, StockRequisitionStatus } from '@/types/stock';
import StockRequisitionModal from '@/components/stock/StockRequisitionModal';
import CreateWarehouseRequisitionButton from '@/components/stock/CreateWarehouseRequisitionButton';

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

interface StockRequisitionsPanelProps {
  items: StockRequisitionListItem[];
  loading?: boolean;
  onRefresh: () => void | Promise<void>;
}

const StockRequisitionsPanel: React.FC<StockRequisitionsPanelProps> = ({ items, loading, onRefresh }) => {
  const [viewId, setViewId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const openRow = (id: string) => {
    setViewId(id);
    setModalOpen(true);
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
              <CreateWarehouseRequisitionButton
                size="sm"
                variant="default"
                className="bg-seguranca-red hover:bg-seguranca-darkred"
                onRecorded={() => void onRefresh()}
              />
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Requisições criadas pelo Operacional, RH/Departamento Pessoal ou Estoque aparecem aqui. Aprovação e entrega ficam com o almoxarifado.
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
                  {items.map((row) => (
                    <TableRow key={row.id} className="border-gray-600/50 text-seguranca-lightgray">
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-seguranca-yellow hover:text-white"
                          onClick={() => openRow(row.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Abrir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
        onRecorded={() => void onRefresh()}
      />
    </>
  );
};

export default StockRequisitionsPanel;
