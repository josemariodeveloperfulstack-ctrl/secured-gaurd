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

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return "border-2 border-green-500/50 text-green-500 bg-green-500/10";
      case 'PENDING':
        return "border-2 border-yellow-500/50 text-yellow-500 bg-yellow-500/10";
      case 'TERMINATED':
      case 'CANCELLED':
      case 'EXPIRED':
        return "border-2 border-red-500/50 text-red-500 bg-red-500/10";
      case 'SUSPENDED':
        return "border-2 border-orange-500/50 text-orange-500 bg-orange-500/10";
      default:
        return "border-2 border-zinc-700 text-zinc-400 bg-zinc-800/30";
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 w-full min-w-0 font-mono">
      {/* Total de Contratos */}
      <Card className="bg-[#121212] border-2 border-zinc-800 rounded-none min-w-0 overflow-hidden hover:border-yellow-500/40 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
          <CardTitle className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400 truncate pr-1">
            SYS::CONTRATOS
          </CardTitle>
          <Users className="h-4 w-4 text-yellow-500 flex-shrink-0" />
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white">{stats.total}</div>
          <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold tracking-widest">
            REGISTROS_TOTAIS
          </p>
        </CardContent>
      </Card>

      {/* Contratos Ativos */}
      <Card className="bg-[#121212] border-2 border-zinc-800 rounded-none min-w-0 overflow-hidden hover:border-green-500/40 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
          <CardTitle className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-green-500 truncate pr-1">
            SYS::ATIVOS
          </CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-green-500">{stats.active}</div>
          <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold tracking-widest">
            {getPercentage(stats.active, stats.total)}% DO_VOLUME
          </p>
          <div className="flex items-center mt-2">
            <span className="border-2 border-green-500 text-green-500 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-none bg-green-500/10">
              LIVE_SYSTEM
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Valor Total */}
      <Card className="bg-[#121212] border-2 border-zinc-800 rounded-none min-w-0 overflow-hidden hover:border-yellow-500/40 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
          <CardTitle className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400 truncate pr-1">
            SYS::VALOR_ANUAL
          </CardTitle>
          <DollarSign className="h-4 w-4 text-yellow-500 flex-shrink-0" />
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="text-base sm:text-xl lg:text-2xl font-black text-white min-w-0 break-words" title={formatCurrency(stats.totalValue)}>
            {formatCurrency(stats.totalValue)}
          </div>
          <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold tracking-widest truncate">
            MED:: {formatCurrency(stats.averageValue)}
          </p>
        </CardContent>
      </Card>

      {/* MRR - se disponível da API */}
      {apiStats != null ? (
        <Card className="bg-[#121212] border-2 border-zinc-800 rounded-none min-w-0 overflow-hidden hover:border-green-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-green-400 truncate pr-1">
              SYS::MRR_RECORRENTE
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-base sm:text-xl lg:text-2xl font-black text-green-400 min-w-0 break-words" title={formatCurrency(apiStats.mrr ?? 0)}>
              {formatCurrency(apiStats.mrr ?? 0)}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold tracking-widest">FATURAMENTO_MENSAL</p>
          </CardContent>
        </Card>
      ) : (
        /* Contratos Vencendo (Fallback para ocupar espaço quando API sem estatísticas detalhadas) */
        <Card className="bg-[#121212] border-2 border-zinc-800 rounded-none min-w-0 overflow-hidden hover:border-red-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-red-500 truncate pr-1">
              SYS::VENCENDO_MES
            </CardTitle>
            <Calendar className="h-4 w-4 text-red-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-red-500">{stats.expiringThisMonth}</div>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold tracking-widest">REQUIERE_ATENCAO</p>
          </CardContent>
        </Card>
      )}

      {/* Distribuição por Status */}
      <Card className="bg-[#121212] border-2 border-zinc-800 rounded-none col-span-2 lg:col-span-4 min-w-0 overflow-hidden">
        <CardHeader className="px-4 pt-4 pb-2 border-b border-zinc-800">
          <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-none animate-pulse" />
            CONSOLE::DISTRIBUICAO_STATUS
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="flex items-center gap-3 p-3 bg-black border-2 border-zinc-800 rounded-none min-w-0 hover:border-green-500/30 transition-colors">
              {getStatusIcon('ACTIVE')}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black text-white uppercase tracking-wider truncate">Ativos</p>
                <p className="text-xs font-bold text-green-500">{stats.active}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-black border-2 border-zinc-800 rounded-none min-w-0 hover:border-zinc-500/30 transition-colors">
              {getStatusIcon('DRAFT')}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black text-white uppercase tracking-wider truncate">Elaborando</p>
                <p className="text-xs font-bold text-zinc-400">{stats.draft}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-black border-2 border-zinc-800 rounded-none min-w-0 hover:border-yellow-500/30 transition-colors">
              {getStatusIcon('PENDING')}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black text-white uppercase tracking-wider truncate">Pendentes</p>
                <p className="text-xs font-bold text-yellow-500">{stats.pending}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-black border-2 border-zinc-800 rounded-none min-w-0 hover:border-zinc-700/30 transition-colors">
              {getStatusIcon('INACTIVE')}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black text-white uppercase tracking-wider truncate">Inativos</p>
                <p className="text-xs font-bold text-zinc-500">{stats.inactive}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-black border-2 border-zinc-800 rounded-none min-w-0 hover:border-red-500/30 transition-colors">
              {getStatusIcon('TERMINATED')}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black text-white uppercase tracking-wider truncate">Terminados</p>
                <p className="text-xs font-bold text-red-500">{stats.terminated}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
