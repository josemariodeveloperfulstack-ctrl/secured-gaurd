import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
// import { useResponsive } from '@/hooks/useResponsive';
import { 
  Users, 
  FileText, 
  DollarSign, 
  ClipboardList, 
  Bell, 
  AlertTriangle, 
  Key,
  Building2,
  Truck,
  Shield,
  BarChart3,
  Settings,
  User,
  Calendar,
  TrendingUp,
  Activity,
  Package,
  CreditCard,
  Banknote,
  Calculator,
  FileCheck,
  MessageSquare,
  HelpCircle,
  Smartphone,
  Monitor
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { hasPermission, hasAnyPermission, getRoleDisplayName, getRoleColor } from '@/utils/permissions';
import { UserPermissions } from '@/types/user';
// import LiveStats from './LiveStats';
// import NotificationCenter from './NotificationCenter';
// import QuickActions from './QuickActions';

interface DashboardModule {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  permissions: (keyof UserPermissions)[];
  route?: string;
  stats?: {
    label: string;
    value: string | number;
    change?: {
      value: number;
      isPositive: boolean;
    };
  }[];
}

const InteractiveDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  // const { isMobile, isTablet, isDesktop, breakpoint } = useResponsive();
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  const isMobile = windowSize.width < 768;
  const isTablet = windowSize.width >= 768 && windowSize.width < 1024;
  const isDesktop = windowSize.width >= 1024;
  const breakpoint = isMobile ? 'md' : isTablet ? 'lg' : 'xl';

  React.useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Definir módulos disponíveis baseados nas permissões
  const getAvailableModules = (): DashboardModule[] => {
    if (!user) return [];

    const allModules: DashboardModule[] = [
      {
        id: 'usuarios',
        name: 'Usuários & Grupos',
        description: 'Gerenciamento de usuários, roles e permissões',
        icon: Users,
        color: 'bg-blue-500',
        permissions: ['USERS_READ', 'USERS_WRITE', 'GROUPS_READ', 'GROUPS_WRITE'],
        route: '/usuarios',
        stats: [
          { label: 'Total de Usuários', value: 124, change: { value: 8, isPositive: true } },
          { label: 'Grupos Ativos', value: 12, change: { value: 2, isPositive: true } }
        ]
      },
      {
        id: 'clientes',
        name: 'Clientes & Contratos',
        description: 'Gestão de clientes e contratos de segurança',
        icon: Building2,
        color: 'bg-green-500',
        permissions: ['CLIENTS_READ', 'CLIENTS_WRITE', 'CONTRACTS_READ', 'CONTRACTS_WRITE'],
        route: '/clientes',
        stats: [
          { label: 'Contratos Ativos', value: 48, change: { value: 5, isPositive: true } },
          { label: 'Clientes Cadastrados', value: 35, change: { value: 3, isPositive: true } }
        ]
      },
      {
        id: 'funcionarios',
        name: 'Funcionários & RH',
        description: 'Gestão de colaboradores e recursos humanos',
        icon: Users,
        color: 'bg-purple-500',
        permissions: ['EMPLOYEES_READ', 'EMPLOYEES_WRITE', 'PAYSLIPS_READ', 'PAYSLIPS_WRITE'],
        route: '/funcionarios',
        stats: [
          { label: 'Funcionários Ativos', value: 156, change: { value: 12, isPositive: true } },
          { label: 'Férias Pendentes', value: 8, change: { value: -2, isPositive: false } }
        ]
      },
      {
        id: 'financeiro',
        name: 'Financeiro',
        description: 'Gestão financeira, pagamentos e recebimentos',
        icon: DollarSign,
        color: 'bg-yellow-500',
        permissions: ['FINANCIAL_READ', 'FINANCIAL_WRITE', 'PAYSLIPS_READ', 'PAYSLIPS_WRITE'],
        route: '/financeiro',
        stats: [
          { label: 'Receita Mensal', value: 'R$ 485.320,00', change: { value: 15, isPositive: true } },
          { label: 'Pagamentos Pendentes', value: 'R$ 54.350,00', change: { value: 5, isPositive: false } }
        ]
      },
      {
        id: 'estoque',
        name: 'Estoque & Equipamentos',
        description: 'Controle de equipamentos e materiais',
        icon: Package,
        color: 'bg-orange-500',
        permissions: ['STOCK_READ', 'STOCK_WRITE', 'EQUIPMENTS_READ', 'EQUIPMENTS_WRITE'],
        route: '/estoque',
        stats: [
          { label: 'Equipamentos', value: 245, change: { value: 8, isPositive: true } },
          { label: 'Itens em Estoque', value: 1.2, change: { value: -5, isPositive: false } }
        ]
      },
      {
        id: 'frota',
        name: 'Frota & Veículos',
        description: 'Gestão da frota de veículos',
        icon: Truck,
        color: 'bg-teal-500',
        permissions: ['EQUIPMENTS_READ', 'EQUIPMENTS_WRITE'],
        route: '/frota',
        stats: [
          { label: 'Veículos Ativos', value: 18, change: { value: 2, isPositive: true } },
          { label: 'Manutenções Pendentes', value: 3, change: { value: 1, isPositive: false } }
        ]
      },
      {
        id: 'relatorios',
        name: 'Relatórios & Analytics',
        description: 'Relatórios gerenciais e análises',
        icon: BarChart3,
        color: 'bg-indigo-500',
        permissions: ['REPORTS_READ', 'REPORTS_GENERATE'],
        route: '/relatorios',
        stats: [
          { label: 'Relatórios Gerados', value: 156, change: { value: 25, isPositive: true } },
          { label: 'Exportações Hoje', value: 8, change: { value: 3, isPositive: true } }
        ]
      },
      {
        id: 'comercial',
        name: 'Comercial & Vendas',
        description: 'Gestão de leads, propostas e orçamentos',
        icon: TrendingUp,
        color: 'bg-pink-500',
        permissions: ['LEADS_READ', 'LEADS_WRITE', 'PROPOSALS_READ', 'PROPOSALS_WRITE'],
        route: '/comercial',
        stats: [
          { label: 'Leads Ativos', value: 89, change: { value: 12, isPositive: true } },
          { label: 'Propostas Enviadas', value: 23, change: { value: 7, isPositive: true } }
        ]
      },
      {
        id: 'operacional',
        name: 'Operacional',
        description: 'Gestão operacional e escalas',
        icon: Activity,
        color: 'bg-red-500',
        permissions: ['EMPLOYEES_READ', 'CONTRACTS_READ'],
        route: '/operacional',
        stats: [
          { label: 'Postos Ativos', value: 37, change: { value: 3, isPositive: true } },
          { label: 'Escalas Hoje', value: 124, change: { value: 8, isPositive: true } }
        ]
      },
      {
        id: 'mensagens',
        name: 'Mensagens & Comunicação',
        description: 'Sistema de mensagens e notificações',
        icon: MessageSquare,
        color: 'bg-cyan-500',
        permissions: ['MESSAGES_READ', 'MESSAGES_WRITE'],
        route: '/mensagens',
        stats: [
          { label: 'Mensagens Não Lidas', value: 12, change: { value: -3, isPositive: true } },
          { label: 'Notificações Hoje', value: 8, change: { value: 2, isPositive: true } }
        ]
      },
      {
        id: 'suporte',
        name: 'Suporte & Help Desk',
        description: 'Sistema de suporte técnico',
        icon: HelpCircle,
        color: 'bg-gray-500',
        permissions: ['SUPPORT_READ', 'SUPPORT_WRITE'],
        route: '/suporte',
        stats: [
          { label: 'Tickets Abertos', value: 5, change: { value: -2, isPositive: true } },
          { label: 'Resolvidos Hoje', value: 12, change: { value: 4, isPositive: true } }
        ]
      },
      {
        id: 'sistema',
        name: 'Sistema & Configurações',
        description: 'Configurações do sistema e administração',
        icon: Settings,
        color: 'bg-slate-500',
        permissions: ['SYSTEM_CONFIG', 'SYSTEM_LOGS'],
        route: '/configuracoes',
        stats: [
          { label: 'Sistema Online', value: '99.9%', change: { value: 0.1, isPositive: true } },
          { label: 'Backups Realizados', value: 7, change: { value: 1, isPositive: true } }
        ]
      }
    ];

    // Filtrar módulos baseado nas permissões do usuário
    return allModules.filter(module => 
      hasAnyPermission(user.permissions, module.permissions)
    );
  };

  const availableModules = getAvailableModules();

  // Renderizar card de módulo
  const renderModuleCard = (module: DashboardModule) => (
    <Card 
      key={module.id} 
      className="bg-seguranca-black/60 border border-gray-800 rounded-xl shadow-sm hover:border-seguranca-yellow/60 transition-colors cursor-pointer group"
      onClick={() => module.route && navigate(module.route)}
    >
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className={`p-3 rounded-lg ${module.color} group-hover:scale-110 transition-transform`}>
            <module.icon className="h-6 w-6 text-white" />
          </div>
          <Badge variant="secondary" className="text-xs bg-seguranca-black/40 border-gray-700 text-seguranca-lightgray">
            {module.stats?.length || 0} métricas
          </Badge>
        </div>
        <CardTitle className="text-seguranca-lightgray text-lg group-hover:text-seguranca-yellow transition-colors">
          {module.name}
        </CardTitle>
        <p className="text-gray-400 text-sm leading-relaxed">{module.description}</p>
      </CardHeader>
      <CardContent className="pt-0">
        {module.stats && module.stats.length > 0 && (
          <div className="space-y-3">
            {module.stats.slice(0, 2).map((stat, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">{stat.label}</span>
                <div className="text-right">
                  <span className="text-seguranca-lightgray font-semibold">{stat.value}</span>
                  {stat.change && (
                    <div className={`text-xs flex items-center gap-1 ${
                      stat.change.isPositive ? 'text-green-400' : 'text-red-400'
                    }`}>
                      <TrendingUp className={`h-3 w-3 ${
                        stat.change.isPositive ? '' : 'rotate-180'
                      }`} />
                      {stat.change.value}%
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Renderizar perfil do usuário
  const renderUserProfile = () => (
    <Card className="bg-seguranca-black/60 border border-gray-800 rounded-xl shadow-sm">
      <CardHeader className="text-center pb-4 space-y-4">
        <div className="flex justify-center mb-2">
          <Avatar className="h-20 w-20 border-2 border-seguranca-yellow/80">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-seguranca-yellow text-black text-xl font-bold">
              {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-seguranca-lightgray text-xl">{user?.name}</CardTitle>
        <Badge className={`${getRoleColor(user?.role || 'COLABORADOR')} border-0`}>
          {getRoleDisplayName(user?.role || 'COLABORADOR')}
        </Badge>
        <p className="text-gray-400 text-sm mt-2">{user?.email}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-seguranca-yellow">
              {availableModules.length}
            </div>
            <div className="text-xs text-gray-400">Módulos Acessíveis</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-seguranca-yellow">
              {user?.permissions ? Object.values(user.permissions).filter(Boolean).length : 0}
            </div>
            <div className="text-xs text-gray-400">Permissões Ativas</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Renderizar resumo geral
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Estatísticas em tempo real */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-seguranca-black/60 border border-gray-800 rounded-xl shadow-sm hover:border-seguranca-yellow/60 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total de Usuários</p>
                <p className="text-2xl font-bold text-seguranca-lightgray">124</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
              <span className="text-green-400 text-sm">+8% este mês</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-black/60 border border-gray-800 rounded-xl shadow-sm hover:border-seguranca-yellow/60 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Contratos Ativos</p>
                <p className="text-2xl font-bold text-seguranca-lightgray">48</p>
              </div>
              <FileText className="h-8 w-8 text-green-500" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
              <span className="text-green-400 text-sm">+5% este mês</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-black/60 border border-gray-800 rounded-xl shadow-sm hover:border-seguranca-yellow/60 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Receita Mensal</p>
                <p className="text-2xl font-bold text-seguranca-yellow">R$ 485.320</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
              <span className="text-green-400 text-sm">+15% este mês</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-black/60 border border-gray-800 rounded-xl shadow-sm hover:border-seguranca-yellow/60 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Equipamentos</p>
                <p className="text-2xl font-bold text-seguranca-lightgray">245</p>
              </div>
              <Package className="h-8 w-8 text-orange-500" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
              <span className="text-green-400 text-sm">+8% este mês</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-seguranca-black/60 border border-gray-800 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
              <Bell className="h-5 w-5 text-seguranca-yellow" />
              Notificações Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-seguranca-black/40 border border-gray-800 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-seguranca-lightgray text-sm font-medium">
                    Contrato a vencer
                  </p>
                  <p className="text-gray-400 text-xs">
                    Contrato #2458 com Shopping Center Norte vencerá em 7 dias
                  </p>
                  <p className="text-gray-500 text-xs mt-1">2 horas atrás</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-seguranca-black/40 border border-gray-800 rounded-lg">
                <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-seguranca-lightgray text-sm font-medium">
                    Novo funcionário
                  </p>
                  <p className="text-gray-400 text-xs">
                    João Silva foi cadastrado no sistema
                  </p>
                  <p className="text-gray-500 text-xs mt-1">4 horas atrás</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-seguranca-black/60 border border-gray-800 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
              <Activity className="h-5 w-5 text-seguranca-yellow" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-seguranca-black/40 border border-gray-800 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-seguranca-lightgray text-sm">
                  Equipamento EQ-001 atribuído a João Silva
                </span>
                <span className="text-xs text-gray-500 ml-auto">2h atrás</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-seguranca-black/40 border border-gray-800 rounded-lg">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-seguranca-lightgray text-sm">
                  Alerta: Arma AR-002 vencendo em 15 dias
                </span>
                <span className="text-xs text-gray-500 ml-auto">4h atrás</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-seguranca-black/40 border border-gray-800 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-seguranca-lightgray text-sm">
                  Nova escala criada para Portaria Principal
                </span>
                <span className="text-xs text-gray-500 ml-auto">6h atrás</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-seguranca-yellow"></div>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="space-y-6">
        <Card className="bg-seguranca-black/60 border border-gray-800 rounded-2xl shadow-sm">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-seguranca-yellow animate-pulse" />
                <span className="text-xs uppercase tracking-wide text-gray-500">Dashboard</span>
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-semibold text-seguranca-lightgray">
                  Bem-vindo, {user?.name || 'usuário'}!
                </h1>
                <p className="text-gray-400 text-sm sm:text-base">
                  Acompanhe métricas, módulos liberados e atividades recentes em um só lugar.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-seguranca-yellow/15 text-seguranca-yellow border-seguranca-yellow/40">
                  {getRoleDisplayName(user?.role || 'COLABORADOR')}
                </Badge>
                <Badge variant="outline" className="border-gray-700 text-gray-300">
                  {availableModules.length} módulos ativos
                </Badge>
              </div>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-3 w-full sm:w-auto">
              <Button
                className="w-full sm:w-auto bg-seguranca-yellow/20 border border-seguranca-yellow/50 text-seguranca-yellow hover:bg-seguranca-yellow/30"
                onClick={() =>
                  toast({
                    title: 'Dashboard atualizado',
                    description: 'As métricas foram atualizadas com sucesso.',
                  })
                }
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Atualizar métricas
              </Button>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {isMobile ? (
                  <Smartphone className="h-4 w-4" />
                ) : (
                  <Monitor className="h-4 w-4" />
                )}
                <span className="font-medium text-gray-300">
                  {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}
                </span>
                <span className="text-gray-500">({breakpoint})</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <TabsList className="flex w-full gap-2 bg-seguranca-black/40 border border-gray-800 rounded-xl p-1 overflow-x-auto sm:grid sm:grid-cols-2 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
              <TabsTrigger 
                value="overview" 
                className="flex-1 min-w-[150px] sm:min-w-0 justify-center whitespace-nowrap rounded-lg py-2 sm:py-2.5 text-xs sm:text-sm text-seguranca-lightgray data-[state='active']:bg-seguranca-yellow data-[state='active']:text-black"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger 
                value="modules" 
                className="flex-1 min-w-[150px] sm:min-w-0 justify-center whitespace-nowrap rounded-lg py-2 sm:py-2.5 text-xs sm:text-sm text-seguranca-lightgray data-[state='active']:bg-seguranca-yellow data-[state='active']:text-black"
              >
                <Package className="h-4 w-4 mr-2" />
                Módulos
              </TabsTrigger>
              <TabsTrigger 
                value="profile" 
                className="flex-1 min-w-[150px] sm:min-w-0 justify-center whitespace-nowrap rounded-lg py-2 sm:py-2.5 text-xs sm:text-sm text-seguranca-lightgray data-[state='active']:bg-seguranca-yellow data-[state='active']:text-black"
              >
                <User className="h-4 w-4 mr-2" />
                Perfil
              </TabsTrigger>
              <TabsTrigger 
                value="activity" 
                className="flex-1 min-w-[150px] sm:min-w-0 justify-center whitespace-nowrap rounded-lg py-2 sm:py-2.5 text-xs sm:text-sm text-seguranca-lightgray data-[state='active']:bg-seguranca-yellow data-[state='active']:text-black"
              >
                <Activity className="h-4 w-4 mr-2" />
                Atividade
              </TabsTrigger>
            </TabsList>
          </CardContent>
        </Card>

        <TabsContent value="overview" className="mt-5">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="modules" className="mt-5">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-seguranca-lightgray">
                  Módulos Disponíveis
                </h2>
                <p className="text-gray-400 text-sm">
                  {availableModules.length} módulos acessíveis baseados nas suas permissões
                </p>
              </div>
              <Badge variant="secondary" className="text-seguranca-yellow border-seguranca-yellow">
                {availableModules.length} módulos
              </Badge>
            </div>
            
            <div className={`grid gap-4 ${
              isMobile ? 'grid-cols-1' : 
              isTablet ? 'grid-cols-2' : 
              isDesktop ? 'grid-cols-3' : 'grid-cols-4'
            }`}>
              {availableModules.map(renderModuleCard)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              {renderUserProfile()}
            </div>
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-seguranca-black/60 border border-gray-800 rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-seguranca-lightgray">Permissões do Usuário</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {user.permissions && Object.entries(user.permissions)
                      .filter(([_, value]) => value)
                      .map(([permission, _]) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-seguranca-black/60 border border-gray-800 rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-seguranca-lightgray">Informações da Sessão</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Último Login:</span>
                    <span className="text-seguranca-lightgray">
                      {new Date().toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">IP de Acesso:</span>
                    <span className="text-seguranca-lightgray">192.168.1.100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Dispositivo:</span>
                    <span className="text-seguranca-lightgray">
                      {isMobile ? 'Mobile' : 'Desktop'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-5">
          <Card className="bg-seguranca-black/60 border border-gray-800 rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                <Activity className="h-5 w-5 text-seguranca-yellow" />
                Log de Atividades Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { action: 'Login realizado', time: 'Agora', icon: '🔐' },
                  { action: 'Visualizou relatório financeiro', time: '5 min atrás', icon: '📊' },
                  { action: 'Atualizou dados do cliente ABC Corp', time: '1 hora atrás', icon: '✏️' },
                  { action: 'Gerou relatório de medições', time: '2 horas atrás', icon: '📄' },
                  { action: 'Cadastrou novo funcionário', time: '3 horas atrás', icon: '👤' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-seguranca-black/40 border border-gray-800 rounded-lg">
                    <span className="text-lg">{activity.icon}</span>
                    <div className="flex-1">
                      <p className="text-seguranca-lightgray text-sm">{activity.action}</p>
                      <p className="text-gray-500 text-xs">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </div>
    </Tabs>
  );
};

export default InteractiveDashboard;
