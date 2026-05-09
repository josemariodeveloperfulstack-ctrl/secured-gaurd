package com.z7design.secured_guard.dto.sendgrid;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CreateEmailCampaignRequest(
        @NotBlank String title,
        String templateId,
        @NotEmpty @Valid List<EmailCampaignRecipientDto> recipients
) {
}
