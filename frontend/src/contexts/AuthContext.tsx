import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/axios';
import { User, AuthContextType, UserGroupData, UserRole } from '@/types/user';
import { generatePermissions, generatePermissionsFromGroups, combinePermissions } from '@/utils/permissions';
import { groupService } from '@/services/groupService';
import { getApiUrl } from '@/config/environment';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Determina a "função efetiva" do usuário com base em roles e grupos
  const determineEffectiveRole = (currentRole: UserRole | undefined, groups: UserGroupData[] | undefined): UserRole => {
    // Se já for um papel forte (não colaborador), mantém
    if (currentRole && currentRole !== 'COLABORADOR') {
      return currentRole;
    }

    if (!groups || groups.length === 0) {
      return currentRole || 'COLABORADOR';
    }

    const groupNames = groups.map((g) => g.groupName);

    // Prioridades por grupo
    if (groupNames.includes('GRUPO_DPE')) {
      return 'DEPARTAMENTO_PESSOAL';
    }
    if (groupNames.includes('GRUPO_RH')) {
      return 'RH';
    }
    if (groupNames.includes('GRUPO_GESTOR')) {
      return 'GESTOR';
    }
    if (groupNames.includes('GRUPO_GESTOR_SUPERVISAO')) {
      return 'GESTAO_SUPERVISAO';
    }

    // Se cair aqui, mantém como colaborador
    return currentRole || 'COLABORADOR';
  };

  // Limpar localStorage corrompido se houver
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token === 'fake-token') {
      console.log('🔍 Limpando token fake do localStorage');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('refreshToken');
    }
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const tokenKey = import.meta.env.VITE_TOKEN_KEY || 'token';
        const userKey = import.meta.env.VITE_USER_KEY || 'user';
        
        const token = localStorage.getItem(tokenKey) || localStorage.getItem('token');
        const savedUser = localStorage.getItem(userKey) || localStorage.getItem('user');

        console.group('🔍 AuthContext: Bootstrapping Session');
        console.log('🔗 Token found:', !!token);
        console.log('👤 Saved user found:', !!savedUser);

        if (token && savedUser) {
          const userData = JSON.parse(savedUser);
          console.log('👤 User data valid:', !!userData.id, userData.name, userData.role);

          // Gerar permissões a partir do role principal
          const rolePermissions = generatePermissions(userData.role);
          const userWithPermissions = {
            ...userData,
            permissions: rolePermissions,
            firstAccessCompleted: userData.firstAccessCompleted ?? false
          };

          setUser(userWithPermissions);
          localStorage.setItem(userKey, JSON.stringify(userWithPermissions));
          setRefreshToken(token);

          console.log('✅ Session restored successfully');

          const roleKey = (userWithPermissions.role ?? '').toUpperCase();
          if (!['COLABORADOR', 'ROLE_COLABORADOR'].includes(roleKey) && userWithPermissions.id) {
            void loadUserGroups(userWithPermissions.id);
          }

          // Verificar se precisa redirecionar para primeiro acesso
          if (!userWithPermissions.firstAccessCompleted) {
            const currentPath = window.location.pathname;
            const firstAccessPaths = ['/first-access/change-password', '/first-access/activate-2fa'];
            if (!firstAccessPaths.includes(currentPath)) {
              console.log('🔒 User needs first-access completion, redirecting...');
              setTimeout(() => navigate('/first-access/change-password', { replace: true }), 100);
            }
          }
        } else {
          console.log('ℹ️ No active session found in localStorage');
        }
        console.groupEnd();
      } catch (error) {
        console.error('❌ [AuthContext] Fatal bootstrap error:', error);
        console.groupEnd();
        if (error instanceof SyntaxError) {
          console.warn('⚠️ [AuthContext] Corrupted data detected, clearing localStorage...');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  // Polling: verifica se o role do usuário foi alterado pelo admin e atualiza sem re-login
  useEffect(() => {
    const POLL_INTERVAL = 60_000; // 60 segundos

    const checkRoleChange = async () => {
      const token = localStorage.getItem('token');
      const savedUserStr = localStorage.getItem('user');
      if (!token || !savedUserStr) return;

      try {
        const response = await api.get('/session/current-role');
        if (!response.data) return;
        
        const { role: dbRole, roles: dbRoles, token: newToken } = response.data as { role: string; roles?: string[]; token: string };

        const savedUser = JSON.parse(savedUserStr);
        const storedRole = (savedUser.role ?? '').replace(/^ROLE_/, '');
        const normalizedDbRole = dbRole.replace(/^ROLE_/, '');

        // Verificar se houve mudança em qualquer um dos roles ou no role principal
        const storedRoles = Array.isArray(savedUser.roles) ? savedUser.roles.map((r: string) => r.replace(/^ROLE_/, '').toUpperCase()) : [storedRole];
        const normalizedDbRoles = Array.isArray(dbRoles) ? dbRoles.map((r: string) => r.replace(/^ROLE_/, '').toUpperCase()) : [normalizedDbRole];
        
        const rolesChanged = JSON.stringify(storedRoles.sort()) !== JSON.stringify(normalizedDbRoles.sort()) || storedRole !== normalizedDbRole;

        if (rolesChanged) {
          console.log(`🔄 Roles changed. Syncing session...`);

          // Atualiza token
          localStorage.setItem('token', newToken);

          // Gerar permissões combinadas de todos os novos roles
          const allRolePermissions = normalizedDbRoles.map(r => generatePermissions(r as UserRole));
          const combinedPermissions = combinePermissions(...allRolePermissions);

          // Atualiza user em localStorage
          const updatedUser = { 
            ...savedUser, 
            role: normalizedDbRole, 
            roles: dbRoles || [dbRole],
            permissions: combinedPermissions 
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));

          // Atualiza estado React
          setUser(updatedUser);
        }
      } catch (err: any) {
        // Silenciar erros de polling, mas logar se for 401 para debug
        if (err?.response?.status === 401) {
          console.warn('⚠️ [AuthContext] Polling 401 - Session likely expired');
        }
      }
    };

    const intervalId = setInterval(checkRoleChange, POLL_INTERVAL);
    return () => clearInterval(intervalId);
  }, []);

  const loadUserGroups = async (userId: string) => {
    try {
      const groups = await groupService.getGroupsByUserId(userId);
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        const updatedUser = { ...userData, groups };

        // Gerar permissões combinadas
        const rolePermissions = generatePermissions(userData.role);
        const groupPermissions = generatePermissionsFromGroups(groups);
        const combinedPermissions = combinePermissions(rolePermissions, groupPermissions);

        // Ajustar função exibida de acordo com os grupos (ex.: GRUPO_DPE -> Departamento Pessoal)
        const effectiveRole = determineEffectiveRole(updatedUser.role as UserRole, groups);
        const userWithPermissions = { ...updatedUser, role: effectiveRole, permissions: combinedPermissions };

        setUser(userWithPermissions);
        localStorage.setItem('user', JSON.stringify(userWithPermissions));
      }
    } catch (error: any) {
      const status = error?.response?.status;

      // Tratamento específico para erro 522 (servidor indisponível)
      if (status === 522 || (error as any)?.is522Error) {
        console.warn('⚠️ [AuthContext] Erro 522 ao carregar grupos - servidor temporariamente indisponível. Continuando sem grupos.');
        console.warn('⚠️ [AuthContext] O retry automático do axios já foi tentado. Continuando sem grupos para não bloquear o login.');
        return;
      }

      if (error?.isConnectionError) {
        console.warn('⚠️ [AuthContext] Backend não está disponível. Continuando sem grupos.');
        return;
      }

      if (status === 403) {
        console.info('[AuthContext] Grupo não carregado (403) - usuário sem permissão para /groups, continuando sem grupos.');
      } else if (status === 401) {
        console.info('[AuthContext] Grupo não carregado (401) - sessão inválida, sem impacto crítico.');
      } else {
        console.error('Erro ao carregar grupos do usuário:', error);
        console.warn('Não foi possível carregar grupos do usuário. Continuando sem grupos.');
      }
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);

      console.log('🔍 Tentando fazer login com:', email);
      console.log('🔍 Base URL:', getApiUrl());

      // Removido teste de comunicação para evitar erros desnecessários

      // Enviar username em vez de email para corresponder ao backend
      // Usar caminho completo com /api para garantir que o proxy funcione
      const response = await api.post('/api/auth/login', { username: email, password });

      console.log('✅ Resposta do login recebida:', response.status);
      console.log('📦 Dados da resposta:', {
        hasToken: !!response.data?.token,
        hasUser: !!response.data?.user,
        userRole: response.data?.user?.role,
        userRoles: response.data?.user?.roles,
        requiresPasswordChange: response.data?.requiresPasswordChange,
        firstAccessCompleted: response.data?.firstAccessCompleted,
        requires2FA: response.data?.requires2FA,
        requiresLgpdConsent: response.data?.requiresLgpdConsent
      });

      // Obter os roles do backend (array ou string)
      let userRoles: string[] = [];
      if (response.data.user) {
        if (Array.isArray(response.data.user.roles)) {
          userRoles = response.data.user.roles;
        } else if (typeof response.data.user.role === 'string') {
          userRoles = [response.data.user.role];
        }
      }

      console.log('🔍 Roles recebidos do backend:', userRoles);

      // Normalizar roles (remover prefixo ROLE_ se existir)
      const normalizedRoles = userRoles.map(r => r.replace(/^ROLE_/, '').toUpperCase());
      console.log('🔍 Roles normalizados:', normalizedRoles);

      // Definir o role principal por prioridade
      const rolePriority: UserRole[] = [
        'SUPER_ADMIN',
        'ADMIN',
        'RH',
        'ASSISTENCIA_RH',
        'DEPARTAMENTO_PESSOAL',
        'GESTOR',
        'GESTOR_OPERACIONAL',
        'GESTAO_SUPERVISAO',
        'SUPERVISOR',
        'FINANCEIRO',
        'COMERCIAL',
        'OPERACIONAL',
        'TI_SUPORTE',
        'AUDITOR',
        'VIGILANTE',
        'ASSISTENTE_ADMINISTRATIVO',
        'ANALISTA_SUPRIMENTOS',
        'ESTOQUE',
        'SUPRIMENTOS',
        'COMPRAS',
        'AUXI_ADMINISTRATIVO',
        'AUX_DEP',
        'COLABORADOR',
      ];

      let userRole: User['role'] = 'COLABORADOR';

      // Encontrar o role de maior prioridade que o usuário possui
      for (const role of rolePriority) {
        // Verificar se o role está na lista de roles normalizados
        if (normalizedRoles.includes(role)) {
          userRole = role;
          console.log(`✅ Role selecionado por prioridade: ${role}`);
          break;
        }
      }

      // TEMPORARIAMENTE: Não carregar grupos durante o login para evitar loop
      console.log('🔍 Login: Pulando carregamento de grupos para evitar loop');
      const userGroups = [];

      // Gerar permissões de todos os roles
      const allRolePermissions = normalizedRoles.map(role => {
        // Garantir que passamos um UserRole válido para generatePermissions
        const validRole = role as UserRole;
        return generatePermissions(validRole);
      });
      const combinedPermissions = combinePermissions(...allRolePermissions);

      // Log para debug do SUPER_ADMIN e outros roles
      console.log(`🔍 Role final definido: ${userRole}`);
      if (userRole === 'SUPER_ADMIN') {
        console.log('🔴 SUPER_ADMIN detectado!');
        console.log('Permissões de todos os roles:', allRolePermissions);
        console.log('Permissões combinadas:', combinedPermissions);
      }

      const userData: User = {
        id: response.data.user?.id || '',
        name: response.data.user?.fullName || response.data.user?.name || 'Usuário Teste',
        email: response.data.user?.email || email,
        username: response.data.user?.username || email, // CPF usado no login
        role: userRole,
        roles: userRoles, // Adicionar a propriedade roles
        groups: userGroups,
        permissions: combinedPermissions,
        avatar: response.data.user?.avatar,
        department: response.data.user?.department,
        position: response.data.user?.position,
        employeeCode: response.data.user?.employeeCode,
        firstAccessCompleted: response.data.user?.firstAccessCompleted ?? response.data.firstAccessCompleted ?? false,
        lgpdAccepted: !(response.data?.requiresLgpdConsent === true),
      };

      // Validar que o ID foi fornecido
      if (!userData.id || userData.id.trim() === '') {
        console.error('❌ ID do usuário não encontrado na resposta do login!');
        throw new Error('ID do usuário não encontrado na resposta do login');
      }

      console.log('✅ ID do usuário obtido:', userData.id);

      // Salvar token e dados do usuário
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        console.log('✅ Token salvo no localStorage:', response.data.token.substring(0, 50) + '...');
      } else {
        console.error('❌ Token não encontrado na resposta do login!');
        throw new Error('Token não encontrado na resposta do login');
      }
      localStorage.setItem('user', JSON.stringify(userData));

      // IMPORTANTE: Setar o user ANTES de qualquer outra operação assíncrona
      // para garantir que o ProtectedRoute veja o usuário autenticado
      setUser(userData);
      setRefreshToken(response.data.token);

      console.log('✅ Usuário setado no estado:', userData.name, userData.role);

      // Carregar grupos em background (não bloquear navegação)
      const roleKey = (userData.role ?? '').toUpperCase();
      if (!['COLABORADOR', 'ROLE_COLABORADOR'].includes(roleKey) && userData.id) {
        // Carregar grupos sem await para não bloquear a navegação
        loadUserGroups(userData.id).catch(err => {
          console.warn('⚠️ Erro ao carregar grupos (não crítico):', err);
        });
      }

      // Verificar se precisa de mudança de senha ou primeiro acesso
      const requiresPasswordChange = response.data?.requiresPasswordChange === true;
      const firstAccessCompleted = response.data?.firstAccessCompleted === true;
      const requires2FA = response.data?.requires2FA === true;
      const requiresLgpdConsent = response.data?.requiresLgpdConsent === true;

      console.log('🔍 Verificando requisitos de acesso:', {
        requiresPasswordChange,
        firstAccessCompleted,
        requires2FA,
        requiresLgpdConsent
      });

      // IMPORTANTE: Setar isLoading como false ANTES de navegar
      // para evitar que ProtectedRoute redirecione para login
      setIsLoading(false);

      // Aguardar um tick do React para garantir que o estado foi atualizado
      // antes de navegar
      await new Promise(resolve => setTimeout(resolve, 100));

      // Redirecionar baseado nos requisitos
      if (requiresPasswordChange || !firstAccessCompleted) {
        console.log('🚀 Redirecionando para primeiro acesso (mudança de senha)');
        navigate('/first-access/change-password');
      } else if (requires2FA) {
        console.log('🚀 Redirecionando para ativação de 2FA');
        navigate('/first-access/activate-2fa');
      } else if (requiresLgpdConsent) {
        console.log('🚀 Redirecionando para consentimento LGPD');
        navigate('/lgpd-consent');
      } else {
        // Navegar apenas após login bem-sucedido e estado atualizado
        console.log('🚀 Navegando para /dashboard');
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('❌ Erro no login:', error);
      console.error('📋 Detalhes do erro:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        config: {
          url: error?.config?.url,
          method: error?.config?.method,
          baseURL: error?.config?.baseURL
        }
      });

      // Mensagem de erro mais específica
      let errorMessage = 'Verifique suas credenciais e tente novamente.';

      if (error?.response?.status === 401) {
        errorMessage = error?.response?.data?.message || 'Usuário ou senha incorretos.';
      } else if (error?.response?.status === 403) {
        errorMessage = 'Acesso negado. Verifique suas permissões.';
      } else if (error?.response?.status === 500) {
        errorMessage = 'Erro interno do servidor. Tente novamente mais tarde.';
      } else if (
        error?.response?.status === 502 ||
        error?.response?.status === 503 ||
        error?.response?.status === 504
      ) {
        errorMessage =
          error?.response?.data?.message ||
          'O backend está temporariamente indisponível. Tente novamente em alguns instantes.';
      } else if (error?.response?.status === 522 || (error as any)?.is522Error) {
        errorMessage = 'O servidor está temporariamente indisponível. O servidor de origem não está respondendo. Por favor, tente novamente em alguns instantes. Se o problema persistir, entre em contato com o suporte.';
      } else if (error?.isConnectionError) {
        errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão.';
      } else if (!error?.response) {
        errorMessage = 'Erro de conexão. Verifique se o servidor está rodando.';
      }

      toast({
        title: 'Erro ao fazer login',
        description: errorMessage,
        variant: 'destructive',
      });
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setProfile(null);
    setRefreshToken(null);
    // Navegar apenas durante logout
    navigate('/login');
  };

  const signOut = logout; // Alias para compatibilidade

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;

      // Buscar dados atualizados do usuário
      const response = await api.get('/api/users/profile');
      if (response.data) {
        const updatedUser = {
          ...user,
          name: response.data.name,
          email: response.data.email,
          whatsapp: response.data.whatsapp,
          lgpdAccepted: response.data.lgpdAccepted ?? user?.lgpdAccepted,
        };
        setUser(updatedUser);
        setProfile(response.data);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return updatedUser;
      }
    } catch (error) {
      console.error('Erro ao atualizar dados do usuário:', error);
      return null;
    }
  };

  const setFirstAccessCompleted = (completed: boolean) => {
    if (!user) return;
    const updatedUser = { ...user, firstAccessCompleted: completed };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value: AuthContextType = {
    user,
    profile,
    login,
    logout,
    signOut,
    isLoading,
    isAuthenticated: !!user,
    refreshAuthToken: async () => {
      try {
        const response = await api.post('/api/auth/refresh-token', {
          refreshToken
        });

        const { token: newToken, refreshToken: newRefreshToken } = response.data;

        localStorage.setItem('token', newToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        setRefreshToken(newRefreshToken);
      } catch (error) {
        console.error('Error refreshing token:', error);
        logout();
        throw error;
      }
    },
    refreshUser,
    setFirstAccessCompleted,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
