import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, MessageSquare, Check, RefreshCw, Settings, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Removido Popover do Radix UI devido a problemas com PopperAnchor
// Usando componente customizado simples
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useNotificationBell } from '@/hooks/useNotificationBell';
import MessageItem from '@/components/MessageItem';
import '@/styles/notifications.css';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const hasLoadedRef = useRef(false);

  const {
    systemMessages,
    unreadCount,
    isLoading,
    loadMessages,
    markAsRead,
    markAllAsRead,
    formatDate,
    getPriorityConfig
  } = useNotificationBell();

  // Carregar mensagens quando abrir o dropdown (apenas uma vez)
  useEffect(() => {
    if (isOpen && systemMessages.length === 0 && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadMessages();
    }
    if (!isOpen) {
      hasLoadedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, systemMessages.length]); // Removido loadMessages das dependências para evitar loop infinito

  // Animação do sino quando há notificações não lidas
  useEffect(() => {
    if (unreadCount > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  const handleRefresh = async () => {
    await loadMessages();
  };

  // Handler para abrir/fechar o popover
  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Handler para fechar quando clicar fora
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.notification-popover-container')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative notification-popover-container">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        className={`relative h-10 w-10 p-0 hover:bg-seguranca-graphite/50 text-seguranca-lightgray transition-all duration-200 ${isAnimating ? 'animate-pulse' : ''
          }`}
      >
        <Bell className={`h-5 w-5 transition-transform duration-200 ${isAnimating ? 'animate-bounce' : ''}`} />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-gradient-to-r from-red-500 to-red-600 shadow-lg animate-pulse"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop para Desktop (Drawer) */}
          <div
            className="hidden lg:block fixed inset-0 bg-black/60 backdrop-blur-sm z-[10045] transition-opacity duration-300 animate-in fade-in"
            onClick={() => setIsOpen(false)}
          />

          <div
            className={cn(
              "z-[10050] bg-gradient-to-br from-seguranca-graphite to-seguranca-black border-gray-600 text-seguranca-lightgray shadow-2xl backdrop-blur-sm overflow-hidden flex flex-col",
              // Mobile (Fixed/Centered)
              "fixed inset-x-4 top-20 border rounded-lg",
              // Tablet (Dropdown)
              "sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[450px] sm:rounded-lg",
              // Desktop (Drawer - Lateral Direito)
              "lg:fixed lg:inset-y-0 lg:right-0 lg:left-auto lg:top-0 lg:mt-0 lg:w-[500px] lg:h-full lg:rounded-l-2xl lg:rounded-r-none lg:border-l lg:border-y-0 lg:border-r-0 lg:shadow-[0_0_50px_rgba(0,0,0,0.5)]",
              // Altura
              "max-h-[80vh] sm:max-h-[600px] lg:max-h-screen",
              // Animação
              "animate-slide-in-top lg:animate-slide-in-right"
            )}
          >
            {/* Header com gradiente */}
            <div className="relative p-4 border-b border-gray-600 bg-gradient-to-r from-seguranca-graphite to-seguranca-black flex-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-seguranca-yellow/10">
                    <MessageSquare className="h-5 w-5 text-seguranca-yellow" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-seguranca-lightgray text-lg">Mensagens</h3>
                    {unreadCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs px-2 py-1 mt-1 animate-pulse"
                      >
                        {unreadCount} não lidas
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="text-gray-400 hover:bg-seguranca-black/50 hover:text-seguranca-yellow transition-colors duration-200"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:bg-seguranca-black/50 hover:text-seguranca-yellow transition-colors duration-200"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    disabled={isLoading || unreadCount === 0}
                    className={cn(
                      "transition-colors duration-200",
                      unreadCount > 0 ? "text-seguranca-yellow hover:bg-seguranca-black/50" : "text-gray-600 cursor-not-allowed"
                    )}
                    title="Marcar todas como lidas"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Limpar</span>
                  </Button>

                  {/* Botão de Fechar para Mobile */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="sm:hidden text-gray-400 hover:bg-seguranca-black/50 transition-colors duration-200"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Lista de Mensagens */}
            <div className="overflow-y-auto flex-1 max-h-[400px] sm:max-h-[600px] lg:max-h-full">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center p-12 h-full">
                  <div className="relative">
                    <RefreshCw className="h-8 w-8 animate-spin text-seguranca-yellow" />
                    <div className="absolute inset-0 rounded-full border-2 border-seguranca-yellow/20"></div>
                  </div>
                  <div className="text-gray-400 mt-4 text-sm">Carregando mensagens...</div>
                </div>
              ) : systemMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-gray-400 h-full">
                  <div className="p-4 rounded-full bg-gray-600/20 mb-4">
                    <MessageSquare className="h-12 w-12 text-gray-500" />
                  </div>
                  <p className="text-center text-lg font-medium mb-2">Nenhuma mensagem encontrada</p>
                  <p className="text-center text-sm mb-4">Você está em dia com suas notificações!</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    className="text-seguranca-yellow hover:bg-seguranca-black/50 transition-colors duration-200"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recarregar
                  </Button>
                </div>
              ) : (
                <div className="p-3 space-y-3">
                  {systemMessages.map((message, index) => (
                    <div key={message.id} className="notification-item animate-slide-in-top">
                      <MessageItem
                        message={message}
                        onMarkAsRead={markAsRead}
                        formatDate={formatDate}
                        getPriorityConfig={getPriorityConfig}
                        isCompact={true}
                      />
                      {index < systemMessages.length - 1 && (
                        <Separator className="my-3 bg-gradient-to-r from-transparent via-gray-600 to-transparent" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer com gradiente */}
            {systemMessages.length > 0 && (
              <div className="p-4 border-t border-gray-600 bg-gradient-to-r from-seguranca-graphite to-seguranca-black flex-none">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false);
                    // Aqui você pode navegar para a página completa de mensagens
                    window.location.href = '/mensagens';
                  }}
                  className="w-full text-seguranca-yellow hover:bg-seguranca-black/50 transition-colors duration-200 font-medium"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Ver todas as mensagens
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
