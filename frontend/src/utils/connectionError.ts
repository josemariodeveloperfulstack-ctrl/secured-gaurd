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
    error?.message?.includes('Network Error') ||
    error?.message?.includes('connection refused') ||
    error?.message?.includes('Failed to fetch') ||
    error?.message?.includes('Backend não está disponível') ||
    error?.isConnectionError === true
  );
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

