package com.z7design.secured_guard.util;

import java.util.regex.Pattern;

public class ValidationUtils {

    /**
     * Formata CPF no padrão XXX.XXX.XXX-XX
     * 
     * @param cpf CPF (apenas números ou já formatado)
     * @return CPF formatado ou string original se inválido
     */
    public static String formatCpf(String cpf) {
        if (cpf == null || cpf.isEmpty()) {
            return "";
        }

        // Remove tudo que não é dígito
        String digits = cpf.replaceAll("\\D", "");

        // Verifica se tem 11 dígitos
        if (digits.length() != 11) {
            return cpf;
        }

        // Aplica a máscara
        return String.format("%s.%s.%s-%s",
                digits.substring(0, 3),
                digits.substring(3, 6),
                digits.substring(6, 9),
                digits.substring(9, 11));
    }

    public static boolean isValidCpf(String cpf) {
        if (cpf == null)
            return false;
        String digits = cpf.replaceAll("\\D", "");
        return digits.length() == 11;
    }
}
