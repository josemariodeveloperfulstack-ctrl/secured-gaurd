import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Calendar,
  FileText,
  TrendingUp,
  PauseCircle,
  FileEdit,
  ChevronRight,
} from 'lucide-react';
import { Contract, contractService, ContractDashboardStats } from '@/services/contractService';
import { cn } from '@/lib/utils';

interface ContractsDashboardProps {
  contracts: Contract[];
  statusFilter?: string;
  expiringFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  onFocusExpiring?: () => void;
}

interface DashboardStats {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  draft: number;
  terminated: number;
  suspended: number;
  totalValue: number;
  expiringThisMonth: number;
  averageValue: number;
}

const STATUS_SEGMENTS = [
  { key: 'ACTIVE', label: 'Ativos', color: 'bg-emerald-500', filter: 'ACTIVE' },
  { key: 'DRAFT', label: 'Em elaboração', color: 'bg-slate-400', filter: 'DRAFT' },
  { key: 'PENDING', label: 'Pendentes', color: 'bg-amber-500', filter: 'PENDING' },
  { key: 'INACTIVE', label: 'Inativos', color: 'bg-zinc-500', filter: 'INACTIVE' },
  { key: 'TERMINATED', label: 'Terminados', color: 'bg-red-500', filter: 'TERMINATED' },
] as const;

export const ContractsDashboard: React.FC<ContractsDashboardProps> = ({
  contracts,
  statusFilter = 'all',
  expiringFilter = 'all',
  onStatusFilterChange,
  onFocusExpiring,
}) => {
  const [apiStats, setApiStats] = useState<ContractDashboardStats | null>(null);

  useEffect(() => {
    contractService.getDashboardStats().then(setApiStats).catch(() => setApiStats(null));
  }, [contracts.length]);

  const stats = useMemo((): DashboardStats => {
    const total = contracts.length;
    const active = contracts.filter((c) => c.status === 'ACTIVE').length;
    const inactive = contracts.filter((c) => c.status === 'INACTIVE').length;
    const pending = contracts.filter((c) => c.status === 'PENDING').length;
    const draft = contracts.filter((c) => c.status === 'DRAFT').length;
    const suspended = contracts.filter((c) => c.status === 'SUSPENDED').length;
    const terminated = contracts.filter(
      (c) =>
        c.status === 'TERMINATED' ||
        c.status === 'CANCELLED' ||
        c.status === 'EXPIRED'
    ).length;
    const totalValue = contracts.reduce((sum, c) => sum + (c.value || 0), 0);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const expiringThisMonth = contracts.filter((c) => {
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
      suspended,
      totalValue,
      expiringThisMonth,
      averageValue: total > 0 ? totalValue / total : 0,
    };
  }, [contracts]);

  const formatCurrency = (value: number, compact = false) => {
    if (compact && value >= 1_000_000) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(value);
    }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const pct = (value: number) =>
    stats.total > 0 ? ((value / stats.total) * 100).toFixed(0) : '0';

  const healthScore = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;

  const segmentCounts: Record<string, number> = {
    ACTIVE: stats.active,
    DRAFT: stats.draft,
    PENDING: stats.pending,
    INACTIVE: stats.inactive,
    TERMINATED: stats.terminated,
  };

  const toggleStatusFilter = (filter: string) => {
    if (!onStatusFilterChange) return;
    onStatusFilterChange(statusFilter === filter ? 'all' : filter);
  };

  const kpiCards = [
    {
      id: 'total',
      label: 'Total de contratos',
      value: String(stats.total),
      hint: 'Cadastrados no sistema',
      icon: FileText,
      iconClass: 'text-seguranca-yellow',
      filter: 'all' as const,
      accent: 'from-seguranca-yellow/20 to-transparent',
    },
    {
      id: 'active',
      label: 'Contratos ativos',
      value: String(stats.active),
      hint: `${pct(stats.active)}% do portfólio`,
      icon: CheckCircle,
      iconClass: 'text-emerald-400',
      filter: 'ACTIVE' as const,
      accent: 'from-emerald-500/15 to-transparent',
      badge: stats.active > 0 ? `${stats.active} em vigor` : undefined,
    },
    {
      id: 'pending',
      label: 'Aguardando ação',
      value: String(stats.pending + stats.draft),
      hint: `${stats.pending} pendentes · ${stats.draft} em elaboração`,
      icon: Clock,
      iconClass: 'text-amber-400',
      filter: 'AWAITING' as const,
      accent: 'from-amber-500/15 to-transparent',
    },
    {
      id: 'expiring',
      label: 'Vencem este mês',
      value: String(stats.expiringThisMonth),
      hint: stats.expiringThisMonth > 0 ? 'Requer atenção imediata' : 'Nenhum vencimento no mês',
      icon: Calendar,
      iconClass: stats.expiringThisMonth > 0 ? 'text-red-400' : 'text-gray-400',
      filter: null,
      accent: 'from-red-500/15 to-transparent',
      urgent: stats.expiringThisMonth > 0,
      onClick: onFocusExpiring,
    },
  ];

  return (
    <section className="space-y-4 w-full min-w-0" aria-label="Visão geral dos contratos">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-seguranca-yellow">
            Visão geral
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Clique nos indicadores para filtrar a lista abaixo
          </p>
        </div>
        <Badge variant="outline" className="border-gray-600 text-gray-400 text-xs">
          Saúde do portfólio: {healthScore}%
        </Badge>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const isActive =
            (card.filter != null && statusFilter === card.filter) ||
            (card.id === 'expiring' && expiringFilter === '30');
          const isClickable = !!(card.filter && onStatusFilterChange) || !!card.onClick;

          return (
            <button
              key={card.id}
              type="button"
              disabled={!isClickable}
              onClick={() => {
                if (card.onClick) card.onClick();
                else if (card.filter && onStatusFilterChange) toggleStatusFilter(card.filter);
              }}
              className={cn(
                'text-left rounded-xl border transition-all duration-200 min-w-0 overflow-hidden',
                'bg-seguranca-graphite border-gray-600/80',
                isClickable && 'hover:border-seguranca-yellow/50 hover:shadow-lg hover:shadow-seguranca-yellow/5 cursor-pointer',
                isActive && 'ring-2 ring-seguranca-yellow border-seguranca-yellow/60',
                !isClickable && 'cursor-default'
              )}
            >
              <div className={cn('h-1 w-full bg-gradient-to-r', card.accent)} />
              <div className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] sm:text-xs font-medium text-gray-400 leading-tight">
                    {card.label}
                  </p>
                  <Icon className={cn('h-4 w-4 flex-shrink-0', card.iconClass)} />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-white mt-2 tabular-nums">
                  {card.value}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1 line-clamp-2">
                  {card.hint}
                </p>
                {card.badge && (
                  <Badge className="mt-2 bg-emerald-500/20 text-emerald-300 border-0 text-[10px]">
                    {card.badge}
                  </Badge>
                )}
                {card.urgent && (
                  <Badge className="mt-2 bg-red-500/20 text-red-300 border-0 text-[10px]">
                    Urgente
                  </Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-seguranca-graphite border-gray-600/80 overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-seguranca-yellow/10 flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-5 w-5 text-seguranca-yellow" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400">Valor total do portfólio</p>
              <p
                className="text-lg sm:text-xl font-bold text-white truncate"
                title={formatCurrency(stats.totalValue)}
              >
                {formatCurrency(stats.totalValue, true)}
              </p>
              <p className="text-[10px] text-gray-500">
                Ticket médio: {formatCurrency(stats.averageValue, true)}
              </p>
            </div>
          </CardContent>
        </Card>

        {apiStats != null && (
          <Card className="bg-seguranca-graphite border-gray-600/80 overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400">MRR (receita recorrente)</p>
                <p
                  className="text-lg sm:text-xl font-bold text-white truncate"
                  title={formatCurrency(apiStats.mrr ?? 0)}
                >
                  {formatCurrency(apiStats.mrr ?? 0, true)}
                </p>
                <p className="text-[10px] text-gray-500">Estimativa mensal ativa</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-seguranca-graphite border-gray-600/80 overflow-hidden">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-2">Composição rápida</p>
            <div className="flex flex-wrap gap-2">
              {apiStats != null && apiStats.amendmentsThisMonth > 0 && (
                <Badge className="bg-seguranca-yellow/15 text-seguranca-yellow border-0 gap-1">
                  <FileEdit className="h-3 w-3" />
                  {apiStats.amendmentsThisMonth} aditivo(s) no mês
                </Badge>
              )}
              {apiStats != null && apiStats.suspendedCount > 0 && (
                <Badge className="bg-amber-500/15 text-amber-300 border-0 gap-1">
                  <PauseCircle className="h-3 w-3" />
                  {apiStats.suspendedCount} suspenso(s)
                </Badge>
              )}
              {stats.terminated > 0 && (
                <Badge className="bg-red-500/15 text-red-300 border-0 gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.terminated} encerrado(s)
                </Badge>
              )}
              {stats.total === 0 && (
                <span className="text-xs text-gray-500">Nenhum contrato cadastrado</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição interativa */}
      <Card className="bg-seguranca-graphite border-gray-600/80 overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <p className="text-sm font-medium text-seguranca-lightgray">
              Distribuição por status
            </p>
            {statusFilter !== 'all' && onStatusFilterChange && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-gray-400 hover:text-white"
                onClick={() => onStatusFilterChange('all')}
              >
                Limpar filtro
                <ChevronRight className="h-3 w-3 ml-1 rotate-180" />
              </Button>
            )}
          </div>

          {/* Barra empilhada */}
          {stats.total > 0 && (
            <div className="flex h-2.5 rounded-full overflow-hidden mb-4 bg-seguranca-black">
              {STATUS_SEGMENTS.map((seg) => {
                const count = segmentCounts[seg.key] ?? 0;
                const width = stats.total > 0 ? (count / stats.total) * 100 : 0;
                if (width <= 0) return null;
                return (
                  <div
                    key={seg.key}
                    className={cn(seg.color, 'transition-all duration-300')}
                    style={{ width: `${width}%` }}
                    title={`${seg.label}: ${count}`}
                  />
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {STATUS_SEGMENTS.map((seg) => {
              const count = segmentCounts[seg.key] ?? 0;
              const isSelected = statusFilter === seg.filter;
              return (
                <button
                  key={seg.key}
                  type="button"
                  disabled={!onStatusFilterChange}
                  onClick={() => toggleStatusFilter(seg.filter)}
                  className={cn(
                    'flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all',
                    'bg-seguranca-black/40 border-gray-700/80',
                    onStatusFilterChange &&
                      'hover:border-seguranca-yellow/40 hover:bg-seguranca-black/70 cursor-pointer',
                    isSelected && 'ring-1 ring-seguranca-yellow border-seguranca-yellow/50 bg-seguranca-black'
                  )}
                >
                  <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', seg.color)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] sm:text-xs font-medium text-white truncate">
                      {seg.label}
                    </p>
                    <p className="text-xs text-gray-400 tabular-nums">
                      {count}
                      <span className="text-gray-600 ml-1">({pct(count)}%)</span>
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </section>
  );
};
