package com.z7design.secured_guard.dto.sendgrid;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SaveEmailMarketingImportedListRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 2000) String description,
        String sourceType,
        /** Validação por item é feita no serviço (linhas inválidas são ignoradas). */
        @NotNull List<EmailCampaignRecipientDto> recipients
) {
}
