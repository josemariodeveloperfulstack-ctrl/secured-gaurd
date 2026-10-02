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
  AlertOctagon,
  ShieldAlert,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Trash2,
  Upload,
  BarChart2,
  Printer,
  Download,
  Building2,
  Users,
  Eye,
  ChevronDown,
  ChevronUp,
  Briefcase,
  MapPin,
  Clock,
  User,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { exportAtestadosToPdf, exportAtestadosToExcel } from '@/utils/atestadosReportGenerator';
import { useToast } from '@/hooks/use-toast';
import { EmployeeCombobox } from '@/components/ui/employee-combobox';
import { SimpleEmployee } from '@/services/employeeService';
import departmentService, { Department } from '@/services/departmentService';
import {
  MEDICAL_FORM_TYPES,
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

// ────────────────────────────────────────
// Dados do colaborador/empresa/setor para o modal
// ────────────────────────────────────────
interface EmployeeInfo {
  companyName?: string;
  companySigla?: string;
  departmentName?: string;
  positionName?: string;
  unitName?: string;
}

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

  // Estados para relatórios e setores
  const [departments, setDepartments] = useState<Department[]>([]);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportSector, setReportSector] = useState('ALL');
  const [reportEmployeeId, setReportEmployeeId] = useState('ALL');
  const [reportType, setReportType] = useState('ALL');

  // Estados para visualizar atestado
  const [viewDoc, setViewDoc] = useState<MedicalDocument | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  // Estados para expandir/recolher alertas
  const [alertsExpanded, setAlertsExpanded] = useState(false);

  // Info do empregado para o formulário (empresa/setor)
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo>({});

  useEffect(() => {
    departmentService.listActive().then(setDepartments).catch(() => []);
  }, []);

  // Mapeamento total de atestados entregues por funcionário
  const employeeCertificateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      if (item.employeeId) {
        counts[item.employeeId] = (counts[item.employeeId] || 0) + 1;
      }
    });
    return counts;
  }, [items]);

  // Agrupamento por funcionário para Alertas CLT / INSS (15 dias de atestado)
  const inssAlertSummary = useMemo(() => {
    const map: Record<string, {
      employeeId: string;
      employeeName: string;
      employeePosition?: string;
      employeeDepartment?: string;
      companyName?: string;
      totalDays: number;
      totalCount: number;
      documents: MedicalDocument[];
    }> = {};

    items.forEach((item) => {
      if (!item.employeeId) return;
      if (!map[item.employeeId]) {
        map[item.employeeId] = {
          employeeId: item.employeeId,
          employeeName: item.employeeName || 'Colaborador',
          employeePosition: item.employeePosition,
          employeeDepartment: item.employeeDepartment,
          companyName: item.companyName,
          totalDays: 0,
          totalCount: 0,
          documents: []
        };
      }
      if (item.documentType !== 'DECLARACAO_COMPARECIMENTO' && item.documentType !== 'DECLARACAO_MEDICA') {
        map[item.employeeId].totalDays += item.days || 0;
      }
      map[item.employeeId].totalCount += 1;
      map[item.employeeId].documents.push(item);
    });

    const criticalINSS = Object.values(map).filter(e => e.totalDays >= 15);
    const warningINSS = Object.values(map).filter(e => e.totalDays >= 12 && e.totalDays < 15);

    return { criticalINSS, warningINSS, map };
  }, [items]);

  // Relatório filtrado e métricas
  const reportFilteredItems = useMemo(() => {
    return items.filter((doc) => {
      if (reportFrom && doc.startDate && doc.startDate < reportFrom) return false;
      if (reportTo && doc.startDate && doc.startDate > reportTo) return false;
      if (reportSector !== 'ALL' && doc.employeeDepartment !== reportSector) return false;
      if (reportType !== 'ALL' && doc.documentType !== reportType) return false;
      return true;
    });
  }, [items, reportFrom, reportTo, reportSector, reportType]);

  const reportTotals = useMemo(() => {
    const totalDocs = reportFilteredItems.length;
    const totalDays = reportFilteredItems.reduce((acc, doc) => acc + (doc.days || 0), 0);
    const uniqueEmployees = new Set(reportFilteredItems.map((doc) => doc.employeeId).filter(Boolean)).size;
    return { totalDocs, totalDays, uniqueEmployees };
  }, [reportFilteredItems]);

  const handleExportExcelReport = () => {
    if (reportFilteredItems.length === 0) {
      toast({ title: 'Atenção', description: 'Nenhum atestado para exportar.', variant: 'destructive' });
      return;
    }
    try {
      exportAtestadosToExcel(
        reportFilteredItems,
        {
          totalDocs: reportTotals.totalDocs,
          totalDays: reportTotals.totalDays,
          totalHours: reportFilteredItems.reduce((acc, d) => acc + (d.hours || 0), 0),
          uniqueEmployees: reportTotals.uniqueEmployees,
          inssAlertsCount: reportFilteredItems.filter(d => d.inssAlert || (d.days && d.days >= 15)).length,
        },
        {
          dateFrom: reportFrom || undefined,
          dateTo: reportTo || undefined,
          sector: reportSector !== 'ALL' ? reportSector : undefined,
          documentType: reportType !== 'ALL' ? reportType : undefined,
        }
      );
      toast({ title: 'Sucesso', description: 'Planilha Excel profissional (.xlsx) gerada com sucesso!' });
    } catch (err) {
      console.error('Erro ao gerar Excel:', err);
      toast({ title: 'Erro', description: 'Falha ao gerar o arquivo Excel.', variant: 'destructive' });
    }
  };

  const handlePrintPdfReport = () => {
    if (reportFilteredItems.length === 0) {
      toast({ title: 'Atenção', description: 'Nenhum atestado para gerar relatório PDF.', variant: 'destructive' });
      return;
    }
    try {
      exportAtestadosToPdf(
        reportFilteredItems,
        {
          totalDocs: reportTotals.totalDocs,
          totalDays: reportTotals.totalDays,
          totalHours: reportFilteredItems.reduce((acc, d) => acc + (d.hours || 0), 0),
          uniqueEmployees: reportTotals.uniqueEmployees,
          inssAlertsCount: reportFilteredItems.filter(d => d.inssAlert || (d.days && d.days >= 15)).length,
        },
        {
          dateFrom: reportFrom || undefined,
          dateTo: reportTo || undefined,
          sector: reportSector !== 'ALL' ? reportSector : undefined,
          documentType: reportType !== 'ALL' ? reportType : undefined,
        }
      );
      toast({ title: 'Sucesso', description: 'Relatório PDF executivo gerado com sucesso!' });
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      toast({ title: 'Erro', description: 'Falha ao gerar o relatório PDF.', variant: 'destructive' });
    }
  };


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

  const renderTypeBadge = (type: MedicalDocumentType | string) => {
    const label = MEDICAL_TYPE_LABELS[type as MedicalDocumentType] || type;
    switch (type) {
      case 'ATESTADO':
      case 'ATESTADO_MEDICO':
      case 'ATESTADO_ODONTOLOGICO':
      case 'ATESTADO_AFASTAMENTO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30 whitespace-nowrap shadow-sm">
            <Stethoscope className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            {label}
          </span>
        );
      case 'DECLARACAO':
      case 'DECLARACAO_COMPARECIMENTO':
      case 'DECLARACAO_HORAS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 whitespace-nowrap shadow-sm">
            <Clock className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            {label}
          </span>
        );
      case 'LICENCA_MATERNIDADE':
      case 'LICENCA_PATERNIDADE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-pink-500/15 text-pink-300 border border-pink-500/30 whitespace-nowrap shadow-sm">
            <Users className="h-3.5 w-3.5 text-pink-400 shrink-0" />
            {label}
          </span>
        );
      case 'ACIDENTE_TRABALHO':
      case 'CAT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30 whitespace-nowrap shadow-sm">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
            {label}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-500/15 text-slate-300 border border-slate-500/30 whitespace-nowrap shadow-sm">
            <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            {label}
          </span>
        );
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setSelectedEmployee(null);
    setEmployeeInfo({});
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
    setEmployeeInfo({
      companyName: doc.companyName,
      departmentName: doc.employeeDepartment,
      positionName: doc.employeePosition,
    });
    setCidSuggestions([]);
    setCidMenuOpen(false);
    setCidSelected(true);
    setModalOpen(true);
  };

  const openView = (doc: MedicalDocument) => {
    setViewDoc(doc);
    setViewModalOpen(true);
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

  // Alertas para o modal de visualização do funcionário
  const getEmployeeAlert = (employeeId: string) => {
    return inssAlertSummary.map[employeeId] || null;
  };

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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading} size="sm">
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              variant="outline"
              onClick={() => setReportModalOpen(true)}
              className="border-emerald-600/50 text-emerald-400 hover:bg-emerald-950/40"
              size="sm"
            >
              <BarChart2 className="h-4 w-4 mr-1.5 text-emerald-400" />
              Relatórios
            </Button>
            <Button onClick={openCreate} className="bg-seguranca-red hover:bg-seguranca-red/90" size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Novo lançamento
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total', value: kpis?.total ?? 0, color: 'text-white' },
            { label: 'Atestados', value: kpis?.atestados ?? 0, color: 'text-blue-400' },
            { label: 'Declarações', value: kpis?.declaracoes ?? 0, color: 'text-cyan-400' },
            { label: 'Dias afastados', value: kpis?.diasAfastados ?? 0, color: 'text-amber-400' },
            { label: 'Horas', value: kpis?.horasAusentes ?? 0, color: 'text-emerald-400' },
            { label: 'Alertas INSS', value: kpis?.alertasInss ?? 0, color: 'text-red-400' },
          ].map((kpi) => (
            <Card key={kpi.label} className="bg-seguranca-graphite/60 border-gray-700/60 hover:border-gray-600 transition-colors">
              <CardHeader className="pb-1.5 pt-3 px-3">
                <CardTitle className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{kpi.label}</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
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

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* Banner de Alertas CLT / INSS — Expandível                        */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {(inssAlertSummary.criticalINSS.length > 0 || inssAlertSummary.warningINSS.length > 0) && (
          <Card className="bg-gradient-to-br from-red-950/60 via-amber-950/30 to-seguranca-graphite/80 border-red-700/50 shadow-xl overflow-hidden">
            <CardHeader className="pb-0">
              <button
                type="button"
                onClick={() => setAlertsExpanded(!alertsExpanded)}
                className="w-full"
              >
                <CardTitle className="text-base font-bold text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-red-600/30 rounded-lg text-red-400">
                      <AlertOctagon className="h-5 w-5 animate-pulse" />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm sm:text-base">Alertas de Afastamento CLT & Encaminhamento INSS</span>
                      <span className="block text-[11px] text-gray-400 font-normal mt-0.5">Lei 8.213/91 — Clique para {alertsExpanded ? 'recolher' : 'expandir'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {inssAlertSummary.criticalINSS.length > 0 && (
                      <Badge variant="destructive" className="bg-red-600 font-bold px-2.5 py-1 text-xs">
                        🚨 {inssAlertSummary.criticalINSS.length} INSS (15+ dias)
                      </Badge>
                    )}
                    {inssAlertSummary.warningINSS.length > 0 && (
                      <Badge className="bg-amber-600 text-white font-bold px-2.5 py-1 text-xs">
                        ⚠️ {inssAlertSummary.warningINSS.length} Próximo (12-14d)
                      </Badge>
                    )}
                    {alertsExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />
                    )}
                  </div>
                </CardTitle>
              </button>
            </CardHeader>

            {alertsExpanded && (
              <CardContent className="space-y-3 pt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <p className="text-xs text-gray-300 bg-black/20 rounded-md px-3 py-2">
                  De acordo com a <strong>CLT (Art. 476)</strong> e a <strong>Lei nº 8.213/91 (Art. 60)</strong>, a empresa arca com os primeiros 15 dias de afastamento. Ao atingir ou ultrapassar 15 dias de atestado, o funcionário deve ser encaminhado para <strong>Perícia Médica do INSS</strong>.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Funcionários Críticos (15+ dias) */}
                  {inssAlertSummary.criticalINSS.map((emp) => (
                    <div
                      key={emp.employeeId}
                      className="p-3 bg-red-950/50 border border-red-600/50 rounded-xl flex flex-col justify-between space-y-2.5 shadow-lg hover:border-red-500/60 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-bold text-red-100 text-sm flex items-center gap-1.5">
                            <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />
                            <span className="truncate">{emp.employeeName}</span>
                          </span>
                          <div className="text-[11px] text-red-300/70 mt-1 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="h-3 w-3 shrink-0" />
                              <span>{emp.employeePosition || 'Cargo não informado'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span>{emp.employeeDepartment || 'Setor não informado'}</span>
                            </div>
                            {emp.companyName && (
                              <div className="flex items-center gap-1.5">
                                <Building2 className="h-3 w-3 shrink-0" />
                                <span>{emp.companyName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge className="bg-red-600 text-white font-bold whitespace-nowrap text-xs shrink-0">
                          {emp.totalDays} dias
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-red-200/80 pt-2 border-t border-red-800/30">
                        <span>📋 <strong>{emp.totalCount} atestado(s)</strong> entregue(s)</span>
                        <span className="text-red-300 font-bold text-[10px]">🚨 Encaminhar para Perícia INSS</span>
                      </div>
                    </div>
                  ))}

                  {/* Funcionários em Alerta (12-14 dias) */}
                  {inssAlertSummary.warningINSS.map((emp) => (
                    <div
                      key={emp.employeeId}
                      className="p-3 bg-amber-950/40 border border-amber-600/40 rounded-xl flex flex-col justify-between space-y-2.5 shadow-lg hover:border-amber-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-bold text-amber-100 text-sm flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                            <span className="truncate">{emp.employeeName}</span>
                          </span>
                          <div className="text-[11px] text-amber-300/70 mt-1 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="h-3 w-3 shrink-0" />
                              <span>{emp.employeePosition || 'Cargo não informado'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span>{emp.employeeDepartment || 'Setor não informado'}</span>
                            </div>
                            {emp.companyName && (
                              <div className="flex items-center gap-1.5">
                                <Building2 className="h-3 w-3 shrink-0" />
                                <span>{emp.companyName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge className="bg-amber-600 text-white font-bold whitespace-nowrap text-xs shrink-0">
                          {emp.totalDays} dias
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-amber-200/80 pt-2 border-t border-amber-800/30">
                        <span>📋 <strong>{emp.totalCount} atestado(s)</strong> entregue(s)</span>
                        <span className="text-amber-300 font-bold text-[10px]">⚠️ Próximo ao limite CLT (15 dias)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Filtros */}
        <Card className="bg-seguranca-graphite/40 border-gray-700/50">
          <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div className="sm:col-span-2 relative">
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
                {MEDICAL_FORM_TYPES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
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

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* Tabela de Atestados — Desktop                                     */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <Card className="bg-seguranca-graphite/40 border-gray-700/50">
          <CardContent className="pt-4">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-700/60 bg-seguranca-black/30 shadow-inner">
                  <Table className="w-full min-w-[1100px]">
                    <TableHeader className="bg-seguranca-graphite/80 border-b border-gray-700/60">
                      <TableRow className="border-none hover:bg-transparent">
                        <SortableHead column="employeeName" className="w-[240px] pl-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                          Funcionário
                        </SortableHead>
                        <SortableHead column="documentType" className="w-[180px] py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                          Tipo
                        </SortableHead>
                        <SortableHead column="startDate" className="w-[200px] py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                          Período
                        </SortableHead>
                        <SortableHead column="createdAt" className="w-[110px] py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                          Cadastro
                        </SortableHead>
                        <SortableHead column="days" className="w-[110px] py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400 text-center">
                          Dias/Horas
                        </SortableHead>
                        <SortableHead column="cidCode" className="w-[160px] py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                          CID
                        </SortableHead>
                        <TableHead className="w-[160px] py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                          Empresa
                        </TableHead>
                        <TableHead className="w-[160px] py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400 text-center">
                          Alerta INSS / CLT
                        </TableHead>
                        <TableHead className="w-[120px] py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400 text-right pr-4">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <FileText className="h-8 w-8 text-gray-600" />
                              <span>Nenhum documento encontrado no período.</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedItems.map((doc) => {
                          const empData = doc.employeeId ? inssAlertSummary.map[doc.employeeId] : null;
                          const totalEmpDays = empData?.totalDays ?? doc.relatedDaysInWindow ?? doc.days ?? 0;
                          return (
                            <TableRow
                              key={doc.id}
                              className="border-b border-gray-800/80 hover:bg-white/[0.04] transition-colors group"
                            >
                              <TableCell className="pl-4 py-3.5 align-middle">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-8 w-8 rounded-full bg-seguranca-graphite/80 border border-seguranca-yellow/30 flex items-center justify-center text-seguranca-yellow shrink-0">
                                    <User className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div
                                      className="font-semibold text-sm text-white group-hover:text-seguranca-yellow transition-colors truncate max-w-[170px]"
                                      title={doc.employeeName}
                                    >
                                      {doc.employeeName}
                                    </div>
                                    <div
                                      className="text-[11px] text-gray-400 truncate max-w-[170px]"
                                      title={[doc.employeePosition, doc.employeeDepartment].filter(Boolean).join(' · ')}
                                    >
                                      {[doc.employeePosition, doc.employeeDepartment].filter(Boolean).join(' · ') || '—'}
                                    </div>
                                    {employeeCertificateCounts[doc.employeeId] ? (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 mt-0.5">
                                        {employeeCertificateCounts[doc.employeeId]} atestado(s)
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-3.5 align-middle">
                                {renderTypeBadge(doc.documentType)}
                              </TableCell>
                              <TableCell className="py-3.5 align-middle whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.03] border border-gray-700/50 text-xs text-gray-200 font-medium">
                                  <Calendar className="h-3.5 w-3.5 text-seguranca-yellow/80 shrink-0" />
                                  <span>{formatAdmissionDateBr(doc.startDate)}</span>
                                  {doc.endDate && (
                                    <>
                                      <span className="text-gray-500">→</span>
                                      <span>{formatAdmissionDateBr(doc.endDate)}</span>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-3.5 align-middle text-xs text-gray-400 whitespace-nowrap">
                                {doc.createdAt ? formatAdmissionDateBr(doc.createdAt.slice(0, 10)) : '—'}
                              </TableCell>
                              <TableCell className="py-3.5 align-middle text-center whitespace-nowrap">
                                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-seguranca-black/80 border border-gray-700 text-xs font-bold text-seguranca-yellow font-mono">
                                  {doc.days != null ? `${doc.days}d` : '-'}
                                  {doc.hours != null ? ` / ${doc.hours}h` : ''}
                                </span>
                              </TableCell>
                              <TableCell className="py-3.5 align-middle">
                                {doc.cidCode ? (
                                  <div className="space-y-0.5">
                                    <span className="inline-block px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                      {doc.cidCode}
                                    </span>
                                    {doc.cidDescription && (
                                      <div
                                        className="text-[11px] text-gray-400 truncate max-w-[150px]"
                                        title={doc.cidDescription}
                                      >
                                        {doc.cidDescription}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-500">—</span>
                                )}
                              </TableCell>
                              <TableCell className="py-3.5 align-middle">
                                {doc.companyName ? (
                                  <div className="flex items-center gap-1.5 text-xs text-gray-300">
                                    <Building2 className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                                    <span className="truncate max-w-[140px]" title={doc.companyName}>
                                      {doc.companyName}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-500">—</span>
                                )}
                              </TableCell>
                              <TableCell className="py-3.5 align-middle text-center whitespace-nowrap">
                                {totalEmpDays >= 15 ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm animate-pulse">
                                    <ShieldAlert className="h-3.5 w-3.5 text-red-400 shrink-0" />
                                    <span>15+ dias (INSS)</span>
                                  </span>
                                ) : totalEmpDays >= 12 ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                    <span>Alerta ({totalEmpDays}d)</span>
                                  </span>
                                ) : totalEmpDays > 0 ? (
                                  <span className="text-xs text-gray-400 font-medium">{totalEmpDays}d acum.</span>
                                ) : (
                                  <span className="text-xs text-gray-600">—</span>
                                )}
                              </TableCell>
                              <TableCell className="py-3.5 pr-4 align-middle text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0 border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors"
                                    onClick={() => openView(doc)}
                                    title="Visualizar detalhes do atestado"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0 border-blue-500/30 text-blue-400 bg-blue-500/5 hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
                                    onClick={() => openEdit(doc)}
                                    title="Editar lançamento de atestado"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
                                    onClick={() => void handleDelete(doc.id)}
                                    title="Cancelar atestado"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {sortedItems.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10 bg-seguranca-graphite/30 rounded-xl border border-gray-700/30">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                      <p className="text-sm">Nenhum documento encontrado no período.</p>
                    </div>
                  ) : (
                    sortedItems.map((doc) => {
                      const empData = doc.employeeId ? inssAlertSummary.map[doc.employeeId] : null;
                      const totalEmpDays = empData?.totalDays ?? doc.relatedDaysInWindow ?? doc.days ?? 0;
                      return (
                        <div
                          key={doc.id}
                          className="bg-seguranca-graphite/60 border border-gray-700/40 rounded-xl p-4 space-y-3 hover:border-gray-600/60 transition-colors shadow-sm"
                        >
                          {/* Header — Nome + Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-white text-sm truncate">{doc.employeeName}</h3>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {[doc.employeePosition, doc.employeeDepartment].filter(Boolean).join(' · ') || '—'}
                              </p>
                              {doc.companyName && (
                                <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                                  <Building2 className="h-3 w-3" /> {doc.companyName}
                                </p>
                              )}
                            </div>
                            <div className="shrink-0">
                              {renderTypeBadge(doc.documentType)}
                            </div>
                          </div>

                          {/* Dados */}
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-muted-foreground">Período:</span>
                              <div className="text-white font-medium">
                                {formatAdmissionDateBr(doc.startDate)}
                                {doc.endDate ? ` → ${formatAdmissionDateBr(doc.endDate)}` : ''}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Dias/Horas:</span>
                              <div className="text-seguranca-yellow font-bold font-mono">
                                {doc.days != null ? `${doc.days}d` : '-'}
                                {doc.hours != null ? ` / ${doc.hours}h` : ''}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">CID:</span>
                              <div className="text-white">
                                <span className="font-mono font-bold text-amber-300">{doc.cidCode || '-'}</span>
                                {doc.cidDescription ? (
                                  <span className="text-muted-foreground ml-1 text-[10px]">({doc.cidDescription})</span>
                                ) : null}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Cadastro:</span>
                              <div className="text-white">
                                {doc.createdAt ? formatAdmissionDateBr(doc.createdAt.slice(0, 10)) : '—'}
                              </div>
                            </div>
                          </div>

                          {/* Alerta + Ações */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-700/30">
                            <div>
                              {totalEmpDays >= 15 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                                  <ShieldAlert className="h-3 w-3" /> INSS (15+d)
                                </span>
                              ) : totalEmpDays >= 12 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  <AlertTriangle className="h-3 w-3" /> Alerta ({totalEmpDays}d)
                                </span>
                              ) : totalEmpDays > 0 ? (
                                <span className="text-[10px] text-muted-foreground">{totalEmpDays}d acum.</span>
                              ) : null}
                              {employeeCertificateCounts[doc.employeeId] && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 ml-1.5">
                                  {employeeCertificateCounts[doc.employeeId]} atestado(s)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0 border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/20"
                                onClick={() => openView(doc)}
                                title="Visualizar"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0 border-blue-500/30 text-blue-400 bg-blue-500/5 hover:bg-blue-500/20"
                                onClick={() => openEdit(doc)}
                                title="Editar"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                                onClick={() => void handleDelete(doc.id)}
                                title="Cancelar"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Rodapé com contagem */}
                {sortedItems.length > 0 && (
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-700/30">
                    <p className="text-xs text-muted-foreground">
                      {sortedItems.length} registro(s) encontrado(s)
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* Modal — Novo / Editar                                            */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
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
                    if (!value) {
                      setSelectedEmployee(null);
                      setEmployeeInfo({});
                    }
                  }}
                  onEmployeeSelect={(emp) => {
                    setSelectedEmployee(emp);
                    setEmployeeInfo({
                      companyName: emp.companyName || emp.companySigla,
                      companySigla: emp.companySigla,
                      departmentName: emp.departmentName,
                      positionName: emp.positionName,
                      unitName: emp.unitName,
                    });
                  }}
                  placeholder="Selecione o funcionário"
                  initialDisplayName={selectedEmployee?.name || editing?.employeeName}
                />
              </div>

              {/* Empresa / Setor / Cargo — Preenchimento automático */}
              {(selectedEmployee || editing) && (
                <div className="md:col-span-2">
                  <div className="rounded-lg border border-gray-600/60 bg-seguranca-black/40 px-4 py-3">
                    <div className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wider font-medium">Dados do colaborador</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Building2 className="h-3 w-3" /> Empresa
                        </div>
                        <div className="text-sm text-white font-medium">
                          {employeeInfo.companyName || employeeInfo.companySigla || '—'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <MapPin className="h-3 w-3" /> Setor de Trabalho
                        </div>
                        <div className="text-sm text-white font-medium">
                          {employeeInfo.departmentName || employeeInfo.unitName || '—'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Briefcase className="h-3 w-3" /> Cargo
                        </div>
                        <div className="text-sm text-white font-medium">
                          {employeeInfo.positionName || '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={form.documentType}
                  onValueChange={(v) => {
                    const newType = v as MedicalDocumentType;
                    const isDecl = newType === 'DECLARACAO_COMPARECIMENTO' || newType === 'DECLARACAO_MEDICA';
                    setForm((p) => ({
                      ...p,
                      documentType: newType,
                      days: isDecl ? '0' : (p.days === '0' ? '1' : p.days),
                      endDate: isDecl ? p.startDate : p.endDate
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDICAL_FORM_TYPES.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                    {form.documentType && !MEDICAL_FORM_TYPES.some(t => t.value === form.documentType) && (
                      <SelectItem key={form.documentType} value={form.documentType}>
                        {MEDICAL_TYPE_LABELS[form.documentType] || form.documentType}
                      </SelectItem>
                    )}
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

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* Modal — Visualizar Atestado                                      */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-seguranca-graphite border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-emerald-400" />
                Detalhes do Atestado
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Visualização completa do documento médico e alertas do funcionário.
              </DialogDescription>
            </DialogHeader>

            {viewDoc && (
              <div className="space-y-4 py-2">
                {/* Dados do Colaborador */}
                <div className="rounded-xl border border-gray-600/50 bg-seguranca-black/40 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <User className="h-4 w-4 text-blue-400" />
                    Dados do Colaborador
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Nome</div>
                      <div className="text-sm text-white font-medium">{viewDoc.employeeName || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">CPF</div>
                      <div className="text-sm text-white">{viewDoc.employeeCpf || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> Empresa
                      </div>
                      <div className="text-sm text-white font-medium">{viewDoc.companyName || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Setor de Trabalho
                      </div>
                      <div className="text-sm text-white font-medium">{viewDoc.employeeDepartment || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Briefcase className="h-3 w-3" /> Cargo / Função
                      </div>
                      <div className="text-sm text-white font-medium">{viewDoc.employeePosition || '—'}</div>
                    </div>
                  </div>
                </div>

                {/* Dados do Atestado */}
                <div className="rounded-xl border border-gray-600/50 bg-seguranca-black/40 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <FileText className="h-4 w-4 text-amber-400" />
                    Dados do Documento
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Tipo</div>
                      <div className="mt-1">{renderTypeBadge(viewDoc.documentType)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Período</div>
                      <div className="text-sm text-white">
                        {formatAdmissionDateBr(viewDoc.startDate)}
                        {viewDoc.endDate ? ` → ${formatAdmissionDateBr(viewDoc.endDate)}` : ''}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Dias</div>
                      <div className="text-sm text-white font-semibold">{viewDoc.days != null ? `${viewDoc.days} dia(s)` : '—'}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Horas</div>
                      <div className="text-sm text-white">{viewDoc.hours != null ? `${viewDoc.hours}h` : '—'}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">CID</div>
                      <div className="text-sm text-white">{viewDoc.cidCode || '—'}</div>
                      {viewDoc.cidDescription && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">{viewDoc.cidDescription}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Data de Cadastro</div>
                      <div className="text-sm text-white">
                        {viewDoc.createdAt ? formatAdmissionDateBr(viewDoc.createdAt.slice(0, 10)) : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Dados do médico */}
                  {(viewDoc.doctorName || viewDoc.crm || viewDoc.specialty) && (
                    <div className="pt-3 border-t border-gray-700/30">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Médico</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground text-[11px]">Nome: </span>
                          <span className="text-white">{viewDoc.doctorName || '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[11px]">CRM: </span>
                          <span className="text-white">{viewDoc.crm || '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[11px]">Especialidade: </span>
                          <span className="text-white">{viewDoc.specialty || '—'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Observações */}
                  {viewDoc.observations && (
                    <div className="pt-3 border-t border-gray-700/30">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Observações</div>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{viewDoc.observations}</p>
                    </div>
                  )}

                  {/* Anexo */}
                  {viewDoc.documentUrl && (
                    <div className="pt-3 border-t border-gray-700/30">
                      <a
                        href={viewDoc.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-seguranca-yellow hover:underline"
                      >
                        <Upload className="h-4 w-4" />
                        Ver anexo do documento
                      </a>
                    </div>
                  )}
                </div>

                {/* ─── Alertas CLT/INSS do funcionário ─── */}
                {viewDoc.employeeId && (() => {
                  const empAlert = getEmployeeAlert(viewDoc.employeeId);
                  if (!empAlert) return null;

                  const isCritical = empAlert.totalDays >= 15;
                  const isWarning = empAlert.totalDays >= 12 && empAlert.totalDays < 15;

                  return (
                    <div className={cn(
                      'rounded-xl border p-4 space-y-3',
                      isCritical
                        ? 'border-red-600/50 bg-red-950/30'
                        : isWarning
                        ? 'border-amber-600/50 bg-amber-950/30'
                        : 'border-gray-600/50 bg-seguranca-black/40'
                    )}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-white">
                          {isCritical ? (
                            <ShieldAlert className="h-4 w-4 text-red-400" />
                          ) : isWarning ? (
                            <AlertTriangle className="h-4 w-4 text-amber-400" />
                          ) : (
                            <Clock className="h-4 w-4 text-gray-400" />
                          )}
                          Alerta INSS / CLT do Funcionário
                        </div>
                        <Badge className={cn(
                          'font-bold text-xs',
                          isCritical ? 'bg-red-600 text-white' : isWarning ? 'bg-amber-600 text-white' : 'bg-gray-600 text-white'
                        )}>
                          {empAlert.totalDays} dia(s) acumulado(s)
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground text-[11px]">Total de atestados: </span>
                          <span className="text-white font-semibold">{empAlert.totalCount}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[11px]">Status: </span>
                          {isCritical ? (
                            <span className="text-red-400 font-bold text-xs">🚨 Encaminhar para Perícia INSS</span>
                          ) : isWarning ? (
                            <span className="text-amber-400 font-bold text-xs">⚠️ Próximo ao limite CLT (15 dias)</span>
                          ) : (
                            <span className="text-green-400 text-xs">✅ Dentro do limite</span>
                          )}
                        </div>
                      </div>

                      {/* Histórico de atestados deste funcionário */}
                      {empAlert.documents.length > 1 && (
                        <div className="pt-3 border-t border-gray-700/30">
                          <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">
                            Histórico de Atestados ({empAlert.documents.length})
                          </div>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {empAlert.documents.map((d) => (
                              <div
                                key={d.id}
                                className={cn(
                                  'flex items-center justify-between rounded-md px-2.5 py-1.5 text-[11px]',
                                  d.id === viewDoc.id ? 'bg-white/10 border border-white/10' : 'bg-black/20'
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Badge variant="outline" className="text-[9px] shrink-0">
                                    {MEDICAL_TYPE_LABELS[d.documentType]?.split(' ')[0] || d.documentType}
                                  </Badge>
                                  <span className="text-gray-300 truncate">
                                    {formatAdmissionDateBr(d.startDate)}
                                    {d.endDate ? ` → ${formatAdmissionDateBr(d.endDate)}` : ''}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-semibold text-white">{d.days != null ? `${d.days}d` : '-'}</span>
                                  {d.cidCode && <span className="text-muted-foreground">{d.cidCode}</span>}
                                  {d.id === viewDoc.id && <span className="text-emerald-400">● atual</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewModalOpen(false)}>
                Fechar
              </Button>
              {viewDoc && (
                <Button
                  variant="outline"
                  className="border-blue-500/50 text-blue-400 hover:bg-blue-950/40"
                  onClick={() => {
                    setViewModalOpen(false);
                    openEdit(viewDoc);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* Modal de Relatórios de Atestados Médicos                         */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-seguranca-graphite border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <BarChart2 className="h-6 w-6 text-emerald-400" />
                Relatórios de Atestados Médicos
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Gere relatórios detalhados de atestados filtrados por período, setor de trabalho e funcionário.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-seguranca-black/50 border border-gray-700">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-400">Data Inicial</Label>
                  <Input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-400">Data Final</Label>
                  <Input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-400">Setores de Trabalho</Label>
                  <Select value={reportSector} onValueChange={setReportSector}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos os setores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">🏢 Todos os Setores</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.name}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-400">Tipo de Documento</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">📋 Todos os Tipos</SelectItem>
                      {MEDICAL_FORM_TYPES.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-seguranca-black/40 rounded-lg border border-gray-700 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{reportTotals.totalDocs}</div>
                  <div className="text-xs text-gray-400">Atestados Encontrados</div>
                </div>
                <div className="p-3 bg-seguranca-black/40 rounded-lg border border-gray-700 text-center">
                  <div className="text-2xl font-bold text-amber-400">{reportTotals.totalDays}</div>
                  <div className="text-xs text-gray-400">Total de Dias Afastados</div>
                </div>
                <div className="p-3 bg-seguranca-black/40 rounded-lg border border-gray-700 text-center">
                  <div className="text-2xl font-bold text-blue-400">{reportTotals.uniqueEmployees}</div>
                  <div className="text-xs text-gray-400">Funcionários Afetados</div>
                </div>
              </div>

              <div className="rounded-md border border-gray-700 max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Dias</TableHead>
                      <TableHead>CID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportFilteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                          Nenhum atestado encontrado para os filtros selecionados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      reportFilteredItems.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium text-xs">{doc.employeeName}</TableCell>
                          <TableCell className="text-xs text-gray-300">{doc.companyName || '—'}</TableCell>
                          <TableCell className="text-xs text-gray-300">{doc.employeeDepartment || '—'}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline">{MEDICAL_TYPE_LABELS[doc.documentType] || doc.documentType}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatAdmissionDateBr(doc.startDate)} {doc.endDate ? `→ ${formatAdmissionDateBr(doc.endDate)}` : ''}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-amber-300">{doc.days != null ? `${doc.days}d` : '—'}</TableCell>
                          <TableCell className="text-xs">{doc.cidCode || '—'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <DialogFooter className="flex flex-row justify-between items-center sm:justify-between gap-2">
              <Button variant="ghost" onClick={() => setReportModalOpen(false)}>
                Fechar
              </Button>
              <div className="flex gap-2">
                <Button onClick={handleExportExcelReport} variant="outline" className="border-emerald-600/50 text-emerald-400 hover:bg-emerald-950/40 font-medium">
                  <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-400" />
                  Exportar Excel (.XLSX)
                </Button>
                <Button onClick={handlePrintPdfReport} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md shadow-emerald-700/20">
                  <Printer className="h-4 w-4 mr-2" />
                  Gerar Relatório PDF
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </StandardLayout>
  );
};

export default GestaoAtestados;
