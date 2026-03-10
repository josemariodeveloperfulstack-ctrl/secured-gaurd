import React, { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

/**
 * Componente que detecta quando uma nova versão do app está disponível
 * (PWA / Service Worker) e exibe um toast para o usuário atualizar.
 * Evita necessidade de pressionar F5 ou Ctrl+Shift+R manualmente.
 */
export const AppUpdateNotifier: React.FC = () => {
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const registerPWA = async () => {
      try {
        const { registerSW } = await import('virtual:pwa-register');
        const updater = registerSW({
          onNeedRefresh() {
            toast({
              title: 'Nova versão disponível',
              description: 'Uma atualização do sistema está disponível. Clique em "Atualizar" para aplicar as mudanças.',
              duration: 60000,
              variant: 'default',
              action: (
                <ToastAction
                  altText="Atualizar agora"
                  onClick={() => updater(true)}
                >
                  Atualizar
                </ToastAction>
              ),
            });
          },
          onOfflineReady() {
            toast({
              title: 'Pronto para uso offline',
              description: 'O aplicativo pode ser usado sem conexão.',
              duration: 3000,
            });
          },
        });
      } catch {
        if (import.meta.env.DEV) {
          console.debug('[PWA] registerSW não disponível em dev');
        }
      }
    };

    registerPWA();
  }, [toast]);

  return null;
};
