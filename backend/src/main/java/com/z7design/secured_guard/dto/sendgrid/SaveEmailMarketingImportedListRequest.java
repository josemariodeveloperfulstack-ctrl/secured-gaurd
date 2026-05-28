package com.z7design.secured_guard.dto.sendgrid;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SaveEmailMarketingImportedListRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 2000) String description,
        String sourceType,
        @NotEmpty @Valid List<EmailCampaignRecipientDto> recipients
) {
}
