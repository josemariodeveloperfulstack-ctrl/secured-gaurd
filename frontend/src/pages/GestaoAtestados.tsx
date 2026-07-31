import React, { useEffect, useMemo, useState } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Trash2,
  Upload,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EmployeeCombobox } from '@/components/ui/employee-combobox';
import { SimpleEmployee } from '@/services/employeeService';
import {
  MEDICAL_TYPE_LABELS,
  MedicalDocument,
  MedicalDocumentType,
  MedicalDashboard,
  CidSuggestion,
  medicalDocumentService,
} from '@/services/medicalDocumentService';
import { formatAdmissionDateBr, todayIsoDateLocal } from '@/utils/employeeAdmissionDate';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

type SortKey = 'employeeName' | 'documentType' | 'startDate' | 'days' | 'cidCode' | 'createdAt';

function calcEndFromDays(start: string, days: number): string {
  const d = new Date(`${start}T12:00:00`);
  d.setDate(d.getDate() + Math.max(1, days) - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function calcDaysFromRange(start: string, end: string): number {
  const s = new Date(`${start}T12:00:00`).getTime();
  const e = new Date(`${end}T12:00:00`).getTime();
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}

const emptyForm = () => ({
  employeeId: '',
  documentType: 'ATESTADO' as MedicalDocumentType,
  startDate: todayIsoDateLocal(),
  endDate: '',
  days: '1',
  hours: '',
  cidCode: '',
  cidDescription: '',
  specialty: '',
  crm: '',
  doctorName: '',
  documentUrl: '',
  observations: '',
});

const SORT_API_FIELD: Record<SortKey, string> = {
  employeeName: 'employee.name',
  documentType: 'documentType',
  startDate: 'startDate',
  days: 'days',
  cidCode: 'cidCode',
  createdAt: 'createdAt',
};

const GestaoAtestados: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<MedicalDocument[]>([]);
  const [dashboard, setDashboard] = useState<MedicalDashboard | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MedicalDocument | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [selectedEmployee, setSelectedEmployee] = useState<SimpleEmployee | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cidLookingUp, setCidLookingUp] = useState(false);
  const [cidSuggestions, setCidSuggestions] = useState<CidSuggestion[]>([]);
  const [cidMenuOpen, setCidMenuOpen] = useState(false);
  const [cidSelected, setCidSelected] = useState(false);
  const debouncedCid = useDebounce(form.cidCode, 400);

  const load = async () => {
    setLoading(true);
    try {
      const sort = `${SORT_API_FIELD[sortKey]},${sortDir}`;
      const [page, dash] = await Promise.all([
        medicalDocumentService.search({
          search: search || undefined,
          type: typeFilter !== 'ALL' ? (typeFilter as MedicalDocumentType) : undefined,
          from: from || undefined,
          to: to || undefined,
          size: 100,
          sort,
        }),
        medicalDocumentService.dashboard(from || undefined, to || undefined),
      ]);
      setItems(page.content || []);
      setDashboard(dash);
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar',
        description: err.response?.data?.message || 'Falha ao buscar atestados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortKey, sortDir]);

  useEffect(() => {
    const cid = debouncedCid.trim();
    if (!modalOpen || cidSelected || cid.length < 3) {
      if (cid.length < 3) {
        setCidSuggestions([]);
        setCidMenuOpen(false);
      }
      return;
    }
    if (editing && (editing.cidCode || '').toUpperCase().replace(/\s/g, '') === cid.toUpperCase().replace(/\s/g, '') && form.cidDescription) {
      return;
    }
    let cancelled = false;
    setCidLookingUp(true);
    medicalDocumentService
      .searchCid(cid)
      .then((list) => {
        if (cancelled) return;
        setCidSuggestions(list);
        setCidMenuOpen(list.length > 0);
        if (list.length === 1 && list[0].code.replace(/\s/g, '').toUpperCase() === cid.replace(/\s/g, '').toUpperCase()) {
          setForm((p) => {
            if (p.cidCode.trim().toUpperCase().replace(/\s/g, '') !== cid.toUpperCase().replace(/\s/g, '')) return p;
            if (p.cidDescription.trim()) return p;
            return { ...p, cidDescription: list[0].description || '' };
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCidSuggestions([]);
          setCidMenuOpen(false);
        }
      })
      .finally(() => {
        if (!cancelled) setCidLookingUp(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedCid, modalOpen, cidSelected]);

  const selectCidSuggestion = (item: CidSuggestion) => {
    setCidSelected(true);
    setCidMenuOpen(false);
    setCidSuggestions([]);
    setForm((p) => ({
      ...p,
      cidCode: item.code,
      cidDescription: item.description || '',
    }));
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'employeeName' || key === 'cidCode' || key === 'documentType' ? 'asc' : 'desc');
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  };

  const SortableHead = ({
    column,
    children,
    className,
  }: {
    column: SortKey;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => toggleSort(column)}
        className="inline-flex items-center gap-1.5 hover:text-white transition-colors font-medium"
        title="Clique para ordenar (asc/desc)"
      >
        {children}
        <SortIcon column={column} />
      </button>
    </TableHead>
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setSelectedEmployee(null);
    setCidSuggestions([]);
    setCidMenuOpen(false);
    setCidSelected(false);
    setModalOpen(true);
  };

  const openEdit = (doc: MedicalDocument) => {
    setEditing(doc);
    setForm({
      employeeId: doc.employeeId,
      documentType: doc.documentType,
      startDate: doc.startDate,
      endDate: doc.endDate || '',
      days: doc.days != null ? String(doc.days) : '',
      hours: doc.hours != null ? String(doc.hours) : '',
      cidCode: doc.cidCode || '',
      cidDescription: doc.cidDescription || '',
      specialty: doc.specialty || '',
      crm: doc.crm || '',
      doctorName: doc.doctorName || '',
      documentUrl: doc.documentUrl || '',
      observations: doc.observations || '',
    });
    setSelectedEmployee({
      id: doc.employeeId,
      name: doc.employeeName || '',
      departmentName: doc.employeeDepartment,
      positionName: doc.employeePosition,
    } as SimpleEmployee);
    setCidSuggestions([]);
    setCidMenuOpen(false);
    setCidSelected(true);
    setModalOpen(true);
  };

  const onStartOrDaysChange = (field: 'startDate' | 'endDate' | 'days', value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'startDate' || field === 'days') {
        const daysNum = parseInt(next.days || '0', 10);
        if (next.startDate && daysNum > 0) {
          next.endDate = calcEndFromDays(next.startDate, daysNum);
        }
      } else if (field === 'endDate' && next.startDate && value) {
        next.days = String(calcDaysFromRange(next.startDate, value));
      }
      return next;
    });
  };

  const handleUpload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await medicalDocumentService.uploadAttachment(file);
      setForm((p) => ({ ...p, documentUrl: uploaded.url }));
      toast({ title: 'Anexo enviado' });
    } catch (err: any) {
      toast({
        title: 'Erro no upload',
        description: err.response?.data?.message || 'Falha ao enviar arquivo',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.employeeId || !form.startDate) {
      toast({ title: 'Preencha funcionário e data inicial', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        employeeId: form.employeeId,
        documentType: form.documentType,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        days: form.days ? parseInt(form.days, 10) : undefined,
        hours: form.hours ? Number(form.hours) : undefined,
        cidCode: form.cidCode || undefined,
        cidDescription: form.cidDescription || undefined,
        specialty: form.specialty || undefined,
        crm: form.crm || undefined,
        doctorName: form.doctorName || undefined,
        documentUrl: form.documentUrl || undefined,
        observations: form.observations || undefined,
      };
      if (editing) {
        await medicalDocumentService.update(editing.id, payload);
        toast({ title: 'Documento atualizado' });
      } else {
        await medicalDocumentService.create(payload);
        toast({ title: 'Lançamento criado' });
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.response?.data?.message || 'Falha ao salvar documento',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Cancelar este documento?')) return;
    try {
      await medicalDocumentService.remove(id);
      toast({ title: 'Documento cancelado' });
      await load();
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.response?.data?.message || 'Falha ao cancelar',
        variant: 'destructive',
      });
    }
  };

  const sortedItems = useMemo(() => {
    const list = [...items];
    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const av = (() => {
        switch (sortKey) {
          case 'employeeName':
            return (a.employeeName || '').toLocaleLowerCase('pt-BR');
          case 'documentType':
            return (MEDICAL_TYPE_LABELS[a.documentType] || a.documentType || '').toLocaleLowerCase('pt-BR');
          case 'startDate':
            return a.startDate || '';
          case 'days':
            return a.days ?? -1;
          case 'cidCode':
            return (a.cidCode || '').toLocaleLowerCase('pt-BR');
          case 'createdAt':
            return a.createdAt || '';
          default:
            return '';
        }
      })();
      const bv = (() => {
        switch (sortKey) {
          case 'employeeName':
            return (b.employeeName || '').toLocaleLowerCase('pt-BR');
          case 'documentType':
            return (MEDICAL_TYPE_LABELS[b.documentType] || b.documentType || '').toLocaleLowerCase('pt-BR');
          case 'startDate':
            return b.startDate || '';
          case 'days':
            return b.days ?? -1;
          case 'cidCode':
            return (b.cidCode || '').toLocaleLowerCase('pt-BR');
          case 'createdAt':
            return b.createdAt || '';
          default:
            return '';
        }
      })();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return list;
  }, [items, sortKey, sortDir]);

  const kpis = useMemo(() => dashboard, [dashboard]);

  return (
    <StandardLayout title="Gestão de Atestados">
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Stethoscope className="h-6 w-6 text-seguranca-red" />
              Gestão de Atestados
            </h1>
            <p className="text-sm text-muted-foreground">
              Atestados, declarações, CID, dias/horas de ausência e alerta INSS (15 dias / 60 dias).
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button onClick={openCreate} className="bg-seguranca-red hover:bg-seguranca-red/90">
              <Plus className="h-4 w-4 mr-2" />
              Novo lançamento
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total', value: kpis?.total ?? 0 },
            { label: 'Atestados', value: kpis?.atestados ?? 0 },
            { label: 'Declarações', value: kpis?.declaracoes ?? 0 },
            { label: 'Dias afastados', value: kpis?.diasAfastados ?? 0 },
            { label: 'Horas', value: kpis?.horasAusentes ?? 0 },
            { label: 'Alertas INSS', value: kpis?.alertasInss ?? 0 },
          ].map((kpi) => (
            <Card key={kpi.label} className="bg-seguranca-graphite/60 border-gray-700">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs text-muted-foreground font-medium">{kpi.label}</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-2xl font-bold text-white">{kpi.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {kpis?.cidMaisRecorrente && (
          <p className="text-xs text-muted-foreground">
            CID mais recorrente no período:{' '}
            <span className="text-white font-semibold">{kpis.cidMaisRecorrente}</span>
          </p>
        )}

        <Card className="bg-seguranca-graphite/40 border-gray-700">
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar funcionário, CID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os tipos</SelectItem>
                {Object.entries(MEDICAL_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <div className="flex gap-2">
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              <Button onClick={() => void load()}>Filtrar</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-graphite/40 border-gray-700">
          <CardContent className="pt-4 overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead column="employeeName">Funcionário</SortableHead>
                    <SortableHead column="documentType">Tipo</SortableHead>
                    <SortableHead column="startDate">Período</SortableHead>
                    <SortableHead column="createdAt">Cadastro</SortableHead>
                    <SortableHead column="days">Dias/Horas</SortableHead>
                    <SortableHead column="cidCode">CID</SortableHead>
                    <TableHead>INSS</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Nenhum documento encontrado no período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedItems.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="font-medium">{doc.employeeName}</div>
                          <div className="text-xs text-muted-foreground">
                            {[doc.employeePosition, doc.employeeDepartment].filter(Boolean).join(' · ') || '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{MEDICAL_TYPE_LABELS[doc.documentType]}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatAdmissionDateBr(doc.startDate)}
                          {doc.endDate ? ` → ${formatAdmissionDateBr(doc.endDate)}` : ''}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {doc.createdAt ? formatAdmissionDateBr(doc.createdAt.slice(0, 10)) : '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {doc.days != null ? `${doc.days}d` : '-'}
                          {doc.hours != null ? ` / ${doc.hours}h` : ''}
                        </TableCell>
                        <TableCell className="text-sm">
                          {doc.cidCode || '-'}
                          {doc.cidDescription ? (
                            <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                              {doc.cidDescription}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {doc.inssAlert ? (
                            <Badge className="bg-amber-600/80">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {doc.relatedDaysInWindow || ''}d
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(doc)}>
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400"
                            onClick={() => void handleDelete(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-seguranca-graphite border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {editing ? 'Editar documento médico' : 'Novo lançamento'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Informe o funcionário, período e CID. A descrição do CID é preenchida automaticamente quando disponível.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <div className="md:col-span-2 space-y-2">
                <Label>Funcionário *</Label>
                <EmployeeCombobox
                  value={form.employeeId}
                  onChange={(value) => {
                    setForm((p) => ({ ...p, employeeId: value }));
                    if (!value) setSelectedEmployee(null);
                  }}
                  onEmployeeSelect={(emp) => setSelectedEmployee(emp)}
                  placeholder="Selecione o funcionário"
                  initialDisplayName={selectedEmployee?.name || editing?.employeeName}
                />
                {selectedEmployee && (selectedEmployee.departmentName || selectedEmployee.positionName) && (
                  <div className="rounded-md border border-gray-600 bg-seguranca-black/40 px-3 py-2 text-sm">
                    <div className="text-muted-foreground text-xs mb-1">Dados do colaborador</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground">Setor: </span>
                        <span className="text-white font-medium">
                          {selectedEmployee.departmentName || selectedEmployee.unitName || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cargo: </span>
                        <span className="text-white font-medium">{selectedEmployee.positionName || '—'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={form.documentType}
                  onValueChange={(v) => setForm((p) => ({ ...p, documentType: v as MedicalDocumentType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MEDICAL_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data inicial *</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => onStartOrDaysChange('startDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Quantidade de dias</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.days}
                  onChange={(e) => onStartOrDaysChange('days', e.target.value)}
                  placeholder="Ex.: 3"
                />
              </div>

              <div className="space-y-2">
                <Label>Data final</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => onStartOrDaysChange('endDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Horas ausentes (posto)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min={0}
                  value={form.hours}
                  onChange={(e) => setForm((p) => ({ ...p, hours: e.target.value }))}
                  placeholder="Ex.: 4"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>CID</Label>
                <div className="relative">
                  <Input
                    value={form.cidCode}
                    onChange={(e) => {
                      setCidSelected(false);
                      setForm((p) => ({
                        ...p,
                        cidCode: e.target.value.toUpperCase(),
                        cidDescription: '',
                      }));
                    }}
                    onFocus={() => {
                      if (cidSuggestions.length > 0) setCidMenuOpen(true);
                    }}
                    onBlur={() => {
                      window.setTimeout(() => setCidMenuOpen(false), 150);
                    }}
                    placeholder="Digite 3+ caracteres (ex.: J06 ou febre)"
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={cidMenuOpen}
                  />
                  {cidLookingUp && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {cidMenuOpen && cidSuggestions.length > 0 && (
                    <ul
                      className={cn(
                        'absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md',
                        'text-sm'
                      )}
                      role="listbox"
                    >
                      {cidSuggestions.map((item) => (
                        <li key={`${item.source || 'CID'}-${item.code}`}>
                          <button
                            type="button"
                            className="flex w-full flex-col items-start gap-0.5 rounded-sm px-2 py-1.5 text-left hover:bg-accent"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectCidSuggestion(item)}
                          >
                            <span className="font-medium">
                              {item.code}
                              {item.source ? (
                                <span className="ml-2 text-xs font-normal text-muted-foreground">
                                  {item.source === 'CID11' ? 'CID-11' : 'CID-10'}
                                </span>
                              ) : null}
                            </span>
                            <span className="line-clamp-2 text-xs text-muted-foreground">
                              {item.description}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Digite código ou descrição (mín. 3 caracteres) para buscar o CID.
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Descrição do CID</Label>
                <Input
                  value={form.cidDescription}
                  onChange={(e) => setForm((p) => ({ ...p, cidDescription: e.target.value }))}
                  placeholder="Preenchida ao selecionar o CID"
                />
              </div>

              <div className="space-y-2">
                <Label>Especialidade</Label>
                <Input
                  value={form.specialty}
                  onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>CRM</Label>
                <Input value={form.crm} onChange={(e) => setForm((p) => ({ ...p, crm: e.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Médico</Label>
                <Input
                  value={form.doctorName}
                  onChange={(e) => setForm((p) => ({ ...p, doctorName: e.target.value }))}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Anexo (PDF/imagem)</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => void handleUpload(e.target.files?.[0])}
                    disabled={uploading}
                  />
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {form.documentUrl && (
                    <a
                      href={form.documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-seguranca-yellow underline flex items-center gap-1"
                    >
                      <Upload className="h-3 w-3" /> Ver
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Observações</Label>
                <Textarea
                  value={form.observations}
                  onChange={(e) => setForm((p) => ({ ...p, observations: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving} className="bg-seguranca-red">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </StandardLayout>
  );
};

export default GestaoAtestados;
