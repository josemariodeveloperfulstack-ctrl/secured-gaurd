/**
 * Utilitário para verificar se um erro é de conexão (backend não disponível)
 */

export interface ConnectionError extends Error {
  isConnectionError: boolean;
  apiUrl?: string;
}

/**
 * Verifica se um erro é de conexão (backend não disponível)
 */
export function isConnectionError(error: any): boolean {
  if (!error) return false;
  
  return (
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ERR_CONNECTION_REFUSED' ||
    error?.code === 'ERR_NETWORK' ||
    error?.code === 'ERR_TOO_MANY_REDIRECTS' ||
    error?.message?.includes('too many redirects') ||
    error?.message?.includes('Network Error') ||
    error?.message?.includes('connection refused') ||
    error?.message?.includes('Failed to fetch') ||
    error?.message?.includes('Backend não está disponível') ||
    error?.message?.includes('servidor está temporariamente indisponível') ||
    error?.isConnectionError === true ||
    error?.is522Error === true
  );
}

/**
 * Erros que podem ser enfileirados para sincronização offline posterior.
 */
export function isRetryableConnectionError(error: unknown): boolean {
  const err = error as {
    response?: { status?: number };
    request?: unknown;
    code?: string;
    message?: string;
    isConnectionError?: boolean;
    is522Error?: boolean;
  };

  if (isConnectionError(err)) {
    return true;
  }

  if (!err?.response && err?.request) {
    return true;
  }

  const status = err.response?.status;
  return status === 502 || status === 503 || status === 504 || status === 522;
}

/**
 * Cria um erro de conexão padronizado
 */
export function createConnectionError(apiUrl?: string): ConnectionError {
  const error = new Error('Backend não está disponível. Verifique se o servidor está rodando.') as ConnectionError;
  error.isConnectionError = true;
  error.apiUrl = apiUrl;
  return error;
}

/**
 * Trata erros de conexão de forma silenciosa (apenas loga warning)
 * Retorna true se o erro foi tratado, false caso contrário
 */
export function handleConnectionErrorSilently(error: any, context?: string): boolean {
  if (isConnectionError(error)) {
    const contextMsg = context ? `[${context}] ` : '';
    console.warn(`⚠️ ${contextMsg}Backend não está disponível. Continuando sem dados.`);
    return true;
  }
  return false;
}
