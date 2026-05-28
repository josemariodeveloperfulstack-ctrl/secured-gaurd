package com.z7design.secured_guard.dto.sendgrid;

import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Corpo para acrescentar destinatários a uma campanha em rascunho.
 * Validação por item é feita no serviço (linhas inválidas são ignoradas).
 */
public record AppendRecipientsRequest(
        @NotNull List<EmailCampaignRecipientDto> recipients
) {
}
