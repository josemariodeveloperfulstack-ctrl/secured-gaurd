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

    /**
     * Valida CNPJ com cálculo oficial de dígitos verificadores (Receita Federal)
     */
    public static boolean isValidCnpj(String cnpj) {
        if (cnpj == null) return false;
        String digits = cnpj.replaceAll("\\D", "");
        if (digits.length() != 14) return false;
        if (digits.matches("(\\d)\\1{13}")) return false;

        int[] weights1 = {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int sum1 = 0;
        for (int i = 0; i < 12; i++) {
            sum1 += (digits.charAt(i) - '0') * weights1[i];
        }
        int mod1 = sum1 % 11;
        int d1 = (mod1 < 2) ? 0 : 11 - mod1;
        if (digits.charAt(12) - '0' != d1) return false;

        int[] weights2 = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int sum2 = 0;
        for (int i = 0; i < 13; i++) {
            sum2 += (digits.charAt(i) - '0') * weights2[i];
        }
        int mod2 = sum2 % 11;
        int d2 = (mod2 < 2) ? 0 : 11 - mod2;
        return digits.charAt(13) - '0' == d2;
    }

    /**
     * Formata CNPJ no padrão XX.XXX.XXX/XXXX-XX
     */
    public static String formatCnpj(String cnpj) {
        if (cnpj == null || cnpj.isEmpty()) return "";
        String digits = cnpj.replaceAll("\\D", "");
        if (digits.length() != 14) return cnpj;
        return String.format("%s.%s.%s/%s-%s",
                digits.substring(0, 2),
                digits.substring(2, 5),
                digits.substring(5, 8),
                digits.substring(8, 12),
                digits.substring(12, 14));
    }

    /**
     * Garante que um CNPJ tenha 14 dígitos com dígitos verificadores módulo-11 válidos da Receita Federal
     * e retorna formatado no padrão XX.XXX.XXX/XXXX-XX.
     */
    public static String repairOrGenerateValidCnpj(String rawCnpj, String fallbackSeed) {
        String digits = rawCnpj != null ? rawCnpj.replaceAll("\\D", "") : "";
        if (digits.length() == 14 && isValidCnpj(digits)) {
            return formatCnpj(digits);
        }

        String base12;
        if (digits.length() >= 12 && !digits.substring(0, 12).matches("(\\d)\\1{11}")) {
            base12 = digits.substring(0, 12);
        } else if (digits.length() >= 8 && !digits.substring(0, 8).matches("(\\d)\\1{7}")) {
            base12 = digits.substring(0, 8) + "0001";
        } else {
            String seed = (fallbackSeed != null && !fallbackSeed.isBlank()) ? fallbackSeed.trim().toLowerCase() : "securedguard";
            long hash = 2166136261L;
            for (int i = 0; i < seed.length(); i++) {
                hash ^= seed.charAt(i);
                hash *= 16777619L;
            }
            long positive = Math.abs(hash) % 89999999L + 10000000L;
            base12 = String.format("%08d0001", positive);
        }

        int[] weights1 = {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int sum1 = 0;
        for (int i = 0; i < 12; i++) {
            sum1 += (base12.charAt(i) - '0') * weights1[i];
        }
        int mod1 = sum1 % 11;
        int d1 = (mod1 < 2) ? 0 : 11 - mod1;

        String base13 = base12 + d1;
        int[] weights2 = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int sum2 = 0;
        for (int i = 0; i < 13; i++) {
            sum2 += (base13.charAt(i) - '0') * weights2[i];
        }
        int mod2 = sum2 % 11;
        int d2 = (mod2 < 2) ? 0 : 11 - mod2;

        return formatCnpj(base13 + d2);
    }
}
