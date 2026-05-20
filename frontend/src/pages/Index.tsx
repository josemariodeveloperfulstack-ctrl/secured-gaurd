import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { StandardLayout } from '@/components/StandardLayout';
import { PermissionDebug } from '@/components/PermissionDebug';
import { DashboardCard, DashboardGrid } from '@/components/DashboardCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Users,
  Building,
  FileText,
  DollarSign,
  Truck,
  LogOut,
  User,
  Settings,
  Shield,
  Database,
  Target,
  FileCheck,
  Calculator,
  ClipboardList,
  UserCog,
  UserCheck,
  TrendingUp,
  TrendingDown,
  Activity,
  Bell,
  AlertTriangle,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Info,
  Loader2,
  RefreshCw,
  CreditCard,
  Banknote,
  MessageSquare,
  Calendar,
  ShoppingCart
} from 'lucide-react';
import { getRoleDisplayName, getRoleColor } from '@/utils/permissions';
import { dashboardService, DashboardStats } from '@/services/dashboardService';
import { useToast } from '@/hooks/use-toast';

const Index: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // Normalizar role para decidir comportamento de dashboard
  const rawRole = user?.role || 'COLABORADOR';
  const normalizedRole = (rawRole as string).replace(/^ROLE_/, '').toUpperCase();
  const isRhOrDp = ['RH', 'ASSISTENCIA_RH', 'DEPARTAMENTO_PESSOAL', 'AUX_DEP'].includes(normalizedRole);

  // Staged fetching: quick stats first, then full summary
  const quickStatsQuery = useQuery({
    queryKey: ['dashboard', 'quick'],
    queryFn: () => dashboardService.getQuickStats() as unknown as Promise<DashboardStats>,
    enabled: !!user && !isRhOrDp, // Para RH/DP usamos métricas fixas, sem chamar backend
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardService.getDashboardSummary() as unknown as Promise<DashboardStats>,
    enabled: !!user && !isRhOrDp,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  // Reagir aos dados das queries e definir estado de exibição
  useEffect(() => {
    if (isRhOrDp) {
      // Métricas fixas específicas para RH / Departamento Pessoal
      const fixedStats: DashboardStats = {
        totalUsers: 156,            // Funcionários ativos
        activeUsers: 0,
        activeContracts: 0,
        monthlyRevenue: 0,
        totalEquipment: 0,
        pendingTasks: 8,            // Férias pendentes (exemplo)
        totalAlerts: 95,            // Holerites do mês (exemplo)
        unreadAlerts: 0,
        lastUpdate: new Date().toISOString(),
      };
      setStats(fixedStats);
      setLoading(false);
      return;
    }

    // Para outros perfis, preferir resumo completo; senão, usar quick stats
    const data = (summaryQuery.data as DashboardStats) || (quickStatsQuery.data as DashboardStats) || null;
    if (data) {
      setStats(data);
      setLoading(false);
    } else if (quickStatsQuery.isLoading && summaryQuery.isLoading) {
      setLoading(true);
    }
  }, [isRhOrDp, quickStatsQuery.data, quickStatsQuery.isLoading, summaryQuery.data, summaryQuery.isLoading]);

  // Atualização manual (botão Atualizar)
  const loadDashboardData = async (showToast = false) => {
    try {
      setRefreshing(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'quick'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] }),
      ]);
      if (showToast) {
        toast({ title: 'Dashboard atualizado', description: 'Dados atualizados com sucesso' });
      }
    } catch (error) {
      console.error('Erro ao atualizar dashboard:', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar o dashboard', variant: 'destructive' });
    } finally {
      setRefreshing(false);
    }
  };

  // Não redirecionar mais por função: todos usam o mesmo dashboard unificado

  // Carregar dados iniciais (queries já disparam automaticamente)
  useEffect(() => {
    // Nada aqui: useQuery dispara no mount
  }, []);

  // Atualizar dados automaticamente a cada 5 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    }, 300000);
    return () => clearInterval(interval);
  }, [queryClient]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Usuário não encontrado</p>
      </div>
    );
  }

  // Renderizar estatísticas em tempo real
  const renderStatsCards = () => {
    if (loading || !stats) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-seguranca-black border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-seguranca-black border-gray-700 hover:border-seguranca-yellow transition-all duration-300 hover:shadow-lg hover:shadow-seguranca-yellow/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total de Usuários</p>
                <p className="text-2xl font-bold text-seguranca-lightgray">
                  {dashboardService.formatNumber(stats.totalUsers)}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <div className="flex items-center mt-3">
              <span className="text-gray-400 text-sm">
                {stats.activeUsers} ativos
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-black border-gray-700 hover:border-seguranca-yellow transition-all duration-300 hover:shadow-lg hover:shadow-seguranca-yellow/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Contratos Ativos</p>
                <p className="text-2xl font-bold text-seguranca-lightgray">
                  {dashboardService.formatNumber(stats.activeContracts)}
                </p>
              </div>
              <FileText className="h-8 w-8 text-green-500" />
            </div>
            <div className="flex items-center mt-3">
              <span className="text-gray-400 text-sm">
                {stats.totalClients} clientes
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-black border-gray-700 hover:border-seguranca-yellow transition-all duration-300 hover:shadow-lg hover:shadow-seguranca-yellow/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Receita Mensal</p>
                <p className="text-2xl font-bold text-seguranca-yellow">
                  {dashboardService.formatCurrency(stats.monthlyRevenue)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="flex items-center mt-3">
              <span className="text-gray-400 text-sm">
                Total: {dashboardService.formatCurrency(stats.totalRevenue)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-black border-gray-700 hover:border-seguranca-yellow transition-all duration-300 hover:shadow-lg hover:shadow-seguranca-yellow/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Equipamentos</p>
                <p className="text-2xl font-bold text-seguranca-lightgray">
                  {dashboardService.formatNumber(stats.totalEquipment)}
                </p>
              </div>
              <Package className="h-8 w-8 text-orange-500" />
            </div>
            <div className="flex items-center mt-3">
              <span className="text-gray-400 text-sm">
                {stats.equipmentInUse} em uso
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Renderizar notificações e alertas
  // Queries deferidas para notificações e atividades
  const alertsQuery = useQuery({
    queryKey: ['dashboard', 'alerts'],
    queryFn: () => dashboardService.getSystemAlerts(),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const activitiesQuery = useQuery({
    queryKey: ['dashboard', 'activities'],
    queryFn: () => dashboardService.getRecentActivities(),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const renderNotifications = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-seguranca-black border-gray-700">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
              <Bell className="h-5 w-5 text-seguranca-yellow" />
              Notificações Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alertsQuery.isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-seguranca-yellow mx-auto"></div>
                  <p className="text-gray-400 mt-2">Carregando notificações...</p>
                </div>
              ) : alertsQuery.data && alertsQuery.data.length > 0 ? (
                alertsQuery.data.slice(0, 5).map((alert: any) => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 bg-seguranca-graphite rounded-lg hover:bg-gray-700 transition-colors">
                    <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0`} />
                    <div className="flex-1">
                      <p className="text-seguranca-lightgray text-sm font-medium">
                        {alert.title}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {alert.message}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {alert.createdAt}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Nenhuma notificação recente</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-black border-gray-700">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
              <Activity className="h-5 w-5 text-seguranca-yellow" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activitiesQuery.isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-seguranca-yellow mx-auto"></div>
                  <p className="text-gray-400 mt-2">Carregando atividades...</p>
                </div>
              ) : activitiesQuery.data && activitiesQuery.data.length > 0 ? (
                activitiesQuery.data.slice(0, 5).map((activity: any) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 bg-seguranca-graphite rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">•</span>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-seguranca-lightgray text-sm">
                        {activity.user}: {activity.action}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {activity.module} • {activity.timestamp}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Nenhuma atividade recente</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <StandardLayout>
      <div className="mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-seguranca-lightgray mb-2">
              Bem-vindo, {user.name}!
            </h1>
            <p className="text-seguranca-lightgray">
              Acesse as funcionalidades disponíveis através do menu lateral.
              {user.role === 'SUPER_ADMIN' && (
                <span className="ml-2 text-seguranca-yellow font-semibold">
                  🟥 Você tem acesso total ao sistema
                </span>
              )}
            </p>
          </div>
          <Button
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="self-start md:self-auto border-seguranca-yellow text-seguranca-yellow hover:bg-seguranca-yellow hover:text-black"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
      </div>

      {/* Dashboard com abas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-seguranca-graphite border border-gray-700">
          <TabsTrigger
            value="overview"
            className="data-[state='active']:bg-seguranca-yellow data-[state='active']:text-black text-seguranca-lightgray"
          >
            Visão Geral
          </TabsTrigger>
          <TabsTrigger
            value="modules"
            className="data-[state='active']:bg-seguranca-yellow data-[state='active']:text-black text-seguranca-lightgray"
          >
            Módulos
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="data-[state='active']:bg-seguranca-yellow data-[state='active']:text-black text-seguranca-lightgray"
          >
            Atividade
          </TabsTrigger>
          <TabsTrigger
            value="profile"
            className="data-[state='active']:bg-seguranca-yellow data-[state='active']:text-black text-seguranca-lightgray"
          >
            Perfil
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Ações rápidas (PONTO, DOCS, etc.) para todos os usuários */}
          <div className="grid grid-cols-2 gap-4 max-w-2xl">
            <Button
              className="h-28 flex flex-col items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border-2 border-white/10 rounded-3xl shadow-lg transition-transform active:scale-95"
              onClick={() => navigate('/meu-ponto')}
            >
              <Clock className="w-8 h-8" />
              <span className="font-bold text-lg">PONTO</span>
            </Button>
            <Button
              className="h-28 flex flex-col items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-white/10 rounded-3xl shadow-lg transition-transform active:scale-95"
              onClick={() => navigate('/meus-holerites')}
            >
              <FileText className="w-8 h-8" />
              <span className="font-bold text-lg">DOCS</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-1 bg-seguranca-black/40 border-gray-800 text-gray-400 rounded-2xl transition-transform active:scale-95"
              onClick={() => navigate('/minhas-ferias')}
            >
              <Calendar className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-semibold">FÉRIAS</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-1 bg-seguranca-black/40 border-gray-800 text-gray-400 rounded-2xl transition-transform active:scale-95"
              onClick={() => navigate('/meus-plantoes')}
            >
              <CheckCircle className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-semibold">PLANTÕES</span>
            </Button>
          </div>

          {/* Estatísticas e notificações (dashboard corporativo) */}
          {renderStatsCards()}
          {renderNotifications()}
        </TabsContent>

        <TabsContent value="modules" className="mt-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-seguranca-lightgray">Módulos Disponíveis</h2>
                <p className="text-gray-400">Acesse as funcionalidades baseadas em suas permissões</p>
              </div>
            </div>

            {/* Cards de resumo baseados no role */}
            <DashboardGrid>
              {/* SUPER_ADMIN - Acesso total */}
              {user.role === 'SUPER_ADMIN' && (
                <>
                  {/* Módulos de Sistema */}
                  <DashboardCard
                    title="Controle Total"
                    value="🟥"
                    description="Acesso irrestrito a todas as funcionalidades do sistema"
                    icon={Shield}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Gerenciar Sistema",
                      onClick: () => navigate('/configuracoes'),
                      variant: 'default'
                    }}
                  />

                  {/* Usuários e Grupos - Visível para SUPER_ADMIN, ADMIN e ADMINISTRADOR */}
                  {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'ADMINISTRADOR' || user.role === 'ROLE_ADMIN' || user.role === 'ROLE_ADMINISTRADOR') && (
                    <>
                      <DashboardCard
                        title="Usuários"
                        value={user.role === 'SUPER_ADMIN' ? "🟥" : "Acesso"}
                        description="Gerencie usuários e permissões do sistema"
                        icon={UserCog}
                        iconColor="text-seguranca-yellow"
                        action={{
                          label: "Gerenciar Usuários",
                          onClick: () => navigate('/usuarios'),
                          variant: 'default'
                        }}
                      />

                      <DashboardCard
                        title="Grupos"
                        value={user.role === 'SUPER_ADMIN' ? "🟥" : "Acesso"}
                        description="Configure grupos e permissões"
                        icon={UserCheck}
                        iconColor="text-seguranca-yellow"
                        action={{
                          label: "Gerenciar Grupos",
                          onClick: () => navigate('/grupos'),
                          variant: 'default'
                        }}
                      />
                    </>
                  )}

                  <DashboardCard
                    title="Sistema"
                    value="🟥"
                    description="Configurações avançadas do sistema"
                    icon={Database}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Configurar",
                      onClick: () => navigate('/configuracoes'),
                      variant: 'default'
                    }}
                  />

                  {/* Módulos Operacionais */}
                  <DashboardCard
                    title="Operacional"
                    value="🟥"
                    description="Controle operacional e escalas"
                    icon={Shield}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/operacional'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Controle de Visitas"
                    value="🟥"
                    description="Gestão avançada de visitas"
                    icon={Target}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/controle-visitas-avancado'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Supervisão"
                    value="🟥"
                    description="Supervisão principal do sistema"
                    icon={Shield}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/supervisao'),
                      variant: 'default'
                    }}
                  />

                  {/* Módulos de RH */}
                  <DashboardCard
                    title="Funcionários"
                    value="🟥"
                    description="Gestão completa de funcionários"
                    icon={Users}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Gerenciar",
                      onClick: () => navigate('/funcionarios'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Postos de Trabalho"
                    value="🟥"
                    description="Gestão de postos e funções"
                    icon={Target}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Gerenciar",
                      onClick: () => navigate('/postos'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Funções"
                    value="🟥"
                    description="Gestão de funções e cargos"
                    icon={Settings}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Gerenciar",
                      onClick: () => navigate('/rh/funcoes'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Cargos"
                    value="🟥"
                    description="Gestão de cargos e hierarquia"
                    icon={ClipboardList}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Gerenciar",
                      onClick: () => navigate('/rh/cargos'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Holerites"
                    value="🟥"
                    description="Gestão de holerites e pagamentos"
                    icon={FileText}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Gerenciar",
                      onClick: () => navigate('/holerites'),
                      variant: 'default'
                    }}
                  />

                  {/* Módulos SST */}
                  <DashboardCard
                    title="SST"
                    value="🟥"
                    description="Saúde e Segurança do Trabalho"
                    icon={Shield}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/rh/sst'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Exames Médicos"
                    value="🟥"
                    description="Gestão de exames médicos"
                    icon={Activity}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Gerenciar",
                      onClick: () => navigate('/rh/sst/exames'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="EPIs"
                    value="🟥"
                    description="Gestão de equipamentos de proteção"
                    icon={Package}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Gerenciar",
                      onClick: () => navigate('/rh/sst/epis'),
                      variant: 'default'
                    }}
                  />

                  {/* Módulos Comerciais */}
                  <DashboardCard
                    title="Clientes"
                    value="🟥"
                    description="Gestão de clientes e contratos"
                    icon={Building}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Gerenciar",
                      onClick: () => navigate('/clientes'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Contratos"
                    value="🟥"
                    description="Gestão de contratos de segurança"
                    icon={FileText}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Gerenciar",
                      onClick: () => navigate('/contratos'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Leads"
                    value="🟥"
                    description="Gestão de leads e oportunidades"
                    icon={Target}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Gerenciar",
                      onClick: () => navigate('/leads'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Propostas"
                    value="🟥"
                    description="Controle de propostas comerciais"
                    icon={FileCheck}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Gerenciar",
                      onClick: () => navigate('/propostas'),
                      variant: 'default'
                    }}
                  />

                  {/* Módulos Financeiros */}
                  <DashboardCard
                    title="Financeiro"
                    value="🟥"
                    description="Controle financeiro completo"
                    icon={DollarSign}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/financeiro'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Contas a Pagar"
                    value="🟥"
                    description="Gestão de contas a pagar"
                    icon={CreditCard}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Gerenciar",
                      onClick: () => navigate('/contas-a-pagar'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Contas a Receber"
                    value="🟥"
                    description="Gestão de contas a receber"
                    icon={Banknote}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Gerenciar",
                      onClick: () => navigate('/financeiro/contas-receber'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Fluxo de Caixa"
                    value="🟥"
                    description="Controle de fluxo de caixa"
                    icon={TrendingUp}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/financeiro/fluxo-caixa'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Conciliação Bancária"
                    value="🟥"
                    description="Conciliação de movimentações bancárias"
                    icon={Calculator}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/financeiro/conciliacao-bancaria'),
                      variant: 'default'
                    }}
                  />

                  {/* Módulos de Frota e Operações */}
                  <DashboardCard
                    title="Frota"
                    value="🟥"
                    description="Controle de veículos e manutenção"
                    icon={Truck}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Gerenciar",
                      onClick: () => navigate('/frota'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Filiais"
                    value="🟥"
                    description="Gestão de filiais e unidades"
                    icon={Building}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Gerenciar",
                      onClick: () => navigate('/filiais'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Serviços"
                    value="🟥"
                    description="Controle de serviços prestados"
                    icon={ClipboardList}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Gerenciar",
                      onClick: () => navigate('/operacional?tab=servicos'),
                      variant: 'default'
                    }}
                  />

                  {/* Módulos de Relatórios e Suporte */}
                  <DashboardCard
                    title="Relatórios"
                    value="🟥"
                    description="Relatórios e análises do sistema"
                    icon={BarChart3}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/relatorios'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Gestão de Atividades"
                    value="🟥"
                    description="Controle de atividades do sistema"
                    icon={Activity}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/atividades'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Central de Suporte"
                    value="🟥"
                    description="Central de suporte e atendimento"
                    icon={Bell}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/suporte'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Gestão de Mensagens"
                    value="🟥"
                    description="Sistema de mensagens internas"
                    icon={MessageSquare}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/gestao-mensagens/inbox'),
                      variant: 'default'
                    }}
                  />
                </>
              )}

              {/* ADMIN - Acesso administrativo */}
              {user.role === 'ADMIN' && (
                <>
                  <DashboardCard
                    title="Usuários"
                    value="Gerenciar"
                    description="Gerencie usuários e permissões do sistema"
                    icon={UserCog}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/usuarios'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Grupos de Usuários"
                    value="Gerenciar"
                    description="Configure grupos e permissões"
                    icon={UserCheck}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/grupos'),
                      variant: 'default'
                    }}
                  />
                </>
              )}

              {/* COLABORADOR */}
              {user.role === 'COLABORADOR' && (
                <>
                  <DashboardCard
                    title="Meu Holerite"
                    value="Visualizar"
                    description="Visualize e baixe seus holerites mensais"
                    icon={FileText}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/holerites'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Meu Perfil"
                    value="Gerenciar"
                    description="Gerencie suas informações pessoais"
                    icon={User}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/profile'),
                      variant: 'default'
                    }}
                  />
                </>
              )}

              {/* ADMIN, RH, SUPERVISOR */}
              {(user.role === 'ADMIN' || user.role === 'RH' || user.role === 'SUPERVISOR') && (
                <>
                  <DashboardCard
                    title="Funcionários"
                    value="Gerenciar"
                    description="Gerencie o quadro de funcionários"
                    icon={Users}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/funcionarios'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Holerites"
                    value="Gerenciar"
                    description="Gerencie holerites dos funcionários"
                    icon={FileText}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/holerites/envio'),
                      variant: 'default'
                    }}
                  />
                </>
              )}

              {/* ADMIN */}
              {user.role === 'ADMIN' && (
                <>
                  <DashboardCard
                    title="Clientes"
                    value="Gerenciar"
                    description="Gerencie clientes e contratos"
                    icon={Building}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/clientes'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Financeiro"
                    value="Gerenciar"
                    description="Controle financeiro e relatórios"
                    icon={DollarSign}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/financeiro'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Frota"
                    value="Gerenciar"
                    description="Controle de veículos e manutenção"
                    icon={Truck}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/frota'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Configurações"
                    value="Sistema"
                    description="Configurações gerais do sistema"
                    icon={Settings}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/configuracoes'),
                      variant: 'default'
                    }}
                  />
                </>
              )}

              {/* Módulo Operacional */}
              {(user.role === 'ADMIN' || user.role === 'SUPERVISOR') && (
                <>
                  <DashboardCard
                    title="Operacional"
                    value="Gerenciar"
                    description="Controle operacional e escalas"
                    icon={Shield}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => console.log('Acessar Operacional'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Serviços"
                    value="Gerenciar"
                    description="Controle de serviços prestados"
                    icon={ClipboardList}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => console.log('Acessar Serviços'),
                      variant: 'default'
                    }}
                  />
                </>
              )}

              {/* Módulo Comercial */}
              {(user.role === 'ADMIN' || user.role === 'COMERCIAL') && (
                <>
                  <DashboardCard
                    title="Clientes"
                    value="Gerenciar"
                    description="Gestão de clientes e contratos"
                    icon={Building}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/clientes'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Contratos"
                    value="Gerenciar"
                    description="Gestão de contratos"
                    icon={FileText}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/contratos'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Leads"
                    value="Gerenciar"
                    description="Gestão de leads e oportunidades"
                    icon={Target}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/leads'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Propostas"
                    value="Gerenciar"
                    description="Controle de propostas comerciais"
                    icon={FileCheck}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/propostas'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Orçamentos"
                    value="Gerenciar"
                    description="Gestão de orçamentos"
                    icon={Calculator}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/orcamentos'), // Fixed path from earlier log
                      variant: 'default'
                    }}
                  />
                </>
              )}

              {/* Módulo Estoque */}
              {(user.role === 'ADMIN' || 
                user.role === 'SUPER_ADMIN' ||
                user.role === 'ESTOQUE' || 
                user.role === 'ALMOXARIFADO' || 
                user.role === 'ANALISTA_SUPRIMENTOS' || 
                user.role === 'SUPRIMENTOS' ||
                user.role === 'ASSISTENTE_ADMINISTRATIVO') && (
                <>
                  <DashboardCard
                    title="Estoque"
                    value="Gerenciar"
                    description="Controle de estoque e inventário"
                    icon={Package}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/estoque-simplificado'),
                      variant: 'default'
                    }}
                  />
                </>
              )}

              {/* Módulo Compras */}
              {(user.role === 'ADMIN' || 
                user.role === 'SUPER_ADMIN' ||
                user.role === 'COMPRAS' || 
                user.role === 'ALMOXARIFADO' || 
                user.role === 'ANALISTA_SUPRIMENTOS' || 
                user.role === 'SUPRIMENTOS' ||
                user.role === 'ASSISTENTE_ADMINISTRATIVO') && (
                <>
                  <DashboardCard
                    title="Compras"
                    value="Gerenciar"
                    description="Gestão de compras e cotações"
                    icon={ShoppingCart}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/compras'),
                      variant: 'default'
                    }}
                  />
                </>
              )}

              {/* Módulo Comunicação e Suporte */}
              {(user.role === 'ESTOQUE' || 
                user.role === 'COMPRAS' || 
                user.role === 'SUPRIMENTOS' ||
                user.role === 'ALMOXARIFADO') && (
                <>
                  <DashboardCard
                    title="Mensagens"
                    value="Acessar"
                    description="Sistema de mensagens internas"
                    icon={MessageSquare}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/gestao-mensagens/inbox'),
                      variant: 'default'
                    }}
                  />

                  <DashboardCard
                    title="Suporte"
                    value="Acessar"
                    description="Central de suporte e atendimento"
                    icon={Bell}
                    iconColor="text-seguranca-yellow"
                    action={{
                      label: "Acessar",
                      onClick: () => navigate('/suporte'),
                      variant: 'default'
                    }}
                  />
                </>
              )}
            </DashboardGrid>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-seguranca-lightgray">Atividade do Sistema</h2>
            <Card className="bg-seguranca-black border-gray-700">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                  <Activity className="h-5 w-5 text-seguranca-yellow" />
                  Log de Atividades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-seguranca-graphite rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div className="flex-1">
                      <p className="text-seguranca-lightgray text-sm font-medium">
                        Sistema iniciado com sucesso
                      </p>
                      <p className="text-gray-400 text-xs">Todos os serviços estão funcionando normalmente</p>
                      <p className="text-gray-500 text-xs mt-1">Agora</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-seguranca-graphite rounded-lg">
                    <Users className="h-5 w-5 text-blue-500" />
                    <div className="flex-1">
                      <p className="text-seguranca-lightgray text-sm font-medium">
                        Usuário logado no sistema
                      </p>
                      <p className="text-gray-400 text-xs">{user.name} acessou o dashboard</p>
                      <p className="text-gray-500 text-xs mt-1">1 minuto atrás</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-seguranca-graphite rounded-lg">
                    <Database className="h-5 w-5 text-purple-500" />
                    <div className="flex-1">
                      <p className="text-seguranca-lightgray text-sm font-medium">
                        Backup automático realizado
                      </p>
                      <p className="text-gray-400 text-xs">Backup completo do sistema concluído</p>
                      <p className="text-gray-500 text-xs mt-1">15 minutos atrás</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-seguranca-lightgray">Informações do Perfil</h2>

            {/* Perfil Principal */}
            <Card className="bg-seguranca-black border-gray-700">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                  <User className="h-5 w-5 text-seguranca-yellow" />
                  Dados da Sessão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Nome:</p>
                    <p className="text-seguranca-lightgray font-medium text-lg">{user.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Email:</p>
                    <p className="text-seguranca-lightgray font-medium">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Cargo:</p>
                    <Badge className={`${getRoleColor(user.role)} mt-1 text-sm`}>
                      {getRoleDisplayName(user.role)}
                      {user.role === 'SUPER_ADMIN' && ' 🟥'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Departamento:</p>
                    <p className="text-seguranca-lightgray font-medium">
                      {user.department || 'Não informado'}
                    </p>
                  </div>
                </div>

                {user.role === 'SUPER_ADMIN' && (
                  <div className="mt-6 p-4 bg-seguranca-graphite border border-seguranca-yellow rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-5 w-5 text-seguranca-yellow" />
                      <h3 className="text-seguranca-yellow font-semibold">Acesso Administrativo Total</h3>
                    </div>
                    <p className="text-seguranca-lightgray text-sm">
                      Como SUPER_ADMIN, você tem acesso irrestrito a todas as funcionalidades do sistema.
                      Use esse poder com responsabilidade.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Estatísticas do Usuário */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-seguranca-black border-gray-700 hover:border-blue-500 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Sessão Ativa</p>
                      <p className="text-lg font-bold text-blue-500">Online</p>
                    </div>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-seguranca-black border-gray-700 hover:border-green-500 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Último Acesso</p>
                      <p className="text-lg font-bold text-green-500">Agora</p>
                    </div>
                    <Clock className="h-5 w-5 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-seguranca-black border-gray-700 hover:border-purple-500 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Permissões</p>
                      <p className="text-lg font-bold text-purple-500">80/80</p>
                    </div>
                    <Shield className="h-5 w-5 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Ações Rápidas do Perfil */}
            <Card className="bg-seguranca-black border-gray-700">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                  <Settings className="h-5 w-5 text-seguranca-yellow" />
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray hover:bg-gray-700 hover:text-white"
                    onClick={() => navigate('/profile')}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Editar Perfil
                  </Button>

                  {user.role === 'SUPER_ADMIN' && (
                    <Button
                      variant="outline"
                      className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray hover:bg-gray-700 hover:text-white"
                      onClick={() => navigate('/configuracoes')}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configurações
                    </Button>
                  )}

                  {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'ADMINISTRADOR' || user.role === 'ROLE_ADMIN' || user.role === 'ROLE_ADMINISTRADOR') && (
                    <Button
                      variant="outline"
                      className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray hover:bg-gray-700 hover:text-white"
                      onClick={() => navigate('/usuarios')}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Gerenciar Usuários
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="bg-red-600 border-red-600 text-white hover:bg-red-700 hover:border-red-700"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Informações do Sistema */}
            <Card className="bg-seguranca-black border-gray-700">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                  <Info className="h-5 w-5 text-seguranca-yellow" />
                  Informações do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Versão do Sistema:</p>
                    <p className="text-seguranca-lightgray font-medium">v2.1.0</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Última Atualização:</p>
                    <p className="text-seguranca-lightgray font-medium">29/09/2024</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Ambiente:</p>
                    <Badge className="bg-green-100 text-green-800">Produção</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Status:</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-500 text-sm font-medium">Operacional</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Debug de permissões (apenas para SUPER_ADMIN ou desenvolvimento) - Movido para baixo */}
      <div className="mt-8">
        <PermissionDebug />
      </div>
    </StandardLayout>
  );
};

export default Index;
