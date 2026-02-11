import { UserRole, UserPermissions, UserGroupData } from '@/types/user';

export const USER_ROLE_LIST: UserRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'GESTOR',
  'COMERCIAL',
  'SUPERVISOR',
  'RH',
  'ASSISTENCIA_RH',
  'DEPARTAMENTO_PESSOAL',
  'FINANCEIRO',
  'OPERACIONAL',
  'TI_SUPORTE',
  'AUDITOR',
  'COLABORADOR',
  'VIGILANTE',
  'AUXI_ADMINISTRATIVO',
  'ASSISTENTE_ADMINISTRATIVO',
  'AUX_DEP',
];

// Função para gerar permissões baseadas no role principal
export const generatePermissions = (role: UserRole): UserPermissions => {
  // Normalizar role (remover prefixo ROLE_ para compatibilidade com backend)
  const normalizedRole = (typeof role === 'string' ? role.replace(/^ROLE_/, '') : role) as UserRole;
  const basePermissions: UserPermissions = {
    // Permissões de Usuários
    USERS_READ: false,
    USERS_WRITE: false,
    USERS_DELETE: false,
    USERS_CREATE: false,

    // Permissões de Grupos
    GROUPS_READ: false,
    GROUPS_WRITE: false,
    GROUPS_DELETE: false,
    GROUPS_CREATE: false,

    // Permissões de Clientes
    CLIENTS_READ: false,
    CLIENTS_WRITE: false,
    CLIENTS_DELETE: false,
    CLIENTS_CREATE: false,

    // Permissões de Funcionários
    EMPLOYEES_READ: false,
    EMPLOYEES_WRITE: false,
    EMPLOYEES_DELETE: false,
    EMPLOYEES_CREATE: false,

    // Permissões de Contratos
    CONTRACTS_READ: false,
    CONTRACTS_WRITE: false,
    CONTRACTS_DELETE: false,
    CONTRACTS_CREATE: false,

    // Permissões Financeiras
    FINANCIAL_READ: false,
    FINANCIAL_WRITE: false,
    FINANCIAL_DELETE: false,
    FINANCIAL_CREATE: false,

    // Permissões Financeiras Granulares
    FINANCIAL_PAYABLE_READ: false,
    FINANCIAL_PAYABLE_WRITE: false,
    FINANCIAL_RECEIVABLE_READ: false,
    FINANCIAL_RECEIVABLE_WRITE: false,
    FINANCIAL_CASHFLOW_READ: false,
    FINANCIAL_INVOICE_READ: false,
    FINANCIAL_MEASUREMENT_READ: false,

    // Permissões de Holerites
    PAYSLIPS_READ: false,
    PAYSLIPS_WRITE: false,
    PAYSLIPS_DELETE: false,
    PAYSLIPS_CREATE: false,
    PAYSLIPS_PUBLISH: false,

    // Permissões de Estoque
    STOCK_READ: false,
    STOCK_WRITE: false,
    STOCK_DELETE: false,
    STOCK_CREATE: false,
    STOCK_MANAGE: false,

    // Permissões de Equipamentos/Frota
    EQUIPMENTS_READ: false,
    EQUIPMENTS_WRITE: false,
    EQUIPMENTS_DELETE: false,
    EQUIPMENTS_CREATE: false,
    EQUIPMENTS_ASSIGN: false,

    // Permissões de Empresas
    COMPANIES_READ: false,
    COMPANIES_WRITE: false,
    COMPANIES_DELETE: false,
    COMPANIES_CREATE: false,
    COMPANIES_MANAGE: false,

    // Permissões de Relatórios
    REPORTS_READ: false,
    REPORTS_GENERATE: false,
    REPORTS_EXPORT: false,

    // Permissões do Módulo Comercial
    LEADS_READ: false,
    LEADS_WRITE: false,
    LEADS_DELETE: false,
    LEADS_CREATE: false,

    PROPOSALS_READ: false,
    PROPOSALS_WRITE: false,
    PROPOSALS_DELETE: false,
    PROPOSALS_CREATE: false,

    QUOTES_READ: false,
    QUOTES_WRITE: false,
    QUOTES_DELETE: false,
    QUOTES_CREATE: false,

    // Permissões de Sistema
    SYSTEM_CONFIG: false,
    SYSTEM_LOGS: false,
    SYSTEM_BACKUP: false,
    SYSTEM_INTEGRATION: false,

    // Permissões de Auditoria
    AUDIT_READ: false,
    AUDIT_WRITE: false,

    // Permissões de Dashboard
    DASHBOARD_READ: false,
    DASHBOARD_WRITE: false,

    // Permissões do Dashboard Comercial
    COMMERCIAL_DASHBOARD_READ: false,
    SALES_GOALS_READ: false,
    SALES_GOALS_WRITE: false,

    // Permissões de Perfil
    PROFILE_READ: false,
    PROFILE_WRITE: false,

    // Permissões de Suporte
    SUPPORT_READ: false,
    SUPPORT_WRITE: false,
    SUPPORT_DELETE: false,
    SUPPORT_CREATE: false,
    SUPPORT_MANAGE: false,

    // Permissões de Mensagens
    MESSAGES_READ: false,
    MESSAGES_WRITE: false,
    MESSAGES_DELETE: false,
    MESSAGES_CREATE: false,
    MESSAGES_MANAGE: false,

    // Permissões de Atendimento
    ATTENDANCE_READ: false,
    ATTENDANCE_WRITE: false,
    ATTENDANCE_MANAGE: false,

    // Permissões de Visitas
    VISITS_READ: false,
    VISITS_WRITE: false,
    VISITS_CREATE: false,
    VISITS_UPDATE: false,
    VISITS_DELETE: false,
    VISITS_MANAGE: false,

    // Permissões de Ponto Eletrônico
    TIME_RECORD_READ: false,
    TIME_RECORD_CREATE: false,
    TIME_RECORD_UPDATE: false,
    TIME_RECORD_DELETE: false,
    TIME_RECORD_MANAGE: false,

    // Permissões de Folha de Pagamento
    PAYROLL_READ: false,
    PAYROLL_CREATE: false,
    PAYROLL_MANAGE: false,

    // Permissão de Acesso Total
    ALL_PERMISSIONS: false,
  };

  switch (normalizedRole) {
    case 'SUPER_ADMIN':
      // Todas as permissões true para SUPER_ADMIN
      return Object.fromEntries(
        Object.keys(basePermissions).map(key => [key, true])
      ) as unknown as UserPermissions;

    case 'ADMIN':
      return {
        ...basePermissions,
        // Permissões de Usuários
        USERS_READ: true,
        USERS_WRITE: true,
        USERS_DELETE: true,
        USERS_CREATE: true,

        // Permissões de Grupos
        GROUPS_READ: true,
        GROUPS_WRITE: true,
        GROUPS_DELETE: true,
        GROUPS_CREATE: true,

        // Permissões de Clientes
        CLIENTS_READ: true,
        CLIENTS_WRITE: true,
        CLIENTS_DELETE: true,
        CLIENTS_CREATE: true,

        // Permissões de Funcionários
        EMPLOYEES_READ: true,
        EMPLOYEES_WRITE: true,
        EMPLOYEES_DELETE: true,
        EMPLOYEES_CREATE: true,

        // Permissões de Contratos
        CONTRACTS_READ: true,
        CONTRACTS_WRITE: true,
        CONTRACTS_DELETE: true,
        CONTRACTS_CREATE: true,

        // Permissões Financeiras
        FINANCIAL_READ: true,
        FINANCIAL_WRITE: true,
        FINANCIAL_DELETE: true,
        FINANCIAL_CREATE: true,

        // Permissões Financeiras Granulares
        FINANCIAL_PAYABLE_READ: true,
        FINANCIAL_PAYABLE_WRITE: true,
        FINANCIAL_RECEIVABLE_READ: true,
        FINANCIAL_RECEIVABLE_WRITE: true,

        // Permissões de Holerites
        PAYSLIPS_READ: true,
        PAYSLIPS_WRITE: true,
        PAYSLIPS_DELETE: true,
        PAYSLIPS_CREATE: true,
        PAYSLIPS_PUBLISH: true,

        // Permissões de Estoque
        STOCK_READ: true,
        STOCK_WRITE: true,
        STOCK_DELETE: true,
        STOCK_CREATE: true,
        STOCK_MANAGE: true,

        // Permissões de Equipamentos/Frota
        EQUIPMENTS_READ: true,
        EQUIPMENTS_WRITE: true,
        EQUIPMENTS_DELETE: true,
        EQUIPMENTS_CREATE: true,
        EQUIPMENTS_ASSIGN: true,

        // Permissões de Empresas
        COMPANIES_READ: true,
        COMPANIES_WRITE: true,
        COMPANIES_DELETE: true,
        COMPANIES_CREATE: true,
        COMPANIES_MANAGE: true,

        // Permissões de Relatórios
        REPORTS_READ: true,
        REPORTS_GENERATE: true,
        REPORTS_EXPORT: true,

        // Permissões do Módulo Comercial
        LEADS_READ: true,
        LEADS_WRITE: true,
        LEADS_DELETE: true,
        LEADS_CREATE: true,

        PROPOSALS_READ: true,
        PROPOSALS_WRITE: true,
        PROPOSALS_DELETE: true,
        PROPOSALS_CREATE: true,

        QUOTES_READ: true,
        QUOTES_WRITE: true,
        QUOTES_CREATE: true,

        // Permissões de Suporte
        SUPPORT_READ: true,
        SUPPORT_WRITE: true,
        SUPPORT_DELETE: true,
        SUPPORT_CREATE: true,
        SUPPORT_MANAGE: true,

        // Permissões de Mensagens
        MESSAGES_READ: true,
        MESSAGES_WRITE: true,
        MESSAGES_DELETE: true,
        MESSAGES_CREATE: true,
        MESSAGES_MANAGE: true,

        // Permissões de Atendimento
        ATTENDANCE_READ: true,
        ATTENDANCE_WRITE: true,
        ATTENDANCE_MANAGE: true,

        // Dashboard Comercial e Metas
        COMMERCIAL_DASHBOARD_READ: true,
        SALES_GOALS_READ: true,
        SALES_GOALS_WRITE: true,
      };

    case 'SUPERVISOR':
      return {
        ...basePermissions,
        EMPLOYEES_READ: true,
        EMPLOYEES_WRITE: true,
        CONTRACTS_READ: true,
        CONTRACTS_WRITE: true,
        PAYSLIPS_READ: true,
        PAYSLIPS_WRITE: true,
        REPORTS_READ: true,
        REPORTS_GENERATE: true,
        LEADS_READ: true,
        LEADS_WRITE: true,
        LEADS_CREATE: true,
        PROPOSALS_READ: true,
        PROPOSALS_WRITE: true,
        PROPOSALS_CREATE: true,
        QUOTES_READ: true,
        QUOTES_WRITE: true,
        QUOTES_CREATE: true,
        DASHBOARD_READ: true,
        PROFILE_READ: true,
        PROFILE_WRITE: true,

        // Permissões de Mensagens
        MESSAGES_READ: true,
        MESSAGES_WRITE: true,
        MESSAGES_CREATE: true,

        // Permissões de Suporte
        SUPPORT_READ: true,

        // Permissões de Equipamentos/Frota
        EQUIPMENTS_READ: true,
        EQUIPMENTS_WRITE: true,

        // Permissões de Atendimento (Supervisão acompanha atendimentos)
        ATTENDANCE_READ: true,
      };

    case 'RH':
      return {
        ...basePermissions,
        EMPLOYEES_READ: true,
        EMPLOYEES_WRITE: true,
        EMPLOYEES_CREATE: true,
        EMPLOYEES_DELETE: true,
        PAYSLIPS_READ: true,
        PAYSLIPS_WRITE: true,
        PAYSLIPS_CREATE: true,
        PAYSLIPS_PUBLISH: true,
        REPORTS_READ: true,
        REPORTS_GENERATE: true,
        DASHBOARD_READ: true,
        PROFILE_READ: true,
        PROFILE_WRITE: true,

        // Permissões de Ponto Eletrônico
        TIME_RECORD_READ: true,
        TIME_RECORD_CREATE: true,
        TIME_RECORD_UPDATE: true,
        TIME_RECORD_MANAGE: true,

        // Permissões de Folha de Pagamento
        PAYROLL_READ: true,
        PAYROLL_CREATE: true,
        PAYROLL_MANAGE: true,

        // Permissões de Mensagens
        MESSAGES_READ: true,
        MESSAGES_WRITE: true,
        MESSAGES_CREATE: true,

        // Permissões de Suporte
        SUPPORT_READ: true,

        // Permissões de Atendimento
        ATTENDANCE_READ: true,
        ATTENDANCE_MANAGE: true,
      };

    case 'FINANCEIRO':
      return {
        ...basePermissions,
        FINANCIAL_READ: true,
        FINANCIAL_WRITE: true,
        FINANCIAL_CREATE: true,
        FINANCIAL_DELETE: true,

        // Permissões Financeiras Granulares
        FINANCIAL_PAYABLE_READ: true,
        FINANCIAL_PAYABLE_WRITE: true,
        FINANCIAL_RECEIVABLE_READ: true,
        FINANCIAL_RECEIVABLE_WRITE: true,
        PAYSLIPS_READ: true,
        PAYSLIPS_WRITE: true,
        REPORTS_READ: true,
        REPORTS_GENERATE: true,
        REPORTS_EXPORT: true,
        LEADS_READ: true,
        LEADS_WRITE: true,
        LEADS_CREATE: true,
        PROPOSALS_READ: true,
        PROPOSALS_WRITE: true,
        PROPOSALS_CREATE: true,
        QUOTES_READ: true,
        QUOTES_WRITE: true,
        QUOTES_CREATE: true,
        DASHBOARD_READ: true,
        PROFILE_READ: true,
        PROFILE_WRITE: true,

        // Permissões de Mensagens
        MESSAGES_READ: true,
        MESSAGES_WRITE: true,
        MESSAGES_CREATE: true,

        // Permissões de Suporte
        SUPPORT_READ: true,

        // Permissões de Atendimento
        ATTENDANCE_READ: true,
      };

    case 'TI_SUPORTE':
      return {
        ...basePermissions,
        SYSTEM_CONFIG: true,
        SYSTEM_LOGS: true,
        SYSTEM_BACKUP: true,
        SYSTEM_INTEGRATION: true,
        USERS_READ: true,
        USERS_WRITE: true,
        GROUPS_READ: true,
        GROUPS_WRITE: true,
        DASHBOARD_READ: true,
        PROFILE_READ: true,
        PROFILE_WRITE: true,

        // Permissões de Mensagens
        MESSAGES_READ: true,
        MESSAGES_WRITE: true,
        MESSAGES_CREATE: true,
        MESSAGES_DELETE: true,
        MESSAGES_MANAGE: true,

        // Permissões de Suporte
        SUPPORT_READ: true,
        SUPPORT_WRITE: true,
        SUPPORT_DELETE: true,
        SUPPORT_CREATE: true,
        SUPPORT_MANAGE: true,
      };

    case 'AUDITOR':
      return {
        ...basePermissions,
        USERS_READ: true,
        CLIENTS_READ: true,
        EMPLOYEES_READ: true,
        CONTRACTS_READ: true,
        FINANCIAL_READ: true,

        // Permissões Financeiras Granulares (Leitura)
        FINANCIAL_PAYABLE_READ: true,
        FINANCIAL_RECEIVABLE_READ: true,

        PAYSLIPS_READ: true,
        REPORTS_READ: true,
        LEADS_READ: true,
        PROPOSALS_READ: true,
        QUOTES_READ: true,
        DASHBOARD_READ: true,
        AUDIT_READ: true,
        PROFILE_READ: true,

        // Permissões de Mensagens
        MESSAGES_READ: true,

        // Permissões de Suporte
        SUPPORT_READ: true,
      };

    case 'COLABORADOR':
      return {
        ...basePermissions,
        DASHBOARD_READ: true,
        PROFILE_READ: true,
        PROFILE_WRITE: true,
        PAYSLIPS_READ: true,

        // Permissões de Mensagens
        MESSAGES_READ: true,
        MESSAGES_WRITE: true,
        MESSAGES_DELETE: true,
        MESSAGES_CREATE: true,
      };

    case 'GESTOR':
      return {
        ...basePermissions,
        // Permissões de Equipamentos/Frota
        EQUIPMENTS_READ: true,
        EQUIPMENTS_WRITE: true,
        EQUIPMENTS_CREATE: true,
        EQUIPMENTS_ASSIGN: true,

        // Permissões de Funcionários
        EMPLOYEES_READ: true,
        EMPLOYEES_WRITE: true,

        // Permissões de Contratos
        CONTRACTS_READ: true,
        CONTRACTS_WRITE: true,

        // Permissões de Relatórios
        REPORTS_READ: true,
        REPORTS_GENERATE: true,

        // Permissões de Dashboard
        DASHBOARD_READ: true,
        PROFILE_READ: true,
        PROFILE_WRITE: true,

        // Permissões do Módulo Comercial
        LEADS_READ: true,
        LEADS_WRITE: true,
        LEADS_CREATE: true,
        PROPOSALS_READ: true,
        PROPOSALS_WRITE: true,
        PROPOSALS_CREATE: true,
        QUOTES_READ: true,
        QUOTES_WRITE: true,
        QUOTES_CREATE: true,

        // Dashboard Comercial e Metas
        COMMERCIAL_DASHBOARD_READ: true,
        SALES_GOALS_READ: true,
        SALES_GOALS_WRITE: true,

        // Permissões de Mensagens
        MESSAGES_READ: true,
        MESSAGES_WRITE: true,
        MESSAGES_CREATE: true,

        // Permissões de Suporte
        SUPPORT_READ: true,

        // Permissões de Atendimento
        ATTENDANCE_READ: true,
      };

    case 'ASSISTENCIA_RH':
      return {
        ...basePermissions,
        // Assistente de RH - Permissões de leitura e escrita básica
        EMPLOYEES_READ: true,
        EMPLOYEES_WRITE: true,
        PAYSLIPS_READ: true,
        CONTRACTS_READ: true,
        REPORTS_READ: true,
        DASHBOARD_READ: true,
        PROFILE_READ: true,
        PROFILE_WRITE: true,
        MESSAGES_READ: true,
        MESSAGES_WRITE: true,
        MESSAGES_CREATE: true,
      };

    case 'DEPARTAMENTO_PESSOAL':
      return {
        ...basePermissions,
        // Departamento Pessoal - Gestão completa de RH
        EMPLOYEES_READ: true,
        EMPLOYEES_WRITE: true,
        EMPLOYEES_CREATE: true,
        EMPLOYEES_DELETE: true,
        PAYSLIPS_READ: true,
        PAYSLIPS_WRITE: true,
        PAYSLIPS_CREATE: true,
        PAYSLIPS_PUBLISH: true,
        CONTRACTS_READ: true,
        CONTRACTS_WRITE: true,
        CONTRACTS_CREATE: true,
        REPORTS_READ: true,
        REPORTS_GENERATE: true,
        REPORTS_EXPORT: true,
        DASHBOARD_READ: true,
        PROFILE_READ: true,
        PROFILE_WRITE: true,
        MESSAGES_READ: true,
        MESSAGES_WRITE: true,
        MESSAGES_CREATE: true,
        SUPPORT_READ: true,
        ATTENDANCE_READ: true,
        ATTENDANCE_WRITE: true,

        // Permissões de Ponto Eletrônico
        TIME_RECORD_READ: true,
        TIME_RECORD_CREATE: true,
        TIME_RECORD_UPDATE: true,
        TIME_RECORD_DELETE: true,
        TIME_RECORD_MANAGE: true,

        // Permissões de Folha de Pagamento
        PAYROLL_READ: true,
        PAYROLL_CREATE: true,
        PAYROLL_MANAGE: true,
      };

    case 'OPERACIONAL':
      return {
        ...basePermissions,
        // Operacional - Gestão operacional e equipamentos
        EQUIPMENTS_READ: true,
        EQUIPMENTS_WRITE: true,
        EQUIPMENTS_ASSIGN: true,
        EMPLOYEES_READ: true,
        CONTRACTS_READ: true,
        REPORTS_READ: true,
        REPORTS_GENERATE: true,
        DASHBOARD_READ: true,
        PROFILE_READ: true,
        PROFILE_WRITE: true,
        MESSAGES_READ: true,
        MESSAGES_WRITE: true,
        MESSAGES_CREATE: true,
        VISITS_READ: true,
        VISITS_WRITE: true,
        VISITS_CREATE: true,
      };

    case 'VIGILANTE':
      return {
        ...basePermissions,
        // Vigilante - Permissões básicas operacionais
        DASHBOARD_READ: true,
        PROFILE_READ: true,
        PROFILE_WRITE: true,
        PAYSLIPS_READ: true,
        REPORTS_READ: true,
        MESSAGES_READ: true,
        MESSAGES_WRITE: true,
        MESSAGES_CREATE: true,
        EQUIPMENTS_READ: true,
        VISITS_READ: true,
      };

    case 'ASSISTENTE_ADMINISTRATIVO':
      return {
        ...basePermissions,
        // Assistente Administrativo
        FINANCIAL_READ: true,
        FINANCIAL_WRITE: true,
        FINANCIAL_PAYABLE_READ: true,
        FINANCIAL_PAYABLE_WRITE: true,
        FINANCIAL_RECEIVABLE_READ: false,
        FINANCIAL_CASHFLOW_READ: false,
        FINANCIAL_INVOICE_READ: false,
        FINANCIAL_MEASUREMENT_READ: false,
        STOCK_READ: true,
        STOCK_WRITE: true,
        STOCK_CREATE: true,
        STOCK_MANAGE: true,
        // Compras (usando permissionamento de estoque ou criando específico se houver - assumindo uso de STOCK/FINANCIAL)
        // Relatórios
        REPORTS_READ: true,
        REPORTS_GENERATE: true,
        // Dashboard
        DASHBOARD_READ: true,
        PROFILE_READ: true,
        PROFILE_WRITE: true,
        MESSAGES_READ: true,
        MESSAGES_WRITE: true,
        MESSAGES_CREATE: true,
        // Leitura geral
        EMPLOYEES_READ: true,
        CLIENTS_READ: true,
        CONTRACTS_READ: true,
      };

    case 'AUXI_ADMINISTRATIVO':
      return {
        ...basePermissions,
        // Auxiliar Administrativo - Suporte administrativo geral
        EMPLOYEES_READ: true,
        CLIENTS_READ: true,
        CONTRACTS_READ: true,
        REPORTS_READ: true,
        DASHBOARD_READ: true,
        PROFILE_READ: true,
        PROFILE_WRITE: true,
        MESSAGES_READ: true,
        MESSAGES_WRITE: true,
        MESSAGES_CREATE: true,
        SUPPORT_READ: true,
        SUPPORT_WRITE: true,
        SUPPORT_CREATE: true,
        LEADS_READ: true,
        PROPOSALS_READ: true,
      };



    case 'AUX_DEP':
      return {
        ...basePermissions,
        // Auxiliar de Departamento Pessoal - Suporte ao RH
        EMPLOYEES_READ: true,
        PAYSLIPS_READ: true,
        CONTRACTS_READ: true,
        REPORTS_READ: true,
        DASHBOARD_READ: true,
        PROFILE_READ: true,
        PROFILE_WRITE: true,
        MESSAGES_READ: true,
        MESSAGES_WRITE: true,
        MESSAGES_CREATE: true,
        ATTENDANCE_READ: true,
      };

    case 'COMERCIAL':
      return {
        ...basePermissions,
        // Comercial - Gestão de vendas e clientes
        CLIENTS_READ: true,
        CLIENTS_WRITE: true,
        CLIENTS_CREATE: true,
        LEADS_READ: true,
        LEADS_WRITE: true,
        LEADS_CREATE: true,
        LEADS_DELETE: true,
        PROPOSALS_READ: true,
        PROPOSALS_WRITE: true,
        PROPOSALS_CREATE: true,
        PROPOSALS_DELETE: true,
        QUOTES_READ: true,
        QUOTES_WRITE: true,
        QUOTES_CREATE: true,
        QUOTES_DELETE: true,
        CONTRACTS_READ: true,
        CONTRACTS_WRITE: true,
        CONTRACTS_CREATE: true,
        REPORTS_READ: true,
        DASHBOARD_READ: true,
        PROFILE_READ: true,
        PROFILE_WRITE: true,
        MESSAGES_READ: true,
        MESSAGES_WRITE: true,
        MESSAGES_CREATE: true,

        // Dashboard Comercial (somente leitura, sem metas)
        COMMERCIAL_DASHBOARD_READ: true,
        SALES_GOALS_READ: true,
      };

    default:
      return basePermissions;
  }
};

// Função para gerar permissões baseadas em grupos
// Traduções de Permissões para Português
export const PERMISSION_TRANSLATIONS: Record<keyof UserPermissions, string> = {
  // Usuários
  USERS_READ: 'Visualizar Usuários',
  USERS_WRITE: 'Editar Usuários',
  USERS_DELETE: 'Excluir Usuários',
  USERS_CREATE: 'Criar Usuários',

  // Grupos
  GROUPS_READ: 'Visualizar Grupos',
  GROUPS_WRITE: 'Editar Grupos',
  GROUPS_DELETE: 'Excluir Grupos',
  GROUPS_CREATE: 'Criar Grupos',

  // Clientes
  CLIENTS_READ: 'Visualizar Clientes',
  CLIENTS_WRITE: 'Editar Clientes',
  CLIENTS_DELETE: 'Excluir Clientes',
  CLIENTS_CREATE: 'Criar Clientes',

  // Funcionários
  EMPLOYEES_READ: 'Visualizar Funcionários',
  EMPLOYEES_WRITE: 'Editar Funcionários',
  EMPLOYEES_DELETE: 'Excluir Funcionários',
  EMPLOYEES_CREATE: 'Criar Funcionários',

  // Contratos
  CONTRACTS_READ: 'Visualizar Contratos',
  CONTRACTS_WRITE: 'Editar Contratos',
  CONTRACTS_DELETE: 'Excluir Contratos',
  CONTRACTS_CREATE: 'Criar Contratos',

  // Financeiro Geral
  FINANCIAL_READ: 'Visualizar Financeiro',
  FINANCIAL_WRITE: 'Editar Financeiro',
  FINANCIAL_DELETE: 'Excluir Registros Financeiros',
  FINANCIAL_CREATE: 'Criar Registros Financeiros',

  // Financeiro Granular
  FINANCIAL_PAYABLE_READ: 'Visualizar Contas a Pagar',
  FINANCIAL_PAYABLE_WRITE: 'Editar Contas a Pagar',
  FINANCIAL_RECEIVABLE_READ: 'Visualizar Contas a Receber',
  FINANCIAL_RECEIVABLE_WRITE: 'Editar Contas a Receber',
  FINANCIAL_CASHFLOW_READ: 'Visualizar Fluxo de Caixa',
  FINANCIAL_INVOICE_READ: 'Visualizar Faturas',
  FINANCIAL_MEASUREMENT_READ: 'Visualizar Medições',

  // Holerites
  PAYSLIPS_READ: 'Visualizar Holerites',
  PAYSLIPS_WRITE: 'Editar Holerites',
  PAYSLIPS_DELETE: 'Excluir Holerites',
  PAYSLIPS_CREATE: 'Gerar Holerites',
  PAYSLIPS_PUBLISH: 'Publicar Holerites',

  // Estoque
  STOCK_READ: 'Visualizar Estoque',
  STOCK_WRITE: 'Editar Estoque',
  STOCK_DELETE: 'Excluir Itens de Estoque',
  STOCK_CREATE: 'Adicionar Itens ao Estoque',
  STOCK_MANAGE: 'Gerenciar Estoque',

  // Equipamentos/Frota
  EQUIPMENTS_READ: 'Visualizar Equipamentos',
  EQUIPMENTS_WRITE: 'Editar Equipamentos',
  EQUIPMENTS_DELETE: 'Excluir Equipamentos',
  EQUIPMENTS_CREATE: 'Cadastrar Equipamentos',
  EQUIPMENTS_ASSIGN: 'Atribuir Equipamentos',

  // Empresas
  COMPANIES_READ: 'Visualizar Empresas',
  COMPANIES_WRITE: 'Editar Empresas',
  COMPANIES_DELETE: 'Excluir Empresas',
  COMPANIES_CREATE: 'Cadastrar Empresas',
  COMPANIES_MANAGE: 'Gerenciar Empresas',

  // Relatórios
  REPORTS_READ: 'Visualizar Relatórios',
  REPORTS_GENERATE: 'Gerar Relatórios',
  REPORTS_EXPORT: 'Exportar Relatórios',

  // Comercial (Leads)
  LEADS_READ: 'Visualizar Leads',
  LEADS_WRITE: 'Editar Leads',
  LEADS_DELETE: 'Excluir Leads',
  LEADS_CREATE: 'Cadastrar Leads',

  // Comercial (Propostas)
  PROPOSALS_READ: 'Visualizar Propostas',
  PROPOSALS_WRITE: 'Editar Propostas',
  PROPOSALS_DELETE: 'Excluir Propostas',
  PROPOSALS_CREATE: 'Criar Propostas',

  // Comercial (Cotações)
  QUOTES_READ: 'Visualizar Cotações',
  QUOTES_WRITE: 'Editar Cotações',
  QUOTES_DELETE: 'Excluir Cotações',
  QUOTES_CREATE: 'Criar Cotações',

  // Sistema
  SYSTEM_CONFIG: 'Configurar Sistema',
  SYSTEM_LOGS: 'Visualizar Logs',
  SYSTEM_BACKUP: 'Realizar Backup',
  SYSTEM_INTEGRATION: 'Gerenciar Integrações',

  // Auditoria
  AUDIT_READ: 'Leitura de Auditoria',
  AUDIT_WRITE: 'Escrita de Auditoria',

  // Dashboard
  DASHBOARD_READ: 'Visualizar Dashboard',
  DASHBOARD_WRITE: 'Configurar Dashboard',

  // Dashboard Comercial
  COMMERCIAL_DASHBOARD_READ: 'Visualizar Dashboard Comercial',
  SALES_GOALS_READ: 'Visualizar Metas Comerciais',
  SALES_GOALS_WRITE: 'Gerenciar Metas Comerciais',

  // Perfil
  PROFILE_READ: 'Visualizar Perfil',
  PROFILE_WRITE: 'Editar Perfil',

  // Suporte
  SUPPORT_READ: 'Visualizar Suporte',
  SUPPORT_WRITE: 'Responder Suporte',
  SUPPORT_DELETE: 'Excluir Tickets',
  SUPPORT_CREATE: 'Abrir Ticket',
  SUPPORT_MANAGE: 'Gerenciar Suporte',

  // Mensagens
  MESSAGES_READ: 'Ler Mensagens',
  MESSAGES_WRITE: 'Enviar Mensagens',
  MESSAGES_DELETE: 'Excluir Mensagens',
  MESSAGES_CREATE: 'Criar Mensagens',
  MESSAGES_MANAGE: 'Gerenciar Mensagens',

  // Atendimento
  ATTENDANCE_READ: 'Visualizar Atendimentos',
  ATTENDANCE_WRITE: 'Realizar Atendimentos',
  ATTENDANCE_MANAGE: 'Gerenciar Atendimentos',

  // Visitas
  VISITS_READ: 'Visualizar Visitas',
  VISITS_WRITE: 'Editar Visitas',
  VISITS_CREATE: 'Agendar Visitas',
  VISITS_UPDATE: 'Atualizar Visitas',
  VISITS_DELETE: 'Excluir Visitas',
  VISITS_MANAGE: 'Gerenciar Visitas',

  // Ponto Eletrônico
  TIME_RECORD_READ: 'Visualizar Ponto',
  TIME_RECORD_CREATE: 'Registrar Ponto',
  TIME_RECORD_UPDATE: 'Corrigir Ponto',
  TIME_RECORD_DELETE: 'Excluir Registro de Ponto',
  TIME_RECORD_MANAGE: 'Gerenciar Ponto Eletrônico',

  // Folha de Pagamento
  PAYROLL_READ: 'Visualizar Folha',
  PAYROLL_CREATE: 'Gerar Folha',
  PAYROLL_MANAGE: 'Gerenciar Folha',

  // Outros
  ALL_PERMISSIONS: 'Acesso Total (Admin)',
  ASSISTENTE_ADMINISTRATIVO: 'Assistente Administrativo (Permissão)'
};

// Função para gerar permissões baseadas em grupos
export const generatePermissionsFromGroups = (groups: UserGroupData[]): UserPermissions => {
  const basePermissions: UserPermissions = {
    // Permissões de Usuários
    USERS_READ: false,
    USERS_WRITE: false,
    USERS_DELETE: false,
    USERS_CREATE: false,

    // Permissões de Grupos
    GROUPS_READ: false,
    GROUPS_WRITE: false,
    GROUPS_DELETE: false,
    GROUPS_CREATE: false,

    // Permissões de Clientes
    CLIENTS_READ: false,
    CLIENTS_WRITE: false,
    CLIENTS_DELETE: false,
    CLIENTS_CREATE: false,

    // Permissões de Funcionários
    EMPLOYEES_READ: false,
    EMPLOYEES_WRITE: false,
    EMPLOYEES_DELETE: false,
    EMPLOYEES_CREATE: false,

    // Permissões de Contratos
    CONTRACTS_READ: false,
    CONTRACTS_WRITE: false,
    CONTRACTS_DELETE: false,
    CONTRACTS_CREATE: false,

    // Permissões Financeiras
    FINANCIAL_READ: false,
    FINANCIAL_WRITE: false,
    FINANCIAL_DELETE: false,
    FINANCIAL_CREATE: false,

    // Permissões Financeiras Granulares
    FINANCIAL_PAYABLE_READ: false,
    FINANCIAL_PAYABLE_WRITE: false,
    FINANCIAL_RECEIVABLE_READ: false,
    FINANCIAL_RECEIVABLE_WRITE: false,
    FINANCIAL_CASHFLOW_READ: false,
    FINANCIAL_INVOICE_READ: false,
    FINANCIAL_MEASUREMENT_READ: false,

    // Permissões de Holerites
    PAYSLIPS_READ: false,
    PAYSLIPS_WRITE: false,
    PAYSLIPS_DELETE: false,
    PAYSLIPS_CREATE: false,
    PAYSLIPS_PUBLISH: false,

    // Permissões de Estoque
    STOCK_READ: false,
    STOCK_WRITE: false,
    STOCK_DELETE: false,
    STOCK_CREATE: false,
    STOCK_MANAGE: false,

    // Permissões de Equipamentos/Frota
    EQUIPMENTS_READ: false,
    EQUIPMENTS_WRITE: false,
    EQUIPMENTS_DELETE: false,
    EQUIPMENTS_CREATE: false,
    EQUIPMENTS_ASSIGN: false,

    // Permissões de Empresas
    COMPANIES_READ: false,
    COMPANIES_WRITE: false,
    COMPANIES_DELETE: false,
    COMPANIES_CREATE: false,
    COMPANIES_MANAGE: false,

    // Permissões de Relatórios
    REPORTS_READ: false,
    REPORTS_GENERATE: false,
    REPORTS_EXPORT: false,

    // Permissões do Módulo Comercial
    LEADS_READ: false,
    LEADS_WRITE: false,
    LEADS_DELETE: false,
    LEADS_CREATE: false,

    PROPOSALS_READ: false,
    PROPOSALS_WRITE: false,
    PROPOSALS_DELETE: false,
    PROPOSALS_CREATE: false,

    QUOTES_READ: false,
    QUOTES_WRITE: false,
    QUOTES_DELETE: false,
    QUOTES_CREATE: false,

    // Permissões de Sistema
    SYSTEM_CONFIG: false,
    SYSTEM_LOGS: false,
    SYSTEM_BACKUP: false,
    SYSTEM_INTEGRATION: false,

    // Permissões de Auditoria
    AUDIT_READ: false,
    AUDIT_WRITE: false,

    // Permissões de Dashboard
    DASHBOARD_READ: false,
    DASHBOARD_WRITE: false,

    // Permissões do Dashboard Comercial
    COMMERCIAL_DASHBOARD_READ: false,
    SALES_GOALS_READ: false,
    SALES_GOALS_WRITE: false,

    // Permissões de Perfil
    PROFILE_READ: false,
    PROFILE_WRITE: false,

    // Permissões de Suporte
    SUPPORT_READ: false,
    SUPPORT_WRITE: false,
    SUPPORT_DELETE: false,
    SUPPORT_CREATE: false,
    SUPPORT_MANAGE: false,

    // Permissões de Mensagens
    MESSAGES_READ: false,
    MESSAGES_WRITE: false,
    MESSAGES_DELETE: false,
    MESSAGES_CREATE: false,
    MESSAGES_MANAGE: false,

    // Permissões de Atendimento
    ATTENDANCE_READ: false,
    ATTENDANCE_WRITE: false,
    ATTENDANCE_MANAGE: false,

    // Permissões de Visitas
    VISITS_READ: false,
    VISITS_WRITE: false,
    VISITS_CREATE: false,
    VISITS_UPDATE: false,
    VISITS_DELETE: false,
    VISITS_MANAGE: false,

    // Permissões de Ponto Eletrônico
    TIME_RECORD_READ: false,
    TIME_RECORD_CREATE: false,
    TIME_RECORD_UPDATE: false,
    TIME_RECORD_DELETE: false,
    TIME_RECORD_MANAGE: false,

    // Permissões de Folha de Pagamento
    PAYROLL_READ: false,
    PAYROLL_CREATE: false,
    PAYROLL_MANAGE: false,

    // Permissão de Acesso Total
    ALL_PERMISSIONS: false,
  };

  // Mapear permissões de string para propriedades do objeto
  const permissionMap: Record<string, keyof UserPermissions> = {
    'USERS_READ': 'USERS_READ',
    'USERS_WRITE': 'USERS_WRITE',
    'USERS_DELETE': 'USERS_DELETE',
    'USERS_CREATE': 'USERS_CREATE',
    'GROUPS_READ': 'GROUPS_READ',
    'GROUPS_WRITE': 'GROUPS_WRITE',
    'GROUPS_DELETE': 'GROUPS_DELETE',
    'GROUPS_CREATE': 'GROUPS_CREATE',
    'CLIENTS_READ': 'CLIENTS_READ',
    'CLIENTS_WRITE': 'CLIENTS_WRITE',
    'CLIENTS_DELETE': 'CLIENTS_DELETE',
    'CLIENTS_CREATE': 'CLIENTS_CREATE',
    'EMPLOYEES_READ': 'EMPLOYEES_READ',
    'EMPLOYEES_WRITE': 'EMPLOYEES_WRITE',
    'EMPLOYEES_DELETE': 'EMPLOYEES_DELETE',
    'EMPLOYEES_CREATE': 'EMPLOYEES_CREATE',
    'CONTRACTS_READ': 'CONTRACTS_READ',
    'CONTRACTS_WRITE': 'CONTRACTS_WRITE',
    'CONTRACTS_DELETE': 'CONTRACTS_DELETE',
    'CONTRACTS_CREATE': 'CONTRACTS_CREATE',
    'FINANCIAL_READ': 'FINANCIAL_READ',
    'FINANCIAL_WRITE': 'FINANCIAL_WRITE',
    'FINANCIAL_DELETE': 'FINANCIAL_DELETE',
    'FINANCIAL_CREATE': 'FINANCIAL_CREATE',
    'PAYSLIPS_READ': 'PAYSLIPS_READ',
    'PAYSLIPS_WRITE': 'PAYSLIPS_WRITE',
    'PAYSLIPS_DELETE': 'PAYSLIPS_DELETE',
    'PAYSLIPS_CREATE': 'PAYSLIPS_CREATE',
    'PAYSLIPS_PUBLISH': 'PAYSLIPS_PUBLISH',
    'STOCK_READ': 'STOCK_READ',
    'STOCK_WRITE': 'STOCK_WRITE',
    'STOCK_DELETE': 'STOCK_DELETE',
    'STOCK_CREATE': 'STOCK_CREATE',
    'STOCK_MANAGE': 'STOCK_MANAGE',
    'COMPANIES_READ': 'COMPANIES_READ',
    'COMPANIES_WRITE': 'COMPANIES_WRITE',
    'COMPANIES_DELETE': 'COMPANIES_DELETE',
    'COMPANIES_CREATE': 'COMPANIES_CREATE',
    'COMPANIES_MANAGE': 'COMPANIES_MANAGE',
    'REPORTS_READ': 'REPORTS_READ',
    'REPORTS_GENERATE': 'REPORTS_GENERATE',
    'REPORTS_EXPORT': 'REPORTS_EXPORT',
    'LEADS_READ': 'LEADS_READ',
    'LEADS_WRITE': 'LEADS_WRITE',
    'LEADS_DELETE': 'LEADS_DELETE',
    'LEADS_CREATE': 'LEADS_CREATE',
    'PROPOSALS_READ': 'PROPOSALS_READ',
    'PROPOSALS_WRITE': 'PROPOSALS_WRITE',
    'PROPOSALS_DELETE': 'PROPOSALS_DELETE',
    'PROPOSALS_CREATE': 'PROPOSALS_CREATE',
    'QUOTES_READ': 'QUOTES_READ',
    'QUOTES_WRITE': 'QUOTES_WRITE',
    'QUOTES_DELETE': 'QUOTES_DELETE',
    'QUOTES_CREATE': 'QUOTES_CREATE',
    'SYSTEM_CONFIG': 'SYSTEM_CONFIG',
    'SYSTEM_LOGS': 'SYSTEM_LOGS',
    'SYSTEM_BACKUP': 'SYSTEM_BACKUP',
    'SYSTEM_INTEGRATION': 'SYSTEM_INTEGRATION',
    'AUDIT_READ': 'AUDIT_READ',
    'AUDIT_WRITE': 'AUDIT_WRITE',
    'DASHBOARD_READ': 'DASHBOARD_READ',
    'DASHBOARD_WRITE': 'DASHBOARD_WRITE',
    'COMMERCIAL_DASHBOARD_READ': 'COMMERCIAL_DASHBOARD_READ',
    'SALES_GOALS_READ': 'SALES_GOALS_READ',
    'SALES_GOALS_WRITE': 'SALES_GOALS_WRITE',
    'PROFILE_READ': 'PROFILE_READ',
    'PROFILE_WRITE': 'PROFILE_WRITE',
    'SUPPORT_READ': 'SUPPORT_READ',
    'SUPPORT_WRITE': 'SUPPORT_WRITE',
    'SUPPORT_DELETE': 'SUPPORT_DELETE',
    'SUPPORT_CREATE': 'SUPPORT_CREATE',
    'SUPPORT_MANAGE': 'SUPPORT_MANAGE',
    'MESSAGES_READ': 'MESSAGES_READ',
    'MESSAGES_WRITE': 'MESSAGES_WRITE',
    'MESSAGES_DELETE': 'MESSAGES_DELETE',
    'MESSAGES_CREATE': 'MESSAGES_CREATE',
    'MESSAGES_MANAGE': 'MESSAGES_MANAGE',
    'ATTENDANCE_READ': 'ATTENDANCE_READ',
    'ATTENDANCE_WRITE': 'ATTENDANCE_WRITE',
    'ATTENDANCE_MANAGE': 'ATTENDANCE_MANAGE',
    'ALL_PERMISSIONS': 'ALL_PERMISSIONS',

    // ---- Mapeamento de permissões legadas de grupos (VIEW_*/MANAGE_*/EDIT_*) para o modelo novo ----
    // Pagamentos / holerites / comprovantes
    'VIEW_PAYSLIP': 'PAYSLIPS_READ',
    'DOWNLOAD_PAYSLIP': 'PAYSLIPS_READ',
    // Perfil do usuário
    'EDIT_PROFILE': 'PROFILE_WRITE',
    // Funcionários
    'VIEW_EMPLOYEES': 'EMPLOYEES_READ',
    'MANAGE_EMPLOYEES': 'EMPLOYEES_WRITE',
    // Relatórios
    'VIEW_REPORTS': 'REPORTS_READ',
    // Sistema / administração
    'MANAGE_SYSTEM': 'SYSTEM_CONFIG',
    // Clientes
    'VIEW_CLIENTS': 'CLIENTS_READ',
    'MANAGE_CLIENTS': 'CLIENTS_WRITE',
    // Contratos
    'VIEW_CONTRACTS': 'CONTRACTS_READ',
    'MANAGE_CONTRACTS': 'CONTRACTS_WRITE',
    // Financeiro
    'VIEW_FINANCIAL': 'FINANCIAL_READ',
    'MANAGE_FINANCIAL': 'FINANCIAL_WRITE',
    // Frota / equipamentos
    'VIEW_FLEET': 'EQUIPMENTS_READ',
    'MANAGE_FLEET': 'EQUIPMENTS_WRITE',
    // Documentos (usa permissões de holerites/documentos)
    'VIEW_DOCUMENTS': 'PAYSLIPS_READ',
    'MANAGE_DOCUMENTS': 'PAYSLIPS_WRITE',
  };

  // Aplicar permissões de todos os grupos
  for (const group of groups) {
    for (const permission of group.permissions) {
      const permissionKey = permissionMap[permission];
      if (permissionKey) {
        (basePermissions as any)[permissionKey] = true;
      }
    }
  }

  return basePermissions;
};

// Função para combinar permissões de role e grupos
export const combinePermissions = (rolePermissions: UserPermissions, groupPermissions: UserPermissions): UserPermissions => {
  const combined: UserPermissions = { ...rolePermissions };

  // Se qualquer uma das permissões (role ou grupo) for true, a permissão final será true
  Object.keys(rolePermissions).forEach(key => {
    const permissionKey = key as keyof UserPermissions;
    combined[permissionKey] = rolePermissions[permissionKey] || groupPermissions[permissionKey];
  });

  return combined;
};

// Função para verificar se usuário tem permissão específica
export const hasPermission = (
  userPermissions: UserPermissions | null,
  permission: keyof UserPermissions
): boolean => {
  if (!userPermissions) {
    console.log('🔍 hasPermission - userPermissions é null');
    return false;
  }

  // Se ALL_PERMISSIONS for true, retorna true para qualquer permissão
  if (userPermissions.ALL_PERMISSIONS) {
    console.log('🔍 hasPermission - ALL_PERMISSIONS é true, retornando true');
    return true;
  }

  const hasSpecificPermission = userPermissions[permission] || false;
  console.log(`🔍 hasPermission - ${permission}: ${hasSpecificPermission}`);
  return hasSpecificPermission;
};

// Função para verificar se usuário tem qualquer uma das permissões
export const hasAnyPermission = (
  userPermissions: UserPermissions | null,
  permissions: (keyof UserPermissions)[]
): boolean => {
  if (!userPermissions) return false;
  return permissions.some(permission => userPermissions[permission]);
};

// Função para verificar se usuário tem todas as permissões
export const hasAllPermissions = (
  userPermissions: UserPermissions | null,
  permissions: (keyof UserPermissions)[]
): boolean => {
  if (!userPermissions) return false;
  return permissions.every(permission => userPermissions[permission]);
};

// Função para obter o nome amigável do role
export const getRoleDisplayName = (role: UserRole): string => {
  const roleNames: Record<UserRole, string> = {
    SUPER_ADMIN: 'Super Administrador',
    ADMIN: 'Administrador',
    SUPERVISOR: 'Supervisor',
    RH: 'Recursos Humanos',
    ASSISTENCIA_RH: 'Assistência de RH',
    DEPARTAMENTO_PESSOAL: 'Departamento Pessoal',
    FINANCEIRO: 'Financeiro',
    OPERACIONAL: 'Operacional',
    VIGILANTE: 'Vigilante',
    AUXI_ADMINISTRATIVO: 'Auxiliar Administrativo',
    AUX_DEP: 'Auxiliar Depto. Pessoal',
    TI_SUPORTE: 'TI / Suporte Técnico',
    AUDITOR: 'Auditor / Consultor',
    COLABORADOR: 'Colaborador',
    GESTOR: 'Gestor',
    COMERCIAL: 'Comercial',
    ASSISTENTE_ADMINISTRATIVO: 'Assistente Administrativo',
  };
  return roleNames[role] || role;
};

// Função para obter a cor do role (para badges, etc.)
export const getRoleColor = (role: UserRole): string => {
  const roleColors: Record<UserRole, string> = {
    SUPER_ADMIN: 'bg-red-100 text-red-800',
    ADMIN: 'bg-blue-100 text-blue-800',
    SUPERVISOR: 'bg-green-100 text-green-800',
    RH: 'bg-yellow-100 text-yellow-800',
    ASSISTENCIA_RH: 'bg-yellow-50 text-yellow-700',
    DEPARTAMENTO_PESSOAL: 'bg-amber-100 text-amber-800',
    FINANCEIRO: 'bg-orange-100 text-orange-800',
    OPERACIONAL: 'bg-cyan-100 text-cyan-800',
    VIGILANTE: 'bg-slate-100 text-slate-800',
    AUXI_ADMINISTRATIVO: 'bg-pink-100 text-pink-800',
    AUX_DEP: 'bg-lime-100 text-lime-800',
    TI_SUPORTE: 'bg-purple-100 text-purple-800',
    AUDITOR: 'bg-gray-100 text-gray-800',
    COLABORADOR: 'bg-indigo-100 text-indigo-800',
    GESTOR: 'bg-teal-100 text-teal-800',
    COMERCIAL: 'bg-indigo-100 text-indigo-800',
    ASSISTENTE_ADMINISTRATIVO: 'bg-yellow-100 text-yellow-800',
  };
  return roleColors[role] || 'bg-gray-100 text-gray-800';
};

// Função para obter o nome amigável do grupo
export const getGroupDisplayName = (groupName: string): string => {
  const groupNames: Record<string, string> = {
    'GRUPO_SUPER_ADMIN': 'Super Administrador',
    'GRUPO_ADMIN': 'Administrador',
    'GRUPO_GESTOR': 'Gestor',
    'GRUPO_RH': 'Recursos Humanos',
    'GRUPO_DPE': 'Departamento Pessoal',
    'GRUPO_SUPERVISOR': 'Supervisor',
    'GRUPO_COLABORADORES': 'Colaboradores',
    'GRUPO_OPERACIONAL': 'Operacional',
    'GRUPO_VIGILANTES': 'Vigilantes',
    'GRUPO_FINANCEIRO': 'Financeiro',
    'GRUPO_TI_SUPORTE': 'TI / Suporte',
    'GRUPO_AUDITOR': 'Auditor',
    'GRUPO_AUXILIARES': 'Auxiliares',
    'GRUPO_COMERCIAL': 'Comercial',
    'GRUPO_ASSISTENTE_ADMINISTRATIVO': 'Assistente Administrativo',
  };
  return groupNames[groupName] || groupName;
};

// Função para obter a cor do grupo (para badges, etc.)
export const getGroupColor = (groupName: string): string => {
  const groupColors: Record<string, string> = {
    'GRUPO_SUPER_ADMIN': 'bg-red-100 text-red-800',
    'GRUPO_ADMIN': 'bg-orange-100 text-orange-800',
    'GRUPO_GESTOR': 'bg-yellow-100 text-yellow-800',
    'GRUPO_RH': 'bg-purple-100 text-purple-800',
    'GRUPO_DPE': 'bg-teal-100 text-teal-800',
    'GRUPO_SUPERVISOR': 'bg-green-100 text-green-800',
    'GRUPO_COLABORADORES': 'bg-blue-100 text-blue-800',
    'GRUPO_OPERACIONAL': 'bg-cyan-100 text-cyan-800',
    'GRUPO_VIGILANTES': 'bg-gray-100 text-gray-800',
    'GRUPO_FINANCEIRO': 'bg-orange-100 text-orange-800',
    'GRUPO_TI_SUPORTE': 'bg-purple-100 text-purple-800',
    'GRUPO_AUDITOR': 'bg-gray-100 text-gray-800',
    'GRUPO_AUXILIARES': 'bg-pink-100 text-pink-800',
    'GRUPO_COMERCIAL': 'bg-indigo-100 text-indigo-800',
    'GRUPO_ASSISTENTE_ADMINISTRATIVO': 'bg-yellow-100 text-yellow-800',
  };
  return groupColors[groupName] || 'bg-gray-100 text-gray-800';
};