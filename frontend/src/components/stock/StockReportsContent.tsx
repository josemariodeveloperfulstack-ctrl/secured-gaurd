import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { companyService } from '@/services/companyService';
import { Company } from '@/types/company';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Package,
  AlertTriangle,
  DollarSign,
  Download,
  Calendar,
  RefreshCw
} from 'lucide-react';
import {
  MovementType,
  MovementReason,
  MovementTypeLabels,
  MovementReasonLabels,
  StockCategoryLabels,
  StockRequisitionStatusLabels,
  StockRequisitionStatus,
  type StockItem,
  type StockRequisitionListItem,
  type StockDashboardDTO,
  type StockMovementChartDTO
} from '@/types/stock';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { normalizeStockItem } from '@/services/stockService';
import StockReportModal from '@/components/stock/StockReportModal';
import { isConnectionError, isServerUnavailableError } from '@/utils/connectionError';

type ReportTypeOption =
  | 'low-stock'
  | 'out-of-stock'
  | 'over-stock'
  | 'turnover'
  | 'value'
  | 'movements'
  | 'requisitions'
  | 'locations'
  | 'consolidated'
  | 'by-item'
  | 'by-shelf'
  | 'top-exits'
  | 'qty-range'
  | 'physical-inventory'
  | 'consolidated-requisitions';

type MovementDirectionFilter = 'ALL' | 'ENTRADA' | 'SAIDA';

const FILTER_NONE = '__none__';

interface StockReport {
  id: string;
  productName: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  averageConsumption: number;
  turnoverRate: number;
  lastMovementDate: string;
  totalValue: number;
  status: 'NORMAL' | 'LOW' | 'OUT' | 'OVER';
  /** Movimentações: código do item */
  itemCode?: string;
  /** Movimentações: funcionário */
  employeeName?: string;
  /** Movimentações / requisições: motivo */
  movementReasonText?: string;
  /** Requisições: quem solicitou */
  requestedByName?: string;
}

function getPeriodBounds(dateRange: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  const days = Number.parseInt(dateRange, 10);
  const n = Number.isFinite(days) && days > 0 ? days : 30;
  start.setDate(end.getDate() - n);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function categoryLabel(category: unknown): string {
  if (typeof category === 'string' && category in StockCategoryLabels) {
    return StockCategoryLabels[category as keyof typeof StockCategoryLabels];
  }
  return typeof category === 'string' ? category : '—';
}

function mapStockItemToReport(item: StockItem): StockReport {
  const locSum = Array.isArray(item.locations)
    ? item.locations.reduce((sum, loc) => sum + (Number(loc.quantity) || 0), 0)
    : 0;
  const fromField = item.currentQuantity ?? 0;
  const current = locSum > 0 ? locSum : fromField;
  const minimum = item.minimumQuantity ?? 0;
  const unit =
    typeof item.unitCost === 'number' && !Number.isNaN(item.unitCost)
      ? item.unitCost
      : Number(item.unitCost) || 0;
  const displayName = (item.fullName && item.fullName.trim()) || item.name || '—';
  // Sem máximo cadastrado: "alto" = bem acima do mínimo (ou qtd elevada se mínimo = 0)
  const highThreshold = minimum > 0 ? Math.max(minimum * 2, minimum + 5) : 20;
  let status: StockReport['status'] = 'NORMAL';
  if (current <= 0) status = 'OUT';
  else if (current <= minimum) status = 'LOW';
  else if (current >= highThreshold) status = 'OVER';

  return {
    id: item.id,
    productName: displayName,
    category: categoryLabel(item.category),
    currentStock: current,
    minimumStock: minimum,
    maximumStock: highThreshold,
    averageConsumption: 0,
    turnoverRate: 0,
    lastMovementDate: item.updatedAt || item.createdAt || new Date().toISOString(),
    totalValue: current * unit,
    status
  };
}

function movementTypeLabel(t: unknown): string {
  if (t === MovementType.ENTRADA || t === 'ENTRADA') return MovementTypeLabels[MovementType.ENTRADA];
  if (t === MovementType.SAIDA || t === 'SAIDA') return MovementTypeLabels[MovementType.SAIDA];
  return typeof t === 'string' ? t : '—';
}

function movementReasonLabel(r: unknown): string {
  if (typeof r === 'string' && r in MovementReasonLabels) {
    return MovementReasonLabels[r as MovementReason];
  }
  return typeof r === 'string' ? r : '—';
}

function requisitionStatusLabel(s: StockRequisitionListItem['status']): string {
  if (s in StockRequisitionStatusLabels) {
    return StockRequisitionStatusLabels[s as StockRequisitionStatus];
  }
  return String(s);
}

const StockReportsContent: React.FC = () => {
  const { toast } = useToast();
  const [reports, setReports] = useState<StockReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<ReportTypeOption>('low-stock');
  const [dateRange, setDateRange] = useState('30');
  const [empresa, setEmpresa] = useState<Company | undefined>(undefined);
  const [reportFiltersOpen, setReportFiltersOpen] = useState(false);
  const [stockReportModalOpen, setStockReportModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>(FILTER_NONE);
  const [selectedShelfId, setSelectedShelfId] = useState<string>(FILTER_NONE);
  const [movementDirection, setMovementDirection] = useState<MovementDirectionFilter>('ALL');
  const [qtyFilterMin, setQtyFilterMin] = useState<string>('');
  const [qtyFilterMax, setQtyFilterMax] = useState<string>('');
  const [itemOptions, setItemOptions] = useState<StockItem[]>([]);
  const [shelfOptions, setShelfOptions] = useState<{ id: string; identification: string }[]>([]);
  const metaLoadedRef = React.useRef(false);
  
  // Estatísticas
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    overStockProducts: 0,
    totalValue: 0,
    totalQuantity: 0,
    averageTurnover: 0,
    generatedRequisitions: 0,
    consolidatedRequisitions: 0,
  });

  const [dashboardData, setDashboardData] = useState<any>(null);

  // Só cards de resumo no mount (1 request). Tabela/itens/prateleiras sob demanda.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadStats({ cancelled });
      } catch {
        /* silencioso — evita tempestade de toasts se o backend estiver reiniciando */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Metadados (itens/prateleiras) só quando o painel de filtros abre
  useEffect(() => {
    if (!reportFiltersOpen || metaLoadedRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const { stockService } = await import('@/services/stockService');
        const [items, shelves] = await Promise.all([
          stockService.getAllItems(),
          stockService.getAllShelves(),
        ]);
        if (cancelled) return;
        setItemOptions(items);
        setShelfOptions(
          (shelves || []).map((s) => ({
            id: s.id,
            identification: s.identification || s.id,
          }))
        );
        metaLoadedRef.current = true;
      } catch {
        if (!cancelled) {
          setItemOptions([]);
          setShelfOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportFiltersOpen]);

  const stockReportCacheRef = React.useRef<{ at: number; data: Awaited<ReturnType<typeof import('@/services/stockService').stockService.getStockReport>> | null }>({
    at: 0,
    data: null,
  });

  const getStockReportCached = async () => {
    const { stockService } = await import('@/services/stockService');
    const now = Date.now();
    if (stockReportCacheRef.current.data && now - stockReportCacheRef.current.at < 4000) {
      return stockReportCacheRef.current.data;
    }
    const data = await stockService.getStockReport();
    stockReportCacheRef.current = { at: now, data };
    return data;
  };

  const ensureCompany = async (): Promise<Company | undefined> => {
    if (empresa?.id) return empresa;
    try {
      const companies = await companyService.getAllCompanies();
      if (companies && companies.length > 0) {
        setEmpresa(companies[0]);
        return companies[0];
      }
    } catch (error) {
      console.error('Erro ao carregar empresa para relatórios de estoque:', error);
    }
    return undefined;
  };

  const loadReports = async (opts?: { cancelled?: boolean; skipToastOnNetwork?: boolean }) => {
    const cancelled = opts?.cancelled ?? false;
    try {
      setLoading(true);

      const { stockService } = await import('@/services/stockService');
      const { start, end } = getPeriodBounds(dateRange);

      let filteredReports: StockReport[] = [];

      switch (reportType) {
        case 'consolidated': {
          filteredReports = [];
          break;
        }
        case 'low-stock': {
          const reportData = await getStockReportCached();
          const items = (reportData.lowStockItems || []).map((row) =>
            normalizeStockItem(row as unknown as Record<string, unknown>)
          );
          filteredReports = items.map((row) => mapStockItemToReport(row));
          break;
        }
        case 'out-of-stock': {
          const reportData = await getStockReportCached();
          const items = (reportData.outOfStockItems || []).map((row) =>
            normalizeStockItem(row as unknown as Record<string, unknown>)
          );
          filteredReports = items.map((row) => mapStockItemToReport(row));
          break;
        }
        case 'over-stock':
        case 'turnover':
        case 'value': {
          const allItems = await stockService.getAllItems();
          const formattedReports = allItems.map((row) => mapStockItemToReport(row));
          if (reportType === 'over-stock') {
            filteredReports = formattedReports.filter((r) => r.status === 'OVER');
          } else if (reportType === 'turnover') {
            filteredReports = [...formattedReports].sort((a, b) => b.turnoverRate - a.turnoverRate);
          } else {
            filteredReports = [...formattedReports].sort((a, b) => b.totalValue - a.totalValue);
          }
          break;
        }
        case 'movements': {
          const movParams: {
            startDate: string;
            endDate: string;
            movementType?: MovementType;
          } = {
            startDate: start.toISOString(),
            endDate: end.toISOString()
          };
          if (movementDirection === 'ENTRADA') movParams.movementType = MovementType.ENTRADA;
          else if (movementDirection === 'SAIDA') movParams.movementType = MovementType.SAIDA;
          const movReport = await stockService.getMovementsReport(movParams);
          const movements = movReport?.movements || [];
          filteredReports = movements.map((m: Record<string, unknown>) => ({
            id: String(m.id ?? ''),
            productName: String(m.itemName ?? '—'),
            category: movementTypeLabel(m.movementType),
            currentStock: Number(m.quantity ?? 0),
            minimumStock: Number(m.previousQuantity ?? 0),
            maximumStock: Number(m.newQuantity ?? 0),
            averageConsumption: 0,
            turnoverRate: 0,
            lastMovementDate: String(m.movementDate ?? ''),
            totalValue: Number(m.totalCost ?? 0),
            status: 'NORMAL' as const,
            itemCode: String(m.itemCode ?? ''),
            employeeName: String(m.employeeName ?? m.userName ?? ''),
            movementReasonText: movementReasonLabel(m.reason)
          }));
          break;
        }
        case 'by-item': {
          if (!selectedItemId || selectedItemId === FILTER_NONE) {
            filteredReports = [];
            break;
          }
          const allItems = await stockService.getAllItems();
          const row = allItems.find((i) => i.id === selectedItemId);
          filteredReports = row ? [mapStockItemToReport(row)] : [];
          break;
        }
        case 'by-shelf': {
          if (!selectedShelfId || selectedShelfId === FILTER_NONE) {
            filteredReports = [];
            break;
          }
          const shelfItems = await stockService.getAllItems();
          filteredReports = shelfItems
            .filter((i) => (i.locations || []).some((l) => l.shelfId === selectedShelfId))
            .map((row) => mapStockItemToReport(row));
          break;
        }
        case 'top-exits': {
          const topReport = await stockService.getMovementsReport({
            startDate: start.toISOString(),
            endDate: end.toISOString()
          });
          const tops = (topReport?.topMovedItems || []) as Array<Record<string, unknown>>;
          filteredReports = tops.map((t, idx) => ({
            id: String(t.itemId ?? t.item_id ?? idx),
            productName: String(t.itemName ?? t.item_name ?? '—'),
            category: String(t.itemCode ?? t.item_code ?? '—'),
            currentStock: Number(t.totalQuantity ?? t.total_quantity ?? 0),
            minimumStock: Number(t.movementCount ?? t.movement_count ?? 0),
            maximumStock: 0,
            averageConsumption: 0,
            turnoverRate: 0,
            lastMovementDate: new Date().toISOString(),
            totalValue: Number(t.totalCost ?? t.total_cost ?? 0),
            status: 'NORMAL' as const
          }));
          break;
        }
        case 'qty-range': {
          const rangeItems = await stockService.getAllItems();
          const qMin = qtyFilterMin.trim() === '' ? -Infinity : Number(qtyFilterMin);
          const qMax = qtyFilterMax.trim() === '' ? Infinity : Number(qtyFilterMax);
          const minOk = Number.isFinite(qMin);
          const maxOk = Number.isFinite(qMax);
          const list =
            minOk && maxOk
              ? rangeItems.filter((i) => i.currentQuantity >= qMin && i.currentQuantity <= qMax)
              : rangeItems;
          filteredReports = list.map((row) => mapStockItemToReport(row));
          break;
        }
        case 'locations': {
          const rows = await stockService.getLocationStockSummary();
          filteredReports = rows.map((row, idx) => ({
            id: `loc-${idx}-${row.shelfIdentification ?? ''}-${row.floor ?? ''}`,
            productName: row.shelfIdentification ? `Prateleira ${row.shelfIdentification}` : '—',
            category: row.floor != null && row.floor !== '' ? `Andar ${row.floor}` : '—',
            currentStock: Number(row.totalQuantity ?? 0),
            minimumStock: 0,
            maximumStock: 0,
            averageConsumption: 0,
            turnoverRate: 0,
            lastMovementDate: new Date().toISOString(),
            totalValue: 0,
            status: 'NORMAL' as const
          }));
          break;
        }
        case 'requisitions': {
          const list = await stockService.listStockRequisitions();
          const startMs = start.getTime();
          const endMs = end.getTime();
          const inPeriod = list.filter((r) => {
            if (!r.createdAt) return false;
            const t = new Date(r.createdAt).getTime();
            return t >= startMs && t <= endMs;
          });
          filteredReports = inPeriod.map((r) => ({
            id: r.id,
            productName: r.requisitionNumber || '—',
            category: requisitionStatusLabel(r.status),
            currentStock: r.linesCount ?? 0,
            minimumStock: 0,
            maximumStock: 0,
            averageConsumption: 0,
            turnoverRate: 0,
            lastMovementDate: r.createdAt || new Date().toISOString(),
            totalValue: 0,
            status: 'NORMAL' as const,
            movementReasonText: r.movementReasonLabel || '—',
            requestedByName: r.requestedByName || '—',
            employeeName: r.employeeName || '—'
          }));
          break;
        }
        default: {
          const reportData = await getStockReportCached();
          const items = (reportData.lowStockItems || []).map((row) =>
            normalizeStockItem(row as unknown as Record<string, unknown>)
          );
          filteredReports = items.map((row) => mapStockItemToReport(row));
          break;
        }
      }

      if (!cancelled) setReports(filteredReports);
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
      if (!cancelled && !opts?.skipToastOnNetwork) {
        const isNetwork =
          isConnectionError(error) ||
          isServerUnavailableError(error) ||
          (error instanceof Error && /não está disponível|Backend/i.test(error.message));
        toast({
          title: isNetwork ? 'Servidor indisponível' : 'Erro',
          description: isNetwork
            ? 'O backend reiniciou ou ficou offline por um instante. Aguarde e clique em Gerar Relatório novamente.'
            : 'Erro ao carregar relatórios do banco de dados.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (opts?: { cancelled?: boolean; withDashboard?: boolean }) => {
    const cancelled = opts?.cancelled ?? false;
    try {
      const reportData = await getStockReportCached();
      if (cancelled) return;

      setStats({
        totalProducts: reportData.totalItems || 0,
        lowStockProducts: reportData.lowStockCount || 0,
        outOfStockProducts: reportData.outOfStockCount || 0,
        overStockProducts: 0,
        totalValue: reportData.totalValue || 0,
        totalQuantity: reportData.totalQuantity ?? 0,
        averageTurnover: 0,
        generatedRequisitions: 0,
        consolidatedRequisitions: 0,
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      throw error;
    }

    if (!opts?.withDashboard) return;

    const currentEmpresa = await ensureCompany();
    if (!currentEmpresa?.id || cancelled) return;

    try {
      const { stockService } = await import('@/services/stockService');
      const { start, end } = getPeriodBounds(dateRange);
      const data = await stockService.getStockDashboard(
        currentEmpresa.id,
        start.toISOString(),
        end.toISOString()
      );
      if (cancelled) return;
      setDashboardData(data);

      if (data) {
        setStats((prev) => ({
          ...prev,
          generatedRequisitions: data.generatedRequisitionsCount || 0,
          consolidatedRequisitions: data.consolidatedRequisitionsCount || 0,
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard analítico:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LOW': return 'bg-red-100 text-red-800';
      case 'OUT': return 'bg-red-100 text-red-800';
      case 'OVER': return 'bg-yellow-100 text-yellow-800';
      case 'NORMAL': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'LOW': return 'Estoque Baixo';
      case 'OUT': return 'Sem Estoque';
      case 'OVER': return 'Estoque Alto';
      case 'NORMAL': return 'Normal';
      default: return status;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const exportReport = async () => {
    try {
      const allowExportSemLinhasNaTela =
        reportType === 'consolidated' ||
        reportType === 'movements' ||
        reportType === 'requisitions' ||
        reportType === 'locations' ||
        reportType === 'top-exits' ||
        reportType === 'by-item' ||
        reportType === 'by-shelf' ||
        reportType === 'qty-range';

      if (!allowExportSemLinhasNaTela && reports.length === 0) {
        toast({
          title: "Aviso",
          description: "Não há dados para exportar.",
          variant: "destructive",
        });
        return;
      }

      let currentEmpresa = await ensureCompany();

      if (!currentEmpresa?.id) {
        toast({
          title: "Erro",
          description: "Não foi possível identificar a empresa para gerar o relatório.",
          variant: "destructive",
        });
        return;
      }

      const { stockService } = await import('@/services/stockService');
      const { start, end } = getPeriodBounds(dateRange);
      const startDateISO = start.toISOString();
      const endDateISO = end.toISOString();

      if (reportType === 'consolidated' || reportType === 'requisitions' || reportType === 'locations') {
        await stockService.downloadConsolidatedStockPDF(currentEmpresa.id, startDateISO, endDateISO);
      } else if (reportType === 'low-stock') {
        await stockService.downloadLowStockPDF(currentEmpresa.id);
      } else if (reportType === 'movements') {
        await stockService.downloadMovementsPDF(currentEmpresa.id, startDateISO, endDateISO);
      } else if (reportType === 'physical-inventory') {
        await stockService.downloadPhysicalInventoryPDF(currentEmpresa.id);
      } else if (reportType === 'consolidated-requisitions') {
        await stockService.downloadConsolidatedRequisitionsPDF(currentEmpresa.id, startDateISO, endDateISO);
      } else {
        await stockService.downloadGeneralStockPDF(currentEmpresa.id);
      }

      toast({
        title: "Sucesso",
        description: "Relatório exportado em A4 retrato com layout padrão do sistema.",
      });
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar relatório. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-seguranca-lightgray">Relatórios de Estoque</h2>
          <p className="text-gray-400 mt-1">
            Análise e relatórios detalhados do estoque
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setReportFiltersOpen((open) => !open)}
            className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
          >
            Filtros rápidos
          </Button>
          <Button
            type="button"
            onClick={() => setStockReportModalOpen(true)}
            className="bg-seguranca-red hover:bg-seguranca-darkred"
          >
            <Download className="w-4 h-4 mr-2" />
            Gerar Relatório
          </Button>
        </div>
      </div>

      <StockReportModal
        isOpen={stockReportModalOpen}
        onClose={() => setStockReportModalOpen(false)}
      />

      {/* Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total de Produtos</p>
                <p className="text-2xl font-bold text-seguranca-lightgray">{stats.totalProducts}</p>
              </div>
              <Package className="h-8 w-8 text-seguranca-yellow opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-graphite border-gray-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Estoque Crítico (Baixo/Zero)</p>
                <p className="text-2xl font-bold text-red-500">{stats.lowStockProducts + stats.outOfStockProducts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-graphite border-gray-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Requisições Geradas</p>
                <p className="text-2xl font-bold text-blue-500">{stats.generatedRequisitions}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-graphite border-gray-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Valor em Estoque</p>
                <p className="text-2xl font-bold text-green-500">{formatCurrency(stats.totalValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-seguranca-graphite border-gray-600">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray text-lg">Movimentações de Estoque ({dateRange} dias)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData?.movementsChart || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
                <XAxis dataKey="label" stroke="#999" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#999" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#444', color: '#fff', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{ fill: '#333' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="entries" name="Entradas" fill="#4ade80" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="exits" name="Saídas" fill="#f87171" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-graphite border-gray-600">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray text-lg">Status do Estoque</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col items-center justify-center">
            {dashboardData?.stockStatusDistribution ? (
              <>
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Normal', value: dashboardData.stockStatusDistribution.NORMAL || 0 },
                        { name: 'Baixo', value: dashboardData.stockStatusDistribution.BAIXO || 0 },
                        { name: 'Sem Estoque', value: dashboardData.stockStatusDistribution.SEM_ESTOQUE || 0 },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#4ade80" />
                      <Cell fill="#facc15" />
                      <Cell fill="#f87171" />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#444', color: '#fff', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[#4ade80]" />
                    <span className="text-xs text-gray-400">Normal</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[#facc15]" />
                    <span className="text-xs text-gray-400">Baixo</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[#f87171]" />
                    <span className="text-xs text-gray-400">Crítico</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Carregando...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Collapsible open={reportFiltersOpen} onOpenChange={setReportFiltersOpen}>
        <CollapsibleContent>
          <Card className="bg-seguranca-graphite border-gray-600 border-seguranca-yellow/40 mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-seguranca-lightgray text-lg">Opções de filtro do relatório</CardTitle>
              <p className="text-sm text-gray-400">
                Defina o período, o tipo de visão e filtros opcionais. Depois aplique para atualizar a tabela ou baixe o PDF.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-seguranca-lightgray">Por período</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray w-full min-w-0">
                      <div className="flex-1 truncate text-left">
                        <SelectValue placeholder="Período" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-graphite border-gray-600">
                      <SelectItem value="7">Últimos 7 dias</SelectItem>
                      <SelectItem value="30">Últimos 30 dias</SelectItem>
                      <SelectItem value="90">Últimos 90 dias</SelectItem>
                      <SelectItem value="365">Último ano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-seguranca-lightgray">Tipo de relatório</Label>
                  <Select value={reportType} onValueChange={(v) => setReportType(v as ReportTypeOption)}>
                    <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray w-full min-w-0">
                      <div className="flex-1 truncate text-left">
                        <SelectValue placeholder="Tipo" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-graphite border-gray-600 max-h-[320px]">
                      <SelectItem value="low-stock">Estoque baixo</SelectItem>
                      <SelectItem value="out-of-stock">Sem estoque</SelectItem>
                      <SelectItem value="over-stock">Estoque alto</SelectItem>
                      <SelectItem value="turnover">Giro de estoque</SelectItem>
                      <SelectItem value="value">Valor por categoria</SelectItem>
                      <SelectItem value="movements">Movimentações de entrada e saída</SelectItem>
                      <SelectItem value="top-exits">Tipos de itens que mais saem</SelectItem>
                      <SelectItem value="requisitions">Requisições (solicitadas / aprovadas)</SelectItem>
                      <SelectItem value="locations">Quantidade por prateleira / localização</SelectItem>
                      <SelectItem value="physical-inventory">Planilha de conferência física (Inventário)</SelectItem>
                      <SelectItem value="consolidated-requisitions">Relatório de requisições consolidadas</SelectItem>
                      <SelectItem value="by-item">Por item</SelectItem>
                      <SelectItem value="by-shelf">Por prateleira</SelectItem>
                      <SelectItem value="qty-range">Quantidade mínima e máxima (estoque atual)</SelectItem>
                      <SelectItem value="consolidated">Relatório consolidado (PDF completo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {reportType === 'movements' && (
                <div className="space-y-2 max-w-md">
                  <Label className="text-seguranca-lightgray">Movimentações</Label>
                  <Select
                    value={movementDirection}
                    onValueChange={(v) => setMovementDirection(v as MovementDirectionFilter)}
                  >
                    <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-graphite border-gray-600">
                      <SelectItem value="ALL">Entrada e saída</SelectItem>
                      <SelectItem value="ENTRADA">Somente entrada</SelectItem>
                      <SelectItem value="SAIDA">Somente saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {reportType === 'by-item' && (
                <div className="space-y-2 max-w-xl">
                  <Label className="text-seguranca-lightgray">Por item</Label>
                  <Select
                    value={selectedItemId}
                    onValueChange={(v) => setSelectedItemId(v === FILTER_NONE ? FILTER_NONE : v)}
                  >
                    <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                      <SelectValue placeholder="Selecione o item" />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-graphite border-gray-600 max-h-[280px]">
                      <SelectItem value={FILTER_NONE}>— Selecione —</SelectItem>
                      {itemOptions.map((it) => (
                        <SelectItem key={it.id} value={it.id}>
                          {(it.fullName && it.fullName.trim()) || it.name} ({it.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {reportType === 'by-shelf' && (
                <div className="space-y-2 max-w-md">
                  <Label className="text-seguranca-lightgray">Por prateleira</Label>
                  <Select
                    value={selectedShelfId}
                    onValueChange={(v) => setSelectedShelfId(v === FILTER_NONE ? FILTER_NONE : v)}
                  >
                    <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                      <SelectValue placeholder="Prateleira" />
                    </SelectTrigger>
                    <SelectContent className="bg-seguranca-graphite border-gray-600 max-h-[260px]">
                      <SelectItem value={FILTER_NONE}>— Selecione —</SelectItem>
                      {shelfOptions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.identification}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {reportType === 'qty-range' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                  <div className="space-y-2">
                    <Label className="text-seguranca-lightgray">Quantidade mínima (estoque atual)</Label>
                    <Input
                      type="number"
                      min={0}
                      className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                      value={qtyFilterMin}
                      onChange={(e) => setQtyFilterMin(e.target.value)}
                      placeholder="Ex.: 0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-seguranca-lightgray">Quantidade máxima (estoque atual)</Label>
                    <Input
                      type="number"
                      min={0}
                      className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                      value={qtyFilterMax}
                      onChange={(e) => setQtyFilterMax(e.target.value)}
                      placeholder="Ex.: 100"
                    />
                  </div>
                  <p className="text-xs text-gray-500 sm:col-span-2">
                    Deixe um campo vazio para não limitar por esse lado. Use &quot;Aplicar filtros&quot; para atualizar.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-gray-600 text-seguranca-lightgray"
                  onClick={() => setReportFiltersOpen(false)}
                >
                  Fechar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-seguranca-yellow text-seguranca-yellow hover:bg-seguranca-black"
                  onClick={() => {
                    void (async () => {
                      await loadStats({ withDashboard: true }).catch(() => undefined);
                      await loadReports();
                      toast({
                        title: 'Filtros aplicados',
                        description: 'A tabela foi atualizada com os critérios escolhidos.',
                      });
                    })();
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Aplicar filtros
                </Button>
                <Button type="button" className="bg-seguranca-red hover:bg-seguranca-darkred" onClick={() => void exportReport()}>
                  <Download className="w-4 h-4 mr-2" />
                  Baixar PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {!reportFiltersOpen && (
        <div className="flex flex-wrap items-center justify-between gap-2 -mt-2">
          <p className="text-sm text-gray-500">
            Use <span className="font-medium text-seguranca-lightgray">Gerar Relatório</span> para PDF/Excel avançado.
            A tabela abaixo só carrega sob demanda — clique em Atualizar ou abra Filtros rápidos → Aplicar.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-gray-600 text-seguranca-lightgray"
            disabled={loading}
            onClick={() => {
              void (async () => {
                await loadStats({ withDashboard: true }).catch(() => undefined);
                await loadReports();
              })();
            }}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar tabela
          </Button>
        </div>
      )}

      {/* Tabela de Relatórios */}
      <Card className="bg-seguranca-graphite border-gray-600">
        <CardHeader>
          <CardTitle className="text-seguranca-lightgray">
            {reportType === 'low-stock' && 'Produtos com Estoque Baixo'}
            {reportType === 'out-of-stock' && 'Produtos Sem Estoque'}
            {reportType === 'over-stock' && 'Produtos com Estoque Alto'}
            {reportType === 'turnover' && 'Giro de Estoque'}
            {reportType === 'value' && 'Valor por Categoria'}
            {reportType === 'movements' && 'Movimentações no período'}
            {reportType === 'top-exits' && 'Itens que mais saíram (período)'}
            {reportType === 'requisitions' && 'Requisições no período'}
            {reportType === 'locations' && 'Quantidade total por localização'}
            {reportType === 'by-item' && 'Detalhe por item'}
            {reportType === 'by-shelf' && 'Itens por prateleira'}
            {reportType === 'qty-range' && 'Itens por faixa de quantidade em estoque'}
            {reportType === 'consolidated' && 'Relatório consolidado (exportação em PDF)'}
            {reportType !== 'consolidated' && ` (${reports.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-seguranca-yellow"></div>
            </div>
          ) : reportType === 'consolidated' ? (
            <div className="text-center text-gray-400 py-10 space-y-3 px-4">
              <p>
                O PDF consolidado reúne, para o período selecionado: situação de baixo estoque, movimentações de
                entrada e saída, requisições criadas e quantidades agregadas por prateleira/andar.
              </p>
              <p className="text-sm text-seguranca-lightgray">
                Use o filtro &quot;Período&quot; em <span className="font-semibold">Gerar Relatório</span> e depois{' '}
                <span className="font-semibold">Baixar PDF</span> para gerar o ficheiro consolidado.
              </p>
            </div>
          ) : reportType === 'top-exits' ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600">
                    <TableHead className="text-seguranca-lightgray">Item</TableHead>
                    <TableHead className="text-seguranca-lightgray">Código</TableHead>
                    <TableHead className="text-seguranca-lightgray">Qtd movimentada</TableHead>
                    <TableHead className="text-seguranca-lightgray">Nº movimentos</TableHead>
                    <TableHead className="text-seguranca-lightgray">Valor (custo)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length === 0 ? (
                    <TableRow className="border-gray-600">
                      <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                        Sem dados de ranking no período
                      </TableCell>
                    </TableRow>
                  ) : (
                    reports.map((report) => (
                      <TableRow key={report.id} className="border-gray-600">
                        <TableCell className="text-seguranca-lightgray font-medium">{report.productName}</TableCell>
                        <TableCell className="text-gray-300">{report.category}</TableCell>
                        <TableCell className="text-gray-300">{formatNumber(report.currentStock)}</TableCell>
                        <TableCell className="text-gray-300">{formatNumber(report.minimumStock)}</TableCell>
                        <TableCell className="text-gray-300">{formatCurrency(report.totalValue)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : reportType === 'movements' ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600">
                    <TableHead className="text-seguranca-lightgray">Data</TableHead>
                    <TableHead className="text-seguranca-lightgray">Tipo</TableHead>
                    <TableHead className="text-seguranca-lightgray">Motivo</TableHead>
                    <TableHead className="text-seguranca-lightgray">Item</TableHead>
                    <TableHead className="text-seguranca-lightgray">Código</TableHead>
                    <TableHead className="text-seguranca-lightgray">Qtd</TableHead>
                    <TableHead className="text-seguranca-lightgray">Antes</TableHead>
                    <TableHead className="text-seguranca-lightgray">Depois</TableHead>
                    <TableHead className="text-seguranca-lightgray">Valor</TableHead>
                    <TableHead className="text-seguranca-lightgray">Responsável</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length === 0 ? (
                    <TableRow className="border-gray-600">
                      <TableCell colSpan={10} className="text-center text-gray-400 py-8">
                        Nenhuma movimentação no período
                      </TableCell>
                    </TableRow>
                  ) : (
                    reports.map((report) => (
                      <TableRow key={report.id} className="border-gray-600">
                        <TableCell className="text-gray-300 whitespace-nowrap">
                          {formatDateTime(report.lastMovementDate)}
                        </TableCell>
                        <TableCell className="text-seguranca-lightgray">{report.category}</TableCell>
                        <TableCell className="text-gray-300">{report.movementReasonText || '—'}</TableCell>
                        <TableCell className="text-seguranca-lightgray font-medium">{report.productName}</TableCell>
                        <TableCell className="text-gray-300">{report.itemCode || '—'}</TableCell>
                        <TableCell className="text-gray-300">{formatNumber(report.currentStock)}</TableCell>
                        <TableCell className="text-gray-300">{formatNumber(report.minimumStock)}</TableCell>
                        <TableCell className="text-gray-300">{formatNumber(report.maximumStock)}</TableCell>
                        <TableCell className="text-gray-300">{formatCurrency(report.totalValue)}</TableCell>
                        <TableCell className="text-gray-300">{report.employeeName || '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : reportType === 'requisitions' ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600">
                    <TableHead className="text-seguranca-lightgray">Nº</TableHead>
                    <TableHead className="text-seguranca-lightgray">Data</TableHead>
                    <TableHead className="text-seguranca-lightgray">Status</TableHead>
                    <TableHead className="text-seguranca-lightgray">Funcionário</TableHead>
                    <TableHead className="text-seguranca-lightgray">Motivo</TableHead>
                    <TableHead className="text-seguranca-lightgray">Itens</TableHead>
                    <TableHead className="text-seguranca-lightgray">Solicitante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length === 0 ? (
                    <TableRow className="border-gray-600">
                      <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                        Nenhuma requisição no período
                      </TableCell>
                    </TableRow>
                  ) : (
                    reports.map((report) => (
                      <TableRow key={report.id} className="border-gray-600">
                        <TableCell className="text-seguranca-lightgray font-medium">{report.productName}</TableCell>
                        <TableCell className="text-gray-300">{formatDateTime(report.lastMovementDate)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-gray-500 text-seguranca-lightgray">
                            {report.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">{report.employeeName || '—'}</TableCell>
                        <TableCell className="text-gray-300">{report.movementReasonText || '—'}</TableCell>
                        <TableCell className="text-gray-300">{formatNumber(report.currentStock)}</TableCell>
                        <TableCell className="text-gray-300">{report.requestedByName || '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : reportType === 'locations' ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600">
                    <TableHead className="text-seguranca-lightgray">Prateleira</TableHead>
                    <TableHead className="text-seguranca-lightgray">Andar</TableHead>
                    <TableHead className="text-seguranca-lightgray">Quantidade total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length === 0 ? (
                    <TableRow className="border-gray-600">
                      <TableCell colSpan={3} className="text-center text-gray-400 py-8">
                        Nenhuma quantidade registada por localização
                      </TableCell>
                    </TableRow>
                  ) : (
                    reports.map((report) => (
                      <TableRow key={report.id} className="border-gray-600">
                        <TableCell className="text-seguranca-lightgray font-medium">{report.productName}</TableCell>
                        <TableCell className="text-gray-300">{report.category}</TableCell>
                        <TableCell className="text-seguranca-lightgray">{formatNumber(report.currentStock)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600">
                    <TableHead className="text-seguranca-lightgray">Produto</TableHead>
                    <TableHead className="text-seguranca-lightgray">Categoria</TableHead>
                    <TableHead className="text-seguranca-lightgray">Estoque Atual</TableHead>
                    <TableHead className="text-seguranca-lightgray">Estoque Mínimo</TableHead>
                    <TableHead className="text-seguranca-lightgray">Estoque Máximo</TableHead>
                    <TableHead className="text-seguranca-lightgray">Consumo Médio</TableHead>
                    <TableHead className="text-seguranca-lightgray">Giro</TableHead>
                    <TableHead className="text-seguranca-lightgray">Última Movimentação</TableHead>
                    <TableHead className="text-seguranca-lightgray">Valor</TableHead>
                    <TableHead className="text-seguranca-lightgray">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length === 0 ? (
                    <TableRow className="border-gray-600">
                      <TableCell colSpan={10} className="text-center text-gray-400 py-8">
                        Nenhum dado na tabela ainda. Clique em &quot;Atualizar tabela&quot; ou aplique os filtros.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reports.map((report) => (
                      <TableRow key={report.id} className="border-gray-600">
                        <TableCell className="text-seguranca-lightgray">
                          <div className="font-medium">{report.productName}</div>
                        </TableCell>
                        <TableCell className="text-gray-300">{report.category}</TableCell>
                        <TableCell>
                          <span className={`font-medium ${
                            report.currentStock <= report.minimumStock ? 'text-red-500' :
                            report.maximumStock > 0 && report.currentStock > report.maximumStock ? 'text-yellow-500' :
                            'text-green-500'
                          }`}>
                            {formatNumber(report.currentStock)}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-300">{formatNumber(report.minimumStock)}</TableCell>
                        <TableCell className="text-gray-300">{formatNumber(report.maximumStock)}</TableCell>
                        <TableCell className="text-gray-300">{formatNumber(report.averageConsumption)}/dia</TableCell>
                        <TableCell className="text-gray-300">{formatPercentage(report.turnoverRate)}</TableCell>
                        <TableCell className="text-gray-300">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{formatDate(report.lastMovementDate)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">{formatCurrency(report.totalValue)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(report.status)}>
                            {getStatusLabel(report.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockReportsContent;
