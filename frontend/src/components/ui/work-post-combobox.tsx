"use client"

import * as React from "react"
import { Check, ChevronsUpDown, MapPin } from "lucide-react"
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
import { workPostService, WorkPost } from "@/services/workPostService"
import { formatWorkPostDisplayName } from "@/utils/formatters"

interface WorkPostComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyPlaceholder?: string;
  disabled?: boolean;
}

export function WorkPostCombobox({
  value,
  onChange,
  placeholder = "Selecione o posto de trabalho...",
  searchPlaceholder = "Digite para buscar pelo nome ou código...",
  emptyPlaceholder = "Nenhum posto encontrado.",
  disabled = false
}: WorkPostComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [workPosts, setWorkPosts] = React.useState<WorkPost[]>([])
  const [loading, setLoading] = React.useState(false)
  const [selectedPostCache, setSelectedPostCache] = React.useState<WorkPost | null>(null)

  // Carregar postos ao abrir
  React.useEffect(() => {
    if (!open) return
    setLoading(true)
    workPostService.getAllWorkPosts()
      .then(setWorkPosts)
      .catch(() => setWorkPosts([]))
      .finally(() => setLoading(false))
  }, [open])

  // Quando há value mas o posto não está na lista (ex: ao editar), buscar por ID
  React.useEffect(() => {
    if (!value) {
      setSelectedPostCache(null)
      return
    }
    const found = workPosts.find(wp => String(wp.id) === value)
    if (found) {
      setSelectedPostCache(found)
      return
    }
    workPostService.getWorkPostById(value)
      .then(wp => setSelectedPostCache(wp))
      .catch(() => setSelectedPostCache(null))
  }, [value, workPosts])

  const selectedPost = workPosts.find(wp => String(wp.id) === value) ?? selectedPostCache

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className="w-full justify-between border-2 border-gray-600 bg-seguranca-black text-seguranca-lightgray hover:border-gray-500 focus:border-seguranca-yellow transition-colors disabled:opacity-50"
        >
          {selectedPost ? (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{formatWorkPostDisplayName(selectedPost)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 opacity-50" />
              <span>{placeholder}</span>
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-seguranca-graphite border-gray-600 z-[10002] shadow-lg"
      >
        <Command className="bg-seguranca-graphite text-seguranca-lightgray" shouldFilter={true}>
          <CommandInput
            placeholder={searchPlaceholder}
            className="bg-seguranca-graphite text-seguranca-lightgray border-b border-gray-600"
          />
          <CommandList className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-seguranca-lightgray">
                Carregando postos...
              </div>
            ) : (
              <>
                <CommandEmpty className="text-seguranca-lightgray py-4">
                  {emptyPlaceholder}
                </CommandEmpty>
                <CommandGroup>
                  {workPosts.map((post) => {
                    const displayName = formatWorkPostDisplayName(post)
                    return (
                      <CommandItem
                        key={post.id}
                        value={`${displayName} ${post.postCode || ''} ${post.name || ''}`}
                        onSelect={() => {
                          onChange(value === post.id ? "" : post.id)
                          setOpen(false)
                        }}
                        className="text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-lightgray"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            value === post.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span>{displayName}</span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
