import React from 'react';
import { useLocation } from 'react-router-dom';
import Logo from './Logo';
import { useScrollPreservation } from '@/hooks/useScrollPreservation';
import { ScrollPreservingLink } from './ScrollPreservingLink';
import {
  BarChart3,
  FileText,
  Calendar,
  Users,
  User2,
  ClipboardList,
  DollarSign,
  FileSpreadsheet,
  Building2,
  Settings,
  Truck,
  Shield,
  PieChart,
  Database,
  Activity,
  MapPin,
  Route,
  Camera,
  Briefcase,
  Stethoscope,
  HardHat,
  AlertTriangle,
  Phone,
  Clock,
  UserCog,
  MessageSquare,
  Mail,
  Bell,
  Headphones,
  CreditCard,
  Receipt,
  TrendingUp,
  Calculator,
  Banknote,
  Wallet,
  ArrowUpDown,
  Target,
  Megaphone,
  Package,
  ShoppingCart,
  CheckCircle,
  FolderTree,
  Files,
  GraduationCap,
  Plus
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/utils/permissions';
import { UserRole } from '@/types/user';

interface MenuItem {
  icon: LucideIcon;
  text: string;
  to: string;
  id: string;
  requiredPermission?: string;
  role?: string;
  color?: string;
}

/**
 * RH e DEPARTAMENTO_PESSOAL — itens operacionais bloqueados.
 */
const RH_DP_FORBIDDEN_OPERATIONAL_IDS = new Set<string>([
  'operacional',
  'controle-visitas',
  'controle-visitas-avancado',
  'guia-transporte',
  'servicos',
  'rota-semanal-supervisao',
  'equipamentos',
  'troca-plantao',
  'supervisao',
  'facial-login',
  'supervisao-visitas',
  'supervisao-rotas',
  'supervisao-relatorios',
  'supervisao-biometria',
]);

/**
 * RH e DEPARTAMENTO_PESSOAL — itens financeiros/fiscais bloqueados.
 */
const RH_DP_FORBIDDEN_FINANCIAL_IDS = new Set<string>([
  'modulo-financeiro',
  'gestao-financeira-dashboard',
  'gestao-financeira-contas-pagar',
  'gestao-financeira-contas-receber',
  'gestao-financeira-fluxo-caixa',
  'gestao-financeira-movimentacoes',
  'gestao-financeira-conciliacao',
  'gestao-financeira-relatorios',
  'gestao-financeira-orcamento',
  'gestao-financeira-centros-custo',
  'gestao-patrimonial',
  'modulo-fiscal',
]);

/**
 * ADMIN / ADMINISTRADOR — itens de sistema sensíveis bloqueados.
 */
const ADMIN_FORBIDDEN_SYSTEM_IDS = new Set<string>([
  'atividades',
  'sistema',
  'configuracoes',
  'whatsapp-connection',
  'backup',
]);

/**
 * SUPERVISOR — bloqueio explícito (defesa em profundidade).
 * Mesmo com o whitelist `ROLE_ALLOWED_ITEM_IDS.SUPERVISOR`, mantemos este conjunto
 * para evitar regressões caso novos itens sejam adicionados ao menu ou permissões
 * extras venham de grupos combinados.
 */
const SUPERVISOR_FORBIDDEN_ITEM_IDS = new Set<string>([
  // Módulo Financeiro
  'modulo-financeiro',
  'gestao-financeira-dashboard',
  'gestao-financeira-contas-pagar',
  'gestao-financeira-contas-receber',
  'gestao-financeira-fluxo-caixa',
  'gestao-financeira-movimentacoes',
  'gestao-financeira-conciliacao',
  'gestao-financeira-relatorios',
  'gestao-financeira-orcamento',
  'gestao-financeira-centros-custo',
  'gestao-patrimonial',
  'modulo-fiscal',
  // Módulo Comercial
  'leads', 'marketing', 'propostas', 'orcamentos', 'contratos', 'crm',
  'commercial-dashboard',
  // Compras / Estoque / Suprimentos
  'compras', 'compras-solicitacoes', 'compras-aprovacoes', 'compras-cotacoes', 'compras-relatorios',
  'estoque', 'estoque-simplificado',
  // Folha / Holerites (RH / DPE)
  'holerites', 'documentos-unificados', 'unificados-por-setor', 'payrolls', 'envio-holerites',
  // Administração / Sistema
  'usuarios', 'grupos', 'sistema', 'configuracoes', 'atividades',
  'whatsapp-connection', 'backup',
  // Empresas / Filiais / Fornecedores
  'empresas', 'filiais', 'clientes', 'fornecedores',
  // RH SST (responsabilidade do RH)
  'rh-sst', 'rh-sst-exames', 'rh-sst-epis', 'rh-sst-acidentes',
  'rh-sst-treinamentos', 'rh-sst-inspecoes', 'rh-sst-cipa', 'rh-sst-relatorios',
]);

const ROLE_ALLOWED_ITEM_IDS: Partial<Record<UserRole, Set<string>>> = {
  COLABORADOR: new Set([
    'dashboard',
    'meus-holerites',
    'mensagens',
    'chat-interno',
  ]),
  ALMOXARIFADO: new Set([
    'dashboard',
    'compras',
    'compras-solicitacoes',
    'compras-aprovacoes',
    'compras-cotacoes',
    'compras-relatorios',
    'estoque',
    'estoque-simplificado',
    'mensagens',
    'chat-interno',
  ]),
  ESTOQUE: new Set([
    'dashboard',
    'estoque',
    'estoque-simplificado',
    'mensagens',
    'chat-interno',
  ]),
  COMPRAS: new Set([
    'dashboard',
    'compras',
    'compras-solicitacoes',
    'compras-aprovacoes',
    'compras-cotacoes',
    'compras-relatorios',
    'mensagens',
    'chat-interno',
  ]),
  SUPRIMENTOS: new Set([
    'dashboard',
    'holerites',
    'modulo-financeiro',
    'gestao-financeira-dashboard',
    'gestao-financeira-contas-pagar',
    'gestao-financeira-fluxo-caixa',
    'gestao-financeira-relatorios',
    'gestao-financeira-centros-custo',
    'estoque',
    'estoque-simplificado',
    'compras',
    'compras-solicitacoes',
    'compras-aprovacoes',
    'compras-cotacoes',
    'compras-relatorios',
    'mensagens',
    'chat-interno',
  ]),
  // 🟩 SUPERVISOR — APENAS módulo operacional, supervisão de visitas e comunicação.
  // ❌ NÃO tem acesso a Financeiro, Comercial, Holerites/Folha, RH SST, Compras, Estoque, Admin.
  SUPERVISOR: new Set([
    // Principal / Operacional core
    'dashboard',
    'operacional',
    'controle-visitas',
    'controle-visitas-avancado',
    'guia-transporte',
    'postos',
    'funcionarios',
    'operacional-servicos',
    'equipamentos',
    'troca-plantao',
    'rota-semanal-supervisao',
    // Supervisão (Ondas 4 e 6)
    'supervisao',
    'supervisor-dashboard',
    'supervisor-nova-visita',
    'facial-login',
    'supervisao-visitas',
    'supervisao-rotas',
    'supervisao-relatorios',
    // Frota (uso operacional, ex.: veículos para a visita)
    'frota',
    // Relatórios operacionais + perfil + comunicação
    'relatorios',
    'meus-holerites',
    'mensagens',
    'chat-interno',
    'suporte',
  ]),
};

export function DynamicSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { forceScrollToTop } = useScrollPreservation();

  console.log('🔍 DynamicSidebar - Iniciando componente');
  console.log('🔍 DynamicSidebar - Usuário:', user);

  // Menu completo com permissões
  const allMenuItems: MenuItem[] = [
    {
      icon: BarChart3,
      text: 'Dashboard',
      to: '/dashboard',
      id: 'dashboard',
      requiredPermission: 'DASHBOARD_READ'
    },
    {
      icon: Shield,
      text: 'Operacional',
      to: '/operacional',
      id: 'operacional',
      requiredPermission: 'EMPLOYEES_READ'
    },
    {
      icon: MapPin,
      text: 'Controle de Visitas',
      to: '/controle-visitas-avancado',
      id: 'controle-visitas',
      requiredPermission: 'EMPLOYEES_READ'
    },
    {
      icon: FileText,
      text: 'Guia de Transporte',
      to: '/guia-transporte',
      id: 'guia-transporte',
      requiredPermission: 'EMPLOYEES_READ'
    },
    {
      icon: FileText,
      text: 'Contratos',
      to: '/contratos',
      id: 'contratos',
      requiredPermission: 'CONTRACTS_READ'
    },
    {
      icon: Megaphone,
      text: 'Marketing',
      to: '/comercial/marketing',
      id: 'marketing',
      requiredPermission: 'LEADS_READ'
    },

    {
      icon: Building2,
      text: 'Clientes',
      to: '/clientes',
      id: 'clientes',
      requiredPermission: 'CLIENTS_READ'
    },
    {
      icon: User2,
      text: 'Funcionários',
      to: '/funcionarios',
      id: 'funcionarios',
      requiredPermission: 'EMPLOYEES_READ'
    },
    {
      icon: MapPin,
      text: 'Postos de Trabalho',
      to: '/postos',
      id: 'postos',
      requiredPermission: 'EMPLOYEES_READ'
    },
    {
      icon: Settings,
      text: 'Funções',
      to: '/rh/funcoes',
      id: 'rh-funcoes',
      requiredPermission: 'EMPLOYEES_READ'
    },
    {
      icon: Briefcase,
      text: 'Cargos',
      to: '/rh/cargos',
      id: 'rh-cargos',
      requiredPermission: 'EMPLOYEES_READ'
    },
    {
      icon: FileText,
      text: 'Gestão de Documentos',
      to: '/rh/gestao-documentos',
      id: 'rh-gestao-documentos',
      requiredPermission: 'EMPLOYEES_READ'
    },
    {
      icon: ClipboardList,
      text: 'Serviços',
      to: '/operacional?tab=servicos',
      id: 'operacional-servicos',
      requiredPermission: 'CONTRACTS_READ'
    },

    // ===== SUPERVISÃO DENTRO DO OPERACIONAL =====
    {
      icon: Shield,
      text: 'Painel do Supervisor',
      to: '/supervisor/dashboard',
      id: 'supervisor-dashboard',
      requiredPermission: 'EMPLOYEES_READ'
    },
    {
      icon: Plus,
      text: 'Nova Visita (Supervisor)',
      to: '/supervisao/visitas/nova',
      id: 'supervisor-nova-visita',
      requiredPermission: 'EMPLOYEES_READ'
    },
    {
      icon: Shield,
      text: 'Supervisão Principal',
      to: '/supervisao',
      id: 'supervisao',
      requiredPermission: 'EMPLOYEES_READ'
    },
    {
      icon: Camera,
      text: 'Login Facial',
      to: '/facial-login',
      id: 'facial-login',
      requiredPermission: 'EMPLOYEES_READ'
    },
    {
      icon: MapPin,
      text: 'Visitas Supervisionadas',
      to: '/supervisao/visitas',
      id: 'supervisao-visitas',
      requiredPermission: 'EMPLOYEES_READ'
    },
    {
      icon: Route,
      text: 'Rotas Otimizadas',
      to: '/supervisao/rotas',
      id: 'supervisao-rotas',
      requiredPermission: 'EMPLOYEES_READ'
    },
    {
      icon: BarChart3,
      text: 'Relatórios de Supervisão',
      to: '/supervisao/relatorios',
      id: 'supervisao-relatorios',
      requiredPermission: 'REPORTS_READ'
    },

    // ===== NOVO MÓDULO FINANCEIRO REORGANIZADO =====
    {
      icon: DollarSign,
      text: 'Módulo Financeiro',
      to: '/financeiro-novo',
      id: 'modulo-financeiro',
      requiredPermission: 'VIEW_FINANCIAL'
    },

    // ===== GESTÃO FINANCEIRA LEGACY =====
    {
      icon: BarChart3,
      text: 'Dashboard Financeiro',
      to: '/gestao-financeira/dashboard',
      id: 'gestao-financeira-dashboard',
      requiredPermission: 'FINANCIAL_READ'
    },
    {
      icon: CreditCard,
      text: 'Contas a Pagar',
      to: '/gestao-financeira/contas-pagar',
      id: 'gestao-financeira-contas-pagar',
      requiredPermission: 'FINANCIAL_READ'
    },
    {
      icon: Receipt,
      text: 'Contas a Receber',
      to: '/gestao-financeira/contas-receber',
      id: 'gestao-financeira-contas-receber',
      requiredPermission: 'FINANCIAL_RECEIVABLE_WRITE'
    },
    {
      icon: ArrowUpDown,
      text: 'Fluxo de Caixa',
      to: '/gestao-financeira/fluxo-caixa',
      id: 'gestao-financeira-fluxo-caixa',
      requiredPermission: 'FINANCIAL_READ'
    },
    {
      icon: Banknote,
      text: 'Movimentações Bancárias',
      to: '/gestao-financeira/movimentacoes',
      id: 'gestao-financeira-movimentacoes',
      requiredPermission: 'FINANCIAL_READ'
    },
    {
      icon: Calculator,
      text: 'Conciliação Bancária',
      to: '/gestao-financeira/conciliacao',
      id: 'gestao-financeira-conciliacao',
      requiredPermission: 'FINANCIAL_WRITE'
    },
    {
      icon: TrendingUp,
      text: 'Relatórios Financeiros',
      to: '/gestao-financeira/relatorios',
      id: 'gestao-financeira-relatorios',
      requiredPermission: 'FINANCIAL_READ'
    },
    {
      icon: Target,
      text: 'Orçamento e Metas',
      to: '/gestao-financeira/orcamento',
      id: 'gestao-financeira-orcamento',
      requiredPermission: 'FINANCIAL_MANAGE'
    },
    {
      icon: Wallet,
      text: 'Centros de Custo',
      to: '/gestao-financeira/centros-custo',
      id: 'gestao-financeira-centros-custo',
      requiredPermission: 'FINANCIAL_MANAGE'
    },

    {
      icon: FileSpreadsheet,
      text: 'Holerites',
      to: '/holerites',
      id: 'holerites',
      requiredPermission: 'PAYSLIPS_READ'
    },
    {
      icon: Receipt,
      text: 'Meus Documentos',
      to: '/meus-holerites',
      id: 'meus-holerites',
      requiredPermission: 'PAYSLIPS_READ',
      role: 'COLABORADOR'
    },
    {
      icon: Files,
      text: 'Documentos Unificados',
      to: '/documentos-unificados',
      id: 'documentos-unificados',
      requiredPermission: 'PAYSLIPS_READ'
    },
    {
      icon: FolderTree,
      text: 'Unificados por Setor',
      to: '/unificados-por-setor',
      id: 'unificados-por-setor',
      requiredPermission: 'PAYSLIPS_READ'
    },
    {
      icon: FileSpreadsheet,
      text: 'Folha de Pagamento',
      to: '/payrolls',
      id: 'payrolls',
      requiredPermission: 'PAYSLIPS_READ'
    },

    // ===== MÓDULO SST - SAÚDE E SEGURANÇA DO TRABALHO =====
    {
      icon: Shield,
      text: 'Controle SST',
      to: '/rh/sst',
      id: 'rh-sst',
      requiredPermission: 'EMPLOYEES_READ'
    },
    {
      icon: Stethoscope,
      text: 'Exames Médicos',
      to: '/rh/sst/exames',
      id: 'rh-sst-exames',
      requiredPermission: 'EMPLOYEES_READ'
    },
    {
      icon: HardHat,
      text: 'EPIs',
      to: '/rh/sst/epis',
      id: 'rh-sst-epis',
      requiredPermission: 'EMPLOYEES_READ'
    },
    {
      icon: AlertTriangle,
      text: 'Acidentes',
      to: '/rh/sst/acidentes',
      id: 'rh-sst-acidentes',
      requiredPermission: 'EMPLOYEES_READ'
    },
    {
      icon: GraduationCap,
      text: 'Treinamentos SST',
      to: '/rh/sst/treinamentos',
      id: 'rh-sst-treinamentos',
      requiredPermission: 'EMPLOYEES_READ'
    },
    // {
    //   icon: FileCheck,
    //   text: 'Inspeções',
    //   to: '/rh/sst/inspecoes', // TODO: Implementar
    //   id: 'rh-sst-inspecoes',
    //   requiredPermission: 'EMPLOYEES_READ'
    // },
    {
      icon: Users,
      text: 'CIPA',
      to: '/rh/sst/cipa',
      id: 'rh-sst-cipa',
      requiredPermission: 'EMPLOYEES_READ'
    },
    {
      icon: BarChart3,
      text: 'Relatórios SST',
      to: '/rh/sst/relatorios',
      id: 'rh-sst-relatorios',
      requiredPermission: 'EMPLOYEES_READ'
    },
    {
      icon: Truck,
      text: 'Frota',
      to: '/frota',
      id: 'frota',
      requiredPermission: 'FINANCIAL_READ'
    },
    {
      icon: Building2,
      text: 'Filiais',
      to: '/filiais',
      id: 'filiais',
      requiredPermission: 'CLIENTS_READ'
    },
    {
      icon: Package,
      text: 'Gestão Patrimonial',
      to: '/gestao-patrimonial',
      id: 'gestao-patrimonial',
      requiredPermission: 'PATRIMONIAL_READ'
    },
    {
      icon: PieChart,
      text: 'Relatórios',
      to: '/relatorios',
      id: 'relatorios',
      requiredPermission: 'REPORTS_READ'
    },

    {
      icon: Activity,
      text: 'Gestão de Atividades',
      to: '/atividades',
      id: 'atividades',
      requiredPermission: 'AUDIT_READ'
    },
    {
      icon: Users,
      text: 'Usuários',
      to: '/usuarios',
      id: 'usuarios',
      requiredPermission: 'USERS_READ'
    },
    {
      icon: Database,
      text: 'Grupos',
      to: '/grupos',
      id: 'grupos',
      requiredPermission: 'GROUPS_READ'
    },
    {
      icon: Activity,
      text: 'Sistema',
      to: '/sistema',
      id: 'sistema',
      requiredPermission: 'SYSTEM_CONFIG'
    },
    {
      icon: Settings,
      text: 'Configurações',
      to: '/configuracoes',
      id: 'configuracoes',
      requiredPermission: 'SYSTEM_CONFIG'
    },

    // ===== CENTRAL DE SUPORTE =====
    {
      icon: Headphones,
      text: 'Central de Suporte',
      to: '/suporte',
      id: 'suporte',
      requiredPermission: 'SUPPORT_READ'
    },

    // ===== GESTÃO DE ATENDIMENTO =====
    {
      icon: Phone,
      text: 'Dashboard de Atendimento',
      to: '/gestao-atendimento/dashboard',
      id: 'gestao-atendimento-dashboard',
      requiredPermission: 'SUPPORT_READ'
    },
    {
      icon: Clock,
      text: 'Histórico de Conversas',
      to: '/gestao-atendimento/historico',
      id: 'gestao-atendimento-historico',
      requiredPermission: 'SUPPORT_READ'
    },
    {
      icon: UserCog,
      text: 'Gerenciar Agentes',
      to: '/gestao-atendimento/agentes',
      id: 'gestao-atendimento-agentes',
      requiredPermission: 'SUPPORT_MANAGE'
    },
    {
      icon: BarChart3,
      text: 'Métricas de Atendimento',
      to: '/gestao-atendimento/metricas',
      id: 'gestao-atendimento-metricas',
      requiredPermission: 'REPORTS_READ'
    },
    {
      icon: Settings,
      text: 'Configurações do Chatbot',
      to: '/gestao-atendimento/chatbot',
      id: 'gestao-atendimento-chatbot',
      requiredPermission: 'SUPPORT_MANAGE'
    },

    // ===== GESTÃO DE MENSAGENS INTERNAS =====
    {
      icon: Mail,
      text: 'Caixa de Entrada',
      to: '/gestao-mensagens/inbox',
      id: 'gestao-mensagens-inbox',
      requiredPermission: 'MESSAGES_READ'
    },
    {
      icon: MessageSquare,
      text: 'Enviar Mensagem',
      to: '/gestao-mensagens/enviar',
      id: 'gestao-mensagens-enviar',
      requiredPermission: 'MESSAGES_WRITE'
    },
    {
      icon: Users,
      text: 'Grupos de Mensagens',
      to: '/gestao-mensagens/grupos',
      id: 'gestao-mensagens-grupos',
      requiredPermission: 'MESSAGES_MANAGE'
    },
    {
      icon: Bell,
      text: 'Notificações',
      to: '/gestao-mensagens/notificacoes',
      id: 'gestao-mensagens-notificacoes',
      requiredPermission: 'MESSAGES_READ'
    },
    {
      icon: Settings,
      text: 'Configurações de Mensagens',
      to: '/gestao-mensagens/configuracoes',
      id: 'gestao-mensagens-configuracoes',
      requiredPermission: 'MESSAGES_MANAGE'
    },

    // ===== COMUNICAÇÃO INTERNA =====
    {
      icon: MessageSquare,
      text: 'Mensagens',
      to: '/mensagens',
      id: 'mensagens',
      requiredPermission: 'MESSAGES_READ'
    },
    {
      icon: MessageSquare,
      text: 'Chat Interno',
      to: '/chat-interno',
      id: 'chat-interno',
      requiredPermission: 'MESSAGES_READ'
    },

    // ===== MÓDULO DE COMPRAS =====
    {
      icon: ShoppingCart,
      text: 'Gestão de Compras',
      to: '/compras',
      id: 'compras',
      requiredPermission: 'FINANCIAL_READ'
    },
    {
      icon: FileText,
      text: 'Solicitações de Compra',
      to: '/compras/solicitacoes',
      id: 'compras-solicitacoes',
      requiredPermission: 'FINANCIAL_WRITE'
    },
    {
      icon: CheckCircle,
      text: 'Aprovações de Compra',
      to: '/compras/aprovacoes',
      id: 'compras-aprovacoes',
      requiredPermission: 'FINANCIAL_MANAGE'
    },
    {
      icon: Calculator,
      text: 'Cotações de Compra',
      to: '/compras/cotacoes',
      id: 'compras-cotacoes',
      requiredPermission: 'FINANCIAL_READ'
    },
    {
      icon: BarChart3,
      text: 'Relatórios de Compras',
      to: '/compras/relatorios',
      id: 'compras-relatorios',
      requiredPermission: 'REPORTS_READ'
    },
  ];

  // Organizar itens em grupos para melhor navegação
  const getMenuGroups = () => {
    let filteredItems = getFilteredMenuItems();

    if (user) {
      const allowedSet = ROLE_ALLOWED_ITEM_IDS[user.role as UserRole];
      if (allowedSet) {
        filteredItems = filteredItems.filter((item) => allowedSet.has(item.id));
      }
    }

    const groups = {
      principal: filteredItems.filter(item =>
        ['dashboard', 'operacional', 'controle-visitas', 'guia-transporte'].includes(item.id)
      ),
      rh: filteredItems.filter(item =>
        ['rh', 'rh-funcionarios', 'rh-vagas', 'rh-remanejamentos', 'rh-ferias', 'rh-ocorrencias', 'rh-beneficios', 'rh-funcoes', 'rh-cargos', 'postos', 'rh-epis', 'rh-ordens-servico', 'rh-admissao-demissao', 'rh-admissao-funcionarios', 'rh-relatorios', 'rh-gestao-documentos', 'envio-holerites'].includes(item.id)
      ),
      sst: filteredItems.filter(item =>
        ['rh-sst', 'rh-sst-exames', 'rh-sst-epis', 'rh-sst-acidentes', 'rh-sst-treinamentos', 'rh-sst-inspecoes', 'rh-sst-cipa', 'rh-sst-relatorios'].includes(item.id)
      ),
      financeiro: filteredItems.filter(item =>
        ['modulo-financeiro', 'gestao-financeira-dashboard', 'gestao-financeira-contas-pagar', 'gestao-financeira-contas-receber', 'gestao-financeira-fluxo-caixa', 'gestao-financeira-movimentacoes', 'gestao-financeira-conciliacao', 'gestao-financeira-relatorios', 'gestao-financeira-orcamento', 'gestao-financeira-centros-custo', 'gestao-patrimonial'].includes(item.id)
      ),
      operacional: filteredItems.filter(item =>
        [
          'servicos', 'controle-visitas-avancado', 'rota-semanal-supervisao',
          'equipamentos', 'troca-plantao',
          // Supervisão (Onda 4 e 6) — visíveis para Supervisor e gestores
          'supervisao', 'supervisor-dashboard', 'supervisor-nova-visita',
          'facial-login', 'supervisao-visitas', 'supervisao-rotas', 'supervisao-relatorios',
          'supervisao-biometria',
          // Itens operacionais essenciais para o Supervisor
          'funcionarios', 'postos', 'operacional-servicos',
        ].includes(item.id)
      ),
      empresas: filteredItems.filter(item =>
        ['empresas', 'filiais', 'clientes', 'fornecedores'].includes(item.id)
      ),
      comercial: filteredItems.filter(item =>
        ['leads', 'marketing', 'propostas', 'orcamentos', 'contratos', 'crm'].includes(item.id)
      ),
      compras: filteredItems.filter(item =>
        ['compras', 'compras-solicitacoes', 'compras-aprovacoes', 'compras-cotacoes', 'compras-relatorios'].includes(item.id)
      ),
      estoque: filteredItems.filter(item =>
        ['estoque', 'estoque-simplificado'].includes(item.id)
      ),
      frota: filteredItems.filter(item =>
        ['frota'].includes(item.id)
      ),
      holerites: filteredItems.filter(item =>
        ['holerites', 'meus-holerites', 'documentos-unificados', 'unificados-por-setor', 'payrolls'].includes(item.id)
      ),
      mensagens: filteredItems.filter(item =>
        ['mensagens', 'chat-interno', 'gestao-mensagens', 'gestao-mensagens-internas', 'gestao-mensagens-internas-enviar', 'gestao-mensagens-internas-notificacoes', 'gestao-mensagens-internas-grupos'].includes(item.id)
      ),
      suporte: filteredItems.filter(item =>
        ['suporte'].includes(item.id)
      ),
      atendimento: filteredItems.filter(item =>
        ['gestao-atendimento', 'gestao-atendimento-chat', 'gestao-atendimento-historico', 'gestao-atendimento-metricas', 'gestao-atendimento-configuracoes'].includes(item.id)
      ),
      sistema: filteredItems.filter(item =>
        ['atividades', 'usuarios', 'grupos', 'sistema', 'configuracoes'].includes(item.id)
      )
    };

    // Debug específico para SUPER_ADMIN
    if (user?.role === 'SUPER_ADMIN') {
      console.log('🔍 SUPER_ADMIN - getMenuGroups - Total filtrados:', filteredItems.length);
      console.log('🔍 SUPER_ADMIN - getMenuGroups - Itens principais:', groups.principal.map(item => item.text));
      console.log('🔍 SUPER_ADMIN - getMenuGroups - Itens de sistema:', groups.sistema.map(item => item.text));
      console.log('🔍 SUPER_ADMIN - getMenuGroups - Todos os grupos:', Object.keys(groups).map(key => `${key}: ${groups[key as keyof typeof groups].length}`));

      // Debug específico para Controle de Visitas
      const controleVisitasInFiltered = filteredItems.find(item => item.id === 'controle-visitas');
      console.log('🔍 SUPER_ADMIN - Controle de Visitas nos itens filtrados:', controleVisitasInFiltered);
    }

    return groups;
  };

  // Filtrar menu baseado nas permissões do usuário
  const getFilteredMenuItems = (): MenuItem[] => {
    console.log('🔍 getFilteredMenuItems - Iniciando filtro');
    console.log('🔍 getFilteredMenuItems - User:', user);
    if (!user) {
      console.log('❌ getFilteredMenuItems - Usuário não encontrado');
      return [];
    }

    // SUPER_ADMIN vê todos os itens
    if (user.role === 'SUPER_ADMIN' || user.permissions.ALL_PERMISSIONS) {
      console.log('🔴 SUPER_ADMIN: Mostrando todos os itens do menu');
      console.log('🔍 Permissões do usuário:', user.permissions);
      console.log('🔍 Role do usuário:', user.role);
      console.log('🔍 ALL_PERMISSIONS:', user.permissions.ALL_PERMISSIONS);
      console.log('🔍 Total de itens no allMenuItems:', allMenuItems.length);
      console.log('🔍 Primeiros 5 itens:', allMenuItems.slice(0, 5).map(item => item.text));

      // Debug específico para Controle de Visitas
      const controleVisitasItem = allMenuItems.find(item => item.id === 'controle-visitas');
      console.log('🔍 Item Controle de Visitas encontrado:', controleVisitasItem);

      // Debug específico para Usuários e Grupos
      const usuariosItem = allMenuItems.find(item => item.id === 'usuarios');
      const gruposItem = allMenuItems.find(item => item.id === 'grupos');
      console.log('🔍 Item Usuários encontrado:', usuariosItem);
      console.log('🔍 Item Grupos encontrado:', gruposItem);

      // Debug: verificar se os itens estão no array original
      console.log('🔍 Todos os IDs no allMenuItems:', allMenuItems.map(item => item.id));
      console.log('🔍 Itens de sistema no allMenuItems:', allMenuItems.filter(item => ['atividades', 'usuarios', 'grupos', 'sistema', 'configuracoes'].includes(item.id)));

      // Debug: verificar se os itens estão sendo retornados corretamente
      const sistemaItems = allMenuItems.filter(item => ['atividades', 'usuarios', 'grupos', 'sistema', 'configuracoes'].includes(item.id));
      console.log('🔍 SUPER_ADMIN - Itens de sistema que serão retornados:', sistemaItems.map(item => item.text));

      return allMenuItems;
    }

    // Para outros usuários, filtrar por permissões
    const normalizedRole = (user.role ?? '').replace(/^ROLE_/, '') as UserRole;
    const allowedSet = ROLE_ALLOWED_ITEM_IDS[normalizedRole];

    const filtered = allMenuItems.filter(item => {
      if (allowedSet && !allowedSet.has(item.id)) {
        console.log(`⚠️ ${normalizedRole} - removendo item não permitido: ${item.id}`);
        return false;
      }

      // Regras extras por função para esconder módulos específicos
      // Departamento Pessoal e RH NÃO veem módulo Operacional/Supervisão/Financeiro/Fiscal
      if (['DEPARTAMENTO_PESSOAL', 'RH'].includes(normalizedRole)) {
        if (RH_DP_FORBIDDEN_OPERATIONAL_IDS.has(item.id)) {
          console.log(`🚫 ${normalizedRole} - escondendo item operacional: ${item.id}`);
          return false;
        }
        if (RH_DP_FORBIDDEN_FINANCIAL_IDS.has(item.id)) {
          console.log(`🚫 ${normalizedRole} - escondendo item financeiro/fiscal: ${item.id}`);
          return false;
        }
      }

      // 🟩 SUPERVISOR — defesa em profundidade (ver SUPERVISOR_FORBIDDEN_ITEM_IDS).
      if (normalizedRole === 'SUPERVISOR' && SUPERVISOR_FORBIDDEN_ITEM_IDS.has(item.id)) {
        console.log(`🚫 SUPERVISOR - escondendo item fora do módulo operacional: ${item.id}`);
        return false;
      }

      // Se tem role específico, verificar se o usuário tem esse role
      if (item.role && item.role !== user.role) {
        console.log(`🔍 Item ${item.text} - Role não confere: ${item.role} !== ${user.role}`);
        return false;
      }

      // Se tem permissão específica, verificar se o usuário tem essa permissão
      if (item.requiredPermission) {
        const isAllowed = hasPermission(user.permissions, item.requiredPermission as any);
        console.log(`🔍 Item ${item.text} (${item.requiredPermission}): ${isAllowed ? '✅' : '❌'}`);


        return isAllowed;
      }

      // Regras para ADMIN e ADMINISTRADOR — esconder módulos de sistema sensíveis
      if (['ADMIN', 'ADMINISTRADOR'].includes(normalizedRole) && ADMIN_FORBIDDEN_SYSTEM_IDS.has(item.id)) {
        return false;
      }

      return true;
    });

    return filtered;
  };

  const menuGroups = getMenuGroups();

  // Debug: mostrar quantos itens estão sendo renderizados
  console.log('🔍 DynamicSidebar - Grupos do menu:', Object.keys(menuGroups).map(key => `${key}: ${menuGroups[key as keyof typeof menuGroups].length} itens`));
  console.log('🔍 DynamicSidebar - Seção sistema:', menuGroups.sistema.map(item => item.text));

  const getActiveId = () => {
    const path = location.pathname;
    const allItems = Object.values(menuGroups).flat();
    const activeItem = allItems.find(item => item.to === path);
    return activeItem?.id || 'dashboard';
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames: Record<string, string> = {
      'SUPER_ADMIN': 'Super Administrador',
      'ADMIN': 'Administrador',
      'SUPERVISOR': 'Supervisor',
      'GESTAO_SUPERVISAO': 'Gestão de Supervisão',
      'RH': 'Recursos Humanos',
      'FINANCEIRO': 'Financeiro',
      'TI_SUPORTE': 'TI / Suporte',
      'AUDITOR': 'Auditor',
      'COLABORADOR': 'Colaborador',
      'ASSISTENTE_ADMINISTRATIVO': 'Assistente Administrativo',
    };
    return roleNames[role] || role;
  };

  const getRoleColor = (role: string) => {
    const roleColors: Record<string, string> = {
      'SUPER_ADMIN': 'bg-red-100 text-red-800',
      'ADMIN': 'bg-blue-100 text-blue-800',
      'SUPERVISOR': 'bg-green-100 text-green-800',
      'GESTAO_SUPERVISAO': 'bg-teal-100 text-teal-800',
      'RH': 'bg-yellow-100 text-yellow-800',
      'FINANCEIRO': 'bg-orange-100 text-orange-800',
      'TI_SUPORTE': 'bg-purple-100 text-purple-800',
      'AUDITOR': 'bg-gray-100 text-gray-800',
      'COLABORADOR': 'bg-indigo-100 text-indigo-800',
      'ASSISTENTE_ADMINISTRATIVO': 'bg-yellow-100 text-yellow-800',
    };
    return roleColors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Sidebar className="bg-seguranca-graphite border-r border-gray-700">
      <SidebarHeader className="p-4 border-b border-gray-700">
        <Logo />
      </SidebarHeader>

      <SidebarContent>
        {/* Debug simples no topo */}
        <div className="p-2 text-xs text-green-400 bg-green-900/20 rounded mb-4">
          DEBUG: Sidebar renderizando - User: {user?.name || 'null'}
        </div>

        {/* Menu Principal */}
        {menuGroups.principal.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-seguranca-lightgray px-2 py-2">
              Menu Principal
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {menuGroups.principal.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={getActiveId() === item.id}
                      className={`
                        flex items-center p-3 rounded-lg transition-colors
                        ${getActiveId() === item.id
                          ? 'bg-seguranca-black text-seguranca-yellow'
                          : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                        }
                      `}
                    >
                      <ScrollPreservingLink to={item.to} className="flex items-center w-full">
                        <item.icon size={20} className="text-seguranca-yellow flex-shrink-0" />
                        <span className="ml-3 truncate">{item.text}</span>
                        {item.role === 'SUPER_ADMIN' && (
                          <span className="ml-auto text-xs bg-red-500 text-white px-1 rounded">🟥</span>
                        )}
                      </ScrollPreservingLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Módulo Financeiro */}
        {menuGroups.financeiro.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-seguranca-lightgray px-2 py-2">
              <DollarSign size={16} className="mr-2 text-seguranca-yellow" />
              Módulo Financeiro
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {menuGroups.financeiro.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={getActiveId() === item.id}
                      className={`
                        flex items-center p-3 rounded-lg transition-colors
                        ${getActiveId() === item.id
                          ? 'bg-seguranca-black text-seguranca-yellow'
                          : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                        }
                      `}
                    >
                      <ScrollPreservingLink to={item.to} className="flex items-center w-full">
                        <item.icon size={20} className="text-seguranca-yellow flex-shrink-0" />
                        <span className="ml-3 truncate">{item.text}</span>
                      </ScrollPreservingLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}



        {/* Módulo RH */}
        {menuGroups.rh.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-seguranca-lightgray px-2 py-2">
              <Users size={16} className="mr-2 text-seguranca-yellow" />
              Recursos Humanos
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {menuGroups.rh.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={getActiveId() === item.id}
                      className={`
                        flex items-center p-3 rounded-lg transition-colors
                        ${getActiveId() === item.id
                          ? 'bg-seguranca-black text-seguranca-yellow'
                          : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                        }
                      `}
                    >
                      <ScrollPreservingLink to={item.to} className="flex items-center w-full">
                        <item.icon size={20} className="text-seguranca-yellow flex-shrink-0" />
                        <span className="ml-3 truncate">{item.text}</span>
                      </ScrollPreservingLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Módulo SST */}
        {menuGroups.sst && menuGroups.sst.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-seguranca-lightgray px-2 py-2">
              <Shield size={16} className="mr-2 text-seguranca-yellow" />
              Saúde e Segurança (SST)
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {menuGroups.sst.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={getActiveId() === item.id}
                      className={`
                        flex items-center p-3 rounded-lg transition-colors
                        ${getActiveId() === item.id
                          ? 'bg-seguranca-black text-seguranca-yellow'
                          : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                        }
                      `}
                    >
                      <ScrollPreservingLink to={item.to} className="flex items-center w-full">
                        <item.icon size={20} className="text-seguranca-yellow flex-shrink-0" />
                        <span className="ml-3 truncate">{item.text}</span>
                      </ScrollPreservingLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Módulo Operacional */}
        {menuGroups.operacional.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-seguranca-lightgray px-2 py-2">
              <Shield size={16} className="mr-2 text-seguranca-yellow" />
              Operacional
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {menuGroups.operacional.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={getActiveId() === item.id}
                      className={`
                        flex items-center p-3 rounded-lg transition-colors
                        ${getActiveId() === item.id
                          ? 'bg-seguranca-black text-seguranca-yellow'
                          : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                        }
                      `}
                    >
                      <ScrollPreservingLink to={item.to} className="flex items-center w-full">
                        <item.icon size={20} className="text-seguranca-yellow flex-shrink-0" />
                        <span className="ml-3 truncate">{item.text}</span>
                      </ScrollPreservingLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Módulo Empresas */}
        {menuGroups.empresas.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-seguranca-lightgray px-2 py-2">
              <Building2 size={16} className="mr-2 text-seguranca-yellow" />
              Empresas
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {menuGroups.empresas.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={getActiveId() === item.id}
                      className={`
                        flex items-center p-3 rounded-lg transition-colors
                        ${getActiveId() === item.id
                          ? 'bg-seguranca-black text-seguranca-yellow'
                          : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                        }
                      `}
                    >
                      <ScrollPreservingLink to={item.to} className="flex items-center w-full">
                        <item.icon size={20} className="text-seguranca-yellow flex-shrink-0" />
                        <span className="ml-3 truncate">{item.text}</span>
                      </ScrollPreservingLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Módulo Comercial */}
        {menuGroups.comercial.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-seguranca-lightgray px-2 py-2">
              <Briefcase size={16} className="mr-2 text-seguranca-yellow" />
              Comercial
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {menuGroups.comercial.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={getActiveId() === item.id}
                      className={`
                        flex items-center p-3 rounded-lg transition-colors
                        ${getActiveId() === item.id
                          ? 'bg-seguranca-black text-seguranca-yellow'
                          : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                        }
                      `}
                    >
                      <ScrollPreservingLink to={item.to} className="flex items-center w-full">
                        <item.icon size={20} className="text-seguranca-yellow flex-shrink-0" />
                        <span className="ml-3 truncate">{item.text}</span>
                      </ScrollPreservingLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Módulo Compras */}
        {menuGroups.compras.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-seguranca-lightgray px-2 py-2">
              <ShoppingCart size={16} className="mr-2 text-seguranca-yellow" />
              Gestão de Compras
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {menuGroups.compras.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={getActiveId() === item.id}
                      className={`
                        flex items-center p-3 rounded-lg transition-colors
                        ${getActiveId() === item.id
                          ? 'bg-seguranca-black text-seguranca-yellow'
                          : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                        }
                      `}
                    >
                      <ScrollPreservingLink to={item.to} className="flex items-center w-full">
                        <item.icon size={20} className="text-seguranca-yellow flex-shrink-0" />
                        <span className="ml-3 truncate">{item.text}</span>
                      </ScrollPreservingLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Módulo Estoque */}
        {menuGroups.estoque.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-seguranca-lightgray px-2 py-2">
              <Package size={16} className="mr-2 text-seguranca-yellow" />
              Estoque
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {menuGroups.estoque.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={getActiveId() === item.id}
                      className={`
                        flex items-center p-3 rounded-lg transition-colors
                        ${getActiveId() === item.id
                          ? 'bg-seguranca-black text-seguranca-yellow'
                          : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                        }
                      `}
                    >
                      <ScrollPreservingLink to={item.to} className="flex items-center w-full">
                        <item.icon size={20} className="text-seguranca-yellow flex-shrink-0" />
                        <span className="ml-3 truncate">{item.text}</span>
                      </ScrollPreservingLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Módulo Frota */}
        {menuGroups.frota.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-seguranca-lightgray px-2 py-2">
              <Truck size={16} className="mr-2 text-seguranca-yellow" />
              Frota
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {menuGroups.frota.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={getActiveId() === item.id}
                      className={`
                        flex items-center p-3 rounded-lg transition-colors
                        ${getActiveId() === item.id
                          ? 'bg-seguranca-black text-seguranca-yellow'
                          : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                        }
                      `}
                    >
                      <ScrollPreservingLink to={item.to} className="flex items-center w-full">
                        <item.icon size={20} className="text-seguranca-yellow flex-shrink-0" />
                        <span className="ml-3 truncate">{item.text}</span>
                      </ScrollPreservingLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Módulo Holerites */}
        {menuGroups.holerites.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-seguranca-lightgray px-2 py-2">
              <FileSpreadsheet size={16} className="mr-2 text-seguranca-yellow" />
              Holerites
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {menuGroups.holerites.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={getActiveId() === item.id}
                      className={`
                        flex items-center p-3 rounded-lg transition-colors
                        ${getActiveId() === item.id
                          ? 'bg-seguranca-black text-seguranca-yellow'
                          : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                        }
                      `}
                    >
                      <ScrollPreservingLink to={item.to} className="flex items-center w-full">
                        <item.icon size={20} className="text-seguranca-yellow flex-shrink-0" />
                        <span className="ml-3 truncate">{item.text}</span>
                      </ScrollPreservingLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Módulo Mensagens */}
        {menuGroups.mensagens.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-seguranca-lightgray px-2 py-2">
              <MessageSquare size={16} className="mr-2 text-seguranca-yellow" />
              Comunicação
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {menuGroups.mensagens.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={getActiveId() === item.id}
                      className={`
                        flex items-center p-3 rounded-lg transition-colors
                        ${getActiveId() === item.id
                          ? 'bg-seguranca-black text-seguranca-yellow'
                          : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                        }
                      `}
                    >
                      <ScrollPreservingLink to={item.to} className="flex items-center w-full">
                        <item.icon size={20} className="text-seguranca-yellow flex-shrink-0" />
                        <span className="ml-3 truncate">{item.text}</span>
                      </ScrollPreservingLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Módulo Suporte */}
        {menuGroups.suporte.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-seguranca-lightgray px-2 py-2">
              <Headphones size={16} className="mr-2 text-seguranca-yellow" />
              Suporte
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {menuGroups.suporte.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={getActiveId() === item.id}
                      className={`
                        flex items-center p-3 rounded-lg transition-colors
                        ${getActiveId() === item.id
                          ? 'bg-seguranca-black text-seguranca-yellow'
                          : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                        }
                      `}
                    >
                      <ScrollPreservingLink to={item.to} className="flex items-center w-full">
                        <item.icon size={20} className="text-seguranca-yellow flex-shrink-0" />
                        <span className="ml-3 truncate">{item.text}</span>
                      </ScrollPreservingLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Módulo Atendimento */}
        {menuGroups.atendimento.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-seguranca-lightgray px-2 py-2">
              <Phone size={16} className="mr-2 text-seguranca-yellow" />
              Atendimento
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {menuGroups.atendimento.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={getActiveId() === item.id}
                      className={`
                        flex items-center p-3 rounded-lg transition-colors
                        ${getActiveId() === item.id
                          ? 'bg-seguranca-black text-seguranca-yellow'
                          : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                        }
                      `}
                    >
                      <ScrollPreservingLink to={item.to} className="flex items-center w-full">
                        <item.icon size={20} className="text-seguranca-yellow flex-shrink-0" />
                        <span className="ml-3 truncate">{item.text}</span>
                      </ScrollPreservingLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}


        {/* Módulo Sistema */}
        {menuGroups.sistema.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-seguranca-lightgray px-2 py-2">
              <Settings size={16} className="mr-2 text-seguranca-yellow" />
              Sistema
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {menuGroups.sistema.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={getActiveId() === item.id}
                      className={`
                        flex items-center p-3 rounded-lg transition-colors
                        ${getActiveId() === item.id
                          ? 'bg-seguranca-black text-seguranca-yellow'
                          : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                        }
                      `}
                    >
                      <ScrollPreservingLink to={item.to} className="flex items-center w-full">
                        <item.icon size={20} className="text-seguranca-yellow flex-shrink-0" />
                        <span className="ml-3 truncate">{item.text}</span>
                      </ScrollPreservingLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}



      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-gray-700">
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${user?.role === 'SUPER_ADMIN' ? 'bg-red-500' : 'bg-seguranca-red'
            }`}>
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="ml-3 min-w-0">
            <div className="text-sm font-medium text-seguranca-lightgray truncate">
              {user?.name || 'Usuário'}
            </div>
            <div className="text-xs text-gray-400 truncate">
              {getRoleDisplayName(user?.role || '')}
              {user?.role === 'SUPER_ADMIN' && ' 🟥'}
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}