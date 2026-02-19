import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SessionTimeoutWarningProps {
  remainingSeconds: number;
  onExtend: () => void;
  onDismiss?: () => void;
}

/**
 * Componente que exibe um aviso quando a sessão está prestes a expirar
 */
export const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  remainingSeconds,
  onExtend,
  onDismiss,
}) => {
  const { logout } = useAuth();
  const [seconds, setSeconds] = useState(remainingSeconds);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (seconds <= 0) {
      // Tempo esgotado, fazer logout
      logout();
      return;
    }

    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          logout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [seconds, logout]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExtend = () => {
    setIsVisible(false);
    onExtend();
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] max-w-md animate-in slide-in-from-top-5">
      <Alert className="bg-yellow-900/90 border-yellow-600 text-yellow-100 shadow-lg">
        <AlertTriangle className="h-5 w-5 text-yellow-400" />
        <AlertTitle className="text-yellow-200 font-semibold">
          Sessão prestes a expirar
        </AlertTitle>
        <AlertDescription className="mt-2 text-yellow-100">
          <p className="mb-3">
            Você ficou inativo por muito tempo. Sua sessão será encerrada em{' '}
            <span className="font-bold text-yellow-300">{formatTime(seconds)}</span>.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleExtend}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
              size="sm"
            >
              Continuar usando
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
              className="border-yellow-600 text-yellow-200 hover:bg-yellow-800/50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};
