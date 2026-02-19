import { useState, useCallback } from 'react';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { SessionTimeoutWarning } from './SessionTimeoutWarning';

/**
 * Componente que gerencia o timeout de sessão e exibe avisos
 * 
 * Configurações:
 * - timeoutMinutes: Tempo de inatividade antes do logout (padrão: 30 minutos)
 * - warningMinutes: Tempo antes do logout para mostrar aviso (padrão: 5 minutos)
 * 
 * Pode ser configurado via variáveis de ambiente:
 * - VITE_SESSION_TIMEOUT_MINUTES: Tempo total de timeout em minutos
 * - VITE_SESSION_WARNING_MINUTES: Tempo de aviso em minutos
 */
export const SessionTimeoutManager: React.FC = () => {
  const [warningSeconds, setWarningSeconds] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  // Obter configurações de timeout (pode vir de variáveis de ambiente)
  const timeoutMinutes = parseInt(
    import.meta.env.VITE_SESSION_TIMEOUT_MINUTES || '30',
    10
  );
  const warningMinutes = parseInt(
    import.meta.env.VITE_SESSION_WARNING_MINUTES || '5',
    10
  );

  const handleWarning = useCallback((remainingSeconds: number) => {
    setWarningSeconds(remainingSeconds);
    setShowWarning(true);
  }, []);

  const handleExtend = useCallback(() => {
    setShowWarning(false);
    setWarningSeconds(null);
    // O hook resetTimer será chamado automaticamente quando houver atividade
  }, []);

  const handleDismiss = useCallback(() => {
    setShowWarning(false);
    setWarningSeconds(null);
  }, []);

  // Usar o hook de timeout de sessão
  useSessionTimeout(timeoutMinutes, warningMinutes, handleWarning);

  return (
    <>
      {showWarning && warningSeconds !== null && (
        <SessionTimeoutWarning
          remainingSeconds={warningSeconds}
          onExtend={handleExtend}
          onDismiss={handleDismiss}
        />
      )}
    </>
  );
};
