import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { feriasService } from '@/services/feriasService';
import { employeeService, Employee } from '@/services/employeeService';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import {
  FileSpreadsheet,
  Download,
  BarChart3,
  Calendar,
  Users,
  TrendingUp,
  X,
  FileText,
  UserCheck,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface FeriasReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReportFilters {
  employeeId: string;
  empresa: string;
  status: string;
  tipo: string;
  dataInicio: string;
  dataFim: string;
}

const EMPRESAS = [
  { value: 'VIG', label: 'VIG - Vigilância Patrimonial' },
  { value: 'ADM', label: 'ADM - Administração & Gestão' },
  { value: 'TERC', label: 'TERC - Terceirização & Serviços' },
];

const FeriasReportModal: React.FC<FeriasReportModalProps> = ({ isOpen, onClose }) => {
  const [filters, setFilters] = useState<ReportFilters>({
    employeeId: '',
    empresa: '',
    status: '',
    tipo: '',
    dataInicio: '',
    dataFim: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Buscar funcionários para filtros
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAllEmployees(),
  });

  // Buscar estatísticas
  const { data: stats } = useQuery({
    queryKey: ['ferias-stats'],
    queryFn: () => feriasService.getAllStats(),
    enabled: isOpen
  });

  // Processar lista de funcionários em período de experiência
  const expEmployeesList = React.useMemo(() => {
    if (!employees) return [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return employees
      .filter(emp => emp.hireDate)
      .map(emp => {
        const admissao = parseISO(emp.hireDate!);
        const dias1 = parseInt((emp as any).prazoExperienciaTexto || '45', 10) || 45;
        const dias2 = parseInt((emp as any).prorrogacaoExperiencia || '45', 10) || 45;

        const fim1 = new Date(admissao);
        fim1.setDate(fim1.getDate() + dias1);

        const fimTotal = new Date(fim1);
        fimTotal.setDate(fimTotal.getDate() + dias2);

        const diffDays1 = Math.ceil((fim1.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        const diffDaysTotal = Math.ceil((fimTotal.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

        let statusExp = 'Concluída';
        let alertLevel: 'danger' | 'warning' | 'info' | 'normal' = 'normal';
        let statusBadgeText = '';

        if (diffDaysTotal < 0) {
          statusExp = 'Concluída';
          alertLevel = 'normal';
          statusBadgeText = 'Experiência Concluída';
        } else if (diffDaysTotal >= 0 && diffDaysTotal <= 15) {
          statusExp = `Vence Experiência em ${diffDaysTotal}d`;
          alertLevel = 'danger';
          statusBadgeText = `🚨 Experiência Total Vence em ${diffDaysTotal} d`;
        } else if (diffDays1 >= 0 && diffDays1 <= 15) {
          statusExp = `Vence 1ª Fase em ${diffDays1}d`;
          alertLevel = 'warning';
          statusBadgeText = `⚠️ 1ª Fase Vence em ${diffDays1} d`;
        } else {
          statusExp = 'Em Andamento';
          alertLevel = 'info';
          statusBadgeText = 'Em Andamento';
        }

        const empresaSigla = typeof emp.company === 'object' && emp.company?.sigla ? emp.company.sigla : (emp as any).empresa || '';

        return {
          ...emp,
          admissao,
          fim1,
          fimTotal,
          diffDays1,
          diffDaysTotal,
          statusExp,
          alertLevel,
          statusBadgeText,
          empresaSigla
        };
      })
      .sort((a, b) => {
        const priority = { danger: 1, warning: 2, info: 3, normal: 4 };
        return priority[a.alertLevel] - priority[b.alertLevel];
      });
  }, [employees]);

  const handleFilterChange = (field: keyof ReportFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateReport = async (format: 'excel' | 'pdf', type: 'ferias' | 'afastamentos' | 'experiencia' | 'consolidado') => {
    try {
      setIsGenerating(true);

      const reportFilters = {
        employeeId: filters.employeeId || undefined,
        empresa: filters.empresa || undefined,
        status: filters.status || undefined,
        tipo: filters.tipo || undefined,
        dataInicio: filters.dataInicio || undefined,
        dataFim: filters.dataFim || undefined
      };

      let blob: Blob;
      let filename: string;

      if (format === 'excel') {
        switch (type) {
          case 'ferias':
            blob = await feriasService.exportFerias(reportFilters);
            filename = `relatorio_ferias_${new Date().getTime()}.xlsx`;
            break;
          case 'afastamentos':
            blob = await feriasService.exportAfastamentos(reportFilters);
            filename = `relatorio_afastamentos_${new Date().getTime()}.xlsx`;
            break;
          case 'experiencia':
            blob = await feriasService.exportExperiencia(reportFilters);
            filename = `relatorio_experiencia_${new Date().getTime()}.xlsx`;
            break;
          case 'consolidado':
            blob = await feriasService.exportConsolidado(reportFilters);
            filename = `relatorio_consolidado_${new Date().getTime()}.xlsx`;
            break;
          default:
            throw new Error('Tipo de relatório inválido');
        }
      } else {
        switch (type) {
          case 'ferias':
            blob = await feriasService.exportFeriasPDF(reportFilters);
            filename = `relatorio_ferias_${new Date().getTime()}.pdf`;
            break;
          case 'afastamentos':
            blob = await feriasService.exportAfastamentosPDF(reportFilters);
            filename = `relatorio_afastamentos_${new Date().getTime()}.pdf`;
            break;
          case 'experiencia':
            blob = await feriasService.exportExperienciaPDF(reportFilters);
            filename = `relatorio_experiencia_${new Date().getTime()}.pdf`;
            break;
          default:
            throw new Error('Tipo de relatório PDF não disponível para consolidado');
        }
      }

      // Download do arquivo
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Sucesso",
        description: `Relatório ${type} (${format.toUpperCase()}) gerado com sucesso!`,
        variant: "default"
      });

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar relatório. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl xl:max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700/80 text-slate-100 shadow-2xl rounded-2xl p-6 sm:p-8">
        <DialogHeader className="pb-2 border-b border-slate-800">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <BarChart3 className="h-6 w-6" />
            </div>
            Relatórios de Férias, Afastamentos e Período de Experiência
          </DialogTitle>
          <DialogDescription className="sr-only">
            Visualização e exportação de relatórios operacionais de férias, afastamentos e período de experiência em PDF e Excel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Estatísticas */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-slate-800/60 border-slate-700/60 shadow-md backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-amber-400 text-sm font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Estatísticas de Férias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800">
                      <span className="text-slate-400 font-medium">Total:</span>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 px-2.5 py-0.5 font-bold">
                        {stats.ferias?.total || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800">
                      <span className="text-slate-400 font-medium">Pendentes:</span>
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30 px-2.5 py-0.5 font-bold">
                        {stats.ferias?.pendentes || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800">
                      <span className="text-slate-400 font-medium">Aprovadas:</span>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-2.5 py-0.5 font-bold">
                        {stats.ferias?.aprovadas || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800">
                      <span className="text-slate-400 font-medium">Rejeitadas:</span>
                      <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30 px-2.5 py-0.5 font-bold">
                        {stats.ferias?.rejeitadas || 0}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/60 border-slate-700/60 shadow-md backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-amber-400 text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Estatísticas de Afastamentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800">
                      <span className="text-slate-400 font-medium">Total:</span>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 px-2.5 py-0.5 font-bold">
                        {stats.afastamentos?.total || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800">
                      <span className="text-slate-400 font-medium">Pendentes:</span>
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30 px-2.5 py-0.5 font-bold">
                        {stats.afastamentos?.pendentes || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800">
                      <span className="text-slate-400 font-medium">Aprovados:</span>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-2.5 py-0.5 font-bold">
                        {stats.afastamentos?.aprovados || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800">
                      <span className="text-slate-400 font-medium">Rejeitados:</span>
                      <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30 px-2.5 py-0.5 font-bold">
                        {stats.afastamentos?.rejeitados || 0}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/60 border-slate-700/60 shadow-md backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-amber-400 text-sm font-semibold flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Período de Experiência
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800">
                      <span className="text-slate-400 font-medium">Total:</span>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 px-2.5 py-0.5 font-bold">
                        {stats.experiencia?.total || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800">
                      <span className="text-slate-400 font-medium">Em Andamento:</span>
                      <Badge variant="outline" className="bg-sky-500/10 text-sky-400 border-sky-500/30 px-2.5 py-0.5 font-bold">
                        {stats.experiencia?.emAndamento || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800">
                      <span className="text-slate-400 font-medium">Próx. Vencer (15d):</span>
                      <Badge variant="outline" className={`px-2.5 py-0.5 font-bold ${(stats.experiencia?.proximosVencer || 0) > 0 ? 'bg-orange-500/20 text-orange-400 border-orange-500/40 animate-pulse' : 'bg-slate-500/10 text-slate-400 border-slate-700'}`}>
                        {stats.experiencia?.proximosVencer || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800">
                      <span className="text-slate-400 font-medium">Concluídas:</span>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-2.5 py-0.5 font-bold">
                        {stats.experiencia?.concluidos || 0}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Card de Lista de Funcionários em Período de Experiência / Próximos do Vencimento */}
          {expEmployeesList.length > 0 && (
            <Card className="bg-slate-800/60 border-slate-700/60 shadow-md">
              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-slate-200 text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-400" />
                  Funcionários em Período de Experiência & Vencimentos Próximos
                </CardTitle>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs font-bold">
                  {expEmployeesList.filter(e => e.alertLevel === 'danger' || e.alertLevel === 'warning').length} Próximos de Vencer
                </Badge>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="max-h-52 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
                  {expEmployeesList.map((emp) => (
                    <div
                      key={emp.id}
                      className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-all ${
                        emp.alertLevel === 'danger'
                          ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                          : emp.alertLevel === 'warning'
                          ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                          : 'bg-slate-950/40 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-bold text-slate-100">
                          <span>{emp.name}</span>
                          {emp.empresaSigla && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-800 border-slate-700 text-slate-300">
                              {emp.empresaSigla}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                          <span>Admissão: <strong className="text-slate-200">{format(emp.admissao, 'dd/MM/yyyy')}</strong></span>
                          <span>Fim 1ª Fase: <strong className="text-slate-200">{format(emp.fim1, 'dd/MM/yyyy')}</strong></span>
                          <span>Fim Experiência: <strong className="text-slate-200">{format(emp.fimTotal, 'dd/MM/yyyy')}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={`font-semibold text-xs px-2.5 py-1 ${
                            emp.alertLevel === 'danger'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                              : emp.alertLevel === 'warning'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                              : emp.alertLevel === 'info'
                              ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {emp.statusBadgeText}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filtros */}
          <Card className="bg-slate-800/60 border-slate-700/60 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-200 text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-400" />
                Filtros do Relatório
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="empresa" className="text-slate-300 text-xs font-medium">
                    Empresa
                  </Label>
                  <Select
                    value={filters.empresa || 'all'}
                    onValueChange={(value) => handleFilterChange('empresa', value === 'all' ? '' : value)}
                  >
                    <SelectTrigger className="bg-slate-950/80 border-slate-700 text-slate-100 hover:border-slate-500 focus:ring-amber-500/40">
                      <SelectValue placeholder="Todas as empresas" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                      <SelectItem value="all" className="hover:bg-slate-800">
                        Todas as empresas (VIG, ADM e TERC)
                      </SelectItem>
                      {EMPRESAS.map((empresa) => (
                        <SelectItem key={empresa.value} value={empresa.value} className="hover:bg-slate-800">
                          {empresa.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="employeeId" className="text-slate-300 text-xs font-medium">
                    Funcionário
                  </Label>
                  <Select
                    value={filters.employeeId || 'all'}
                    onValueChange={(value) => handleFilterChange('employeeId', value === 'all' ? '' : value)}
                  >
                    <SelectTrigger className="bg-slate-950/80 border-slate-700 text-slate-100 hover:border-slate-500 focus:ring-amber-500/40">
                      <SelectValue placeholder="Todos os funcionários" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-slate-100 max-h-60 overflow-y-auto">
                      <SelectItem value="all" className="hover:bg-slate-800">
                        Todos os funcionários
                      </SelectItem>
                      {employees?.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id} className="hover:bg-slate-800">
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-slate-300 text-xs font-medium">
                    Status
                  </Label>
                  <Select
                    value={filters.status || 'all'}
                    onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}
                  >
                    <SelectTrigger className="bg-slate-950/80 border-slate-700 text-slate-100 hover:border-slate-500 focus:ring-amber-500/40">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                      <SelectItem value="all" className="hover:bg-slate-800">
                        Todos os status
                      </SelectItem>
                      <SelectItem value="PENDING" className="hover:bg-slate-800">
                        Pendente
                      </SelectItem>
                      <SelectItem value="APPROVED" className="hover:bg-slate-800">
                        Aprovado
                      </SelectItem>
                      <SelectItem value="REJECTED" className="hover:bg-slate-800">
                        Rejeitado
                      </SelectItem>
                      <SelectItem value="CANCELLED" className="hover:bg-slate-800">
                        Cancelado
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tipo" className="text-slate-300 text-xs font-medium">
                    Tipo
                  </Label>
                  <Select
                    value={filters.tipo || 'all'}
                    onValueChange={(value) => handleFilterChange('tipo', value === 'all' ? '' : value)}
                  >
                    <SelectTrigger className="bg-slate-950/80 border-slate-700 text-slate-100 hover:border-slate-500 focus:ring-amber-500/40">
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                      <SelectItem value="all" className="hover:bg-slate-800">
                        Todos os tipos
                      </SelectItem>
                      <SelectItem value="FERIAS_NORMAIS" className="hover:bg-slate-800">
                        Férias Normais
                      </SelectItem>
                      <SelectItem value="FERIAS_VENDIDAS" className="hover:bg-slate-800">
                        Férias Vendidas
                      </SelectItem>
                      <SelectItem value="ABONO_PECUNIARIO" className="hover:bg-slate-800">
                        Abono Pecuniário
                      </SelectItem>
                      <SelectItem value="ATESTADO" className="hover:bg-slate-800">
                        Atestado
                      </SelectItem>
                      <SelectItem value="LICENCA_MEDICA" className="hover:bg-slate-800">
                        Licença Médica
                      </SelectItem>
                      <SelectItem value="PERIODO_EXPERIENCIA" className="hover:bg-slate-800">
                        Período de Experiência
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dataInicio" className="text-slate-300 text-xs font-medium">
                    Data Início
                  </Label>
                  <DatePicker
                    date={filters.dataInicio ? parseISO(filters.dataInicio) : undefined}
                    onDateChange={(date) => handleFilterChange('dataInicio', date ? format(date, 'yyyy-MM-dd') : '')}
                    className="w-full bg-slate-950/80 border-slate-700 text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dataFim" className="text-slate-300 text-xs font-medium">
                    Data Fim
                  </Label>
                  <DatePicker
                    date={filters.dataFim ? parseISO(filters.dataFim) : undefined}
                    onDateChange={(date) => handleFilterChange('dataFim', date ? format(date, 'yyyy-MM-dd') : '')}
                    className="w-full bg-slate-950/80 border-slate-700 text-slate-100"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botões de Relatório */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="bg-slate-800/60 border-slate-700/60 hover:border-slate-600 transition-all shadow-md flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-200 text-sm font-semibold flex items-center justify-between">
                  <span>Férias</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5 pt-1">
                <Button
                  onClick={() => generateReport('excel', 'ferias')}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-medium shadow-md border border-emerald-500/30 flex items-center justify-start gap-2.5 w-full h-auto py-2.5 px-3 transition-all"
                >
                  <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-200" />
                  <span className="truncate">Excel de Férias</span>
                </Button>
                <Button
                  onClick={() => generateReport('pdf', 'ferias')}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-medium shadow-md border border-rose-500/30 flex items-center justify-start gap-2.5 w-full h-auto py-2.5 px-3 transition-all"
                >
                  <FileText className="h-4 w-4 shrink-0 text-rose-200" />
                  <span className="truncate">PDF de Férias (Premium)</span>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/60 border-slate-700/60 hover:border-slate-600 transition-all shadow-md flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-200 text-sm font-semibold flex items-center justify-between">
                  <span>Afastamentos</span>
                  <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5 pt-1">
                <Button
                  onClick={() => generateReport('excel', 'afastamentos')}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-medium shadow-md border border-emerald-500/30 flex items-center justify-start gap-2.5 w-full h-auto py-2.5 px-3 transition-all"
                >
                  <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-200" />
                  <span className="truncate">Excel de Afastamentos</span>
                </Button>
                <Button
                  onClick={() => generateReport('pdf', 'afastamentos')}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-medium shadow-md border border-rose-500/30 flex items-center justify-start gap-2.5 w-full h-auto py-2.5 px-3 transition-all"
                >
                  <FileText className="h-4 w-4 shrink-0 text-rose-200" />
                  <span className="truncate">PDF de Afastamentos (Premium)</span>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/60 border-slate-700/60 hover:border-slate-600 transition-all shadow-md flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-200 text-sm font-semibold flex items-center justify-between">
                  <span>Período de Experiência</span>
                  <span className="h-2 w-2 rounded-full bg-blue-400"></span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5 pt-1">
                <Button
                  onClick={() => generateReport('excel', 'experiencia')}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-medium shadow-md border border-emerald-500/30 flex items-center justify-start gap-2.5 w-full h-auto py-2.5 px-3 transition-all"
                >
                  <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-200" />
                  <span className="truncate">Excel de Experiência</span>
                </Button>
                <Button
                  onClick={() => generateReport('pdf', 'experiencia')}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-medium shadow-md border border-rose-500/30 flex items-center justify-start gap-2.5 w-full h-auto py-2.5 px-3 transition-all"
                >
                  <FileText className="h-4 w-4 shrink-0 text-rose-200" />
                  <span className="truncate">PDF de Experiência (Premium)</span>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/60 border-slate-700/60 md:col-span-2 lg:col-span-3 hover:border-slate-600 transition-all shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-200 text-sm font-semibold">Consolidado Geral</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => generateReport('excel', 'consolidado')}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-medium shadow-lg border border-sky-500/30 flex items-center justify-center gap-2.5 w-full py-3 transition-all"
                >
                  <Download className="h-4 w-4 text-sky-200" />
                  <span>Relatório Consolidado Completo (Excel - Férias, Afastamentos e Experiência)</span>
                </Button>
              </CardContent>
            </Card>
          </div>

          {isGenerating && (
            <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-slate-950/60 border border-amber-500/30 text-amber-400 font-medium">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-amber-400 border-t-transparent"></div>
              Gerando e processando relatório...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeriasReportModal;
