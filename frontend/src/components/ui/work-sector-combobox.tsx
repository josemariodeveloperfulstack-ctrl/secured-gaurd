"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, Tag, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface WorkSectorComboboxProps {
  sectors: string[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyPlaceholder?: string;
  disabled?: boolean;
  minSearchChars?: number;
  className?: string;
  autoFilled?: boolean;
}

const normalizeText = (text: string): string => {
  return (text || '')
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

export function WorkSectorCombobox({
  sectors = [],
  value = "",
  onValueChange,
  placeholder = "Selecione o setor de trabalho",
  searchPlaceholder = "Digite pelo menos 3 caracteres para buscar...",
  emptyPlaceholder = "Nenhum setor de trabalho encontrado.",
  disabled = false,
  minSearchChars = 3,
  className,
  autoFilled = false,
}: WorkSectorComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  const hasMinChars = searchTerm.trim().length >= minSearchChars

  const filteredSectors = React.useMemo(() => {
    if (!hasMinChars) return []
    const termNormalized = normalizeText(searchTerm)
    return sectors.filter((s) => normalizeText(s).includes(termNormalized))
  }, [sectors, searchTerm, hasMinChars])

  // Limpa o termo de busca ao fechar o popover
  React.useEffect(() => {
    if (!open) {
      setSearchTerm("")
    }
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-between border-gray-600 bg-seguranca-black text-seguranca-lightgray hover:border-gray-500 focus:border-seguranca-yellow transition-colors disabled:opacity-50 px-3 font-normal",
            autoFilled && "border-emerald-400/40 text-emerald-300",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate text-left flex-1 min-w-0">
            <Tag className={cn("h-3.5 w-3.5 shrink-0 opacity-60", autoFilled && "text-emerald-400 opacity-100")} />
            <span className={cn("truncate text-sm", !value && "text-gray-400")}>
              {value || placeholder}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {value && (
              <span
                role="button"
                tabIndex={0}
                className="p-1 hover:bg-gray-700/50 rounded-full text-gray-400 hover:text-white cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  onValueChange("")
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation()
                    onValueChange("")
                  }
                }}
                title="Limpar setor de trabalho"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-seguranca-graphite border-gray-600 shadow-2xl z-[10500]"
        align="start"
      >
        <Command className="bg-seguranca-graphite text-seguranca-lightgray border-none" shouldFilter={false}>
          <div className="flex items-center border-b border-gray-600 px-3 h-10">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-seguranca-yellow" />
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchTerm}
              onValueChange={setSearchTerm}
              className="flex h-full w-full bg-transparent py-3 text-sm outline-none placeholder:text-gray-400 border-none focus:ring-0 text-white"
              autoFocus
            />
          </div>
          <CommandList className="max-h-64 overflow-y-auto p-1">
            {!hasMinChars ? (
              <div className="py-6 text-center text-xs text-gray-400 px-4 space-y-1">
                <p>
                  Digite ao menos <span className="text-seguranca-yellow font-semibold">{minSearchChars} caracteres</span> para pesquisar.
                </p>
                {value && (
                  <p className="text-[11px] text-gray-400 pt-1">
                    Setor atual: <span className="text-gray-200 font-medium">{value}</span>
                  </p>
                )}
              </div>
            ) : filteredSectors.length === 0 ? (
              <CommandEmpty className="py-6 text-center text-xs text-gray-400">
                {emptyPlaceholder}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredSectors.map((setor) => {
                  const isSelected = value === setor
                  return (
                    <CommandItem
                      key={setor}
                      value={setor}
                      onSelect={() => {
                        onValueChange(isSelected ? "" : setor)
                        setOpen(false)
                      }}
                      className={cn(
                        "flex cursor-pointer items-center justify-between rounded-sm px-2 py-2 text-xs outline-none transition-colors",
                        isSelected
                          ? "bg-seguranca-black/90 text-seguranca-yellow font-semibold"
                          : "text-seguranca-lightgray hover:bg-seguranca-black/60 hover:text-white"
                      )}
                    >
                      <span className="truncate">{setor}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-seguranca-yellow" />}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
