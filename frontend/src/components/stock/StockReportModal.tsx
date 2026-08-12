import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Download,
  Filter,
  CheckCircle2,
  LayoutDashboard,
  ClipboardList,
  MapPin,
  AlertTriangle,
  Package,
  CalendarClock,
  Sparkles,
  Warehouse,
  Building2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isConnectionError, getServerUnavailableMessage, isServerUnavailableError } from '@/utils/connectionError';
import { stockService } from '@/services/stockService';
import { companyService } from '@/services/companyService';
import { Company } from '@/types/company';
import { resolveCompanyLogoUrl } from '@/utils/companyLogo';
import { StockCategory, StockCategoryLabels, type StorageShelf } from '@/types/stock';
import {
  generateStockInventoryReport,
  type StockReportFilters,
  type StockReportSortBy,
  type StockReportType,
  type StockReportExportFormat,
} from '@/utils/stockInventoryReportGenerator';

interface StockReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReportTypeConfig {
  id: StockReportType;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const reportTypes: ReportTypeConfig[] = [
  {
    id: 'by_items',
    title: 'Por Itens',
    description: 'Itens com subitens (tamanhos/variações) em ordem alfabética — ideal para inventário detalhado',
    icon: <ClipboardList className="w-6 h-6" />,
    color: 'bg-blue-500/20 text-blue-400',
  },
  {
    id: 'physical_check',
    title: 'Conferência Física',
    description: 'Planilha para conferir estoque físico com localização, qtd. sistema e espaço para contagem',
    icon: <Warehouse className="w-6 h-6" />,
    color: 'bg-orange-500/20 text-orange-400',
  },
  {
    id: 'by_location',
    title: 'Por Localização',
    description: 'Organização do estoque por prateleira/andar para percorrer o almoxarifado com eficiência',
    icon: <MapPin className="w-6 h-6" />,
    color: 'bg-purple-500/20 text-purple-400',
  },
  {
    id: 'critical',
    title: 'Estoque Crítico',
    description: 'Itens abaixo do mínimo ou zerados, com localização para reposição rápida',
    icon: <AlertTriangle className="w-6 h-6" />,
    color: 'bg-red-500/20 text-red-400',
  },
];

const defaultFilters: StockReportFilters = {
  sortBy: 'alphabetical',
  category: 'all',
  shelfId: undefined,
  onlyActive: true,
  includeZeroStock: true,
  onlyLowStock: false,
  groupByLocation: true,
};

const StockReportModal: React.FC<StockReportModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [selectedReportType, setSelectedReportType] = useState<StockReportType>('by_items');
  const [currentStep, setCurrentStep] = useState<'type' | 'filters' | 'export'>('type');
  const [loading, setLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<StockReportExportFormat>('pdf');
  const [filters, setFilters] = useState<StockReportFilters>(defaultFilters);
  const [shelves, setShelves] = useState<StorageShelf[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const shelvesLoadedRef = React.useRef(false);
  const companiesLoadedRef = React.useRef(false);

  const selectedCompany = useMemo(
    () => companies.find((c) => String(c.id) === String(selectedCompanyId)) || null,
    [companies, selectedCompanyId]
  );
  const selectedLogoUrl = resolveCompanyLogoUrl(selectedCompany);

  // Shelves só no passo de filtros
  useEffect(() => {
    if (!isOpen || currentStep !== 'filters' || shelvesLoadedRef.current) return;

    let cancelled = false;
    (async () => {
      try {
        const shelfList = await stockService.getAllShelves().catch(() => []);
        if (cancelled) return;
        setShelves(shelfList || []);
        shelvesLoadedRef.current = true;
      } catch (err) {
        console.error('Erro ao carregar prateleiras do relatório de estoque:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, currentStep]);

  // Empresas no passo de exportação (logo no cabeçalho)
  useEffect(() => {
    if (!isOpen || currentStep !== 'export' || companiesLoadedRef.current) return;

    let cancelled = false;
    (async () => {
      try {
        const list = await companyService.getAllCompanies().catch(() => []);
        if (cancelled) return;
        const active = (list || []).filter((c) => !c.status || c.status === 'ACTIVE');
        setCompanies(active.length ? active : list || []);
        if (!selectedCompanyId && (list?.length || 0) > 0) {
          setSelectedCompanyId(String(list![0].id));
        }
        companiesLoadedRef.current = true;
      } catch (err) {
        console.error('Erro ao carregar empresas:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, currentStep]);

  const handleClose = () => {
    setCurrentStep('type');
    setSelectedReportType('by_items');
    setFilters(defaultFilters);
    setExportFormat('pdf');
    shelvesLoadedRef.current = false;
    companiesLoadedRef.current = false;
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

  const selectedReportConfig = useMemo(
    () => reportTypes.find((t) => t.id === selectedReportType),
    [selectedReportType]
  );

  const handleExport = async () => {
    setLoading(true);
    try {
      let company = selectedCompany;
      if (!company) {
        const list = await companyService.getAllCompanies().catch(() => []);
        company = list?.[0] || null;
        if (company) {
          setCompanies(list || []);
          setSelectedCompanyId(String(company.id));
        }
      }

      const items = await stockService.getAllItems();
      const movementsResult = await stockService.searchMovements({}, 0, 2000);

      const result = await generateStockInventoryReport(items, movementsResult.content || [], {
        reportType: selectedReportType,
        filters,
        format: exportFormat,
        companyName: company?.name || company?.sigla || '',
        company,
      });

      toast({
        title: 'Relatório gerado!',
        description:
          exportFormat === 'pdf'
            ? `${result.rowCount} item(ns) em PDF A4 (layout oficial${company?.name ? ` · ${company.name}` : ''}).`
            : `${result.rowCount} item(ns) exportado(s) com sucesso.`,
      });
      handleClose();
    } catch (error) {
      console.error('Erro ao gerar relatório de estoque:', error);
      const isServerDown = isConnectionError(error) || isServerUnavailableError(error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Não foi possível gerar o relatório. Tente novamente.';
      toast({
        title: isServerDown ? 'Servidor indisponível' : 'Erro',
        description: isServerDown ? getServerUnavailableMessage(error) : message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const sortOptions: { id: StockReportSortBy; label: string; hint: string; icon: React.ReactNode }[] = [
    {
      id: 'alphabetical',
      label: 'Ordem alfabética',
      hint: 'Item e subitem A → Z',
      icon: <Package className="w-4 h-4" />,
    },
    {
      id: 'last_registered',
      label: 'Último cadastrado',
      hint: 'Mais recentes no cadastro primeiro',
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      id: 'last_movement',
      label: 'Última movimentação',
      hint: 'Itens movimentados recentemente primeiro',
      icon: <CalendarClock className="w-4 h-4" />,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-seguranca-graphite text-seguranca-lightgray border-gray-700 sm:max-w-4xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-seguranca-red/20 rounded-xl flex items-center justify-center shadow-inner">
              <FileText className="w-6 h-6 text-seguranca-red" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-white tracking-tight">
                Relatórios de Estoque
              </DialogTitle>
              <DialogDescription className="text-gray-400 mt-1">
                Gere inventários por itens/subitens, localização e conferência física do almoxarifado.
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-8 px-2">
            {[
              { id: 'type', label: 'Tipo', icon: LayoutDashboard },
              { id: 'filters', label: 'Filtros', icon: Filter },
              { id: 'export', label: 'Exportar', icon: Download },
            ].map((step, idx) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              return (
                <React.Fragment key={step.id}>
                  <div
                    className={`flex items-center gap-2 transition-all duration-300 ${
                      isActive ? 'text-seguranca-red scale-105' : 'text-gray-500'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                        isActive ? 'border-seguranca-red bg-seguranca-red/10' : 'border-gray-700'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span className="font-bold uppercase text-[10px] tracking-widest flex items-center gap-1">
                      <Icon className="w-3 h-3 hidden sm:inline" />
                      {step.label}
                    </span>
                  </div>
                  {idx < 2 && <div className="h-[2px] flex-1 bg-gray-700" />}
                </React.Fragment>
              );
            })}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-600">
          {currentStep === 'type' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {reportTypes.map((type) => (
                <Card
                  key={type.id}
                  className={`relative cursor-pointer transition-all duration-200 hover:border-seguranca-red/50 ${
                    selectedReportType === type.id
                      ? 'ring-2 ring-seguranca-red bg-seguranca-red/5 border-seguranca-red/30'
                      : 'bg-seguranca-black border-gray-700 hover:bg-gray-800'
                  }`}
                  onClick={() => {
                    setSelectedReportType(type.id);
                    if (type.id === 'physical_check' || type.id === 'by_location') {
                      setFilters((prev) => ({ ...prev, groupByLocation: true, sortBy: 'alphabetical' }));
                    }
                  }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg shadow-sm ${type.color}`}>{type.icon}</div>
                      <div className="flex-1">
                        <h4 className="font-bold text-white mb-1">{type.title}</h4>
                        <p className="text-sm text-gray-400 leading-tight">{type.description}</p>
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
              <div className="p-4 bg-seguranca-black rounded-xl border border-gray-700 space-y-4">
                <h4 className="text-sm font-bold text-seguranca-red uppercase tracking-wider flex items-center gap-2">
                  <CalendarClock className="w-4 h-4" /> Ordenação
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {sortOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFilters({ ...filters, sortBy: opt.id })}
                      className={`text-left p-3 rounded-xl border-2 transition-all ${
                        filters.sortBy === opt.id
                          ? 'border-seguranca-red bg-seguranca-red/10'
                          : 'border-gray-700 bg-seguranca-graphite hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-white font-semibold text-sm mb-1">
                        {opt.icon}
                        {opt.label}
                      </div>
                      <p className="text-[11px] text-gray-400">{opt.hint}</p>
                    </button>
                  ))}
                </div>
                {(selectedReportType === 'by_location' || selectedReportType === 'physical_check') && (
                  <p className="text-[11px] text-gray-500">
                    Na conferência por localização, o agrupamento por prateleira tem prioridade; a ordenação
                    alfabética vale dentro de cada local.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-seguranca-black rounded-xl border border-gray-700 space-y-4">
                  <h4 className="text-sm font-bold text-seguranca-red uppercase tracking-wider flex items-center gap-2">
                    <Package className="w-4 h-4" /> Escopo
                  </h4>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-400">Categoria</Label>
                    <Select
                      value={filters.category || 'all'}
                      onValueChange={(v) =>
                        setFilters({
                          ...filters,
                          category: v === 'all' ? 'all' : (v as StockCategory),
                        })
                      }
                    >
                      <SelectTrigger className="bg-seguranca-graphite border-gray-700 text-white">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent className="bg-seguranca-graphite border-gray-700">
                        <SelectItem value="all">Todas as categorias</SelectItem>
                        {Object.values(StockCategory).map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {StockCategoryLabels[cat]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-gray-400">Localização (prateleira)</Label>
                    <Select
                      value={filters.shelfId || 'all'}
                      onValueChange={(v) =>
                        setFilters({ ...filters, shelfId: v === 'all' ? undefined : v })
                      }
                    >
                      <SelectTrigger className="bg-seguranca-graphite border-gray-700 text-white">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent className="bg-seguranca-graphite border-gray-700 max-h-[260px]">
                        <SelectItem value="all">Todas as localizações</SelectItem>
                        {shelves.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.identification || s.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 bg-seguranca-black rounded-xl border border-gray-700 space-y-4">
                  <h4 className="text-sm font-bold text-seguranca-red uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Opções de conferência
                  </h4>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-white">Somente ativos</p>
                      <p className="text-[11px] text-gray-500">Ignora itens inativos no cadastro</p>
                    </div>
                    <Switch
                      checked={filters.onlyActive}
                      onCheckedChange={(v) => setFilters({ ...filters, onlyActive: v })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-white">Filtro de Quantidade / Estoque Zerado</Label>
                    <Select
                      value={
                        filters.onlyZeroStock || filters.zeroStockFilter === 'zero'
                          ? 'zero'
                          : filters.zeroStockFilter === 'non_zero' || !filters.includeZeroStock
                            ? 'non_zero'
                            : 'all'
                      }
                      onValueChange={(v) => {
                        if (v === 'zero') {
                          setFilters({
                            ...filters,
                            zeroStockFilter: 'zero',
                            onlyZeroStock: true,
                            includeZeroStock: true,
                          });
                        } else if (v === 'non_zero') {
                          setFilters({
                            ...filters,
                            zeroStockFilter: 'non_zero',
                            onlyZeroStock: false,
                            includeZeroStock: false,
                          });
                        } else {
                          setFilters({
                            ...filters,
                            zeroStockFilter: 'all',
                            onlyZeroStock: false,
                            includeZeroStock: true,
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="bg-seguranca-graphite border-gray-600 text-white">
                        <SelectValue placeholder="Selecione o filtro de zerados" />
                      </SelectTrigger>
                      <SelectContent className="bg-seguranca-graphite border-gray-600 text-white">
                        <SelectItem value="all">Todos os itens (com e sem estoque)</SelectItem>
                        <SelectItem value="zero">Somente itens ZERADOS (quantidade = 0)</SelectItem>
                        <SelectItem value="non_zero">Somente itens COM ESTOQUE (quantidade &gt; 0)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-white">Somente estoque baixo</p>
                      <p className="text-[11px] text-gray-500">Abaixo do mínimo cadastrado</p>
                    </div>
                    <Switch
                      checked={filters.onlyLowStock}
                      onCheckedChange={(v) => setFilters({ ...filters, onlyLowStock: v })}
                    />
                  </div>

                  {(selectedReportType === 'physical_check' || selectedReportType === 'by_location') && (
                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-700">
                      <div>
                        <p className="text-sm text-white">Agrupar por localização</p>
                        <p className="text-[11px] text-gray-500">
                          Organiza o papel por prateleira para conferência física eficiente
                        </p>
                      </div>
                      <Switch
                        checked={filters.groupByLocation}
                        onCheckedChange={(v) => setFilters({ ...filters, groupByLocation: v })}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 'export' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Empresa → logo no cabeçalho */}
              <div className="bg-seguranca-black rounded-xl border border-gray-700 p-5 space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-seguranca-yellow" />
                      Empresa do relatório
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      O logo da empresa selecionada aparece no bloco preto do cabeçalho do PDF.
                    </p>
                  </div>
                  <div className="w-28 h-16 rounded-lg bg-[#111827] border border-gray-600 flex items-center justify-center overflow-hidden shrink-0">
                    {selectedLogoUrl ? (
                      <img
                        src={selectedLogoUrl}
                        alt={selectedCompany?.name || 'Logo'}
                        className="max-w-full max-h-full object-contain p-1.5"
                      />
                    ) : (
                      <span className="text-[10px] text-seguranca-yellow font-bold uppercase text-center px-1 leading-tight">
                        {selectedCompany?.sigla || selectedCompany?.name || 'Sem logo'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-seguranca-lightgray text-sm">Selecionar empresa</Label>
                  <Select
                    value={selectedCompanyId || 'none'}
                    onValueChange={(value) => setSelectedCompanyId(value === 'none' ? '' : value)}
                  >
                    <SelectTrigger className="bg-seguranca-graphite border-gray-600 text-white h-11">
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-graphite border-gray-600 max-h-64">
                      {companies.length === 0 && (
                        <SelectItem value="none" className="text-gray-400">
                          Nenhuma empresa cadastrada
                        </SelectItem>
                      )}
                      {companies.map((c) => (
                        <SelectItem
                          key={String(c.id)}
                          value={String(c.id)}
                          className="text-seguranca-lightgray hover:bg-seguranca-black"
                        >
                          {c.sigla ? `${c.sigla} — ${c.name}` : c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCompany && (
                    <p className="text-[11px] text-gray-500">
                      {[selectedCompany.cnpj ? `CNPJ ${selectedCompany.cnpj}` : null, selectedCompany.city]
                        .filter(Boolean)
                        .join(' · ') || 'Dados da empresa serão usados no rodapé do PDF.'}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white">Formato do Arquivo</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={() => setExportFormat('pdf')}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                        exportFormat === 'pdf'
                          ? 'border-seguranca-red bg-seguranca-red/10'
                          : 'border-gray-700 bg-seguranca-black hover:border-gray-600'
                      }`}
                    >
                      <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-red-400" />
                      </div>
                      <div className="text-left">
                        <span className="block font-bold text-white">Documento PDF</span>
                        <span className="text-xs text-gray-400">Ideal para imprimir e conferir no almoxarifado</span>
                      </div>
                      {exportFormat === 'pdf' && (
                        <CheckCircle2 className="w-5 h-5 text-seguranca-red ml-auto" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setExportFormat('excel')}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                        exportFormat === 'excel'
                          ? 'border-seguranca-red bg-seguranca-red/10'
                          : 'border-gray-700 bg-seguranca-black hover:border-gray-600'
                      }`}
                    >
                      <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <Download className="w-6 h-6 text-green-400" />
                      </div>
                      <div className="text-left">
                        <span className="block font-bold text-white">Planilha Excel</span>
                        <span className="text-xs text-gray-400">
                          Colunas de Qtd Física / Diferença para digitar a contagem
                        </span>
                      </div>
                      {exportFormat === 'excel' && (
                        <CheckCircle2 className="w-5 h-5 text-seguranca-red ml-auto" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-seguranca-black rounded-xl border border-gray-700 p-6 space-y-4">
                  <h3 className="text-lg font-bold text-white border-b border-gray-700 pb-2">
                    Resumo da Configuração
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-gray-400 text-sm">Empresa</span>
                      <span className="text-white text-sm font-medium truncate max-w-[180px]">
                        {selectedCompany?.sigla || selectedCompany?.name || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-gray-400 text-sm">Tipo</span>
                      <Badge variant="outline" className="text-seguranca-red border-seguranca-red/30">
                        {selectedReportConfig?.title}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-gray-400 text-sm">Ordenação</span>
                      <span className="text-white text-sm font-medium">
                        {sortOptions.find((o) => o.id === filters.sortBy)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-gray-400 text-sm">Categoria</span>
                      <span className="text-white text-sm">
                        {filters.category && filters.category !== 'all'
                          ? StockCategoryLabels[filters.category]
                          : 'Todas'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-gray-400 text-sm">Localização</span>
                      <span className="text-white text-sm truncate max-w-[180px]">
                        {filters.shelfId
                          ? shelves.find((s) => s.id === filters.shelfId)?.identification || 'Filtrada'
                          : 'Todas'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-gray-400 text-sm">Formato</span>
                      <span className="text-white text-sm uppercase font-semibold">{exportFormat}</span>
                    </div>
                  </div>
                  <div className="pt-4 mt-2 border-t border-gray-700">
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      Cabeçalho com logo da empresa e rodapé centralizado no padrão oficial
                      (nome, endereço, telefone/e-mail e CNPJ sob a linha do template).
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

export default StockReportModal;
