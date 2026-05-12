import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import emailCampaignService from '@/services/emailCampaignService';
import { formatDate } from '@/utils/formatters';
import { Ban, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

function formatConfirmedAt(v: string | undefined): string {
  if (!v) return '-';
  return formatDate(v);
}

const MarketingUnsubscribesTab: React.FC = () => {
  const pageSize = 25;
  const [page, setPage] = useState(0);

  const query = useQuery({
    queryKey: ['marketing-unsubscribes', page, pageSize],
    queryFn: () => emailCampaignService.listMarketingUnsubscribes(page, pageSize),
  });

  const totalPages = query.data?.totalPages ?? 0;

  const rows = query.data?.content ?? [];
  const total = query.data?.totalElements ?? 0;

  const renderBody = () => {
    if (query.isLoading) {
      return (
        <div className="flex items-center justify-center py-12 text-seguranca-lightgray">
          <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
        </div>
      );
    }
    if (query.isError) {
      return (
        <p className="text-sm text-red-400">
          Não foi possível carregar a lista. Verifique a sessão e tente novamente.
        </p>
      );
    }
    return (
      <>
        <p className="text-xs text-seguranca-lightgray">
          Total: <span className="font-semibold text-white">{total}</span> endereço(s) com opt-out confirmado.
        </p>
        <div className="overflow-x-auto rounded-md border border-seguranca-graphite">
          <Table>
            <TableHeader>
              <TableRow className="border-seguranca-graphite hover:bg-seguranca-black/30">
                <TableHead className="text-seguranca-lightgray">E-mail</TableHead>
                <TableHead className="text-seguranca-lightgray">Confirmado em</TableHead>
                <TableHead className="text-seguranca-lightgray">Origem</TableHead>
                <TableHead className="text-seguranca-lightgray">Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-seguranca-lightgray">
                    Nenhum descadastro registado.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.email} className="border-seguranca-graphite hover:bg-seguranca-black/30">
                    <TableCell className="font-mono text-sm text-white">{r.email}</TableCell>
                    <TableCell className="text-sm text-seguranca-lightgray">
                      {formatConfirmedAt(r.confirmedAt)}
                    </TableCell>
                    <TableCell className="text-sm text-seguranca-lightgray">{r.source ?? '-'}</TableCell>
                    <TableCell className="max-w-[240px] truncate text-sm text-seguranca-lightgray">
                      {r.reason ?? '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-seguranca-graphite text-white"
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Anterior
            </Button>
            <span className="text-xs text-seguranca-lightgray">
              Página {page + 1} de {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-seguranca-graphite text-white"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Seguinte
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <Card className="border-seguranca-graphite bg-seguranca-graphite/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-white">
          <Ban className="h-5 w-5 text-seguranca-yellow" />
          Descadastrados (e-mail marketing)
        </CardTitle>
        <CardDescription className="text-seguranca-lightgray">
          Contactos que confirmaram o cancelamento pelo link &quot;Cancelar inscrição&quot; no rodapé do e-mail. O
          endereço deixa de receber campanhas e fica registado nesta lista; os destinatários nas campanhas são marcados
          como suprimidos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{renderBody()}</CardContent>
    </Card>
  );
};

export default MarketingUnsubscribesTab;
