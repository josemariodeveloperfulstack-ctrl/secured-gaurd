package com.z7design.secured_guard.service.sendgrid;

import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Renderiza templates substituindo placeholders {{variavel}} pelos valores
 * fornecidos no contexto. Faz escape básico para evitar injeção de HTML
 * vindo dos dados do destinatário.
 */
@Component
public class EmailTemplateRenderer {

    private static final Pattern TOKEN = Pattern.compile("\\{\\{\\s*([A-Za-z0-9_\\.]+)\\s*\\}\\}");

    /** Substitui placeholders e aplica HTML-escape nos valores. */
    public String renderHtml(String template, Map<String, String> context) {
        return render(template, context, true);
    }

    /** Substitui placeholders sem escape (use somente para assuntos). */
    public String renderText(String template, Map<String, String> context) {
        return render(template, context, false);
    }

    /** Extrai a lista única de variáveis declaradas no template (na ordem em que aparecem). */
    public Set<String> extractVariables(String template) {
        Set<String> vars = new LinkedHashSet<>();
        if (template == null) return vars;
        Matcher m = TOKEN.matcher(template);
        while (m.find()) {
            vars.add(m.group(1));
        }
        return vars;
    }

    private String render(String template, Map<String, String> context, boolean escape) {
        if (template == null || template.isEmpty()) return "";
        Matcher m = TOKEN.matcher(template);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String key = m.group(1);
            String value = context != null ? context.get(key) : null;
            if (value == null) value = "";
            if (escape) value = escapeHtml(value);
            m.appendReplacement(sb, Matcher.quoteReplacement(value));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    private String escapeHtml(String s) {
        StringBuilder out = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '&' -> out.append("&amp;");
                case '<' -> out.append("&lt;");
                case '>' -> out.append("&gt;");
                case '"' -> out.append("&quot;");
                case '\'' -> out.append("&#39;");
                default -> out.append(c);
            }
        }
        return out.toString();
    }
}
