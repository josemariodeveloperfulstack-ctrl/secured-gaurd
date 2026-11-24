package com.z7design.secured_guard.service.prospection;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Qualifica os dados brutos retornados pela esteira de prospecção ANTES de qualquer
 * gravação ou tentativa de envio. Regras aplicadas:
 *
 * <ul>
 *   <li><b>E-mail</b>: formato válido, domínio plausível e nunca um contato de
 *       contabilidade/fiscal/auditoria (esses endereços não são decisores de
 *       segurança patrimonial e geram rejeição nas campanhas);</li>
 *   <li><b>WhatsApp</b>: somente celular brasileiro válido — DDD entre 11 e 99 e
 *       número de 9 dígitos iniciado em 9. Telefone fixo é descartado;</li>
 *   <li><b>Nome</b>: prioriza decisores/pessoas reais (QSA, diretoria, compras) e,
 *       na ausência deles, utiliza o nome da empresa como contato.</li>
 * </ul>
 */
public final class ProspectionContactQualifier {

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$", Pattern.CASE_INSENSITIVE);
    private static final Pattern LOCAL_PART_PATTERN = Pattern.compile("^[A-Za-z0-9._%+-]+$");
    private static final List<String> ACCOUNTING_TERMS = List.of(
            "contab", "contabil", "contabilidade", "fiscal", "assessoria",
            "escritorio", "audit", "tax", "contador", "balanco", "escrituracao");

    private ProspectionContactQualifier() {
    }

    /** Contato já normalizado e apto (ou o motivo pelo qual o e-mail foi reprovado). */
    public record QualifiedContact(
            String name,
            String email,
            String whatsapp,
            String company,
            String emailRejectionReason) {

        public boolean hasValidEmail() {
            return email != null;
        }
    }

    public static QualifiedContact qualify(Map<String, Object> item) {
        if (item == null || item.isEmpty()) {
            return new QualifiedContact(null, null, null, null, "NO_DATA");
        }

        String company = firstNonBlank(
                item.get("razaoSocial"), item.get("nomeFantasia"), item.get("company"));

        String personName = firstNonBlank(
                nested(item, "qsa", "nome"),
                nested(item, "decisores", "nome"),
                nested(item, "contatosEconodata", "nome"),
                item.get("contatoComprasNome"),
                item.get("nomeFantasia"),
                item.get("razaoSocial"));

        String email = null;
        String emailRejectionReason = null;
        boolean accountingEmailFound = false;
        List<String> candidates = collectStrings(
                item.get("email"),
                item.get("emailCompras"),
                nested(item, "qsa", "email"),
                nested(item, "decisores", "email"),
                nested(item, "contatosEconodata", "email"));

        for (String candidate : candidates) {
            String normalized = normalizeEmail(candidate);
            if (normalized == null) {
                continue;
            }
            if (isAccountingEmail(normalized)) {
                accountingEmailFound = true;
                continue;
            }
            email = normalized;
            emailRejectionReason = null;
            break;
        }
        if (email == null && emailRejectionReason == null) {
            emailRejectionReason = accountingEmailFound ? "ACCOUNTING_EMAIL" : "NO_EMAIL";
        }

        String whatsapp = normalizeWhatsapp(firstNonBlank(
                nested(item, "qsa", "whatsapp"),
                nested(item, "qsa", "telefone"),
                nested(item, "decisores", "whatsapp"),
                nested(item, "decisores", "telefone"),
                nested(item, "contatosEconodata", "whatsapp"),
                nested(item, "contatosEconodata", "telefone"),
                item.get("whatsapp"),
                item.get("telefone"),
                item.get("telefoneSecundario")));

        return new QualifiedContact(
                trimToNull(personName),
                email,
                whatsapp,
                trimToNull(company),
                emailRejectionReason);
    }

    /**
     * Normaliza um telefone brasileiro para WhatsApp no formato (DD) 9XXXX-XXXX.
     * Retorna {@code null} para fixos, números sem DDD ou DDDs inválidos.
     */
    public static String normalizeWhatsapp(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String digits = raw.replaceAll("\\D", "");
        if (digits.length() > 13) {
            return null;
        }
        // Remove o código do país (55) quando presente.
        if (digits.length() >= 12 && digits.startsWith("55")) {
            digits = digits.substring(2);
        }
        // DDD (2) + 9 dígitos do celular.
        if (digits.length() != 11) {
            return null;
        }
        String ddd = digits.substring(0, 2);
        int dddNumber;
        try {
            dddNumber = Integer.parseInt(ddd);
        } catch (NumberFormatException e) {
            return null;
        }
        if (dddNumber < 11 || dddNumber > 99) {
            return null;
        }
        String number = digits.substring(2);
        if (number.charAt(0) != '9') {
            return null; // telefone fixo não recebe WhatsApp
        }
        return "(" + ddd + ") " + number.substring(0, 5) + "-" + number.substring(5);
    }

    /** Normaliza e valida um e-mail; retorna {@code null} quando inválido. */
    public static String normalizeEmail(String raw) {
        if (raw == null) {
            return null;
        }
        String value = raw.trim().toLowerCase(Locale.ROOT);
        if (value.length() > 255 || !EMAIL_PATTERN.matcher(value).matches()) {
            return null;
        }
        int at = value.indexOf('@');
        String local = value.substring(0, at);
        String domain = value.substring(at + 1);
        if (!LOCAL_PART_PATTERN.matcher(local).matches()
                || local.startsWith(".")
                || local.endsWith(".")
                || local.contains("..")
                || domain.startsWith(".")
                || domain.endsWith(".")
                || domain.contains("..")) {
            return null;
        }
        return value;
    }

    private static boolean isAccountingEmail(String email) {
        String value = email.toLowerCase(Locale.ROOT);
        return ACCOUNTING_TERMS.stream().anyMatch(value::contains);
    }

    private static Object nested(Map<String, Object> item, String collectionKey, String field) {
        Object value = item.get(collectionKey);
        if (value instanceof List<?> list) {
            for (Object element : list) {
                if (element instanceof Map<?, ?> map) {
                    Object fieldValue = map.get(field);
                    if (fieldValue != null && !fieldValue.toString().isBlank()) {
                        return fieldValue;
                    }
                }
            }
        } else if (value instanceof Map<?, ?> map) {
            return map.get(field);
        }
        return null;
    }

    private static String firstNonBlank(Object... values) {
        for (Object value : values) {
            String text = trimToNull(value);
            if (text != null) {
                return text;
            }
        }
        return null;
    }

    private static List<String> collectStrings(Object... values) {
        List<String> out = new ArrayList<>();
        for (Object value : values) {
            String text = trimToNull(value);
            if (text != null) {
                out.add(text);
            }
        }
        return out;
    }

    private static String trimToNull(Object value) {
        if (value == null) {
            return null;
        }
        String text = value.toString().trim();
        return text.isEmpty() ? null : text;
    }
}
