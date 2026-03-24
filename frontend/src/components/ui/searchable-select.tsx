"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search as SearchIcon } from "lucide-react"
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

interface Option {
  value: string;
  label: string;
  description?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyPlaceholder?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  emptyPlaceholder = "Nenhum item encontrado.",
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-11 w-full justify-between border-gray-600 bg-seguranca-black/70 text-seguranca-lightgray hover:border-gray-500 focus:border-seguranca-yellow transition-colors disabled:opacity-50 px-3"
        >
          <div className="flex items-center gap-2 truncate font-medium text-sm sm:text-base">
            {selectedOption ? selectedOption.label : placeholder}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="p-0 bg-seguranca-graphite border-gray-600 shadow-2xl z-[10500] w-[var(--radix-popover-trigger-width)]"
        align="start"
      >
        <Command className="bg-seguranca-graphite text-seguranca-lightgray border-none">
          <div className="flex items-center border-b border-gray-600 px-3 h-10">
            <SearchIcon className="mr-2 h-4 w-4 shrink-0 opacity-50 text-seguranca-yellow" />
            <CommandInput 
              placeholder={searchPlaceholder} 
              className="flex h-full w-full bg-transparent py-3 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 border-none focus:ring-0"
            />
          </div>
          <CommandList className="max-h-80 overflow-y-auto">
            <CommandEmpty className="py-6 text-center text-sm text-gray-400">
              {emptyPlaceholder}
            </CommandEmpty>
            <CommandGroup className="p-1">
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "all" : currentValue)
                    setOpen(false)
                  }}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none aria-selected:bg-seguranca-black/80 aria-selected:text-seguranca-yellow hover:bg-seguranca-black/80 transition-colors gap-3"
                >
                  <div className="flex items-center justify-center w-5">
                    <Check
                      className={cn(
                        "h-4 w-4 text-seguranca-yellow",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </div>
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <span className="font-medium truncate text-gray-100">{option.label}</span>
                    {option.description && (
                      <span className="text-[11px] text-gray-400 truncate mt-0.5">
                        {option.description}
                      </span>
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

