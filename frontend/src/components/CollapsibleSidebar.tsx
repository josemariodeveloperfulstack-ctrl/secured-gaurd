import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useScrollPreservation } from '@/hooks/useScrollPreservation';
import { Button } from '@/components/ui/button';
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
  Ruler
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
  { icon: Settings, text: 'Configurações', to: '/configuracoes', id: 'configuracoes' },
];

  // Módulo Operacional
  const operacionalMenuItems = [
    { icon: Shield, text: 'Operacional', to: '/operacional', id: 'operacional' },
    { icon: ClipboardList, text: 'Serviços', to: '/servicos', id: 'servicos' },
    { icon: Route, text: 'Escalas Otimizadas', to: '/controle-visitas-avancado', id: 'escalas-otimizadas' },
    { icon: FileText, text: 'Guia de Transporte', to: '/guia-transporte', id: 'guia-transporte' },
  ];

// Módulo RH/Departamento Pessoal
const rhMenuItems = [
  { icon: Users, text: 'RH Principal', to: '/rh', id: 'rh' },
  { icon: User2, text: 'Funcionários', to: '/rh/funcionarios', id: 'rh-funcionarios' },
  { icon: MapPin, text: 'Postos de Trabalho', to: '/postos', id: 'postos' },
  { icon: Settings, text: 'Funções', to: '/rh/funcoes', id: 'rh-funcoes' },
  { icon: Briefcase, text: 'Cargos', to: '/rh/cargos', id: 'rh-cargos' },
  { icon: Briefcase, text: 'Vagas', to: '/rh/vagas', id: 'rh-vagas' },
];

// Módulo Comercial
const comercialMenuItems = [
  { icon: Target, text: 'Leads', to: '/leads', id: 'leads' },
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
];

// Módulo Suporte
const suporteMenuItems = [
  { icon: Headphones, text: 'Central de Suporte', to: '/suporte', id: 'suporte' },
  { icon: Send, text: 'Tickets', to: '/tickets', id: 'tickets' },
];

// ===== MÓDULO DE COMUNICAÇÃO INTERNA (SIMPLIFICADO) =====
const comunicacaoInternaMenuItems = [
  // Chat e Mensagens Básicas
  { icon: MessageCircle, text: 'Chat Interno', to: '/chat-interno', id: 'chat-interno' },
  { icon: Send, text: 'Enviar Mensagens', to: '/gestao-mensagens/enviar', id: 'gestao-mensagens-enviar' },
  { icon: Users, text: 'Grupos de Mensagens', to: '/gestao-mensagens/grupos', id: 'gestao-mensagens-grupos' },
  { icon: Bell, text: 'Notificações', to: '/gestao-mensagens/notificacoes', id: 'gestao-mensagens-notificacoes' },
];

// ===== NOVO: MÓDULO DE ATENDIMENTO =====
const atendimentoMenuItems = [
  { icon: Phone, text: 'Dashboard de Atendimento', to: '/gestao-atendimento/dashboard', id: 'gestao-atendimento-dashboard' },
  { icon: Clock, text: 'Histórico de Conversas', to: '/gestao-atendimento/historico', id: 'gestao-atendimento-historico' },
  { icon: UserCog, text: 'Gerenciar Agentes', to: '/gestao-atendimento/agentes', id: 'gestao-atendimento-agentes' },
  { icon: BarChart3, text: 'Métricas', to: '/gestao-atendimento/metricas', id: 'gestao-atendimento-metricas' },
  { icon: Settings, text: 'Chatbot', to: '/gestao-atendimento/chatbot', id: 'gestao-atendimento-chatbot' },
];

// ===== MÓDULO FINANCEIRO COMPLETO =====
const financeiroMenuItems = [
  { icon: DollarSign, text: 'Financeiro', to: '/financeiro', id: 'financeiro' },
  { icon: CreditCard, text: 'Contas a Pagar', to: '/financeiro/contas-pagar', id: 'financeiro-contas-pagar' },
  { icon: Receipt, text: 'Contas a Receber', to: '/financeiro/contas-receber', id: 'financeiro-contas-receber' },
  { icon: TrendingUp, text: 'Fluxo de Caixa', to: '/financeiro/fluxo-caixa', id: 'financeiro-fluxo-caixa' },
  { icon: Banknote, text: 'Pagamentos', to: '/financeiro/pagamentos', id: 'financeiro-pagamentos' },
  { icon: Upload, text: 'Conciliação Bancária', to: '/financeiro/conciliacao-bancaria', id: 'financeiro-conciliacao-bancaria' },
  { icon: Building2, text: 'Bancos', to: '/financeiro/bancos', id: 'financeiro-bancos' },
  { icon: Building, text: 'Agências', to: '/financeiro/agencias', id: 'financeiro-agencias' },
  { icon: BarChart3, text: 'Relatórios Financeiros', to: '/financeiro/relatorios', id: 'financeiro-relatorios' },
  { icon: Wallet, text: 'Centro de Custos', to: '/financeiro/centro-custos', id: 'financeiro-centro-custos' },
  { icon: Ruler, text: 'Medição', to: '/financeiro/medicao', id: 'financeiro-medicao' },
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
  { icon: Settings, text: 'Gestão de Atividades', to: '/atividades', id: 'atividades' },
  { icon: Shield, text: 'Sistema', to: '/sistema', id: 'sistema' },
  { icon: Settings, text: 'Configurações', to: '/configuracoes', id: 'configuracoes' },
];

export const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({
  collapsed,
  isMobile,
  onToggle
}) => {
  const location = useLocation();
  const { user } = useAuth();
  const { forceScrollToTop } = useScrollPreservation();

  // Função para verificar se usuário tem permissão
  const hasPermission = (permission: string): boolean => {
    if (!user?.permissions) return false;
    return user.permissions[permission] || user.permissions.ALL_PERMISSIONS;
  };

  // Função para verificar se módulo deve ser exibido
  const shouldShowModule = (requiredPermission?: string): boolean => {
    if (!requiredPermission) return true;
    return hasPermission(requiredPermission);
  };

  const getActiveId = () => {
    const path = location.pathname;
    const allItems = [
      ...mainMenuItems,
      ...financeiroMenuItems,
      ...operacionalMenuItems,
      ...rhMenuItems,
      ...comercialMenuItems,
      ...estoqueMenuItems,
      ...comprasMenuItems,
      ...suporteMenuItems,
      ...comunicacaoInternaMenuItems,
      ...atendimentoMenuItems,
      ...sistemaMenuItems
    ];

    // Primeiro tenta encontrar uma correspondência exata
    let activeItem = allItems.find(item => item.to === path);

    // Se não encontrar, tenta corresponder apenas o pathname (sem parâmetros)
    if (!activeItem) {
      activeItem = allItems.find(item => {
        const itemPath = item.to.split('?')[0]; // Remove parâmetros da URL do item
        return itemPath === path;
      });
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
          flex flex-col transition-all duration-300 z-50
          ${collapsed ? 'w-16' : 'w-64'}
          ${isMobile && collapsed ? '-translate-x-full' : ''}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-seguranca-red rounded-lg flex items-center justify-center">
                  <Shield size={20} className="text-white" />
                </div>
                <span className="text-lg font-bold text-seguranca-lightgray">
                  Secure Guard
                </span>
              </div>
            )}

            {collapsed && (
              <div className="w-8 h-8 bg-seguranca-red rounded-lg flex items-center justify-center mx-auto">
                <Shield size={20} className="text-white" />
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
        <div className="flex-1 overflow-y-auto py-4">
          {/* Menu Principal */}
          <div className="mb-6">
            {!collapsed && (
              <div className="px-4 py-2 text-xs font-semibold text-seguranca-lightgray uppercase tracking-wider">
                Menu Principal
              </div>
            )}
            <nav className="space-y-1 px-4">
                              {mainMenuItems.map((item) => (
                  <ScrollPreservingLink
                    key={item.id}
                    to={item.to}
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
          {shouldShowModule('FINANCIAL_READ') && (
            <div className="mb-6">
              {!collapsed && (
                <div className="px-4 py-2 text-xs font-semibold text-seguranca-lightgray uppercase tracking-wider">
                  Módulo Financeiro
                </div>
              )}
              <nav className="space-y-1 px-4">
                {financeiroMenuItems.map((item) => (
                  <ScrollPreservingLink
                    key={item.id}
                    to={item.to}
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
          <div className="mb-6">
            {!collapsed && (
              <div className="px-4 py-2 text-xs font-semibold text-seguranca-lightgray uppercase tracking-wider">
                Operacional
              </div>
            )}
            <nav className="space-y-1 px-4">
                              {operacionalMenuItems.map((item) => (
                  <ScrollPreservingLink
                    key={item.id}
                    to={item.to}
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

          {/* Grupo RH */}
          <div className="mb-6">
            {!collapsed && (
              <div className="px-4 py-2 text-xs font-semibold text-seguranca-lightgray uppercase tracking-wider">
                Recursos Humanos
              </div>
            )}
            <nav className="space-y-1 px-4">
              {rhMenuItems.map((item) => (
                <ScrollPreservingLink
                  key={item.id}
                  to={item.to}
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

          {/* Grupo Comercial */}
          <div className="mb-6">
            {!collapsed && (
              <div className="px-4 py-2 text-xs font-semibold text-seguranca-lightgray uppercase tracking-wider">
                Comercial
              </div>
            )}
            <nav className="space-y-1 px-4">
              {comercialMenuItems.map((item) => (
                <ScrollPreservingLink
                  key={item.id}
                  to={item.to}
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

          {/* Grupo Estoque Simplificado */}
          <div className="mb-6">
            {!collapsed && (
              <div className="px-4 py-2 text-xs font-semibold text-seguranca-lightgray uppercase tracking-wider">
                Estoque
              </div>
            )}
            <nav className="space-y-1 px-4">
              {estoqueMenuItems.map((item) => (
                <ScrollPreservingLink
                  key={item.id}
                  to={item.to}
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

          {/* Grupo Compras */}
          <div className="mb-6">
            {!collapsed && (
              <div className="px-4 py-2 text-xs font-semibold text-seguranca-lightgray uppercase tracking-wider">
                Compras
              </div>
            )}
            <nav className="space-y-1 px-4">
              {comprasMenuItems.map((item) => (
                <ScrollPreservingLink
                  key={item.id}
                  to={item.to}
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

          {/* Grupo Suporte */}
          {shouldShowModule('SUPPORT_READ') && (
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

          {/* Grupo Comunicação Interna (Unificado) */}
          {shouldShowModule('MESSAGES_READ') && (
            <div className="mb-6">
              {!collapsed && (
                <div className="px-4 py-2 text-xs font-semibold text-seguranca-lightgray uppercase tracking-wider">
                  Comunicação Interna
                </div>
              )}
              <nav className="space-y-1 px-4">
                {comunicacaoInternaMenuItems.map((item) => (
                  <ScrollPreservingLink
                    key={item.id}
                    to={item.to}
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
          {shouldShowModule('ATTENDANCE_READ') && (
            <div className="mb-6">
              {!collapsed && (
                <div className="px-4 py-2 text-xs font-semibold text-seguranca-lightgray uppercase tracking-wider">
                  Atendimento
                </div>
              )}
              <nav className="space-y-1 px-4">
                {atendimentoMenuItems.map((item) => (
                  <ScrollPreservingLink
                    key={item.id}
                    to={item.to}
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
          {user?.role === 'SUPER_ADMIN' && (
            <div className="mb-6">
              {!collapsed && (
                <div className="px-4 py-2 text-xs font-semibold text-seguranca-lightgray uppercase tracking-wider">
                  Sistema
                </div>
              )}
              <nav className="space-y-1 px-4">
                {sistemaMenuItems.map((item) => (
                  <ScrollPreservingLink
                    key={item.id}
                    to={item.to}
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
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-seguranca-yellow rounded-full flex items-center justify-center">
                <User2 size={16} className="text-seguranca-black" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-seguranca-lightgray truncate">
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
    </>
  );
};