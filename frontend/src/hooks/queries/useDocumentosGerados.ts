import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  documentoGeradoService,
  type DocumentoGerado,
} from '@/services/documentoGeradoService';
import { queryKeys } from './queryKeys';

/**
 * Lista documentos gerados (templates fixos + dinâmicos) de um funcionário.
 * Usado no card "Documentos Gerados pelo Sistema" dentro do edit form do RH.
 */
export function useDocumentosGeradosByEmployee(
  employeeId: string | undefined | null,
  options?: { enabled?: boolean },
) {
  return useQuery<DocumentoGerado[]>({
    queryKey: employeeId
      ? queryKeys.documentosGerados.byEmployee(employeeId)
      : ['documentosGerados', 'byEmployee', 'disabled'],
    queryFn: () => documentoGeradoService.listarPorFuncionario(employeeId ?? ''),
    enabled: Boolean(employeeId) && (options?.enabled ?? true),
    staleTime: 30 * 1000,
  });
}

/**
 * Lista os documentos do usuário autenticado (Dashboard do Colaborador).
 */
export function useMeusDocumentos(options?: { enabled?: boolean }) {
  return useQuery<DocumentoGerado[]>({
    queryKey: queryKeys.documentosGerados.meus(),
    queryFn: () => documentoGeradoService.listarMeus(),
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
  });
}

/**
 * Helper de invalidação após gerar/excluir um documento.
 * Use após o `mutate` de geração de PDF para refrescar a lista.
 */
export function useInvalidateDocumentosGerados() {
  const queryClient = useQueryClient();
  return (employeeId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.documentosGerados.all });
    if (employeeId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.documentosGerados.byEmployee(employeeId),
      });
    }
  };
}
