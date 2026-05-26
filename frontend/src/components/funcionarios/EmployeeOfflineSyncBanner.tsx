import React from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmployeeOfflineSyncBannerProps {
  visible: boolean;
  isSyncing: boolean;
  onSyncNow: () => void;
  title?: string;
  description?: string;
}

export const EmployeeOfflineSyncBanner: React.FC<EmployeeOfflineSyncBannerProps> = ({
  visible,
  isSyncing,
  onSyncNow,
  title = 'Cadastro aguardando sincronização',
  description = 'Os dados permanecem na tela e foram salvos neste dispositivo.',
}) => {
  if (!visible) {
    return null;
  }

  return (
    <div className="mx-4 sm:mx-6 mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 sm:p-4 shrink-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <CloudOff className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-200">{title}</p>
            <p className="text-xs text-amber-100/90 mt-1">
              {description}
              {isSyncing
                ? ' Enviando ao servidor...'
                : ' Serão enviados automaticamente quando a conexão voltar.'}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isSyncing || !navigator.onLine}
          onClick={onSyncNow}
          className="border-amber-400/50 text-amber-100 hover:bg-amber-500/20 shrink-0"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          Tentar enviar agora
        </Button>
      </div>
    </div>
  );
};
