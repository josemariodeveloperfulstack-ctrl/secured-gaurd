import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  DollarSign,
  Calendar,
  Users,
  FileEdit,
  PauseCircle
} from 'lucide-react';
import { Contract, contractService, ContractDashboardStats } from '@/services/contractService';

interface ContractsDashboardProps {
  contracts: Contract[];
}

interface DashboardStats {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  draft: number;
  terminated: number;
  totalValue: number;
  expiringThisMonth: number;
  averageValue: number;
}

export const ContractsDashboard: React.FC<ContractsDashboardProps> = ({ contracts }) => {
  const [apiStats, setApiStats] = useState<ContractDashboardStats | null>(null);

  useEffect(() => {
    contractService.getDashboardStats()
      .then(setApiStats)
      .catch(() => setApiStats(null));
  }, []);

  const calculateStats = (): DashboardStats => {
    const total = contracts.length;
    const active = contracts.filter(c => c.status === 'ACTIVE').length;
    const inactive = contracts.filter(c => c.status === 'INACTIVE').length;
    const pending = contracts.filter(c => c.status === 'PENDING').length;
    const draft = contracts.filter(c => c.status === 'DRAFT').length;
    const terminated = contracts.filter(c => c.status === 'TERMINATED' || c.status === 'CANCELLED' || c.status === 'EXPIRED').length;
    
    const totalValue = contracts.reduce((sum, c) => sum + (c.value || 0), 0);
    const averageValue = total > 0 ? totalValue / total : 0;
    
    // Contratos que vencem este mês
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const expiringThisMonth = contracts.filter(c => {
      if (!c.endDate) return false;
      const endDate = new Date(c.endDate);
      return endDate.getMonth() === currentMonth && endDate.getFullYear() === currentYear;
    }).length;

    return {
      total,
      active,
      inactive,
      pending,
      draft,
      terminated,
      totalValue,
      expiringThisMonth,
      averageValue
    };
  };

  const stats = calculateStats();

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const getStatusIcon = (status: string) => {
    const iconClass = "h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0";
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className={`${iconClass} text-green-500`} />;
      case 'PENDING':
        return <Clock className={`${iconClass} text-yellow-500`} />;
      case 'TERMINATED':
        return <AlertTriangle className={`${iconClass} text-red-500`} />;
      default:
        return <TrendingDown className={`${iconClass} text-gray-500`} />;
    }
  };

  const getPercentage = (value: number, total: number) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6 w-full min-w-0">
      {/* Total de Contratos */}
      <Card className="bg-seguranca-graphite border-gray-600 min-w-0 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-2 sm:px-4 lg:px-6 pt-2 sm:pt-4 lg:pt-6">
          <CardTitle className="text-[10px] sm:text-xs lg:text-sm font-medium text-seguranca-lightgray truncate pr-1">
            Total de Contratos
          </CardTitle>
          <Users className="h-3 w-3 sm:h-4 sm:w-4 text-seguranca-yellow flex-shrink-0" />
        </CardHeader>
        <CardContent className="px-2 sm:px-4 lg:px-6 pb-2 sm:pb-4 lg:pb-6 pt-0">
          <div className="text-base sm:text-xl lg:text-2xl font-bold text-white">{stats.total}</div>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate">
            Total cadastrados
          </p>
        </CardContent>
      </Card>

      {/* Contratos Ativos */}
      <Card className="bg-seguranca-graphite border-gray-600 min-w-0 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-2 sm:px-4 lg:px-6 pt-2 sm:pt-4 lg:pt-6">
          <CardTitle className="text-[10px] sm:text-xs lg:text-sm font-medium text-seguranca-lightgray truncate pr-1">
            Contratos Ativos
          </CardTitle>
          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
        </CardHeader>
        <CardContent className="px-2 sm:px-4 lg:px-6 pb-2 sm:pb-4 lg:pb-6 pt-0">
          <div className="text-base sm:text-xl lg:text-2xl font-bold text-white">{stats.active}</div>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
            {getPercentage(stats.active, stats.total)}% do total
          </p>
          <div className="flex items-center mt-1">
            <Badge className="bg-green-500 text-white text-[10px] sm:text-xs px-1.5 py-0">
              {stats.active} ativos
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Valor Total */}
      <Card className="bg-seguranca-graphite border-gray-600 min-w-0 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-2 sm:px-4 lg:px-6 pt-2 sm:pt-4 lg:pt-6">
          <CardTitle className="text-[10px] sm:text-xs lg:text-sm font-medium text-seguranca-lightgray truncate pr-1">
            Valor Total
          </CardTitle>
          <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-seguranca-yellow flex-shrink-0" />
        </CardHeader>
        <CardContent className="px-2 sm:px-4 lg:px-6 pb-2 sm:pb-4 lg:pb-6 pt-0">
          <div className="text-sm sm:text-lg lg:text-2xl font-bold text-white min-w-0 break-words" title={formatCurrency(stats.totalValue)}>
            {formatCurrency(stats.totalValue)}
          </div>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate">
            Média: {formatCurrency(stats.averageValue)}
          </p>
        </CardContent>
      </Card>

      {/* MRR - se disponível da API */}
      {apiStats != null && (
        <Card className="bg-seguranca-graphite border-gray-600 min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-2 sm:px-4 lg:px-6 pt-2 sm:pt-4 lg:pt-6">
            <CardTitle className="text-[10px] sm:text-xs lg:text-sm font-medium text-seguranca-lightgray truncate pr-1">
              MRR
            </CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-2 sm:px-4 lg:px-6 pb-2 sm:pb-4 lg:pb-6 pt-0">
            <div className="text-sm sm:text-lg lg:text-2xl font-bold text-white min-w-0 break-words" title={formatCurrency(apiStats.mrr ?? 0)}>
              {formatCurrency(apiStats.mrr ?? 0)}
            </div>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Receita recorrente mensal</p>
          </CardContent>
        </Card>
      )}

      {/* Aditivos no mês */}
      {apiStats != null && apiStats.amendmentsThisMonth > 0 && (
        <Card className="bg-seguranca-graphite border-gray-600 min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-2 sm:px-4 lg:px-6 pt-2 sm:pt-4 lg:pt-6">
            <CardTitle className="text-[10px] sm:text-xs lg:text-sm font-medium text-seguranca-lightgray truncate pr-1">
              Aditivos (mês)
            </CardTitle>
            <FileEdit className="h-3 w-3 sm:h-4 sm:w-4 text-seguranca-yellow flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-2 sm:px-4 lg:px-6 pb-2 sm:pb-4 lg:pb-6 pt-0">
            <div className="text-base sm:text-xl lg:text-2xl font-bold text-white">{apiStats.amendmentsThisMonth}</div>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Este mês</p>
          </CardContent>
        </Card>
      )}

      {/* Suspensos */}
      {apiStats != null && apiStats.suspendedCount > 0 && (
        <Card className="bg-seguranca-graphite border-gray-600 min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-2 sm:px-4 lg:px-6 pt-2 sm:pt-4 lg:pt-6">
            <CardTitle className="text-[10px] sm:text-xs lg:text-sm font-medium text-seguranca-lightgray truncate pr-1">
              Suspensos
            </CardTitle>
            <PauseCircle className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-2 sm:px-4 lg:px-6 pb-2 sm:pb-4 lg:pb-6 pt-0">
            <div className="text-base sm:text-xl lg:text-2xl font-bold text-white">{apiStats.suspendedCount}</div>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Contratos suspensos</p>
          </CardContent>
        </Card>
      )}

      {/* Contratos Vencendo */}
      <Card className="bg-seguranca-graphite border-gray-600 min-w-0 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-2 sm:px-4 lg:px-6 pt-2 sm:pt-4 lg:pt-6">
          <CardTitle className="text-[10px] sm:text-xs lg:text-sm font-medium text-seguranca-lightgray truncate pr-1">
            Vencendo Este Mês
          </CardTitle>
          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" />
        </CardHeader>
        <CardContent className="px-2 sm:px-4 lg:px-6 pb-2 sm:pb-4 lg:pb-6 pt-0">
          <div className="text-base sm:text-xl lg:text-2xl font-bold text-white">{stats.expiringThisMonth}</div>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Requerem atenção</p>
          {stats.expiringThisMonth > 0 && (
            <div className="flex items-center mt-1">
              <Badge className="bg-red-500 text-white text-[10px] sm:text-xs px-1.5 py-0">Urgente</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card className="bg-seguranca-graphite border-gray-600 col-span-2 lg:col-span-4 min-w-0 overflow-hidden">
        <CardHeader className="px-2 sm:px-4 lg:px-6 pt-2 sm:pt-4 lg:pt-6">
          <CardTitle className="text-xs sm:text-sm lg:text-base font-medium text-seguranca-lightgray">
            Distribuição por Status
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-4 lg:px-6 pb-2 sm:pb-4 lg:pb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-seguranca-black/50 min-w-0">
              {getStatusIcon('ACTIVE')}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-medium text-white truncate">Ativos</p>
                <p className="text-[10px] sm:text-xs text-gray-400">{stats.active}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-seguranca-black/50 min-w-0">
              {getStatusIcon('DRAFT')}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-medium text-white truncate">Em elaboração</p>
                <p className="text-[10px] sm:text-xs text-gray-400">{stats.draft}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-seguranca-black/50 min-w-0">
              {getStatusIcon('PENDING')}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-medium text-white truncate">Pendentes</p>
                <p className="text-[10px] sm:text-xs text-gray-400">{stats.pending}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-seguranca-black/50 min-w-0">
              {getStatusIcon('INACTIVE')}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-medium text-white truncate">Inativos</p>
                <p className="text-[10px] sm:text-xs text-gray-400">{stats.inactive}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-seguranca-black/50 min-w-0">
              {getStatusIcon('TERMINATED')}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-medium text-white truncate">Terminados</p>
                <p className="text-[10px] sm:text-xs text-gray-400">{stats.terminated}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
