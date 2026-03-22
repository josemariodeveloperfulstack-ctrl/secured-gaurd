"use client";

import * as React from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
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
import { clientService, Client } from "@/services/clientService";

interface ClientSearchComboboxProps {
  value: string;
  onChange: (clientId: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyPlaceholder?: string;
  disabled?: boolean;
  /** Mínimo de caracteres para buscar na API (padrão: 3) */
  minChars?: number;
  /** Nome exibido quando há valor selecionado (ex.: edição) antes da busca */
  initialDisplayName?: string;
}

export function ClientSearchCombobox({
  value,
  onChange,
  placeholder = "Selecione um cliente",
  searchPlaceholder = "Digite pelo menos 3 caracteres para buscar",
  emptyPlaceholder = "Nenhum cliente encontrado.",
  disabled = false,
  minChars = 3,
  initialDisplayName,
}: ClientSearchComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);

  React.useEffect(() => {
    if (debouncedSearch.trim().length >= minChars) {
      setLoading(true);
      clientService
        .getClients({
          searchTerm: debouncedSearch.trim(),
          page: 0,
          size: 50,
        })
        .then((page) => {
          const list = page?.content ?? [];
          setClients(Array.isArray(list) ? list : []);
        })
        .catch((err) => {
          console.error("Erro ao buscar clientes:", err);
          setClients([]);
        })
        .finally(() => setLoading(false));
    } else {
      setClients([]);
    }
  }, [debouncedSearch, minChars]);

  /** Nome do cliente selecionado (edição / valor externo) */
  React.useEffect(() => {
    if (!value) {
      setSelectedClient(null);
      return;
    }
    let cancelled = false;
    clientService
      .getClientById(value)
      .then((c) => {
        if (!cancelled) setSelectedClient(c);
      })
      .catch(() => {
        if (!cancelled) setSelectedClient(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  const displayLabel =
    selectedClient?.name ||
    (value && initialDisplayName ? initialDisplayName : null);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between border-2 border-gray-600 bg-seguranca-black text-seguranca-lightgray hover:border-gray-500 focus:border-seguranca-yellow transition-colors disabled:opacity-50 h-11"
          )}
        >
          {displayLabel ? (
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{displayLabel}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
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
        <Command filter={() => true} className="bg-seguranca-graphite text-seguranca-lightgray">
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchTerm}
            onValueChange={setSearchTerm}
            className="bg-seguranca-graphite text-seguranca-lightgray border-b border-gray-600"
          />
          <CommandList className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-seguranca-lightgray text-sm">
                Buscando clientes...
              </div>
            ) : (
              <>
                <CommandEmpty className="text-seguranca-lightgray py-4 text-sm">
                  {searchTerm.trim().length < minChars
                    ? `Digite pelo menos ${minChars} caracteres para buscar...`
                    : emptyPlaceholder}
                </CommandEmpty>
                <CommandGroup>
                  {clients.map((c) => (
                    <CommandItem
                      key={String(c.id)}
                      value={String(c.id)}
                      onSelect={() => {
                        onChange(String(c.id));
                        setSelectedClient(c);
                        setOpen(false);
                        setSearchTerm("");
                      }}
                      className="text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-lightgray"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          value === String(c.id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate">{c.name}</span>
                        {c.cnpj && (
                          <span className="text-xs text-gray-400 truncate">{c.cnpj}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
