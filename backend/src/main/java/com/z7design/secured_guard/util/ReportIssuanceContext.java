package com.z7design.secured_guard.util;

import com.z7design.secured_guard.model.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Dados do usuário autenticado e instante da geração para rodapé de relatórios (PDF/auditoria).
 */
public final class ReportIssuanceContext {

    private static final DateTimeFormatter FOOTER_TS = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private ReportIssuanceContext() {
    }

    /**
     * Nome completo e, se diferente, o login entre parênteses.
     */
    public static String resolveUserLabelForReportFooter() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return "—";
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof User u) {
            String name = u.getName();
            String username = u.getUsername();
            if (name != null && !name.isBlank()) {
                if (username != null && !username.isBlank() && !username.equalsIgnoreCase(name.trim())) {
                    return name.trim() + " (" + username + ")";
                }
                return name.trim();
            }
            return username != null ? username : "—";
        }
        String n = auth.getName();
        return (n != null && !n.isBlank() && !"anonymousUser".equals(n)) ? n : "—";
    }

    public static String resolveReportTimestampFooter() {
        return LocalDateTime.now().format(FOOTER_TS);
    }
}
