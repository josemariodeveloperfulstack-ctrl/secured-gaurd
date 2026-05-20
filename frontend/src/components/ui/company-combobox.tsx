"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Building } from "lucide-react"
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

interface Company {
  id: string;
  name: string;
  sigla?: string;
  tradeName?: string;
  cnpj?: string;
}

interface CompanyComboboxProps {
  value: string;
  onChange: (value: string) => void;
  companies: Company[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyPlaceholder?: string;
  disabled?: boolean;
}

export function CompanyCombobox({ 
  value,
  onChange,
  companies = [],
  placeholder = "Selecione a empresa",
  searchPlaceholder = "Buscar empresa...",
  emptyPlaceholder = "Nenhuma empresa encontrada.",
  disabled = false,
}: CompanyComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedCompany = companies.find((c) => c.id === value)
  
  const displayLabel = selectedCompany 
    ? (selectedCompany.sigla || selectedCompany.tradeName || selectedCompany.name)
    : null

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between h-11 rounded-lg bg-black text-white border border-border/60 shadow-sm hover:bg-black/90 focus:ring-2 focus:ring-primary/30 focus:border-primary/60 [&>span]:text-left"
        >
          {displayLabel ? (
            <div className="flex items-center gap-2 truncate">
              <Building className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{displayLabel}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 opacity-50">
              <Building className="h-4 w-4 shrink-0" />
              <span>{placeholder}</span>
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-seguranca-graphite border-gray-600 z-[10100] shadow-lg"
        align="start"
      >
        <Command className="bg-seguranca-graphite text-seguranca-lightgray">
          <CommandInput 
            placeholder={searchPlaceholder} 
            className="bg-seguranca-graphite text-seguranca-lightgray border-b border-gray-600"
          />
          <CommandList className="max-h-64 overflow-y-auto">
            <CommandEmpty className="text-seguranca-lightgray p-4 text-sm">
              {emptyPlaceholder}
            </CommandEmpty>
            <CommandGroup>
              {companies.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  onSelect={() => {
                    onChange(c.id === value ? "" : c.id)
                    setOpen(false)
                  }}
                  className="text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-lightgray cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === c.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">
                      {c.sigla || c.tradeName || c.name}
                    </span>
                    {(c.sigla || c.tradeName) && c.name && (
                      <span className="text-xs text-gray-400 truncate">{c.name}</span>
                    )}
                    {c.cnpj && (
                      <span className="text-[10px] text-gray-500 truncate">CNPJ: {c.cnpj}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
