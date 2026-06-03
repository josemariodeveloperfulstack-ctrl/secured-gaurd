import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
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
 * Detalhe completo de um funcionário pelo ID (GET /api/employees/:id).
 * Não reutilize entradas vindas da listagem paginada — ela não traz bankData e vários outros campos.
 */
export function useEmployeeById(id: string | undefined | null) {
  return useQuery<Employee | null>({
    queryKey: id ? queryKeys.employees.byId(id) : ['employees', 'byId', 'disabled'],
    queryFn: () => employeeService.getEmployeeById(id!),
    enabled: Boolean(id),
    staleTime: 0,
  });
}

/**
 * Busca o funcionário completo para o modal de edição.
 * Descarta cache `byId` preenchido pela listagem paginada (dados parciais).
 */
export async function fetchEmployeeDetailForEdit(
  queryClient: QueryClient,
  id: string,
): Promise<Employee | null> {
  queryClient.removeQueries({ queryKey: queryKeys.employees.byId(id) });
  const employee = await employeeService.getEmployeeById(id);
  if (employee?.id) {
    queryClient.setQueryData(queryKeys.employees.byId(id), employee);
  }
  return employee;
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
