package com.z7design.secured_guard.dto.sendgrid;

import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.UUID;

/**
 * Atualização de metadados da campanha (sem alterar lista de destinatários).
 * Permitido apenas em rascunho, agendada (pré-disparo) ou pausada.
 */
public record UpdateEmailCampaignRequest(
        @NotBlank String title,
        String description,
        UUID defaultTemplateId,
        String providerType,
        Integer totalLimit,
        Integer dailyLimit,
        Integer hourlyLimit,
        Integer minIntervalSeconds,
        Instant scheduledAt
) {
}
