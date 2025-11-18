import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserPermissions } from '@/types/user';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: (keyof UserPermissions)[];
  requireAllPermissions?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions,
  requireAllPermissions = true,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-seguranca-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-seguranca-yellow" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const userPermissions = user.permissions;

    if (!userPermissions) {
      return <Navigate to="/dashboard" replace />;
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
