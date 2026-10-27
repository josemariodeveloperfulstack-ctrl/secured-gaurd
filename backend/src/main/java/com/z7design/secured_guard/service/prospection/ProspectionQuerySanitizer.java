package com.z7design.secured_guard.service.prospection;

import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

@Component
public class ProspectionQuerySanitizer {

    private static final Pattern CNAE_CODE_PATTERN = Pattern.compile("^\\s*\\d{4}-\\d/\\d{2}\\s*-\\s*", Pattern.CASE_INSENSITIVE);
    private static final Pattern CNAE_RAW_DIGITS = Pattern.compile("^\\s*\\d{5,7}\\s*-\\s*", Pattern.CASE_INSENSITIVE);

    /**
     * Higieniza o termo de busca para o Google Maps / Apify:
     * Remove prefixos numéricos de CNAE (ex: "4683-4/00 - ") e constrói uma consulta
     * legível comercialmente combinando nicho, cidade e estado.
     */
    public String buildMapsQuery(String cidade, String uf, String segmento) {
        String sanitizedSegmento = cleanSegmentTerm(segmento);

        StringBuilder sb = new StringBuilder();
        if (sanitizedSegmento != null && !sanitizedSegmento.isBlank()) {
            sb.append(sanitizedSegmento);
        } else {
            sb.append("Empresas e Condomínios Comerciais");
        }

        if (cidade != null && !cidade.isBlank()) {
            sb.append(" em ").append(cidade.trim());
        }
        if (uf != null && !uf.isBlank()) {
            sb.append(" ").append(uf.trim());
        }

        return sb.toString().trim();
    }

    public String cleanSegmentTerm(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        String clean = raw.trim();

        // Se contiver múltiplos termos separados por pipe | (ex: "Agronegócio & Silos | 4683-4/00 - Comércio..."), limpa cada parte
        if (clean.contains("|")) {
            String[] parts = clean.split("\\|");
            StringBuilder result = new StringBuilder();
            for (String part : parts) {
                String sub = cleanSingleTerm(part);
                if (!sub.isBlank()) {
                    if (result.length() > 0) result.append(" ");
                    result.append(sub);
                }
            }
            return result.toString().trim();
        }

        return cleanSingleTerm(clean);
    }

    private String cleanSingleTerm(String term) {
        if (term == null) return "";
        String s = term.trim();
        // Remove prefixo CNAE ex: "4683-4/00 - "
        s = CNAE_CODE_PATTERN.matcher(s).replaceFirst("");
        s = CNAE_RAW_DIGITS.matcher(s).replaceFirst("");
        return s.trim();
    }
}
