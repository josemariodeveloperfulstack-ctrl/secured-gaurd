import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Clock, User, Building2, Briefcase, FileText, Download, ChevronsUpDown, Check, Save, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCPF } from '@/utils/validation';
import {
  formatEscalaResumo,
  isEscala12x36,
  isWorkDayIn12x36,
  parseHireDate,
} from '@/utils/workSchedule';
import { useToast } from '@/hooks/use-toast';
import { employeeService, SimpleEmployee, type Employee } from '@/services/employeeService';
import { timeSheetService } from '@/services/timeSheetService';
import { companyService } from '@/services/companyService';
import timeRecordService from '@/services/timeRecordService';

const DAY_NAMES = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MIN_EMPLOYEE_SEARCH_CHARS = 3;

/** Converte "HH:mm" para minutos desde 00:00 */
function timeToMinutes(value: string): number {
  if (!value || !/^\d{1,2}:\d{2}$/.test(value.trim())) return 0;
  const [h, m] = value.trim().split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Duração do intervalo em minutos: saída - entrada (entrada/saída do intervalo). */
function intervalDurationMinutes(entrada: string, saida: string): number {
  const e = timeToMinutes(entrada);
  const s = timeToMinutes(saida);
  if (e === 0 && s === 0) return 0;
  return Math.max(0, s - e);
}

/** Minutos do turno que caem no horário noturno (22h às 05h). CLT art. 73. */
function nightMinutesInShift(entradaMin: number, saidaMin: number): number {
  if (entradaMin === 0 && saidaMin === 0) return 0;
  const NOITE_INICIO = 22 * 60; // 22:00 = 1320 min
  const NOITE_FIM = 5 * 60; // 05:00 = 300 min (dia seguinte)
  const MINUTOS_DIA = 24 * 60; // 1440

  if (saidaMin > entradaMin) {
    // Mesmo dia: intersecção de [entrada, saida] com [22:00, 24:00)
    const inicio = Math.max(entradaMin, NOITE_INICIO);
    const fim = Math.min(saidaMin, MINUTOS_DIA);
    return Math.max(0, fim - inicio);
  }

  // Virada do dia (ex.: 22h às 05h): 22h–24h + 00h–05h
  const trecho1 = Math.max(0, MINUTOS_DIA - Math.max(entradaMin, NOITE_INICIO));
  const trecho2 = saidaMin <= NOITE_FIM ? saidaMin : NOITE_FIM;
  return trecho1 + trecho2;
}

/** Sugere carga horária diária padrão para funções com escala 12x36 (vigilância, portaria etc.). */
function inferDefaultDailyHours(positionName: string | undefined | null): number | null {
  if (!positionName) return null;
  const lower = positionName.toLowerCase();
  if (
    lower.includes('vigia') ||
    lower.includes('vigilante') ||
    lower.includes('porteiro') ||
    lower.includes('portaria') ||
    lower.includes('controlador de acesso') ||
    lower.includes('controle de acesso')
  ) {
    // Em jornadas 12x36, a prática comum é considerar 12h no dia trabalhado.
    return 12;
  }
  return null;
}

/** Minutos para formato "HH:mm" (horas:minutos) */
function minutesToTime(totalMinutes: number): string {
  if (totalMinutes <= 0 || !Number.isFinite(totalMinutes)) return '00:00';
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Formata minutos para exibição "Xh Ym" */
function formatHoursMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0 || !Number.isFinite(totalMinutes)) return '0h 0min';
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export interface DayRow {
  date: Date;
  dayLabel: string;
  weekdayLabel: string;
  entrada: string;
  intervaloEntrada: string;
  intervaloSaida: string;
  saida: string;
}

/** Rótulo da empresa para selects (alinha ao exemplo com sigla). */
function formatCompanyLabel(c: { name: string; sigla?: string | null }): string {
  const s = c.sigla?.trim();
  if (s) return `(${s}) ${c.name}`.trim();
  return c.name || '—';
}

/** Setor de trabalho: prioriza posto (operacional), depois departamento, depois unidade. */
function resolveEmployeeSetor(emp: Employee): string {
  const anyEmp = emp as Record<string, unknown>;
  const workPostName = emp.workPost?.name ?? (anyEmp.workPostName as string | undefined);
  const deptName = emp.department?.name ?? (anyEmp.departmentName as string | undefined);
  const unitName = emp.unit?.name ?? (anyEmp.unitName as string | undefined);
  return workPostName || deptName || unitName || '—';
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function rowHasTimes(row: DayRow, semIntervalo = false): boolean {
  if (semIntervalo) return !!(row.entrada || row.saida);
  return !!(row.entrada || row.intervaloEntrada || row.intervaloSaida || row.saida);
}

function buildDaysInPeriod(start: Date, end: Date): DayRow[] {
  const list: DayRow[] = [];
  const curr = new Date(start);
  curr.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);
  while (curr <= endDate) {
    const d = curr.getDate();
    const w = curr.getDay();
    list.push({
      date: new Date(curr),
      dayLabel: `${String(d).padStart(2, '0')}`,
      weekdayLabel: DAY_NAMES[w],
      entrada: '',
      intervaloEntrada: '',
      intervaloSaida: '',
      saida: '',
    });
    curr.setDate(curr.getDate() + 1);
  }
  return list;
}

const LancamentoManualFolhaPonto: React.FC = () => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<SimpleEmployee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [employeeDetail, setEmployeeDetail] = useState<{ name: string; funcao: string; setor: string } | null>(null);
  const [employeeSchedule, setEmployeeSchedule] = useState<{
    escalaTrabalho?: string;
    horarioTrabalho?: string;
    diasTrabalho?: string;
    is12x36: boolean;
    hireDate: Date | null;
  } | null>(null);
  const [periodStart, setPeriodStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [periodEnd, setPeriodEnd] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  /** Empresa do cabeçalho do lançamento manual (lista cadastrada). */
  const [formCompanyId, setFormCompanyId] = useState<string>('');
  const [cargaHorariaNormal, setCargaHorariaNormal] = useState<number>(8);
  const [rows, setRows] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pdfYear, setPdfYear] = useState(new Date().getFullYear());
  const [pdfMonth, setPdfMonth] = useState(new Date().getMonth() + 1);
  const [pdfCompanyId, setPdfCompanyId] = useState<string>('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string; sigla?: string }[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [savingAll, setSavingAll] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);
  const [rowSaveStatus, setRowSaveStatus] = useState<Record<number, 'saved' | 'error'>>({});
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cargaHorariaSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowsRef = useRef<DayRow[]>([]);
  const selectedEmployeeIdRef = useRef<string>('');
  const cargaHorariaNormalRef = useRef<number>(8);
  const is12x36Ref = useRef(false);

  const startDate = useMemo(() => (periodStart ? new Date(periodStart) : null), [periodStart]);
  const endDate = useMemo(() => (periodEnd ? new Date(periodEnd) : null), [periodEnd]);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedEmployeeId),
    [employees, selectedEmployeeId],
  );

  const is12x36 = employeeSchedule?.is12x36 ?? false;
  const hireDateAnchor = employeeSchedule?.hireDate ?? null;

  const filteredEmployeesForPicker = useMemo(() => {
    const q = employeeSearchQuery.trim().toLowerCase();
    if (q.length < MIN_EMPLOYEE_SEARCH_CHARS) return [];
    const qDigits = q.replace(/\D/g, '');
    return employees.filter((emp) => {
      const name = (emp.name || '').toLowerCase();
      const mat = (emp.registrationNumber || '').toLowerCase();
      const docDigits = (emp.cpf || emp.document || '').replace(/\D/g, '');
      if (name.includes(q) || mat.includes(q)) return true;
      if (qDigits.length >= MIN_EMPLOYEE_SEARCH_CHARS && docDigits.includes(qDigits)) return true;
      return false;
    });
  }, [employees, employeeSearchQuery]);

  const handleSelectEmployee = (id: string) => {
    setSelectedEmployeeId(id);
    setEmployeePickerOpen(false);
    setEmployeeSearchQuery('');
  };

  rowsRef.current = rows;
  selectedEmployeeIdRef.current = selectedEmployeeId;
  cargaHorariaNormalRef.current = cargaHorariaNormal;

  useEffect(() => {
    (async () => {
      try {
        const [list, companiesList] = await Promise.all([
          employeeService.getSimpleEmployees(),
          companyService.getAllCompanies(),
        ]);
        setEmployees(list || []);
        const comps: { id: string; name: string; sigla?: string }[] = (Array.isArray(companiesList) ? companiesList : []).map(
          (c: { id?: string; name?: string; sigla?: string }) => ({
            id: String(c.id ?? ''),
            name: String(c.name ?? ''),
            sigla: c.sigla,
          }),
        ).filter((c) => c.id);
        setCompanies(comps);
        if (comps.length > 0) {
          setPdfCompanyId((prev) => (prev ? prev : comps[0].id));
          setFormCompanyId((prev) => (prev ? prev : comps[0].id));
        }
      } catch (e) {
        console.error(e);
        toast({ title: 'Erro', description: 'Não foi possível carregar os colaboradores.', variant: 'destructive' });
      }
    })();
  }, [toast]);

  useEffect(() => {
    setRowSaveStatus({});
    setLastAutoSavedAt(null);
    if (!selectedEmployeeId) {
      setEmployeeDetail(null);
      setEmployeeSchedule(null);
      return;
    }
    setLoading(true);
    employeeService
      .getEmployeeById(selectedEmployeeId)
      .then((emp: Employee | null) => {
        if (emp) {
          const anyEmp = emp as Record<string, unknown>;
          const positionName = emp.position?.name ?? (anyEmp.positionName as string | undefined) ?? '';
          const escala12 = isEscala12x36(emp.escalaTrabalho, emp.diasTrabalho);
          const hireParsed = parseHireDate(emp.hireDate);

          setEmployeeDetail({
            name: emp.name ?? '—',
            funcao: positionName || '—',
            setor: resolveEmployeeSetor(emp),
          });
          setEmployeeSchedule({
            escalaTrabalho: emp.escalaTrabalho,
            horarioTrabalho: emp.horarioTrabalho,
            diasTrabalho: emp.diasTrabalho,
            is12x36: escala12,
            hireDate: hireParsed,
          });

          const cid = emp.company?.id ? String(emp.company.id) : '';
          if (cid && companies.some((c) => c.id === cid)) {
            setFormCompanyId(cid);
          }

          if (escala12) {
            setCargaHorariaNormal(12);
          } else {
            const inferred = inferDefaultDailyHours(positionName);
            setCargaHorariaNormal(inferred ?? 8);
          }
        } else {
          setEmployeeDetail(null);
          setEmployeeSchedule(null);
        }
      })
      .catch(() => {
        setEmployeeDetail(null);
        setEmployeeSchedule(null);
      })
      .finally(() => setLoading(false));
  }, [selectedEmployeeId, companies]);

  useEffect(() => {
    if (!startDate || !endDate || startDate > endDate) {
      setRows([]);
      return;
    }
    const baseRows = buildDaysInPeriod(startDate, endDate);
    if (!selectedEmployeeId) {
      setRows(baseRows);
      return;
    }
    setLoadingRecords(true);
    timeRecordService
      .getRecordsByPeriod(selectedEmployeeId, periodStart, periodEnd)
      .then((res: { success?: boolean; data?: Array<{ recordType: string; recordedAt: string }> }) => {
        const records = res?.data ?? [];
        const byDate: Record<string, { entrada?: string; intervaloSaida?: string; intervaloEntrada?: string; saida?: string }> = {};
        records.forEach((r: { recordType: string; recordedAt: string }) => {
          const dateKey = r.recordedAt.slice(0, 10);
          if (!byDate[dateKey]) byDate[dateKey] = {};
          const time = r.recordedAt.slice(11, 16);
          if (r.recordType === 'ENTRADA') byDate[dateKey].entrada = time;
          else if (r.recordType === 'SAIDA_ALMOCO') byDate[dateKey].intervaloSaida = time;
          else if (r.recordType === 'RETORNO_ALMOCO') byDate[dateKey].intervaloEntrada = time;
          else if (r.recordType === 'SAIDA') byDate[dateKey].saida = time;
        });
        const semIntervalo = employeeSchedule?.is12x36 ?? false;
        const merged = baseRows.map((row) => {
          const dateKey = formatDateKey(row.date);
          const fill = byDate[dateKey];
          if (!fill) {
            if (semIntervalo) {
              return { ...row, intervaloEntrada: '', intervaloSaida: '' };
            }
            return row;
          }
          return {
            ...row,
            entrada: fill.entrada ?? row.entrada,
            intervaloSaida: semIntervalo ? '' : (fill.intervaloSaida ?? row.intervaloSaida),
            intervaloEntrada: semIntervalo ? '' : (fill.intervaloEntrada ?? row.intervaloEntrada),
            saida: fill.saida ?? row.saida,
          };
        });
        setRows(merged);
      })
      .catch(() => setRows(baseRows))
      .finally(() => setLoadingRecords(false));
  }, [periodStart, periodEnd, selectedEmployeeId, employeeSchedule?.is12x36]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (cargaHorariaSaveTimeoutRef.current) clearTimeout(cargaHorariaSaveTimeoutRef.current);
    };
  }, []);

  const saveRowToBackend = async (index: number, options?: { silent?: boolean }): Promise<boolean> => {
    const row = rowsRef.current[index];
    const empId = selectedEmployeeIdRef.current;
    if (!row || !empId) return false;
    const semIntervalo = is12x36Ref.current;
    if (!rowHasTimes(row, semIntervalo)) return false;

    const dateStr = formatDateKey(row.date);
    try {
      await timeRecordService.saveManualDay(empId, dateStr, {
        entrada: row.entrada || undefined,
        saidaAlmoco: semIntervalo ? undefined : row.intervaloSaida || undefined,
        retornoAlmoco: semIntervalo ? undefined : row.intervaloEntrada || undefined,
        saida: row.saida || undefined,
        cargaHorariaNormal: cargaHorariaNormalRef.current,
      });
      setRowSaveStatus((prev) => ({ ...prev, [index]: 'saved' }));
      if (!options?.silent) {
        toast({ title: 'Salvo', description: `Horários do dia ${dateStr} registrados.`, duration: 2000 });
      }
      return true;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Não foi possível salvar no banco.');
      setRowSaveStatus((prev) => ({ ...prev, [index]: 'error' }));
      if (!options?.silent) {
        toast({ title: 'Erro ao salvar', description: message, variant: 'destructive' });
      }
      return false;
    }
  };

  const saveAllRows = async (options?: { silent?: boolean }) => {
    if (!selectedEmployeeIdRef.current) {
      toast({
        title: 'Selecione o colaborador',
        description: 'Escolha um funcionário antes de salvar o lançamento.',
        variant: 'destructive',
      });
      return { saved: 0, failed: 0, skipped: 0 };
    }

    const semIntervalo = is12x36Ref.current;
    const indices = rowsRef.current
      .map((row, index) => (rowHasTimes(row, semIntervalo) ? index : -1))
      .filter((i) => i >= 0);

    if (indices.length === 0) {
      if (!options?.silent) {
        toast({
          title: 'Nada para salvar',
          description: 'Preencha ao menos um horário (entrada ou saída) em algum dia.',
          variant: 'destructive',
        });
      }
      return { saved: 0, failed: 0, skipped: rowsRef.current.length };
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    setSavingAll(true);
    let saved = 0;
    let failed = 0;
    for (const index of indices) {
      const ok = await saveRowToBackend(index, { silent: true });
      if (ok) saved += 1;
      else failed += 1;
    }
    setSavingAll(false);

    if (!options?.silent) {
      if (failed === 0) {
        toast({
          title: 'Lançamento salvo',
          description: `${saved} dia(s) registrado(s) com sucesso.`,
        });
      } else {
        toast({
          title: 'Salvamento parcial',
          description: `${saved} dia(s) salvos, ${failed} com erro.`,
          variant: 'destructive',
        });
      }
    }

    return { saved, failed, skipped: rowsRef.current.length - indices.length };
  };

  const scheduleAutoSaveRow = (index: number) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      saveTimeoutRef.current = null;
      if (!selectedEmployeeIdRef.current || !rowHasTimes(rowsRef.current[index], is12x36Ref.current)) return;
      setAutoSaving(true);
      const ok = await saveRowToBackend(index, { silent: true });
      setAutoSaving(false);
      if (ok) setLastAutoSavedAt(new Date());
    }, 800);
  };

  const scheduleAutoSaveAllWithTimes = () => {
    if (cargaHorariaSaveTimeoutRef.current) clearTimeout(cargaHorariaSaveTimeoutRef.current);
    cargaHorariaSaveTimeoutRef.current = setTimeout(async () => {
      cargaHorariaSaveTimeoutRef.current = null;
      if (!selectedEmployeeIdRef.current) return;
      setAutoSaving(true);
      const result = await saveAllRows({ silent: true });
      setAutoSaving(false);
      if (result.saved > 0) setLastAutoSavedAt(new Date());
    }, 1000);
  };

  const updateRow = (index: number, field: keyof DayRow, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      if (next[index]) (next[index] as any)[field] = value;
      return next;
    });
    scheduleAutoSaveRow(index);
  };

  const flushRowSave = (index: number) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    void (async () => {
      if (!selectedEmployeeIdRef.current || !rowHasTimes(rowsRef.current[index], is12x36Ref.current)) return;
      setAutoSaving(true);
      const ok = await saveRowToBackend(index, { silent: true });
      setAutoSaving(false);
      if (ok) setLastAutoSavedAt(new Date());
    })();
  };

  const normalMinutesPerDay = cargaHorariaNormal * 60;

  const { totals, dailyCalculations } = useMemo(() => {
    const daily: { worked: number; overtime: number; interval: number; normal: number; night: number }[] = [];
    let totalWorked = 0;
    let totalOvertime = 0;
    let totalInterval = 0;
    let totalNormal = 0;
    let totalNight = 0;

    rows.forEach((r) => {
      const ent = timeToMinutes(r.entrada);
      const sai = timeToMinutes(r.saida);
      const int = is12x36 ? 0 : intervalDurationMinutes(r.intervaloEntrada, r.intervaloSaida);
      const worked =
        ent === 0 && sai === 0
          ? 0
          : sai > ent
          ? Math.max(0, sai - ent - int)
          : Math.max(0, 24 * 60 - ent + sai - int); // virada do dia (ex.: 22h às 05h)
      const normal = Math.min(worked, normalMinutesPerDay);
      const overtime = Math.max(0, worked - normalMinutesPerDay);
      const night = nightMinutesInShift(ent, sai);

      daily.push({ worked, overtime, interval: int, normal, night });
      totalWorked += worked;
      totalOvertime += overtime;
      totalInterval += int;
      totalNormal += normal;
      totalNight += night;
    });

    // Adicional noturno típico de 20%: convertemos em \"horas equivalentes\"
    // somando 20% das horas noturnas às horas trabalhadas.
    const NIGHT_PREMIUM_PERCENT = 0.2;
    const totalPaid = totalWorked + Math.round(totalNight * NIGHT_PREMIUM_PERCENT);

    return {
      totals: { totalWorked, totalOvertime, totalInterval, totalNormal, totalNight, totalPaid },
      dailyCalculations: daily,
    };
  }, [rows, normalMinutesPerDay, is12x36]);

  const formatDateBR = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const handleDownloadBlankPdf = async () => {
    try {
      setPdfLoading(true);
      const blob = await timeSheetService.downloadBlankFolhaPontoPdf(pdfYear, pdfMonth, pdfCompanyId || undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `folha-ponto-preenchimento-manual-${pdfYear}-${String(pdfMonth).padStart(2, '0')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Sucesso', description: 'PDF gerado. O download deve ter iniciado.' });
    } catch (e: any) {
      console.error(e);
      toast({
        title: 'Erro',
        description: e?.response?.data?.message || 'Não foi possível gerar o PDF.',
        variant: 'destructive',
      });
    } finally {
      setPdfLoading(false);
    }
  };

  const months = [
    { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' }, { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' }, { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' },
  ];

  return (
    <div className="space-y-6">
      {/* Card: Gerar PDF para impressão */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" />
            Imprimir folha de ponto em branco
          </CardTitle>
          <CardDescription>
            Gera um PDF com o layout padronizado (cabeçalho e rodapé da empresa escolhida) para preenchimento manual. Escolha a empresa, o mês e o ano.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          {companies.length > 0 && (
            <div>
              <Label>Empresa (cabeçalho/rodapé)</Label>
              <Select value={pdfCompanyId || companies[0]?.id} onValueChange={setPdfCompanyId}>
                <SelectTrigger className="w-[260px] mt-1">
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{formatCompanyLabel(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Ano</Label>
            <Input
              type="number"
              min={2020}
              max={2100}
              value={pdfYear}
              onChange={(e) => setPdfYear(Number(e.target.value) || new Date().getFullYear())}
              className="w-24 mt-1"
            />
          </div>
          <div>
            <Label>Mês</Label>
            <Select value={String(pdfMonth)} onValueChange={(v) => setPdfMonth(Number(v))}>
              <SelectTrigger className="w-[140px] mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleDownloadBlankPdf} disabled={pdfLoading}>
            <Download className={`mr-2 h-4 w-4 ${pdfLoading ? 'animate-pulse' : ''}`} />
            {pdfLoading ? 'Gerando…' : 'Baixar PDF'}
          </Button>
        </CardContent>
      </Card>

      <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Lançamento Manual de Folha de Ponto
        </CardTitle>
        <CardDescription>
          {is12x36
            ? 'Escala 12x36: informe apenas entrada e saída nos dias trabalhados (sem intervalo). Horas acima da carga diária são extras.'
            : 'Preencha os horários de entrada, intervalo e saída por dia. As horas extras são calculadas automaticamente.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cabeçalho: Empresa e Período */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Empresa
            </Label>
            {companies.length > 0 ? (
              <Select value={formCompanyId || companies[0]?.id} onValueChange={setFormCompanyId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {formatCompanyLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                className="mt-1"
                readOnly
                value=""
                placeholder="Carregando empresas… (ou sem permissão para listar)"
              />
            )}
          </div>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Período
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
                <span className="self-center text-muted-foreground">a</span>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Colaborador: Nome, Função, Setor */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Nome
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1">
              Digite pelo menos {MIN_EMPLOYEE_SEARCH_CHARS} caracteres do nome, matrícula ou CPF para buscar.
            </p>
            <Popover
              open={employeePickerOpen}
              onOpenChange={(open) => {
                setEmployeePickerOpen(open);
                if (!open) setEmployeeSearchQuery('');
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={employeePickerOpen}
                  disabled={employees.length === 0}
                  className="w-full justify-between font-normal"
                >
                  <span className={cn('truncate text-left', !selectedEmployee && 'text-muted-foreground')}>
                    {selectedEmployee?.name ?? 'Selecione o colaborador'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={`Mín. ${MIN_EMPLOYEE_SEARCH_CHARS} caracteres (nome, matrícula ou CPF)...`}
                    value={employeeSearchQuery}
                    onValueChange={setEmployeeSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {employeeSearchQuery.trim().length < MIN_EMPLOYEE_SEARCH_CHARS
                        ? `Digite pelo menos ${MIN_EMPLOYEE_SEARCH_CHARS} caracteres para exibir os registros.`
                        : 'Nenhum colaborador encontrado.'}
                    </CommandEmpty>
                    <CommandGroup>
                      {filteredEmployeesForPicker.map((emp) => {
                        const doc = emp.cpf || emp.document || '';
                        return (
                          <CommandItem
                            key={emp.id}
                            value={emp.id}
                            onSelect={() => handleSelectEmployee(emp.id)}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4 shrink-0',
                                selectedEmployeeId === emp.id ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            <div className="flex flex-col min-w-0 text-left">
                              <span className="font-medium truncate">{emp.name}</span>
                              {(emp.registrationNumber || doc) && (
                                <span className="text-xs text-muted-foreground">
                                  {emp.registrationNumber ? `Matr.: ${emp.registrationNumber}` : ''}
                                  {emp.registrationNumber && doc ? ' · ' : ''}
                                  {doc ? `CPF: ${formatCPF(doc)}` : ''}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Função
            </Label>
            <Input
              readOnly
              value={employeeDetail?.funcao ?? '—'}
              className="bg-muted"
            />
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Setor
            </Label>
            <Input
              readOnly
              value={employeeDetail?.setor ?? '—'}
              className="bg-muted"
            />
          </div>
        </div>

        {/* Carga horária normal (horas/dia) */}
        <div className="flex flex-wrap items-center gap-4">
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Carga horária normal (horas por dia)
          </Label>
          <Input
            type="number"
            min={1}
            max={12}
            step={0.5}
            value={cargaHorariaNormal}
            onChange={(e) => {
              setCargaHorariaNormal(Math.max(0, Math.min(12, parseFloat(e.target.value) || 8)));
              scheduleAutoSaveAllWithTimes();
            }}
            className="w-24"
          />
          <span className="text-muted-foreground text-sm">horas</span>
          {is12x36 && (
            <span className="text-xs text-muted-foreground">(padrão 12h na escala 12x36)</span>
          )}
        </div>

        {/* Salvar lançamento + status automático */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-4 py-3">
          <div className="text-sm text-muted-foreground space-y-0.5">
            <p>
              Os horários são salvos automaticamente após cada alteração (cerca de 1 segundo).
            </p>
            {(autoSaving || savingAll) && (
              <p className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Salvando…
              </p>
            )}
            {!autoSaving && !savingAll && lastAutoSavedAt && (
              <p className="text-emerald-600 dark:text-emerald-400">
                Último salvamento automático:{' '}
                {lastAutoSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            )}
          </div>
          <Button
            type="button"
            onClick={() => void saveAllRows()}
            disabled={savingAll || autoSaving || !selectedEmployeeId || rows.length === 0}
            className="shrink-0"
          >
            {savingAll ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar lançamento
          </Button>
        </div>

        {/* Tabela de dias */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px]">DIA</TableHead>
                <TableHead className="w-[90px]">ENTRADA</TableHead>
                {!is12x36 && (
                  <>
                    <TableHead className="w-[90px]">INTERVALO (entrada)</TableHead>
                    <TableHead className="w-[90px]">INTERVALO (saída)</TableHead>
                  </>
                )}
                <TableHead className="w-[90px]">SAÍDA</TableHead>
                <TableHead className="w-[95px]">Total (dia)</TableHead>
                <TableHead className="w-[95px]">HORAS EXTRAS</TableHead>
                <TableHead className="w-[95px]">Adic. noturno</TableHead>
                <TableHead className="w-[80px] text-center">Assinatura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingRecords ? (
                <TableRow>
                  <TableCell colSpan={is12x36 ? 7 : 9} className="text-center text-muted-foreground py-8">
                    Carregando registros do banco...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={is12x36 ? 7 : 9} className="text-center text-muted-foreground py-8">
                    Defina o período (data início e fim) para gerar os dias.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, idx) => {
                  const isRestDay =
                    is12x36 && hireDateAnchor != null && !isWorkDayIn12x36(row.date, hireDateAnchor);
                  return (
                  <TableRow
                    key={`${formatDateKey(row.date)}-${idx}`}
                    className={cn(isRestDay && 'bg-muted/40 opacity-80')}
                  >
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-0.5">
                        <span>{row.dayLabel} {row.weekdayLabel}</span>
                        {isRestDay && (
                          <Badge variant="outline" className="w-fit text-[10px] px-1.5 py-0">
                            Folga
                          </Badge>
                        )}
                        {rowSaveStatus[idx] === 'saved' && (
                          <span className="text-[10px] text-emerald-600">salvo</span>
                        )}
                        {rowSaveStatus[idx] === 'error' && (
                          <span className="text-[10px] text-destructive">erro ao salvar</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={row.entrada}
                        onChange={(e) => updateRow(idx, 'entrada', e.target.value)}
                        onBlur={() => flushRowSave(idx)}
                        className="h-8"
                        disabled={!selectedEmployeeId}
                      />
                    </TableCell>
                    {!is12x36 && (
                      <>
                        <TableCell>
                          <Input
                            type="time"
                            value={row.intervaloEntrada}
                            onChange={(e) => updateRow(idx, 'intervaloEntrada', e.target.value)}
                            onBlur={() => flushRowSave(idx)}
                            className="h-8"
                            disabled={!selectedEmployeeId}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="time"
                            value={row.intervaloSaida}
                            onChange={(e) => updateRow(idx, 'intervaloSaida', e.target.value)}
                            onBlur={() => flushRowSave(idx)}
                            className="h-8"
                            disabled={!selectedEmployeeId}
                          />
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <Input
                        type="time"
                        value={row.saida}
                        onChange={(e) => updateRow(idx, 'saida', e.target.value)}
                        onBlur={() => flushRowSave(idx)}
                        className="h-8"
                        disabled={!selectedEmployeeId}
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {dailyCalculations[idx]?.worked
                        ? formatHoursMinutes(dailyCalculations[idx].worked)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {dailyCalculations[idx]?.overtime
                        ? formatHoursMinutes(dailyCalculations[idx].overtime)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-sky-600">
                      {dailyCalculations[idx]?.night
                        ? formatHoursMinutes(dailyCalculations[idx].night)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-xs">
                      —
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Resumo */}
        {rows.length > 0 && (
          <Card className="bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Resumo do período</CardTitle>
              <CardDescription>
                {startDate && endDate && (
                  <>Período de {formatDateBR(startDate)} a {formatDateBR(endDate)}</>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total horas trabalhadas</p>
                <p className="text-lg font-semibold">{formatHoursMinutes(totals.totalWorked)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total horas normais</p>
                <p className="text-lg font-semibold">{formatHoursMinutes(totals.totalNormal)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total horas extras</p>
                <p className="text-lg font-semibold text-amber-500">{formatHoursMinutes(totals.totalOvertime)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total adicional noturno (22h–05h)</p>
                <p className="text-lg font-semibold text-sky-600">{formatHoursMinutes(totals.totalNight)}</p>
              </div>
              {!is12x36 && (
                <div>
                  <p className="text-sm text-muted-foreground">Total intervalo</p>
                  <p className="text-lg font-semibold">{formatHoursMinutes(totals.totalInterval)}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">
                  Total horas pagas (c/ adicional noturno 20%)
                </p>
                <p className="text-lg font-semibold text-emerald-500">
                  {formatHoursMinutes(totals.totalPaid)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
      </Card>
    </div>
  );
};

export default LancamentoManualFolhaPonto;
