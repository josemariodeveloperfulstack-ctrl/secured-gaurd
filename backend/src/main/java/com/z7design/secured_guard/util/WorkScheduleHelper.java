package com.z7design.secured_guard.util;

import com.z7design.secured_guard.model.Employee;

/**
 * Regras de escala de trabalho para apuração de ponto (ex.: 12x36 sem intervalo).
 */
public final class WorkScheduleHelper {

    private WorkScheduleHelper() {
    }

    public static boolean isEscala12x36(Employee employee) {
        if (employee == null) {
            return false;
        }
        return isEscala12x36(employee.getEscalaTrabalho(), employee.getDiasTrabalho())
                || matches12x36(employee.getHorarioTrabalho());
    }

    public static boolean isEscala12x36(String escalaTrabalho, String diasTrabalho) {
        return matches12x36(escalaTrabalho) || matches12x36(diasTrabalho);
    }

    private static boolean matches12x36(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }
        String n = value.trim().toLowerCase()
                .replace(" ", "")
                .replace("á", "a")
                .replace("ã", "a")
                .replace(".", "")
                .replace("_", "");
        return n.contains("12x36") || n.contains("12/36") || n.contains("12-36") || n.contains("12x36h");
    }

    /** Carga horária diária sugerida conforme escala. */
    public static double defaultDailyHoursForEmployee(Employee employee) {
        if (employee != null && isEscala12x36(employee)) {
            return 12.0;
        }
        return 8.0;
    }
}
