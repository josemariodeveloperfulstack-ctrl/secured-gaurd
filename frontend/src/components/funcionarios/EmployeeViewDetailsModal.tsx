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
    Briefcase
} from 'lucide-react';
import { Employee } from '@/types/employee';
import { EmployeeDocuments } from './EmployeeDocuments';
import dependentService from '@/services/dependentService';
import { sstService, MedicalExam } from '@/services/sstService';
import { feriasService } from '@/services/feriasService';
import { occurrenceService, Occurrence } from '@/services/occurrenceService';
import { remanejamentoService, Remanejamento } from '@/services/remanejamentoService';
import timeRecordService, { TimeRecord } from '@/services/timeRecordService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCPF, formatRG, formatPhone } from '@/utils/formatters';

interface EmployeeViewDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee | null;
    onEdit: (employee: Employee) => void;
}

export const EmployeeViewDetailsModal: React.FC<EmployeeViewDetailsModalProps> = ({
    open,
    onOpenChange,
    employee,
    onEdit,
}) => {
    const [activeTab, setActiveTab] = useState('dados');
    const [loading, setLoading] = useState(false);

    // Data states
    const [dependents, setDependents] = useState<any[]>([]);
    const [exams, setExams] = useState<MedicalExam[]>([]);
    const [vacations, setVacations] = useState<any[]>([]);
    const [absences, setAbsences] = useState<any[]>([]);
    const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
    const [transfers, setTransfers] = useState<Remanejamento[]>([]);
    const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [generatingReport, setGeneratingReport] = useState(false);

    useEffect(() => {
        if (open && employee?.id) {
            loadTabData();
        }
    }, [open, employee, activeTab, selectedMonth, selectedYear]);

    const loadTabData = async () => {
        if (!employee?.id) return;

        setLoading(true);
        try {
            switch (activeTab) {
                case 'dependentes':
                    const deps = await dependentService.getDependentsByEmployee(employee.id);
                    setDependents(deps);
                    break;
                case 'aso':
                    const medExams = await sstService.getMedicalExamsByEmployee(employee.id);
                    setExams(medExams);
                    break;
                case 'ferias':
                    const vacs = await feriasService.getFeriasByEmployee(employee.id);
                    setVacations(vacs);
                    break;
                case 'atestados':
                    const abs = await feriasService.getAfastamentosByEmployee(employee.id);
                    setAbsences(abs.filter((a: any) => a.absenceType === 'SICK_LEAVE' || a.tipo === 'ATESTADO'));
                    break;
                case 'disciplinar':
                    const occs = await occurrenceService.getOccurrences({ employeeId: employee.id });
                    setOccurrences(occs.filter(o => o.type === 'ADVERTENCIA' || o.type === 'SUSPENSAO' || o.type === 'PUNICAO'));
                    break;
                case 'remanejamentos':
                    const rems = await remanejamentoService.getRemanejamentosByEmployee(employee.id);
                    setTransfers(rems);
                    break;
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

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        try {
            return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
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
                                    {employee.name}
                                </DialogTitle>
                                <DialogDescription className="text-seguranca-lightgray flex flex-wrap items-center gap-x-4 gap-y-1">
                                    <span className="flex items-center gap-1 font-mono">
                                        <Briefcase size={14} className="text-seguranca-yellow" />
                                        Mat: {employee.registrationNumber || 'N/A'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Building size={14} className="text-seguranca-yellow" />
                                        {employee.company?.sigla || 'N/A'}
                                    </span>
                                    <Badge className={`
                    ${employee.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                                            employee.status === 'TERMINATED' ? 'bg-red-500/20 text-red-400' :
                                                'bg-yellow-500/20 text-yellow-400'}
                  `}>
                                        {employee.status === 'ACTIVE' ? 'Ativo' :
                                            employee.status === 'TERMINATED' ? 'Demitido' : 'Outro'}
                                    </Badge>
                                </DialogDescription>
                            </div>
                        </div>
                        <Button
                            onClick={() => onEdit(employee)}
                            className="bg-seguranca-red hover:bg-seguranca-darkred text-white w-full md:w-auto"
                        >
                            <Edit size={18} className="mr-2" /> Editar Dados
                        </Button>
                    </div>
                </DialogHeader>

                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="flex-1 h-full flex flex-col md:flex-row xl:flex-col overflow-hidden min-h-0"
                >
                    {/* MOBILE NAVIGATION: Select (Visible only on < md) */}
                    <div className="md:hidden px-6 py-4 border-b border-gray-700 bg-seguranca-graphite/50">
                        <Select value={activeTab} onValueChange={setActiveTab}>
                            <SelectTrigger className="w-full bg-seguranca-black border-gray-600">
                                <SelectValue placeholder="Selecionar categoria" />
                            </SelectTrigger>
                            <SelectContent className="bg-seguranca-black border-gray-600">
                                <SelectItem value="dados"><div className="flex items-center"><User size={16} className="mr-2" /> Dados</div></SelectItem>
                                <SelectItem value="documentos"><div className="flex items-center"><FileText size={16} className="mr-2" /> Documentos</div></SelectItem>
                                <SelectItem value="ponto"><div className="flex items-center"><Clock size={16} className="mr-2" /> Ponto</div></SelectItem>
                                <SelectItem value="dependentes"><div className="flex items-center"><Users size={16} className="mr-2" /> Dependentes</div></SelectItem>
                                <SelectItem value="aso"><div className="flex items-center"><HeartPulse size={16} className="mr-2" /> ASO</div></SelectItem>
                                <SelectItem value="ferias"><div className="flex items-center"><Palmtree size={16} className="mr-2" /> Férias</div></SelectItem>
                                <SelectItem value="atestados"><div className="flex items-center"><Stethoscope size={16} className="mr-2" /> Atestados</div></SelectItem>
                                <SelectItem value="disciplinar"><div className="flex items-center"><AlertTriangle size={16} className="mr-2" /> Disciplinar</div></SelectItem>
                                <SelectItem value="remanejamentos"><div className="flex items-center"><MoveHorizontal size={16} className="mr-2" /> Remanejamentos</div></SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* TABLET NAVIGATION: Vertical Tabs (Visible only on md to xl) */}
                    <div className="hidden md:flex xl:hidden w-64 border-r border-gray-700 bg-seguranca-graphite/30 shrink-0 overflow-hidden">
                        <ScrollArea className="w-full">
                            <TabsList className="flex flex-col h-auto bg-transparent gap-1 p-4 justify-start items-stretch">
                                <TabsTrigger value="dados" className="justify-start data-[state=active]:bg-seguranca-red data-[state=active]:text-white rounded-md px-4 py-3 transition-all">
                                    <User size={16} className="mr-3" /> Dados
                                </TabsTrigger>
                                <TabsTrigger value="documentos" className="justify-start data-[state=active]:bg-seguranca-red data-[state=active]:text-white rounded-md px-4 py-3 transition-all">
                                    <FileText size={16} className="mr-3" /> Documentos
                                </TabsTrigger>
                                <TabsTrigger value="ponto" className="justify-start data-[state=active]:bg-seguranca-red data-[state=active]:text-white rounded-md px-4 py-3 transition-all">
                                    <Clock size={16} className="mr-3" /> Ponto
                                </TabsTrigger>
                                <TabsTrigger value="dependentes" className="justify-start data-[state=active]:bg-seguranca-red data-[state=active]:text-white rounded-md px-4 py-3 transition-all">
                                    <Users size={16} className="mr-3" /> Dependentes
                                </TabsTrigger>
                                <TabsTrigger value="aso" className="justify-start data-[state=active]:bg-seguranca-red data-[state=active]:text-white rounded-md px-4 py-3 transition-all">
                                    <HeartPulse size={16} className="mr-3" /> ASO
                                </TabsTrigger>
                                <TabsTrigger value="ferias" className="justify-start data-[state=active]:bg-seguranca-red data-[state=active]:text-white rounded-md px-4 py-3 transition-all">
                                    <Palmtree size={16} className="mr-3" /> Férias
                                </TabsTrigger>
                                <TabsTrigger value="atestados" className="justify-start data-[state=active]:bg-seguranca-red data-[state=active]:text-white rounded-md px-4 py-3 transition-all">
                                    <Stethoscope size={16} className="mr-3" /> Atestados
                                </TabsTrigger>
                                <TabsTrigger value="disciplinar" className="justify-start data-[state=active]:bg-seguranca-red data-[state=active]:text-white rounded-md px-4 py-3 transition-all">
                                    <AlertTriangle size={16} className="mr-3" /> Disciplinar
                                </TabsTrigger>
                                <TabsTrigger value="remanejamentos" className="justify-start data-[state=active]:bg-seguranca-red data-[state=active]:text-white rounded-md px-4 py-3 transition-all">
                                    <MoveHorizontal size={16} className="mr-3" /> Remanejamentos
                                </TabsTrigger>
                            </TabsList>
                        </ScrollArea>
                    </div>

                    {/* DESKTOP NAVIGATION: Horizontal Scroll Tabs (Visible only on xl+) */}
                    <div className="hidden xl:block border-b border-gray-700 relative shrink-0">
                        {/* Indicadores de Scroll Sombreados */}
                        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-seguranca-graphite to-transparent z-10 pointer-events-none" />
                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-seguranca-graphite to-transparent z-10 pointer-events-none" />

                        <div className="overflow-x-auto scrollbar-hide">
                            <TabsList className="bg-transparent h-12 gap-1 px-10 justify-start w-max min-w-full">
                                <TabsTrigger value="dados" className="data-[state=active]:bg-seguranca-red/20 data-[state=active]:text-seguranca-red rounded-none border-b-2 border-transparent data-[state=active]:border-seguranca-red h-full px-4 transition-all whitespace-nowrap">
                                    <User size={16} className="mr-2" /> Dados
                                </TabsTrigger>
                                <TabsTrigger value="documentos" className="data-[state=active]:bg-seguranca-red/20 data-[state=active]:text-seguranca-red rounded-none border-b-2 border-transparent data-[state=active]:border-seguranca-red h-full px-4 transition-all whitespace-nowrap">
                                    <FileText size={16} className="mr-2" /> Documentos
                                </TabsTrigger>
                                <TabsTrigger value="ponto" className="data-[state=active]:bg-seguranca-red/20 data-[state=active]:text-seguranca-red rounded-none border-b-2 border-transparent data-[state=active]:border-seguranca-red h-full px-4 transition-all whitespace-nowrap">
                                    <Clock size={16} className="mr-2" /> Ponto
                                </TabsTrigger>
                                <TabsTrigger value="dependentes" className="data-[state=active]:bg-seguranca-red/20 data-[state=active]:text-seguranca-red rounded-none border-b-2 border-transparent data-[state=active]:border-seguranca-red h-full px-4 transition-all whitespace-nowrap">
                                    <Users size={16} className="mr-2" /> Dependentes
                                </TabsTrigger>
                                <TabsTrigger value="aso" className="data-[state=active]:bg-seguranca-red/20 data-[state=active]:text-seguranca-red rounded-none border-b-2 border-transparent data-[state=active]:border-seguranca-red h-full px-4 transition-all whitespace-nowrap">
                                    <HeartPulse size={16} className="mr-2" /> ASO
                                </TabsTrigger>
                                <TabsTrigger value="ferias" className="data-[state=active]:bg-seguranca-red/20 data-[state=active]:text-seguranca-red rounded-none border-b-2 border-transparent data-[state=active]:border-seguranca-red h-full px-4 transition-all whitespace-nowrap">
                                    <Palmtree size={16} className="mr-2" /> Férias
                                </TabsTrigger>
                                <TabsTrigger value="atestados" className="data-[state=active]:bg-seguranca-red/20 data-[state=active]:text-seguranca-red rounded-none border-b-2 border-transparent data-[state=active]:border-seguranca-red h-full px-4 transition-all whitespace-nowrap">
                                    <Stethoscope size={16} className="mr-2" /> Atestados
                                </TabsTrigger>
                                <TabsTrigger value="disciplinar" className="data-[state=active]:bg-seguranca-red/20 data-[state=active]:text-seguranca-red rounded-none border-b-2 border-transparent data-[state=active]:border-seguranca-red h-full px-4 transition-all whitespace-nowrap">
                                    <AlertTriangle size={16} className="mr-2" /> Disciplinar
                                </TabsTrigger>
                                <TabsTrigger value="remanejamentos" className="data-[state=active]:bg-seguranca-red/20 data-[state=active]:text-seguranca-red rounded-none border-b-2 border-transparent data-[state=active]:border-seguranca-red h-full px-4 transition-all whitespace-nowrap">
                                    <MoveHorizontal size={16} className="mr-2" /> Remanejamentos
                                </TabsTrigger>
                            </TabsList>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 p-4 md:p-6">
                        {/* Aba Dados */}
                        <TabsContent value="dados" className="mt-0 space-y-4 md:space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                <Card className="bg-seguranca-black/40 border-gray-700/50 overflow-hidden">
                                    <div className="bg-seguranca-red/10 px-4 py-2 border-b border-gray-700/50 flex items-center gap-2">
                                        <User size={14} className="text-seguranca-red" />
                                        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Identificação</span>
                                    </div>
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">CPF</span>
                                            <span className="text-sm font-mono text-white">{formatCPF(employee.cpf)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">RG</span>
                                            <span className="text-sm font-mono text-white">{formatRG(employee.rg)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">Data de Nascimento</span>
                                            <span className="text-sm text-white">{formatDate(employee.birthDate)}</span>
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
                                            <span className="text-sm text-white break-all">{employee.email || '-'}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">Telefone Principal</span>
                                            <span className="text-sm text-white">{formatPhone(employee.phone)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">Telefone Contato</span>
                                            <span className="text-sm text-white">{formatPhone((employee as any).telefoneContato)}</span>
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
                                            <span className="text-sm text-white font-semibold">{employee.position?.name || '-'}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">Posto / Unidade</span>
                                            <span className="text-sm text-white">{employee.workPost?.name || employee.unit?.name || (employee as any).department?.name || '-'}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-500 uppercase font-bold">Admissão</span>
                                                <span className="text-sm text-white">{formatDate(employee.hireDate)}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-500 uppercase font-bold">Termino</span>
                                                <span className="text-sm text-white">{formatDate(employee.terminationDate)}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                                    const e = employee as any;
                                                    const parts = [
                                                        e.enderecoRua,
                                                        e.enderecoNumero ? `nº ${e.enderecoNumero}` : null,
                                                        e.enderecoComplemento,
                                                        e.enderecoBairro,
                                                        e.enderecoCidade,
                                                        e.enderecoEstado,
                                                        e.enderecoCep ? `CEP: ${e.enderecoCep}` : null
                                                    ].filter(Boolean);
                                                    return parts.length > 0 ? parts.join(', ') : (typeof employee.address === 'string' ? employee.address : '-');
                                                })()}
                                            </p>
                                        </div>
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
                                                {employee.notes || 'Nenhuma observação cadastrada.'}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* Aba Documentos */}
                        <TabsContent value="documentos" className="mt-0">
                            <EmployeeDocuments employeeId={employee.id} employeeName={employee.name} />
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
                            {loading ? renderLoading() : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-semibold text-white">Lista de Dependentes</h3>
                                        <Badge className="bg-seguranca-yellow/20 text-seguranca-yellow border-seguranca-yellow/30">
                                            {dependents.length} Dependentes
                                        </Badge>
                                    </div>

                                    {dependents.length === 0 ? renderEmpty('Este funcionário não possui dependentes cadastrados.') : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {dependents.map((dep: any) => (
                                                <Card key={dep.id} className="bg-seguranca-black/40 border-gray-700/50 overflow-hidden p-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 rounded-lg bg-seguranca-yellow/10 text-seguranca-yellow">
                                                            <User size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-white text-sm">{dep.name}</p>
                                                            <p className="text-xs text-seguranca-lightgray mt-1">
                                                                {dep.type === 'SPOUSE' ? 'Cônjuge' :
                                                                    dep.type === 'CHILD' ? 'Filho(a)' :
                                                                        dep.type === 'PARENT' ? 'Pai/Mãe' : 'Outro'}
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

                        {/* Aba ASO */}
                        <TabsContent value="aso" className="mt-0">
                            {loading ? renderLoading() : (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-white mb-2">Histórico de Exames Médicos (ASO)</h3>

                                    {exams.length === 0 ? renderEmpty('Nenhum registro de exame médico encontrado.') : (
                                        <div className="space-y-3">
                                            {exams.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()).map((exam) => (
                                                <Card key={exam.id} className="bg-seguranca-black/40 border-gray-700/50 p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-lg ${exam.status === 'REALIZADO' ? 'bg-green-500/10 text-green-400' : 'bg-seguranca-yellow/10 text-seguranca-yellow'
                                                                }`}>
                                                                <Stethoscope size={18} />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-white text-sm">{exam.examType}</p>
                                                                <p className="text-xs text-seguranca-lightgray uppercase tracking-tighter mt-0.5">
                                                                    {exam.examCategory} • {formatDate(exam.scheduledDate)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <Badge className={`${exam.result === 'APTO' ? 'bg-green-500/20 text-green-400' :
                                                                exam.result === 'INAPTO' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'
                                                                }`}>
                                                                {exam.result || 'Pendente'}
                                                            </Badge>
                                                            {exam.doctorName && <p className="text-[10px] text-gray-500 mt-1">Dr(a). {exam.doctorName}</p>}
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
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
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-white mb-2">Histórico de Atestados Médicos</h3>

                                    {absences.length === 0 ? renderEmpty('Nenhum aatestado médico registrado.') : (
                                        <div className="space-y-3">
                                            {absences.map((abs: any) => (
                                                <Card key={abs.id} className="bg-seguranca-black/40 border-gray-700/50 p-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-start gap-3">
                                                            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                                                                <Stethoscope size={18} />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-white text-sm">{abs.motivo || 'Atestado Médico'}</p>
                                                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                                                    <Calendar size={12} />
                                                                    <span>{formatDate(abs.dataInicio)} {!abs.dataFim || abs.dataFim === abs.dataInicio ? '' : `até ${formatDate(abs.dataFim)}`}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {abs.documento && (
                                                            <Button variant="link" size="sm" className="text-blue-400 hover:text-blue-300 h-auto p-0" asChild>
                                                                <a href={abs.documento} target="_blank" rel="noopener noreferrer">Ver Anexo</a>
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
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};
