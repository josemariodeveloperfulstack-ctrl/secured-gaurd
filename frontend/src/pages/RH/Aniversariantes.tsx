import React, { useMemo, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StandardLayout } from '@/components/StandardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { employeeService, Employee } from '@/services/employeeService';
import { companyService } from '@/services/companyService';
import { Gift, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MESES: { value: string; label: string }[] = [
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

function formatBirthDate(value?: string | null): string {
  if (!value) return '—';
  try {
    const raw = String(value).includes('T') ? String(value).split('T')[0] : String(value);
    const d = parseISO(raw.length === 10 ? raw : `${raw.slice(0, 10)}`);
    return format(d, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return String(value);
  }
}

function escapeCsvCell(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

const Aniversariantes: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [referenceYear, setReferenceYear] = useState(String(now.getFullYear()));
  const [onlyActive, setOnlyActive] = useState(true);
  const [companyId, setCompanyId] = useState<string>('all');
  const { toast } = useToast();

  const { data: companies = [] } = useQuery({
    queryKey: ['companies', 'aniversariantes'],
    queryFn: () => companyService.getAllCompanies(),
  });

  const monthNum = Number(month);
  const yearNum = Number(referenceYear) || now.getFullYear();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['employees', 'birthdays', monthNum, onlyActive, yearNum, companyId],
    queryFn: () =>
      employeeService.getBirthdaysByMonth({
        month: monthNum,
        onlyActive,
        referenceYear: yearNum,
        companyId: companyId === 'all' ? undefined : companyId,
      }),
    enabled: monthNum >= 1 && monthNum <= 12,
  });

  const employees = data?.employees ?? [];

  const titleMonth = useMemo(() => MESES.find(m => m.value === month)?.label ?? month, [month]);

  const exportCsv = useCallback(() => {
    const headers = [
      'Dia',
      'Nome',
      'Data nascimento',
      'Idade no ano',
      'Cargo',
      'Unidade',
      'Empresa',
      'Posto',
      'Departamento',
      'Status',
      'E-mail',
      'Telefone',
    ];
    const rows = employees.map((e: Employee) => [
      String(e.birthDayOfMonth ?? ''),
      e.name ?? '',
      formatBirthDate(e.birthDate),
      e.ageTurning != null ? String(e.ageTurning) : '',
      e.position?.name ?? '',
      e.unit?.name ?? '',
      e.company?.sigla ?? '',
      e.workPost?.name ?? '',
      e.department?.name ?? '',
      e.status ?? '',
      e.email ?? '',
      e.phone ?? '',
    ]);
    const bom = '\uFEFF';
    const csv =
      bom +
      [headers.map(escapeCsvCell).join(';'), ...rows.map(r => r.map(c => escapeCsvCell(String(c))).join(';'))].join(
        '\r\n'
      );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aniversariantes-${titleMonth}-${yearNum}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Lista exportada', description: 'Arquivo CSV gerado (separador ;).' });
  }, [employees, titleMonth, yearNum, toast]);

  return (
    <StandardLayout>
      <Helmet>
        <title>Aniversariantes do mês | RH</title>
      </Helmet>

      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/15 p-3 text-amber-400">
              <Gift className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Aniversariantes do mês</h1>
              <p className="text-sm text-gray-400">
                Lista por data de nascimento — RH e Departamento Pessoal
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-gray-600 text-gray-200"
            onClick={exportCsv}
            disabled={employees.length === 0 || isLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        <Card className="bg-seguranca-graphite border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Filtros</CardTitle>
            <CardDescription className="text-gray-400">
              Escolha o mês e, se quiser, restrinja a empresa ou inclua inativos.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Mês</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="bg-seguranca-black border-gray-600 text-white">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-graphite border-gray-600">
                  {MESES.map(m => (
                    <SelectItem key={m.value} value={m.value} className="text-white focus:bg-gray-700">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Ano (idade a completar)</Label>
              <Input
                type="number"
                min={1950}
                max={2100}
                value={referenceYear}
                onChange={e => setReferenceYear(e.target.value)}
                className="bg-seguranca-black border-gray-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Empresa</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger className="bg-seguranca-black border-gray-600 text-white">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-graphite border-gray-600 max-h-64">
                  <SelectItem value="all" className="text-white focus:bg-gray-700">
                    Todas
                  </SelectItem>
                  {companies.map((c: any) => (
                    <SelectItem
                      key={c.id}
                      value={String(c.id)}
                      className="text-white focus:bg-gray-700"
                    >
                      {c.sigla || c.name || c.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 pb-2">
              <Checkbox
                id="only-active"
                checked={onlyActive}
                onCheckedChange={v => setOnlyActive(v === true)}
                className="border-gray-500"
              />
              <Label htmlFor="only-active" className="text-gray-300 cursor-pointer">
                Apenas funcionários ativos
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-graphite border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-white">
                {titleMonth} de {yearNum}
              </CardTitle>
              <CardDescription className="text-gray-400">
                {isLoading || isFetching ? 'Carregando…' : `${data?.count ?? 0} aniversariante(s)`}
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Atualizar'}
            </Button>
          </CardHeader>
          <CardContent>
            {isError && (
              <p className="text-red-400 text-sm mb-4">
                {(error as Error)?.message || 'Erro ao carregar aniversariantes.'}
              </p>
            )}
            {isLoading ? (
              <div className="flex justify-center py-12 text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : employees.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nenhum aniversariante neste mês com os filtros atuais.</p>
            ) : (
              <div className="rounded-md border border-gray-700 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 hover:bg-transparent">
                      <TableHead className="text-gray-300">Dia</TableHead>
                      <TableHead className="text-gray-300">Nome</TableHead>
                      <TableHead className="text-gray-300">Nascimento</TableHead>
                      <TableHead className="text-gray-300">Idade ({yearNum})</TableHead>
                      <TableHead className="text-gray-300">Cargo</TableHead>
                      <TableHead className="text-gray-300">Unidade</TableHead>
                      <TableHead className="text-gray-300">Empresa</TableHead>
                      <TableHead className="text-gray-300">Posto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((e: Employee) => (
                      <TableRow key={e.id} className="border-gray-700 text-gray-200">
                        <TableCell className="font-medium text-amber-400/90">
                          {e.birthDayOfMonth ?? '—'}
                        </TableCell>
                        <TableCell>{e.name}</TableCell>
                        <TableCell>{formatBirthDate(e.birthDate)}</TableCell>
                        <TableCell>{e.ageTurning ?? '—'}</TableCell>
                        <TableCell>{e.position?.name ?? '—'}</TableCell>
                        <TableCell>{e.unit?.name ?? '—'}</TableCell>
                        <TableCell>{e.company?.sigla ?? '—'}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={e.workPost?.name}>
                          {e.workPost?.name ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StandardLayout>
  );
};

export default Aniversariantes;
