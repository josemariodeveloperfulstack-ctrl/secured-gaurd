import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    User,
    FileText,
    Clock,
    Users,
    HeartPulse,
    Palmtree,
    Stethoscope,
    AlertTriangle,
    MoveHorizontal,
    Edit,
    Loader2,
    Calendar,
    MapPin,
    Building,
    Mail,
    Phone,
    Briefcase,
    GraduationCap,
    Brain,
    History,
    ArrowLeftRight,
    Gavel,
    Scale,
} from 'lucide-react';
import { Employee } from '@/types/employee';
import type { Dependent } from '@/types/dependent';
import { EmployeeDocuments } from './EmployeeDocuments';
import employeeService from '@/services/employeeService';
import dependentService from '@/services/dependentService';
import { sstService, MedicalExam } from '@/services/sstService';
import { trainingService, EmployeeCertification } from '@/services/trainingService';
import { feriasService } from '@/services/feriasService';
import { occurrenceService, Occurrence } from '@/services/occurrenceService';
import { medicalDocumentService, MEDICAL_TYPE_LABELS, MedicalDocumentType } from '@/services/medicalDocumentService';
import { remanejamentoService, Remanejamento } from '@/services/remanejamentoService';
import timeRecordService, { TimeRecord } from '@/services/timeRecordService';
import { employeeChangeHistoryService, EmployeeChangeHistoryItem } from '@/services/employeeChangeHistoryService';
import { employeeEmploymentPeriodService, EmployeeEmploymentPeriod } from '@/services/employeeEmploymentPeriodService';
import { format } from 'date-fns';
import { formatCPF, formatRG, formatPhone, formatDate as formatSystemDate } from '@/utils/formatters';
import { EmployeeAnalyticsChart } from './EmployeeAnalyticsChart';
import { EmployeeSummaryKpis } from './EmployeeSummaryKpis';
import { EmployeeUnifiedTimeline } from './EmployeeUnifiedTimeline';

const EXAM_TYPE_LABELS: Record<string, string> = {
    ADMISSIONAL: 'Admissional',
    DEMISSIONAL: 'Demissional',
    PERIODICO: 'Periódico',
    MUDANCA_FUNCAO: 'Mudança de Função',
    RETORNO_TRABALHO: 'Retorno ao Trabalho',
};

type UnifiedExamItem = {
    id: string;
    examType: string;
    examCategory: string;
    scheduledDate?: string;
    nextExamDate?: string;
    status?: string;
    result?: string;
    doctorName?: string;
    observations?: string;
    source: 'SST' | 'FICHA';
};

const WORK_POST_TYPE_LABELS: Record<string, string> = {
    POSTO_24H: 'Posto 24h',
    POSTO_SDF: 'Posto SDF',
    POSTO_12H_NOTURNO: '12h Noturno',
    POSTO_12H_DIURNO: '12h Diurno',
    POSTO_6H: 'Posto 6h',
    POSTO_8H: 'Posto 8h',
    POSTO_8H_DIURNO: '8h Diurno',
    POSTO_8H_NOTURNO: '8h Noturno',
    POSTO_ESPECIAL: 'Posto Especial',
    OUTROS: '',
};

function formatPostoTrabalhoLabel(employee: Employee | null): string {
    if (!employee) return '-';
    const wp = employee.workPost as {
        name?: string;
        description?: string;
        type?: string;
        workSchedule?: string;
        primaryPositionName?: string;
    } | undefined;
    const setor = wp?.name?.trim();
    const posto =
        wp?.description?.trim() ||
        (wp?.type ? WORK_POST_TYPE_LABELS[wp.type] || (wp.type !== 'OUTROS' ? wp.type : '') : '') ||
        wp?.primaryPositionName?.trim() ||
        '';
    const escala =
        (employee as { escalaTrabalho?: string }).escalaTrabalho?.trim() ||
        wp?.workSchedule?.trim() ||
        '';
    const parts = [setor, posto, escala].filter(Boolean);
    return parts.length > 0 ? parts.join(' — ') : '-';
}

const VIEW_TABS = [
    { value: 'dados', label: 'Dados', icon: User },
    { value: 'documentos', label: 'Documentos', icon: FileText },
    { value: 'ponto', label: 'Ponto', icon: Clock },
    { value: 'dependentes', label: 'Dependentes', icon: Users },
    { value: 'exames-treinamentos', label: 'Exames e Treinamentos', icon: HeartPulse },
    { value: 'ferias', label: 'Férias', icon: Palmtree },
    { value: 'atestados', label: 'Atestados', icon: Stethoscope },
    { value: 'disciplinar', label: 'Disciplinar', icon: AlertTriangle },
    { value: 'remanejamentos', label: 'Remanejamentos', icon: MoveHorizontal },
    { value: 'historico', label: 'Histórico', icon: History },
] as const;

interface EmployeeViewDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee | null;
    onEdit?: (employee: Employee) => void;
}

export const EmployeeViewDetailsModal: React.FC<EmployeeViewDetailsModalProps> = ({
    open,
    onOpenChange,
    employee,
    onEdit,
}) => {
    const [activeTab, setActiveTab] = useState('dados');
    const [loading, setLoading] = useState(false);
    /** Isolado do `loading` das outras abas — evita race onde loadTabData faz setLoading(false) enquanto dependentes ainda carregam. */
    const [loadingDependents, setLoadingDependents] = useState(false);
    const [fullEmployee, setFullEmployee] = useState<Employee | null>(null);

    // Data states
    const [dependents, setDependents] = useState<Dependent[]>([]);
    const [exams, setExams] = useState<UnifiedExamItem[]>([]);
    const [trainings, setTrainings] = useState<EmployeeCertification[]>([]);
    const [vacations, setVacations] = useState<any[]>([]);
    const [absences, setAbsences] = useState<any[]>([]);
    const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
    const [transfers, setTransfers] = useState<Remanejamento[]>([]);
    const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
    const [historyItems, setHistoryItems] = useState<EmployeeChangeHistoryItem[]>([]);
    const [employmentPeriods, setEmploymentPeriods] = useState<EmployeeEmploymentPeriod[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [generatingReport, setGeneratingReport] = useState(false);

    // Carregar funcionário completo ao abrir (lista paginada retorna document, não cpf/rg)
    useEffect(() => {
        if (open && employee?.id) {
            employeeService.getEmployeeById(employee.id).then((fetched) => {
                setFullEmployee(fetched || null);
            }).catch(() => setFullEmployee(null));
        } else {
            setFullEmployee(null);
        }
    }, [open, employee?.id]);

    const employeeIdForRequests = fullEmployee?.id ?? employee?.id;

    /** Limpa lista ao trocar de funcionário ou fechar — evita mostrar dependentes do registro anterior. */
    useEffect(() => {
        setDependents([]);
        setLoadingDependents(false);
    }, [open, employee?.id]);

    /** Dependentes: carrega só na aba correta e usa ID estável (detalhe completo quando existir). */
    useEffect(() => {
        if (!open || !employeeIdForRequests || activeTab !== 'dependentes') {
            return;
        }
        let cancelled = false;
        setLoadingDependents(true);
        dependentService
            .getDependentsByEmployee(String(employeeIdForRequests))
            .then((data) => {
                if (cancelled) return;
                const list = Array.isArray(data) ? data : [];
                setDependents(list);
            })
            .catch((err) => {
                console.error('Erro ao carregar dependentes:', err);
                if (!cancelled) setDependents([]);
            })
            .finally(() => {
                if (!cancelled) setLoadingDependents(false);
            });
        return () => {
            cancelled = true;
        };
    }, [open, employeeIdForRequests, activeTab]);

    // Carregar indicadores rápidos (atestados, advertências e férias) imediatamente na abertura do modal
    useEffect(() => {
        if (!open || !employee?.id) return;
        let cancelled = false;

        const loadQuickKpis = async () => {
            try {
                const [medDocsRes, abs, occs, vacs] = await Promise.all([
                    medicalDocumentService.getMedicalDocuments({ employeeId: employee.id, page: 0, size: 100 }).catch(() => null),
                    feriasService.getAfastamentos({ employeeId: employee.id }).catch(() => []),
                    occurrenceService.getOccurrences({ employeeId: employee.id }).catch(() => []),
                    feriasService.getFeriasByEmployee(employee.id).catch(() => []),
                ]);

                if (cancelled) return;

                // Processar atestados
                const fromAfastamentos = (Array.isArray(abs) ? abs : [])
                    .filter((a: any) => a.absenceType === 'SICK_LEAVE' || a.tipo === 'ATESTADO')
                    .map((a: any) => ({
                        id: `afastamento-${a.id}`,
                        source: 'AFASTAMENTOS',
                        title: a.motivo || 'Atestado Médico',
                        dataInicio: a.dataInicio || a.startDate,
                        dataFim: a.dataFim || a.endDate,
                        dias: a.dias || a.days,
                        cidCode: a.cid,
                        documentoUrl: a.documento || a.documentUrl,
                        observations: a.observacoes || a.notes,
                    }));

                const fromMedDocs = (Array.isArray(medDocsRes?.content) ? medDocsRes.content : [])
                    .map((doc: any) => ({
                        id: `med-doc-${doc.id}`,
                        source: 'GESTÃO DE ATESTADOS',
                        title: MEDICAL_TYPE_LABELS[doc.documentType as MedicalDocumentType] || doc.documentType || 'Atestado Médico',
                        dataInicio: doc.startDate,
                        dataFim: doc.endDate,
                        dias: doc.days,
                        horas: doc.hours,
                        cidCode: doc.cidCode,
                        cidDescription: doc.cidDescription,
                        doctorName: doc.doctorName,
                        crm: doc.crm,
                        documentoUrl: doc.documentUrl,
                        observations: doc.observations,
                    }));

                const atestadoOccurrences = (Array.isArray(occs) ? occs : [])
                    .filter((o: any) => {
                        const t = String(o.type || '').toUpperCase();
                        const title = String(o.title || '').toUpperCase();
                        const cat = String(o.category || '').toUpperCase();
                        return t === 'MEDICAL_CERTIFICATE' || t === 'ATESTADO' || t === 'ATESTADO_MEDICO' ||
                            title.includes('ATESTADO') || cat.includes('ATESTADO');
                    })
                    .map((o: any) => ({
                        id: `ocorrencia-${o.id}`,
                        source: 'OCORRÊNCIAS',
                        title: o.title || 'Atestado Médico (Ocorrência)',
                        dataInicio: o.startDate || o.date,
                        dataFim: o.endDate || o.date,
                        description: o.description || o.reason,
                        status: o.status,
                        documentoUrl: o.documentUrl || o.attachmentUrl || o.documento,
                    }));

                const combined = [...fromMedDocs, ...fromAfastamentos, ...atestadoOccurrences];
                const unique = combined.filter((item, index, self) =>
                    index === self.findIndex((t) => (
                        t.id === item.id ||
                        (t.dataInicio === item.dataInicio && t.title === item.title && t.source === item.source)
                    ))
                );

                unique.sort((a, b) => {
                    const dateA = new Date(a.dataInicio || 0).getTime();
                    const dateB = new Date(b.dataInicio || 0).getTime();
                    return dateB - dateA;
                });

                setAbsences(unique);

                // Processar advertências e suspensões
                const discOccs = (Array.isArray(occs) ? occs : []).filter(o => 
                    o.type === 'ADVERTENCIA' || o.type === 'SUSPENSAO' || o.type === 'PUNICAO' ||
                    o.title?.toUpperCase().includes('ADVERTÊNCIA') || o.title?.toUpperCase().includes('ADVERTENCIA')
                );
                setOccurrences(discOccs);

                // Processar férias
                if (Array.isArray(vacs)) {
                    setVacations(vacs);
                }
            } catch (err) {
                console.error('Erro ao carregar KPIs do funcionário:', err);
            }
        };

        loadQuickKpis();

        return () => {
            cancelled = true;
        };
    }, [open, employee?.id]);

    useEffect(() => {
        if (open && employee?.id && activeTab !== 'dependentes') {
            loadTabData();
        }
    }, [open, employee, activeTab, selectedMonth, selectedYear]);

    const loadTabData = async () => {
        if (!employee?.id) return;

        setLoading(true);
        try {
            switch (activeTab) {
                case 'exames-treinamentos': {
                    const empDetail =
                        fullEmployee?.id === employee.id
                            ? fullEmployee
                            : (await employeeService.getEmployeeById(employee.id)) || fullEmployee || employee;

                    const [sstExams, certs] = await Promise.all([
                        sstService.getMedicalExamsByEmployee(employee.id).catch(() => [] as MedicalExam[]),
                        trainingService.getEmployeeCertifications({ employeeId: employee.id }).catch(() => [] as EmployeeCertification[]),
                    ]);

                    const fromSst: UnifiedExamItem[] = (Array.isArray(sstExams) ? sstExams : []).map((exam) => ({
                        id: exam.id,
                        examType: EXAM_TYPE_LABELS[String(exam.examCategory || exam.examType || '').toUpperCase()]
                            || exam.examType
                            || exam.examCategory
                            || 'Exame Médico',
                        examCategory: exam.examCategory || 'SST',
                        scheduledDate: exam.performedDate || exam.scheduledDate,
                        nextExamDate: (exam as any).nextExamDate,
                        status: exam.status,
                        result: exam.result,
                        doctorName: exam.doctorName,
                        source: 'SST',
                    }));

                    const fichaHasAso = Boolean(
                        empDetail?.exameMedicoData ||
                        empDetail?.exameMedicoVencimento ||
                        empDetail?.exameMedicoTipo
                    );

                    const alreadyCoveredBySst = fichaHasAso && fromSst.some((e) => {
                        const tipoFicha = String(empDetail?.exameMedicoTipo || '').toUpperCase();
                        const tipoExam = String(e.examType || '').toUpperCase();
                        const sameType =
                            !tipoFicha ||
                            tipoExam.includes(tipoFicha) ||
                            tipoExam.includes(EXAM_TYPE_LABELS[tipoFicha]?.toUpperCase() || '___');
                        const sameDate =
                            !empDetail?.exameMedicoData ||
                            (e.scheduledDate || '').slice(0, 10) === String(empDetail.exameMedicoData).slice(0, 10);
                        return sameType && sameDate;
                    });

                    const fromFicha: UnifiedExamItem[] = fichaHasAso && !alreadyCoveredBySst
                        ? [{
                            id: `ficha-aso-${empDetail.id}`,
                            examType: EXAM_TYPE_LABELS[String(empDetail.exameMedicoTipo || '').toUpperCase()]
                                || empDetail.exameMedicoTipo
                                || 'Exame Médico (ASO)',
                            examCategory: 'Cadastro do funcionário',
                            scheduledDate: empDetail.exameMedicoData,
                            nextExamDate: empDetail.exameMedicoVencimento,
                            status: empDetail.exameMedicoData ? 'REALIZADO' : 'PENDENTE',
                            result: undefined,
                            doctorName: (empDetail as any).exameMedicoDoctor?.name,
                            source: 'FICHA',
                        }]
                        : [];

                    const fichaHasLaudo = Boolean(
                        empDetail?.laudoPsicologicoData ||
                        empDetail?.laudoPsicologicoVencimento ||
                        empDetail?.laudoPsicologicoResultado
                    );

                    const fromLaudo: UnifiedExamItem[] = fichaHasLaudo
                        ? [{
                            id: `ficha-laudo-${empDetail.id}`,
                            examType: 'Laudo Psicológico',
                            examCategory: 'Avaliação Psicológica',
                            scheduledDate: empDetail.laudoPsicologicoData,
                            nextExamDate: empDetail.laudoPsicologicoVencimento,
                            status: empDetail.laudoPsicologicoData ? 'REALIZADO' : 'PENDENTE',
                            result: empDetail.laudoPsicologicoResultado,
                            doctorName: (empDetail as any).laudoPsicologicoDoctor?.name,
                            observations: (empDetail as any).laudoPsicologicoObservacoes,
                            source: 'FICHA',
                        }]
                        : [];

                    setExams([...fromFicha, ...fromLaudo, ...fromSst]);
                    setTrainings(Array.isArray(certs) ? certs : []);
                    break;
                }
                case 'ferias':
                    const vacs = await feriasService.getFeriasByEmployee(employee.id);
                    setVacations(vacs);
                    break;
                case 'atestados': {
                    const [abs, medDocsRes, occs] = await Promise.all([
                        feriasService.getAfastamentosByEmployee(employee.id).catch(() => []),
                        medicalDocumentService.search({ employeeId: employee.id, size: 100 }).catch(() => ({ content: [] })),
                        occurrenceService.getOccurrences({ employeeId: employee.id }).catch(() => []),
                    ]);

                    const fromAfastamentos = (Array.isArray(abs) ? abs : [])
                        .filter((a: any) => a.absenceType === 'SICK_LEAVE' || a.tipo === 'ATESTADO')
                        .map((a: any) => ({
                            id: `afastamento-${a.id}`,
                            source: 'AFASTAMENTOS',
                            title: a.motivo || 'Atestado Médico',
                            dataInicio: a.dataInicio || a.startDate,
                            dataFim: a.dataFim || a.endDate,
                            dias: a.dias || a.days,
                            cidCode: a.cid,
                            documentoUrl: a.documento || a.documentUrl,
                            observations: a.observacoes || a.notes,
                        }));

                    const fromMedDocs = (Array.isArray(medDocsRes?.content) ? medDocsRes.content : [])
                        .map((doc: any) => ({
                            id: `med-doc-${doc.id}`,
                            source: 'GESTÃO DE ATESTADOS',
                            title: MEDICAL_TYPE_LABELS[doc.documentType as MedicalDocumentType] || doc.documentType || 'Atestado Médico',
                            dataInicio: doc.startDate,
                            dataFim: doc.endDate,
                            dias: doc.days,
                            horas: doc.hours,
                            cidCode: doc.cidCode,
                            cidDescription: doc.cidDescription,
                            doctorName: doc.doctorName,
                            crm: doc.crm,
                            documentoUrl: doc.documentUrl,
                            observations: doc.observations,
                        }));

                    const atestadoOccurrences = (Array.isArray(occs) ? occs : [])
                        .filter((o: any) => {
                            const t = String(o.type || '').toUpperCase();
                            const title = String(o.title || '').toUpperCase();
                            const cat = String(o.category || '').toUpperCase();
                            return t === 'MEDICAL_CERTIFICATE' || t === 'ATESTADO' || t === 'ATESTADO_MEDICO' ||
                                title.includes('ATESTADO') || cat.includes('ATESTADO');
                        })
                        .map((o: any) => ({
                            id: `ocorrencia-${o.id}`,
                            source: 'OCORRÊNCIAS',
                            title: o.title || 'Atestado Médico (Ocorrência)',
                            dataInicio: o.startDate || o.date,
                            dataFim: o.endDate || o.date,
                            description: o.description || o.reason,
                            status: o.status,
                            documentoUrl: o.documentUrl || o.attachmentUrl || o.documento,
                        }));

                    const combined = [...fromMedDocs, ...fromAfastamentos, ...atestadoOccurrences];
                    const unique = combined.filter((item, index, self) =>
                        index === self.findIndex((t) => (
                            t.id === item.id ||
                            (t.dataInicio === item.dataInicio && t.title === item.title && t.source === item.source)
                        ))
                    );

                    unique.sort((a, b) => {
                        const dateA = new Date(a.dataInicio || 0).getTime();
                        const dateB = new Date(b.dataInicio || 0).getTime();
                        return dateB - dateA;
                    });

                    setAbsences(unique);
                    break;
                }
                case 'disciplinar':
                    const occs = await occurrenceService.getOccurrences({ employeeId: employee.id });
                    setOccurrences(occs.filter(o => o.type === 'ADVERTENCIA' || o.type === 'SUSPENSAO' || o.type === 'PUNICAO'));
                    break;
                case 'remanejamentos':
                    const rems = await remanejamentoService.getRemanejamentosByEmployee(employee.id);
                    setTransfers(rems);
                    break;
                case 'historico': {
                    const [histData, periods] = await Promise.all([
                        employeeChangeHistoryService.getByEmployeeId(employee.id, 0, 50).catch(() => null),
                        employeeEmploymentPeriodService.getEmploymentPeriods(employee.id).catch(() => []),
                    ]);
                    setHistoryItems(histData?.content || []);
                    setEmploymentPeriods(periods || []);
                    break;
                }
                case 'ponto':
                    // Se estivermos na aba de ponto, buscamos os registros por período (mês selecionado)
                    const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0];
                    const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
                    const records = await timeRecordService.getRecordsByPeriod(employee.id, startDate, endDate);
                    setTimeRecords(records.data || []);
                    break;
            }
        } catch (error) {
            console.error(`Erro ao carregar dados da aba ${activeTab}:`, error);
        } finally {
            setLoading(false);
        }
    };

    if (!employee) return null;

    const relationshipLabel = (rel?: string) => {
        if (!rel) return '—';
        const u = rel.trim().toUpperCase();
        if (u === 'SPOUSE' || u.includes('CÔNJUGE') || u.includes('CONJUGE')) return 'Cônjuge';
        if (u === 'CHILD' || u.includes('FILHO')) return 'Filho(a)';
        if (u === 'PARENT' || u.includes('PAI') || u.includes('MÃE') || u.includes('MAE')) return 'Pai/Mãe';
        return rel;
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        try {
            return formatSystemDate(dateString);
        } catch {
            return dateString;
        }
    };

    const renderLoading = () => (
        <div className="flex flex-col items-center justify-center py-12 text-seguranca-lightgray">
            <Loader2 className="h-8 w-8 animate-spin text-seguranca-red mb-4" />
            <p>Carregando informações...</p>
        </div>
    );

    const renderEmpty = (message: string) => (
        <div className="text-center py-12 bg-seguranca-black/20 rounded-lg border border-gray-700/30">
            <p className="text-gray-500 italic">{message}</p>
        </div>
    );

    const handleGenerateReport = async () => {
        if (!employee?.id) return;
        setGeneratingReport(true);
        try {
            const blob = await timeRecordService.generateReport(employee.id, selectedMonth, selectedYear);
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `espelho_ponto_${employee.name.replace(/\s+/g, '_')}_${selectedMonth}_${selectedYear}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
        } finally {
            setGeneratingReport(false);
        }
    };

    const months = [
        { value: 1, label: 'Janeiro' },
        { value: 2, label: 'Fevereiro' },
        { value: 3, label: 'Março' },
        { value: 4, label: 'Abril' },
        { value: 5, label: 'Maio' },
        { value: 6, label: 'Junho' },
        { value: 7, label: 'Julho' },
        { value: 8, label: 'Agosto' },
        { value: 9, label: 'Setembro' },
        { value: 10, label: 'Outubro' },
        { value: 11, label: 'Novembro' },
        { value: 12, label: 'Dezembro' },
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    // Usar funcionário completo quando disponível (cpf, rg, etc. vêm do endpoint /employees/:id)
    const displayEmployee = fullEmployee ?? employee;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[98vw] md:w-full max-w-6xl h-[98vh] md:h-[85vh] overflow-hidden flex flex-col bg-seguranca-graphite border-gray-700 p-0">
                <DialogHeader className="p-4 md:p-6 pb-2">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 md:h-16 md:w-16 rounded-2xl bg-seguranca-red/20 border border-seguranca-red/30 flex items-center justify-center text-seguranca-red shrink-0">
                                <User size={24} className="md:hidden" />
                                <User size={32} className="hidden md:block" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl md:text-2xl font-bold text-white mb-1">
                                    {displayEmployee.name}
                                </DialogTitle>
                                <DialogDescription asChild>
                                    <div className="text-seguranca-lightgray flex flex-wrap items-center gap-x-4 gap-y-1">
                                        <span className="flex items-center gap-1 font-mono">
                                            <Briefcase size={14} className="text-seguranca-yellow" />
                                            Mat: {displayEmployee.registrationNumber || 'N/A'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Building size={14} className="text-seguranca-yellow" />
                                            {displayEmployee.company?.sigla || 'N/A'}
                                        </span>
                                        <Badge
                                            className={`
                    ${displayEmployee.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                                            displayEmployee.status === 'TERMINATED' ? 'bg-red-500/20 text-red-400' :
                                            displayEmployee.status === 'SUB_JUDICE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                                                'bg-yellow-500/20 text-yellow-400'}
                  `}
                                        >
                                            {displayEmployee.status === 'ACTIVE' ? 'Ativo' :
                                                displayEmployee.status === 'TERMINATED' ? 'Demitido' :
                                                displayEmployee.status === 'SUB_JUDICE' ? '⚖️ Sub Júdice' : (displayEmployee.status || 'Outro')}
                                        </Badge>
                                    </div>
                                </DialogDescription>
                            </div>
                        </div>
                        {onEdit && (
                            <Button
                                onClick={() => {
                                  const toEdit = { ...displayEmployee } as any;
                                  const listWp = (employee as any)?.workPost;
                                  if (listWp && !toEdit.workPost) toEdit.workPost = listWp;
                                  if (listWp?.id && !toEdit.workPostId) toEdit.workPostId = String(listWp.id);
                                  onEdit(toEdit);
                                }}
                                className="bg-seguranca-red hover:bg-seguranca-darkred text-white w-full md:w-auto"
                            >
                                <Edit size={18} className="mr-2" /> Editar Dados
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                {/* KPI Cards: Atestados Entregues, Advertências, Situação Funcional e Férias */}
                <EmployeeSummaryKpis
                    employee={displayEmployee}
                    totalAtestados={absences.length}
                    totalDiasAfastado={absences.reduce((acc, curr) => acc + (Number(curr.dias) || 1), 0)}
                    totalAdvertencias={occurrences.filter(o => o.type === 'ADVERTENCIA' || !o.type || o.type.includes('ADVERTENCIA') || o.title?.toUpperCase().includes('ADVERT')).length}
                    totalSuspensoes={occurrences.filter(o => o.type === 'SUSPENSAO' || o.type?.includes('SUSPENSAO')).length}
                    onNavigateTab={setActiveTab}
                />

                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="flex-1 h-full flex flex-col md:flex-row overflow-hidden min-h-0"
                >
                    {/* MOBILE: Select */}
                    <div className="md:hidden px-6 py-4 border-b border-gray-700 bg-seguranca-graphite/50">
                        <Select value={activeTab} onValueChange={setActiveTab}>
                            <SelectTrigger className="w-full bg-seguranca-black border-gray-600">
                                <SelectValue placeholder="Selecionar categoria" />
                            </SelectTrigger>
                            <SelectContent className="bg-seguranca-black border-gray-600">
                                {VIEW_TABS.map(({ value, label, icon: Icon }) => (
                                    <SelectItem key={value} value={value}>
                                        <div className="flex items-center">
                                            <Icon size={16} className="mr-2" /> {label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* DESKTOP/TABLET: menu lateral — todas as abas sempre visíveis */}
                    <div className="hidden md:flex w-56 lg:w-64 border-r border-gray-700 bg-seguranca-graphite/30 shrink-0 overflow-hidden self-stretch">
                        <ScrollArea className="h-full w-full">
                            <TabsList className="flex flex-col h-auto bg-transparent gap-1 p-3 lg:p-4 justify-start items-stretch">
                                {VIEW_TABS.map(({ value, label, icon: Icon }) => (
                                    <TabsTrigger
                                        key={value}
                                        value={value}
                                        className="justify-start data-[state=active]:bg-seguranca-red data-[state=active]:text-white rounded-md px-3 lg:px-4 py-2.5 lg:py-3 transition-all text-left"
                                    >
                                        <Icon size={16} className="mr-2 lg:mr-3 shrink-0" />
                                        <span className="truncate">{label}</span>
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </ScrollArea>
                    </div>

                    <ScrollArea className="flex-1 p-4 md:p-6">
                        {/* Aba Dados */}
                        <TabsContent value="dados" className="mt-0 space-y-4 md:space-y-6">
                            {/* Card de Afastamento por Processo Judicial (RF07) */}
                            {(displayEmployee.judicialProcessStartDate || displayEmployee.status === 'SUB_JUDICE') && (
                                <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-800 border-amber-500/40 shadow-md overflow-hidden">
                                    <div className="bg-amber-500/10 px-4 py-2.5 border-b border-amber-500/30 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Gavel size={16} className="text-amber-400" />
                                            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Histórico de Processo Judicial</span>
                                        </div>
                                        <Badge className={`text-xs ${
                                            !displayEmployee.judicialProcessEndDate
                                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                                : displayEmployee.status === 'TERMINATED'
                                                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                        }`}>
                                            {!displayEmployee.judicialProcessEndDate
                                                ? '⚖️ Sub Júdice (Em Andamento)'
                                                : displayEmployee.status === 'TERMINATED'
                                                    ? 'Encerrado (Demissão)'
                                                    : 'Encerrado (Reintegrado / Ativo)'}
                                        </Badge>
                                    </div>
                                    <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 uppercase font-bold">Início do Afastamento Judicial</span>
                                            <span className="text-sm font-semibold text-white mt-0.5">
                                                {formatDate(displayEmployee.judicialProcessStartDate)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 uppercase font-bold">Fim do Processo Judicial</span>
                                            <span className="text-sm font-semibold text-white mt-0.5">
                                                {displayEmployee.judicialProcessEndDate
                                                    ? formatDate(displayEmployee.judicialProcessEndDate)
                                                    : 'Em aberto (Processo em curso)'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 uppercase font-bold">Observações / Sentença</span>
                                            <span className="text-sm text-gray-300 mt-0.5">
                                                {displayEmployee.judicialProcessNotes || 'Nenhuma observação registrada.'}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                <Card className="bg-seguranca-black/40 border-gray-700/50 overflow-hidden">
                                    <div className="bg-seguranca-red/10 px-4 py-2 border-b border-gray-700/50 flex items-center gap-2">
                                        <User size={14} className="text-seguranca-red" />
                                        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Identificação</span>
                                    </div>
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">CPF</span>
                                            <span className="text-sm font-mono text-white">{formatCPF(displayEmployee.cpf || (displayEmployee as any).document)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">RG</span>
                                            <span className="text-sm font-mono text-white">{formatRG(displayEmployee.rg)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">Data de Nascimento</span>
                                            <span className="text-sm text-white">{formatDate(displayEmployee.birthDate)}</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-seguranca-black/40 border-gray-700/50 overflow-hidden">
                                    <div className="bg-blue-500/10 px-4 py-2 border-b border-gray-700/50 flex items-center gap-2">
                                        <Mail size={14} className="text-blue-400" />
                                        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Contato</span>
                                    </div>
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">E-mail</span>
                                            <span className="text-sm text-white break-all">{displayEmployee.email || '-'}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">Telefone Principal</span>
                                            <span className="text-sm text-white">{formatPhone(displayEmployee.phone)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">Telefone Contato</span>
                                            <span className="text-sm text-white">{formatPhone((displayEmployee as any).telefoneContato)}</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-seguranca-black/40 border-gray-700/50 overflow-hidden">
                                    <div className="bg-seguranca-yellow/10 px-4 py-2 border-b border-gray-700/50 flex items-center gap-2">
                                        <Briefcase size={14} className="text-seguranca-yellow" />
                                        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Trabalho</span>
                                    </div>
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">Cargo / Função</span>
                                            <span className="text-sm text-white font-semibold">{displayEmployee.position?.name || '-'}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">Setor de Trabalho</span>
                                            <span className="text-sm text-white">
                                                {displayEmployee.workPost?.name || displayEmployee.unit?.name || (displayEmployee as any).department?.name || '-'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">Posto de Trabalho</span>
                                            <span className="text-sm text-white">{formatPostoTrabalhoLabel(displayEmployee)}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-500 uppercase font-bold">Admissão</span>
                                                <span className="text-sm text-white">{formatDate(displayEmployee.hireDate)}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-500 uppercase font-bold">Termino</span>
                                                <span className="text-sm text-white">{formatDate(displayEmployee.terminationDate)}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="bg-seguranca-black/40 border-gray-700/50 overflow-hidden">
                                    <div className="bg-green-500/10 px-4 py-2 border-b border-gray-700/50 flex items-center gap-2">
                                        <MapPin size={14} className="text-green-400" />
                                        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Localização</span>
                                    </div>
                                    <CardContent className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">Endereço Residencial</span>
                                            <p className="text-sm text-white mt-1 leading-relaxed">
                                                {(() => {
                                                    const e = displayEmployee as any;
                                                    const parts = [
                                                        e.enderecoRua,
                                                        e.enderecoNumero ? `nº ${e.enderecoNumero}` : null,
                                                        e.enderecoComplemento,
                                                        e.enderecoBairro,
                                                        e.enderecoCidade,
                                                        e.enderecoEstado,
                                                        e.enderecoCep ? `CEP: ${e.enderecoCep}` : null
                                                    ].filter(Boolean);
                                                    return parts.length > 0 ? parts.join(', ') : (typeof displayEmployee.address === 'string' ? displayEmployee.address : '-');
                                                })()}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-seguranca-black/40 border-gray-700/50 overflow-hidden">
                                    <div className="bg-emerald-500/10 px-4 py-2 border-b border-gray-700/50 flex items-center gap-2">
                                        <Brain size={14} className="text-emerald-400" />
                                        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Laudo Psicológico</span>
                                    </div>
                                    <CardContent className="p-4 space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-500 uppercase font-bold">Data do Laudo</span>
                                                <span className="text-sm text-white font-mono">{formatDate((displayEmployee as any).laudoPsicologicoData)}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-500 uppercase font-bold">Vencimento</span>
                                                <span className="text-sm text-white font-mono">{formatDate((displayEmployee as any).laudoPsicologicoVencimento)}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">Resultado</span>
                                            <div className="mt-0.5">
                                                {(displayEmployee as any).laudoPsicologicoResultado ? (
                                                    <Badge className={`${
                                                        String((displayEmployee as any).laudoPsicologicoResultado).toUpperCase().includes('APTO') ? 'bg-green-500/20 text-green-400' :
                                                        String((displayEmployee as any).laudoPsicologicoResultado).toUpperCase().includes('INAPTO') ? 'bg-red-500/20 text-red-400' :
                                                        'bg-yellow-500/20 text-yellow-400'
                                                    }`}>
                                                        {(displayEmployee as any).laudoPsicologicoResultado}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-sm text-gray-400">-</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">Profissional / Médico</span>
                                            <span className="text-sm text-white">{(displayEmployee as any).laudoPsicologicoDoctor?.name || '-'}</span>
                                        </div>
                                        {(displayEmployee as any).laudoPsicologicoObservacoes && (
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-500 uppercase font-bold">Observações</span>
                                                <p className="text-xs text-seguranca-lightgray italic leading-relaxed">
                                                    {(displayEmployee as any).laudoPsicologicoObservacoes}
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="bg-purple-500/10 border-gray-700/50 overflow-hidden">
                                    <div className="bg-purple-500/20 px-4 py-2 border-b border-gray-700/50 flex items-center gap-2">
                                        <FileText size={14} className="text-purple-400" />
                                        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Outras Informações</span>
                                    </div>
                                    <CardContent className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">Observações Gerais</span>
                                            <p className="text-sm text-white mt-1 italic leading-relaxed">
                                                {displayEmployee.notes || 'Nenhuma observação cadastrada.'}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* Aba Documentos */}
                        <TabsContent value="documentos" className="mt-0">
                            <EmployeeDocuments employeeId={employee.id} employeeName={employee.name} companyId={employee.company?.id} />
                        </TabsContent>

                        <TabsContent value="ponto" className="mt-0">
                            {loading ? renderLoading() : (
                                <div className="space-y-4">
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
                                        <h3 className="text-lg font-semibold text-white">Registros de Ponto</h3>

                                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                                            <Select
                                                value={selectedMonth.toString()}
                                                onValueChange={(val) => setSelectedMonth(parseInt(val))}
                                            >
                                                <SelectTrigger className="w-[140px] bg-seguranca-black border-gray-700 h-9">
                                                    <SelectValue placeholder="Mês" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-seguranca-black border-gray-700">
                                                    {months.map(m => (
                                                        <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Select
                                                value={selectedYear.toString()}
                                                onValueChange={(val) => setSelectedYear(parseInt(val))}
                                            >
                                                <SelectTrigger className="w-[100px] bg-seguranca-black border-gray-700 h-9">
                                                    <SelectValue placeholder="Ano" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-seguranca-black border-gray-700">
                                                    {years.map(y => (
                                                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={handleGenerateReport}
                                                disabled={generatingReport || timeRecords.length === 0}
                                                className="border-seguranca-yellow text-seguranca-yellow hover:bg-seguranca-yellow/10 h-9"
                                            >
                                                {generatingReport ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText size={16} className="mr-2" />}
                                                Gerar PDF
                                            </Button>
                                        </div>
                                    </div>

                                    {timeRecords.length === 0 ? renderEmpty('Nenhum registro de ponto encontrado para este período.') : (
                                        <div className="rounded-md border border-gray-700 overflow-hidden overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-seguranca-black/60 text-seguranca-yellow font-bold text-left">
                                                    <tr>
                                                        <th className="p-3 whitespace-nowrap">Data/Hora</th>
                                                        <th className="p-3">Tipo</th>
                                                        <th className="p-3">Posto</th>
                                                        <th className="p-3">Status</th>
                                                        <th className="p-3">Info</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-700">
                                                    {timeRecords.map((record) => (
                                                        <tr key={record.id} className="hover:bg-white/5 transition-colors">
                                                            <td className="p-3 text-white font-mono whitespace-nowrap">
                                                                {format(new Date(record.recordedAt), 'dd/MM/yyyy HH:mm:ss')}
                                                            </td>
                                                            <td className="p-3">
                                                                <Badge variant="outline" className={`
                                                                    ${record.recordType === 'ENTRADA' ? 'border-green-500/50 text-green-400' :
                                                                        record.recordType === 'SAIDA' ? 'border-red-500/50 text-red-400' :
                                                                            'border-blue-500/50 text-blue-400'}
                                                                `}>
                                                                    {record.recordType}
                                                                </Badge>
                                                            </td>
                                                            <td className="p-3 text-gray-300 max-w-[150px] truncate">
                                                                {record.workPost?.name || employee.workPost?.name || '-'}
                                                            </td>
                                                            <td className="p-3">
                                                                <Badge className={`
                                                                    ${record.status === 'APPROVED' ? 'bg-green-500/10 text-green-400' :
                                                                        record.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
                                                                            'bg-yellow-500/10 text-yellow-400'}
                                                                `}>
                                                                    {record.status}
                                                                </Badge>
                                                            </td>
                                                            <td className="p-3">
                                                                <div className="flex items-center gap-2">
                                                                    {record.latitude && record.longitude && (
                                                                        <MapPin size={14} className="text-blue-400" title={`Lat: ${record.latitude}, Long: ${record.longitude}`} />
                                                                    )}
                                                                    {record.isManual && (
                                                                        <Badge className="bg-orange-500/20 text-orange-400 text-[10px] h-4">MANUAL</Badge>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        {/* Aba Dependentes */}
                        <TabsContent value="dependentes" className="mt-0">
                            {loadingDependents ? renderLoading() : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-semibold text-white">Lista de Dependentes</h3>
                                        <Badge className="bg-seguranca-yellow/20 text-seguranca-yellow border-seguranca-yellow/30">
                                            {dependents.length} Dependentes
                                        </Badge>
                                    </div>

                                    {dependents.length === 0 ? renderEmpty('Este funcionário não possui dependentes cadastrados.') : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {dependents.map((dep) => (
                                                <Card key={dep.id} className="bg-seguranca-black/40 border-gray-700/50 overflow-hidden p-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 rounded-lg bg-seguranca-yellow/10 text-seguranca-yellow">
                                                            <User size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-white text-sm">{dep.name}</p>
                                                            <p className="text-xs text-seguranca-lightgray mt-1">
                                                                {relationshipLabel(dep.relationship)}
                                                            </p>
                                                            <div className="flex items-center gap-3 mt-2 font-mono text-[10px]">
                                                                <span className="text-gray-500">CPF: {dep.cpf || '-'}</span>
                                                                <span className="text-gray-500">Nasc: {formatDate(dep.birthDate)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        {/* Aba Exames e Treinamentos */}
                        <TabsContent value="exames-treinamentos" className="mt-0">
                            {loading ? renderLoading() : (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-2">Exames Médicos (ASO) & Laudo Psicológico</h3>
                                        <p className="text-xs text-gray-500 mb-3">
                                            Inclui ASO da ficha, Laudo Psicológico da ficha e exames do módulo SST.
                                        </p>
                                        {exams.length === 0 ? renderEmpty('Nenhum exame médico ou laudo psicológico encontrado.') : (
                                            <div className="space-y-3">
                                                {[...exams]
                                                    .sort((a, b) => {
                                                        const da = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
                                                        const db = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
                                                        return db - da;
                                                    })
                                                    .map((exam) => (
                                                    <Card key={exam.id} className="bg-seguranca-black/40 border-gray-700/50 p-4">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className={`p-2 rounded-lg shrink-0 ${
                                                                    exam.examType === 'Laudo Psicológico' 
                                                                        ? 'bg-emerald-500/10 text-emerald-400' 
                                                                        : (exam.status === 'REALIZADO' || exam.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' : 'bg-seguranca-yellow/10 text-seguranca-yellow')
                                                                    }`}>
                                                                    {exam.examType === 'Laudo Psicológico' ? <Brain size={18} /> : <Stethoscope size={18} />}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-bold text-white text-sm truncate">{exam.examType}</p>
                                                                    <p className="text-xs text-seguranca-lightgray uppercase tracking-tighter mt-0.5">
                                                                        {exam.examCategory}
                                                                        {exam.scheduledDate ? ` • Realizado: ${formatDate(exam.scheduledDate)}` : ''}
                                                                        {exam.nextExamDate ? ` • Vence: ${formatDate(exam.nextExamDate)}` : ''}
                                                                    </p>
                                                                    {exam.observations && (
                                                                        <p className="text-xs text-gray-400 mt-1 italic">
                                                                            Obs: {exam.observations}
                                                                        </p>
                                                                    )}
                                                                    <Badge variant="outline" className="mt-1 text-[10px] border-gray-600 text-gray-400">
                                                                        {exam.source === 'FICHA' ? 'Ficha do funcionário' : 'Módulo SST'}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <Badge className={`${exam.result === 'APTO' ? 'bg-green-500/20 text-green-400' :
                                                                    exam.result === 'INAPTO' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'
                                                                    }`}>
                                                                    {exam.result || exam.status || 'Registrado'}
                                                                </Badge>
                                                                {exam.doctorName && <p className="text-[10px] text-gray-500 mt-1">Dr(a). {exam.doctorName}</p>}
                                                            </div>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                            <GraduationCap size={18} className="text-seguranca-yellow" />
                                            Treinamentos e Certificações
                                        </h3>
                                        <p className="text-xs text-gray-500 mb-3">
                                            Treinamentos obrigatórios (vigilante, vigia e demais) e demais certificações vinculadas ao colaborador.
                                        </p>
                                        {trainings.length === 0 ? renderEmpty('Nenhum treinamento/certificação vinculado a este funcionário.') : (
                                            <div className="space-y-3">
                                                {[...trainings]
                                                    .sort((a, b) => {
                                                        const da = a.issueDate ? new Date(a.issueDate).getTime() : 0;
                                                        const db = b.issueDate ? new Date(b.issueDate).getTime() : 0;
                                                        return db - da;
                                                    })
                                                    .map((cert) => {
                                                        const expired = cert.expirationDate
                                                            ? new Date(cert.expirationDate) < new Date()
                                                            : false;
                                                        return (
                                                            <Card key={cert.id} className="bg-seguranca-black/40 border-gray-700/50 p-4">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                        <div className={`p-2 rounded-lg shrink-0 ${expired ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                                            <GraduationCap size={18} />
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <p className="font-bold text-white text-sm truncate">
                                                                                {cert.trainingName || 'Treinamento'}
                                                                            </p>
                                                                            <p className="text-xs text-seguranca-lightgray mt-0.5">
                                                                                {cert.certificationNumber ? `Cert. ${cert.certificationNumber} • ` : ''}
                                                                                Emissão: {formatDate(cert.issueDate)}
                                                                                {cert.expirationDate ? ` • Validade: ${formatDate(cert.expirationDate)}` : ''}
                                                                            </p>
                                                                            {cert.workPostName && (
                                                                                <p className="text-[10px] text-gray-500 mt-1">Posto: {cert.workPostName}</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <Badge className={
                                                                        expired || cert.status === 'CANCELLED'
                                                                            ? 'bg-red-500/20 text-red-400'
                                                                            : cert.status === 'RENEWED'
                                                                                ? 'bg-yellow-500/20 text-yellow-400'
                                                                                : 'bg-green-500/20 text-green-400'
                                                                    }>
                                                                        {expired ? 'Vencido' : cert.status === 'ACTIVE' ? 'Ativo' : cert.status === 'RENEWED' ? 'Renovado' : cert.status === 'CANCELLED' ? 'Cancelado' : cert.status}
                                                                    </Badge>
                                                                </div>
                                                            </Card>
                                                        );
                                                    })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* Aba Férias */}
                        <TabsContent value="ferias" className="mt-0">
                            {loading ? renderLoading() : (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-white mb-2">Períodos de Férias</h3>

                                    {vacations.length === 0 ? renderEmpty('Não há registros de férias para este funcionário.') : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {vacations.map((vac: any) => (
                                                <Card key={vac.id} className="bg-seguranca-black/40 border-gray-700/50 p-4 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 -rotate-45 translate-x-10 -translate-y-10" />
                                                    <div className="flex flex-col h-full justify-between">
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                                                <Palmtree size={18} />
                                                            </div>
                                                            <Badge className={`
                                ${vac.status === 'APROVADO' ? 'bg-green-500/20 text-green-400' :
                                                                    vac.status === 'PENDENTE' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}
                              `}>
                                                                {vac.status}
                                                            </Badge>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Período de Gozo</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Calendar size={14} className="text-gray-400" />
                                                                <span className="text-sm text-white font-mono">
                                                                    {formatDate(vac.dataInicio)} até {formatDate(vac.dataFim)}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-seguranca-lightgray mt-2 italic">Aquisitivo: {vac.periodoAquisitivo}</p>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        {/* Aba Atestados */}
                        <TabsContent value="atestados" className="mt-0">
                            {loading ? renderLoading() : (
                                <div className="space-y-5">
                                    {/* Gráfico de Análise Visual de Atestados & Afastamentos */}
                                    <EmployeeAnalyticsChart
                                        absences={absences}
                                        occurrences={occurrences}
                                        employeeName={displayEmployee.name}
                                    />

                                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                        <Stethoscope size={20} className="text-blue-400" />
                                        Histórico de Atestados Médicos
                                    </h3>

                                    {absences.length === 0 ? renderEmpty('Nenhum atestado médico registrado.') : (
                                        <div className="space-y-3">
                                            {absences.map((abs: any) => (
                                                <Card key={abs.id} className="bg-seguranca-black/40 border-gray-700/50 p-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-start gap-3">
                                                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                                                                <Stethoscope size={18} />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <p className="font-bold text-white text-sm">{abs.title || abs.motivo || 'Atestado Médico'}</p>
                                                                    {abs.source && (
                                                                        <Badge className={
                                                                            abs.source === 'OCORRÊNCIAS'
                                                                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]'
                                                                                : 'bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]'
                                                                        }>
                                                                            {abs.source}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                                                                    <div className="flex items-center gap-1">
                                                                        <Calendar size={12} />
                                                                        <span>{formatDate(abs.dataInicio)} {!abs.dataFim || abs.dataFim === abs.dataInicio ? '' : `até ${formatDate(abs.dataFim)}`}</span>
                                                                    </div>
                                                                    {abs.dias ? <span className="text-gray-300">• {abs.dias} dia(s)</span> : null}
                                                                    {abs.horas ? <span className="text-gray-300">• {abs.horas} hora(s)</span> : null}
                                                                </div>
                                                                {abs.cidCode && (
                                                                    <p className="text-xs text-blue-300 mt-1 font-mono">
                                                                        CID: {abs.cidCode} {abs.cidDescription ? `- ${abs.cidDescription}` : ''}
                                                                    </p>
                                                                )}
                                                                {abs.doctorName && (
                                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                                        Médico: {abs.doctorName} {abs.crm ? `(CRM: ${abs.crm})` : ''}
                                                                    </p>
                                                                )}
                                                                {abs.description && (
                                                                    <p className="text-xs text-gray-300 mt-1">{abs.description}</p>
                                                                )}
                                                                {abs.observations && (
                                                                    <p className="text-xs text-gray-400 mt-1 italic">{abs.observations}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {(abs.documentoUrl || abs.documento) && (
                                                            <Button variant="link" size="sm" className="text-blue-400 hover:text-blue-300 h-auto p-0" asChild>
                                                                <a href={abs.documentoUrl || abs.documento} target="_blank" rel="noopener noreferrer">Ver Anexo</a>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        {/* Aba Disciplinar */}
                        <TabsContent value="disciplinar" className="mt-0">
                            {loading ? renderLoading() : (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-white mb-2">Histórico Disciplinar</h3>

                                    {occurrences.length === 0 ? renderEmpty('Nenhum registro disciplinar cadastrado.') : (
                                        <div className="space-y-3">
                                            {occurrences.map((occ) => (
                                                <Card key={occ.id} className="bg-seguranca-black/40 border-gray-700/50 p-4 border-l-4 border-l-orange-500">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex gap-3">
                                                            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                                                                {occ.type === 'SUSPENSAO' ? <Clock size={18} /> : <AlertTriangle size={18} />}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-white text-sm uppercase tracking-tight">{occ.title}</p>
                                                                <p className="text-xs text-orange-400 font-semibold mb-1">{occ.type}</p>
                                                                <p className="text-xs text-gray-400 line-clamp-2 max-w-lg">{occ.description}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-[10px] text-gray-500 font-mono italic">{formatDate(occ.date)}</span>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        {/* Aba Remanejamentos */}
                        <TabsContent value="remanejamentos" className="mt-0">
                            {loading ? renderLoading() : (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-white mb-2">Histórico de Remanejamentos</h3>

                                    {transfers.length === 0 ? renderEmpty('Nenhum histórico de remanejamento encontrado.') : (
                                        <div className="space-y-3">
                                            {transfers.sort((a, b) => new Date(b.dataRemanejamento).getTime() - new Date(a.dataRemanejamento).getTime()).map((rem) => (
                                                <Card key={rem.id} className="bg-seguranca-black/40 border-gray-700/50 p-4 border-l-4 border-l-blue-500">
                                                    <div className="flex flex-col gap-3">
                                                        <div className="flex items-center justify-between">
                                                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                                                {rem.tipo?.replace(/_/g, ' ')}
                                                            </Badge>
                                                            <span className="text-[10px] text-gray-500 font-mono italic">{formatDate(rem.dataRemanejamento)}</span>
                                                        </div>

                                                        <div className="flex items-center gap-4 justify-center py-2">
                                                            <div className="text-center flex-1">
                                                                <p className="text-[10px] text-gray-500 uppercase font-bold">Origem</p>
                                                                <p className="text-sm text-white font-medium mt-1 truncate">{rem.origem || 'Não informada'}</p>
                                                            </div>

                                                            <div className="flex-shrink-0 text-seguranca-red">
                                                                <MoveHorizontal size={20} className="animate-pulse" />
                                                            </div>

                                                            <div className="text-center flex-1">
                                                                <p className="text-[10px] text-gray-500 uppercase font-bold">Destino</p>
                                                                <p className="text-sm text-seguranca-yellow font-bold mt-1 truncate">{rem.destino || 'Não informado'}</p>
                                                            </div>
                                                        </div>

                                                        {rem.observacao && (
                                                            <p className="text-xs text-gray-400 border-t border-gray-700 pt-2 italic">"{rem.observacao}"</p>
                                                        )}
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        {/* Aba Histórico e Vínculos Anteriores */}
                        <TabsContent value="historico" className="mt-0 space-y-6">
                            {loading ? renderLoading() : (
                                <div className="space-y-6">
                                    {/* Linha do Tempo Funcional & Disciplinar Unificada */}
                                    <div className="space-y-3 pb-6 border-b border-gray-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={18} className="text-seguranca-yellow" />
                                                <h3 className="text-base font-semibold text-white">Linha do Tempo Funcional & Disciplinar</h3>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400">
                                            Histórico cronológico completo unificando admissão, atestados médicos entregues, advertências/suspensões disciplinares e alterações.
                                        </p>
                                        <EmployeeUnifiedTimeline
                                            employee={displayEmployee}
                                            absences={absences}
                                            occurrences={occurrences}
                                            vacations={vacations}
                                            historyItems={historyItems}
                                            employmentPeriods={employmentPeriods}
                                        />
                                    </div>

                                    {/* Seção 1: Períodos / Vínculos Empregatícios */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Briefcase size={18} className="text-seguranca-yellow" />
                                                <h3 className="text-base font-semibold text-white">Vínculos Empregatícios (Contratos)</h3>
                                            </div>
                                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                                                {employmentPeriods.length} Período(s)
                                            </Badge>
                                        </div>

                                        {employmentPeriods.length === 0 ? (
                                            <Card className="bg-seguranca-black/30 border-gray-800 p-4 text-center text-gray-400 text-xs">
                                                Nenhum vínculo anterior registrado para este colaborador.
                                            </Card>
                                        ) : (
                                            <div className="space-y-3">
                                                {employmentPeriods.map((period, idx) => (
                                                    <Card key={period.id || idx} className="bg-seguranca-black/40 border-gray-700/50 p-4 border-l-4 border-l-blue-500">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-gray-800">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <Badge className={
                                                                    period.admissionType === 'READMISSAO'
                                                                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                                                        : period.admissionType === 'PROMOCAO'
                                                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                                                        : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                                                }>
                                                                    {period.admissionTypeLabel || period.admissionType || 'Vínculo Empregatício'}
                                                                </Badge>
                                                                {period.status === 'TERMINATED' ? (
                                                                    <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                                                                        Encerrado / Demitido
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                                                        Ativo
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <span className="text-xs text-gray-400 font-mono">
                                                                {period.hireDate ? formatSystemDate(period.hireDate) : '—'}
                                                                {period.terminationDate ? ` até ${formatSystemDate(period.terminationDate)}` : ' (Atual)'}
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-300 mt-2">
                                                            <div>
                                                                <span className="text-gray-500 block">Empresa:</span>
                                                                <span className="font-medium text-white">{period.companyName || '—'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 block">Cargo / Função:</span>
                                                                <span className="font-medium text-white">{period.positionName || '—'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 block">Posto de Trabalho / Setor:</span>
                                                                <span className="font-medium text-white">
                                                                    {period.workPostName || period.departmentName || '—'}
                                                                </span>
                                                            </div>
                                                            {period.salario != null && (
                                                                <div>
                                                                    <span className="text-gray-500 block">Salário da Época:</span>
                                                                    <span className="font-medium text-seguranca-yellow">
                                                                        R$ {Number(period.salario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {period.registrationNumber && (
                                                                <div>
                                                                    <span className="text-gray-500 block">Matrícula:</span>
                                                                    <span className="font-medium text-white">{period.registrationNumber}</span>
                                                                </div>
                                                            )}
                                                            {period.terminationReason && (
                                                                <div className="col-span-full bg-red-950/20 border border-red-900/30 rounded p-2 mt-1">
                                                                    <span className="text-red-400 font-semibold block">Motivo da Demissão:</span>
                                                                    <span className="text-gray-300">{period.terminationReason}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Seção 2: Histórico de Alterações / Auditoria */}
                                    <div className="space-y-3 pt-4 border-t border-gray-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <History size={18} className="text-purple-400" />
                                                <h3 className="text-base font-semibold text-white">Trilha de Alterações e Promoções</h3>
                                            </div>
                                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                                {historyItems.length} Alteração(ões)
                                            </Badge>
                                        </div>

                                        {historyItems.length === 0 ? renderEmpty('Nenhuma alteração registrada nesta trilha para este funcionário.') : (
                                            <div className="space-y-3">
                                                {historyItems.map((item) => (
                                                    <Card key={item.id} className="bg-seguranca-black/40 border-gray-700/50 p-4 border-l-4 border-l-purple-500">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
                                                                    {item.category === 'LAUDO_PSICOLOGICO' ? <Brain size={18} /> : <History size={18} />}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <Badge className="bg-purple-500/20 text-purple-300 text-[10px]">
                                                                            {item.categoryLabel || item.category}
                                                                        </Badge>
                                                                        <span className="text-xs font-bold text-white">
                                                                            {item.fieldLabel || item.fieldName}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-xs text-gray-300 mt-1 flex flex-wrap items-center gap-1.5">
                                                                        <span className="text-gray-500 line-through">{item.oldValue || '—'}</span>
                                                                        <span className="text-seguranca-yellow font-medium">→ {item.newValue || '—'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <span className="text-[10px] text-gray-400 font-mono">
                                                                    {item.changedAt ? new Date(item.changedAt).toLocaleString('pt-BR') : '-'}
                                                                </span>
                                                                {item.changedByName && (
                                                                    <p className="text-[10px] text-gray-500">Por: {item.changedByName}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};
