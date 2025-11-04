package com.z7design.secured_guard.util;

import lombok.extern.slf4j.Slf4j;

/**
 * Utilitário para determinar roles baseado em padrões de email
 */
@Slf4j
public class RoleAssignmentUtil {

    /**
     * Verifica se o email é de um colaborador baseado no padrão
     * colaborador.*@promovervigilancia.com.br
     */
    public static boolean isColaboradorEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return false;
        }
        
        boolean matches = email.matches("colaborador\\..*@promovervigilancia\\.com\\.br");
        
        if (matches) {
            log.info("✅ Email identificado como COLABORADOR: {}", email);
        }
        
        return matches;
    }

    /**
     * Determina o role padrão baseado no email
     */
    public static String determineDefaultRole(String email) {
        if (isColaboradorEmail(email)) {
            return "COLABORADOR";
        }
        
        // Outros padrões podem ser adicionados aqui
        // Exemplo: admin.*@promovervigilancia.com.br -> ADMIN
        if (email != null && email.matches("admin\\..*@promovervigilancia\\.com\\.br")) {
            log.info("✅ Email identificado como ADMIN: {}", email);
            return "ADMIN";
        }
        
        if (email != null && email.matches("rh\\..*@promovervigilancia\\.com\\.br")) {
            log.info("✅ Email identificado como RH: {}", email);
            return "RH";
        }
        
        if (email != null && email.matches("financeiro\\..*@promovervigilancia\\.com\\.br")) {
            log.info("✅ Email identificado como FINANCEIRO: {}", email);
            return "FINANCEIRO";
        }
        
        if (email != null && email.matches("supervisor\\..*@promovervigilancia.com\\.br")) {
            log.info("✅ Email identificado como SUPERVISOR: {}", email);
            return "SUPERVISOR";
        }
        
        // Default
        return "COLABORADOR";
    }

    /**
     * Valida se o padrão de email é válido para criação automática de usuário
     */
    public static boolean isValidEmailPattern(String email) {
        if (email == null || email.trim().isEmpty()) {
            return false;
        }
        
        // Aceitar emails da Promover Vigilância
        return email.endsWith("@promovervigilancia.com.br");
    }
}

