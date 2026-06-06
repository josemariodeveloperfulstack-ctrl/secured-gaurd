import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  CalendarCheck,
  Loader2,
  MapPin,
  RefreshCw,
  Route,
} from 'lucide-react';
import {
  supervisorVisitService,
  ALLOCATION_BADGE_CLASS,
  ALLOCATION_LABEL,
  type PostAllocationType,
  type SupervisorVisitReportRow,
} from '@/services/supervisorVisitService';

const firstDayOfMonth = () => {
  const d = new Date();
  return format(new Date(d.getFullYear(), d.getMonth(), 1), 'yyyy-MM-dd');
};

const today = () => format(new Date(), 'yyyy-MM-dd');

const SupervisorVisitReport = () => {
  const [rows, setRows] = useState<SupervisorVisitReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [endDate, setEndDate] = useState(today());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await supervisorVisitService.report({ startDate, endDate });
      setRows(data);
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível carregar o relatório de visitas.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmedCount = rows.filter((r) => r.visitedAsScheduled).length;

  const renderBody = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
        </div>
      );
    }
    if (rows.length === 0) {
      return (
        <div className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma visita registrada no período.
        </div>
      );
    }
    return (
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Hora</th>
              <th className="px-3 py-2">Supervisor</th>
              <th className="px-3 py-2">Funcionário</th>
              <th className="px-3 py-2">Posto</th>
              <th className="px-3 py-2">Vínculo</th>
              <th className="px-3 py-2">Local</th>
              <th className="px-3 py-2 text-center">Escala</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={
                  row.visitedAsScheduled
                    ? 'border-t bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-100'
                    : 'border-t'
                }
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  {row.visitDate ? format(new Date(`${row.visitDate}T00:00:00`), 'dd/MM/yyyy') : '—'}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {row.visitTime ? row.visitTime.slice(0, 5) : '—'}
                </td>
                <td className="px-3 py-2">{row.supervisorName || '—'}</td>
                <td className="px-3 py-2">{row.employeeName || '—'}</td>
                <td className="px-3 py-2">{row.workPostName || '—'}</td>
                <td className="px-3 py-2">
                  {row.allocationType ? (
                    <Badge className={ALLOCATION_BADGE_CLASS[row.allocationType as PostAllocationType]}>
                      {ALLOCATION_LABEL[row.allocationType as PostAllocationType]}
                    </Badge>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-2 max-w-[220px]">
                  {row.locationAddress ? (
                    <span className="flex items-start gap-1 text-xs">
                      <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" />
                      <span className="line-clamp-2">{row.locationAddress}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sem localização</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {row.visitedAsScheduled ? (
                    <CalendarCheck className="mx-auto h-4 w-4 text-blue-600" />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" /> Relatório de Visitas do Supervisor
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Visitas registradas via check-in nos postos de trabalho. As visitas que coincidem
              com a escala de visita aparecem em <span className="font-semibold text-blue-600">azul</span>.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label className="text-xs">Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Fim</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-blue-500" />
              <span>Visita conforme escala</span>
            </span>
            <span className="flex items-center gap-1">
              <CalendarCheck className="h-3.5 w-3.5 text-blue-600" />
              <span>{confirmedCount} de {rows.length} visita(s) confirmada(s) pela escala</span>
            </span>
          </div>

          {renderBody()}
        </CardContent>
      </Card>
    </div>
  );
};

export default SupervisorVisitReport;
