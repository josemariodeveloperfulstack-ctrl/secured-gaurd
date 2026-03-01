import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Bell, MessageSquare, Check, RefreshCw, Filter, X, ArrowLeft, Clock, User, AlertCircle, Info, CheckCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useNotificationBell } from '@/hooks/useNotificationBell';
import MessageItem from '@/components/MessageItem';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import '@/styles/notifications.css';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const hasLoadedRef = useRef(false);
  const dragControls = useDragControls();

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

  // Find the active message for detail view
  const activeMessage = useMemo(() =>
    systemMessages.find(msg => msg.id === activeMessageId),
    [systemMessages, activeMessageId]
  );

  // Carregar mensagens quando abrir o dropdown (apenas uma vez)
  useEffect(() => {
    if (isOpen && systemMessages.length === 0 && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadMessages();
    }
    if (!isOpen) {
      hasLoadedRef.current = false;
      setActiveMessageId(null); // Reset detail view when closing
    }
  }, [isOpen, systemMessages.length, loadMessages]);

  // Animação do sino quando há notificações não lidas
  useEffect(() => {
    if (unreadCount > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await loadMessages();
  };

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleSelectMessage = (messageId: string) => {
    setActiveMessageId(messageId);
    markAsRead(messageId);
  };

  const handleBack = () => {
    setActiveMessageId(null);
  };

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Don't close if clicking inside the modal or the bell button
      if (!target.closest('.notification-popover-container') && !target.closest('.bell-trigger-button')) {
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
        className={cn(
          "relative h-10 w-10 p-0 hover:bg-seguranca-graphite/50 text-seguranca-lightgray transition-all duration-200 bell-trigger-button",
          isAnimating && "animate-pulse"
        )}
      >
        <Bell className={cn("h-5 w-5 transition-transform duration-200", isAnimating && "animate-bounce")} />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-gradient-to-r from-red-500 to-red-600 shadow-lg animate-pulse"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for Desktop/Tablet */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[10045] lg:block hidden"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              drag={window.innerWidth > 1024} // Only draggable on desktop
              dragControls={dragControls}
              dragListener={false} // Disable default drag listener to use header only
              dragMomentum={false}
              dragElastic={0.1}
              initial={window.innerWidth > 1024
                ? { opacity: 0, scale: 0.9, x: '-50%', y: '-50%', top: '50%', left: '50%' }
                : { opacity: 0, y: 20 }
              }
              animate={window.innerWidth > 1024
                ? { opacity: 1, scale: 1, x: '-50%', y: '-50%', top: '50%', left: '50%' }
                : { opacity: 1, y: 0 }
              }
              exit={window.innerWidth > 1024
                ? { opacity: 0, scale: 0.9, x: '-50%', y: '-50%', top: '50%', left: '50%' }
                : { opacity: 0, y: 20 }
              }
              className={cn(
                "z-[10050] bg-seguranca-black/95 border border-gray-700 text-seguranca-lightgray shadow-2xl backdrop-blur-md overflow-hidden flex flex-col items-stretch",
                // Responsive positioning
                "fixed inset-x-4 top-20 rounded-xl", // Mobile
                "sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[420px] sm:rounded-xl", // Tablet
                "lg:fixed lg:top-1/2 lg:left-1/2 lg:w-[480px] lg:h-[600px] lg:rounded-2xl lg:border-t-2 lg:border-seguranca-yellow", // Desktop
                "max-h-[80vh] lg:max-h-[700px]"
              )}
              style={window.innerWidth > 1024 ? { position: 'fixed', transform: 'translate(-50%, -50%)' } : {}}
            >
              {/* Header - The Drag Handle */}
              <div
                className="p-4 border-b border-gray-800 bg-seguranca-black cursor-grab active:cursor-grabbing flex-none select-none"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <div className="flex items-center justify-between">
                  {activeMessageId ? (
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBack}
                        className="p-1 h-8 w-8 text-gray-400 hover:text-seguranca-yellow hover:bg-white/5"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <h3 className="font-bold text-seguranca-lightgray truncate max-w-[250px]">
                        Detalhes da Mensagem
                      </h3>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-seguranca-yellow/10">
                        <MessageSquare className="h-5 w-5 text-seguranca-yellow" />
                      </div>
                      <div>
                        <h3 className="font-bold text-seguranca-lightgray tracking-tight">CENTRO DE NOTIFICAÇÕES</h3>
                        <p className="text-[10px] text-gray-500 font-mono">PROMOVER VIGILÂNCIA PATRIMONIAL</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    {!activeMessageId && unreadCount > 0 && (
                      <Badge className="bg-seguranca-yellow text-seguranca-black text-[10px] font-bold px-1.5 h-4 min-w-[16px] justify-center mr-2">
                        {unreadCount}
                      </Badge>
                    )}

                    {!activeMessageId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="h-8 w-8 p-0 text-gray-500 hover:text-seguranca-yellow hover:bg-white/5"
                      >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                      </Button>
                    )}

                    {!activeMessageId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        disabled={isLoading || unreadCount === 0}
                        className="h-8 px-2 text-[10px] font-bold text-gray-500 hover:text-seguranca-yellow hover:bg-white/5 uppercase"
                      >
                        LIMPAR
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                      className="h-8 w-8 p-0 text-gray-500 hover:text-red-500 hover:bg-red-500/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Body Content */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <AnimatePresence mode="wait">
                  {activeMessageId && activeMessage ? (
                    <motion.div
                      key="detail"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-6 overflow-y-auto"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <Badge className={cn(
                          "uppercase text-[10px] font-bold px-2 py-0.5",
                          activeMessage.priority === 'HIGH' ? "bg-red-500/20 text-red-500 border border-red-500/30" :
                            activeMessage.priority === 'MEDIUM' ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30" :
                              "bg-green-500/20 text-green-500 border border-green-500/30"
                        )}>
                          {activeMessage.priority}
                        </Badge>
                        <span className="text-[10px] text-gray-500 font-mono">ID: {activeMessage.id.substring(0, 8)}</span>
                      </div>

                      <h2 className="text-xl font-bold text-seguranca-lightgray mb-6 leading-tight">
                        {activeMessage.title}
                      </h2>

                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="p-3 bg-white/5 border border-gray-800 rounded">
                          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Remetente</p>
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-seguranca-yellow" />
                            <span className="text-sm font-medium">{activeMessage.sender.name}</span>
                          </div>
                        </div>
                        <div className="p-3 bg-white/5 border border-gray-800 rounded">
                          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Data/Hora</p>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-seguranca-yellow" />
                            <span className="text-sm font-medium">{formatDate(activeMessage.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="prose prose-invert max-w-none">
                        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                          {activeMessage.content}
                        </p>
                      </div>

                      {activeMessage.readAt && (
                        <div className="mt-8 pt-4 border-t border-gray-800 flex items-center gap-2 text-[10px] text-green-500 font-bold uppercase">
                          <CheckCircle className="h-3 w-3" />
                          Lido em {formatDate(activeMessage.readAt)}
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex-1 flex flex-col overflow-hidden"
                    >
                      <div className="p-2 border-b border-gray-800/50 bg-white/5 flex items-center justify-between">
                        <div className="flex gap-1 overflow-x-auto no-scrollbar py-1">
                          <Badge className="bg-seguranca-yellow text-seguranca-black text-[9px] font-black cursor-pointer">TODAS</Badge>
                          <Badge variant="outline" className="text-gray-500 border-gray-800 text-[9px] font-black cursor-pointer hover:text-seguranca-yellow">URGENTES</Badge>
                          <Badge variant="outline" className="text-gray-500 border-gray-800 text-[9px] font-black cursor-pointer hover:text-seguranca-yellow">OUTROS</Badge>
                        </div>
                        <Filter className="h-3 w-3 text-gray-600 mr-2" />
                      </div>

                      <div className="overflow-y-auto flex-1 custom-scrollbar">
                        {isLoading ? (
                          <div className="flex flex-col items-center justify-center p-12 h-64">
                            <RefreshCw className="h-8 w-8 animate-spin text-seguranca-yellow mb-4" />
                            <p className="text-[10px] font-mono text-gray-500">SYNCING WITH DATABASE...</p>
                          </div>
                        ) : systemMessages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-12 text-gray-400 h-64 text-center">
                            <div className="p-4 rounded-full bg-white/5 mb-4">
                              <MessageSquare className="h-12 w-12 text-gray-700" />
                            </div>
                            <p className="font-bold text-seguranca-lightgray uppercase tracking-widest text-xs mb-1">Silêncio no Rádio</p>
                            <p className="text-[10px] text-gray-600 font-mono">Nenhuma notificação recebida até o momento.</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-800/50">
                            {systemMessages.map((message) => (
                              <div
                                key={message.id}
                                className={cn(
                                  "group p-4 hover:bg-white/5 transition-all cursor-pointer relative overflow-hidden",
                                  message.status === 'UNREAD' && "border-l-2 border-seguranca-yellow bg-seguranca-yellow/5"
                                )}
                                onClick={() => handleSelectMessage(message.id)}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[10px] font-mono text-gray-500">[{formatDate(message.createdAt)}]</span>
                                      {message.status === 'UNREAD' && (
                                        <Badge className="bg-red-500 text-white text-[8px] h-3 px-1 leading-none font-black">NEW</Badge>
                                      )}
                                    </div>
                                    <h4 className={cn(
                                      "text-sm font-bold truncate transition-colors",
                                      message.status === 'UNREAD' ? "text-seguranca-yellow" : "text-gray-400"
                                    )}>
                                      {message.title}
                                    </h4>
                                    <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5 font-medium italic">
                                      {message.content}
                                    </p>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-gray-700 group-hover:text-seguranca-yellow transition-colors self-center" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-800 bg-seguranca-black flex items-center justify-between flex-none">
                <p className="text-[9px] text-gray-600 font-mono italic">
                  PROMOVER VIGILÂNCIA PATRIMONIAL &copy; 2026
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false);
                    window.location.href = '/mensagens';
                  }}
                  className="h-6 px-3 text-[10px] font-bold text-seguranca-yellow hover:bg-seguranca-yellow/10 uppercase tracking-tighter"
                >
                  Ver Todas
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
