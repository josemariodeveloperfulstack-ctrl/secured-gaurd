import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useBackendStatusStore } from '@/stores/backendStatusStore';
import { Button } from '@/components/ui/button';

/**
 * Banner global exibido quando o backend retorna 502/503/504 ou está inacessível.
 */
const BackendUnavailableBanner: React.FC = () => {
  const { isUnavailable, message, markAvailable } = useBackendStatusStore();

  if (!isUnavailable) {
    return null;
  }

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-[100] border-b border-amber-500/40 bg-amber-950/95 text-amber-50 shadow-lg backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3 sm:items-center">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400 sm:mt-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-100">Servidor temporariamente indisponível</p>
          <p className="mt-0.5 text-sm text-amber-200/90">
            {message}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-amber-500/50 bg-transparent text-amber-50 hover:bg-amber-900/60 hover:text-white"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Recarregar
          </Button>
          <button
            type="button"
            onClick={() => markAvailable()}
            className="rounded p-1 text-amber-300 hover:bg-amber-900/50 hover:text-white"
            aria-label="Fechar aviso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackendUnavailableBanner;
