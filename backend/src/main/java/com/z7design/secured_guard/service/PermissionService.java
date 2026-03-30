package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.enums.Permission;
import com.z7design.secured_guard.model.enums.UserRole;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class PermissionService {

    private final Map<UserRole, Set<Permission>> rolePermissions = new HashMap<>();

    public PermissionService() {
        initializeRolePermissions();
    }

    private void initializeRolePermissions() {
        // 🟥 SUPER_ADMIN - Acesso total e irrestrito
        rolePermissions.put(UserRole.SUPER_ADMIN, new HashSet<>(Arrays.asList(
            Permission.ALL_PERMISSIONS
        )));

        // 🟦 ADMIN - Acesso amplo, subordinado ao Super Admin
        rolePermissions.put(UserRole.ADMIN, new HashSet<>(Arrays.asList(
            Permission.USERS_READ, Permission.USERS_WRITE, Permission.USERS_CREATE,
            Permission.GROUPS_READ, Permission.GROUPS_WRITE, Permission.GROUPS_CREATE,
            Permission.CLIENTS_READ, Permission.CLIENTS_WRITE, Permission.CLIENTS_CREATE, Permission.CLIENTS_DELETE,
            Permission.EMPLOYEES_READ, Permission.EMPLOYEES_WRITE, Permission.EMPLOYEES_CREATE, Permission.EMPLOYEES_DELETE,
            Permission.EMPLOYEE_HISTORY_READ,
            Permission.CONTRACTS_READ, Permission.CONTRACTS_WRITE, Permission.CONTRACTS_CREATE, Permission.CONTRACTS_DELETE,
            Permission.FINANCIAL_READ, Permission.FINANCIAL_WRITE, Permission.FINANCIAL_CREATE,
            Permission.PAYSLIPS_READ, Permission.PAYSLIPS_WRITE, Permission.PAYSLIPS_CREATE, Permission.PAYSLIPS_PUBLISH,
            Permission.EQUIPMENTS_READ, Permission.EQUIPMENTS_WRITE, Permission.EQUIPMENTS_CREATE, Permission.EQUIPMENTS_DELETE, Permission.EQUIPMENTS_ASSIGN,
            Permission.REPORTS_READ, Permission.REPORTS_GENERATE, Permission.REPORTS_EXPORT,
            Permission.DASHBOARD_READ, Permission.DASHBOARD_WRITE,
            Permission.AUDIT_READ,
            Permission.MESSAGES_READ, Permission.MESSAGES_WRITE, Permission.MESSAGES_CREATE, Permission.MESSAGES_DELETE, Permission.MESSAGES_MANAGE,
            Permission.SUPPORT_READ, Permission.SUPPORT_WRITE, Permission.SUPPORT_MANAGE,
            Permission.ATTENDANCE_READ, Permission.ATTENDANCE_WRITE, Permission.ATTENDANCE_MANAGE
        )));

        // 🟩 SUPERVISOR - Coordena operações de equipes
        rolePermissions.put(UserRole.SUPERVISOR, new HashSet<>(Arrays.asList(
            Permission.EMPLOYEES_READ, Permission.EMPLOYEES_WRITE,
            Permission.CONTRACTS_READ, Permission.CONTRACTS_WRITE,
            Permission.PAYSLIPS_READ, Permission.PAYSLIPS_WRITE,
            Permission.EQUIPMENTS_READ, Permission.EQUIPMENTS_WRITE, Permission.EQUIPMENTS_ASSIGN,
            Permission.REPORTS_READ, Permission.REPORTS_GENERATE,
            Permission.DASHBOARD_READ,
            Permission.PROFILE_READ, Permission.PROFILE_WRITE
        )));

        // 🟨 RH - Gerencia informações contratuais e pessoais
        rolePermissions.put(UserRole.RH, new HashSet<>(Arrays.asList(
            Permission.EMPLOYEES_READ, Permission.EMPLOYEES_WRITE, Permission.EMPLOYEES_CREATE, Permission.EMPLOYEES_DELETE,
            Permission.EMPLOYEE_HISTORY_READ,
            Permission.PAYSLIPS_READ, Permission.PAYSLIPS_WRITE, Permission.PAYSLIPS_CREATE, Permission.PAYSLIPS_PUBLISH,
            Permission.EQUIPMENTS_READ, Permission.EQUIPMENTS_WRITE, Permission.EQUIPMENTS_CREATE, Permission.EQUIPMENTS_ASSIGN,
            Permission.REPORTS_READ, Permission.REPORTS_GENERATE,
            Permission.DASHBOARD_READ,
            Permission.PROFILE_READ, Permission.PROFILE_WRITE
        )));

        // 🟧 FINANCEIRO - Controla relatórios financeiros
        rolePermissions.put(UserRole.FINANCEIRO, new HashSet<>(Arrays.asList(
            Permission.FINANCIAL_READ, Permission.FINANCIAL_WRITE, Permission.FINANCIAL_CREATE, Permission.FINANCIAL_DELETE,
            Permission.PAYSLIPS_READ, Permission.PAYSLIPS_WRITE,
            Permission.REPORTS_READ, Permission.REPORTS_GENERATE, Permission.REPORTS_EXPORT,
            Permission.DASHBOARD_READ,
            Permission.PROFILE_READ, Permission.PROFILE_WRITE
        )));

        // 🟪 TI_SUPORTE - Gerencia configuração técnica
        rolePermissions.put(UserRole.TI_SUPORTE, new HashSet<>(Arrays.asList(
            Permission.SYSTEM_CONFIG, Permission.SYSTEM_LOGS, Permission.SYSTEM_BACKUP, Permission.SYSTEM_INTEGRATION,
            Permission.USERS_READ, Permission.USERS_WRITE,
            Permission.GROUPS_READ, Permission.GROUPS_WRITE,
            Permission.DASHBOARD_READ,
            Permission.PROFILE_READ, Permission.PROFILE_WRITE
        )));

        // 🟫 AUDITOR - Acesso somente leitura
        rolePermissions.put(UserRole.AUDITOR, new HashSet<>(Arrays.asList(
            Permission.USERS_READ,
            Permission.CLIENTS_READ,
            Permission.EMPLOYEES_READ,
            Permission.EMPLOYEE_HISTORY_READ,
            Permission.CONTRACTS_READ,
            Permission.FINANCIAL_READ,
            Permission.PAYSLIPS_READ,
            Permission.EQUIPMENTS_READ,
            Permission.REPORTS_READ,
            Permission.DASHBOARD_READ,
            Permission.AUDIT_READ,
            Permission.PROFILE_READ, Permission.PROFILE_WRITE,
            Permission.MESSAGES_READ,
            Permission.ATTENDANCE_READ
        )));

        // 🟨 COLABORADOR - Acesso limitado ao próprio perfil
        rolePermissions.put(UserRole.COLABORADOR, new HashSet<>(Arrays.asList(
            Permission.PROFILE_READ, Permission.PROFILE_WRITE,
            Permission.PAYSLIPS_READ,
            Permission.MESSAGES_READ, Permission.MESSAGES_WRITE, Permission.MESSAGES_CREATE
        )));

        // ESTOQUE - Consulta e relatórios de estoque e suprimentos
        rolePermissions.put(UserRole.ESTOQUE, new HashSet<>(Arrays.asList(
            Permission.STOCK_READ,
            Permission.INVENTORY_READ, Permission.INVENTORY_MOVEMENTS_READ,
            Permission.PRODUCTS_READ,
            Permission.PURCHASE_REQUESTS_READ,
            Permission.EQUIPMENTS_READ,
            Permission.COMPANIES_READ,
            Permission.GROUPS_READ,
            Permission.TIME_RECORDS_READ,
            Permission.DASHBOARD_READ,
            Permission.PROFILE_READ, Permission.PROFILE_WRITE
        )));

        // SUPRIMENTOS - Suprimentos e almoxarifado
        rolePermissions.put(UserRole.SUPRIMENTOS, new HashSet<>(Arrays.asList(
            Permission.STOCK_READ, Permission.STOCK_WRITE, Permission.STOCK_CREATE,
            Permission.INVENTORY_READ, Permission.INVENTORY_WRITE, Permission.INVENTORY_MOVEMENTS_READ, Permission.INVENTORY_MOVEMENTS_CREATE,
            Permission.PRODUCTS_READ, Permission.PRODUCTS_WRITE,
            Permission.PURCHASE_REQUESTS_READ,
            Permission.DASHBOARD_READ,
            Permission.PROFILE_READ, Permission.PROFILE_WRITE
        )));

        // COMPRAS - Gestão de compras
        rolePermissions.put(UserRole.COMPRAS, new HashSet<>(Arrays.asList(
            Permission.STOCK_READ, Permission.STOCK_WRITE, Permission.STOCK_CREATE,
            Permission.INVENTORY_READ, Permission.INVENTORY_WRITE, Permission.INVENTORY_MOVEMENTS_READ, Permission.INVENTORY_MOVEMENTS_CREATE,
            Permission.PRODUCTS_READ, Permission.PRODUCTS_WRITE,
            Permission.PURCHASE_REQUESTS_READ, Permission.PURCHASE_REQUESTS_WRITE, Permission.PURCHASE_REQUESTS_CREATE,
            Permission.DASHBOARD_READ,
            Permission.PROFILE_READ, Permission.PROFILE_WRITE
        )));

        // ALMOXARIFADO - Gestão completa de armazém e materiais
        rolePermissions.put(UserRole.ALMOXARIFADO, new HashSet<>(Arrays.asList(
            Permission.STOCK_READ, Permission.STOCK_WRITE, Permission.STOCK_CREATE,
            Permission.INVENTORY_READ, Permission.INVENTORY_WRITE, Permission.INVENTORY_MOVEMENTS_READ, Permission.INVENTORY_MOVEMENTS_CREATE,
            Permission.PRODUCTS_READ, Permission.PRODUCTS_WRITE,
            Permission.EQUIPMENTS_READ, Permission.EQUIPMENTS_WRITE, Permission.EQUIPMENTS_CREATE, Permission.EQUIPMENTS_ASSIGN,
            Permission.DASHBOARD_READ,
            Permission.PROFILE_READ, Permission.PROFILE_WRITE
        )));

        // Módulo Comercial + contratos (alinhado ao front e às authorities do JWT vindas do BD)
        Set<Permission> commercialFull = new HashSet<>(Arrays.asList(
            Permission.CLIENTS_READ, Permission.CLIENTS_WRITE, Permission.CLIENTS_CREATE, Permission.CLIENTS_DELETE,
            Permission.LEADS_READ, Permission.LEADS_WRITE, Permission.LEADS_CREATE, Permission.LEADS_DELETE,
            Permission.PROPOSALS_READ, Permission.PROPOSALS_WRITE, Permission.PROPOSALS_CREATE, Permission.PROPOSALS_DELETE,
            Permission.QUOTES_READ, Permission.QUOTES_WRITE, Permission.QUOTES_CREATE, Permission.QUOTES_DELETE,
            Permission.CONTRACTS_READ, Permission.CONTRACTS_WRITE, Permission.CONTRACTS_CREATE, Permission.CONTRACTS_DELETE,
            Permission.DASHBOARD_READ, Permission.REPORTS_READ,
            Permission.PROFILE_READ, Permission.PROFILE_WRITE,
            Permission.MESSAGES_READ, Permission.MESSAGES_WRITE, Permission.MESSAGES_CREATE
        ));
        rolePermissions.put(UserRole.COMERCIAL, new HashSet<>(commercialFull));
        rolePermissions.put(UserRole.GESTOR_COMERCIAL, new HashSet<>(commercialFull));
        rolePermissions.put(UserRole.ASSISTENTE_COMERCIAL, new HashSet<>(commercialFull));
    }

    public Set<Permission> getPermissionsForRole(UserRole role) {
        return rolePermissions.getOrDefault(role, new HashSet<>());
    }

    public boolean hasPermission(UserRole role, Permission permission) {
        Set<Permission> permissions = getPermissionsForRole(role);
        
        // SUPER_ADMIN tem todas as permissões
        if (permissions.contains(Permission.ALL_PERMISSIONS)) {
            return true;
        }
        
        return permissions.contains(permission);
    }

    public boolean hasAnyPermission(UserRole role, Permission... permissions) {
        Set<Permission> rolePermissions = getPermissionsForRole(role);
        
        // SUPER_ADMIN tem todas as permissões
        if (rolePermissions.contains(Permission.ALL_PERMISSIONS)) {
            return true;
        }
        
        return Arrays.stream(permissions).anyMatch(rolePermissions::contains);
    }

    public boolean hasAllPermissions(UserRole role, Permission... permissions) {
        Set<Permission> rolePermissions = getPermissionsForRole(role);
        
        // SUPER_ADMIN tem todas as permissões
        if (rolePermissions.contains(Permission.ALL_PERMISSIONS)) {
            return true;
        }
        
        return Arrays.stream(permissions).allMatch(rolePermissions::contains);
    }

    public List<String> getPermissionDescriptions() {
        return Arrays.asList(
            "USERS_READ - Visualizar usuários",
            "USERS_WRITE - Editar usuários",
            "USERS_DELETE - Excluir usuários",
            "USERS_CREATE - Criar usuários",
            "GROUPS_READ - Visualizar grupos",
            "GROUPS_WRITE - Editar grupos",
            "GROUPS_DELETE - Excluir grupos",
            "GROUPS_CREATE - Criar grupos",
            "CLIENTS_READ - Visualizar clientes",
            "CLIENTS_WRITE - Editar clientes",
            "CLIENTS_DELETE - Excluir clientes",
            "CLIENTS_CREATE - Criar clientes",
            "EMPLOYEES_READ - Visualizar funcionários",
            "EMPLOYEES_WRITE - Editar funcionários",
            "EMPLOYEES_DELETE - Excluir funcionários",
            "EMPLOYEES_CREATE - Criar funcionários",
            "CONTRACTS_READ - Visualizar contratos",
            "CONTRACTS_WRITE - Editar contratos",
            "CONTRACTS_DELETE - Excluir contratos",
            "CONTRACTS_CREATE - Criar contratos",
            "FINANCIAL_READ - Visualizar dados financeiros",
            "FINANCIAL_WRITE - Editar dados financeiros",
            "FINANCIAL_DELETE - Excluir dados financeiros",
            "FINANCIAL_CREATE - Criar dados financeiros",
            "PAYSLIPS_READ - Visualizar holerites",
            "PAYSLIPS_WRITE - Editar holerites",
            "PAYSLIPS_DELETE - Excluir holerites",
            "PAYSLIPS_CREATE - Criar holerites",
            "PAYSLIPS_PUBLISH - Publicar holerites",
            "REPORTS_READ - Visualizar relatórios",
            "REPORTS_GENERATE - Gerar relatórios",
            "REPORTS_EXPORT - Exportar relatórios",
            "LEADS_READ - Visualizar leads",
            "LEADS_WRITE - Editar leads",
            "LEADS_DELETE - Excluir leads",
            "LEADS_CREATE - Criar leads",
            "PROPOSALS_READ - Visualizar propostas",
            "PROPOSALS_WRITE - Editar propostas",
            "PROPOSALS_DELETE - Excluir propostas",
            "PROPOSALS_CREATE - Criar propostas",
            "QUOTES_READ - Visualizar orçamentos",
            "QUOTES_WRITE - Editar orçamentos",
            "QUOTES_DELETE - Excluir orçamentos",
            "QUOTES_CREATE - Criar orçamentos",
            "SYSTEM_CONFIG - Configurar sistema",
            "SYSTEM_LOGS - Visualizar logs",
            "SYSTEM_BACKUP - Gerenciar backups",
            "SYSTEM_INTEGRATION - Gerenciar integrações",
            "AUDIT_READ - Visualizar auditoria",
            "AUDIT_WRITE - Escrever auditoria",
            "DASHBOARD_READ - Visualizar dashboard",
            "DASHBOARD_WRITE - Editar dashboard",
            "PROFILE_READ - Visualizar perfil",
            "PROFILE_WRITE - Editar perfil",
            "ALL_PERMISSIONS - Todas as permissões"
        );
    }
} 