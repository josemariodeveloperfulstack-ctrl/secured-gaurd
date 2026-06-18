import { useQuery, useQueryClient } from '@tanstack/react-query';
import { companyService } from '@/services/companyService';
import { queryKeys } from './queryKeys';

/** Lista de empresas (multi-tenant). Cache 5 minutos. */
export function useCompanies(options?: { enabled?: boolean }) {
  return useQuery<any[]>({
    queryKey: queryKeys.companies.list(),
    queryFn: () => companyService.getAllCompanies(),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    enabled: options?.enabled ?? true,
  });
}

export function useInvalidateCompanies() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
}
