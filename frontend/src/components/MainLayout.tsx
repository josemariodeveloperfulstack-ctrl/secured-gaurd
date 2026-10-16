import React, { useState } from 'react';
import { usePagePrefetch } from '@/hooks/usePagePrefetch';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LogOut,
  User,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  MessageCircle
} from 'lucide-react';
import { getRoleDisplayName, getRoleColor } from '@/utils/permissions';
import { CollapsibleSidebar } from './CollapsibleSidebar';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '@/hooks/useSidebar';
import { Breadcrumb } from './Breadcrumb';
import { NotificationBell } from './NotificationBell';
import UserProfileModal from './UserProfileModal';
import Logo from './Logo';
import { MobileNavbar } from './MobileNavbar';
import { resolveConversationFromMessage, useMessageStore } from '@/stores/messageStore';
import { FloatingChat } from './FloatingChat';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: string;
  headerActions?: React.ReactNode;
  noPadding?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  title,
  subtitle,
  headerActions,
  noPadding = false
}) => {
  const { user, logout } = useAuth();
  const { collapsed, isMobile, toggleSidebar } = useSidebar();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const navigate = useNavigate();

  const latestIncomingChatMessage = useMessageStore((s) => s.latestIncomingChatMessage);
  const conversations = useMessageStore((s) => s.conversations);
  const dismissChatHeaderAlert = useMessageStore((s) => s.dismissChatHeaderAlert);
  const setIsFloatingChatOpen = useMessageStore((s) => s.setIsFloatingChatOpen);
  const setSelectedConversation = useMessageStore((s) => s.setSelectedConversation);
  const showChatHeaderAlert = Boolean(latestIncomingChatMessage);

  const alertSenderName = latestIncomingChatMessage?.sender?.name || 'Chat';

  const handleHeaderAlertClick = () => {
    if (!latestIncomingChatMessage) return;

    const resolved = resolveConversationFromMessage(latestIncomingChatMessage, user?.id);
    if (resolved) {
      const { conversationId, conversationType, conversationName } = resolved;
      const existingConv = conversations.find(
        (c) => c.id === conversationId && c.type === conversationType
      );
      setSelectedConversation(
        existingConv ?? {
          id: conversationId,
          name: conversationName,
          type: conversationType,
          unreadCount: 0,
          isOnline: latestIncomingChatMessage.sender?.isOnline || false,
        }
      );
    }

    setIsFloatingChatOpen(true);
    dismissChatHeaderAlert();
  };

  // Start prefetching all page chunks in the background as soon as the
  // authenticated layout mounts — this makes sidebar navigation instant.
  usePagePrefetch();

  const handleProfileClick = () => {
    setIsProfileModalOpen(true);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Usuário não encontrado</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-seguranca-graphite">
      {/* Sidebar colapsível */}
      <CollapsibleSidebar
        collapsed={collapsed}
        isMobile={isMobile}
        onToggle={toggleSidebar}
      />

      {/* Conteúdo principal */}
      <div className={`flex-1 flex flex-col transition-all duration-300 min-w-0 ${isMobile ? 'ml-0' : (collapsed ? 'ml-16' : 'ml-64')
        }`}>
        {/* Header com botão de toggle */}
        <header className="bg-seguranca-black shadow-lg border-b border-gray-700 sticky top-0 z-40">
          <div className="flex items-center justify-between px-2 md:px-4 py-2 md:py-3">
            {/* Lado esquerdo - Botão toggle e título */}
            <div className="flex items-center space-x-2 md:space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="text-seguranca-lightgray hover:text-seguranca-yellow hover:bg-seguranca-graphite p-1 md:p-2"
              >
                {isMobile ? (
                  <Menu className="h-5 w-5" />
                ) : collapsed ? (
                  <ChevronRight className="h-5 w-5" />
                ) : (
                  <ChevronLeft className="h-5 w-5" />
                )}
              </Button>

              <div className="flex items-center">
                <Logo size="md" />
              </div>
            </div>

            {/* Centro - alerta de chat interno */}
            <div className="flex-1 flex justify-center px-2 min-w-0">
              {showChatHeaderAlert && (
                <button
                  type="button"
                  onClick={handleHeaderAlertClick}
                  className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/30 text-seguranca-yellow px-2.5 py-1 rounded-full text-xs font-semibold animate-pulse shadow-md transition-all duration-300 transform hover:scale-105 max-w-full"
                  title="Abrir chat interno"
                >
                  <MessageCircle className="h-3.5 w-3.5 shrink-0 text-seguranca-yellow animate-bounce" />
                  <span className="hidden sm:inline shrink-0">Mensagem no chat:</span>
                  <span className="font-extrabold truncate max-w-[100px] sm:max-w-[160px]">
                    {alertSenderName}
                  </span>
                </button>
              )}
            </div>

            {/* Lado direito - Informações do usuário */}
            <div className="flex items-center space-x-2 md:space-x-4 shrink-0">
              <div
                className="flex items-center space-x-1 md:space-x-2 cursor-pointer hover:bg-seguranca-black p-1 md:p-2 rounded-lg transition-colors"
                onClick={handleProfileClick}
              >
                <User className="h-4 w-4 text-seguranca-lightgray" />
                <span className="text-seguranca-lightgray text-sm hidden md:block hover:text-seguranca-yellow transition-colors">
                  {user.name}
                </span>
                <Badge className={`${getRoleColor(user.role)} text-xs hidden sm:flex`}>
                  {getRoleDisplayName(user.role)}
                  {user.role === 'SUPER_ADMIN' && ' 🟥'}
                </Badge>
              </div>

              {/* Ícone de Notificações */}
              <NotificationBell />

              {/* Ícone de Agendamento */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/webmail')}
                title="Agendamento & E-mails"
                className="relative text-seguranca-lightgray hover:text-seguranca-yellow hover:bg-seguranca-graphite p-1 md:p-2"
              >
                <CalendarClock className="h-5 w-5" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="flex items-center space-x-1 md:space-x-2 border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow p-1 md:p-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:block text-xs md:text-sm">Sair</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Conteúdo da página */}
        <main className={`flex-1 ${noPadding ? 'p-0' : 'p-4 md:p-6'} pb-20 md:pb-6 overflow-visible flex flex-col`}>
          {/* Breadcrumb */}
          {!noPadding && <Breadcrumb />}

          {/* Título da página (se fornecido) e ações do topo */}
          {!noPadding && (title || subtitle || headerActions) && (
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                {title && (
                  <h1 className="text-2xl md:text-3xl font-bold text-seguranca-lightgray mb-2">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-seguranca-lightgray text-sm md:text-base">
                    {subtitle}
                  </p>
                )}
              </div>
              {headerActions && (
                <div className="flex items-center flex-wrap gap-2 shrink-0">
                  {headerActions}
                </div>
              )}
            </div>
          )}

          {/* Conteúdo principal */}
          <div className={`flex-1 ${noPadding ? '' : 'bg-seguranca-black rounded-lg border border-gray-700 p-2 sm:p-4 md:p-6 shadow-xl'} w-full overflow-hidden flex flex-col`}>
            <div className="min-w-0 w-full h-full flex flex-col">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Modal de Perfil */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Navegação Mobile (Bottom) */}
      <MobileNavbar />

      {/* Janela de Chat Flutuante */}
      <FloatingChat />
    </div>
  );
}; 