import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { feriasService } from '@/services/feriasService';
import { employeeService, Employee } from '@/services/employeeService';
import { CustomFeriasReportRequest } from '@/types/ferias';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Users,
  FileText,
  Clock,
  AlertTriangle,
  RotateCcw,
  CheckSquare,
  Square,
  Loader2,
  Filter,
  Columns
} from 'lucide-react';

interface FeriasReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ColumnOption {
  id: string;
  label: string;
  defaultChecked: boolean;
}

type ReportType = 'ferias' | 'afastamentos' | 'experiencia';

const COLUMNS_BY_TYPE: Record<ReportType, ColumnOption[]> = {
  ferias: [
    { id: 'employeeName', label: 'Nome do Colaborador', defaultChecked: true },
    { id: 'empresa', label: 'Empresa', defaultChecked: true },
    { id: 'setor', label: 'Setor / Departamento', defaultChecked: true },
    { id: 'periodoAquisitivo', label: 'Período Aquisitivo', defaultChecked: true },
    { id: 'dataInicio', label: 'Data Início', defaultChecked: true },
    { id: 'dataFim', label: 'Data Fim', defaultChecked: true },
    { id: 'dias', label: 'Qtd. Dias', defaultChecked: true },
    { id: 'tipo', label: 'Tipo de Gozo', defaultChecked: true },
    { id: 'status', label: 'Status Atual', defaultChecked: true },
    { id: 'dataAprovacao', label: 'Data de Aprovação', defaultChecked: false },
  ],
  afastamentos: [
    { id: 'employeeName', label: 'Nome do Colaborador', defaultChecked: true },
    { id: 'empresa', label: 'Empresa', defaultChecked: true },
    { id: 'setor', label: 'Setor / Departamento', defaultChecked: true },
    { id: 'tipo', label: 'Tipo de Afastamento', defaultChecked: true },
    { id: 'dataInicio', label: 'Data Início', defaultChecked: true },
    { id: 'dataFim', label: 'Data Fim', defaultChecked: true },
    { id: 'dias', label: 'Total de Dias', defaultChecked: true },
    { id: 'motivo', label: 'Motivo / CID', defaultChecked: true },
    { id: 'status', label: 'Status', defaultChecked: true },
    { id: 'observacoes', label: 'Observações / Cobertura', defaultChecked: false },
  ],
  experiencia: [
    { id: 'employeeName', label: 'Nome do Colaborador', defaultChecked: true },
    { id: 'empresa', label: 'Empresa', defaultChecked: true },
    { id: 'setor', label: 'Setor / Departamento', defaultChecked: true },
    { id: 'dataAdmissao', label: 'Data de Admissão', defaultChecked: true },
    { id: 'fim1Fase', label: 'Término 1ª Fase (45d)', defaultChecked: true },
    { id: 'fimExperiencia', label: 'Término 2ª Fase (90d)', defaultChecked: true },
    { id: 'diasRestantes', label: 'Dias Restantes', defaultChecked: true },
    { id: 'status', label: 'Situação / Alerta', defaultChecked: true },
  ],
};

const EMPRESAS = [
  { value: 'TODAS', label: 'Todas as Empresas' },
  { value: 'VIG', label: 'VIG - Vigilância Patrimonial' },
  { value: 'ADM', label: 'ADM - Administração & Gestão' },
  { value: 'TERC', label: 'TERC - Terceirização & Serviços' },
];

const FeriasReportModal: React.FC<FeriasReportModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<ReportType>('ferias');
  const [isGenerating, setIsGenerating] = useState(false);

  // Filtros
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('TODAS');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('TODOS');
  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS');
  const [selectedTipo, setSelectedTipo] = useState<string>('TODOS');

  // Colunas selecionadas por tipo
  const [columnsState, setColumnsState] = useState<Record<ReportType, string[]>>({
    ferias: COLUMNS_BY_TYPE.ferias.filter(c => c.defaultChecked).map(c => c.id),
    afastamentos: COLUMNS_BY_TYPE.afastamentos.filter(c => c.defaultChecked).map(c => c.id),
    experiencia: COLUMNS_BY_TYPE.experiencia.filter(c => c.defaultChecked).map(c => c.id),
  });

  // Busca lista de colaboradores para filtros
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees-for-reports'],
    queryFn: () => employeeService.getAllEmployees(),
    enabled: isOpen,
  });
  const currentAvailableColumns = COLUMNS_BY_TYPE[reportType];
  const currentSelectedColumns = columnsState[reportType] || [];

  const handleToggleColumn = (colId: string) => {
    setColumnsState(prev => {
      const current = prev[reportType] || [];
      const exists = current.includes(colId);
      const updated = exists ? current.filter(id => id !== colId) : [...current, colId];
      return { ...prev, [reportType]: updated };
    });
  };

  const handleSelectAllColumns = () => {
    setColumnsState(prev => ({
      ...prev,
      [reportType]: COLUMNS_BY_TYPE[reportType].map(c => c.id),
    }));
  };

  const handleSelectNoneColumns = () => {
    setColumnsState(prev => ({
      ...prev,
      [reportType]: [COLUMNS_BY_TYPE[reportType][0].id],
    }));
  };

  const handleResetDefaultColumns = () => {
    setColumnsState(prev => ({
      ...prev,
      [reportType]: COLUMNS_BY_TYPE[reportType].filter(c => c.defaultChecked).map(c => c.id),
    }));
  };

  const handleGenerateReport = async (exportFormat: 'pdf' | 'excel') => {
    if (currentSelectedColumns.length === 0) {
      toast({
        title: 'Seleção necessária',
        description: 'Selecione pelo menos uma coluna para exibir no relatório.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const payload: CustomFeriasReportRequest = {
        reportType,
        format: exportFormat,
        dataInicio: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        dataFim: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
        empresa: selectedEmpresa !== 'TODAS' ? selectedEmpresa : undefined,
        employeeId: selectedEmployeeId !== 'TODOS' ? selectedEmployeeId : undefined,
        status: selectedStatus !== 'TODOS' ? selectedStatus : undefined,
        tipo: selectedTipo !== 'TODOS' ? selectedTipo : undefined,
        selectedColumns: currentSelectedColumns,
      };

      const blob = await feriasService.generateCustomReport(payload);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const dateStr = format(new Date(), 'yyyyMMdd_HHmm');
      const ext = exportFormat === 'pdf' ? 'pdf' : 'xlsx';
      link.download = 'relatorio_' + reportType + '_' + dateStr + '.' + ext;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Relatório gerado com sucesso',
        description: 'O arquivo ' + exportFormat.toUpperCase() + ' foi gerado e o download iniciado.',
      });
    } catch (error: any) {
      console.error('Erro ao gerar relatório personalizado:', error);
      toast({
        title: 'Erro ao gerar relatório',
        description: error?.response?.data?.message || 'Ocorreu um erro ao processar o relatório no servidor.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-slate-900 border-slate-800 text-slate-100 p-0 shadow-2xl">
        {/* Header estilo Executivo */}
        <DialogHeader className="p-6 bg-slate-950 border-b border-slate-800 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                  Central de Relatórios Executivos
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    Férias & Gestão de Pessoas
                  </span>
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-xs mt-0.5">
                  Gere relatórios no padrão executivo paisagem A4 ou planilhas Excel com personalização de colunas.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Abas de Seleção de Tipo de Relatório */}
          <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setReportType('ferias')}
              className={
                reportType === 'ferias'
                  ? 'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }
            >
              <Calendar className="h-4 w-4" />
              Relatório de Férias
            </button>
            <button
              type="button"
              onClick={() => setReportType('afastamentos')}
              className={
                reportType === 'afastamentos'
                  ? 'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }
            >
              <AlertTriangle className="h-4 w-4" />
              Afastamentos & Atestados
            </button>
            <button
              type="button"
              onClick={() => setReportType('experiencia')}
              className={
                reportType === 'experiencia'
                  ? 'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }
            >
              <Clock className="h-4 w-4" />
              Período de Experiência
            </button>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Seção 1: Filtros de Seleção */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
              <Filter className="h-4 w-4 text-amber-400" />
              <span>1. Filtros e Parâmetros de Seleção</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              {/* Período De / Até */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 font-medium">Data Inicial</Label>
                <DatePicker
                  date={startDate}
                  onDateChange={setStartDate}
                  placeholder="Selecione início"
                  className="bg-slate-900 border-slate-700 text-slate-200 w-full"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 font-medium">Data Final</Label>
                <DatePicker
                  date={endDate}
                  onDateChange={setEndDate}
                  placeholder="Selecione fim"
                  className="bg-slate-900 border-slate-700 text-slate-200 w-full"
                />
              </div>

              {/* Empresa */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 font-medium">Empresa</Label>
                <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200 h-9">
                    <SelectValue placeholder="Todas as Empresas" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    {EMPRESAS.map(emp => (
                      <SelectItem key={emp.value} value={emp.value}>
                        {emp.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Colaborador */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 font-medium">Colaborador</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200 h-9">
                    <SelectValue placeholder="Todos os Colaboradores" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 max-h-56">
                    <SelectItem value="TODOS">Todos os Colaboradores</SelectItem>
                    {employees?.map((emp: Employee) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} {emp.registration ? '(' + emp.registration + ')' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400 font-medium">Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200 h-9">
                    <SelectValue placeholder="Todos os Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="TODOS">Todos os Status</SelectItem>
                    {reportType === 'ferias' && (
                      <>
                        <SelectItem value="PLANEJADA">Planejada</SelectItem>
                        <SelectItem value="APROVADA">Aprovada</SelectItem>
                        <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                        <SelectItem value="CONCLUIDA">Concluída</SelectItem>
                        <SelectItem value="CANCELADA">Cancelada</SelectItem>
                      </>
                    )}
                    {reportType === 'afastamentos' && (
                      <>
                        <SelectItem value="PENDENTE">Pendente</SelectItem>
                        <SelectItem value="APROVADO">Aprovado</SelectItem>
                        <SelectItem value="CANCELADO">Cancelado</SelectItem>
                      </>
                    )}
                    {reportType === 'experiencia' && (
                      <>
                        <SelectItem value="REGULAR">Em Dia / Regular</SelectItem>
                        <SelectItem value="ATENCAO">Atenção (Próximo do fim)</SelectItem>
                        <SelectItem value="CRITICO">Crítico (Urgente)</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo (Gozo/Afastamento) */}
              {reportType !== 'experiencia' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400 font-medium">
                    {reportType === 'ferias' ? 'Tipo de Férias' : 'Tipo de Afastamento'}
                  </Label>
                  <Select value={selectedTipo} onValueChange={setSelectedTipo}>
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200 h-9">
                      <SelectValue placeholder="Todos os Tipos" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                      <SelectItem value="TODOS">Todos os Tipos</SelectItem>
                      {reportType === 'ferias' ? (
                        <>
                          <SelectItem value="INTEGRAL">Integral (30 dias)</SelectItem>
                          <SelectItem value="FRACIONADA">Fracionada</SelectItem>
                          <SelectItem value="ABONO">Com Abono Pecuniário</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="ATESTADO">Atestado Médico</SelectItem>
                          <SelectItem value="LICENCA_MATERNIDADE">Licença Maternidade</SelectItem>
                          <SelectItem value="LICENCA_PATERNIDADE">Licença Paternidade</SelectItem>
                          <SelectItem value="ACIDENTE_TRABALHO">Acidente de Trabalho</SelectItem>
                          <SelectItem value="LICENCA_MEDICA">Licença Médica INSS</SelectItem>
                          <SelectItem value="SUSPENSAO">Suspensão Disciplinar</SelectItem>
                          <SelectItem value="OUTROS">Outros Motivos</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <Separator className="bg-slate-800" />

          {/* Seção 2: Seleção de Colunas Customizadas */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
                <Columns className="h-4 w-4 text-amber-400" />
                <span>2. Campos & Colunas Personalizadas</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                  {currentSelectedColumns.length} de {currentAvailableColumns.length} selecionadas
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAllColumns}
                  className="h-7 text-xs border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <CheckSquare className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                  Todas
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSelectNoneColumns}
                  className="h-7 text-xs border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <Square className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  Mínimo
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleResetDefaultColumns}
                  className="h-7 text-xs border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1 text-amber-400" />
                  Padrão
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {currentAvailableColumns.map(col => {
                const checked = currentSelectedColumns.includes(col.id);
                return (
                  <div
                    key={col.id}
                    onClick={() => handleToggleColumn(col.id)}
                    className={
                      checked
                        ? 'flex items-center space-x-3 p-2.5 rounded-lg border cursor-pointer transition-all bg-amber-500/10 border-amber-500/40 text-amber-200 font-medium'
                        : 'flex items-center space-x-3 p-2.5 rounded-lg border cursor-pointer transition-all bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }
                  >
                    <Checkbox
                      id={'col-' + col.id}
                      checked={checked}
                      onCheckedChange={() => handleToggleColumn(col.id)}
                      className="border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:text-black"
                    />
                    <Label htmlFor={'col-' + col.id} className="text-xs cursor-pointer flex-1 select-none">
                      {col.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer com botões de ação e exportação */}
        <DialogFooter className="p-4 px-6 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-slate-400">
            {currentSelectedColumns.length === 0 ? (
              <span className="text-red-400">Selecione ao menos 1 coluna para gerar o relatório</span>
            ) : (
              <span>Layout executivo gerado em paisagem A4 com colunas dinâmicas</span>
            )}
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isGenerating}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Fechar
            </Button>

            {/* Botão Excel */}
            <Button
              type="button"
              onClick={() => handleGenerateReport('excel')}
              disabled={isGenerating || currentSelectedColumns.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-600/20"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Baixar Planilha Excel
                </>
              )}
            </Button>

            {/* Botão PDF Executivo */}
            <Button
              type="button"
              onClick={() => handleGenerateReport('pdf')}
              disabled={isGenerating || currentSelectedColumns.length === 0}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Gerar PDF Executivo
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeriasReportModal;
