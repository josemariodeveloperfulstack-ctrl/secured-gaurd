package com.z7design.secured_guard.service.whatsapp;

/**
 * Normalização de telefone para APIs WhatsApp (DDI 55, só dígitos).
 */
public final class WhatsAppPhoneUtil {

    private WhatsAppPhoneUtil() {
    }

    public static String normalize(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            return "";
        }
        String clean = phoneNumber.replaceAll("[^0-9]", "");
        if (clean.startsWith("55") && clean.length() >= 12) {
            return clean;
        }
        if (clean.length() == 10 || clean.length() == 11) {
            return "55" + clean;
        }
        if (clean.length() > 11 && !clean.startsWith("55")) {
            return clean;
        }
        return clean.startsWith("55") ? clean : "55" + clean;
    }

    /** Formato JID usado pela Evolution API. */
    public static String toEvolutionJid(String normalizedDigits) {
        if (normalizedDigits == null || normalizedDigits.isBlank()) {
            return normalizedDigits;
        }
        if (normalizedDigits.contains("@")) {
            return normalizedDigits;
        }
        return normalizedDigits + "@s.whatsapp.net";
    }
}
