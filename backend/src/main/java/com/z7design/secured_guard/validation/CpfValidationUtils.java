package com.z7design.secured_guard.validation;

/**
 * Lógica compartilhada de CPF (normalização e dígitos verificadores), usada pelo
 * {@link CpfValidator} e por serviços que precisam falhar antes do flush JPA.
 */
public final class CpfValidationUtils {

    private CpfValidationUtils() {
    }

    /** Remove não dígitos. */
    public static String digitsOnly(String cpf) {
        if (cpf == null) {
            return "";
        }
        return cpf.replaceAll("[^0-9]", "");
    }

    /**
     * Valida CPF brasileiro (11 dígitos, não repetidos, DV corretos).
     * {@code null} ou vazio retorna {@code true} (campo opcional em anotações).
     */
    public static boolean isValid(String cpf) {
        if (cpf == null || cpf.isEmpty()) {
            return true;
        }
        String digits = digitsOnly(cpf);
        if (digits.length() != 11) {
            return false;
        }
        if (digits.matches("(\\d)\\1{10}")) {
            return false;
        }
        int[] d = digits.chars().map(Character::getNumericValue).toArray();
        int firstDigit = calculateDigit(d, 9);
        int secondDigit = calculateDigit(d, 10);
        return firstDigit == d[9] && secondDigit == d[10];
    }

    private static int calculateDigit(int[] digits, int position) {
        int sum = 0;
        for (int i = 0; i < position; i++) {
            sum += digits[i] * (position + 1 - i);
        }
        int remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    }
}
