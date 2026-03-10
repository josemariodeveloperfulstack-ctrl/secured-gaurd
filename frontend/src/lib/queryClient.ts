import { QueryClient } from '@tanstack/react-query';

/**
 * Configuração do React Query para cache e atualização automática
 * - refetchOnWindowFocus: atualiza dados quando o usuário volta à aba
 * - refetchOnReconnect: atualiza quando a conexão é restabelecida
 * - staleTime: considera dados "frescos" por 1 minuto (evita refetch desnecessário)
 * - gcTime: mantém dados em cache por 5 minutos após não serem usados
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minuto - dados considerados frescos
      gcTime: 5 * 60 * 1000, // 5 minutos em cache após desmontar
      refetchOnWindowFocus: true, // Atualiza ao voltar à aba
      refetchOnReconnect: true, // Atualiza ao reconectar internet
      refetchOnMount: true, // Atualiza ao montar o componente
      retry: 2,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 0,
    },
  },
});
