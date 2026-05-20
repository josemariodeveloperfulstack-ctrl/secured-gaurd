import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clientService, type Client } from '@/services/clientService';
import { queryKeys } from './queryKeys';

/**
 * Lista completa de clientes ativos. Clientes mudam pouco, então
 * mantemos o cache fresco por 5 minutos para evitar reload em
 * cada formulário.
 */
export function useClients(options?: { enabled?: boolean }) {
  return useQuery<Client[]>({
    queryKey: queryKeys.clients.list(),
    queryFn: () => clientService.getAllClients(),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useInvalidateClients() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
}
