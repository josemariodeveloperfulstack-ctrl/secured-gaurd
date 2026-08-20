import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Auto-recuperação para falha de importação dinâmica (Vite dev server restart / perda de conexão)
    if (error && typeof error.message === 'string' &&
        (error.message.includes('Failed to fetch dynamically imported module') ||
         error.message.includes('Importing a module script failed') ||
         error.message.includes('ERR_CONNECTION_CLOSED'))) {
      console.warn('🔄 ErrorBoundary: Detectada falha na importação dinâmica de módulo. Recarregando página...');
      const storageKey = 'vite_dynamic_import_reload';
      const lastReload = sessionStorage.getItem(storageKey);
      const timeNow = Date.now();
      if (!lastReload || timeNow - Number(lastReload) > 10000) {
        sessionStorage.setItem(storageKey, String(timeNow));
        window.location.reload();
        return { hasError: false };
      }
    }

    // Ignorar erros de Suspense síncronos do React Router / React 18
    if (error && typeof error.message === 'string' &&
        error.message.includes('A component suspended while responding to synchronous input')) {
      console.warn('ErrorBoundary: ignorando erro de Suspense síncrono:', error.message);
      return { hasError: false };
    }

    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Mesmo filtro aqui para não poluir o console com esse tipo específico
    if (error && typeof error.message === 'string' &&
        error.message.includes('A component suspended while responding to synchronous input')) {
      console.warn('ErrorBoundary (componentDidCatch): erro de Suspense síncrono ignorado:', error.message);
      return;
    }

    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">
                Ops! Algo deu errado
              </h1>
              <p className="text-gray-600 mb-4">
                Ocorreu um erro inesperado. Por favor, recarregue a página.
              </p>
              {this.state.error && (
                <details className="text-left bg-gray-100 p-4 rounded text-sm">
                  <summary className="cursor-pointer font-medium mb-2">
                    Detalhes do erro
                  </summary>
                  <pre className="text-red-600 overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <button
                onClick={() => window.location.reload()}
                className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Recarregar Página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 