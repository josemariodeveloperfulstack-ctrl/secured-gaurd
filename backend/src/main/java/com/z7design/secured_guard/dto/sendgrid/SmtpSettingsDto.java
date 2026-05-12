package com.z7design.secured_guard.dto.sendgrid;

import java.time.Instant;
import java.util.UUID;

/**
 * Representação pública das configurações SMTP. A senha NÃO é exposta —
 * usamos apenas {@code passwordSet} para indicar se há uma cadastrada.
 */
public record SmtpSettingsDto(
        UUID id,
        String host,
        Integer port,
        String username,
        boolean passwordSet,
        Boolean useTls,
        String fromEmail,
        String fromName,
        Boolean isActive,
        Instant lastTestAt,
        Boolean lastTestOk,
        String lastTestError,
        Instant createdAt,
        Instant updatedAt
) {}
