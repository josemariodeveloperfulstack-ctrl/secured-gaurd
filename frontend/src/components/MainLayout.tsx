import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LogOut,
  User,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { getRoleDisplayName, getRoleColor } from '@/utils/permissions';
import { CollapsibleSidebar } from './CollapsibleSidebar';
import { useSidebar } from '@/hooks/useSidebar';
import { Breadcrumb } from './Breadcrumb';
import { NotificationBell } from './NotificationBell';
import UserProfileModal from './UserProfileModal';
import Logo from './Logo';
import { MobileNavbar } from './MobileNavbar';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  title,
  subtitle
}) => {
  const { user, logout } = useAuth();
  const { collapsed, isMobile, toggleSidebar } = useSidebar();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-visible">
          {/* Breadcrumb */}
          <Breadcrumb />

          {/* Título da página (se fornecido) */}
          {(title || subtitle) && (
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
          <div className="bg-seguranca-black rounded-lg border border-gray-700 p-2 sm:p-4 md:p-6 w-full overflow-x-auto overflow-y-visible">
            <div className="min-w-0 w-full">
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
    </div>
  );
}; 