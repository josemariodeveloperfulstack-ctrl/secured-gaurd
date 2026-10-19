import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useScrollPreservation } from '@/hooks/useScrollPreservation';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { ScrollPreservingLink } from './ScrollPreservingLink';
import UserProfileModal from './UserProfileModal';
import { UserRole } from '@/types/user';
import { hasFullSystemAccess } from '@/utils/permissions';
import Logo from './Logo';
import { prefetchByPath } from '@/config/routePrefetch';
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
  Megaphone,
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
  Compass,
  FileBarChart,
  FileSignature,
  Heart,
  GraduationCap,
  Gift,
  Car,
  Database,
  LayoutDashboard,
  ChevronRight
} from 'lucide-react';

/** Persistência das seções abertas/fechadas (acordeão vertical da sidebar) */
const SIDEBAR_NAV_STORAGE_KEY = 'secured-guard-sidebar-nav-sections';

type SidebarNavSectionProps = {
  title: string;
  sidebarCollapsed: boolean;
  isEmpty?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

/**
 * Cabeçalho clicável estilo acordeão + ícone chevron; em sidebar estreita mostra só os links (sem agrupamento).
 */
function SidebarNavSection({
  title,
  sidebarCollapsed,
  isEmpty,
  open,
  onOpenChange,
  children,
}: SidebarNavSectionProps) {
  if (isEmpty) return null;

  if (sidebarCollapsed) {
    return (
      <div className="mb-3">
        <nav className="space-y-1.5 px-2 flex flex-col items-center">{children}</nav>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CollapsibleTrigger
          type="button"
          aria-label={open ? `Recolher seção ${title}` : `Expandir seção ${title}`}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-3 py-2 mx-1 text-left',
            'text-xs font-semibold uppercase tracking-wider text-seguranca-lightgray',
            'hover:bg-seguranca-black/90 hover:text-seguranca-yellow transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seguranca-yellow/60 focus-visible:ring-offset-2 focus-visible:ring-offset-seguranca-graphite'
          )}
        >
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-seguranca-yellow transition-transform duration-200 ease-out',
              open && 'rotate-90'
            )}
            aria-hidden
          />
          <span className="truncate flex-1 text-left">{title}</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden">
          <nav className="space-y-1 px-4 pt-1">{children}</nav>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface CollapsibleSidebarProps {
  collapsed: boolean;
  isMobile: boolean;
  onToggle: () => void;
}

// Menu principal
const mainMenuItems = [
  { icon: Home, text: 'Dashboard', to: '/dashboard', id: 'dashboard' },
  { icon: UserCheck, text: 'Área do Funcionário', to: '/area-funcionario', id: 'area-funcionario' },
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
  { icon: Stethoscope, text: 'Gestão de Atestados', to: '/operacional/atestados', id: 'operacional-atestados' },
];

// Módulo RH - Menu principal
const rhMenuItems = [
  { icon: Users, text: 'RH Principal', to: '/rh', id: 'rh' },
  { icon: User2, text: 'Funcionários', to: '/rh/funcionarios', id: 'rh-funcionarios' },
  { icon: MapPin, text: 'Setor de Trabalho', to: '/rh/postos', id: 'rh-postos' },
  { icon: Briefcase, text: 'Vagas', to: '/rh/vagas', id: 'rh-vagas' },
  { icon: Award, text: 'Benefícios', to: '/rh/beneficios', id: 'rh-beneficios' },
  { icon: Gift, text: 'Aniversariantes', to: '/rh/aniversariantes', id: 'rh-aniversariantes' },
  { icon: GraduationCap, text: 'Treinamentos', to: '/rh/treinamentos', id: 'rh-treinamentos' },
  { icon: Stethoscope, text: 'Gestão de Atestados', to: '/rh/atestados', id: 'rh-atestados' },
  { icon: BarChart3, text: 'Relatórios RH', to: '/rh/relatorios', id: 'rh-relatorios' },
];

// Módulo SST - Saúde e Segurança do Trabalho
const sstMenuItems = [
  { icon: Shield, text: 'Controle SST', to: '/rh/sst', id: 'rh-sst' },
  { icon: UserCog, text: 'Profissionais de SST', to: '/rh/sst/profissionais', id: 'rh-sst-profissionais' },
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
  { icon: Handshake, text: 'Admissão/Demissão', to: '/rh/admissao-demissao', id: 'dp-admissao-demissao' },
  { icon: ArrowUpDown, text: 'Remanejamentos', to: '/rh/remanejamentos', id: 'dp-remanejamentos' },
  { icon: Gift, text: 'Aniversariantes do mês', to: '/rh/aniversariantes', id: 'dp-aniversariantes' },

  // Gestão de Tempo e Frequência
  { icon: Calendar, text: 'Férias', to: '/rh/ferias', id: 'dp-ferias' },
  { icon: Stethoscope, text: 'Gestão de Atestados', to: '/rh/atestados', id: 'dp-atestados' },
  { icon: CalendarDays, text: 'Ponto Eletrônico', to: '/rh/ponto-eletronico', id: 'dp-ponto-eletronico' },
  { icon: FileText, text: 'Fechamento de Horas', to: '/rh/fechamento-horas', id: 'rh-fechamento-horas' },

  // Gestão de Ocorrências e Eventos
  { icon: FileText, text: 'Ocorrências', to: '/rh/ocorrencias', id: 'dp-ocorrencias' },

  // Benefícios (agrupados)
  { icon: Award, text: 'Benefícios', to: '/rh/beneficios', id: 'dp-beneficios' },

  // Estrutura Organizacional
  { icon: Settings, text: 'Funções', to: '/rh/funcoes', id: 'dp-funcoes' },
  { icon: Briefcase, text: 'Cargos', to: '/rh/cargos', id: 'dp-cargos' },
  { icon: MapPin, text: 'Setor de Trabalho', to: '/rh/postos', id: 'dp-postos' },

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
  { icon: Compass, text: 'Prospecção', to: '/comercial/prospeccao', id: 'prospeccao', requiredPermission: 'LEADS_READ' },
  { icon: Target, text: 'Leads', to: '/leads', id: 'leads' },
  { icon: Megaphone, text: 'Marketing', to: '/comercial/marketing', id: 'marketing', requiredPermission: 'LEADS_READ' },
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
  { icon: Mail, text: 'Gestão de E-mails', to: '/webmail', id: 'webmail' },
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
  { icon: Banknote, text: 'Pagamentos', to: '/financeiro/pagamentos', id: 'financeiro-pagamentos', requiredPermission: 'FINANCIAL_PAYABLE_WRITE' },
  { icon: Upload, text: 'Conciliação Bancária', to: '/financeiro/conciliacao-bancaria', id: 'financeiro-conciliacao-bancaria', requiredPermission: 'FINANCIAL_READ' },
  { icon: Building2, text: 'Bancos', to: '/financeiro/bancos', id: 'financeiro-bancos', requiredPermission: 'FINANCIAL_READ' },
  { icon: Building, text: 'Agências', to: '/financeiro/agencias', id: 'financeiro-agencias', requiredPermission: 'FINANCIAL_READ' },
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
  { icon: Users, text: 'Fornecedores', to: '/compras/fornecedores', id: 'compras-fornecedores' },
  { icon: BarChart3, text: 'Relatórios', to: '/compras/relatorios', id: 'compras-relatorios' },
];

// ===== MÓDULO SISTEMA (SUPER_ADMIN) =====
const sistemaMenuItems = [
  { icon: UserCog, text: 'Usuários', to: '/usuarios', id: 'usuarios' },
  { icon: UserCheck, text: 'Grupos', to: '/grupos', id: 'grupos' },
  { icon: MessageCircle, text: 'Conexão WhatsApp', to: '/whatsapp-connection', id: 'whatsapp-connection' },
  { icon: Upload, text: 'Importar Excel (Funcionários)', to: '/sistema/importar-whatsapp', id: 'sistema-importar-whatsapp' },
  { icon: Settings, text: 'Gestão de Atividades', to: '/atividades', id: 'atividades' },
  { icon: Shield, text: 'Sistema', to: '/sistema', id: 'sistema' },
  { icon: Database, text: 'Backup', to: '/configuracoes/backup', id: 'backup' },
  { icon: Settings, text: 'Configurações', to: '/configuracoes', id: 'configuracoes' },
];

/** RH / DPE / Assistência de RH — menu permitido (sem módulo Operacional) */
const RH_DPE_ASSISTENCIA_ALLOWED_SET = new Set<string>([
  'dashboard',
  'area-funcionario',
  'meus-holerites',
  'holerites',
  'filiais',
  'configuracoes',
  'rh',
  'rh-funcionarios',
  'rh-postos',
  'rh-vagas',
  'rh-beneficios',
  'rh-aniversariantes',
  'rh-treinamentos',
  'rh-relatorios',
  'rh-atestados',
  'dp-atestados',
  'operacional-atestados',
  'gestao-atestados',
  'atestados',
  'rh-sst',
  'rh-sst-exames',
  'rh-sst-epis',
  'rh-sst-acidentes',
  'rh-sst-treinamentos',
  'rh-sst-cipa',
  'rh-sst-relatorios',
  'dp-funcionarios',
  'dp-admissao-demissao',
  'dp-remanejamentos',
  'dp-aniversariantes',
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
  'webmail',
  'gestao-mensagens-grupos',
  'gestao-mensagens-notificacoes',
]);

const ROLE_ALLOWED_ITEM_IDS: Partial<Record<UserRole, Set<string>>> = {
  COLABORADOR: new Set([
    'dashboard',
    'area-funcionario',
    'meus-holerites',
    'chat-interno',
    'mensagens',
  ]),
  // RH, DPE e Assistência de RH — mesma whitelist (inclui Área do Funcionário)
  RH: RH_DPE_ASSISTENCIA_ALLOWED_SET,
  DEPARTAMENTO_PESSOAL: RH_DPE_ASSISTENCIA_ALLOWED_SET,
  ASSISTENCIA_RH: RH_DPE_ASSISTENCIA_ALLOWED_SET,
  COMERCIAL: new Set([
    'dashboard',
    'leads',
    'marketing',
    'empresas',
    'clientes',
    'propostas',
    'orcamentos',
    'contratos',
    'crm',
    'chat-interno',
    'mensagens',
    'webmail',
    'area-funcionario',
    'meus-holerites',
    'gestao-atendimento-tickets',
  ]),
  GESTOR_COMERCIAL: new Set([
    'dashboard',
    'leads',
    'marketing',
    'empresas',
    'clientes',
    'propostas',
    'orcamentos',
    'contratos',
    'crm',
    'chat-interno',
    'mensagens',
    'webmail',
    'area-funcionario',
    'meus-holerites',
    'gestao-atendimento-tickets',
  ]),
  ASSISTENTE_COMERCIAL: new Set([
    'dashboard',
    'leads',
    'marketing',
    'clientes',
    'propostas',
    'orcamentos',
    'contratos',
    'crm',
    'chat-interno',
    'mensagens',
    'webmail',
    'area-funcionario',
    'meus-holerites',
    'gestao-atendimento-tickets',
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
    'operacional-atestados',
    'rh-atestados',
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
    // Área do Funcionário (dados pessoais: Ponto, Docs, Férias, Plantões)
    'area-funcionario',
    'meus-holerites',
    // Frota
    'frota',
    // Gestão de Holerites
    'holerites',
    // Financeiro — Contas a Pagar (sem Fluxo de Caixa nem Pagamentos)
    'financeiro',
    'financeiro-contas-pagar',
    'financeiro-relatorios',
    'financeiro-centro-custos',
    // Estoque
    'estoque-simplificado',
    'estoque-relatorios',
    'estoque-alertas',
    'estoque-fornecedores',
    // Compras
    'compras',
    'compras-solicitacoes',
    'compras-aprovacoes',
    'compras-cotacoes',
    'compras-fornecedores',
    'compras-relatorios',
    // Comunicação, Emails e Mensagens
    'chat-interno',
    'mensagens',
    'webmail',
    'gestao-mensagens-grupos',
    'gestao-mensagens-notificacoes',
    'gestao-atendimento-tickets',
    // ❌ RH / DPE / SST: não permitidos
  ]),
  ALMOXARIFADO: new Set([
    'dashboard',
    // Área do Funcionário (dados pessoais: Ponto, Docs, Férias, Plantões)
    'area-funcionario',
    'meus-holerites',
    'estoque-simplificado',
    'estoque-relatorios',
    'estoque-alertas',
    'compras',
    'compras-solicitacoes',
    'compras-aprovacoes',
    'compras-cotacoes',
    'compras-fornecedores',
    'compras-relatorios',
    'chat-interno',
    'mensagens',
    'gestao-mensagens-grupos',
    'gestao-mensagens-notificacoes',
    'gestao-atendimento-tickets',
    'rh-funcionarios',
    'dp-funcionarios',
    'rh-sst-epis',
    'dp-epis',
  ]),
  ESTOQUE: new Set([
    'dashboard',
    'estoque-simplificado',
    'estoque-relatorios',
    'estoque-alertas',
    'compras',
    'compras-solicitacoes',
    'compras-aprovacoes',
    'compras-cotacoes',
    'compras-fornecedores',
    'compras-relatorios',
    'chat-interno',
    'mensagens',
    'gestao-mensagens-grupos',
    'gestao-mensagens-notificacoes',
    'gestao-atendimento-tickets',
    'rh-funcionarios',
    'dp-funcionarios',
    'rh-sst-epis',
    'dp-epis',
  ]),
  COMPRAS: new Set([
    'dashboard',
    'compras',
    'compras-solicitacoes',
    'compras-aprovacoes',
    'compras-cotacoes',
    'compras-fornecedores',
    'compras-relatorios',
    'chat-interno',
    'mensagens',
    'gestao-mensagens-grupos',
    'gestao-mensagens-notificacoes',
    'gestao-atendimento-tickets',
  ]),
  SUPRIMENTOS: new Set([
    'dashboard',
    // Área do Funcionário (dados pessoais: Ponto, Docs, Férias, Plantões)
    'area-funcionario',
    'meus-holerites',
    // Frota
    'frota',
    // Gestão de Holerites
    'holerites',
    // Financeiro — Contas a Pagar (sem Fluxo de Caixa nem Pagamentos)
    'financeiro',
    'financeiro-contas-pagar',
    'financeiro-relatorios',
    'financeiro-centro-custos',
    // Estoque
    'estoque-simplificado',
    'estoque-relatorios',
    'estoque-alertas',
    'estoque-fornecedores',
    // Compras
    'compras',
    'compras-solicitacoes',
    'compras-aprovacoes',
    'compras-cotacoes',
    'compras-fornecedores',
    'compras-relatorios',
    // Comunicação, Emails e Mensagens
    'chat-interno',
    'mensagens',
    'webmail',
    'gestao-mensagens-grupos',
    'gestao-mensagens-notificacoes',
    'gestao-atendimento-tickets',
    // ❌ RH / DPE / SST: não permitidos
  ]),
  // 🟩 SUPERVISOR — módulo Operacional, supervisão e comunicação interna completa.
  // ❌ NÃO vê: Financeiro, Fiscal, Comercial, Holerites/Folha, RH SST, Compras, Estoque, Sistema.
  SUPERVISOR: new Set([
    // Menu principal
    'dashboard',
    'area-funcionario',
    'meus-holerites', // próprio holerite (área do funcionário)
    'frota', // veículos do posto (uso operacional)
    // Módulo Operacional (todos os itens)
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
    'operacional-atestados',
    'rh-atestados',
    // Comunicação interna (chat, mensagens, webmail, grupos e notificações)
    'chat-interno',
    'mensagens',
    'webmail',
    'gestao-mensagens-grupos',
    'gestao-mensagens-notificacoes',
  ]),
};

// Roles que NÃO devem ver módulos Financeiro ou Fiscal
const ROLES_WITHOUT_FINANCIAL_MODULES = new Set<UserRole>([
  'RH',
  'DEPARTAMENTO_PESSOAL',
  'ALMOXARIFADO',
  'ESTOQUE',
  'SUPERVISOR',
  'VIGILANTE',
  'OPERACIONAL',
  'COLABORADOR',
  // ✅ SUPRIMENTOS / ANALISTA_SUPRIMENTOS — acesso parcial ao Financeiro (Contas a Pagar), sem Fluxo de Caixa nem Pagamentos
]);

// Roles que NÃO devem ver módulo Comercial (Leads, Marketing, Empresas, Clientes, Propostas, etc.)
const ROLES_WITHOUT_COMMERCIAL_MODULES = new Set<UserRole>([
  'SUPERVISOR',
  'VIGILANTE',
  'OPERACIONAL',
  'RH',
  'DEPARTAMENTO_PESSOAL',
  'COLABORADOR',
  'ALMOXARIFADO',
  'ESTOQUE',
  'COMPRAS',
  'SUPRIMENTOS',
  'ANALISTA_SUPRIMENTOS', // ✅ não acessa comercial
]);

// Roles que NÃO devem ver módulo Sistema (Usuários, Grupos, Configurações, Backup)
const ROLES_WITHOUT_SYSTEM_MODULES = new Set<UserRole>([
  'SUPERVISOR',
  'VIGILANTE',
  'OPERACIONAL',
  'RH',
  'DEPARTAMENTO_PESSOAL',
  'COLABORADOR',
  'COMERCIAL',
  'GESTOR_COMERCIAL',
  'ASSISTENTE_COMERCIAL',
  'ALMOXARIFADO',
  'ESTOQUE',
  'COMPRAS',
  'SUPRIMENTOS',
  'ANALISTA_SUPRIMENTOS', // ✅ não acessa administração do sistema
  'FINANCEIRO',
  'AUDITOR',
]);

// Roles que NÃO devem ver módulo RH / SST / Departamento Pessoal
const ROLES_WITHOUT_HR_MODULES = new Set<UserRole>([
  'SUPERVISOR',
  'VIGILANTE',
  'OPERACIONAL',
  'COLABORADOR',
  'COMERCIAL',
  'GESTOR_COMERCIAL',
  'ASSISTENTE_COMERCIAL',
  'ALMOXARIFADO',
  'ESTOQUE',
  'COMPRAS',
  'SUPRIMENTOS',
  'ANALISTA_SUPRIMENTOS', // ✅ Suprimentos não acessa RH, DPE, SST
  'FINANCEIRO',
]);

// Roles que NÃO devem ver módulo Compras / Estoque / Suprimentos
const ROLES_WITHOUT_PURCHASING_MODULES = new Set<UserRole>([
  'SUPERVISOR',
  'VIGILANTE',
  'OPERACIONAL',
  'RH',
  'DEPARTAMENTO_PESSOAL',
  'COLABORADOR',
  'COMERCIAL',
  'GESTOR_COMERCIAL',
  'ASSISTENTE_COMERCIAL',
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
    // SUPER_ADMIN e ADMINISTRADOR têm acesso a tudo
    if (hasFullSystemAccess(normalizedRole)) {
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

  // Indica se o papel principal possui whitelist explícita.
  // Quando sim, o whitelist é a fonte da verdade e NÃO usamos fallback por permissão,
  // evitando que itens vazem para papéis restritos (ex.: SUPERVISOR ver Relatórios
  // Financeiros só porque tem REPORTS_READ).
  const hasStrictWhitelist = useMemo(() => {
    if (!normalizedRole) return false;
    return ROLE_ALLOWED_ITEM_IDS[normalizedRole] !== undefined;
  }, [normalizedRole]);

  const filterItemsForRole = useCallback(<T extends { id: string, requiredPermission?: string }>(items: T[]): T[] => {
    // SUPER_ADMIN e ADMINISTRADOR sempre vêem todos os itens
    if (hasFullSystemAccess(normalizedRole)) {
      return items;
    }

    if (!allowedItemIds) {
      return items;
    }

    return items.filter(item => {
      // Se está na lista permitida pelo papel
      if (allowedItemIds.has(item.id)) return true;

      // Modo estrito: papéis com whitelist (ex.: SUPERVISOR) só veem o que estiver
      // explicitamente listado. Não cair no fallback de permissão.
      if (hasStrictWhitelist) return false;

      // Modo permissivo (papéis sem whitelist explícita): usar a permissão como fallback
      if (item.requiredPermission && hasPermission(item.requiredPermission)) return true;

      return false;
    });
  }, [allowedItemIds, normalizedRole, hasPermission, hasStrictWhitelist]);

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
  const filteredRhItems = useMemo(() => {
    if (ROLES_WITHOUT_HR_MODULES.has(normalizedRole)) return [];
    return filterItemsForRole(rhMenuItems);
  }, [filterItemsForRole, normalizedRole]);
  const filteredSstItems = useMemo(() => {
    if (ROLES_WITHOUT_HR_MODULES.has(normalizedRole)) return [];
    return filterItemsForRole(sstMenuItems);
  }, [filterItemsForRole, normalizedRole]);
  const filteredDepartamentoPessoalItems = useMemo(() => {
    if (ROLES_WITHOUT_HR_MODULES.has(normalizedRole)) return [];
    return filterItemsForRole(departamentoPessoalMenuItems);
  }, [filterItemsForRole, normalizedRole]);
  const filteredComercialItems = useMemo(() => {
    if (ROLES_WITHOUT_COMMERCIAL_MODULES.has(normalizedRole)) return [];
    return filterItemsForRole(comercialMenuItems);
  }, [filterItemsForRole, normalizedRole]);
  const filteredEstoqueItems = useMemo(() => {
    if (ROLES_WITHOUT_PURCHASING_MODULES.has(normalizedRole)) return [];
    return filterItemsForRole(estoqueMenuItems);
  }, [filterItemsForRole, normalizedRole]);
  const filteredComprasItems = useMemo(() => {
    if (ROLES_WITHOUT_PURCHASING_MODULES.has(normalizedRole)) return [];
    return filterItemsForRole(comprasMenuItems);
  }, [filterItemsForRole, normalizedRole]);
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
  const filteredSistemaItems = useMemo(() => {
    if (ROLES_WITHOUT_SYSTEM_MODULES.has(normalizedRole)) return [];
    return filterItemsForRole(sistemaMenuItems);
  }, [filterItemsForRole, normalizedRole]);

  // Sempre que a rota mudar, garantir que o item ativo fique visível na sidebar
  useEffect(() => {
    if (activeItemRef.current && scrollContainerRef.current) {
      activeItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [location.pathname, location.search]);

  const getActiveId = useCallback(() => {
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
  }, [location.pathname, location.search]);

  const isActive = useCallback((id: string) => getActiveId() === id, [getActiveId]);

  /** Acordeão vertical: `undefined` = aberto (comportamento padrão), `false` = usuário fechou */
  const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_NAV_STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Record<string, boolean>;
    } catch {
      /* ignore */
    }
    return {};
  });

  const persistSectionOpen = useCallback((next: Record<string, boolean>) => {
    try {
      localStorage.setItem(SIDEBAR_NAV_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const setSectionKey = useCallback(
    (key: string, value: boolean) => {
      setSectionOpen(prev => {
        const next = { ...prev, [key]: value };
        persistSectionOpen(next);
        return next;
      });
    },
    [persistSectionOpen]
  );

  const isSectionOpen = useCallback(
    (key: string) => sectionOpen[key] !== false,
    [sectionOpen]
  );

  // Abre automaticamente a seção que contém a rota atual (usuário sempre vê o item ativo)
  useEffect(() => {
    const aid = getActiveId();
    setSectionOpen(prev => {
      const next = { ...prev };
      let changed = false;
      const openIf = (key: string, list: { id: string }[]) => {
        if (list.some(i => i.id === aid) && next[key] !== true) {
          next[key] = true;
          changed = true;
        }
      };
      openIf('main', filteredMainMenuItems);
      openIf('financeiro', visibleFinanceiroItems);
      openIf('fiscal', visibleFiscalItems);
      openIf('operacional', filteredOperacionalItems);
      openIf('rh', filteredRhItems);
      openIf('sst', filteredSstItems);
      openIf('dp', filteredDepartamentoPessoalItems);
      openIf('comercial', filteredComercialItems);
      openIf('estoque', filteredEstoqueItems);
      openIf('compras', filteredComprasItems);
      openIf('comunicacao', filteredComunicacaoInternaItems);
      openIf('atendimento', filteredAtendimentoItems);
      openIf('sistema', filteredSistemaItems);
      if (!changed) return prev;
      persistSectionOpen(next);
      return next;
    });
  }, [
    getActiveId,
    filteredMainMenuItems,
    visibleFinanceiroItems,
    visibleFiscalItems,
    filteredOperacionalItems,
    filteredRhItems,
    filteredSstItems,
    filteredDepartamentoPessoalItems,
    filteredComercialItems,
    filteredEstoqueItems,
    filteredComprasItems,
    filteredComunicacaoInternaItems,
    filteredAtendimentoItems,
    filteredSistemaItems,
    persistSectionOpen,
  ]);

  const renderNavItem = (item: {
    id: string;
    to: string;
    text: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }) => {
    const isCurrentActive = isActive(item.id);
    const Icon = item.icon;

    return (
      <ScrollPreservingLink
        key={item.id}
        to={item.to}
        preserveScroll={true}
        ref={isCurrentActive ? activeItemRef : undefined}
        onMouseEnter={() => prefetchByPath(item.to)}
        title={collapsed ? item.text : undefined}
        className={cn(
          'group flex items-center rounded-lg text-sm font-medium transition-all duration-150',
          collapsed
            ? 'justify-center w-10 h-10 mx-auto p-0'
            : 'w-full px-3 py-2',
          isCurrentActive
            ? 'bg-seguranca-black text-seguranca-yellow font-semibold shadow-inner'
            : 'text-seguranca-lightgray hover:bg-seguranca-black hover:text-seguranca-yellow'
        )}
      >
        <Icon
          size={18}
          className={cn(
            'shrink-0 transition-colors',
            collapsed ? 'mx-0' : 'mr-3 text-seguranca-lightgray group-hover:text-seguranca-yellow'
          )}
        />
        {!collapsed && (
          <span className="truncate">{item.text}</span>
        )}
      </ScrollPreservingLink>
    );
  };

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
              <div className="flex items-center justify-center mx-auto">
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
          <SidebarNavSection
            title="Menu Principal"
            sidebarCollapsed={collapsed}
            isEmpty={filteredMainMenuItems.length === 0}
            open={isSectionOpen('main')}
            onOpenChange={(v) => setSectionKey('main', v)}
          >
            {filteredMainMenuItems.map(renderNavItem)}
          </SidebarNavSection>

          {/* Módulo Financeiro */}
          <SidebarNavSection
            title="Módulo Financeiro"
            sidebarCollapsed={collapsed}
            isEmpty={visibleFinanceiroItems.length === 0}
            open={isSectionOpen('financeiro')}
            onOpenChange={(v) => setSectionKey('financeiro', v)}
          >
            {visibleFinanceiroItems.map(renderNavItem)}
          </SidebarNavSection>

          {/* Módulo Fiscal */}
          <SidebarNavSection
            title="Módulo Fiscal"
            sidebarCollapsed={collapsed}
            isEmpty={visibleFiscalItems.length === 0}
            open={isSectionOpen('fiscal')}
            onOpenChange={(v) => setSectionKey('fiscal', v)}
          >
            {visibleFiscalItems.map(renderNavItem)}
          </SidebarNavSection>

          {/* Grupo Operacional */}
          {shouldShowModule() && (
            <SidebarNavSection
              title="Operacional"
              sidebarCollapsed={collapsed}
              isEmpty={filteredOperacionalItems.length === 0}
              open={isSectionOpen('operacional')}
              onOpenChange={(v) => setSectionKey('operacional', v)}
            >
              {filteredOperacionalItems.map(renderNavItem)}
            </SidebarNavSection>
          )}

          {/* Grupo RH */}
          {shouldShowModule('EMPLOYEES_READ') && (
            <SidebarNavSection
              title="Recursos Humanos"
              sidebarCollapsed={collapsed}
              isEmpty={filteredRhItems.length === 0}
              open={isSectionOpen('rh')}
              onOpenChange={(v) => setSectionKey('rh', v)}
            >
              {filteredRhItems.map(renderNavItem)}
            </SidebarNavSection>
          )}

          {/* Grupo SST */}
          {shouldShowModule('EMPLOYEES_READ') && (
            <SidebarNavSection
              title="Saúde e Segurança (SST)"
              sidebarCollapsed={collapsed}
              isEmpty={filteredSstItems.length === 0}
              open={isSectionOpen('sst')}
              onOpenChange={(v) => setSectionKey('sst', v)}
            >
              {filteredSstItems.map(renderNavItem)}
            </SidebarNavSection>
          )}

          {/* Departamento Pessoal */}
          {shouldShowModule('EMPLOYEES_READ') && (
            <SidebarNavSection
              title="Departamento Pessoal"
              sidebarCollapsed={collapsed}
              isEmpty={filteredDepartamentoPessoalItems.length === 0}
              open={isSectionOpen('dp')}
              onOpenChange={(v) => setSectionKey('dp', v)}
            >
              {filteredDepartamentoPessoalItems.map(renderNavItem)}
            </SidebarNavSection>
          )}

          {/* Grupo Comercial */}
          {shouldShowModule('LEADS_READ') && (
            <SidebarNavSection
              title="Comercial"
              sidebarCollapsed={collapsed}
              isEmpty={filteredComercialItems.length === 0}
              open={isSectionOpen('comercial')}
              onOpenChange={(v) => setSectionKey('comercial', v)}
            >
              {filteredComercialItems.map(renderNavItem)}
            </SidebarNavSection>
          )}

          {/* Grupo Gestão de Estoque */}
          {shouldShowModule('STOCK_READ') && (
            <SidebarNavSection
              title="Gestão de Estoque"
              sidebarCollapsed={collapsed}
              isEmpty={filteredEstoqueItems.length === 0}
              open={isSectionOpen('estoque')}
              onOpenChange={(v) => setSectionKey('estoque', v)}
            >
              <div className={collapsed ? "space-y-1.5 flex flex-col items-center" : "space-y-1"}>
                {filteredEstoqueItems.map(renderNavItem)}
              </div>
            </SidebarNavSection>
          )}

          {/* Grupo Gestão de Compras */}
          {shouldShowModule('STOCK_MANAGE') && (
            <SidebarNavSection
              title="Gestão de Compras"
              sidebarCollapsed={collapsed}
              isEmpty={filteredComprasItems.length === 0}
              open={isSectionOpen('compras')}
              onOpenChange={(v) => setSectionKey('compras', v)}
            >
              <div className={collapsed ? "space-y-1.5 flex flex-col items-center" : "space-y-1"}>
                {filteredComprasItems.map(renderNavItem)}
              </div>
            </SidebarNavSection>
          )}

          {/* Grupo Comunicação Interna (Unificado) */}
          {shouldShowModule('MESSAGES_READ') && (
            <SidebarNavSection
              title="Comunicação Interna"
              sidebarCollapsed={collapsed}
              isEmpty={filteredComunicacaoInternaItems.length === 0}
              open={isSectionOpen('comunicacao')}
              onOpenChange={(v) => setSectionKey('comunicacao', v)}
            >
              {filteredComunicacaoInternaItems.map(renderNavItem)}
            </SidebarNavSection>
          )}

          {/* Grupo Atendimento */}
          {shouldShowModule('ATTENDANCE_READ') && (
            <SidebarNavSection
              title="Atendimento"
              sidebarCollapsed={collapsed}
              isEmpty={filteredAtendimentoItems.length === 0}
              open={isSectionOpen('atendimento')}
              onOpenChange={(v) => setSectionKey('atendimento', v)}
            >
              {filteredAtendimentoItems.map(renderNavItem)}
            </SidebarNavSection>
          )}

          {/* Módulo Sistema - SUPER_ADMIN / ADMINISTRADOR */}
          {hasFullSystemAccess(normalizedRole) && (
            <SidebarNavSection
              title="Sistema"
              sidebarCollapsed={collapsed}
              isEmpty={filteredSistemaItems.length === 0}
              open={isSectionOpen('sistema')}
              onOpenChange={(v) => setSectionKey('sistema', v)}
            >
              {filteredSistemaItems.map(renderNavItem)}
            </SidebarNavSection>
          )}
        </div>

        {/* Footer */}
        <div className={cn("border-t border-gray-700", collapsed ? "p-2 flex items-center justify-center" : "p-4")}>
          {!collapsed && user && (
            <div
              className="flex items-center space-x-3 cursor-pointer hover:bg-seguranca-black p-2 rounded-lg transition-colors w-full"
              onClick={handleProfileClick}
            >
              <div className="w-8 h-8 bg-seguranca-yellow rounded-full flex items-center justify-center shrink-0">
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

          {collapsed && user && (
            <div
              className="w-10 h-10 flex items-center justify-center cursor-pointer hover:bg-seguranca-black rounded-lg transition-colors mx-auto"
              onClick={handleProfileClick}
              title={user?.name || 'Usuário'}
            >
              <div className="w-8 h-8 bg-seguranca-yellow rounded-full flex items-center justify-center">
                <User2 size={16} className="text-seguranca-black" />
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