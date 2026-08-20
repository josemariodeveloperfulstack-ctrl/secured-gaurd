import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MessageSquare, Check, RefreshCw, Filter, X, ArrowLeft, Clock, User as UserIcon, AlertCircle, Info, CheckCircle, ChevronRight, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useNotificationBell } from '@/hooks/useNotificationBell';
import MessageItem from '@/components/MessageItem';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import '@/styles/notifications.css';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/types/user';

const COMMERCIAL_LEAD_INBOX_ROLES = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'COMERCIAL',
  'GESTOR_COMERCIAL',
  'ASSISTENTE_COMERCIAL',
]);

function userCanOpenLeadEmailInbox(user: User | null): boolean {
  if (!user) return false;
  if (COMMERCIAL_LEAD_INBOX_ROLES.has(user.role)) return true;
  for (const r of user.roles ?? []) {
    const name = typeof r === 'string' ? r : r?.name;
    if (name && COMMERCIAL_LEAD_INBOX_ROLES.has(name)) return true;
  }
  return false;
}

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showAlertBanner, setShowAlertBanner] = useState(false);
  const hasInitialLoadedRef = useRef(false);
  const dragControls = useDragControls();
  const navigate = useNavigate();
  const { user } = useAuth();
  const showLeadEmailInbox = userCanOpenLeadEmailInbox(user);

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

  // Carregar mensagens automaticamente ao acessar o sistema (na montagem do componente)
  useEffect(() => {
    if (!hasInitialLoadedRef.current && localStorage.getItem('token')) {
      hasInitialLoadedRef.current = true;
      void loadMessages();
    }
  }, [loadMessages]);

  // Exibir banner de alerta chamando a atenção quando houver notificações não lidas ao acessar
  useEffect(() => {
    const hasDismissed = sessionStorage.getItem('dismissed_unread_alert');
    if (unreadCount > 0 && !hasDismissed) {
      setShowAlertBanner(true);
      setIsAnimating(true);
    } else if (unreadCount === 0) {
      setShowAlertBanner(false);
    }
  }, [unreadCount]);

  const handleDismissAlert = () => {
    setShowAlertBanner(false);
    sessionStorage.setItem('dismissed_unread_alert', 'true');
  };

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

  const goToLeadEmailReplies = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(false);
    navigate('/comercial/marketing?caixa=respostas');
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
      {/* Botão do Sino com Animação Glow & Ping */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        title={unreadCount > 0 ? `${unreadCount} notificações/mensagens não lidas` : 'Centro de Notificações'}
        className={cn(
          "relative h-10 w-10 p-0 hover:bg-seguranca-graphite/80 text-seguranca-lightgray transition-all duration-300 bell-trigger-button",
          unreadCount > 0 && "ring-2 ring-seguranca-yellow/60 bg-seguranca-yellow/15 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
        )}
      >
        <Bell className={cn("h-5 w-5 transition-transform duration-300", unreadCount > 0 && "text-seguranca-yellow animate-bounce")} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <Badge
              variant="destructive"
              className="relative h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] font-black bg-gradient-to-r from-red-500 to-red-600 shadow-md text-white border border-white/20"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          </span>
        )}
      </Button>

      {/* Banner Flutuante de Alerta de Notificações Não Lidas (Chama a atenção ao acessar o sistema) */}
      <AnimatePresence>
        {showAlertBanner && unreadCount > 0 && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed top-20 right-4 sm:right-6 z-[10060] max-w-md w-[calc(100vw-2rem)] sm:w-96 bg-seguranca-black/95 border-2 border-seguranca-yellow rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.4)] backdrop-blur-md p-4 text-seguranca-lightgray overflow-hidden"
          >
            {/* Faixa superior brilhante */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-seguranca-yellow via-amber-400 to-red-500 animate-pulse" />

            <div className="flex items-start gap-3">
              <div className="relative flex-shrink-0 mt-0.5">
                <div className="p-2.5 rounded-full bg-seguranca-yellow/20 text-seguranca-yellow animate-bounce">
                  <Bell className="h-6 w-6" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-extrabold text-seguranca-yellow tracking-tight flex items-center gap-1.5">
                    <span>Mensagens & Notificações</span>
                    <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0 font-bold">
                      {unreadCount}
                    </Badge>
                  </h4>
                  <button
                    type="button"
                    onClick={handleDismissAlert}
                    className="text-gray-400 hover:text-white p-1 rounded-md transition-colors"
                    title="Fechar aviso"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-xs text-gray-200 mt-1 leading-relaxed">
                  Olá, <strong className="text-white font-semibold">{user?.name || 'Usuário'}</strong>! Você possui{' '}
                  <strong className="text-seguranca-yellow font-bold">
                    {unreadCount} {unreadCount === 1 ? 'notificação ou mensagem não lida' : 'notificações ou mensagens não lidas'}
                  </strong>{' '}
                  aguardando sua atenção e resposta.
                </p>

                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-800">
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowAlertBanner(false);
                      setIsOpen(true);
                    }}
                    className="h-8 text-xs bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-seguranca-black font-extrabold flex-1 shadow-md"
                  >
                    <Bell className="h-3.5 w-3.5 mr-1" />
                    Visualizar Agora
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowAlertBanner(false);
                      navigate('/gestao-mensagens');
                    }}
                    className="h-8 text-xs border-gray-700 text-gray-200 hover:text-white hover:bg-white/10"
                  >
                    <Mail className="h-3.5 w-3.5 mr-1" />
                    Mensagens
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                            <UserIcon className="h-3 w-3 text-seguranca-yellow" />
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
                          {showLeadEmailInbox && (
                            <Badge
                              variant="outline"
                              className="flex shrink-0 items-center gap-0.5 border-gray-800 text-[9px] font-black text-gray-500 cursor-pointer hover:border-seguranca-yellow/50 hover:text-seguranca-yellow"
                              onClick={goToLeadEmailReplies}
                              title="Gestão de e-mails respondidos pelos leads (Marketing → Campanhas → Respondidos)"
                              role="link"
                            >
                              <Mail className="h-3 w-3" />
                              E-MAILS
                            </Badge>
                          )}
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
