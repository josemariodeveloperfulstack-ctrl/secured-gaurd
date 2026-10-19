import React, { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

/**
 * Componente que detecta quando uma nova versão do app está disponível
 * (PWA / Service Worker) e exibe um toast para o usuário atualizar.
 * Evita necessidade de pressionar F5 ou Ctrl+Shift+R manualmente.
 * Em produção (incl. CI) o Service Worker é registrado e o cache/atualização funcionam.
 */
export const AppUpdateNotifier: React.FC = () => {
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const registerPWA = async () => {
      try {
        const { registerSW } = await import('virtual:pwa-register');
        const updater = registerSW({
          immediate: true,
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
          onRegistered(registration) {
            if (import.meta.env.DEV) return;
            if (registration?.update) {
              setInterval(() => {
                registration.update().catch((err: unknown) => {
                  console.debug('[PWA] Falha silenciosa ao verificar atualização do SW:', err);
                });
              }, 60 * 60 * 1000);
            }
          },
          onRegisterError(error) {
            console.warn('[PWA] Erro ao registrar Service Worker:', error);
          },
        });
      } catch (err) {
        if (import.meta.env.DEV) {
          console.debug('[PWA] registerSW não disponível em dev');
        } else {
          console.warn('[PWA] Falha ao carregar módulo do Service Worker:', err);
        }
      }
    };

    registerPWA();
  }, [toast]);

  return null;
};
