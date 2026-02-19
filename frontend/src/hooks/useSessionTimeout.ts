import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para gerenciar timeout de sessão por inatividade
 * 
 * @param timeoutMinutes - Tempo de inatividade em minutos antes de fazer logout (padrão: 30 minutos)
 * @param warningMinutes - Tempo antes do logout para mostrar aviso (padrão: 5 minutos)
 * @param onWarning - Callback chamado quando o aviso deve ser exibido
 */
export const useSessionTimeout = (
  timeoutMinutes: number = 30,
  warningMinutes: number = 5,
  onWarning?: (remainingSeconds: number) => void
) => {
  const { logout, isAuthenticated } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);

  // Limpar timeouts quando o componente desmontar ou quando não estiver autenticado
  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    warningShownRef.current = false;
  }, []);

  // Resetar o timer de inatividade
  const resetTimer = useCallback(() => {
    if (!isAuthenticated) {
      clearTimeouts();
      return;
    }

    clearTimeouts();
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;

    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = warningMinutes * 60 * 1000;
    const warningTime = timeoutMs - warningMs;

    // Timer para mostrar aviso
    if (warningTime > 0 && onWarning) {
      warningTimeoutRef.current = setTimeout(() => {
        const remainingSeconds = Math.floor(warningMs / 1000);
        warningShownRef.current = true;
        onWarning(remainingSeconds);
      }, warningTime);
    }

    // Timer para logout automático
    timeoutRef.current = setTimeout(() => {
      console.log('⏰ Timeout de sessão atingido. Fazendo logout automático...');
      logout();
    }, timeoutMs);
  }, [isAuthenticated, timeoutMinutes, warningMinutes, onWarning, logout, clearTimeouts]);

  // Detectar atividade do usuário
  useEffect(() => {
    if (!isAuthenticated) {
      clearTimeouts();
      return;
    }

    // Eventos que indicam atividade do usuário
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown',
    ];

    const handleActivity = () => {
      // Resetar timer apenas se já passou pelo menos 1 segundo desde a última atividade
      // (evita resetar muito frequentemente)
      const now = Date.now();
      if (now - lastActivityRef.current > 1000) {
        resetTimer();
      }
    };

    // Adicionar listeners para eventos de atividade
    activityEvents.forEach((event) => {
      globalThis.addEventListener(event, handleActivity, { passive: true });
    });

    // Iniciar o timer quando o componente montar ou quando autenticar
    resetTimer();

    // Cleanup
    return () => {
      activityEvents.forEach((event) => {
        globalThis.removeEventListener(event, handleActivity);
      });
      clearTimeouts();
    };
  }, [isAuthenticated, resetTimer, clearTimeouts]);

  // Limpar timeouts quando desautenticar
  useEffect(() => {
    if (!isAuthenticated) {
      clearTimeouts();
    }
  }, [isAuthenticated, clearTimeouts]);

  return {
    resetTimer,
    clearTimeouts,
  };
};
