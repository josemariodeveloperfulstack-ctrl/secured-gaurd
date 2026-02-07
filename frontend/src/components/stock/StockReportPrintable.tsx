import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Package, AlertTriangle, TrendingDown, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';

type StockStatus = 'NORMAL' | 'LOW' | 'OUT' | 'OVER';

export interface PrintableStockReport {
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
  status: StockStatus;
}

export interface PrintableStockStats {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  overStockProducts: number;
  totalValue: number;
  averageTurnover: number;
}

interface StockReportPrintableProps {
  reports: PrintableStockReport[];
  stats: PrintableStockStats;
  periodLabel: string;
}

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
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR');
};

const formatPercentage = (value: number) => {
  if (!Number.isFinite(value)) return '0,0%';
  return `${(value * 100).toFixed(1)}%`;
};

const getStatusLabel = (status: StockStatus) => {
  switch (status) {
    case 'LOW':
      return 'Estoque Baixo';
    case 'OUT':
      return 'Sem Estoque';
    case 'OVER':
      return 'Estoque Alto';
    case 'NORMAL':
    default:
      return 'Normal';
  }
};

const getStatusBadgeClasses = (status: StockStatus) => {
  switch (status) {
    case 'LOW':
    case 'OUT':
      return 'bg-red-100 text-red-800';
    case 'OVER':
      return 'bg-yellow-100 text-yellow-800';
    case 'NORMAL':
    default:
      return 'bg-green-100 text-green-800';
  }
};

export const StockReportPrintable: React.FC<StockReportPrintableProps> = ({
  reports,
  stats,
  periodLabel
}) => {
  const totalValue = reports.reduce((sum, r) => sum + (r.totalValue || 0), 0);

  return (
    <div className="space-y-6 text-sm text-gray-800">
      {/* Resumo Superior */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-500">Período analisado</p>
          <p className="text-sm font-medium text-gray-900">{periodLabel}</p>
        </div>
      </div>

      {/* Dashboard de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-gray-200">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-[11px] font-medium text-gray-600">Total de Produtos</p>
                <p className="text-lg font-semibold text-gray-900">{stats.totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-[11px] font-medium text-gray-600">Estoque Baixo</p>
                <p className="text-lg font-semibold text-red-600">{stats.lowStockProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-[11px] font-medium text-gray-600">Sem Estoque</p>
                <p className="text-lg font-semibold text-red-600">{stats.outOfStockProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-[11px] font-medium text-gray-600">Estoque Alto</p>
                <p className="text-lg font-semibold text-yellow-600">{stats.overStockProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-[11px] font-medium text-gray-600">Valor Total</p>
                <p className="text-lg font-semibold text-blue-600">{formatCurrency(stats.totalValue || totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-[11px] font-medium text-gray-600">Giro Médio</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatPercentage(stats.averageTurnover || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Principal */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">
            Produtos ({reports.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="text-xs font-semibold text-gray-700">Produto</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-700">Categoria</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-700 text-right">Estoque Atual</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-700 text-right">Mínimo</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-700 text-right">Máximo</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-700 text-right">Consumo Médio</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-700 text-right">Giro</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-700">Última Movimentação</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-700 text-right">Valor</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-700">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-6 text-gray-500 text-sm">
                      Nenhum dado disponível para o filtro selecionado.
                    </TableCell>
                  </TableRow>
                )}
                {reports.map((report) => (
                  <TableRow key={report.id} className="border-gray-200">
                    <TableCell className="align-top">
                      <div className="font-medium text-gray-900">{report.productName}</div>
                    </TableCell>
                    <TableCell className="align-top text-gray-700">{report.category}</TableCell>
                    <TableCell className="align-top text-right">
                      <span
                        className={`font-semibold ${
                          report.currentStock <= report.minimumStock
                            ? 'text-red-600'
                            : report.currentStock > report.maximumStock
                            ? 'text-yellow-600'
                            : 'text-green-700'
                        }`}
                      >
                        {formatNumber(report.currentStock)}
                      </span>
                    </TableCell>
                    <TableCell className="align-top text-right text-gray-800">
                      {formatNumber(report.minimumStock)}
                    </TableCell>
                    <TableCell className="align-top text-right text-gray-800">
                      {formatNumber(report.maximumStock)}
                    </TableCell>
                    <TableCell className="align-top text-right text-gray-800">
                      {formatNumber(report.averageConsumption)}/dia
                    </TableCell>
                    <TableCell className="align-top text-right text-gray-800">
                      {formatPercentage(report.turnoverRate)}
                    </TableCell>
                    <TableCell className="align-top text-gray-800">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-gray-500" />
                        <span>{formatDate(report.lastMovementDate)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-right text-gray-900 font-semibold">
                      {formatCurrency(report.totalValue)}
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge className={getStatusBadgeClasses(report.status)}>
                        {getStatusLabel(report.status)}
                      </Badge>
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

export default StockReportPrintable;

