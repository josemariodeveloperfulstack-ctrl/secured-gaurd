import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserPermissions, UserRole } from '@/types/user';
import { hasFullSystemAccess } from '@/utils/permissions';
import { isDebugMode } from '@/config/environment';

const debugLog = (...args: unknown[]) => {
  if (isDebugMode()) console.log(...args);
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: (keyof UserPermissions)[];
  requiredRoles?: UserRole[]; // Permite acesso se usuário tiver qualquer um dos roles
  excludedRoles?: UserRole[]; // Bloqueia roles específicos mesmo que tenham as permissões (ex.: SUPERVISOR fora do Financeiro/Comercial)
  requireAllPermissions?: boolean;
  allowWithoutFirstAccess?: boolean; // Permite acesso mesmo sem completar primeiro acesso (para a própria página de primeiro acesso)
}

const normalizeRole = (role: string | undefined): UserRole =>
  ((role ?? '').replace(/^ROLE_/, '')) as UserRole;

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions,
  requiredRoles,
  excludedRoles,
  requireAllPermissions = true,
  allowWithoutFirstAccess = false,
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-seguranca-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-seguranca-yellow" />
      </div>
    );
  }

  if (!user) {
    debugLog('🔒 ProtectedRoute: Usuário não autenticado, redirecionando para login');
    debugLog('🔒 ProtectedRoute: isLoading =', isLoading);
    return <Navigate to="/login" replace />;
  }

  debugLog('🔒 ProtectedRoute: Usuário autenticado:', user.name, 'Role:', user.role);

  // Verificar se o usuário precisa completar o primeiro acesso
  // Exceto se estiver na própria página de primeiro acesso ou se allowWithoutFirstAccess for true
  if (!allowWithoutFirstAccess && !user.firstAccessCompleted) {
    // Permitir acesso apenas às páginas de primeiro acesso
    const firstAccessPaths = ['/first-access/change-password', '/first-access/activate-2fa'];
    if (!firstAccessPaths.includes(location.pathname)) {
      debugLog('🔒 ProtectedRoute: Usuário precisa completar primeiro acesso, redirecionando...');
      return <Navigate to="/first-access/change-password" replace />;
    }
  }

  const currentRole = normalizeRole(user.role);

  // 🔒 Bloqueio explícito por role (avaliado ANTES de qualquer outra verificação positiva)
  // Caso de uso: SUPERVISOR não pode acessar Financeiro / Comercial mesmo que alguma
  // permissão antiga ainda esteja marcada como true em sessões cacheadas.
  if (excludedRoles && excludedRoles.length > 0) {
    const isBlocked = excludedRoles.some(
      (r) => currentRole === r || currentRole === normalizeRole(r as string),
    );
    if (isBlocked) {
      debugLog(`🔒 ProtectedRoute: Role ${currentRole} está explicitamente bloqueado nesta rota`);
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Verificar roles alternativos (ex: COMERCIAL para CRM)
  if (requiredRoles && requiredRoles.length > 0) {
    if (hasFullSystemAccess(currentRole) || user.permissions?.ALL_PERMISSIONS) {
      return <>{children}</>;
    }
    const hasRole = requiredRoles.some(
      (r) => currentRole === r || currentRole === normalizeRole(r as string),
    );
    if (hasRole) {
      return <>{children}</>;
    }
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const userPermissions = user.permissions;

    if (!userPermissions) {
      return <Navigate to="/dashboard" replace />;
    }

    if (hasFullSystemAccess(currentRole) || userPermissions.ALL_PERMISSIONS) {
      return <>{children}</>;
    }

    const hasPermissions = requireAllPermissions
      ? requiredPermissions.every((permission) => Boolean(userPermissions[permission]))
      : requiredPermissions.some((permission) => Boolean(userPermissions[permission]));

    if (!hasPermissions) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
