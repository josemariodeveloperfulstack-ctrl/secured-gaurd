"use client"

import * as React from "react"
import { ChevronsUpDown, Search as SearchIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface MultiOption {
  value: string;
  label: string;
}

interface MultiSearchableSelectProps {
  options: MultiOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MultiSearchableSelect({
  options,
  selectedValues = [],
  onChange,
  placeholder = "Todos os setores de trabalho",
  searchPlaceholder = "Buscar setor de trabalho...",
  emptyPlaceholder = "Nenhum setor encontrado.",
  disabled = false,
  className,
}: Readonly<MultiSearchableSelectProps>) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase().trim();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const isAllSelected = selectedValues.length === 0;

  const toggleSelect = (val: string) => {
    if (selectedValues.includes(val)) {
      const next = selectedValues.filter((v) => v !== val);
      onChange(next);
    } else {
      const next = [...selectedValues, val];
      onChange(next);
    }
  };

  const handleSelectAll = () => {
    onChange([]);
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const renderTriggerLabel = () => {
    if (selectedValues.length === 0) {
      return <span className="text-gray-300">🏢 {placeholder}</span>;
    }
    if (selectedValues.length === 1) {
      const opt = options.find((o) => o.value === selectedValues[0]);
      return <span className="text-white font-medium">🏢 {opt?.label || selectedValues[0]}</span>;
    }
    return (
      <div className="flex items-center gap-1.5 overflow-hidden">
        <span className="text-white font-medium">🏢 {selectedValues.length} Setores</span>
        <Badge variant="secondary" className="bg-seguranca-yellow text-seguranca-black text-[10px] font-bold px-1.5 py-0 h-4 shrink-0">
          +{selectedValues.length}
        </Badge>
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-between bg-seguranca-black/70 border-gray-600 px-3 text-left font-normal hover:bg-seguranca-black focus:border-seguranca-yellow focus:ring-seguranca-yellow/20",
            className
          )}
        >
          <div className="truncate pr-2">{renderTriggerLabel()}</div>
          <div className="flex items-center gap-1 shrink-0">
            {selectedValues.length > 0 && (
              <span
                role="button"
                tabIndex={0}
                onClick={clearSelection}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    clearSelection(e as any);
                  }
                }}
                className="p-0.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white cursor-pointer"
                title="Limpar seleção de setores"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50 text-gray-400" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-2 bg-seguranca-graphite border-gray-600 text-white shadow-2xl z-50">
        <div className="space-y-2">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 bg-seguranca-black/80 border-gray-600 text-sm text-white focus:border-seguranca-yellow"
            />
          </div>

          <div className="flex items-center justify-between px-1 py-1 text-xs border-b border-gray-700/60">
            <button
              type="button"
              onClick={handleSelectAll}
              className={cn(
                "hover:underline font-medium",
                isAllSelected ? "text-seguranca-yellow font-bold" : "text-gray-400"
              )}
            >
              Todos os Setores
            </button>
            {selectedValues.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-red-400 hover:underline"
              >
                Limpar ({selectedValues.length})
              </button>
            )}
          </div>

          <div className="max-h-[220px] overflow-y-auto space-y-1 pr-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-xs text-gray-400 text-center">{emptyPlaceholder}</div>
            ) : (
              filteredOptions.map((opt) => {
                const checked = selectedValues.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleSelect(opt.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleSelect(opt.value);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 text-xs rounded transition-colors text-left cursor-pointer select-none",
                      checked
                        ? "bg-seguranca-red/30 text-white font-semibold"
                        : "hover:bg-gray-700/60 text-gray-200"
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      tabIndex={-1}
                      onCheckedChange={() => toggleSelect(opt.value)}
                      className="border-gray-500 data-[state=checked]:bg-seguranca-yellow data-[state=checked]:text-seguranca-black pointer-events-none"
                    />
                    <span className="truncate">{opt.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
