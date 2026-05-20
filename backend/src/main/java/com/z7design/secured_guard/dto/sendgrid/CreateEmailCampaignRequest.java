package com.z7design.secured_guard.dto.sendgrid;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Payload completo de criação de campanha.
 * <ul>
 *  <li>{@code defaultTemplateId}: template padrão da campanha (opcional).</li>
 *  <li>{@code providerType}: SENDGRID (default) ou SMTP.</li>
 *  <li>Limites: {@code totalLimit}, {@code dailyLimit}, {@code hourlyLimit}, {@code minIntervalSeconds}.
 *      Todos nulos = sem limite.</li>
 *  <li>{@code scheduledAt}: quando iniciar o envio (null = imediato/manual).</li>
 * </ul>
 */
public record CreateEmailCampaignRequest(
        @NotBlank String title,
        String description,
        String templateId,
        UUID defaultTemplateId,
        String providerType,
        Integer totalLimit,
        Integer dailyLimit,
        Integer hourlyLimit,
        Integer minIntervalSeconds,
        Instant scheduledAt,
        @NotEmpty @Valid List<EmailCampaignRecipientDto> recipients
) {
}
