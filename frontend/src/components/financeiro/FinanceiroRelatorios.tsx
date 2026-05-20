import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Download,
  FileText,
  Filter,
  Search,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Printer,
  AlertTriangle
} from 'lucide-react';
import { FinancialTransaction, Invoice } from '@/services/financialService';
import { unitService, Unit } from '@/services/unitService';
import { contasAPagarService, Supplier } from '@/services/contasAPagarService';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { format, startOfDay, endOfDay, isWithinInterval, isBefore, isAfter, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { useToast } from '@/hooks/use-toast';

/** Alinha status do backend (PENDENTE, PAGA…) com os valores do filtro da UI */
function statusMatchesFilter(itemStatus: string, filter: string): boolean {
  if (filter === 'all') return true;
  switch (filter) {
    case 'PENDING':
      return itemStatus === 'PENDING' || itemStatus === 'PENDENTE';
    case 'CONFIRMED':
      return itemStatus === 'CONFIRMED';
    case 'PAGA':
      return itemStatus === 'PAGA' || itemStatus === 'CONFIRMED';
    case 'CANCELLED':
      return itemStatus === 'CANCELLED' || itemStatus === 'CANCELADA';
    case 'PENDENTE_ERRO':
      return itemStatus === 'PENDENTE_ERRO';
    default:
      return itemStatus === filter;
  }
}

/** Aceita "1234.56", "1.234,56", "R$ 999.999,99" */
function parseMoneyInput(raw: string): number | null {
  const s = raw?.trim();
  if (!s) return null;
  const cleaned = s
    .replace(/\u00a0/g, ' ')
    .replace(/R\$\s*/gi, '')
    .replace(/\s/g, '');
  if (!cleaned) return null;
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/** Centro de custo: contém texto ou tolera 1–2 erros de digitação (ex.: Fianceiro ≈ Financeiro) */
function costCenterMatches(filterRaw: string, haystack: string | undefined): boolean {
  const filter = filterRaw.trim().toLowerCase();
  if (!filter) return true;
  if (!haystack?.trim()) return false;
  const cc = haystack.toLowerCase().trim();
  if (cc.includes(filter) || filter.includes(cc)) return true;
  if (filter.length >= 4 && cc.length >= 4 && levenshtein(filter, cc) <= 2) return true;
  return cc.split(/\s+/).some((w) => w.includes(filter) || (w.length >= 4 && levenshtein(w, filter) <= 2));
}

/**
 * O filtro "Centro de custo" também procura em unidade/empresa, categoria e fornecedor —
 * muitas contas a receber vêm sem `centroCusto` na API, só com cliente/unidade.
 */
function centerCostFilterHaystack(item: FinancialTransaction): string {
  return [item.costCenter, item.unit?.name, item.category, item.supplierName]
    .filter((v) => v != null && String(v).trim() !== '')
    .map((v) => String(v))
    .join(' ');
}

type DateGetter = (item: FinancialTransaction) => string | undefined;

function matchesDateBounds(
  item: FinancialTransaction,
  start: Date | null,
  end: Date | null,
  getRaw: DateGetter
): boolean {
  const raw = getRaw(item);
  if (!raw) return false;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return false;
  const day = startOfDay(d);
  if (start && end) {
    return isWithinInterval(day, { start: startOfDay(start), end: endOfDay(end) });
  }
  if (start && !end) {
    return !isBefore(day, startOfDay(start));
  }
  if (!start && end) {
    return !isAfter(day, endOfDay(end));
  }
  return true;
}

interface FinanceiroRelatoriosProps {
  transactions?: FinancialTransaction[];
  invoices?: Invoice[];
  refreshData?: () => void;
}

interface FiltrosRelatorio {
  tipo: string;
  status: string;
  tipoDespesa: string;
  rangeLancamento: DateRange | undefined;
  rangeVencimento: DateRange | undefined;
  centroCusto: string;
  departamento: string;
  fornecedor: string;
  valorMin: string;
  valorMax: string;
  searchTerm: string;
}

export const FinanceiroRelatorios: React.FC<FinanceiroRelatoriosProps> = ({
  transactions = [],
  invoices = [],
  refreshData = () => {},
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [fornecedores, setFornecedores] = useState<Supplier[]>([]);
  const [filtros, setFiltros] = useState<FiltrosRelatorio>({
    tipo: 'all',
    status: 'all',
    tipoDespesa: 'all',
    rangeLancamento: {
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    },
    rangeVencimento: undefined,
    centroCusto: '',
    departamento: 'all',
    fornecedor: 'all',
    valorMin: '',
    valorMax: '',
    searchTerm: ''
  });

  // Carregar dados auxiliares
  useEffect(() => {
    const loadAuxData = async () => {
      try {
        const [unitsData, fornecedoresData] = await Promise.all([
          unitService.getAllUnits(),
          contasAPagarService.getFornecedores()
        ]);
        setUnits(Array.isArray(unitsData) ? unitsData : []);
        setFornecedores(Array.isArray(fornecedoresData) ? fornecedoresData : []);
      } catch (error) {
        console.error('Erro ao carregar dados auxiliares:', error);
        // Garantir que os estados sejam sempre arrays
        setUnits([]);
        setFornecedores([]);
      }
    };
    loadAuxData();
  }, []);

  // Aplicar filtros
  const dadosFiltrados = useMemo(() => {
    let dados: FinancialTransaction[] = [
      ...transactions,
      ...invoices.map((invoice) => ({
        id: String(invoice.id),
        type: 'EXPENSE' as const,
        description: invoice.description,
        amount: Number(invoice.amount) || 0,
        date: invoice.issueDate,
        dueDate: invoice.dueDate,
        status: invoice.status as FinancialTransaction['status'],
        category: invoice.category || '',
        reference: invoice.invoiceNumber,
        notes: invoice.notes,
        unitId: invoice.unitId ? String(invoice.unitId) : undefined,
        unit: invoice.unitId
          ? { id: String(invoice.unitId), name: invoice.companySigla || '' }
          : undefined,
        expenseType: invoice.type,
        costCenter: invoice.centroCusto,
        supplier: invoice.supplierId ? { id: String(invoice.supplierId), name: invoice.supplierName } : undefined,
        supplierName: invoice.supplierName,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
      })),
    ];

    // Filtro por tipo
    if (filtros.tipo !== 'all') {
      dados = dados.filter(item => item.type === filtros.tipo);
    }

    // Filtro por status (PENDENTE/PAGA do backend vs PENDING/PAGA da UI)
    if (filtros.status !== 'all') {
      dados = dados.filter((item) => statusMatchesFilter(String(item.status), filtros.status));
    }

    // Filtro por tipo de despesa (receitas não têm expenseType; não podem ser excluídas quando tipo = todos)
    if (filtros.tipoDespesa !== 'all') {
      dados = dados.filter(
        (item) =>
          item.type === 'INCOME' ||
          item.expenseType === filtros.tipoDespesa
      );
    }

    // Datas: intervalo parcial (só início ou só fim) e, se ambos os grupos estão preenchidos,
    // usar OU entre “data de lançamento” e “data de vencimento” (evita lista vazia por combinação impossível).
    const hasLanc = Boolean(filtros.rangeLancamento?.from || filtros.rangeLancamento?.to);
    const hasVenc = Boolean(filtros.rangeVencimento?.from || filtros.rangeVencimento?.to);
    
    const predLanc = (item: FinancialTransaction) =>
      matchesDateBounds(item, filtros.rangeLancamento?.from || null, filtros.rangeLancamento?.to || null, (i) => i.date);
    const predVenc = (item: FinancialTransaction) =>
      matchesDateBounds(item, filtros.rangeVencimento?.from || null, filtros.rangeVencimento?.to || null, (i) => i.dueDate);

    if (hasLanc && hasVenc) {
      dados = dados.filter((item) => predLanc(item) || predVenc(item));
    } else if (hasLanc) {
      dados = dados.filter(predLanc);
    } else if (hasVenc) {
      dados = dados.filter(predVenc);
    }

    // Filtro por centro de custo (parcial + pequena tolerância a typo)
    const cc = filtros.centroCusto?.trim();
    if (cc) {
      dados = dados.filter((item) => costCenterMatches(cc, centerCostFilterHaystack(item)));
    }

    // Filtro por departamento (unidade)
    if (filtros.departamento !== 'all') {
      dados = dados.filter(
        (item) => item.unit?.id === filtros.departamento || item.unitId === filtros.departamento
      );
    }

    // Filtro por fornecedor (receitas não têm fornecedor; com tipo "Todos" não pode esconder receitas)
    if (filtros.fornecedor !== 'all' && filtros.tipo !== 'INCOME') {
      if (filtros.tipo === 'EXPENSE') {
        dados = dados.filter((item) => item.supplier?.id === filtros.fornecedor);
      } else {
        dados = dados.filter(
          (item) => item.type === 'INCOME' || item.supplier?.id === filtros.fornecedor
        );
      }
    }

    // Filtro por valor mínimo / máximo (aceita formato brasileiro no campo)
    const vmin = parseMoneyInput(filtros.valorMin);
    if (vmin !== null && vmin > 0) {
      dados = dados.filter((item) => Number(item.amount) >= vmin);
    }

    const valorMaxStr = filtros.valorMax != null ? String(filtros.valorMax).trim() : '';
    const vmax = valorMaxStr ? parseMoneyInput(filtros.valorMax) : null;
    if (vmax !== null) {
      dados = dados.filter((item) => {
        const a = Number(item.amount);
        return Number.isFinite(a) && a <= vmax;
      });
    }

    // Filtro por termo de busca
    if (filtros.searchTerm) {
      const term = filtros.searchTerm.toLowerCase();
      dados = dados.filter(item =>
        item.description?.toLowerCase().includes(term) ||
        item.category?.toLowerCase().includes(term) ||
        item.reference?.toLowerCase().includes(term) ||
        item.notes?.toLowerCase().includes(term)
      );
    }

    return dados;
  }, [transactions, invoices, filtros]);

  // Estatísticas do relatório
  const estatisticas = useMemo(() => {
    const total = dadosFiltrados.length;
    const receitas = dadosFiltrados
      .filter(item => item.type === 'INCOME')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const despesas = dadosFiltrados
      .filter(item => item.type === 'EXPENSE')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const pendentes = dadosFiltrados.filter(
      (item) => item.status === 'PENDING' || item.status === 'PENDENTE'
    ).length;
    const vencidas = dadosFiltrados.filter((item) => {
      if (!item.dueDate) return false;
      const st = item.status;
      if (st === 'PAGA' || st === 'CONFIRMED' || st === 'CANCELLED' || st === 'CANCELADA') return false;
      return new Date(item.dueDate) < new Date();
    }).length;

    return {
      total,
      receitas,
      despesas,
      saldo: receitas - despesas,
      pendentes,
      vencidas
    };
  }, [dadosFiltrados]);

  const handleFiltroChange = (campo: keyof FiltrosRelatorio, valor: any) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const limparFiltros = () => {
    setFiltros({
      tipo: 'all',
      status: 'all',
      tipoDespesa: 'all',
      rangeLancamento: {
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
      },
      rangeVencimento: undefined,
      centroCusto: '',
      departamento: 'all',
      fornecedor: 'all',
      valorMin: '',
      valorMax: '',
      searchTerm: ''
    });
    refreshData();
  };

  /** Evita quebra entre R$ e sinal negativo do Intl (`R$ -`) em cards estreitos. */
  const formatarMoeda = (valor: number) => {
    const fmt = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const abs = fmt.format(Math.abs(valor));
    return valor < 0 ? `\u2212${abs}` : abs;
  };

  const formatarData = (data: string) => {
    return format(new Date(data), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'PENDENTE':
        return 'bg-yellow-500';
      case 'CONFIRMED':
      case 'PAGA':
        return 'bg-green-500';
      case 'CANCELLED':
      case 'CANCELADA':
        return 'bg-gray-500';
      case 'PENDENTE_ERRO':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getTipoColor = (tipo: string) => {
    return tipo === 'INCOME' ? 'text-green-500' : 'text-red-500';
  };

  const exportarPDF = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filtros.rangeLancamento?.from) queryParams.append('startDate', format(filtros.rangeLancamento.from, 'yyyy-MM-dd'));
      if (filtros.rangeLancamento?.to) queryParams.append('endDate', format(filtros.rangeLancamento.to, 'yyyy-MM-dd'));

      let endpoint = '';
      if (filtros.tipo === 'INCOME') {
        // Relatório de Contas a Receber
        endpoint = `/api/reports/accounts-receivable/pdf?${queryParams.toString()}`;
      } else if (filtros.tipo === 'EXPENSE') {
        // Relatório de Contas a Pagar
        endpoint = `/api/reports/contas-a-pagar/pdf?${queryParams.toString()}`;
      } else {
        // Fluxo de Caixa (Ambos)
        endpoint = `/api/reports/cash-flow/pdf?${queryParams.toString()}`;
      }

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Falha ao gerar relatório no servidor');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Sucesso",
        description: "Relatório PDF gerado pelo servidor com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao exportar relatório.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="bg-seguranca-graphite border-gray-600">
        <CardHeader>
          <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
            <Filter size={20} className="text-seguranca-yellow" />
            Filtros do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Tipo */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Tipo</label>
              <Select value={filtros.tipo} onValueChange={(value) => handleFiltroChange('tipo', value)}>
                <SelectTrigger className="form-input">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="INCOME">Receita</SelectItem>
                  <SelectItem value="EXPENSE">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Status</label>
              <Select value={filtros.status} onValueChange={(value) => handleFiltroChange('status', value)}>
                <SelectTrigger className="form-input">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="PENDING">Pendente</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmado</SelectItem>
                  <SelectItem value="CANCELLED">Cancelado</SelectItem>
                  <SelectItem value="PAGA">Pago</SelectItem>
                  <SelectItem value="PENDENTE_ERRO">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Despesa */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Tipo de Despesa</label>
              <Select value={filtros.tipoDespesa} onValueChange={(value) => handleFiltroChange('tipoDespesa', value)}>
                <SelectTrigger className="form-input">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="FIXA">Fixa</SelectItem>
                  <SelectItem value="VARIAVEL">Variável</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Departamento */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Departamento</label>
              <Select value={filtros.departamento} onValueChange={(value) => handleFiltroChange('departamento', value)}>
                <SelectTrigger className="form-input">
                  <SelectValue placeholder="Todos os departamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(units || []).map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fornecedor */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Fornecedor</label>
              <Select value={filtros.fornecedor} onValueChange={(value) => handleFiltroChange('fornecedor', value)}>
                <SelectTrigger className="form-input">
                  <SelectValue placeholder="Todos os fornecedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(fornecedores || []).map(fornecedor => (
                    <SelectItem key={fornecedor.id} value={fornecedor.id}>{fornecedor.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Centro de Custo */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Centro de Custo</label>
              <Input
                value={filtros.centroCusto}
                onChange={(e) => handleFiltroChange('centroCusto', e.target.value)}
                placeholder="Digite o centro de custo"
                className="form-input"
              />
            </div>

            {/* Valor Mínimo */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Valor Mínimo</label>
              <Input
                value={filtros.valorMin}
                onChange={(e) => handleFiltroChange('valorMin', e.target.value)}
                placeholder="R$ 0,00"
                className="form-input"
                type="number"
              />
            </div>

            {/* Valor Máximo */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Valor Máximo</label>
              <Input
                value={filtros.valorMax}
                onChange={(e) => handleFiltroChange('valorMax', e.target.value)}
                placeholder="R$ 999.999,99"
                className="form-input"
                type="number"
              />
            </div>

            {/* Período de Lançamento */}
            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Período de Lançamento</label>
              <DatePickerWithRange
                date={filtros.rangeLancamento}
                onDateChange={(range) => handleFiltroChange('rangeLancamento', range)}
                className="form-input"
              />
            </div>

            {/* Período de Vencimento */}
            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Período de Vencimento</label>
              <DatePickerWithRange
                date={filtros.rangeVencimento}
                onDateChange={(range) => handleFiltroChange('rangeVencimento', range)}
                className="form-input"
              />
            </div>

            {/* Busca */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-seguranca-lightgray">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  value={filtros.searchTerm}
                  onChange={(e) => handleFiltroChange('searchTerm', e.target.value)}
                  placeholder="Descrição, categoria, referência..."
                  className="pl-10 form-input"
                />
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2 mt-4">
            <Button
              onClick={limparFiltros}
              variant="outline"
              className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
            >
              <RefreshCw size={16} className="mr-2" />
              Limpar Filtros
            </Button>
            <Button
              onClick={exportarPDF}
              disabled={loading}
              className="bg-seguranca-red hover:bg-seguranca-darkred"
            >
              {loading ? (
                <RefreshCw size={16} className="mr-2 animate-spin" />
              ) : (
                <Download size={16} className="mr-2" />
              )}
              Exportar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas: no máx. 3 colunas para caber valores longos sem quebrar o sinal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-seguranca-graphite border-gray-600 min-w-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 min-w-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-400">Total</p>
                <p className="text-xl sm:text-2xl font-bold tabular-nums text-seguranca-lightgray whitespace-nowrap">
                  {estatisticas.total}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-500 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-graphite border-gray-600 min-w-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 min-w-0">
              <div className="min-w-0 flex-1 overflow-x-auto">
                <p className="text-sm text-gray-400">Receitas</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold tabular-nums text-green-500 whitespace-nowrap">
                  {formatarMoeda(estatisticas.receitas)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-graphite border-gray-600 min-w-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 min-w-0">
              <div className="min-w-0 flex-1 overflow-x-auto">
                <p className="text-sm text-gray-400">Despesas</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold tabular-nums text-red-500 whitespace-nowrap">
                  {formatarMoeda(estatisticas.despesas)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-graphite border-gray-600 min-w-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 min-w-0">
              <div className="min-w-0 flex-1 overflow-x-auto">
                <p className="text-sm text-gray-400">Saldo</p>
                <p
                  className={`text-lg sm:text-xl lg:text-2xl font-bold tabular-nums whitespace-nowrap ${
                    estatisticas.saldo >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}
                  title={formatarMoeda(estatisticas.saldo)}
                >
                  {formatarMoeda(estatisticas.saldo)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-graphite border-gray-600 min-w-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 min-w-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-400">Pendentes</p>
                <p className="text-xl sm:text-2xl font-bold tabular-nums text-yellow-500 whitespace-nowrap">
                  {estatisticas.pendentes}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-graphite border-gray-600 min-w-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3 min-w-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-400">Vencidas</p>
                <p className="text-xl sm:text-2xl font-bold tabular-nums text-red-500 whitespace-nowrap">
                  {estatisticas.vencidas}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-red-500 shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Resultados */}
      <Card className="bg-seguranca-graphite border-gray-600">
        <CardHeader>
          <CardTitle className="text-seguranca-lightgray flex items-center justify-between">
            <span>Resultados ({dadosFiltrados.length} registros)</span>
            <div className="flex gap-2">
              <Button
                onClick={exportarPDF}
                disabled={loading}
                variant="outline"
                size="sm"
                className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
              >
                <Printer size={16} className="mr-2" />
                Imprimir
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-gray-700/60 -mx-1">
            <Table className="min-w-[72rem] w-full text-sm">
              <TableHeader>
                <TableRow className="border-gray-600">
                  <TableHead className="text-seguranca-lightgray min-w-[180px] max-w-[280px]">
                    Descrição
                  </TableHead>
                  <TableHead className="text-seguranca-lightgray whitespace-nowrap">Tipo</TableHead>
                  <TableHead className="text-seguranca-lightgray whitespace-nowrap">Valor</TableHead>
                  <TableHead className="text-seguranca-lightgray whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-seguranca-lightgray whitespace-nowrap">Data Lançamento</TableHead>
                  <TableHead className="text-seguranca-lightgray whitespace-nowrap">Data Vencimento</TableHead>
                  <TableHead className="text-seguranca-lightgray min-w-[120px] max-w-[180px]">Categoria</TableHead>
                  <TableHead className="text-seguranca-lightgray min-w-[120px] max-w-[200px]">
                    Departamento
                  </TableHead>
                  <TableHead className="text-seguranca-lightgray min-w-[120px] max-w-[200px]">
                    Centro de Custo
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosFiltrados.map((item) => (
                  <TableRow key={item.id} className="border-gray-600 hover:bg-seguranca-black">
                    <TableCell className="text-seguranca-lightgray align-top max-w-[280px] min-w-[180px]">
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-medium truncate" title={item.description || ''}>
                          {item.description}
                        </div>
                        {item.reference && (
                          <div className="text-xs text-gray-400 truncate" title={`Ref: ${item.reference}`}>
                            Ref: {item.reference}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap align-top">
                      <Badge className={`${getTipoColor(item.type)} bg-transparent border`}>
                        {item.type === 'INCOME' ? 'Receita' : 'Despesa'}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`font-bold tabular-nums whitespace-nowrap align-top ${getTipoColor(item.type)}`}
                      title={formatarMoeda(Number(item.amount) || 0)}
                    >
                      {formatarMoeda(Number(item.amount) || 0)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap align-top">
                      <Badge className={`${getStatusColor(item.status)} text-white`}>
                        {item.status === 'PENDING' || item.status === 'PENDENTE' ? 'Pendente' :
                          item.status === 'CONFIRMED' ? 'Confirmado' :
                            item.status === 'CANCELLED' || item.status === 'CANCELADA' ? 'Cancelado' :
                              item.status === 'PAGA' ? 'Pago' :
                                item.status === 'PENDENTE_ERRO' ? 'Atrasado' : item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-seguranca-lightgray whitespace-nowrap align-top">
                      {item.date ? formatarData(item.date) : '-'}
                    </TableCell>
                    <TableCell className="text-seguranca-lightgray whitespace-nowrap align-top">
                      {item.dueDate ? formatarData(item.dueDate) : '-'}
                    </TableCell>
                    <TableCell className="text-seguranca-lightgray align-top max-w-[180px] min-w-[120px]">
                      <span className="line-clamp-2 break-words" title={item.category || ''}>
                        {item.category || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-seguranca-lightgray align-top max-w-[200px] min-w-[120px]">
                      <span className="truncate block max-w-full" title={item.unit?.name || ''}>
                        {item.unit?.name || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-seguranca-lightgray align-top max-w-[200px] min-w-[120px]">
                      <span className="truncate block max-w-full" title={item.costCenter || ''}>
                        {item.costCenter || '-'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};