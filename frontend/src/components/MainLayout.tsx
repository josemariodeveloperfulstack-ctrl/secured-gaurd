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
import { useMessageStore } from '@/stores/messageStore';
import { FloatingChat } from './FloatingChat';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  noPadding?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  title,
  subtitle,
  noPadding = false
}) => {
  const { user, logout } = useAuth();
  const { collapsed, isMobile, toggleSidebar } = useSidebar();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const navigate = useNavigate();

  const { 
    latestIncomingChatMessage, 
    setLatestIncomingChatMessage, 
    setIsFloatingChatOpen, 
    setSelectedConversation, 
    conversations 
  } = useMessageStore();

  const handleHeaderAlertClick = () => {
    if (!latestIncomingChatMessage) return;

    let convType: 'individual' | 'group' | 'department' = 'individual';
    let convId = latestIncomingChatMessage.sender.id;
    let convName = latestIncomingChatMessage.sender.name;

    if (latestIncomingChatMessage.group?.id) {
      convType = 'group';
      convId = latestIncomingChatMessage.group.id;
      convName = latestIncomingChatMessage.group.name;
    } else if (latestIncomingChatMessage.department?.id) {
      convType = 'department';
      convId = latestIncomingChatMessage.department.id;
      convName = latestIncomingChatMessage.department.name;
    }

    const existingConv = conversations.find(c => c.id === convId && c.type === convType);
    
    if (existingConv) {
      setSelectedConversation(existingConv);
    } else {
      setSelectedConversation({
        id: convId,
        name: convName,
        type: convType,
        unreadCount: 0,
        isOnline: latestIncomingChatMessage.sender.isOnline || false
      });
    }

    setIsFloatingChatOpen(true);
    setLatestIncomingChatMessage(null);
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

            {/* Lado direito - Informações do usuário */}
            <div className="flex items-center space-x-2 md:space-x-4">
              {latestIncomingChatMessage && (
                <button
                  onClick={handleHeaderAlertClick}
                  className="flex items-center space-x-1.5 bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/30 text-seguranca-yellow px-2.5 py-1 rounded-full text-xs font-semibold animate-pulse shadow-md transition-all duration-300 transform hover:scale-105 shrink-0"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-seguranca-yellow animate-bounce" />
                  <span className="hidden sm:inline">Novo chat de:</span>
                  <span className="font-extrabold truncate max-w-[80px] sm:max-w-[120px]">{latestIncomingChatMessage.sender.name}</span>
                </button>
              )}

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

          {/* Título da página (se fornecido) */}
          {!noPadding && (title || subtitle) && (
            <div className="mb-6">
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