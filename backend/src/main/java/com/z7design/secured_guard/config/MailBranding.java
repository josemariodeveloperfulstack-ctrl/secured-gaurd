package com.z7design.secured_guard.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Nome exibido em assuntos, corpos e remetente de e-mails (nunca o nome interno do produto).
 */
@Component
public class MailBranding {

    @Value("${app.mail.brand-name:Promover}")
    private String brandName;

    public String getBrandName() {
        return brandName;
    }

    public String prefixSubject(String subject) {
        String base = subject != null ? subject.trim() : "";
        String tag = "[" + brandName + "]";
        if (base.isEmpty()) {
            return tag;
        }
        if (base.regionMatches(true, 0, tag, 0, tag.length())) {
            return base;
        }
        return tag + " " + base;
    }
}
