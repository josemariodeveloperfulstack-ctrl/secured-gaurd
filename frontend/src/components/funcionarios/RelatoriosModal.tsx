import React, { useState, useMemo, useDeferredValue, useRef, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Download,
    Filter,
    FileSpreadsheet,
    FileText,
    Loader2,
    CheckCircle2,
    Briefcase,
    Building2,
    CalendarDays,
    UserCheck,
    Users,
    Stethoscope,
    ChevronDown,
    ChevronUp,
    RefreshCcw,
    Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { employeeService } from '@/services/employeeService';
import { Employee } from '@/types/employee';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ptBR } from 'date-fns/locale';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

/** Colunas disponíveis para o relatório PDF (chave usada no backend, label exibido) */
const REPORT_COLUMNS: { key: string; label: string }[] = [
    { key: 'name', label: 'Nome' },
    { key: 'registrationNumber', label: 'Matrícula' },
    { key: 'position', label: 'Cargo' },
    { key: 'workPost', label: 'Posto de Trabalho' },
    { key: 'company', label: 'Empresa' },
    { key: 'status', label: 'Status' },
    { key: 'cpf', label: 'CPF' },
    { key: 'rg', label: 'RG' },
    { key: 'birthDate', label: 'Data Nasc.' },
    { key: 'hireDate', label: 'Admissão' },
    { key: 'terminationDate', label: 'Data Rescisão' },
    { key: 'terminationReason', label: 'Motivo Demissão' },
    { key: 'email', label: 'E-mail' },
    { key: 'phone', label: 'Telefone' },
    { key: 'sexo', label: 'Gênero' },
    { key: 'maritalStatus', label: 'Estado Civil' },
    { key: 'salario', label: 'Salário' },
    { key: 'ctps', label: 'CTPS' },
    { key: 'pis', label: 'PIS' },
    { key: 'cbo', label: 'CBO' },
    { key: 'matriculaEsocial', label: 'Matr. eSocial' },
    { key: 'cnhNumber', label: 'CNH' },
    { key: 'cnhCategory', label: 'Categ. CNH' },
    { key: 'cnhExpirationDate', label: 'Validade CNH' },
    { key: 'exameMedicoVencimento', label: 'Próx. ASO' },
    { key: 'proximasFeriasVencimento', label: 'Venc. Férias' },
    { key: 'address', label: 'Endereço' },
    { key: 'nationality', label: 'Nacionalidade' },
    { key: 'motherName', label: 'Nome Mãe' },
    { key: 'fatherName', label: 'Nome Pai' },
];

const DEFAULT_PDF_COLUMNS = ['name', 'registrationNumber', 'position', 'workPost', 'company', 'status'];

interface RelatoriosModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employees: Employee[];
    filterCompanies?: Array<{ id: string; name?: string; sigla?: string }>;
    filterWorkPosts?: Array<{ id: string; name: string }>;
    filterPositions?: Array<{ id: string; name: string }>;
}

export function RelatoriosModal({
    open,
    onOpenChange,
    employees,
    filterCompanies,
    filterWorkPosts,
    filterPositions
}: RelatoriosModalProps) {
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [asoFilter, setAsoFilter] = useState<string>('all');
    const [companyFilter, setCompanyFilter] = useState<string>('all');
    const [workPostFilter, setWorkPostFilter] = useState<string>('all');
    const [positionFilter, setPositionFilter] = useState<string>('all');
    const [genderFilter, setGenderFilter] = useState<string>('all');
    const [terminationReasonFilter, setTerminationReasonFilter] = useState<string>('all');
    const [feriasFilter, setFeriasFilter] = useState<string>('all');

    // New Date Filters
    const [hireDateStart, setHireDateStart] = useState<Date | undefined>(undefined);
    const [hireDateEnd, setHireDateEnd] = useState<Date | undefined>(undefined);
    const [termDateStart, setTermDateStart] = useState<Date | undefined>(undefined);
    const [termDateEnd, setTermDateEnd] = useState<Date | undefined>(undefined);

    const [isGenerating, setIsGenerating] = useState(false);
    const [isFiltersOpen, setIsFiltersOpen] = useState(true);
    const [isColumnsOpen, setIsColumnsOpen] = useState(false);
    const [isOrganizationOpen, setIsOrganizationOpen] = useState(false);
    const [groupBy, setGroupBy] = useState<'FUNCIONARIO' | 'POSTO_TRABALHO'>('FUNCIONARIO');
    const [orderBy, setOrderBy] = useState<'FUNCIONARIO' | 'POSTO_TRABALHO'>('FUNCIONARIO');
    const [progress, setProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const cancelRef = useRef(false);

    // Colunas selecionadas para o PDF (Set para lookup rápido)
    const [selectedColumns, setSelectedColumns] = useState<Set<string>>(() => new Set(DEFAULT_PDF_COLUMNS));

    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [isLoadingAll, setIsLoadingAll] = useState(false);

    // Fetch all employees when modal opens
    useEffect(() => {
        if (open) {
            const fetchAll = async () => {
                setIsLoadingAll(true);
                try {
                    // Fetch up to 10000 employees for the report
                    const data = await employeeService.getAllEmployees({}, 0, 10000);
                    setAllEmployees(data);
                } catch (e) {
                    console.error('Erro ao buscar todos os funcionários para relatório:', e);
                } finally {
                    setIsLoadingAll(false);
                }
            };
            fetchAll();
        } else {
            // Clear when closed to save memory
            setAllEmployees([]);
        }
    }, [open]);

    // Optimized: Pre-process employees to have numeric timestamps for lightning-fast filtering
    const processedEmployees = useMemo(() => {
        return allEmployees.map(emp => {
            // Pre-calculate timestamps to avoid new Date() in the filtering loop
            const hireTime = emp.hireDate ? new Date(emp.hireDate).setHours(0, 0, 0, 0) : undefined;
            const termTime = (emp.dataRescisao || emp.terminationDate)
                ? new Date(emp.dataRescisao || emp.terminationDate!).setHours(0, 0, 0, 0)
                : undefined;
            const asoTime = emp.exameMedicoVencimento
                ? new Date(emp.exameMedicoVencimento).setHours(0, 0, 0, 0)
                : undefined;
            const feriasVencTime = emp.proximasFeriasVencimento
                ? new Date(emp.proximasFeriasVencimento).setHours(0, 0, 0, 0)
                : undefined;

            return {
                ...emp,
                _hireTime: hireTime,
                _termTime: termTime,
                _asoTime: asoTime,
                _feriasVencTime: feriasVencTime
            };
        });
    }, [allEmployees]);

    // Extract unique filter options from the employees list or use provided full lists
    const { companies, workPosts, positions } = useMemo(() => {
        let finalCompanies: string[] = [];
        let finalWorkPosts: string[] = [];
        let finalPositions: string[] = [];

        if (filterCompanies && filterWorkPosts && filterPositions) {
            finalCompanies = filterCompanies.map(c => c.sigla || c.name || '').filter(Boolean).sort();
            finalWorkPosts = filterWorkPosts.map(wp => wp.name).filter(Boolean).sort();
            finalPositions = filterPositions.map(p => p.name).filter(Boolean).sort();
        }

        const comps = new Set<string>(finalCompanies);
        const posts = new Set<string>(finalWorkPosts);
        const pos = new Set<string>(finalPositions);

        allEmployees.forEach(emp => {
            const cName = emp.company?.sigla || emp.company?.name;
            if (cName) comps.add(cName);

            let wpName = typeof emp.workPost === 'string' ? emp.workPost : emp.workPost?.name;
            if (!wpName && emp.department?.name) {
                wpName = emp.department.name;
            }
            if (wpName) posts.add(wpName);

            const posName = typeof emp.position === 'string' ? emp.position : emp.position?.name;
            if (posName) pos.add(posName);
        });

        return {
            companies: Array.from(comps).sort(),
            workPosts: Array.from(posts).sort(),
            positions: Array.from(pos).sort(),
        };
    }, [allEmployees, filterCompanies, filterWorkPosts, filterPositions]);

    // Use deferred value for filtering to keep UI responsive
    // Unified deferred value for all filters - much more efficient than multiple hooks
    const deferredFilters = useDeferredValue({
        status: statusFilter,
        aso: asoFilter,
        company: companyFilter,
        workPost: workPostFilter,
        position: positionFilter,
        gender: genderFilter,
        terminationReason: terminationReasonFilter,
        hireDateStart,
        hireDateEnd,
        termDateStart,
        termDateEnd,
        ferias: feriasFilter
    });

    // Handle Filtering with optimized logic using pre-calculated timestamps
    const filteredEmployees = useMemo(() => {
        const todayTime = new Date().setHours(0, 0, 0, 0);

        // Pre-convert filter dates to timestamps once per memo update
        const hStart = deferredFilters.hireDateStart?.getTime();
        const hEnd = deferredFilters.hireDateEnd?.getTime();
        const tStart = deferredFilters.termDateStart?.getTime();
        const tEnd = deferredFilters.termDateEnd?.getTime();

        return processedEmployees.filter(emp => {
            // Status Filter
            if (deferredFilters.status !== 'all' && emp.status !== deferredFilters.status) return false;

            // ASO Filter
            if (deferredFilters.aso !== 'all') {
                if (!emp._asoTime) {
                    return deferredFilters.aso === 'sem_aso';
                }

                const isExpired = emp._asoTime < todayTime;

                if (deferredFilters.aso === 'vencido' && !isExpired) return false;
                if (deferredFilters.aso === 'valido' && isExpired) return false;
                if (deferredFilters.aso === 'sem_aso') return false;
            }

            // Company Filter
            if (deferredFilters.company !== 'all') {
                const cName = emp.company?.sigla || emp.company?.name || String(emp.company?.id);
                if (cName !== deferredFilters.company) return false;
            }

            // WorkPost Filter
            if (deferredFilters.workPost !== 'all') {
                let wpName = typeof emp.workPost === 'string' ? emp.workPost : emp.workPost?.name;
                if (!wpName && emp.department?.name) {
                    wpName = emp.department.name;
                }
                if (wpName !== deferredFilters.workPost) return false;
            }

            // Position Filter
            if (deferredFilters.position !== 'all') {
                const posName = typeof emp.position === 'string' ? emp.position : emp.position?.name || '';
                if (posName !== deferredFilters.position) return false;
            }

            // Gender Filter
            if (deferredFilters.gender !== 'all') {
                const empGender = emp.sexo || emp.gender || '';
                if (empGender !== deferredFilters.gender && !empGender.startsWith(deferredFilters.gender.charAt(0))) return false;
            }

            // Termination Reason Filter
            if (deferredFilters.terminationReason !== 'all' && emp.terminationReason !== deferredFilters.terminationReason) return false;

            // Hire Date Range Filter
            if (hStart || hEnd) {
                if (!emp._hireTime) return false;
                if (hStart && emp._hireTime < hStart) return false;
                if (hEnd && emp._hireTime > hEnd) return false;
            }

            // Termination Date Range Filter
            if (tStart || tEnd) {
                if (!emp._termTime) return false;
                if (tStart && emp._termTime < tStart) return false;
                if (tEnd && emp._termTime > tEnd) return false;
            }

            // Férias: Férias Vencidas (data limite já passou) / A Vencer (data limite nos próximos 90 dias)
            if (deferredFilters.ferias !== 'all') {
                const ft = (emp as { _feriasVencTime?: number })._feriasVencTime;
                if (deferredFilters.ferias === 'vencidas') {
                    if (ft == null) return false;
                    if (ft >= todayTime) return false; // só quem já passou do prazo
                } else if (deferredFilters.ferias === 'a_vencer') {
                    if (ft == null) return false;
                    if (ft < todayTime || ft > in90Days) return false; // vence entre hoje e 90 dias
                }
            }

            return true;
        });
    }, [
        processedEmployees,
        deferredFilters
    ]);

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'Ativo';
            case 'INACTIVE': return 'Inativo';
            case 'VACATION': return 'Férias';
            case 'MATERNITY_LEAVE': return 'Licença Maternidade';
            case 'MEDICAL_CERTIFICATE': return 'Atestado';
            case 'TERMINATED': return 'Demitido';
            case 'SUSPENDED': return 'Suspenso';
            default: return status || 'Desconhecido';
        }
    };

    // Helper to process data in chunks and update progress
    const processDataInChunks = async <T, R>(items: T[], mapper: (item: T) => R, chunkSize: number = 100): Promise<R[]> => {
        const results: R[] = [];
        const total = items.length;

        for (let i = 0; i < total; i += chunkSize) {
            const chunk = items.slice(i, i + chunkSize);
            const chunkResults = chunk.map(mapper);
            results.push(...chunkResults);

            if (cancelRef.current) {
                throw new Error('Processo cancelado pelo usuário');
            }

            // Progress from 30% to 100%
            setProgress(30 + Math.round(((i + chunk.length) / total) * 70));
            // Let the UI breathe and show the progress modal
            await new Promise(resolve => setTimeout(resolve, 5));
        }

        return results;
    };

    const handleExportExcel = async () => {
        setIsGenerating(true);
        setIsProcessing(true);
        setProgress(0);
        cancelRef.current = false;

        try {
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to allow UI to update

            // Obter os IDs dos funcionários filtrados
            const employeeIds = filteredEmployees.map(e => e.id);
            
            if (employeeIds.length === 0) {
                window.alert('Nenhum funcionário encontrado com os filtros atuais.');
                return;
            }

            // Buscar os dados completos do backend em chunks para evitar sobrecarga
            const fullEmployeesData: any[] = [];
            const chunkSize = 500;
            for (let i = 0; i < employeeIds.length; i += chunkSize) {
                if (cancelRef.current) throw new Error('Processo cancelado pelo usuário');
                const chunkIds = employeeIds.slice(i, i + chunkSize);
                const chunkData = await employeeService.getFullDataForExport(chunkIds);
                if (chunkData && chunkData.length > 0) {
                    fullEmployeesData.push(...chunkData);
                }
                setProgress(Math.round(((i + chunkIds.length) / employeeIds.length) * 30)); // First 30% is fetching data
            }

            if (fullEmployeesData.length === 0) {
                window.alert('Não foi possível carregar os dados dos funcionários.');
                return;
            }

            const dataToExport = await processDataInChunks(fullEmployeesData, (emp) => {
                let age = '';
                if (emp.birthDate) {
                    const birthDate = new Date(emp.birthDate);
                    const diff = Date.now() - birthDate.getTime();
                    age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)).toString();
                }

                const formatDate = (dateStr?: string) => dateStr ? new Date(dateStr).toLocaleDateString() : '';
                const hireDateStr = formatDate(emp.hireDate);
                const asoDateStr = formatDate(emp.exameMedicoVencimento);
                const termDateStr = formatDate(emp.dataRescisao || emp.terminationDate);

                const getAddress = (addr: any) => {
                    if (!addr) return '';
                    if (typeof addr === 'string') return addr;
                    return `${addr.street || ''}, ${addr.number || ''} ${addr.complement ? `- ${addr.complement}` : ''} - ${addr.neighborhood || ''}, ${addr.city || ''}/${addr.state || ''} CEP: ${addr.zipCode || ''}`;
                };

                let dependentes = '';
                if (emp.dependents && emp.dependents.length > 0) {
                    dependentes = emp.dependents.map((d: any) => `${d.name} (${d.relationship}) - Nasc: ${formatDate(d.birthDate)}${d.cpf ? ` CPF: ${d.cpf}` : ''}`).join(' | ');
                }

                return {
                    'Matrícula': emp.matricula || emp.registrationNumber || '',
                    'Matrícula eSocial': emp.matriculaEsocial || '',
                    'Status': getStatusLabel(emp.status),
                    'Nome Completo': emp.name,
                    'Empresa': emp.company?.sigla || emp.company?.name || emp.empresaNome || '',
                    'CNPJ Empresa': emp.company?.cnpj || emp.empresaCnpj || '',
                    'Posto de Trabalho': (() => {
                const wp = typeof emp.workPost === 'string' ? emp.workPost : (emp.workPost?.name || emp.department?.name || '');
                return wp && String(wp).trim() ? wp : 'Não alocado';
              })(),
                    'Cargo': typeof emp.position === 'string' ? emp.position : emp.position?.name || '',
                    'CBO': emp.cbo || '',
                    'Admissão': hireDateStr,
                    'Data Rescisão': termDateStr,
                    'Motivo Demissão': emp.terminationReason || '',
                    'CPF': emp.cpf || (emp as any).document || '',
                    'RG': emp.rg || '',
                    'Data Nascimento': formatDate(emp.birthDate),
                    'Gênero/Sexo': emp.sexo || emp.gender || '',
                    'Estado Civil': emp.maritalStatus || '',
                    'Grau de Instrução': emp.grauInstrucao || '',
                    'Nacionalidade': emp.nationality || '',
                    'Naturalidade': emp.naturalidade || '',
                    'Nome da Mãe': emp.motherName || emp.nomeMae || '',
                    'Nome do Pai': emp.fatherName || emp.nomePai || '',
                    'Telefone': emp.phone || emp.telefoneContato || '',
                    'Email': emp.email || '',
                    'CEP': emp.address?.zipCode || '',
                    'Endereço': getAddress(emp.address),
                    'Número': emp.address?.number || '',
                    'Complemento': emp.address?.complement || '',
                    'Bairro': emp.address?.neighborhood || '',
                    'Cidade': emp.address?.city || '',
                    'Estado': emp.address?.state || '',
                    'CTPS': emp.ctps || '',
                    'Série CTPS': emp.ctpsSerie || emp.ctpsSeries || '',
                    'UF CTPS': emp.ctpsUf || '',
                    'Data Emissão CTPS': formatDate(emp.ctpsIssueDate),
                    'Órgão Emissor CTPS': emp.ctpsIssuingAgency || '',
                    'PIS/PASEP': emp.pis || '',
                    'Data Cadastro PIS': formatDate(emp.pisDataCadastro),
                    'Título de Eleitor': emp.tituloEleitor || '',
                    'Zona Eleitoral': emp.tituloEleitorZona || '',
                    'Seção Eleitoral': emp.tituloEleitorSecao || '',
                    'Certificado Militar': emp.certificadoMilitar || '',
                    'CNH': emp.cnh || emp.cnhNumber || '',
                    'Categoria CNH': emp.cnhCategory || '',
                    'Validade CNH': formatDate(emp.cnhExpirationDate),
                    'Salário': emp.salario ? `R$ ${emp.salario}` : '',
                    'Período de Pagamento': emp.periodoPagamento || '',
                    'Horário de Trabalho': emp.horarioTrabalho || '',
                    'Intervalo Trabalho': emp.horarioTrabalhoIntervalo || '',
                    'Escala de Trabalho': emp.escalaTrabalho || emp.currentScale || '',
                    'Dias de Trabalho': emp.diasTrabalho || '',
                    'Folga Semanal': emp.folgaSemanal || '',
                    'Banco': emp.bankData?.bank || emp.bankInfo?.bank || '',
                    'Agência': emp.bankData?.agency || emp.bankInfo?.agency || '',
                    'Conta': emp.bankData?.account || emp.bankInfo?.account || '',
                    'Tipo Conta': emp.bankData?.type || emp.bankInfo?.accountType || '',
                    'Chave PIX': emp.bankData?.chavePix || emp.bankInfo?.pixKey || '',
                    'Optante FGTS': emp.fgtsOptante ? 'Sim' : 'Não',
                    'Data Opção FGTS': formatDate(emp.fgtsDataOpcao),
                    'Banco Depositário FGTS': emp.fgtsBancoDepositario || '',
                    'Data Referência Exame': formatDate(emp.exameMedicoData),
                    'Tipo do ASO': emp.exameMedicoTipo || '',
                    'Próximo ASO': asoDateStr,
                    'Vencimento Próx. Férias': formatDate(emp.proximasFeriasVencimento),
                    'Dependentes': dependentes,
                    'Cônjuge': emp.spouseName || '',
                    'Cônjuge CPF': emp.spouseCpf || '',
                    'Filhos Brasileiros?': emp.temFilhosBrasileiros ? 'Sim' : 'Não',
                    'Qtd Filhos Brasileiros': emp.quantidadeFilhosBrasileiros || '',
                    'Idade': age,
                };
            }, 100);

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Funcionários");

            const companyTag = companyFilter !== 'all' ? `-${companyFilter}` : '';
            XLSX.writeFile(workbook, `relatorio-funcionarios${companyTag}-${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error: any) {
            console.error('Erro ao gerar Excel:', error);
            if (error.message !== 'Processo cancelado pelo usuário') {
                // Aqui você poderia mostrar um toast de erro se tivesse um sistema de toasts
            }
        } finally {
            setIsProcessing(false);
            setIsGenerating(false);
            setProgress(0);
        }
    };

    const handleExportPDF = async () => {
        const employeeIds = filteredEmployees.map(e => e.id);
        if (employeeIds.length === 0) {
            window.alert('Nenhum funcionário encontrado com os filtros atuais.');
            return;
        }

        const companyId = companyFilter !== 'all'
            ? allEmployees.find(emp => (emp.company?.sigla || emp.company?.name || String(emp.company?.id)) === companyFilter)?.company?.id
            : null;

        setIsProcessing(true);
        setProgress(0);
        setIsGenerating(true);
        cancelRef.current = false;

        try {
            setProgress(30);
            const columnsToSend = selectedColumns.size > 0 ? Array.from(selectedColumns) : DEFAULT_PDF_COLUMNS;
            const blob = await employeeService.exportEmployeesReportPdf(companyId ?? undefined, employeeIds, columnsToSend, groupBy, orderBy);
            setProgress(80);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Relatorio_Funcionarios_${new Date().toISOString().split('T')[0]}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            setProgress(100);
        } catch (error: any) {
            console.error('Erro ao gerar PDF:', error);
            if (error.message !== 'Processo cancelado pelo usuário') {
                window.alert(error instanceof Error ? error.message : 'Erro ao gerar relatório PDF.');
            }
        } finally {
            setIsGenerating(false);
            setIsProcessing(false);
            setProgress(0);
        }
    };

    const resetFilters = () => {
        setStatusFilter('all');
        setAsoFilter('all');
        setCompanyFilter('all');
        setWorkPostFilter('all');
        setPositionFilter('all');
        setGenderFilter('all');
        setTerminationReasonFilter('all');
        setFeriasFilter('all');
        setHireDateStart(undefined);
        setHireDateEnd(undefined);
        setTermDateStart(undefined);
        setTermDateEnd(undefined);
    };

    const toggleColumn = (key: string) => {
        setSelectedColumns(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const selectAllColumns = () => setSelectedColumns(new Set(REPORT_COLUMNS.map(c => c.key)));
    const selectDefaultColumns = () => setSelectedColumns(new Set(DEFAULT_PDF_COLUMNS));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl bg-seguranca-graphite border-gray-600 p-0 overflow-hidden w-full h-[90vh] flex flex-col mx-4 sm:mx-0">
                <DialogHeader className="bg-gradient-to-r shrink-0 from-seguranca-red to-seguranca-yellow p-4 sm:p-6 text-white z-10 border-b-0 shadow-lg">
                    <div className="flex flex-col gap-1">
                        <DialogTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl md:text-2xl font-bold text-white">
                            <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg shrink-0">
                                <FileSpreadsheet className="text-white h-4 w-4 sm:h-6 sm:w-6" />
                            </div>
                            <div className="flex flex-col flex-1 sm:flex-row sm:items-center sm:justify-between w-full">
                                <span>Relatórios de Funcionários</span>
                                <Badge variant="outline" className="bg-white/20 text-white border-white/50 text-xs sm:text-sm py-1 px-3 mt-2 sm:mt-0 w-fit">
                                    {filteredEmployees.length} {filteredEmployees.length === 1 ? 'resultado' : 'resultados'}
                                </Badge>
                            </div>
                        </DialogTitle>
                        <p className="text-white/90 text-xs sm:text-sm mt-1 flex items-center gap-2">
                            Selecione os filtros abaixo para gerar seu relatório personalizado.
                        </p>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-seguranca-graphite scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                    <Collapsible
                        open={isFiltersOpen}
                        onOpenChange={setIsFiltersOpen}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between gap-2 mb-4 pb-2 border-b border-gray-600">
                            <div className="flex items-center gap-2">
                                <Filter className="h-5 w-5 text-seguranca-yellow" />
                                <h3 className="text-lg font-semibold text-white">Filtros de Pesquisa</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={resetFilters}
                                    className="text-xs text-seguranca-yellow hover:bg-seguranca-yellow/10 h-8 font-bold"
                                >
                                    <RefreshCcw className="h-3 w-3 mr-1" />
                                    LIMPAR FILTROS
                                </Button>
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white">
                                        {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </Button>
                                </CollapsibleTrigger>
                            </div>
                        </div>

                        <CollapsibleContent className="space-y-6 animate-in fade-in duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-5">
                                {/* Status */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-gray-400 flex items-center gap-2 uppercase tracking-wider">
                                        <Users className="h-3 w-3" /> Status
                                    </Label>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-full bg-seguranca-black border-gray-600 text-gray-200">
                                            <SelectValue placeholder="Selecione um status" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-seguranca-graphite border-gray-600 text-gray-200">
                                            <SelectItem value="all">Todos os Status</SelectItem>
                                            <SelectItem value="ACTIVE">Ativos</SelectItem>
                                            <SelectItem value="INACTIVE">Inativos</SelectItem>
                                            <SelectItem value="VACATION">Em Férias</SelectItem>
                                            <SelectItem value="MATERNITY_LEAVE">Licença Maternidade</SelectItem>
                                            <SelectItem value="MEDICAL_CERTIFICATE">Atestado Médico</SelectItem>
                                            <SelectItem value="TERMINATED">Demitidos</SelectItem>
                                            <SelectItem value="SUSPENDED">Suspensos</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* ASO */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-gray-400 flex items-center gap-2 uppercase tracking-wider">
                                        <Stethoscope className="h-3 w-3" /> Situação ASO
                                    </Label>
                                    <Select value={asoFilter} onValueChange={setAsoFilter}>
                                        <SelectTrigger className="w-full bg-seguranca-black border-gray-600 text-gray-200">
                                            <SelectValue placeholder="Situação Exame" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-seguranca-graphite border-gray-600 text-gray-200">
                                            <SelectItem value="all">Todas as Situações</SelectItem>
                                            <SelectItem value="valido">ASO Válido (No Prazo)</SelectItem>
                                            <SelectItem value="vencido">ASO Vencido</SelectItem>
                                            <SelectItem value="sem_aso">Sem Data Informada</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Férias */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-gray-400 flex items-center gap-2 uppercase tracking-wider">
                                        <Calendar className="h-3 w-3" /> Férias
                                    </Label>
                                    <Select value={feriasFilter} onValueChange={setFeriasFilter}>
                                        <SelectTrigger className="w-full bg-seguranca-black border-gray-600 text-gray-200">
                                            <SelectValue placeholder="Situação de Férias" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-seguranca-graphite border-gray-600 text-gray-200">
                                            <SelectItem value="all">Todas</SelectItem>
                                            <SelectItem value="vencidas">Férias Vencidas</SelectItem>
                                            <SelectItem value="a_vencer">A Vencer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Company */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-gray-400 flex items-center gap-2 uppercase tracking-wider">
                                        <Building2 className="h-3 w-3" /> Empresa
                                    </Label>
                                    <Select value={companyFilter} onValueChange={setCompanyFilter}>
                                        <SelectTrigger className="w-full bg-seguranca-black border-gray-600 text-gray-200">
                                            <SelectValue placeholder="Filtrar por empresa" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-seguranca-graphite border-gray-600 text-gray-200">
                                            <SelectItem value="all">Todas as Empresas</SelectItem>
                                            {companies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Work Post */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-gray-400 flex items-center gap-2 uppercase tracking-wider">
                                        <Briefcase className="h-3 w-3" /> Posto de Trabalho
                                    </Label>
                                    <Select value={workPostFilter} onValueChange={setWorkPostFilter}>
                                        <SelectTrigger className="w-full bg-seguranca-black border-gray-600 text-gray-200">
                                            <SelectValue placeholder="Filtrar por posto" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-seguranca-graphite border-gray-600 text-gray-200">
                                            <SelectItem value="all">Todos os Postos</SelectItem>
                                            {workPosts.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Position */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-gray-400 flex items-center gap-2 uppercase tracking-wider">
                                        <UserCheck className="h-3 w-3" /> Cargo
                                    </Label>
                                    <Select value={positionFilter} onValueChange={setPositionFilter}>
                                        <SelectTrigger className="w-full bg-seguranca-black border-gray-600 text-gray-200">
                                            <SelectValue placeholder="Filtrar por cargo" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-seguranca-graphite border-gray-600 text-gray-200">
                                            <SelectItem value="all">Todos os Cargos</SelectItem>
                                            {positions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Gender */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-gray-400 flex items-center gap-2 uppercase tracking-wider">
                                        <UserCheck className="h-3 w-3" /> Gênero
                                    </Label>
                                    <Select value={genderFilter} onValueChange={setGenderFilter}>
                                        <SelectTrigger className="w-full bg-seguranca-black border-gray-600 text-gray-200">
                                            <SelectValue placeholder="Gênero" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-seguranca-graphite border-gray-600 text-gray-200">
                                            <SelectItem value="all">Todos os Gêneros</SelectItem>
                                            <SelectItem value="M">Masculino</SelectItem>
                                            <SelectItem value="F">Feminino</SelectItem>
                                            <SelectItem value="OUTRO">Outro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Hire Date Range */}
                                <div className="lg:col-span-2 space-y-2">
                                    <Label className="text-xs font-medium text-gray-400 flex items-center gap-2 uppercase tracking-wider">
                                        <CalendarDays className="h-3 w-3" /> Intervalo de Admissão (Início / Fim)
                                    </Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="w-full">
                                            <ReactDatePicker
                                                selected={hireDateStart}
                                                onChange={(date: Date | null) => setHireDateStart(date || undefined)}
                                                dateFormat="dd/MM/yyyy"
                                                locale={ptBR}
                                                placeholderText="Data Inicial"
                                                className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-seguranca-yellow focus:border-seguranca-yellow bg-seguranca-black !text-seguranca-lightgray !placeholder:text-gray-400 font-medium text-sm h-10"
                                                wrapperClassName="w-full"
                                            />
                                        </div>
                                        <div className="w-full">
                                            <ReactDatePicker
                                                selected={hireDateEnd}
                                                onChange={(date: Date | null) => setHireDateEnd(date || undefined)}
                                                dateFormat="dd/MM/yyyy"
                                                locale={ptBR}
                                                placeholderText="Data Final"
                                                className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-seguranca-yellow focus:border-seguranca-yellow bg-seguranca-black !text-seguranca-lightgray !placeholder:text-gray-400 font-medium text-sm h-10"
                                                wrapperClassName="w-full"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Termination Reason - Conditional */}
                                {(statusFilter === 'TERMINATED' || statusFilter === 'all') && (
                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium text-gray-400 flex items-center gap-2 uppercase tracking-wider">
                                            <RefreshCcw className="h-3 w-3" /> Motivo da Demissão
                                        </Label>
                                        <Select value={terminationReasonFilter} onValueChange={setTerminationReasonFilter}>
                                            <SelectTrigger className="w-full bg-seguranca-black border-gray-600 text-gray-200">
                                                <SelectValue placeholder="Selecione um motivo" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-seguranca-graphite border-gray-600 text-gray-200 max-h-[300px]">
                                                <SelectItem value="all">Todos os Motivos</SelectItem>
                                                <SelectItem value="Dispensa sem Justa Causa">Dispensa sem Justa Causa</SelectItem>
                                                <SelectItem value="Dispensa por Justa Causa">Dispensa por Justa Causa</SelectItem>
                                                <SelectItem value="Pedido de Demissão">Pedido de Demissão</SelectItem>
                                                <SelectItem value="Rescisão por Comum Acordo (Reforma Trabalhista)">Rescisão por Comum Acordo</SelectItem>
                                                <SelectItem value="Término de Contrato de Experiência (Prazo Determinado)">Término de Contrato de Exp.</SelectItem>
                                                <SelectItem value="Rescisão Antecipada do Contrato de Experiência">Rescisão Antecipada de Exp.</SelectItem>
                                                <SelectItem value="Rescisão Indireta">Rescisão Indireta</SelectItem>
                                                <SelectItem value="Falecimento">Falecimento</SelectItem>
                                                <SelectItem value="Aposentadoria">Aposentadoria</SelectItem>
                                                <SelectItem value="Performance Insuficiente">Performance Insuficiente</SelectItem>
                                                <SelectItem value="Corte de Custo">Corte de Custo</SelectItem>
                                                <SelectItem value="Saúde / Motivos Médicos">Saúde / Motivos Médicos</SelectItem>
                                                <SelectItem value="Mudança de Cidade/País">Mudança de Cidade/País</SelectItem>
                                                <SelectItem value="Conflitos Internos / Liderança">Conflitos Internos / Liderança</SelectItem>
                                                <SelectItem value="Falta de Fit Cultural">Falta de Fit Cultural</SelectItem>
                                                <SelectItem value="Transição de Carreira">Transição de Carreira</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                            </div>
                        </CollapsibleContent>
                    </Collapsible>

                    {/* Organização do Relatório */}
                    <Collapsible
                        open={isOrganizationOpen}
                        onOpenChange={setIsOrganizationOpen}
                        className="mt-6 space-y-4"
                    >
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-600">
                            <div className="flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-seguranca-yellow" />
                                <h3 className="text-lg font-semibold text-white">Organização do Relatório</h3>
                            </div>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white">
                                    {isOrganizationOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                            </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent>
                            <p className="text-sm text-gray-400 mb-3">
                                Defina como o relatório será organizado e ordenado. Ordenação alfabética aplicada automaticamente.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-gray-400 flex items-center gap-2 uppercase tracking-wider">
                                        Organizar por
                                    </Label>
                                    <Select value={groupBy} onValueChange={(v: 'FUNCIONARIO' | 'POSTO_TRABALHO') => setGroupBy(v)}>
                                        <SelectTrigger className="w-full bg-seguranca-black border-gray-600 text-gray-200">
                                            <SelectValue placeholder="Organizar por" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-seguranca-graphite border-gray-600 text-gray-200">
                                            <SelectItem value="FUNCIONARIO">Funcionário (todos os postos que já passou)</SelectItem>
                                            <SelectItem value="POSTO_TRABALHO">Posto de Trabalho</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-gray-400 flex items-center gap-2 uppercase tracking-wider">
                                        Ordenar por (alfabética)
                                    </Label>
                                    <Select value={orderBy} onValueChange={(v: 'FUNCIONARIO' | 'POSTO_TRABALHO') => setOrderBy(v)}>
                                        <SelectTrigger className="w-full bg-seguranca-black border-gray-600 text-gray-200">
                                            <SelectValue placeholder="Ordenar por" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-seguranca-graphite border-gray-600 text-gray-200">
                                            <SelectItem value="FUNCIONARIO">Funcionário</SelectItem>
                                            <SelectItem value="POSTO_TRABALHO">Posto de Trabalho</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>

                    {/* Colunas do Relatório PDF */}
                    <Collapsible
                        open={isColumnsOpen}
                        onOpenChange={setIsColumnsOpen}
                        className="mt-6 space-y-4"
                    >
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-600">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-seguranca-yellow" />
                                <h3 className="text-lg font-semibold text-white">Colunas do Relatório PDF</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={selectDefaultColumns}
                                    className="text-xs text-seguranca-yellow hover:bg-seguranca-yellow/10 h-8 font-bold"
                                >
                                    Padrão
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={selectAllColumns}
                                    className="text-xs text-seguranca-yellow hover:bg-seguranca-yellow/10 h-8 font-bold"
                                >
                                    Todas
                                </Button>
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white">
                                        {isColumnsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </Button>
                                </CollapsibleTrigger>
                            </div>
                        </div>
                        <CollapsibleContent>
                            <p className="text-sm text-gray-400 mb-3">
                                Marque as colunas que deseja incluir no PDF. O relatório será gerado apenas com os campos selecionados.
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                {REPORT_COLUMNS.map(({ key, label }) => (
                                    <label
                                        key={key}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                                            "hover:bg-seguranca-black/50 border border-transparent",
                                            selectedColumns.has(key) && "bg-seguranca-yellow/10 border-seguranca-yellow/30"
                                        )}
                                    >
                                        <Checkbox
                                            checked={selectedColumns.has(key)}
                                            onCheckedChange={() => toggleColumn(key)}
                                            className="border-gray-500 data-[state=checked]:bg-seguranca-yellow data-[state=checked]:border-seguranca-yellow"
                                        />
                                        <span className="text-sm text-gray-200 truncate">{label}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {selectedColumns.size} coluna(s) selecionada(s)
                            </p>
                        </CollapsibleContent>
                    </Collapsible>

                    <div className="mt-8 border-t border-gray-600 pt-6">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Resumo da Seleção Atual</span>
                        </div>
                        <div className="bg-seguranca-black/30 rounded-xl p-4 border border-gray-600 flex flex-wrap gap-2">
                            {statusFilter !== 'all' && <Badge className="bg-seguranca-yellow text-seguranca-graphite border-0 font-bold uppercase">Status: {getStatusLabel(statusFilter)}</Badge>}
                            {feriasFilter !== 'all' && <Badge variant="outline" className="text-seguranca-yellow border-seguranca-yellow/40 font-bold">FÉRIAS: {feriasFilter === 'vencidas' ? 'Vencidas' : 'A Vencer'}</Badge>}
                            {companyFilter !== 'all' && <Badge variant="outline" className="text-seguranca-yellow border-seguranca-yellow/40 font-bold">EMPRESA: {companyFilter}</Badge>}
                            {workPostFilter !== 'all' && <Badge variant="outline" className="text-white border-white/20">POSTO: {workPostFilter}</Badge>}
                            {isLoadingAll ? (
                                <span className="text-seguranca-yellow text-sm font-bold animate-pulse flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando base completa...
                                </span>
                            ) : filteredEmployees.length === 0 ? (
                                <span className="text-seguranca-red text-sm font-bold animate-pulse">Nenhum funcionário encontrado com estes filtros.</span>
                            ) : (
                                <span className="text-gray-400 text-sm italic">O relatório incluirá {filteredEmployees.length} registros.</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-6 bg-seguranca-graphite border-t border-gray-600 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-2xl">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-gray-400 hover:text-white hover:bg-seguranca-black order-2 sm:order-1 font-medium"
                    >
                        Fechar Janela
                    </Button>

                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto order-1 sm:order-2">
                        <Button
                            onClick={handleExportPDF}
                            disabled={isLoadingAll || filteredEmployees.length === 0 || isGenerating}
                            className="flex-1 sm:flex-none border-seguranca-red text-seguranca-red hover:bg-seguranca-red hover:text-white transition-all duration-300 font-bold"
                            variant="outline"
                        >
                            {isGenerating ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <FileText className="h-5 w-5 mr-2" />}
                            GERAR PDF
                        </Button>
                        <Button
                            onClick={handleExportExcel}
                            disabled={isLoadingAll || filteredEmployees.length === 0 || isGenerating}
                            className="flex-1 sm:flex-none bg-gradient-to-r from-seguranca-red to-seguranca-darkred hover:shadow-seguranca-red/40 hover:scale-[1.02] text-white shadow-lg active:scale-100 transition-all duration-300 font-bold"
                        >
                            {isGenerating ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Download className="h-5 w-5 mr-2" />}
                            EXPORTAR EXCEL
                        </Button>
                    </div>
                </div>
            </DialogContent>

            {/* Processing Modal - Overlay and Progress */}
            <Dialog open={isProcessing} onOpenChange={() => { }}>
                <DialogContent
                    className="sm:max-w-[400px] bg-seguranca-dark/95 backdrop-blur-xl border-seguranca-gray/20 text-white flex flex-col items-center py-12 rounded-2xl shadow-2xl [&>button]:hidden"
                >
                    <div className="flex flex-col items-center gap-6 w-full px-6">
                        <div className="relative flex items-center justify-center">
                            <div className="absolute inset-0 bg-seguranca-orange/20 blur-2xl rounded-full" />
                            <RefreshCcw className="w-12 h-12 text-seguranca-orange animate-spin relative z-10" />
                        </div>

                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-bold tracking-tight bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                                Gerando Relatório
                            </h3>
                            <p className="text-sm text-seguranca-lightgray/80">
                                Estamos consolidando as informações para você.
                            </p>
                        </div>

                        <div className="w-full space-y-5 pt-4">
                            <div className="flex justify-between items-end">
                                <span className="text-xs uppercase tracking-widest text-seguranca-lightgray/50 font-semibold">
                                    Processando registros
                                </span>
                                <span className="text-2xl font-black text-seguranca-orange font-mono leading-none">
                                    {progress}%
                                </span>
                            </div>

                            <div className="relative h-2 w-full bg-seguranca-gray/20 rounded-full overflow-hidden">
                                <div
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-seguranca-orange to-orange-400 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            <p className="text-[10px] text-center text-seguranca-lightgray/40 uppercase tracking-tighter pt-2">
                                Por favor, mantenha esta janela aberta
                            </p>

                            <div className="pt-4 flex justify-center">
                                <Button
                                    variant="default"
                                    onClick={() => cancelRef.current = true}
                                    className="bg-seguranca-red hover:bg-red-700 text-white shadow-lg text-xs font-bold uppercase tracking-widest px-8 transition-colors duration-200"
                                >
                                    Cancelar Processamento
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}
