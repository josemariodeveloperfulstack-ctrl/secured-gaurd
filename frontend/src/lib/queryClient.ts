import { QueryClient } from '@tanstack/react-query';

/**
 * Configuração do React Query — Estratégia de cache balanceada
 *
 * - staleTime: 60s → dados são considerados "frescos" por 1 minuto.
 *   Evita refetch agressivo a cada mount/abertura de tela.
 * - gcTime: 5 minutos → mantém dados em cache em memória após o
 *   componente desmontar, permitindo voltas rápidas para listas já
 *   visitadas.
 * - refetchOnWindowFocus: false → não fazer refetch toda vez que o
 *   usuário volta para a aba; esse comportamento causava cargas
 *   redundantes e a sensação de "página recarregando".
 * - refetchOnMount: true → ao montar um componente que usa a query,
 *   se os dados estiverem stale, busca em background (mantém UX rápida).
 * - refetchOnReconnect: true → reconexão de internet sempre dispara
 *   reload em background.
 *
 * Para queries críticas que precisam ser sempre frescas (ex.: lista de
 * funcionários após edição), use `invalidateQueries` na mutação para
 * forçar o refetch.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutos — menos refetch ao trocar de tela
      gcTime: 10 * 60 * 1000, // 10 minutos em cache após desmontar
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false, // Usa cache se ainda fresco; invalide após salvar
      retry: 2,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 0,
    },
  },
});
