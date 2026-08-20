"use client"

import * as React from "react"
import { Check, ChevronsUpDown, User, AlertTriangle } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { employeeService, SimpleEmployee } from "@/services/employeeService"

interface EmployeeComboboxProps {
  value?: string;
  onChange?: (value: string) => void;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyPlaceholder?: string;
  disabled?: boolean;
  /** Mínimo de caracteres para disparar a busca (padrão: 3) */
  minChars?: number;
  /** Nome do funcionário para exibir quando value está preenchido (ex.: ao editar) e o combobox ainda não carregou o item */
  initialDisplayName?: string;
  /** Nome exibido quando ainda não há value (ex.: usuário logado como padrão). */
  fallbackDisplayName?: string;
  /** Callback disparado quando um funcionário é selecionado, retornando o objeto completo */
  onEmployeeSelect?: (employee: SimpleEmployee) => void;
  /**
   * Filtro local por cargo do funcionário. Aceita uma string ou lista de strings;
   * a busca é case-insensitive e considera "contém". Útil para listar apenas supervisores, etc.
   */
  positionFilter?: string | string[];
  /** Exibe apenas o nome no botão (sem cargo/posto). A lista de busca mantém detalhes. */
  displayNameOnly?: boolean;
  /** Filtra localmente por empresa do funcionário (companyId). */
  companyId?: string;
  /** Estilos customizados adicionais para o botão do combobox */
  className?: string;
}

export function EmployeeCombobox({ 
  value = "",
  onChange,
  onValueChange,
  placeholder = "Selecione o funcionário",
  searchPlaceholder = "Digite o nome do funcionário para buscar",
  emptyPlaceholder = "Nenhum funcionário encontrado.",
  disabled = false,
  minChars = 3,
  initialDisplayName,
  fallbackDisplayName,
  onEmployeeSelect,
  positionFilter,
  displayNameOnly = false,
  companyId,
  className,
}: EmployeeComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [employees, setEmployees] = React.useState<SimpleEmployee[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [selectedEmployee, setSelectedEmployee] = React.useState<SimpleEmployee | null>(null)
  const onEmployeeSelectRef = React.useRef(onEmployeeSelect)
  onEmployeeSelectRef.current = onEmployeeSelect

  // Normaliza positionFilter em array de tokens (lowercase)
  const positionTokens = React.useMemo(() => {
    if (!positionFilter) return [] as string[];
    const list = Array.isArray(positionFilter) ? positionFilter : [positionFilter];
    return list
      .map(s => (s ?? '').toString().trim().toLowerCase())
      .filter(s => s.length > 0);
  }, [positionFilter])

  const matchesPositionFilter = React.useCallback((emp: SimpleEmployee): boolean => {
    if (positionTokens.length === 0) return true;
    const pos = (emp.positionName ?? '').toLowerCase();
    return positionTokens.some(t => pos.includes(t));
  }, [positionTokens])

  const matchesCompanyFilter = React.useCallback((emp: SimpleEmployee): boolean => {
    if (!companyId) return true;
    return String(emp.companyId || '') === String(companyId);
  }, [companyId])

  // Buscar funcionários quando o combobox for aberto ou quando o usuário digitar
  React.useEffect(() => {
    if (!open) return;

    if (debouncedSearchTerm.trim().length >= minChars) {
      setLoading(true)
      employeeService.searchSimpleEmployees(debouncedSearchTerm.trim())
        .then(result => {
          setEmployees(result.filter(matchesPositionFilter).filter(matchesCompanyFilter))
        })
        .catch(error => {
          console.error('Erro ao buscar funcionários:', error)
          setEmployees([])
        })
        .finally(() => setLoading(false))
    } else {
      // Carregar lista inicial de funcionários ativando o combobox
      setLoading(true)
      employeeService.searchSimpleEmployees("")
        .then(result => {
          setEmployees(result.filter(matchesPositionFilter).filter(matchesCompanyFilter))
        })
        .catch(() => setEmployees([]))
        .finally(() => setLoading(false))
    }
  }, [open, debouncedSearchTerm, minChars, matchesPositionFilter, matchesCompanyFilter])

  // Garantir que o funcionário selecionado apareça na lista mesmo se não estiver carregado
  React.useEffect(() => {
    if (!value) {
      setSelectedEmployee(null)
      return
    }

    if (selectedEmployee?.id === value) {
      return
    }

    const alreadyLoaded = employees.find(e => e.id === value)
    if (alreadyLoaded) {
      setSelectedEmployee(alreadyLoaded)
      onEmployeeSelectRef.current?.(alreadyLoaded)
      return
    }

    // Buscar individualmente e adicionar à lista para exibir no botão
    employeeService.getEmployeeById(value)
      .then(emp => {
        if (emp) {
          const simple: SimpleEmployee = {
            id: emp.id,
            name: emp.name,
            email: emp.email,
            phone: emp.phone,
            document: emp.document,
            cpf: emp.cpf,
            address: emp.address,
            registrationNumber: emp.registrationNumber,
            hireDate: emp.hireDate,
            companyId: emp.company?.id,
            companySigla: emp.company?.sigla,
            positionName: emp.position?.name,
            unitName: emp.unit?.name,
            departmentName: emp.department?.name,
            workPostId: emp.workPostId || emp.workPost?.id,
            workPostName: emp.workPostName || emp.workPost?.name,
            salario: emp.salario,
            diasTrabalho: emp.diasTrabalho,
            horarioTrabalho: emp.horarioTrabalho,
            escalaTrabalho: emp.escalaTrabalho,
            status: emp.status,
          };
          setEmployees(prev => {
            if (prev.some(e => e.id === simple.id)) return prev;
            return [...prev, simple];
          })
          setSelectedEmployee(simple)
          onEmployeeSelectRef.current?.(simple)
        }
      })
      .catch(err => console.error('Erro ao carregar funcionário selecionado:', err))
  }, [value, employees, selectedEmployee?.id])

  // Localized status labels translations
  const getStatusLabel = React.useCallback((status?: string): string => {
    if (!status) return "";
    switch (status.toUpperCase()) {
      case "ACTIVE":
        return "Ativo";
      case "VACATION":
        return "Férias";
      case "TERMINATED":
        return "Demitido";
      case "SUSPENDED":
        return "Suspenso";
      case "LEAVE":
        return "Licença";
      default:
        return "Inativo";
    }
  }, [])

  const isInactive = React.useCallback((status?: string): boolean => {
    if (!status) return false;
    const s = status.toUpperCase();
    return s !== "ACTIVE" && s !== "VACATION";
  }, [])

  const getStatusBadge = React.useCallback((status?: string) => {
    if (!status) return null;
    const s = status.toUpperCase();
    if (s === "ACTIVE") return null;

    let colorClass = "bg-amber-500/10 border-amber-500/20 text-amber-500";
    let label = "Inativo";

    if (s === "VACATION") {
      colorClass = "bg-blue-500/10 border-blue-500/20 text-blue-400";
      label = "Férias";
    } else if (s === "TERMINATED") {
      colorClass = "bg-red-500/10 border-red-500/20 text-red-500";
      label = "Demitido";
    } else if (s === "SUSPENDED") {
      colorClass = "bg-orange-500/10 border-orange-500/20 text-orange-500";
      label = "Suspenso";
    } else if (s === "LEAVE") {
      colorClass = "bg-yellow-500/10 border-yellow-500/20 text-yellow-500";
      label = "Licença";
    }

    return (
      <span className={cn("px-1.5 py-0.5 text-[10px] font-semibold rounded border", colorClass)}>
        {label}
      </span>
    );
  }, [])

  // Converter funcionários para opções do combobox
  const options = employees.map(emp => ({
    label: `${emp.name}${emp.positionName ? ` - ${emp.positionName}` : ''}${(emp.workPostName || emp.unitName) ? ` (${emp.workPostName || emp.unitName})` : ''}`,
    value: emp.id,
    employee: emp
  }))

  const formatEmployeeLabel = (emp: SimpleEmployee, nameOnly: boolean) => {
    if (nameOnly) return emp.name;
    return `${emp.name}${emp.positionName ? ` - ${emp.positionName}` : ''}${(emp.workPostName || emp.unitName) ? ` (${emp.workPostName || emp.unitName})` : ''}`;
  };

  const effectiveSelected = selectedEmployee || employees.find(emp => emp.id === value)
  const displayLabel = effectiveSelected
    ? formatEmployeeLabel(effectiveSelected, displayNameOnly)
    : value && initialDisplayName
      ? (displayNameOnly ? initialDisplayName.split(' - ')[0].split(' (')[0].trim() : initialDisplayName)
      : (!value && fallbackDisplayName ? fallbackDisplayName : null)

  const isSelectedInactive = effectiveSelected && isInactive(effectiveSelected.status);
  const selectedStatusLabel = effectiveSelected ? getStatusLabel(effectiveSelected.status) : "";

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between border-2 border-gray-600 bg-seguranca-black text-seguranca-lightgray hover:border-gray-500 focus:border-seguranca-yellow transition-colors disabled:opacity-50", className)}
        >
          {displayLabel ? (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <User className="h-4 w-4 shrink-0" />
              <span className="truncate text-left">{displayLabel}</span>
              {isSelectedInactive && (
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="inline-flex items-center gap-1 text-amber-500 cursor-help shrink-0">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-[10px] font-semibold uppercase bg-amber-500/10 border border-amber-500/20 px-1 py-0.25 rounded">
                          {selectedStatusLabel}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
                      Atenção: Este funcionário está inativo ({selectedStatusLabel}).
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <User className="h-4 w-4 shrink-0" />
              <span className="truncate">{placeholder}</span>
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0 bg-seguranca-graphite border-gray-600 z-[10100] shadow-lg"
      >
        <Command
          filter={() => 1}
          className="bg-seguranca-graphite text-seguranca-lightgray"
        >
          <CommandInput 
            placeholder={searchPlaceholder} 
            value={searchTerm}
            onValueChange={setSearchTerm}
            className="bg-seguranca-graphite text-seguranca-lightgray border-b border-gray-600"
          />
          <CommandList className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-seguranca-lightgray">
                Buscando funcionários...
              </div>
            ) : (
              <>
                <CommandEmpty className="text-seguranca-lightgray">
                  {searchTerm.trim().length < minChars
                    ? `Digite pelo menos ${minChars} caracteres para buscar...`
                    : (positionTokens.length > 0
                        ? `Nenhum funcionário com cargo "${positionTokens.join('/')}" encontrado.`
                        : emptyPlaceholder)
                  }
                </CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={`${option.employee.name} ${option.employee.registrationNumber || ''} ${option.value}`}
                      onSelect={() => {
                        const targetVal = option.value;
                        const isSelected = String(targetVal) === String(value);
                        const nextVal = isSelected ? "" : targetVal;
                        if (onChange) onChange(nextVal);
                        if (onValueChange) onValueChange(nextVal);
                        setSelectedEmployee(option.employee);
                        if (!isSelected && onEmployeeSelect) {
                          onEmployeeSelect(option.employee);
                        }
                        setOpen(false);
                        setSearchTerm("");
                      }}
                      className="text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-lightgray"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{option.employee.name}</span>
                          {getStatusBadge(option.employee.status)}
                        </div>
                        <span className="text-sm text-gray-400">
                          {option.employee.positionName && `${option.employee.positionName}`}
                          {option.employee.companySigla && ` • ${option.employee.companySigla}`}
                          {option.employee.unitName && ` • ${option.employee.unitName}`}
                          {option.employee.registrationNumber && ` • ${option.employee.registrationNumber}`}
                        </span>
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
  )
}
