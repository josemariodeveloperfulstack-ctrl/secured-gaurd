import { useQuery, useQueryClient } from '@tanstack/react-query';
import workPostService, { type WorkPost } from '@/services/workPostService';
import { queryKeys } from './queryKeys';

/** Todos os postos de trabalho ativos. */
export function useAllWorkPosts(options?: { enabled?: boolean }) {
  return useQuery<WorkPost[]>({
    queryKey: queryKeys.workPosts.list(),
    queryFn: () => workPostService.getAllWorkPosts(),
    staleTime: 2 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

/** Postos de trabalho filtrados por cliente. */
export function useWorkPostsByClient(clientId: string | undefined | null) {
  return useQuery<WorkPost[]>({
    queryKey: clientId
      ? queryKeys.workPosts.byClient(clientId)
      : ['workPosts', 'byClient', 'disabled'],
    queryFn: () => workPostService.getWorkPostsByClient(clientId!),
    enabled: Boolean(clientId),
    staleTime: 2 * 60 * 1000,
  });
}

export function useInvalidateWorkPosts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.workPosts.all });
}
