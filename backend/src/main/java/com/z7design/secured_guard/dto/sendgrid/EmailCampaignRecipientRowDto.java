package com.z7design.secured_guard.dto.sendgrid;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/** Destinatário persistido em uma campanha (leitura). */
public record EmailCampaignRecipientRowDto(
        UUID id,
        String email,
        String name,
        Map<String, Object> metadata,
        String sourceType,
        UUID leadId,
        String cityLabel,
        boolean emailMarketingSuppressed,
        Instant createdAt
) {
}
