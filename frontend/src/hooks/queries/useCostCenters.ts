import { useQuery, useQueryClient } from '@tanstack/react-query';
import { costCenterService, type CostCenterDTO } from '@/services/costCenterService';
import { queryKeys } from './queryKeys';

/** Centros de custo ativos. Cache 5 minutos. */
export function useCostCentersActive(options?: { enabled?: boolean }) {
  return useQuery<CostCenterDTO[]>({
    queryKey: queryKeys.costCenters.listActive(),
    queryFn: async () => {
      const data = await costCenterService.listActive();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useInvalidateCostCenters() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.costCenters.all });
}
