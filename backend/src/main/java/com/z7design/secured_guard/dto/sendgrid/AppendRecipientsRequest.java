package com.z7design.secured_guard.dto.sendgrid;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Corpo para acrescentar destinatários a uma campanha em rascunho.
 */
public record AppendRecipientsRequest(
        @NotNull @Valid List<EmailCampaignRecipientDto> recipients
) {
}
