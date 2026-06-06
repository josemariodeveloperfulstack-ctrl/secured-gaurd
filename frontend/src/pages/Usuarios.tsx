import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { userService, UserPageResponse } from '@/services/userService';
import { User, UserRole } from '@/types/user';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Filter,
  RefreshCw,
  User as UserIcon,
  Mail,
  Shield,
  Calendar,
  Edit,
  Trash2,
  Eye,
  MessageCircle,
  Send,
  Bell
} from 'lucide-react';
import { useGSAP } from '@/hooks/use-gsap';
import { UserViewModal } from '@/components/usuarios/UserViewModal';
import { UserEditModal } from '@/components/usuarios/UserEditModal';
import { UserDeleteDialog } from '@/components/usuarios/UserDeleteDialog';
import { UserCreateModal } from '@/components/usuarios/UserCreateModal';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';

const PAGE_SIZE = 50;

function extractRoleNames(roles: unknown[] | undefined): string[] {
  if (!roles) return [];
  if (roles.length === 0) return [];
  if (typeof roles[0] === 'string') return roles as string[];
  return (roles as { name?: string }[]).map((r) => r.name).filter(Boolean) as string[];
}

const ROLE_FILTER_OPTIONS = [
  'SUPER_ADMIN',
  'ADMINISTRADOR',
  'RH',
  'SUPERVISOR',
  'COLABORADOR',
  'FINANCEIRO',
  'TI_SUPORTE',
  'AUDITOR',
  'COMERCIAL',
  'GESTOR',
  'OPERACIONAL',
];

const Usuarios: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'online'>('all');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  useGSAP();

  // Estados dos modais
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, roleFilter, activeTab]);

  const {
    data: usersPage,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery({
    queryKey: ['users', 'paged', page, debouncedSearch, roleFilter, activeTab],
    queryFn: async () => {
      const mapUsers = (list: Awaited<ReturnType<typeof userService.getAllUsers>>) =>
        list.map((user) => ({
          ...user,
          isOnline: user.isOnline ?? false,
        }));

      try {
        const result = await userService.getUsersPaged({
          page,
          size: PAGE_SIZE,
          search: debouncedSearch,
          role: roleFilter,
          onlineOnly: activeTab === 'online',
        });
        return {
          ...result,
          content: mapUsers(result.content),
        };
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status !== 400 && status !== 404) {
          throw err;
        }
        const all = mapUsers(await userService.getAllUsers());
        let filtered = all;
        if (activeTab === 'online') {
          filtered = filtered.filter((u) => Boolean(u.isOnline));
        }
        if (debouncedSearch) {
          const term = debouncedSearch.toLowerCase();
          filtered = filtered.filter(
            (u) =>
              u.name?.toLowerCase().includes(term) ||
              u.email?.toLowerCase().includes(term) ||
              u.username?.toLowerCase().includes(term)
          );
        }
        if (roleFilter !== 'all') {
          filtered = filtered.filter((u) =>
            extractRoleNames(u.roles as string[]).includes(roleFilter)
          );
        }
        const start = page * PAGE_SIZE;
        const slice = filtered.slice(start, start + PAGE_SIZE);
        return {
          content: slice,
          totalElements: filtered.length,
          totalPages: Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
          page,
          size: PAGE_SIZE,
          onlineCount: all.filter((u) => Boolean(u.isOnline)).length,
        };
      }
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    placeholderData: (previous) => previous,
  });

  const filteredUsers = usersPage?.content ?? [];
  const totalElements = usersPage?.totalElements ?? 0;
  const totalPages = usersPage?.totalPages ?? 0;
  const onlineCount = usersPage?.onlineCount ?? 0;

  useEffect(() => {
    if (!isError) return;
    const err = error as { response?: { status?: number } };
    if (err?.response?.status === 403 || err?.response?.status === 401) {
      toast({
        title: 'Acesso Negado',
        description: 'Você não tem permissão para visualizar usuários.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Erro ao Carregar',
        description: 'Não foi possível carregar os usuários. Verifique sua conexão.',
        variant: 'destructive',
      });
    }
  }, [isError, error, toast]);

  const invalidateUsers = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['users', 'paged'] });
  }, [queryClient]);

  const getRoleDisplayName = (role: string) => {
    const roleNames: Record<string, string> = {
      'SUPER_ADMIN': 'Super Admin',
      'ADMIN': 'Administrador',
      'RH': 'Recursos Humanos',
      'SUPERVISOR': 'Supervisor',
      'COLABORADOR': 'Colaborador',
      'FINANCEIRO': 'Financeiro',
      'TI_SUPORTE': 'TI / Suporte',
      'AUDITOR': 'Auditor'
    };
    return roleNames[role] || role;
  };

  const getRoleColor = (role: string) => {
    const roleColors: Record<string, string> = {
      'SUPER_ADMIN': 'bg-red-100 text-red-800',
      'ADMIN': 'bg-blue-100 text-blue-800',
      'RH': 'bg-green-100 text-green-800',
      'SUPERVISOR': 'bg-yellow-100 text-yellow-800',
      'COLABORADOR': 'bg-gray-100 text-gray-800',
      'FINANCEIRO': 'bg-indigo-100 text-indigo-800',
      'TI_SUPORTE': 'bg-orange-100 text-orange-800',
      'AUDITOR': 'bg-pink-100 text-pink-800'
    };
    return roleColors[role] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (user: User) => {
    // Verificar se o usuário tem grupos (ativo) ou não
    if (user.groups && user.groups.length > 0) {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (user: User) => {
    if (user.groups && user.groups.length > 0) {
      return 'Ativo';
    }
    return 'Sem Grupos';
  };

  const handleCreateUser = () => {
    setIsCreateModalOpen(true);
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleUserCreated = () => {
    invalidateUsers();
  };

  const handleUserUpdated = () => {
    invalidateUsers();
  };

  const handleUserDeleted = () => {
    invalidateUsers();
  };

  useWebSocket({
    token: localStorage.getItem('token') || '',
    username: currentUser?.username || currentUser?.email || currentUser?.id || '',
    onConnect: () => {
      // Após reconectar o WS, sincroniza a lista com o backend (snapshot de online)
      queryClient.invalidateQueries({ queryKey: ['users', 'paged'] });
    },
    onUserStatus: (event) => {
      const isOnline = Boolean(event.isOnline ?? (event as { online?: boolean }).online);
      queryClient.setQueriesData<UserPageResponse>(
        { queryKey: ['users', 'paged'] },
        (prev) => {
          if (!prev) return prev;
          const nextContent = prev.content.map((u) =>
            u.id === event.userId ? { ...u, isOnline } : u
          );
          const wasOnline = prev.content.some((u) => u.id === event.userId && u.isOnline);
          let nextOnlineCount = prev.onlineCount;
          if (wasOnline && !isOnline) nextOnlineCount = Math.max(0, nextOnlineCount - 1);
          if (!wasOnline && isOnline) nextOnlineCount += 1;
          return { ...prev, content: nextContent, onlineCount: nextOnlineCount };
        }
      );
    },
  });

  if (isLoading) {
    return (
      <StandardLayout
        title="Usuários"
        subtitle="Carregando usuários..."
      >
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          </CardContent>
        </Card>
      </StandardLayout>
    );
  }

  return (
    <StandardLayout
      title="Usuários"
      subtitle={
        activeTab === 'online'
          ? `${totalElements} online • ${onlineCount} no sistema`
          : `${totalElements} usuário${totalElements !== 1 ? 's' : ''} • ${onlineCount} online`
      }
    >
      <div className="space-y-6">
        {/* Filtros */}
        <Card className="bg-seguranca-graphite border-gray-600" data-animate="fadeUp">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-seguranca-black border border-gray-600 rounded-md px-3 py-2 text-seguranca-lightgray"
              >
                <option value="all">Todas as permissões</option>
                {ROLE_FILTER_OPTIONS.map((role) => (
                  <option key={role} value={role}>{getRoleDisplayName(role)}</option>
                ))}
              </select>

              <Button
                className="bg-seguranca-red hover:bg-seguranca-darkred"
                onClick={handleCreateUser}
              >
                <Plus size={20} className="mr-2" />
                Novo Usuário
              </Button>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              <Button
                variant={activeTab === 'all' ? 'default' : 'outline'}
                className={activeTab === 'all' ? 'bg-seguranca-red hover:bg-seguranca-darkred' : 'border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black'}
                onClick={() => setActiveTab('all')}
              >
                Todos ({totalElements})
              </Button>
              <Button
                variant={activeTab === 'online' ? 'default' : 'outline'}
                className={activeTab === 'online' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black'}
                onClick={() => setActiveTab('online')}
              >
                Online ({onlineCount})
              </Button>
              <Button
                variant="outline"
                className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('all');
                  setActiveTab('all');
                }}
              >
                <RefreshCw size={20} className="mr-2" />
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Usuários */}
        <Card className="bg-seguranca-graphite border-gray-600" data-animate="fadeUp">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray">
              {activeTab === 'online' ? 'Usuários Online em Tempo Real' : 'Lista de Usuários'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-seguranca-lightgray mb-2">
                  Nenhum usuário encontrado
                </h3>
                <p className="text-seguranca-lightgray">
                  {activeTab === 'online'
                    ? 'Nenhum usuário online no momento.'
                    : (searchTerm || roleFilter !== 'all'
                      ? 'Tente ajustar os filtros de busca.'
                      : 'Não há usuários cadastrados no sistema.'
                    )
                  }
                </p>
              </div>
            ) : activeTab === 'online' ? (
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow className="border-gray-600">
                      <TableHead className="text-seguranca-lightgray">Usuário</TableHead>
                      <TableHead className="text-seguranca-lightgray">Email</TableHead>
                      <TableHead className="text-seguranca-lightgray">Permissões</TableHead>
                      <TableHead className="text-seguranca-lightgray text-right w-[200px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className="border-gray-600">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
                              <UserIcon className="text-white" size={20} />
                            </div>
                            <div>
                              <div className="font-medium text-seguranca-lightgray">{user.name}</div>
                              {/* ID oculto conforme solicitado */}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          <div className="flex items-center space-x-2">
                            <Mail size={16} className="text-gray-400" />
                            <span className="text-seguranca-lightgray truncate">{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {extractRoleNames(user.roles).map((role: string) => (
                            <Badge key={role} className={getRoleColor(role)}>{getRoleDisplayName(role)}</Badge>
                          ))}
                        </TableCell>
                        <TableCell className="min-w-[200px]">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-blue-950 text-blue-400 hover:bg-blue-900 border-blue-800"
                              onClick={() => navigate(`/chat-interno?user=${user.id}`)}
                            >
                              <MessageCircle className="h-4 w-4 mr-1.5" />
                              Chat
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-purple-950 text-purple-400 hover:bg-purple-900 border-purple-800"
                              onClick={() => navigate(`/mensagens?user=${user.id}`)}
                            >
                              <Send className="h-4 w-4 mr-1.5" />
                              Msg
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-orange-950 text-orange-400 hover:bg-orange-900 border-orange-800"
                              onClick={() => navigate(`/gestao-mensagens/notificacoes?user=${user.id}`)}
                            >
                              <Bell className="h-4 w-4 mr-1.5" />
                              Notif
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[800px] w-full">
                  <TableHeader>
                    <TableRow className="border-gray-600">
                      <TableHead className="text-seguranca-lightgray">Usuário</TableHead>
                      <TableHead className="text-seguranca-lightgray">Email</TableHead>
                      <TableHead className="text-seguranca-lightgray">Permissões</TableHead>
                      <TableHead className="text-seguranca-lightgray">Status</TableHead>
                      <TableHead className="text-seguranca-lightgray">Grupos</TableHead>
                      <TableHead className="text-seguranca-lightgray text-right w-[200px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className="border-gray-600">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-seguranca-red rounded-full flex items-center justify-center relative">
                              <UserIcon className="text-white" size={20} />
                              <span
                                className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-seguranca-graphite ${user.isOnline ? 'bg-emerald-500' : 'bg-gray-500'
                                  }`}
                                title={user.isOnline ? 'Online' : 'Offline'}
                              />
                            </div>
                            <div>
                              <div className="font-medium text-seguranca-lightgray flex items-center gap-2">
                                {user.name}
                                <span className={`text-xs ${user.isOnline ? 'text-emerald-400' : 'text-gray-400'}`}>
                                  {user.isOnline ? 'Online' : 'Offline'}
                                </span>
                              </div>
                              <div className="text-sm text-gray-400">ID: {user.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Mail size={16} className="text-gray-400" />
                            <span className="text-seguranca-lightgray truncate max-w-[150px] sm:max-w-[200px]" title={user.email}>{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {extractRoleNames(user.roles).map((role: string) => (
                            <Badge key={role} className={getRoleColor(role)}>{getRoleDisplayName(role)}</Badge>
                          ))}
                        </TableCell>
                        <TableCell>
                          <Badge className={user.isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}>
                            {user.isOnline ? 'Online' : 'Offline'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.groups && user.groups.length > 0 ? (
                              user.groups.slice(0, 2).map((group) => (
                                <Badge key={group.id} variant="outline" className="text-xs">
                                  {group.displayName}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-gray-400 text-sm">Sem grupos</span>
                            )}
                            {user.groups && user.groups.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{user.groups.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap min-w-[200px]">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="outline"
                              className="h-8 w-8 p-0 bg-blue-950 text-blue-400 hover:bg-blue-900 border-blue-800"
                              onClick={() => handleViewUser(user)}
                              title="Visualizar Usuário"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              className="h-8 w-8 p-0 bg-emerald-950 text-emerald-400 hover:bg-emerald-900 border-emerald-800"
                              onClick={() => handleEditUser(user)}
                              title="Editar Usuário"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              className="h-8 w-8 p-0 bg-red-950 text-red-400 hover:bg-red-900 border-red-800"
                              onClick={() => handleDeleteUser(user)}
                              title="Excluir Usuário"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-gray-600">
                <p className="text-sm text-seguranca-lightgray">
                  Página {page + 1} de {totalPages} • {PAGE_SIZE} por página
                  {isFetching ? ' • atualizando…' : ''}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-600 text-seguranca-lightgray"
                    disabled={page <= 0 || isFetching}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-600 text-seguranca-lightgray"
                    disabled={page >= totalPages - 1 || isFetching}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modais */}
      <UserViewModal
        user={selectedUser}
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedUser(null);
        }}
      />

      <UserEditModal
        user={selectedUser}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        onSave={handleUserUpdated}
      />

      <UserDeleteDialog
        user={selectedUser}
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedUser(null);
        }}
        onDelete={handleUserDeleted}
      />

      <UserCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleUserCreated}
      />
    </StandardLayout>
  );
};

export default Usuarios; 