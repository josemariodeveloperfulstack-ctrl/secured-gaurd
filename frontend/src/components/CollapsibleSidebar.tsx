import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useScrollPreservation } from '@/hooks/useScrollPreservation';
import { Button } from '@/components/ui/button';
import { ScrollPreservingLink } from './ScrollPreservingLink';
import UserProfileModal from './UserProfileModal';
import { UserRole } from '@/types/user';
import Logo from './Logo';
import {
  BarChart3,
  FileText,
  Calendar,
  Users,
  User2,
  ClipboardList,
  DollarSign,
  FileSpreadsheet,
  Building,
  Building2,
  Settings,
  Truck,
  Shield,
  Briefcase,
  Target,
  FileCheck,
  Calculator,
  AlertTriangle,
  Stethoscope,
  HardHat,
  Bell,
  Home,
  Menu,
  X,
  UserCog,
  UserCheck,
  Upload,
  Award,
  MapPin,
  Handshake,
  ArrowUpDown,
  Kanban,
  Mail,
  Route,
  MessageCircle,
  Package,
  Layers,
  Headphones,
  Send,
  Phone,
  Clock,
  CreditCard,
  Receipt,
  TrendingUp,
  Banknote,
  Wallet,
  ShoppingCart,
  CheckCircle,
  Ruler,
  // Novos ícones para menus operacionais
  Wrench,
  AlertCircle,
  ClipboardCheck,
  ArrowRightLeft,
  Eye,
  Activity,
  UserPlus,
  UserX,
  CalendarDays,
  Clock3,
  FileBarChart,
  FileSignature,
  Heart,
  GraduationCap,
  Car,
  Database,
  LayoutDashboard
} from 'lucide-react';

interface CollapsibleSidebarProps {
  collapsed: boolean;
  isMobile: boolean;
  onToggle: () => void;
}

// Menu principal
const mainMenuItems = [
  { icon: Home, text: 'Dashboard', to: '/dashboard', id: 'dashboard' },
  { icon: FileSpreadsheet, text: 'Holerites', to: '/holerites', id: 'holerites' },
  { icon: Truck, text: 'Frota', to: '/frota', id: 'frota' },
  { icon: Building2, text: 'Filiais', to: '/filiais', id: 'filiais' },
  { icon: FileSpreadsheet, text: 'Meus Documentos', to: '/meus-holerites', id: 'meus-holerites' },
];

// Módulo Operacional - Rotas diretas para facilitar acesso e evitar redirecionamentos
const operacionalMenuItems = [
  { icon: LayoutDashboard, text: 'Dashboard', to: '/operacional?tab=dashboard', id: 'operacional-dashboard' },
  { icon: ClipboardList, text: 'Serviços', to: '/operacional?tab=servicos', id: 'operacional-servicos' },
  { icon: Package, text: 'Equipamentos', to: '/operacional?tab=equipamentos', id: 'operacional-equipamentos' },
  { icon: MapPin, text: 'Controle de Visitas', to: '/operacional?tab=controle-visitas', id: 'operacional-controle-visitas' },
  { icon: Clock, text: 'Escalas', to: '/operacional?tab=escalas', id: 'operacional-escalas' },
  { icon: Bell, text: 'Notificações', to: '/operacional?tab=notificacoes', id: 'operacional-notificacoes' },
  { icon: Eye, text: 'Ocorrências', to: '/operacional?tab=ocorrencias', id: 'operacional-ocorrencias' },
  { icon: Activity, text: 'Registro de Atividade', to: '/operacional?tab=atividades', id: 'operacional-atividades' },
  { icon: UserCheck, text: 'Troca de Plantão', to: '/operacional?tab=troca-plantao', id: 'operacional-troca-plantao' },
  { icon: Route, text: 'Controle de Rondas', to: '/controle-rondas', id: 'controle-rondas' },
  { icon: Truck, text: 'Guia de Transporte', to: '/operacional?tab=guia-transporte', id: 'operacional-guia-transporte' },
  { icon: BarChart3, text: 'Gestão Operacional', to: '/operacional?tab=gestao-operacional', id: 'operacional-gestao-operacional' },
];

// Módulo RH - Menu principal
const rhMenuItems = [
  { icon: Users, text: 'RH Principal', to: '/rh', id: 'rh' },
  { icon: User2, text: 'Funcionários', to: '/rh/funcionarios', id: 'rh-funcionarios' },
  { icon: MapPin, text: 'Postos de Trabalho', to: '/rh/postos', id: 'rh-postos' },
  { icon: Briefcase, text: 'Vagas', to: '/rh/vagas', id: 'rh-vagas' },
  { icon: Award, text: 'Benefícios', to: '/rh/beneficios', id: 'rh-beneficios' },
  { icon: GraduationCap, text: 'Treinamentos', to: '/rh/treinamentos', id: 'rh-treinamentos' },
  { icon: BarChart3, text: 'Relatórios RH', to: '/rh/relatorios', id: 'rh-relatorios' },
];

// Módulo SST - Saúde e Segurança do Trabalho
const sstMenuItems = [
  { icon: Shield, text: 'Controle SST', to: '/rh/sst', id: 'rh-sst' },
  { icon: Stethoscope, text: 'Exames Médicos', to: '/rh/sst/exames', id: 'rh-sst-exames' },
  { icon: HardHat, text: 'EPIs', to: '/rh/sst/epis', id: 'rh-sst-epis' },
  { icon: AlertTriangle, text: 'Acidentes', to: '/rh/sst/acidentes', id: 'rh-sst-acidentes' },
  { icon: GraduationCap, text: 'Treinamentos SST', to: '/rh/sst/treinamentos', id: 'rh-sst-treinamentos' },
  // { icon: FileCheck, text: 'Inspeções', to: '/rh/sst/inspecoes', id: 'rh-sst-inspecoes' }, // TODO: Implementar página de inspeções
  { icon: Users, text: 'CIPA', to: '/rh/sst/cipa', id: 'rh-sst-cipa' },
  { icon: BarChart3, text: 'Relatórios SST', to: '/rh/sst/relatorios', id: 'rh-sst-relatorios' },
];

// Módulo Departamento Pessoal
const departamentoPessoalMenuItems = [
  // Gestão de Funcionários
  { icon: Users, text: 'Funcionários', to: '/rh/funcionarios', id: 'dp-funcionarios' },
  { icon: FileSpreadsheet, text: 'Importar Funcionários Excel', to: '/rh/funcionarios?importar=excel', id: 'dp-funcionarios-importar-excel' },
  { icon: Banknote, text: 'Importar Dados Bancários', to: '/rh/funcionarios/importar-dados-bancarios', id: 'dp-funcionarios-importar-bancarios' },
  { icon: Handshake, text: 'Admissão/Demissão', to: '/rh/admissao-demissao', id: 'dp-admissao-demissao' },
  { icon: ArrowUpDown, text: 'Remanejamentos', to: '/rh/remanejamentos', id: 'dp-remanejamentos' },

  // Gestão de Tempo e Frequência
  { icon: Calendar, text: 'Férias', to: '/rh/ferias', id: 'dp-ferias' },
  { icon: CalendarDays, text: 'Ponto Eletrônico', to: '/rh/ponto-eletronico', id: 'dp-ponto-eletronico' },
  { icon: FileText, text: 'Fechamento de Horas', to: '/rh/fechamento-horas', id: 'rh-fechamento-horas' },

  // Gestão de Ocorrências e Eventos
  { icon: FileText, text: 'Ocorrências', to: '/rh/ocorrencias', id: 'dp-ocorrencias' },

  // Benefícios (agrupados)
  { icon: Award, text: 'Benefícios', to: '/rh/beneficios', id: 'dp-beneficios' },

  // Estrutura Organizacional
  { icon: Settings, text: 'Funções', to: '/rh/funcoes', id: 'dp-funcoes' },
  { icon: Briefcase, text: 'Cargos', to: '/rh/cargos', id: 'dp-cargos' },
  { icon: MapPin, text: 'Postos', to: '/rh/postos', id: 'dp-postos' },

  // Segurança e Compliance
  { icon: Shield, text: 'EPIs', to: '/rh/epis', id: 'dp-epis' },

  // Documentos e Contratos
  { icon: FileSignature, text: 'Documentos', to: '/rh/documentos', id: 'dp-documentos' },

  // Operações
  { icon: FileCheck, text: 'Ordens de Serviço', to: '/rh/ordens-servico', id: 'dp-ordens-servico' },
  { icon: Briefcase, text: 'Vagas', to: '/rh/vagas', id: 'dp-vagas' },
];

// Módulo Comercial
const comercialMenuItems = [
  { icon: Target, text: 'Leads', to: '/leads', id: 'leads' },
  { icon: Building, text: 'Empresas', to: '/comercial/empresas', id: 'empresas' },
  { icon: Building2, text: 'Clientes', to: '/clientes', id: 'clientes' },
  { icon: FileCheck, text: 'Propostas', to: '/propostas', id: 'propostas' },
  { icon: Calculator, text: 'Orçamentos', to: '/orcamentos', id: 'orcamentos' },
  { icon: FileText, text: 'Contratos', to: '/contratos', id: 'contratos' },
  { icon: Kanban, text: 'CRM Comercial', to: '/crm', id: 'crm' },
];

// Módulo Estoque Simplificado
const estoqueMenuItems = [
  { icon: Package, text: 'Estoque Simplificado', to: '/estoque-simplificado', id: 'estoque-simplificado' },
  { icon: BarChart3, text: 'Relatórios de Estoque', to: '/estoque/relatorios', id: 'estoque-relatorios' },
  { icon: AlertTriangle, text: 'Alertas de Estoque', to: '/estoque-simplificado?tab=alertas', id: 'estoque-alertas' },
  { icon: Handshake, text: 'Fornecedores', to: '/estoque/fornecedores', id: 'estoque-fornecedores' },
];

// Módulo Suporte - REMOVIDO (substituído por Gestão de Atendimento)
// const suporteMenuItems = [
//   { icon: Headphones, text: 'Central de Suporte', to: '/suporte', id: 'suporte' },
//   { icon: Send, text: 'Tickets', to: '/tickets', id: 'tickets' },
// ];

// ===== MÓDULO DE COMUNICAÇÃO INTERNA (SIMPLIFICADO) =====
const comunicacaoInternaMenuItems = [
  // Chat e Mensagens Básicas
  { icon: MessageCircle, text: 'Chat Interno', to: '/chat-interno', id: 'chat-interno' },
  // Para usuários comuns, vamos usar /mensagens (caixa de entrada / envio básico)
  { icon: Send, text: 'Enviar Mensagens', to: '/mensagens', id: 'mensagens' },
  { icon: Users, text: 'Grupos de Mensagens', to: '/gestao-mensagens/grupos', id: 'gestao-mensagens-grupos' },
  { icon: Bell, text: 'Notificações', to: '/gestao-mensagens/notificacoes', id: 'gestao-mensagens-notificacoes' },
];

// ===== NOVO: MÓDULO DE ATENDIMENTO =====
const atendimentoMenuItems = [
  { icon: Phone, text: 'Dashboard de Atendimento', to: '/gestao-atendimento/dashboard', id: 'gestao-atendimento-dashboard' },
  { icon: MessageCircle, text: 'Tickets', to: '/gestao-atendimento/tickets', id: 'gestao-atendimento-tickets' },
  { icon: Clock, text: 'Histórico de Conversas', to: '/gestao-atendimento/historico', id: 'gestao-atendimento-historico' },
  { icon: UserCog, text: 'Gerenciar Agentes', to: '/gestao-atendimento/agentes', id: 'gestao-atendimento-agentes' },
  { icon: BarChart3, text: 'Métricas', to: '/gestao-atendimento/metricas', id: 'gestao-atendimento-metricas' },
  { icon: Settings, text: 'Chatbot', to: '/gestao-atendimento/chatbot', id: 'gestao-atendimento-chatbot' },
];

// ===== MÓDULO FINANCEIRO COMPLETO =====
const financeiroMenuItems = [
  { icon: DollarSign, text: 'Financeiro', to: '/financeiro', id: 'financeiro' },
  { icon: CreditCard, text: 'Contas a Pagar', to: '/financeiro/contas-pagar', id: 'financeiro-contas-pagar', requiredPermission: 'FINANCIAL_PAYABLE_READ' },
  { icon: Receipt, text: 'Contas a Receber', to: '/financeiro/contas-receber', id: 'financeiro-contas-receber', requiredPermission: 'FINANCIAL_RECEIVABLE_READ' },
  { icon: TrendingUp, text: 'Fluxo de Caixa', to: '/financeiro/fluxo-caixa', id: 'financeiro-fluxo-caixa', requiredPermission: 'FINANCIAL_CASHFLOW_READ' },
  { icon: Banknote, text: 'Pagamentos', to: '/financeiro/pagamentos', id: 'financeiro-pagamentos', requiredPermission: 'FINANCIAL_READ' },
  { icon: Upload, text: 'Conciliação Bancária', to: '/financeiro/conciliacao-bancaria', id: 'financeiro-conciliacao-bancaria', requiredPermission: 'FINANCIAL_READ' },
  { icon: Building2, text: 'Bancos', to: '/financeiro/bancos', id: 'financeiro-bancos', requiredPermission: 'FINANCIAL_READ' },
  { icon: Building, text: 'Agências', to: '/financeiro/agencias', id: 'financeiro-agencias', requiredPermission: 'FINANCIAL_READ' },
  { icon: BarChart3, text: 'Relatórios Financeiros', to: '/financeiro/relatorios', id: 'financeiro-relatorios', requiredPermission: 'REPORTS_READ' },
  { icon: Wallet, text: 'Centro de Custos', to: '/financeiro/centro-custos', id: 'financeiro-centro-custos', requiredPermission: 'FINANCIAL_READ' },
  { icon: Ruler, text: 'Medição', to: '/financeiro/medicao', id: 'financeiro-medicao', requiredPermission: 'FINANCIAL_MEASUREMENT_READ' },
  { icon: Package, text: 'Gestão Patrimonial', to: '/gestao-patrimonial', id: 'gestao-patrimonial', requiredPermission: 'PATRIMONIAL_READ' },
];

// ===== MÓDULO FISCAL (separado do Financeiro; espaço para novas funcionalidades) =====
const fiscalMenuItems = [
  { icon: Receipt, text: 'Notas Fiscais', to: '/modulo-fiscal', id: 'modulo-fiscal', requiredPermission: 'FISCAL_READ' },
];

// ===== MÓDULO COMPRAS =====
const comprasMenuItems = [
  { icon: ShoppingCart, text: 'Gestão de Compras', to: '/compras', id: 'compras' },
  { icon: FileText, text: 'Solicitações', to: '/compras/solicitacoes', id: 'compras-solicitacoes' },
  { icon: CheckCircle, text: 'Aprovações', to: '/compras/aprovacoes', id: 'compras-aprovacoes' },
  { icon: Calculator, text: 'Cotações', to: '/compras/cotacoes', id: 'compras-cotacoes' },
  { icon: BarChart3, text: 'Relatórios', to: '/compras/relatorios', id: 'compras-relatorios' },
];

// ===== MÓDULO SISTEMA (SUPER_ADMIN) =====
const sistemaMenuItems = [
  { icon: UserCog, text: 'Usuários', to: '/usuarios', id: 'usuarios' },
  { icon: UserCheck, text: 'Grupos', to: '/grupos', id: 'grupos' },
  { icon: MessageCircle, text: 'Conexão WhatsApp', to: '/whatsapp-connection', id: 'whatsapp-connection' },
  { icon: Upload, text: 'Importar WhatsApp (PDF)', to: '/sistema/importar-whatsapp', id: 'sistema-importar-whatsapp' },
  { icon: Settings, text: 'Gestão de Atividades', to: '/atividades', id: 'atividades' },
  { icon: Shield, text: 'Sistema', to: '/sistema', id: 'sistema' },
  { icon: Database, text: 'Backup', to: '/configuracoes/backup', id: 'backup' },
  { icon: Settings, text: 'Configurações', to: '/configuracoes', id: 'configuracoes' },
];

const ROLE_ALLOWED_ITEM_IDS: Partial<Record<UserRole, Set<string>>> = {
  COLABORADOR: new Set([
    'dashboard',
    'meus-holerites',
    'chat-interno',
    'mensagens',
  ]),
  // RH e Departamento Pessoal NÃO veem módulo Operacional
  RH: new Set([
    'dashboard',
    'holerites',
    'filiais',
    'configuracoes',
    'rh',
    'rh-funcionarios',
    'rh-postos',
    'rh-vagas',
    'rh-beneficios',
    'rh-treinamentos',
    'rh-relatorios',
    'rh-sst',
    'rh-sst-exames',
    'rh-sst-epis',
    'rh-sst-acidentes',
    'rh-sst-treinamentos',
    'rh-sst-cipa',
    'rh-sst-relatorios',
    'dp-funcionarios',
    'dp-funcionarios-importar-bancarios',
    'dp-admissao-demissao',
    'dp-remanejamentos',
    'dp-ferias',
    'dp-ponto-eletronico',
    'rh-fechamento-horas',
    'dp-ocorrencias',
    'dp-beneficios',
    'dp-funcoes',
    'dp-cargos',
    'dp-postos',
    'dp-epis',
    'dp-documentos',
    'dp-ordens-servico',
    'dp-vagas',
    'chat-interno',
    'mensagens',
    'gestao-mensagens-grupos',
    'gestao-mensagens-notificacoes',
  ]),
  DEPARTAMENTO_PESSOAL: new Set([
    'dashboard',
    'holerites',
    'filiais',
    'configuracoes',
    'rh',
    'rh-funcionarios',
    'rh-postos',
    'rh-vagas',
    'rh-beneficios',
    'rh-treinamentos',
    'rh-relatorios',
    'rh-sst',
    'rh-sst-exames',
    'rh-sst-epis',
    'rh-sst-acidentes',
    'rh-sst-treinamentos',
    'rh-sst-cipa',
    'rh-sst-relatorios',
    'dp-funcionarios',
    'dp-funcionarios-importar-bancarios',
    'dp-admissao-demissao',
    'dp-remanejamentos',
    'dp-ferias',
    'dp-ponto-eletronico',
    'rh-fechamento-horas',
    'dp-ocorrencias',
    'dp-beneficios',
    'dp-funcoes',
    'dp-cargos',
    'dp-postos',
    'dp-epis',
    'dp-documentos',
    'dp-ordens-servico',
    'dp-vagas',
    'chat-interno',
    'mensagens',
    'gestao-mensagens-grupos',
    'gestao-mensagens-notificacoes',
  ]),
  COMERCIAL: new Set([
    'dashboard',
    'leads',
    'empresas',
    'clientes',
    'propostas',
    'orcamentos',
    'contratos',
    'crm',
    'chat-interno',
    'mensagens',
  ]),
  GESTOR_COMERCIAL: new Set([
    'dashboard',
    'leads',
    'empresas',
    'clientes',
    'propostas',
    'orcamentos',
    'contratos',
    'crm',
    'chat-interno',
    'mensagens',
  ]),
  ASSISTENTE_COMERCIAL: new Set([
    'dashboard',
    'leads',
    'clientes',
    'propostas',
    'orcamentos',
    'crm',
    'chat-interno',
    'mensagens',
  ]),
  OPERACIONAL: new Set([
    'dashboard',
    'operacional-dashboard',
    'operacional-servicos',
    'operacional-equipamentos',
    'operacional-controle-visitas',
    'operacional-escalas',
    'operacional-notificacoes',
    'operacional-ocorrencias',
    'operacional-atividades',
    'operacional-troca-plantao',
    'controle-rondas',
    'operacional-guia-transporte',
    'operacional-gestao-operacional',
    'chat-interno',
    'mensagens',
  ]),
  ASSISTENTE_ADMINISTRATIVO: new Set([
    'dashboard',
    'financeiro',
    'financeiro-contas-pagar',
    'financeiro-relatorios',
    'financeiro-centro-custos',
    'estoque-simplificado',
    'estoque-relatorios',
    'estoque-alertas',
    'estoque-fornecedores',
    'compras',
    'compras-solicitacoes',
    'compras-aprovacoes',
    'compras-cotacoes',
    'compras-relatorios',
    'chat-interno',
    'mensagens',
  ]),
  ANALISTA_SUPRIMENTOS: new Set([
    'dashboard',
    'holerites',
    'financeiro',
    'financeiro-contas-pagar',
    'financeiro-relatorios',
    'financeiro-centro-custos',
    'estoque-simplificado',
    'estoque-relatorios',
    'estoque-alertas',
    'estoque-fornecedores',
    'compras',
    'compras-solicitacoes',
    'compras-aprovacoes',
    'compras-cotacoes',
    'compras-relatorios',
    'chat-interno',
    'mensagens',
  ]),
};

// Roles que NÃO devem ver módulos Financeiro ou Fiscal
const ROLES_WITHOUT_FINANCIAL_MODULES = new Set<UserRole>([
  'RH',
  'DEPARTAMENTO_PESSOAL',
]);

export const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({
  collapsed,
  isMobile,
  onToggle
}) => {
  const location = useLocation();
  const { user } = useAuth();
  const { forceScrollToTop } = useScrollPreservation();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const normalizedRole = useMemo(
    () => (user?.role ?? '').replace(/^ROLE_/, '').toUpperCase() as UserRole,
    [user?.role]
  );

  // Função para verificar se usuário tem permissão
  const hasPermission = useCallback((permission: string): boolean => {
    // SUPER_ADMIN tem acesso a tudo
    if (normalizedRole === 'SUPER_ADMIN') {
      return true;
    }

    // Se for COLABORADOR, verifica permissões customizadas concedidas pelo SUPER_ADMIN
    if (normalizedRole === 'COLABORADOR') {
      // Sempre tem acesso à comunicação interna
      if (permission === 'MESSAGES_READ') {
        return true;
      }

      // Verificar se tem permissão customizada
      if (user?.customPermissions && Array.isArray(user.customPermissions) && user.customPermissions.includes(permission)) {
        return true;
      }

      return false;
    }

    // Para outros roles, verificar permissões específicas no objeto permissions
    if (!user?.permissions) return false;

    // Se ALL_PERMISSIONS for true, tem acesso a tudo
    if (user.permissions.ALL_PERMISSIONS) {
      return true;
    }

    // Verificar permissão específica no objeto (não é array!)
    return user.permissions[permission as keyof typeof user.permissions] === true;
  }, [user, normalizedRole]);

  // Função para verificar se módulo deve ser exibido
  const shouldShowModule = useCallback((requiredPermission?: string): boolean => {
    if (!requiredPermission) return true;
    return hasPermission(requiredPermission);
  }, [hasPermission]);

  const allowedItemIds = useMemo(() => {
    const roles: UserRole[] = [];

    // Adicionar papel principal
    if (normalizedRole) roles.push(normalizedRole);

    // Adicionar outros papéis se houver
    if (user?.roles && Array.isArray(user.roles)) {
      user.roles.forEach(r => {
        const roleName = typeof r === 'string' ? r : r.name;
        const norm = roleName.replace(/^ROLE_/, '').toUpperCase() as UserRole;
        if (!roles.includes(norm)) roles.push(norm);
      });
    }

    const combinedSet = new Set<string>();
    roles.forEach(role => {
      const roleSet = ROLE_ALLOWED_ITEM_IDS[role];
      if (roleSet) {
        roleSet.forEach(id => combinedSet.add(id));
      }
    });

    return combinedSet;
  }, [user?.roles, normalizedRole]);

  const filterItemsForRole = useCallback(<T extends { id: string, requiredPermission?: string }>(items: T[]): T[] => {
    // SUPER_ADMIN sempre vê todos os itens
    if (normalizedRole === 'SUPER_ADMIN') {
      return items;
    }

    if (!allowedItemIds) {
      return items;
    }

    return items.filter(item => {
      // Se está na lista permitida pelo papel
      if (allowedItemIds.has(item.id)) return true;

      // Se tem uma permissão requerida e o usuário possui essa permissão (via grupo ou customizada)
      if (item.requiredPermission && hasPermission(item.requiredPermission)) return true;

      return false;
    });
  }, [allowedItemIds, normalizedRole, hasPermission]);

  // Referências para controlar o scroll da própria sidebar
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);


  const handleProfileClick = () => {
    setIsProfileModalOpen(true);
  };



  const filteredMainMenuItems = useMemo(() => filterItemsForRole(mainMenuItems), [filterItemsForRole]);
  const filteredFinanceiroItems = useMemo(() => filterItemsForRole(financeiroMenuItems), [filterItemsForRole]);
  const visibleFinanceiroItems = useMemo(() => {
    if (ROLES_WITHOUT_FINANCIAL_MODULES.has(normalizedRole)) return [];
    return filteredFinanceiroItems.filter(item => shouldShowModule((item as { requiredPermission?: string }).requiredPermission));
  }, [filteredFinanceiroItems, shouldShowModule, normalizedRole]);
  const filteredFiscalItems = useMemo(() => filterItemsForRole(fiscalMenuItems), [filterItemsForRole]);
  const visibleFiscalItems = useMemo(() => {
    if (ROLES_WITHOUT_FINANCIAL_MODULES.has(normalizedRole)) return [];
    return filteredFiscalItems.filter(item => shouldShowModule((item as { requiredPermission?: string }).requiredPermission));
  }, [filteredFiscalItems, shouldShowModule, normalizedRole]);
  const filteredOperacionalItems = useMemo(() => filterItemsForRole(operacionalMenuItems), [filterItemsForRole]);
  const filteredRhItems = useMemo(() => filterItemsForRole(rhMenuItems), [filterItemsForRole]);
  const filteredSstItems = useMemo(() => filterItemsForRole(sstMenuItems), [filterItemsForRole]);
  const filteredDepartamentoPessoalItems = useMemo(() => filterItemsForRole(departamentoPessoalMenuItems), [filterItemsForRole]);
  const filteredComercialItems = useMemo(() => filterItemsForRole(comercialMenuItems), [filterItemsForRole]);
  const filteredEstoqueItems = useMemo(() => filterItemsForRole(estoqueMenuItems), [filterItemsForRole]);
  const filteredComprasItems = useMemo(() => filterItemsForRole(comprasMenuItems), [filterItemsForRole]);
  const filteredComunicacaoInternaItems = useMemo(
    () => filterItemsForRole(comunicacaoInternaMenuItems).filter(item => {
      // Regras por permissão para cada item de comunicação interna
      if (item.id === 'mensagens' || item.id === 'chat-interno') {
        return true; // Sempre visível para roles permitidos (incluindo colaborador)
      }
      if (item.id === 'gestao-mensagens-grupos' || item.id === 'gestao-mensagens-notificacoes') {
        return hasPermission('MESSAGES_MANAGE');
      }
      return true;
    }),
    [filterItemsForRole, hasPermission]
  );
  const filteredAtendimentoItems = useMemo(() => filterItemsForRole(atendimentoMenuItems), [filterItemsForRole]);
  const filteredSistemaItems = useMemo(() => filterItemsForRole(sistemaMenuItems), [filterItemsForRole]);

  // Sempre que a rota mudar, garantir que o item ativo fique visível na sidebar
  useEffect(() => {
    if (activeItemRef.current && scrollContainerRef.current) {
      activeItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [location.pathname, location.search]);

  const getActiveId = () => {
    const path = location.pathname;
    const search = location.search;
    const fullPath = path + search;

    const allItems = [
      ...mainMenuItems,
      ...financeiroMenuItems,
      ...fiscalMenuItems,
      ...operacionalMenuItems,
      ...rhMenuItems,
      ...sstMenuItems,
      ...departamentoPessoalMenuItems,
      ...comercialMenuItems,
      ...estoqueMenuItems,
      ...comprasMenuItems,
      // ...suporteMenuItems, // REMOVIDO - substituído por Gestão de Atendimento
      ...comunicacaoInternaMenuItems,
      ...atendimentoMenuItems,
      ...sistemaMenuItems
    ];

    // Primeiro tenta encontrar uma correspondência exata (incluindo query params)
    let activeItem = allItems.find(item => item.to === fullPath);

    // Se não encontrar, tenta corresponder apenas o pathname (sem parâmetros)
    if (!activeItem) {
      activeItem = allItems.find(item => {
        const itemPath = item.to.split('?')[0]; // Remove parâmetros da URL do item
        return itemPath === path;
      });
    }

    // Para páginas operacionais, verifica se está na página operacional e qual aba está ativa
    if (path === '/operacional' && search) {
      const urlParams = new URLSearchParams(search);
      const tab = urlParams.get('tab');
      if (tab) {
        return `operacional-${tab}`;
      }
    }

    return activeItem?.id || 'dashboard';
  };

  const isActive = (id: string) => getActiveId() === id;

  return (
    <>
      {/* Overlay para mobile */}
      {isMobile && !collapsed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-screen bg-seguranca-graphite border-r border-gray-700 
          flex flex-col transition-all duration-300 ease-in-out z-50
          ${isMobile ? 'w-64' : (collapsed ? 'w-16' : 'w-64')}
          ${isMobile && collapsed ? '-translate-x-full' : 'translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center px-1">
                <Logo size="md" />
              </div>
            )}

            {collapsed && (
              <div className="flex items-center justify-center mx-auto pr-1">
                <Logo size="sm" />
              </div>
            )}

            {/* Botão de fechar para mobile */}
            {isMobile && !collapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="text-seguranca-lightgray hover:text-seguranca-yellow"
              >
                <X size={20} />
              </Button>
            )}
          </div>
        </div>

        {/* Conteúdo da navegação */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto py-4"
        >
          {/* Menu Principal */}
          <div className="mb-6">
            {!collapsed && (
              <div className="px-4 py-2 text-xs font-semibold text-seguranca-lightgray uppercase tracking-wider">
                Menu Principal
              </div>
            )}
            <nav className="space-y-1 px-4">
              {filteredMainMenuItems.map((item) => (
                <ScrollPreservingLink
                  key={item.id}
                  to={item.to}
                  preserveScroll={true}
                  ref={isActive(item.id) ? activeItemRef : undefined}
                  className={`
                      flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive(item.id)
                      ? 'bg-seguranca-black text-seguranca-yellow'
                      : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                    }
                    `}
                >
                  <item.icon
                    size={18}
                    className={`flex-shrink-0 ${collapsed ? 'mx-auto' : 'mr-3'}`}
                  />
                  {!collapsed && (
                    <span className="truncate">{item.text}</span>
                  )}
                </ScrollPreservingLink>
              ))}
            </nav>
          </div>

          {/* Módulo Financeiro */}
          {visibleFinanceiroItems.length > 0 && (
            <div className="mb-6">
              {!collapsed && (
                <div className="px-4 py-2 text-xs font-semibold text-seguranca-lightgray uppercase tracking-wider">
                  Módulo Financeiro
                </div>
              )}
              <nav className="space-y-1 px-4">
                {visibleFinanceiroItems.map((item) => (
                  <ScrollPreservingLink
                    key={item.id}
                    to={item.to}
                    preserveScroll={true}
                    ref={isActive(item.id) ? activeItemRef : undefined}
                    className={`
                      flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive(item.id)
                        ? 'bg-seguranca-black text-seguranca-yellow'
                        : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                      }
                    `}
                  >
                    <item.icon
                      size={18}
                      className={`flex-shrink-0 ${collapsed ? 'mx-auto' : 'mr-3'}`}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.text}</span>
                    )}
                  </ScrollPreservingLink>
                ))}
              </nav>
            </div>
          )}

          {/* Módulo Fiscal */}
          {visibleFiscalItems.length > 0 && (
            <div className="mb-6">
              {!collapsed && (
                <div className="px-4 py-2 text-xs font-semibold text-seguranca-lightgray uppercase tracking-wider">
                  Módulo Fiscal
                </div>
              )}
              <nav className="space-y-1 px-4">
                {visibleFiscalItems.map((item) => (
                  <ScrollPreservingLink
                    key={item.id}
                    to={item.to}
                    preserveScroll={true}
                    ref={isActive(item.id) ? activeItemRef : undefined}
                    className={`
                      flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive(item.id)
                        ? 'bg-seguranca-black text-seguranca-yellow'
                        : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                      }
                    `}
                  >
                    <item.icon
                      size={18}
                      className={`flex-shrink-0 ${collapsed ? 'mx-auto' : 'mr-3'}`}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.text}</span>
                    )}
                  </ScrollPreservingLink>
                ))}
              </nav>
            </div>
          )}

          {/* Grupo Operacional */}
          {shouldShowModule() && filteredOperacionalItems.length > 0 && (
            <div className="mb-6">
              {!collapsed && (
                <div className="px-4 py-2 text-xs font-semibold text-seguranca-lightgray uppercase tracking-wider">
                  Operacional
                </div>
              )}
              <nav className="space-y-1 px-4">
                {filteredOperacionalItems.map((item) => (
                  <ScrollPreservingLink
                    key={item.id}
                    to={item.to}
                    preserveScroll={true}
                    ref={isActive(item.id) ? activeItemRef : undefined}
                    className={`
                      flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive(item.id)
                        ? 'bg-seguranca-black text-seguranca-yellow'
                        : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                      }
                    `}
                  >
                    <item.icon
                      size={18}
                      className={`flex-shrink-0 ${collapsed ? 'mx-auto' : 'mr-3'}`}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.text}</span>
                    )}
                  </ScrollPreservingLink>
                ))}
              </nav>
            </div>
          )}

          {/* Grupo RH */}
          {shouldShowModule('EMPLOYEES_READ') && filteredRhItems.length > 0 && (
            <div className="mb-6">
              {!collapsed && (
                <div className="px-4 py-2 text-xs font-semibold text-seguranca-lightgray uppercase tracking-wider">
                  Recursos Humanos
                </div>
              )}
              <nav className="space-y-1 px-4">
                {filteredRhItems.map((item) => (
                  <ScrollPreservingLink
                    key={item.id}
                    to={item.to}
                    preserveScroll={true}
                    ref={isActive(item.id) ? activeItemRef : undefined}
                    className={`
                      flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive(item.id)
                        ? 'bg-seguranca-black text-seguranca-yellow'
                        : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                      }
                    `}
                  >
                    <item.icon
                      size={18}
                      className={`flex-shrink-0 ${collapsed ? 'mx-auto' : 'mr-3'}`}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.text}</span>
                    )}
                  </ScrollPreservingLink>
                ))}
              </nav>
            </div>
          )}

          {/* Grupo SST */}
          {shouldShowModule('EMPLOYEES_READ') && filteredSstItems.length > 0 && (
            <div className="mb-6">
              {!collapsed && (
                <div className="px-4 py-2 text-xs font-semibold text-seguranca-lightgray uppercase tracking-wider">
                  Saúde e Segurança (SST)
                </div>
              )}
              <nav className="space-y-1 px-4">
                {filteredSstItems.map((item) => (
                  <ScrollPreservingLink
                    key={item.id}
                    to={item.to}
                    preserveScroll={true}
                    ref={isActive(item.id) ? activeItemRef : undefined}
                    className={`
                      flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive(item.id)
                        ? 'bg-seguranca-black text-seguranca-yellow'
                        : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                      }
                    `}
                  >
                    <item.icon
                      size={18}
                      className={`flex-shrink-0 ${collapsed ? 'mx-auto' : 'mr-3'}`}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.text}</span>
                    )}
                  </ScrollPreservingLink>
                ))}
              </nav>
            </div>
          )}

          {/* Departamento Pessoal */}
          {shouldShowModule('EMPLOYEES_READ') && filteredDepartamentoPessoalItems.length > 0 && (
            <div className="mb-6">
              {!collapsed && (
                <div className="px-4 py-2 text-xs font-semibold text-seguranca-lightgray uppercase tracking-wider ml-4">
                  Departamento Pessoal
                </div>
              )}
              <nav className="space-y-1 px-4">
                {filteredDepartamentoPessoalItems.map((item) => (
                  <ScrollPreservingLink
                    key={item.id}
                    to={item.to}
                    preserveScroll={true}
                    ref={isActive(item.id) ? activeItemRef : undefined}
                    className={`
                      flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive(item.id)
                        ? 'bg-seguranca-black text-seguranca-yellow'
                        : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                      }
                    `}
                  >
                    <item.icon
                      size={18}
                      className={`flex-shrink-0 ${collapsed ? 'mx-auto' : 'mr-3'}`}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.text}</span>
                    )}
                  </ScrollPreservingLink>
                ))}
              </nav>
            </div>
          )}

          {/* Grupo Comercial */}
          {shouldShowModule('LEADS_READ') && filteredComercialItems.length > 0 && (
            <div className="mb-6">
              {!collapsed && (
                <div className="px-4 py-2 text-xs font-semibold text-seguranca-lightgray uppercase tracking-wider">
                  Comercial
                </div>
              )}
              <nav className="space-y-1 px-4">
                {filteredComercialItems.map((item) => (
                  <ScrollPreservingLink
                    key={item.id}
                    to={item.to}
                    preserveScroll={true}
                    ref={isActive(item.id) ? activeItemRef : undefined}
                    className={`
                      flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive(item.id)
                        ? 'bg-seguranca-black text-seguranca-yellow'
                        : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                      }
                    `}
                  >
                    <item.icon
                      size={18}
                      className={`flex-shrink-0 ${collapsed ? 'mx-auto' : 'mr-3'}`}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.text}</span>
                    )}
                  </ScrollPreservingLink>
                ))}
              </nav>
            </div>
          )}

          {/* Grupo Suprimentos e Estoque (cabeçalho) + Estoque + Compras */}
          {(shouldShowModule('STOCK_READ') || shouldShowModule('STOCK_MANAGE')) && (filteredEstoqueItems.length > 0 || filteredComprasItems.length > 0) && (
            <div className="mb-6">
              {!collapsed && (
                <div className="px-4 py-2 text-xs font-semibold text-seguranca-lightgray uppercase tracking-wider">
                  Suprimentos e Estoque
                </div>
              )}
              {/* Subgrupo Estoque */}
              {shouldShowModule('STOCK_READ') && filteredEstoqueItems.length > 0 && (
                <>
                  {!collapsed && (
                    <div className="px-4 pt-1 pb-1 text-xs font-medium text-seguranca-lightgray/90 uppercase tracking-wider">
                      Estoque
                    </div>
                  )}
                  <nav className="space-y-1 px-4">
                    {filteredEstoqueItems.map((item) => (
                      <ScrollPreservingLink
                        key={item.id}
                        to={item.to}
                        preserveScroll={true}
                        ref={isActive(item.id) ? activeItemRef : undefined}
                        className={`
                          flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                          ${isActive(item.id)
                            ? 'bg-seguranca-black text-seguranca-yellow'
                            : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                          }
                        `}
                      >
                        <item.icon
                          size={18}
                          className={`flex-shrink-0 ${collapsed ? 'mx-auto' : 'mr-3'}`}
                        />
                        {!collapsed && (
                          <span className="truncate">{item.text}</span>
                        )}
                      </ScrollPreservingLink>
                    ))}
                  </nav>
                </>
              )}
              {/* Subgrupo Compras */}
              {shouldShowModule('STOCK_MANAGE') && filteredComprasItems.length > 0 && (
                <>
                  {!collapsed && (
                    <div className="px-4 pt-2 pb-1 text-xs font-medium text-seguranca-lightgray/90 uppercase tracking-wider">
                      Compras
                    </div>
                  )}
                  <nav className="space-y-1 px-4">
                    {filteredComprasItems.map((item) => (
                      <ScrollPreservingLink
                        key={item.id}
                        to={item.to}
                        preserveScroll={true}
                        ref={isActive(item.id) ? activeItemRef : undefined}
                        className={`
                          flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                          ${isActive(item.id)
                            ? 'bg-seguranca-black text-seguranca-yellow'
                            : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                          }
                        `}
                      >
                        <item.icon
                          size={18}
                          className={`flex-shrink-0 ${collapsed ? 'mx-auto' : 'mr-3'}`}
                        />
                        {!collapsed && (
                          <span className="truncate">{item.text}</span>
                        )}
                      </ScrollPreservingLink>
                    ))}
                  </nav>
                </>
              )}
            </div>
          )}

          {/* Grupo Suporte - REMOVIDO (substituído por Gestão de Atendimento) */}
          {/* {shouldShowModule('SUPPORT_READ') && (
            <div className="mb-6">
              {!collapsed && (
                <div className="px-4 py-2 text-xs font-semibold text-seguranca-lightgray uppercase tracking-wider">
                  Suporte
                </div>
              )}
              <nav className="space-y-1 px-4">
                {suporteMenuItems.map((item) => (
                  <ScrollPreservingLink
                    key={item.id}
                    to={item.to}
                    preserveScroll={true}
                    className={`
                      flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive(item.id) 
                        ? 'bg-seguranca-black text-seguranca-yellow' 
                        : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                      }
                    `}
                  >
                    <item.icon 
                      size={18} 
                      className={`flex-shrink-0 ${collapsed ? 'mx-auto' : 'mr-3'}`} 
                    />
                    {!collapsed && (
                      <span className="truncate">{item.text}</span>
                    )}
                  </ScrollPreservingLink>
                ))}
              </nav>
            </div>
          )} */}

          {/* Grupo Comunicação Interna (Unificado) */}
          {shouldShowModule('MESSAGES_READ') && filteredComunicacaoInternaItems.length > 0 && (
            <div className="mb-6">
              {!collapsed && (
                <div className="px-4 py-2 text-xs font-semibold text-seguranca-lightgray uppercase tracking-wider">
                  Comunicação Interna
                </div>
              )}
              <nav className="space-y-1 px-4">
                {filteredComunicacaoInternaItems.map((item) => (
                  <ScrollPreservingLink
                    key={item.id}
                    to={item.to}
                    preserveScroll={true}
                    ref={isActive(item.id) ? activeItemRef : undefined}
                    className={`
                      flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive(item.id)
                        ? 'bg-seguranca-black text-seguranca-yellow'
                        : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                      }
                    `}
                  >
                    <item.icon
                      size={18}
                      className={`flex-shrink-0 ${collapsed ? 'mx-auto' : 'mr-3'}`}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.text}</span>
                    )}
                  </ScrollPreservingLink>
                ))}
              </nav>
            </div>
          )}

          {/* Grupo Atendimento */}
          {shouldShowModule('ATTENDANCE_READ') && filteredAtendimentoItems.length > 0 && (
            <div className="mb-6">
              {!collapsed && (
                <div className="px-4 py-2 text-xs font-semibold text-seguranca-lightgray uppercase tracking-wider">
                  Atendimento
                </div>
              )}
              <nav className="space-y-1 px-4">
                {filteredAtendimentoItems.map((item) => (
                  <ScrollPreservingLink
                    key={item.id}
                    to={item.to}
                    preserveScroll={true}
                    ref={isActive(item.id) ? activeItemRef : undefined}
                    className={`
                      flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive(item.id)
                        ? 'bg-seguranca-black text-seguranca-yellow'
                        : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                      }
                    `}
                  >
                    <item.icon
                      size={18}
                      className={`flex-shrink-0 ${collapsed ? 'mx-auto' : 'mr-3'}`}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.text}</span>
                    )}
                  </ScrollPreservingLink>
                ))}
              </nav>
            </div>
          )}

          {/* Módulo Sistema - SUPER_ADMIN */}
          {normalizedRole === 'SUPER_ADMIN' && filteredSistemaItems.length > 0 && (
            <div className="mb-6">
              {!collapsed && (
                <div className="px-4 py-2 text-xs font-semibold text-seguranca-lightgray uppercase tracking-wider">
                  Sistema
                </div>
              )}
              <nav className="space-y-1 px-4">
                {filteredSistemaItems.map((item) => (
                  <ScrollPreservingLink
                    key={item.id}
                    to={item.to}
                    preserveScroll={true}
                    ref={isActive(item.id) ? activeItemRef : undefined}
                    className={`
                      flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive(item.id)
                        ? 'bg-seguranca-black text-seguranca-yellow'
                        : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
                      }
                    `}
                  >
                    <item.icon
                      size={18}
                      className={`flex-shrink-0 ${collapsed ? 'mx-auto' : 'mr-3'}`}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.text}</span>
                    )}
                  </ScrollPreservingLink>
                ))}
              </nav>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          {!collapsed && user && (
            <div
              className="flex items-center space-x-3 cursor-pointer hover:bg-seguranca-black p-2 rounded-lg transition-colors"
              onClick={handleProfileClick}
            >
              <div className="w-8 h-8 bg-seguranca-yellow rounded-full flex items-center justify-center">
                <User2 size={16} className="text-seguranca-black" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-seguranca-lightgray truncate hover:text-seguranca-yellow transition-colors">
                  {user?.name || 'Usuário'}
                </div>
                <div className="text-xs text-gray-400 truncate">
                  {user?.role || 'Usuário'}
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Modal de Perfil */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};