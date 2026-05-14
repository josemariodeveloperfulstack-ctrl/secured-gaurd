import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  employeeService,
  type Employee,
  type EmployeeFilters,
} from '@/services/employeeService';
import { queryKeys } from './queryKeys';

/**
 * Lista paginada de funcionários (com filtros).
 * Cache por 1 minuto (segue defaults globais).
 */
export function useEmployees(
  filters?: EmployeeFilters,
  page = 0,
  size = 500,
  options?: { enabled?: boolean }
) {
  return useQuery<Employee[]>({
    queryKey: queryKeys.employees.list(filters, page, size),
    queryFn: () => employeeService.getAllEmployees(filters, page, size),
    enabled: options?.enabled ?? true,
  });
}

/** Contagem total de funcionários no sistema. */
export function useEmployeesCount() {
  return useQuery<number>({
    queryKey: queryKeys.employees.count(),
    queryFn: () => employeeService.getEmployeesCount(),
    // Conta muda pouco; pode ficar fresca por 2 minutos
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Detalhe completo de um funcionário pelo ID.
 * Use no modal de edição; o cache evita o fetch duplicado entre a lista
 * e o modal quando o mesmo ID é solicitado em sequência.
 */
export function useEmployeeById(id: string | undefined | null) {
  return useQuery<Employee | null>({
    queryKey: id ? queryKeys.employees.byId(id) : ['employees', 'byId', 'disabled'],
    queryFn: () => employeeService.getEmployeeById(id!),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  });
}

/**
 * Helper para invalidar caches de funcionários após uma mutação.
 * Exemplo:
 *   const invalidate = useInvalidateEmployees();
 *   await update(...);
 *   invalidate(updatedEmployeeId);
 */
export function useInvalidateEmployees() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    if (id) {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.byId(id) });
    }
  };
}
