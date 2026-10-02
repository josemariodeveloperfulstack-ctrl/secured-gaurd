"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Building2, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Supplier } from "@/services/contasAPagarService";

interface SupplierComboboxProps {
  suppliers: Supplier[];
  value?: string;
  onValueChange?: (value: string, supplier?: Supplier) => void;
  placeholder?: string;
  fallbackDisplayName?: string;
  searchPlaceholder?: string;
  emptyPlaceholder?: string;
  disabled?: boolean;
  onAddNewSupplier?: () => void;
  className?: string;
  required?: boolean;
}

export function SupplierCombobox({
  suppliers = [],
  value = "",
  onValueChange,
  placeholder = "Selecione um fornecedor",
  fallbackDisplayName,
  searchPlaceholder = "Buscar por nome, CNPJ, categoria...",
  emptyPlaceholder = "Nenhum fornecedor encontrado.",
  disabled = false,
  onAddNewSupplier,
  className,
}: SupplierComboboxProps) {
  const [open, setOpen] = React.useState(false);

  // Combina fornecedores carregados com fallback se não estiver na lista
  const allSuppliers = React.useMemo(() => {
    const list = Array.isArray(suppliers) ? suppliers.filter((s) => !!s && !!s.id) : [];
    if (fallbackDisplayName && value && !list.some((s) => s.id === value)) {
      return [{ id: value, name: fallbackDisplayName, isActive: true } as Supplier, ...list];
    }
    return list;
  }, [suppliers, value, fallbackDisplayName]);

  // Encontra o fornecedor selecionado
  const selectedSupplier = React.useMemo(() => {
    if (!value) return null;
    return allSuppliers.find((s) => s.id === value) || null;
  }, [allSuppliers, value]);

  const currentDisplayName = selectedSupplier?.name || fallbackDisplayName || null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between border-gray-600 bg-seguranca-black text-seguranca-lightgray hover:bg-seguranca-graphite hover:text-white focus:border-seguranca-yellow focus:ring-seguranca-yellow font-normal h-10 px-3 overflow-hidden",
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-2 text-left">
            <Building2 className="h-4 w-4 shrink-0 text-seguranca-yellow" />
            <span
              className={cn(
                "truncate block text-sm max-w-[calc(100%-8px)]",
                currentDisplayName ? "text-seguranca-lightgray font-medium" : "text-gray-400"
              )}
              title={currentDisplayName || undefined}
            >
              {currentDisplayName || placeholder}
            </span>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60 text-gray-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[320px] max-w-[min(94vw,560px)] p-0 bg-[#16181B] border border-gray-700 shadow-2xl rounded-xl z-[10050] overflow-hidden text-white"
      >
        {/* Header rápido com botão de novo fornecedor */}
        <div className="p-2.5 border-b border-gray-800 bg-[#111315] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
            <Building2 className="h-3.5 w-3.5 text-seguranca-yellow" />
            <span>Lista de Fornecedores</span>
          </div>
          {onAddNewSupplier && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                onAddNewSupplier();
              }}
              className="h-7 px-2 text-xs text-seguranca-yellow hover:text-seguranca-yellow hover:bg-seguranca-yellow/15 flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo Fornecedor
            </Button>
          )}
        </div>

        <Command className="bg-transparent border-0 text-white">
          <div className="flex items-center px-3 border-b border-gray-800">
            <Search className="mr-2 h-4 w-4 shrink-0 text-gray-400" />
            <CommandInput
              placeholder={searchPlaceholder}
              className="flex h-10 w-full rounded-md bg-transparent py-2 text-sm text-white placeholder:text-gray-500 outline-none border-0 focus:ring-0"
            />
          </div>

          <CommandList className="max-h-64 overflow-y-auto p-1.5">
            <CommandEmpty className="py-6 text-center text-xs text-gray-400 space-y-2">
              <p>{emptyPlaceholder}</p>
              {onAddNewSupplier && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    onAddNewSupplier();
                  }}
                  className="mt-2 text-xs border-gray-600 bg-seguranca-black text-seguranca-yellow hover:bg-seguranca-graphite cursor-pointer"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Cadastrar este fornecedor
                </Button>
              )}
            </CommandEmpty>

            <CommandGroup>
              {allSuppliers.map((supplier) => {
                const isSelected = supplier.id === value || (currentDisplayName && supplier.name === currentDisplayName);
                return (
                  <CommandItem
                    key={supplier.id}
                    value={`${supplier.name} ${supplier.cnpj || ""} ${supplier.cpf || ""} ${supplier.category || ""}`}
                    onSelect={() => {
                      onValueChange?.(supplier.id, supplier);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-start justify-between gap-2 p-2.5 rounded-lg cursor-pointer transition-colors text-sm border-b border-gray-800/40 last:border-b-0",
                      isSelected
                        ? "bg-seguranca-graphite text-seguranca-yellow font-medium"
                        : "text-gray-200 hover:bg-gray-800/80 hover:text-white"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-xs sm:text-sm font-medium line-clamp-2 break-words",
                          isSelected ? "text-seguranca-yellow" : "text-gray-100"
                        )}
                        title={supplier.name}
                      >
                        {supplier.name}
                      </p>
                      {(supplier.cnpj || supplier.cpf || supplier.category) && (
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-gray-400">
                          {supplier.cnpj && <span>CNPJ: {supplier.cnpj}</span>}
                          {supplier.cpf && <span>CPF: {supplier.cpf}</span>}
                          {supplier.category && (
                            <span className="bg-gray-800/90 text-gray-300 px-1.5 py-0.5 rounded text-[10px]">
                              {supplier.category}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0 text-seguranca-yellow mt-0.5 ml-2",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
