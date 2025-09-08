import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const AuthDebug: React.FC = () => {
  const { user } = useAuth();
  
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');
  const userData = localStorage.getItem('user');

  return (
    <div className="fixed top-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-xs z-50">
      <h3 className="font-bold mb-2">🔍 Debug Auth</h3>
      <div className="space-y-1">
        <div>User: {user ? `${user.name} (${user.role})` : 'null'}</div>
        <div>Token: {token ? '✅' : '❌'}</div>
        <div>Refresh: {refreshToken ? '✅' : '❌'}</div>
        <div>UserData: {userData ? '✅' : '❌'}</div>
        {token && (
          <div className="text-xs text-gray-300 mt-2">
            Token: {token.substring(0, 20)}...
          </div>
        )}
      </div>
    </div>
  );
};
