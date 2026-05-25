import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Filter, X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ContractFilterPreset = 'all' | 'ACTIVE' | 'PENDING' | 'DRAFT' | 'AWAITING' | 'TERMINATED' | 'INACTIVE' | 'SUSPENDED';

interface ContractsFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  originFilter?: string;
  onOriginFilterChange?: (origin: string) => void;
  expiringFilter?: string;
  onExpiringFilterChange?: (days: string) => void;
  onClearFilters: () => void;
  onClearSearch?: () => void;
  totalContracts: number;
  filteredContracts: number;
  searchTerm?: string;
}

const STATUS_OPTIONS: { value: ContractFilterPreset; label: string; dot?: string }[] = [
  { value: 'all', label: 'Todos os status' },
  { value: 'ACTIVE', label: 'Ativos', dot: 'bg-emerald-500' },
  { value: 'AWAITING', label: 'Aguardando ação', dot: 'bg-amber-500' },
  { value: 'PENDING', label: 'Pendentes', dot: 'bg-yellow-500' },
  { value: 'DRAFT', label: 'Em elaboração', dot: 'bg-slate-400' },
  { value: 'INACTIVE', label: 'Inativos', dot: 'bg-zinc-500' },
  { value: 'SUSPENDED', label: 'Suspensos', dot: 'bg-orange-500' },
  { value: 'TERMINATED', label: 'Terminados', dot: 'bg-red-500' },
];

export const ContractsFilters: React.FC<ContractsFiltersProps> = ({
  statusFilter,
  onStatusFilterChange,
  originFilter = 'all',
  onOriginFilterChange,
  expiringFilter = 'all',
  onExpiringFilterChange,
  onClearFilters,
  onClearSearch,
  totalContracts,
  filteredContracts,
  searchTerm = '',
}) => {
  const hasActiveFilters =
    statusFilter !== 'all' ||
    originFilter !== 'all' ||
    expiringFilter !== 'all' ||
    searchTerm.trim().length > 0;

  const originOptions = [
    { value: 'all', label: 'Todas as origens' },
    { value: 'PROPOSAL', label: 'Proposta' },
    { value: 'RENEWAL', label: 'Renovação' },
    { value: 'MANUAL', label: 'Manual' },
  ];

  const applyStatus = (value: string) => {
    onStatusFilterChange(value);
    if (value !== 'all') {
      onExpiringFilterChange?.('all');
    }
  };

  const applyExpiring = (days: string) => {
    onExpiringFilterChange?.(days);
    if (days !== 'all') {
      onStatusFilterChange('all');
    }
  };

  const activeChips: { key: string; label: string; onRemove: () => void }[] = [];
  if (statusFilter !== 'all') {
    const label = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter;
    activeChips.push({ key: 'status', label: `Status: ${label}`, onRemove: () => applyStatus('all') });
  }
  if (originFilter !== 'all') {
    const label = originOptions.find((o) => o.value === originFilter)?.label ?? originFilter;
    activeChips.push({ key: 'origin', label: `Origem: ${label}`, onRemove: () => onOriginFilterChange?.('all') });
  }
  if (expiringFilter !== 'all') {
    activeChips.push({
      key: 'expiring',
      label: 'Vence em até 30 dias',
      onRemove: () => applyExpiring('all'),
    });
  }
  if (searchTerm.trim()) {
    activeChips.push({
      key: 'search',
      label: `Busca: “${searchTerm.trim().slice(0, 24)}${searchTerm.length > 24 ? '…' : ''}”`,
      onRemove: () => onClearSearch?.(),
    });
  }

  return (
    <div className="rounded-xl border border-gray-600/80 bg-seguranca-graphite overflow-hidden">
      {/* Linha principal */}
      <div className="flex flex-col gap-3 p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-seguranca-yellow/10 flex-shrink-0">
            <Filter className="h-4 w-4 text-seguranca-yellow" />
          </div>
          <div>
            <p className="text-sm font-medium text-seguranca-lightgray">Filtrar lista</p>
            <p className="text-[11px] text-gray-500">Combine origem, status ou vencimento</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className={cn(
              'rounded-lg px-3 py-1.5 text-center border',
              filteredContracts === 0 && hasActiveFilters
                ? 'border-amber-500/40 bg-amber-500/10'
                : 'border-gray-600 bg-seguranca-black/50'
            )}
          >
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Exibindo</p>
            <p className="text-lg font-bold text-white tabular-nums leading-none">
              {filteredContracts}
              <span className="text-sm font-normal text-gray-500"> / {totalContracts}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-700/80 px-3 sm:px-4 py-3 flex flex-col lg:flex-row lg:items-end gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 min-w-0">
          {onOriginFilterChange && (
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                Origem
              </label>
              <Select value={originFilter} onValueChange={onOriginFilterChange}>
                <SelectTrigger className="h-9 bg-seguranca-black border-gray-600 text-seguranca-lightgray text-sm">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-graphite border-gray-600">
                  {originOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
              Status
            </label>
            <Select value={statusFilter} onValueChange={applyStatus}>
              <SelectTrigger className="h-9 bg-seguranca-black border-gray-600 text-seguranca-lightgray text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-seguranca-graphite border-gray-600">
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      {option.dot && <span className={cn('h-2 w-2 rounded-full', option.dot)} />}
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
              Atalhos
            </label>
            <div className="flex flex-wrap gap-1.5 h-9 items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyStatus(statusFilter === 'ACTIVE' ? 'all' : 'ACTIVE')}
                className={cn(
                  'h-7 text-xs border-emerald-600/50',
                  statusFilter === 'ACTIVE'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'text-emerald-400 hover:bg-emerald-600/20'
                )}
              >
                Ativos
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyStatus(statusFilter === 'AWAITING' ? 'all' : 'AWAITING')}
                className={cn(
                  'h-7 text-xs border-amber-600/50',
                  statusFilter === 'AWAITING'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'text-amber-400 hover:bg-amber-600/20'
                )}
              >
                Aguardando
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyExpiring(expiringFilter === '30' ? 'all' : '30')}
                className={cn(
                  'h-7 text-xs',
                  expiringFilter === '30'
                    ? 'bg-seguranca-yellow text-black border-seguranca-yellow'
                    : 'border-gray-600 text-gray-400 hover:border-seguranca-yellow/50 hover:text-seguranca-yellow'
                )}
              >
                <Calendar className="h-3 w-3 mr-1" />
                30 dias
              </Button>
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="h-9 border-gray-600 text-gray-300 hover:bg-seguranca-black flex-shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Limpar tudo
          </Button>
        )}
      </div>

      {/* Chips de filtros ativos */}
      {activeChips.length > 0 && (
        <div className="border-t border-gray-700/80 px-3 sm:px-4 py-2.5 flex flex-wrap items-center gap-2 bg-seguranca-black/30">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-1">Ativos:</span>
          {activeChips.map((chip) => (
            <Badge
              key={chip.key}
              variant="outline"
              className="gap-1 pr-1 border-seguranca-yellow/40 text-seguranca-yellow bg-seguranca-yellow/5 text-xs font-normal"
            >
              {chip.label}
              {chip.key !== 'search' && (
                <button
                  type="button"
                  onClick={chip.onRemove}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-seguranca-yellow/20"
                  aria-label={`Remover filtro ${chip.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {filteredContracts === 0 && totalContracts > 0 && hasActiveFilters && (
        <div className="border-t border-amber-500/20 bg-amber-500/5 px-3 sm:px-4 py-2 text-xs text-amber-200/90">
          Nenhum contrato corresponde aos filtros atuais. Remova um filtro ou use &quot;Limpar tudo&quot;.
        </div>
      )}
    </div>
  );
};
