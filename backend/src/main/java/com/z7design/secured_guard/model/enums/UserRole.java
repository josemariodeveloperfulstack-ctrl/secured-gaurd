package com.z7design.secured_guard.model.enums;

public enum UserRole {
    SUPER_ADMIN, // 🟥 Acesso total e irrestrito
    ADMIN, // 🟦 Acesso amplo, subordinado ao Super Admin
    SUPERVISOR, // 🟩 Coordena operações de equipes
    RH, // 🟨 Gerencia informações contratuais e pessoais
    FINANCEIRO, // 🟧 Controla relatórios financeiros
    TI_SUPORTE, // 🟪 Gerencia configuração técnica
    AUDITOR, // 🟫 Acesso somente leitura
    COLABORADOR,
    COMERCIAL, // Departamento Comercial (legado; preferir GESTOR_COMERCIAL ou
               // ASSISTENTE_COMERCIAL)
    GESTOR_COMERCIAL, // Acesso total ao módulo Comercial: Leads, Empresas, Clientes, Propostas,
                      // Orçamentos, Contratos, CRM
    ASSISTENTE_COMERCIAL, // Leads, Clientes, Propostas, Orçamentos, CRM Comercial (sem Empresas e
                          // Contratos)
    ASSISTENTE_ADMINISTRATIVO, // Assistente Administrativo (Financeiro/Medição)
    ANALISTA_SUPRIMENTOS,
    ESTOQUE,      // Módulo estoque (leitura/consulta)
    SUPRIMENTOS,   // Suprimentos e almoxarifado
    COMPRAS,       // Gestão de compras
    ALMOXARIFADO,  // Almoxarifado
    /** Gestão de supervisão: mesmo escopo operacional de {@link #GESTOR_OPERACIONAL}; authority {@code ROLE_GESTAO_SUPERVISAO} */
    GESTAO_SUPERVISAO,
    GESTOR_OPERACIONAL // Acesso total ao módulo Operacional; sem acesso ao módulo Financeiro
}