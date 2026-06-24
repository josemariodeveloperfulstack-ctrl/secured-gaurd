import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Users,
  Building2,
  CalendarDays,
  Download,
  Filter,
  X,
  CheckCircle2,
  LayoutDashboard,
  ClipboardList,
  Search,
  Briefcase
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isConnectionError, getServerUnavailableMessage, isServerUnavailableError } from '@/utils/connectionError';
import { epiDeliveryFormService, EPIDeliveryFormFilters } from '@/services/epiDeliveryFormService';
import { EmployeeCombobox } from '@/components/ui/employee-combobox';
import { CompanyCombobox } from '@/components/ui/company-combobox';
import { Combobox } from '@/components/ui/combobox';
import { departmentService } from '@/services/departmentService';
import { Label } from '@/components/ui/label';

interface EPIDeliveryReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ReportType = 'analytical' | 'summary' | 'by_sector' | 'by_employee';

interface ReportTypeConfig {
  id: ReportType;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const reportTypes: ReportTypeConfig[] = [
  {
    id: 'analytical',
    title: 'Relatório Analítico',
    description: 'Detalhamento completo de todas as entregas por item',
    icon: <ClipboardList className="w-6 h-6" />,
    color: 'bg-blue-500/20 text-blue-400'
  },
  {
    id: 'summary',
    title: 'Resumo Gerencial',
    description: 'Visão consolidada de entregas por empresa e período',
    icon: <LayoutDashboard className="w-6 h-6" />,
    color: 'bg-purple-500/20 text-purple-400'
  },
  {
    id: 'by_sector',
    title: 'Por Setor/Unidade',
    description: 'Consumo de EPIs agrupado por setor de trabalho',
    icon: <Building2 className="w-6 h-6" />,
    color: 'bg-orange-500/20 text-orange-400'
  },
  {
    id: 'by_employee',
    title: 'Por Funcionário',
    description: 'Histórico individual de retiradas de EPI',
    icon: <Users className="w-6 h-6" />,
    color: 'bg-green-500/20 text-green-400'
  }
];

const EPIDeliveryReportModal: React.FC<EPIDeliveryReportModalProps> = ({
  isOpen,
  onClose
}) => {
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('analytical');
  const [currentStep, setCurrentStep] = useState<'type' | 'filters' | 'export'>('type');
  const [loading, setLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
  const { toast } = useToast();

  // Filtros
  const [filters, setFilters] = useState<EPIDeliveryFormFilters>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const [sectors, setSectors] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      departmentService.listAll()
        .then(data => {
          setSectors(data.map(d => ({ label: d.name, value: d.id })));
        })
        .catch(err => console.error('Erro ao carregar setores:', err));
    }
  }, [isOpen]);

  const handleClose = () => {
    setCurrentStep('type');
    onClose();
  };

  const handleNextStep = () => {
    if (currentStep === 'type') setCurrentStep('filters');
    else if (currentStep === 'filters') setCurrentStep('export');
  };

  const handlePreviousStep = () => {
    if (currentStep === 'filters') setCurrentStep('type');
    else if (currentStep === 'export') setCurrentStep('filters');
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const exportFilters = { ...filters, reportType: selectedReportType };
      let blob;

      if (exportFormat === 'pdf') {
        blob = await epiDeliveryFormService.exportReportPdf(exportFilters);
      } else {
        blob = await epiDeliveryFormService.exportReportExcel(exportFilters);
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio-epi-${selectedReportType}-${new Date().toISOString().split('T')[0]}.${exportFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({
        title: "Sucesso!",
        description: "Relatório gerado e download iniciado.",
      });
      handleClose();
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      const isServerDown = isConnectionError(error) || isServerUnavailableError(error);
      toast({
        title: isServerDown ? 'Servidor indisponível' : 'Erro',
        description: isServerDown
          ? getServerUnavailableMessage(error)
          : 'Não foi possível gerar o relatório. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedReportConfig = reportTypes.find(t => t.id === selectedReportType);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-seguranca-graphite text-seguranca-lightgray border-gray-700 sm:max-w-4xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-seguranca-red/20 rounded-xl flex items-center justify-center shadow-inner">
                <FileText className="w-6 h-6 text-seguranca-red" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white tracking-tight">
                  Relatórios de Entrega de EPI
                </DialogTitle>
                <DialogDescription className="text-gray-400 mt-1">
                  Extração de dados analíticos e gerenciais para controle de estoque e segurança.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-4 mt-8 px-2">
            {[
              { id: 'type', label: 'Tipo', icon: LayoutDashboard },
              { id: 'filters', label: 'Filtros', icon: Filter },
              { id: 'export', label: 'Exportar', icon: Download }
            ].map((step, idx) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              return (
                <React.Fragment key={step.id}>
                  <div className={`flex items-center gap-2 transition-all duration-300 ${isActive ? 'text-seguranca-red scale-105' : 'text-gray-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${isActive ? 'border-seguranca-red bg-seguranca-red/10' : 'border-gray-700'}`}>
                      {idx + 1}
                    </div>
                    <span className="font-bold uppercase text-[10px] tracking-widest">{step.label}</span>
                  </div>
                  {idx < 2 && <div className="h-[2px] flex-1 bg-gray-700" />}
                </React.Fragment>
              )
            })}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-600">
          {currentStep === 'type' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {reportTypes.map((type) => (
                <Card
                  key={type.id}
                  className={`relative cursor-pointer transition-all duration-200 hover:border-seguranca-red/50 ${selectedReportType === type.id
                    ? 'ring-2 ring-seguranca-red bg-seguranca-red/5 border-seguranca-red/30'
                    : 'bg-seguranca-black border-gray-700 hover:bg-gray-800'
                    }`}
                  onClick={() => setSelectedReportType(type.id)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg shadow-sm ${type.color}`}>
                        {type.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-white mb-1">
                          {type.title}
                        </h4>
                        <p className="text-sm text-gray-400 leading-tight">
                          {type.description}
                        </p>
                      </div>
                      {selectedReportType === type.id && (
                        <CheckCircle2 className="w-5 h-5 text-seguranca-red shrink-0" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {currentStep === 'filters' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 bg-seguranca-black rounded-xl border border-gray-700 space-y-4">
                    <h4 className="text-sm font-bold text-seguranca-red uppercase tracking-wider flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" /> Período das Entregas
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-400">Data Inicial</Label>
                        <input
                          type="date"
                          value={filters.startDate}
                          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                          className="w-full bg-seguranca-graphite border-2 border-gray-700 rounded-lg p-2 text-sm text-white focus:border-seguranca-red transition-colors outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-400">Data Final</Label>
                        <input
                          type="date"
                          value={filters.endDate}
                          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                          className="w-full bg-seguranca-graphite border-2 border-gray-700 rounded-lg p-2 text-sm text-white focus:border-seguranca-red transition-colors outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-seguranca-black rounded-xl border border-gray-700 space-y-4">
                    <h4 className="text-sm font-bold text-seguranca-red uppercase tracking-wider flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Unidade / Empresa
                    </h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-400">Empresa Contratante</Label>
                        <CompanyCombobox
                          value={filters.companyId || ''}
                          onChange={(val) => setFilters({ ...filters, companyId: val })}
                          placeholder="Todas as empresas"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-400">Setor de Trabalho</Label>
                        <Combobox
                          options={sectors}
                          value={filters.sectorId || ''}
                          onChange={(val) => setFilters({ ...filters, sectorId: val })}
                          placeholder="Todos os setores"
                          searchPlaceholder="Buscar setor..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-seguranca-black rounded-xl border border-gray-700 space-y-4">
                    <h4 className="text-sm font-bold text-seguranca-red uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4" /> Colaborador
                    </h4>
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-400">Funcionário Específico</Label>
                      <EmployeeCombobox
                        value={filters.employeeId || ''}
                        onChange={(val) => setFilters({ ...filters, employeeId: val })}
                        placeholder="Todos os funcionários"
                      />
                      <p className="text-[10px] text-gray-500 italic">
                        * Deixe em branco para incluir todos os colaboradores no relatório.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-seguranca-black/50 rounded-xl border border-dashed border-gray-700 flex items-center justify-center min-h-[140px]">
                    <div className="text-center space-y-2">
                      <Search className="w-8 h-8 text-gray-600 mx-auto" />
                      <p className="text-xs text-gray-500 max-w-[200px]">
                        Os filtros selecionados serão aplicados para gerar o relatório em tempo real.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'export' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white">Formato do Arquivo</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => setExportFormat('pdf')}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${exportFormat === 'pdf' ? 'border-seguranca-red bg-seguranca-red/10' : 'border-gray-700 bg-seguranca-black hover:border-gray-600'}`}
                    >
                      <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-red-400" />
                      </div>
                      <div className="text-left">
                        <span className="block font-bold text-white">Documento PDF</span>
                        <span className="text-xs text-gray-400">Ideal para impressão e conferência</span>
                      </div>
                      {exportFormat === 'pdf' && <CheckCircle2 className="w-5 h-5 text-seguranca-red ml-auto" />}
                    </button>

                    <button
                      onClick={() => setExportFormat('excel')}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${exportFormat === 'excel' ? 'border-seguranca-red bg-seguranca-red/10' : 'border-gray-700 bg-seguranca-black hover:border-gray-600'}`}
                    >
                      <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <Download className="w-6 h-6 text-green-400" />
                      </div>
                      <div className="text-left">
                        <span className="block font-bold text-white">Planilha Excel</span>
                        <span className="text-xs text-gray-400">Ideal para auditorias e análise de dados</span>
                      </div>
                      {exportFormat === 'excel' && <CheckCircle2 className="w-5 h-5 text-seguranca-red ml-auto" />}
                    </button>
                  </div>
                </div>

                <div className="bg-seguranca-black rounded-xl border border-gray-700 p-6 space-y-4">
                  <h3 className="text-lg font-bold text-white border-b border-gray-700 pb-2">Resumo da Configuração</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Tipo de Relatório</span>
                      <Badge variant="outline" className="text-seguranca-red border-seguranca-red/30">
                        {selectedReportConfig?.title}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Período</span>
                      <span className="text-white text-sm font-medium">
                        {filters.startDate ? new Date(filters.startDate).toLocaleDateString('pt-BR') : 'Início'} 
                        {' a '} 
                        {filters.endDate ? new Date(filters.endDate).toLocaleDateString('pt-BR') : 'Hoje'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Empresa</span>
                      <span className="text-white text-sm truncate max-w-[150px]">
                        {filters.companyId ? 'Filtrada' : 'Todas'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Setor</span>
                      <span className="text-white text-sm">
                        {filters.sectorId ? 'Filtrado' : 'Todos'}
                      </span>
                    </div>
                  </div>
                  <div className="pt-4 mt-4 border-t border-gray-700">
                    <p className="text-[10px] text-gray-500 leading-tight">
                      * O relatório será gerado com base nas fichas de entrega assinadas e pendentes no sistema.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-seguranca-black/50 border-t border-gray-700 flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={currentStep === 'type' ? handleClose : handlePreviousStep}
            className="text-gray-400 hover:text-white"
          >
            {currentStep === 'type' ? 'Cancelar' : 'Voltar'}
          </Button>

          <div className="flex gap-3">
            {currentStep !== 'export' ? (
              <Button
                onClick={handleNextStep}
                className="bg-seguranca-red hover:bg-seguranca-red/80 px-8 font-bold"
              >
                Próximo Passo
              </Button>
            ) : (
              <Button
                onClick={handleExport}
                disabled={loading}
                className="bg-seguranca-red hover:bg-seguranca-red/80 px-8 font-bold min-w-[160px]"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Gerando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Gerar e Baixar
                  </div>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EPIDeliveryReportModal;
