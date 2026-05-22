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
import { Calendar, Filter, X } from 'lucide-react';

interface ContractsFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  originFilter?: string;
  onOriginFilterChange?: (origin: string) => void;
  expiringFilter?: string;
  onExpiringFilterChange?: (days: string) => void;
  onClearFilters: () => void;
  totalContracts: number;
  filteredContracts: number;
}

export const ContractsFilters: React.FC<ContractsFiltersProps> = ({
  statusFilter,
  onStatusFilterChange,
  originFilter = 'all',
  onOriginFilterChange,
  expiringFilter = 'all',
  onExpiringFilterChange,
  onClearFilters,
  totalContracts,
  filteredContracts
}) => {
  const statusOptions = [
    { value: 'all', label: 'Todos os Status', count: totalContracts },
    { value: 'ACTIVE', label: 'Ativos', color: 'bg-green-500' },
    { value: 'DRAFT', label: 'Em elaboração', color: 'bg-gray-400' },
    { value: 'PENDING', label: 'Pendentes', color: 'bg-yellow-500' },
    { value: 'INACTIVE', label: 'Inativos', color: 'bg-gray-500' },
    { value: 'SUSPENDED', label: 'Suspensos', color: 'bg-orange-500' },
    { value: 'CANCELLED', label: 'Cancelados', color: 'bg-red-500' },
    { value: 'EXPIRED', label: 'Expirados', color: 'bg-red-500' },
    { value: 'TERMINATED', label: 'Terminados (Cancelado/Expirado)', color: 'bg-red-500' }
  ];

  const hasActiveFilters = statusFilter !== 'all' || originFilter !== 'all' || expiringFilter !== 'all';

  const originOptions = [
    { value: 'all', label: 'Todas as origens' },
    { value: 'PROPOSAL', label: 'Proposta' },
    { value: 'RENEWAL', label: 'Renovação' },
    { value: 'MANUAL', label: 'Manual' }
  ];

  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-3 sm:gap-4 p-4 bg-[#121212] border-2 border-zinc-800 rounded-none font-mono">
      <div className="flex items-center gap-2 border-r-2 border-zinc-800 pr-3">
        <Filter className="h-4 w-4 text-yellow-500" />
        <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Filtros:</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Filtro por Origem */}
        {onOriginFilterChange && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider hidden sm:inline">Origem::</span>
            <Select value={originFilter} onValueChange={onOriginFilterChange}>
              <SelectTrigger className="w-full min-w-[120px] sm:w-40 bg-black border-2 border-zinc-800 text-white placeholder-zinc-700 rounded-none text-xs h-9 uppercase font-bold tracking-wider">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent className="bg-[#121212] border-2 border-zinc-800 rounded-none text-white font-mono">
                {originOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="hover:bg-zinc-800 uppercase text-xs font-bold">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Filtro por Status */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider hidden sm:inline">Status::</span>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-full min-w-[120px] sm:w-40 bg-black border-2 border-zinc-800 text-white placeholder-zinc-700 rounded-none text-xs h-9 uppercase font-bold tracking-wider">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#121212] border-2 border-zinc-800 rounded-none text-white font-mono">
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="hover:bg-zinc-800 uppercase text-xs font-bold">
                  <div className="flex items-center gap-2">
                    {option.color && (
                      <div className={`w-2 h-2 rounded-none border border-zinc-800 ${option.color}`} />
                    )}
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Indicador de contratos encontrados */}
        <div className="flex items-center gap-2">
          <span className="border-2 border-zinc-700 bg-zinc-900 text-zinc-400 font-bold uppercase tracking-wider text-[10px] px-2 py-1 rounded-none">
            <span className="hidden sm:inline">{filteredContracts} de {totalContracts} contratos</span>
            <span className="sm:hidden">{filteredContracts}/{totalContracts}</span>
          </span>
        </div>

        {/* Botão para limpar filtros */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="border-2 border-zinc-700 text-zinc-400 bg-transparent hover:bg-zinc-700 hover:text-white rounded-none h-9 px-3 font-bold uppercase tracking-wider text-xs transition-colors"
          >
            <span className="hidden sm:inline">Limpar Filtros</span>
            <span className="sm:hidden">Limpar</span>
          </Button>
        )}
      </div>

      {/* Filtros rápidos - ocultos em telas muito pequenas */}
      <div className="hidden sm:flex flex-wrap gap-2 lg:ml-auto min-w-0">
        <Button
          variant={statusFilter === 'ACTIVE' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onStatusFilterChange(statusFilter === 'ACTIVE' ? 'all' : 'ACTIVE')}
          className={`text-xs font-bold uppercase tracking-wider rounded-none h-9 px-3 transition-all active:scale-[0.98] ${
            statusFilter === 'ACTIVE' 
              ? 'bg-green-500 hover:bg-green-600 text-black border-2 border-green-500' 
              : 'border-2 border-green-500/30 text-green-500 bg-transparent hover:bg-green-500/10'
          }`}
        >
          Ativos
        </Button>
        
        <Button
          variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onStatusFilterChange(statusFilter === 'PENDING' ? 'all' : 'PENDING')}
          className={`text-xs font-bold uppercase tracking-wider rounded-none h-9 px-3 transition-all active:scale-[0.98] ${
            statusFilter === 'PENDING' 
              ? 'bg-yellow-500 hover:bg-yellow-600 text-black border-2 border-yellow-500' 
              : 'border-2 border-yellow-500/30 text-yellow-500 bg-transparent hover:bg-yellow-500/10'
          }`}
        >
          Pendentes
        </Button>
        
        <Button
          variant={expiringFilter !== 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onExpiringFilterChange?.(expiringFilter === '30' ? 'all' : '30')}
          className={`text-xs font-bold uppercase tracking-wider whitespace-nowrap rounded-none h-9 px-3 transition-all active:scale-[0.98] ${
            expiringFilter === '30'
              ? 'bg-red-500 hover:bg-red-600 text-white border-2 border-red-500'
              : 'border-2 border-red-500/30 text-red-500 bg-transparent hover:bg-red-500/10'
          }`}
        >
          <Calendar className="h-3.5 w-3.5 mr-1" />
          <span className="hidden md:inline">Vencendo (30d)</span>
          <span className="md:hidden">Venc.</span>
        </Button>
      </div>
    </div>
  );
};
