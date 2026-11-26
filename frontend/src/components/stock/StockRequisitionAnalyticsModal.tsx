import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  TrendingUp,
  Shield,
  Clock,
  Users,
  Package,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  Search,
  RefreshCw,
  Building2,
  MapPin,
  CheckCircle2,
  Sparkles,
  Loader2,
  ArrowDownUp,
  SlidersHorizontal,
} from 'lucide-react';
import { stockService } from '@/services/stockService';
import { companyService } from '@/services/companyService';
import { Company } from '@/types/company';
import { StockRequisitionAnalyticsDTO, StockRequisitionAnalyticsFilters } from '@/types/stock';
import { useToast } from '@/hooks/use-toast';

interface StockRequisitionAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StockRequisitionAnalyticsModal: React.FC<StockRequisitionAnalyticsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();

  // Filtros
  const [periodType, setPeriodType] = useState<string>('MONTHLY');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [onlyEpi, setOnlyEpi] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Dados auxiliares para combos
  const [companies, setCompanies] = useState<Company[]>([]);

  // Estados de dados e carregamento
  const [loading, setLoading] = useState<boolean>(false);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const [analyticsData, setAnalyticsData] = useState<StockRequisitionAnalyticsDTO | null>(null);

  // Carregar lista de empresas ao abrir
  useEffect(() => {
    if (isOpen) {
      void companyService.getAllCompanies().then((res) => {
        if (Array.isArray(res)) {
          setCompanies(res);
        }
      }).catch(() => {
        // silencioso
      });
    }
  }, [isOpen]);

  // Montar payload de filtros
  const currentFilters = useMemo((): StockRequisitionAnalyticsFilters => {
    const f: StockRequisitionAnalyticsFilters = {
      periodType,
      onlyEpi,
      search: searchTerm.trim() || undefined,
    };
    if (selectedCompanyId && selectedCompanyId !== 'ALL') {
      f.companyId = selectedCompanyId;
    }
    if (periodType === 'CUSTOM') {
      if (startDate) f.startDate = startDate;
      if (endDate) f.endDate = endDate;
    }
    return f;
  }, [periodType, onlyEpi, searchTerm, selectedCompanyId, startDate, endDate]);

  // Carregar dados analíticos
  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await stockService.getStockRequisitionAnalytics(currentFilters);
      setAnalyticsData(data);
    } catch (err: unknown) {
      console.error('Erro ao carregar dados analíticos de requisições:', err);
      toast({
        title: 'Erro ao carregar dados analíticos',
        description: 'Não foi possível obter os dados de consumo do almoxarifado.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentFilters, toast]);

  useEffect(() => {
    if (isOpen) {
      void loadAnalytics();
    }
  }, [isOpen, loadAnalytics]);

  // Exportar Excel
  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      await stockService.downloadStockRequisitionAnalyticsExcel(currentFilters);
      toast({
        title: 'Relatório Excel gerado',
        description: 'A planilha de consumo e reposição de estoque foi baixada com sucesso.',
      });
    } catch (err: unknown) {
      console.error('Erro ao exportar Excel:', err);
      toast({
        title: 'Falha na exportação Excel',
        description: 'Não foi possível gerar a planilha Excel no momento.',
        variant: 'destructive',
      });
    } finally {
      setExportingExcel(false);
    }
  };

  // Exportar PDF
  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);
      await stockService.downloadStockRequisitionAnalyticsPdf(currentFilters);
      toast({
        title: 'Relatório Executivo PDF gerado',
        description: 'O relatório em PDF oficial com ciclo de uso de EPI foi gerado com sucesso.',
      });
    } catch (err: unknown) {
      console.error('Erro ao exportar PDF:', err);
      toast({
        title: 'Falha na exportação PDF',
        description: 'Não foi possível gerar o relatório PDF no momento.',
        variant: 'destructive',
      });
    } finally {
      setExportingPdf(false);
    }
  };

  const summary = analyticsData?.summary;
  const topItems = (analyticsData?.topConsumedItems || []) as any[];
  const sectorList = ((analyticsData as any)?.consumptionBySector || (analyticsData as any)?.sectorConsumption || []) as any[];
  const detailedRows = analyticsData?.detailedRows || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[92vh] overflow-y-auto bg-seguranca-graphite border-gray-700 text-seguranca-lightgray p-0">
        {/* Cabeçalho */}
        <div className="sticky top-0 z-20 bg-seguranca-graphite/95 backdrop-blur-md border-b border-gray-700/80 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-seguranca-red/20 border border-seguranca-red/40 text-seguranca-red">
                <BarChart3 className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                Dashboard & Relatórios de Consumo e EPIs
                <Badge variant="outline" className="border-seguranca-yellow/40 text-seguranca-yellow text-xs font-normal">
                  Almoxarifado & Reposição
                </Badge>
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-gray-400 mt-1">
              Análise de requisições por solicitante, beneficiário, empresa, posto/setor, giro para reposição de compras e ciclo de vida de EPIs.
            </DialogDescription>
          </div>

          {/* Botões de Ação Rápida no Topo */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-emerald-600/70 text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300"
              onClick={handleExportExcel}
              disabled={exportingExcel || loading}
            >
              {exportingExcel ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-400" />
              )}
              Exportar Excel (.xlsx)
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-seguranca-red/80 bg-seguranca-red/10 text-red-300 hover:bg-seguranca-red hover:text-white"
              onClick={handleExportPdf}
              disabled={exportingPdf || loading}
            >
              {exportingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <FileText className="h-4 w-4 mr-1.5 text-seguranca-red" />
              )}
              Exportar PDF Oficial
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
              onClick={loadAnalytics}
              disabled={loading}
              title="Atualizar dados"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* BARRA DE FILTROS */}
          <div className="bg-gray-900/70 border border-gray-700/70 rounded-xl p-4 shadow-inner space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-seguranca-yellow flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Filtros Analíticos
              </span>

              {/* Botões rápidos de período */}
              <div className="flex items-center gap-1 bg-gray-800/80 p-1 rounded-lg border border-gray-700">
                <Button
                  type="button"
                  size="sm"
                  variant={periodType === 'DAILY' ? 'default' : 'ghost'}
                  className={periodType === 'DAILY' ? 'bg-seguranca-red text-white h-7 text-xs px-2.5' : 'h-7 text-xs px-2.5 text-gray-300'}
                  onClick={() => setPeriodType('DAILY')}
                >
                  Diário (Hoje)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={periodType === 'WEEKLY' ? 'default' : 'ghost'}
                  className={periodType === 'WEEKLY' ? 'bg-seguranca-red text-white h-7 text-xs px-2.5' : 'h-7 text-xs px-2.5 text-gray-300'}
                  onClick={() => setPeriodType('WEEKLY')}
                >
                  Semanal (7 dias)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={periodType === 'MONTHLY' ? 'default' : 'ghost'}
                  className={periodType === 'MONTHLY' ? 'bg-seguranca-red text-white h-7 text-xs px-2.5' : 'h-7 text-xs px-2.5 text-gray-300'}
                  onClick={() => setPeriodType('MONTHLY')}
                >
                  Mensal (30 dias)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={periodType === 'CUSTOM' ? 'default' : 'ghost'}
                  className={periodType === 'CUSTOM' ? 'bg-seguranca-red text-white h-7 text-xs px-2.5' : 'h-7 text-xs px-2.5 text-gray-300'}
                  onClick={() => setPeriodType('CUSTOM')}
                >
                  Personalizado
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
              {/* Se personalizado, mostra inputs de data */}
              {periodType === 'CUSTOM' && (
                <>
                  <div>
                    <Label className="text-xs text-gray-400">Data Inicial</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-8 text-xs bg-gray-800 border-gray-700 text-gray-200 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Data Final</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-8 text-xs bg-gray-800 border-gray-700 text-gray-200 mt-1"
                    />
                  </div>
                </>
              )}

              {/* Filtro Empresa */}
              <div className="md:col-span-2">
                <Label className="text-xs text-gray-400">Empresa / Filial</Label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger className="h-8 text-xs bg-gray-800 border-gray-700 text-gray-200 mt-1">
                    <SelectValue placeholder="Todas as empresas" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-gray-200 text-xs">
                    <SelectItem value="ALL">Todas as Empresas</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.razaoSocial || c.nomeFantasia || c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Busca Textual */}
              <div className={periodType === 'CUSTOM' ? 'md:col-span-2' : 'md:col-span-3'}>
                <Label className="text-xs text-gray-400">Buscar por Colaborador, Solicitante ou Item</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Ex: João da Silva, Abner, Bota, Capa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-8 text-xs bg-gray-800 border-gray-700 text-gray-200"
                  />
                </div>
              </div>

              {/* Switch Apenas EPIs */}
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="only-epi-switch"
                  checked={onlyEpi}
                  onCheckedChange={setOnlyEpi}
                  className="data-[state=checked]:bg-seguranca-red"
                />
                <Label htmlFor="only-epi-switch" className="text-xs text-gray-300 font-medium cursor-pointer">
                  Apenas EPIs
                </Label>
              </div>
            </div>
          </div>

          {/* CARDS DE INDICADORES / KPIS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-900/60 border border-gray-700/60 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-gray-400 text-xs">
                <span>Total de Requisições</span>
                <Package className="h-4 w-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">
                {loading ? <Loader2 className="h-6 w-6 animate-spin text-gray-500" /> : (summary?.totalRequisitions ?? 0)}
              </div>
              <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1.5">
                <span className="text-emerald-400">{summary?.approvedRequisitions ?? 0} aprovadas</span> •{' '}
                <span className="text-blue-400">{summary?.deliveredRequisitions ?? 0} entregues</span>
              </div>
            </div>

            <div className="bg-gray-900/60 border border-gray-700/60 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-gray-400 text-xs">
                <span>Itens Entregues (Volume)</span>
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">
                {loading ? <Loader2 className="h-6 w-6 animate-spin text-gray-500" /> : (summary?.totalItemsDelivered ?? 0)}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                Distribuídos em {summary?.distinctItemsCount ?? 0} materiais distintos
              </div>
            </div>

            <div className="bg-gray-900/60 border border-gray-700/60 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-gray-400 text-xs">
                <span>Colaboradores Atendidos</span>
                <Users className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">
                {loading ? <Loader2 className="h-6 w-6 animate-spin text-gray-500" /> : (summary?.distinctEmployeesCount ?? 0)}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                Funcionários com materiais registrados
              </div>
            </div>
          </div>

          {/* GRÁFICOS / PAINÉIS DE REPOSIÇÃO E CONSUMO */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Itens Consumidos (Alerta de Reposição de Estoque) */}
            <div className="bg-gray-900/60 border border-gray-700/60 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Package className="h-4 w-4 text-seguranca-yellow" />
                  Materiais Mais Retirados (Giro de Almoxarifado)
                </h3>
                <span className="text-[11px] text-gray-400">Reposição de Compras</span>
              </div>

              {loading ? (
                <div className="py-12 flex justify-center text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : topItems.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">Nenhum item consumido no período selecionado.</p>
              ) : (
                <div className="space-y-3">
                  {topItems.slice(0, 6).map((item: any, idx: number) => {
                    const firstQty = topItems[0]?.totalQuantity || topItems[0]?.totalQuantityConsumed || 1;
                    const itemQty = item.totalQuantity || item.totalQuantityConsumed || 0;
                    const itemName = item.name || item.itemName || 'Material';
                    const isAlert = item.isLowStock || item.replenishmentAlert;
                    const percent = Math.min(100, Math.round((itemQty / firstQty) * 100));

                    return (
                      <div key={item.stockItemId || idx} className="bg-gray-800/40 border border-gray-700/40 rounded-lg p-2.5">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-gray-200 flex items-center gap-1.5">
                            {item.isEpi && (
                              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] px-1 py-0">
                                EPI
                              </Badge>
                            )}
                            {itemName}
                          </span>
                          <span className="font-semibold text-seguranca-yellow">
                            {itemQty} un. retiradas
                          </span>
                        </div>

                        {/* Barra de progresso visual */}
                        <div className="w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden my-1">
                          <div
                            className={`h-full rounded-full ${isAlert ? 'bg-seguranca-red' : 'bg-seguranca-yellow'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
                          <span>Estoque atual: <strong className="text-gray-200">{item.currentStock ?? 0}</strong> (Mín: {item.minimumStock ?? 0})</span>
                          {isAlert ? (
                            <span className="text-red-400 flex items-center gap-1 font-semibold">
                              <AlertTriangle className="h-3 w-3" /> Reposição urgente necessária
                            </span>
                          ) : (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Nível estável
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Consumo por Setor de Trabalho */}
            <div className="bg-gray-900/60 border border-gray-700/60 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                  Consumo por Setor de Trabalho / Posto
                </h3>
                <span className="text-[11px] text-gray-400">Destinação Operacional</span>
              </div>

              {loading ? (
                <div className="py-12 flex justify-center text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : sectorList.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">Nenhum consumo por setor registrado.</p>
              ) : (
                <div className="space-y-3">
                  {sectorList.slice(0, 6).map((sec) => {
                    const maxSec = sectorList[0]?.totalQuantity || 1;
                    const percent = Math.min(100, Math.round((sec.totalQuantity / maxSec) * 100));

                    return (
                      <div key={sec.sectorId} className="bg-gray-800/40 border border-gray-700/40 rounded-lg p-2.5">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-gray-200">{sec.sectorName}</span>
                          <span className="font-semibold text-emerald-400">
                            {sec.totalQuantity} itens ({sec.requisitionsCount} req.)
                          </span>
                        </div>
                        <div className="w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden my-1">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* TABELA ANALÍTICA DE REQUISIÇÕES E CICLO DE EPI */}
          <div className="bg-gray-900/60 border border-gray-700/60 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Package className="h-4 w-4 text-seguranca-yellow" />
                  Detalhamento Analítico: Quem Pegou, Solicitou & Materiais Entregues
                </h3>
                <p className="text-xs text-gray-400">
                  Histórico de entregas com identificação de empresa, setor de trabalho e todos os itens fornecidos por requisição.
                </p>
              </div>
              <span className="text-xs text-gray-400 font-medium">
                {detailedRows.length} registros encontrados
              </span>
            </div>

            <div className="rounded-lg border border-gray-700/60 overflow-x-auto max-h-[420px]">
              <Table>
                <TableHeader className="bg-gray-800/80 sticky top-0 z-10">
                  <TableRow className="border-gray-700 hover:bg-transparent">
                    <TableHead className="text-seguranca-yellow text-xs font-semibold">Requisição & Data</TableHead>
                    <TableHead className="text-seguranca-yellow text-xs font-semibold">Quem Pegou (Beneficiário)</TableHead>
                    <TableHead className="text-seguranca-yellow text-xs font-semibold">Quem Solicitou</TableHead>
                    <TableHead className="text-seguranca-yellow text-xs font-semibold">Empresa & Unidade</TableHead>
                    <TableHead className="text-seguranca-yellow text-xs font-semibold">Setor / Posto</TableHead>
                    <TableHead className="text-seguranca-yellow text-xs font-semibold">Itens Fornecidos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-gray-400">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-seguranca-yellow" />
                        Carregando registros analíticos...
                      </TableCell>
                    </TableRow>
                  ) : detailedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-gray-400 text-xs">
                        Nenhuma requisição atende aos filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    detailedRows.map((row) => (
                      <TableRow key={row.id || row.requisitionId} className="border-gray-700/50 hover:bg-gray-800/40 text-xs">
                        {/* Requisição & Data */}
                        <TableCell className="align-top py-2.5">
                          <span className="font-semibold text-gray-200 block">{row.requisitionNumber}</span>
                          <span className="text-[11px] text-gray-400 block">{row.date}</span>
                          <Badge
                            className={`mt-1 text-[10px] px-1.5 py-0 ${
                              row.status === 'DELIVERED'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                : row.status === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {row.status === 'DELIVERED' ? 'Entregue' : row.status === 'APPROVED' ? 'Aprovada' : 'Pendente'}
                          </Badge>
                        </TableCell>

                        {/* Quem Pegou */}
                        <TableCell className="align-top py-2.5">
                          <span className="font-medium text-white block">{row.employeeName || '—'}</span>
                          {row.employeeCpf && (
                            <span className="text-[11px] text-gray-400 block">CPF: {row.employeeCpf}</span>
                          )}
                        </TableCell>

                        {/* Quem Solicitou */}
                        <TableCell className="align-top py-2.5 text-gray-300">
                          {row.requestedByName || '—'}
                        </TableCell>

                        {/* Empresa & Unidade */}
                        <TableCell className="align-top py-2.5">
                          <span className="text-gray-200 font-medium block">{row.companyName || '—'}</span>
                          {row.unitName && (
                            <span className="text-[11px] text-gray-400 block">{row.unitName}</span>
                          )}
                        </TableCell>

                        {/* Setor / Posto */}
                        <TableCell className="align-top py-2.5 text-gray-300">
                          <span className="text-gray-200 block">{row.workSector || row.departmentName || '—'}</span>
                        </TableCell>

                        {/* Itens Fornecidos - Lista todos os itens da requisição para o colaborador */}
                        <TableCell className="align-top py-2.5">
                          <div className="space-y-1.5">
                            {row.items && row.items.length > 0 ? (
                              row.items.map((it, idx) => (
                                <div key={idx} className="flex flex-wrap items-center gap-1.5 text-xs text-gray-200">
                                  <span className="font-bold text-seguranca-yellow font-mono text-[11px] bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">
                                    {it.quantity}x
                                  </span>
                                  <span className="font-medium text-white">{it.name || (it as any).itemName}</span>
                                  {it.ca && (
                                    <span className="text-[10px] text-gray-300 bg-gray-800/80 px-1 py-0.5 rounded border border-gray-700">
                                      CA {it.ca}
                                    </span>
                                  )}
                                  {it.isEpi && (
                                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[9px] px-1 py-0">
                                      EPI
                                    </Badge>
                                  )}
                                </div>
                              ))
                            ) : row.summaryItemsText ? (
                              <div className="space-y-1 text-xs text-gray-200">
                                {row.summaryItemsText.split(', ').map((itemStr, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5">
                                    <span className="text-seguranca-yellow font-bold">•</span>
                                    <span>{itemStr}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StockRequisitionAnalyticsModal;
