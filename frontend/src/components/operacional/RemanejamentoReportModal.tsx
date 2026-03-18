import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { remanejamentoService } from '@/services/remanejamentoService';
import { workPostService, WorkPost } from '@/services/workPostService';
import { companyService } from '@/services/companyService';
import {
  FileText,
  Download,
  MapPin,
  Building2,
  Calendar,
  Clock,
  Filter,
  Loader2,
} from 'lucide-react';

interface RemanejamentoReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ReportFilters {
  workPostId: string;
  companyId: string;
  startDate: string;
  endDate: string;
  lastDays: string;
}

const LAST_DAYS_NONE = '__none__';
const LAST_DAYS_OPTIONS = [
  { value: LAST_DAYS_NONE, label: 'Não filtrar por período' },
  { value: '7', label: 'Últimos 7 dias' },
  { value: '15', label: 'Últimos 15 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '60', label: 'Últimos 60 dias' },
  { value: '90', label: 'Últimos 90 dias' },
];

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

const RemanejamentoReportModal: React.FC<RemanejamentoReportModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [filters, setFilters] = useState<ReportFilters>({
    workPostId: '',
    companyId: '',
    startDate: '',
    endDate: '',
    lastDays: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companyService.getAllCompanies(),
    enabled: open,
  });

  const { data: workPosts = [], isLoading: workPostsLoading } = useQuery<WorkPost[]>({
    queryKey: ['workPostsByCompany', filters.companyId],
    queryFn: () =>
      filters.companyId
        ? workPostService.getWorkPostsByCompany(filters.companyId)
        : Promise.resolve([]),
    enabled: open,
  });

  const handleFilterChange = (field: keyof ReportFilters, value: string) => {
    setFilters((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'companyId') {
        next.workPostId = '';
      }
      return next;
    });
  };

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);
      toast({ title: 'Aguarde', description: 'Gerando relatório PDF...' });

      const reportFilters: Parameters<typeof remanejamentoService.exportRemanejamentosReportPDF>[0] = {};

      if (filters.workPostId) reportFilters.workPostId = filters.workPostId;
      if (filters.companyId) reportFilters.companyId = filters.companyId;
      if (filters.startDate) reportFilters.startDate = filters.startDate;
      if (filters.endDate) reportFilters.endDate = filters.endDate;
      if (filters.lastDays && filters.lastDays !== LAST_DAYS_NONE) {
        const days = Number.parseInt(filters.lastDays, 10);
        if (days > 0) reportFilters.lastDays = days;
      }

      const blob = await remanejamentoService.exportRemanejamentosReportPDF(reportFilters);
      const filename = `relatorio-remanejamentos-${new Date().toISOString().split('T')[0]}.pdf`;
      downloadBlob(blob, filename);

      toast({
        title: 'Sucesso',
        description: 'Relatório de Remanejamentos gerado com sucesso.',
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar relatório PDF. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      workPostId: '',
      companyId: '',
      startDate: '',
      endDate: '',
      lastDays: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-seguranca-graphite border-gray-600">
        <DialogHeader>
          <DialogTitle className="text-seguranca-lightgray flex items-center gap-2">
            <FileText className="h-5 w-5 text-seguranca-yellow" />
            Gerar Relatório de Remanejamentos
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Configure os filtros abaixo para gerar um relatório personalizado. Todos os campos são opcionais.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card className="bg-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle className="text-seguranca-lightgray text-sm flex items-center gap-2">
                <Filter className="h-4 w-4 text-seguranca-yellow" />
                Filtros do Relatório
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workPostId" className="text-gray-300 text-sm flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    Setor de Trabalho
                  </Label>
                  <Select
                    value={filters.workPostId || 'all'}
                    onValueChange={(v) => handleFilterChange('workPostId', v === 'all' ? '' : v)}
                    disabled={workPostsLoading || !filters.companyId}
                  >
                    <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white">
                      <SelectValue
                        placeholder={
                          !filters.companyId
                            ? 'Selecione uma empresa primeiro'
                            : workPostsLoading
                              ? 'Carregando setores...'
                              : 'Todos os setores'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-600">
                      <SelectItem value="all" className="text-white hover:bg-gray-700">
                        Todos os setores
                      </SelectItem>
                      {workPosts.map((wp) => (
                        <SelectItem key={wp.id} value={wp.id} className="text-white hover:bg-gray-700">
                          {wp.name}
                          {wp.clientName ? ` (${wp.clientName})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyId" className="text-gray-300 text-sm flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    Empresa
                  </Label>
                  <Select
                    value={filters.companyId || 'all'}
                    onValueChange={(v) => handleFilterChange('companyId', v === 'all' ? '' : v)}
                    disabled={companiesLoading}
                  >
                    <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white">
                      <SelectValue placeholder="Todas as empresas" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-600">
                      <SelectItem value="all" className="text-white hover:bg-gray-700">
                        Todas as empresas
                      </SelectItem>
                      {companies.map((c: { id: string; name: string; sigla?: string }) => (
                        <SelectItem key={c.id} value={c.id} className="text-white hover:bg-gray-700">
                          {c.sigla ? `${c.sigla} - ${c.name}` : c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastDays" className="text-gray-300 text-sm flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Últimos Remanejamentos
                  </Label>
                  <Select
                    value={filters.lastDays || LAST_DAYS_NONE}
                    onValueChange={(v) => handleFilterChange('lastDays', v === LAST_DAYS_NONE ? '' : v)}
                  >
                    <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white">
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-600">
                      {LAST_DAYS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-gray-700">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-gray-300 text-sm flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Período Personalizado
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[140px]">
                      <Input
                        type="date"
                        placeholder="Data início"
                        value={filters.startDate}
                        onChange={(e) => handleFilterChange('startDate', e.target.value)}
                        className="bg-gray-900/50 border-gray-600 text-white"
                      />
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <Input
                        type="date"
                        placeholder="Data fim"
                        value={filters.endDate}
                        onChange={(e) => handleFilterChange('endDate', e.target.value)}
                        className="bg-gray-900/50 border-gray-600 text-white"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Deixe em branco para não filtrar por período, ou use &quot;Últimos Remanejamentos&quot; acima.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={handleClearFilters} disabled={isGenerating}>
              Limpar filtros
            </Button>
            <Button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-seguranca-graphite"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Gerar Relatório PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RemanejamentoReportModal;
