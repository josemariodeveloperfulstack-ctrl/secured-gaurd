export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'RH' | 'ASSISTENCIA_RH' | 'DEPARTAMENTO_PESSOAL' | 'FINANCEIRO' | 'OPERACIONAL' | 'GESTOR_OPERACIONAL' | 'GESTAO_SUPERVISAO' | 'VIGILANTE' | 'AUXI_ADMINISTRATIVO' | 'AUX_DEP' | 'TI_SUPORTE' | 'AUDITOR' | 'COLABORADOR' | 'GESTOR' | 'COMERCIAL' | 'GESTOR_COMERCIAL' | 'ASSISTENTE_COMERCIAL' | 'ASSISTENTE_ADMINISTRATIVO' | 'ANALISTA_SUPRIMENTOS' | 'ESTOQUE' | 'SUPRIMENTOS' | 'COMPRAS' | 'ALMOXARIFADO';

export type UserGroup = 'GRUPO_SUPER_ADMIN' | 'GRUPO_ADMIN' | 'GRUPO_GESTOR' | 'GRUPO_RH' | 'GRUPO_DPE' | 'GRUPO_SUPERVISOR' | 'GRUPO_COLABORADORES' | 'GRUPO_OPERACIONAL' | 'GRUPO_VIGILANTES' | 'GRUPO_VIGIAS' | 'GRUPO_FINANCEIRO' | 'GRUPO_TI_SUPORTE' | 'GRUPO_AUDITOR' | 'GRUPO_AUXILIARES' | 'GRUPO_COMERCIAL' | 'GRUPO_ASSISTENTE_ADMINISTRATIVO' | 'GRUPO_ANALISTA_SUPRIMENTOS' | 'GRUPO_SUPRIMENTOS' | 'GRUPO_COMPRAS' | 'GRUPO_ESTOQUE' | 'GRUPO_ASSISTENTE_COMERCIAL' | 'GRUPO_GESTOR_COMERCIAL' | 'GRUPO_GESTOR_SUPERVISAO' | 'GRUPO_GESTOR_FINANCEIRO' | 'GRUPO_GESTOR_RH' | 'GRUPO_GESTOR_DPE';

export interface UserPermissions {
  // Permissões de Usuários
  USERS_READ: boolean;
  USERS_WRITE: boolean;
  USERS_DELETE: boolean;
  USERS_CREATE: boolean;

  // Permissões de Grupos
  GROUPS_READ: boolean;
  GROUPS_WRITE: boolean;
  GROUPS_DELETE: boolean;
  GROUPS_CREATE: boolean;

  // Permissões de Clientes
  CLIENTS_READ: boolean;
  CLIENTS_WRITE: boolean;
  CLIENTS_DELETE: boolean;
  CLIENTS_CREATE: boolean;

  // Permissões de Funcionários
  EMPLOYEES_READ: boolean;
  EMPLOYEES_WRITE: boolean;
  EMPLOYEES_DELETE: boolean;
  EMPLOYEES_CREATE: boolean;
  EMPLOYEE_HISTORY_READ: boolean;

  // Permissões de Contratos
  CONTRACTS_READ: boolean;
  CONTRACTS_WRITE: boolean;
  CONTRACTS_DELETE: boolean;
  CONTRACTS_CREATE: boolean;

  // Permissões Financeiras
  FINANCIAL_READ: boolean;
  FINANCIAL_WRITE: boolean;
  FINANCIAL_DELETE: boolean;
  FINANCIAL_CREATE: boolean;

  // Permissões Financeiras Granulares
  FINANCIAL_PAYABLE_READ: boolean;
  FINANCIAL_PAYABLE_WRITE: boolean;
  FINANCIAL_RECEIVABLE_READ: boolean;
  FINANCIAL_RECEIVABLE_WRITE: boolean;
  FINANCIAL_CASHFLOW_READ: boolean;
  FINANCIAL_INVOICE_READ: boolean;
  FINANCIAL_MEASUREMENT_READ: boolean;

  // Permissões de Holerites
  PAYSLIPS_READ: boolean;
  PAYSLIPS_WRITE: boolean;
  PAYSLIPS_DELETE: boolean;
  PAYSLIPS_CREATE: boolean;
  PAYSLIPS_PUBLISH: boolean;

  // Permissões de Estoque
  STOCK_READ: boolean;
  STOCK_WRITE: boolean;
  STOCK_DELETE: boolean;
  STOCK_CREATE: boolean;
  STOCK_MANAGE: boolean;

  // Permissões de Equipamentos/Frota
  EQUIPMENTS_READ: boolean;
  EQUIPMENTS_WRITE: boolean;
  EQUIPMENTS_DELETE: boolean;
  EQUIPMENTS_CREATE: boolean;
  EQUIPMENTS_ASSIGN: boolean;

  // Permissões de Empresas
  COMPANIES_READ: boolean;
  COMPANIES_WRITE: boolean;
  COMPANIES_DELETE: boolean;
  COMPANIES_CREATE: boolean;
  COMPANIES_MANAGE: boolean;

  // Permissões de Relatórios
  REPORTS_READ: boolean;
  REPORTS_GENERATE: boolean;
  REPORTS_EXPORT: boolean;

  // Permissões do Módulo Comercial
  LEADS_READ: boolean;
  LEADS_WRITE: boolean;
  LEADS_DELETE: boolean;
  LEADS_CREATE: boolean;

  PROPOSALS_READ: boolean;
  PROPOSALS_WRITE: boolean;
  PROPOSALS_DELETE: boolean;
  PROPOSALS_CREATE: boolean;

  QUOTES_READ: boolean;
  QUOTES_WRITE: boolean;
  QUOTES_DELETE: boolean;
  QUOTES_CREATE: boolean;

  // Permissões de Sistema
  SYSTEM_CONFIG: boolean;
  SYSTEM_LOGS: boolean;
  SYSTEM_BACKUP: boolean;
  SYSTEM_INTEGRATION: boolean;

  // Permissões de Auditoria
  AUDIT_READ: boolean;
  AUDIT_WRITE: boolean;

  // Permissões de Dashboard
  DASHBOARD_READ: boolean;
  DASHBOARD_WRITE: boolean;

  // Permissões do Dashboard Comercial
  COMMERCIAL_DASHBOARD_READ: boolean;
  SALES_GOALS_READ: boolean;
  SALES_GOALS_WRITE: boolean;

  // Permissões de Perfil
  PROFILE_READ: boolean;
  PROFILE_WRITE: boolean;

  // Permissões de Suporte
  SUPPORT_READ: boolean;
  SUPPORT_WRITE: boolean;
  SUPPORT_DELETE: boolean;
  SUPPORT_CREATE: boolean;
  SUPPORT_MANAGE: boolean;

  // Permissões de Mensagens
  MESSAGES_READ: boolean;
  MESSAGES_WRITE: boolean;
  MESSAGES_DELETE: boolean;
  MESSAGES_CREATE: boolean;
  MESSAGES_MANAGE: boolean;

  // Permissões de Atendimento
  ATTENDANCE_READ: boolean;
  ATTENDANCE_WRITE: boolean;
  ATTENDANCE_MANAGE: boolean;

  // Permissões de Visitas
  VISITS_READ: boolean;
  VISITS_WRITE: boolean;
  VISITS_CREATE: boolean;
  VISITS_UPDATE: boolean;
  VISITS_DELETE: boolean;
  VISITS_MANAGE: boolean;

  // Permissões de Ponto Eletrônico
  TIME_RECORD_READ: boolean;
  TIME_RECORD_CREATE: boolean;
  TIME_RECORD_UPDATE: boolean;
  TIME_RECORD_DELETE: boolean;
  TIME_RECORD_MANAGE: boolean;

  // Permissões de Folha de Pagamento
  PAYROLL_READ: boolean;
  PAYROLL_CREATE: boolean;
  PAYROLL_MANAGE: boolean;

  // Permissões de Gestão Patrimonial
  PATRIMONIAL_READ: boolean;
  PATRIMONIAL_WRITE: boolean;

  // Permissões do Módulo Fiscal
  FISCAL_READ: boolean;
  FISCAL_WRITE: boolean;

  // Permissão de Acesso Total
  ALL_PERMISSIONS: boolean;

  // Permissão de Cargo (Flag)
  ASSISTENTE_ADMINISTRATIVO?: boolean;
}

export interface UserGroupData {
  id: string;
  groupName: UserGroup;
  displayName: string;
  description: string;
  permissions: string[];
  userCount: number;
}

export type Role = { name: string };

export interface PermissionDTO {
  id: string;
  name: string;
  description: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roles: Role[] | string[];
  groups: UserGroupData[];
  permissions: UserPermissions;
  isOnline?: boolean;
  individualPermissions?: PermissionDTO[];
  customPermissions?: string[]; // Permissões customizadas concedidas pelo SUPER_ADMIN (para COLABORADOR)
  avatar?: string;
  department?: string;
  position?: string;
  employeeCode?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  username?: string;
  status?: string;
  active?: boolean;
  firstAccessCompleted?: boolean; // Indica se o usuário completou o primeiro acesso (mudança de senha)
  lgpdAccepted?: boolean; // Indica se o usuário assinou os termos LGPD
  createdAt?: string;
  updatedAt?: string;
}

export interface SupervisorSessionPayload {
  id: string;
  name?: string;
  email?: string;
  cpf?: string;
  phone?: string;
  isActive?: boolean;
}

export interface AuthContextType {
  user: User | null;
  profile?: any;
  login: (email: string, password: string) => Promise<void>;
  loginAsSupervisor: (supervisor: SupervisorSessionPayload, token: string) => User;
  logout: () => void;
  signOut: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshAuthToken: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  setFirstAccessCompleted: (completed: boolean) => void;
}

// Configurações de menu por role
export interface MenuItem {
  label: string;
  path: string;
  icon: string;
  requiredPermission?: keyof UserPermissions;
  color?: string;
}

export const MENU_CONFIG: Record<UserRole, MenuItem[]> = {
  SUPER_ADMIN: [
    { label: 'Dashboard', path: '/dashboard', icon: 'BarChart3', color: '🟥' },
    { label: 'Usuários', path: '/usuarios', icon: 'Users', color: '🟥' },
    { label: 'Grupos', path: '/grupos', icon: 'Users', color: '🟥' },
    { label: 'Colaboradores', path: '/employees', icon: 'Users', color: '🟥' },
    { label: 'Clientes', path: '/clients', icon: 'Building', color: '🟥' },
    { label: 'Contratos', path: '/contracts', icon: 'FileContract', color: '🟥' },
    { label: 'Financeiro', path: '/financial', icon: 'DollarSign', color: '🟥' },
    { label: 'Holerites', path: '/payslips', icon: 'FileText', color: '🟥' },
    { label: 'Relatórios', path: '/reports', icon: 'PieChart', color: '🟥' },
    { label: 'Sistema', path: '/system', icon: 'Settings', color: '🟥' },
    { label: 'Auditoria', path: '/audit', icon: 'Shield', color: '🟥' },
    { label: 'Configurações', path: '/settings', icon: 'Settings', color: '🟥' },
  ],
  ADMIN: [
    { label: 'Dashboard', path: '/dashboard', icon: 'BarChart3', color: '🟦' },
    { label: 'Usuários', path: '/usuarios', icon: 'Users', color: '🟦' },
    { label: 'Grupos', path: '/grupos', icon: 'Users', color: '🟦' },
    { label: 'Colaboradores', path: '/employees', icon: 'Users', color: '🟦' },
    { label: 'Clientes', path: '/clients', icon: 'Building', color: '🟦' },
    { label: 'Contratos', path: '/contracts', icon: 'FileContract', color: '🟦' },
    { label: 'Financeiro', path: '/financial', icon: 'DollarSign', color: '🟦' },
    { label: 'Holerites', path: '/payslips', icon: 'FileText', color: '🟦' },
    { label: 'Relatórios', path: '/reports', icon: 'PieChart', color: '🟦' },
    { label: 'Configurações', path: '/settings', icon: 'Settings', color: '🟦' },
  ],
  SUPERVISOR: [
    { label: 'Dashboard', path: '/dashboard', icon: 'BarChart3', color: '🟩' },
    { label: 'Minha Equipe', path: '/team', icon: 'Users', color: '🟩' },
    { label: 'Contratos', path: '/contracts', icon: 'FileContract', color: '🟩' },
    { label: 'Holerites', path: '/payslips', icon: 'FileText', color: '🟩' },
    { label: 'Relatórios', path: '/reports', icon: 'PieChart', color: '🟩' },
    { label: 'Configurações', path: '/settings', icon: 'Settings', color: '🟩' },
  ],
  RH: [
    { label: 'Dashboard', path: '/dashboard', icon: 'BarChart3', color: '🟨' },
    { label: 'Colaboradores', path: '/employees', icon: 'Users', color: '🟨' },
    { label: 'Holerites', path: '/payslips', icon: 'FileText', color: '🟨' },
    { label: 'Relatórios', path: '/reports', icon: 'PieChart', color: '🟨' },
    { label: 'Configurações', path: '/settings', icon: 'Settings', color: '🟨' },
  ],
  FINANCEIRO: [
    { label: 'Dashboard', path: '/dashboard', icon: 'BarChart3', color: '🟧' },
    { label: 'Financeiro', path: '/financial', icon: 'DollarSign', color: '🟧' },
    { label: 'Holerites', path: '/payslips', icon: 'FileText', color: '🟧' },
    { label: 'Relatórios', path: '/reports', icon: 'PieChart', color: '🟧' },
    { label: 'Configurações', path: '/settings', icon: 'Settings', color: '🟧' },
  ],
  TI_SUPORTE: [
    { label: 'Dashboard', path: '/dashboard', icon: 'BarChart3', color: '🟪' },
    { label: 'Usuários', path: '/usuarios', icon: 'Users', color: '🟪' },
    { label: 'Grupos', path: '/grupos', icon: 'Users', color: '🟪' },
    { label: 'Sistema', path: '/system', icon: 'Settings', color: '🟪' },
    { label: 'Configurações', path: '/settings', icon: 'Settings', color: '🟪' },
  ],
  AUDITOR: [
    { label: 'Dashboard', path: '/dashboard', icon: 'BarChart3', color: '🟫' },
    { label: 'Usuários', path: '/usuarios', icon: 'Users', color: '🟫' },
    { label: 'Colaboradores', path: '/employees', icon: 'Users', color: '🟫' },
    { label: 'Clientes', path: '/clients', icon: 'Building', color: '🟫' },
    { label: 'Contratos', path: '/contracts', icon: 'FileContract', color: '🟫' },
    { label: 'Financeiro', path: '/financial', icon: 'DollarSign', color: '🟫' },
    { label: 'Holerites', path: '/payslips', icon: 'FileText', color: '🟫' },
    { label: 'Relatórios', path: '/reports', icon: 'PieChart', color: '🟫' },
    { label: 'Auditoria', path: '/audit', icon: 'Shield', color: '🟫' },
    { label: 'Configurações', path: '/settings', icon: 'Settings', color: '🟫' },
  ],
  COLABORADOR: [
    { label: 'Meu Holerite', path: '/payslip', icon: 'FileText', color: '🟨' },
    { label: 'Meu Perfil', path: '/profile', icon: 'User', color: '🟨' },
    { label: 'Configurações', path: '/settings', icon: 'Settings', color: '🟨' },
  ],
  ASSISTENCIA_RH: [
    { label: 'Dashboard', path: '/dashboard', icon: 'BarChart3', color: '🟨' },
    { label: 'Colaboradores', path: '/employees', icon: 'Users', color: '🟨' },
    { label: 'Holerites', path: '/payslips', icon: 'FileText', color: '🟨' },
    { label: 'Relatórios', path: '/reports', icon: 'PieChart', color: '🟨' },
  ],
  DEPARTAMENTO_PESSOAL: [
    { label: 'Dashboard', path: '/dashboard', icon: 'BarChart3', color: '🟨' },
    { label: 'Colaboradores', path: '/employees', icon: 'Users', color: '🟨' },
    { label: 'Holerites', path: '/payslips', icon: 'FileText', color: '🟨' },
    { label: 'Folha de Pagamento', path: '/payroll', icon: 'DollarSign', color: '🟨' },
  ],
  COMERCIAL: [
    { label: 'Dashboard', path: '/dashboard', icon: 'BarChart3', color: '🟨' },
    { label: 'CRM / Leads', path: '/leads', icon: 'Target', color: '🟨' },
    { label: 'Propostas', path: '/propostas', icon: 'FileText', color: '🟨' },
    { label: 'Orçamentos', path: '/orcamentos', icon: 'Calculator', color: '🟨' },
    { label: 'Contratos', path: '/contratos', icon: 'FileContract', color: '🟨' },
    { label: 'Clientes', path: '/clientes', icon: 'Building2', color: '🟨' },
    { label: 'Orçamentos', path: '/orcamentos', icon: 'Calculator', color: '🟨' },
    { label: 'Contratos', path: '/contratos', icon: 'FileContract', color: '🟨' },
    { label: 'Clientes', path: '/clientes', icon: 'Building2', color: '🟨' },
  ],
  GESTOR_COMERCIAL: [
    { label: 'Dashboard', path: '/dashboard', icon: 'BarChart3', color: '🟨' },
    { label: 'Leads', path: '/leads', icon: 'Target', color: '🟨' },
    { label: 'Empresas', path: '/comercial/empresas', icon: 'Building', color: '🟨' },
    { label: 'Clientes', path: '/clientes', icon: 'Building2', color: '🟨' },
    { label: 'Propostas', path: '/propostas', icon: 'FileText', color: '🟨' },
    { label: 'Orçamentos', path: '/orcamentos', icon: 'Calculator', color: '🟨' },
    { label: 'Contratos', path: '/contratos', icon: 'FileContract', color: '🟨' },
    { label: 'CRM Comercial', path: '/crm', icon: 'Kanban', color: '🟨' },
  ],
  ASSISTENTE_COMERCIAL: [
    { label: 'Dashboard', path: '/dashboard', icon: 'BarChart3', color: '🟨' },
    { label: 'Leads', path: '/leads', icon: 'Target', color: '🟨' },
    { label: 'Clientes', path: '/clientes', icon: 'Building2', color: '🟨' },
    { label: 'Propostas', path: '/propostas', icon: 'FileText', color: '🟨' },
    { label: 'Orçamentos', path: '/orcamentos', icon: 'Calculator', color: '🟨' },
    { label: 'CRM Comercial', path: '/crm', icon: 'Kanban', color: '🟨' },
  ],
  ASSISTENTE_ADMINISTRATIVO: [
    { label: 'Dashboard', path: '/dashboard', icon: 'BarChart3', color: '🟨' },
    { label: 'Financeiro', path: '/financial', icon: 'DollarSign', color: '🟨' },
    { label: 'Contas a Pagar', path: '/gestao-financeira/contas-pagar', icon: 'CreditCard', color: '🟨' },
    { label: 'Contas a Receber', path: '/gestao-financeira/contas-receber', icon: 'Receipt', color: '🟨' },
    { label: 'Fluxo de Caixa', path: '/gestao-financeira/fluxo-caixa', icon: 'ArrowUpDown', color: '🟨' },
    { label: 'Gestão de Compras', path: '/compras', icon: 'ShoppingCart', color: '🟨' },
    { label: 'Estoque', path: '/estoque', icon: 'Package', color: '🟨' },
    { label: 'Relatórios', path: '/reports', icon: 'PieChart', color: '🟨' },
  ],
  ANALISTA_SUPRIMENTOS: [
    { label: 'Dashboard', path: '/dashboard', icon: 'BarChart3', color: '🟨' },
    { label: 'Financeiro', path: '/financial', icon: 'DollarSign', color: '🟨' },
    { label: 'Contas a Pagar', path: '/gestao-financeira/contas-pagar', icon: 'CreditCard', color: '🟨' },
    { label: 'Contas a Receber', path: '/gestao-financeira/contas-receber', icon: 'Receipt', color: '🟨' },
    { label: 'Fluxo de Caixa', path: '/gestao-financeira/fluxo-caixa', icon: 'ArrowUpDown', color: '🟨' },
    { label: 'Gestão de Compras', path: '/compras', icon: 'ShoppingCart', color: '🟨' },
    { label: 'Estoque', path: '/estoque', icon: 'Package', color: '🟨' },
    { label: 'Holerites', path: '/payslips', icon: 'FileText', color: '🟨' },
    { label: 'Relatórios', path: '/reports', icon: 'PieChart', color: '🟨' },
  ],
  OPERACIONAL: [
    { label: 'Dashboard', path: '/dashboard', icon: 'BarChart3', color: '🟧' },
    { label: 'Escalas', path: '/gestao-escalas', icon: 'Calendar', color: '🟧' },
    { label: 'Postos', path: '/rh/postos', icon: 'MapPin', color: '🟧' },
    { label: 'Operacional', path: '/operacional', icon: 'Shield', color: '🟧' },
    { label: 'Rondas', path: '/controle-rondas', icon: 'Activity', color: '🟧' },
    { label: 'Frota', path: '/frota', icon: 'Truck', color: '🟧' },
    { label: 'Equipamentos', path: '/epis', icon: 'Package', color: '🟧' },
  ],
  VIGILANTE: [],
  AUXI_ADMINISTRATIVO: [],
  AUX_DEP: [],
  ALMOXARIFADO: [
    { label: 'Dashboard', path: '/dashboard', icon: 'BarChart3', color: '🟨' },
    { label: 'Estoque', path: '/estoque', icon: 'Package', color: '🟨' },
    { label: 'Fornecedores', path: '/estoque/fornecedores', icon: 'Building2', color: '🟨' },
    { label: 'Gestão de Compras', path: '/compras', icon: 'ShoppingCart', color: '🟨' },
  ],
  GESTOR: [],
  GESTOR_OPERACIONAL: [],
  GESTAO_SUPERVISAO: [],
  ESTOQUE: [
    { label: 'Dashboard', path: '/dashboard', icon: 'BarChart3', color: '🟨' },
    { label: 'Estoque', path: '/estoque', icon: 'Package', color: '🟨' },
    { label: 'Fornecedores', path: '/estoque/fornecedores', icon: 'Building2', color: '🟨' },
  ],
  SUPRIMENTOS: [
    { label: 'Dashboard', path: '/dashboard', icon: 'BarChart3', color: '🟨' },
    { label: 'Estoque', path: '/estoque', icon: 'Package', color: '🟨' },
    { label: 'Gestão de Compras', path: '/compras', icon: 'ShoppingCart', color: '🟨' },
    { label: 'Relatórios', path: '/reports', icon: 'PieChart', color: '🟨' },
  ],
  COMPRAS: [
    { label: 'Dashboard', path: '/dashboard', icon: 'BarChart3', color: '🟨' },
    { label: 'Gestão de Compras', path: '/compras', icon: 'ShoppingCart', color: '🟨' },
    { label: 'Fornecedores', path: '/estoque/fornecedores', icon: 'Building2', color: '🟨' },
    { label: 'Relatórios', path: '/reports', icon: 'PieChart', color: '🟨' },
  ],
};

export interface UserWithGroups extends User {
  groups: UserGroupData[];
  id: string;
}