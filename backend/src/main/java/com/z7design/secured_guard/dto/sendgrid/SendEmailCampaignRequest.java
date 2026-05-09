package com.z7design.secured_guard.dto.sendgrid;

import jakarta.validation.constraints.NotBlank;

public record SendEmailCampaignRequest(
        @NotBlank String subject,
        @NotBlank String htmlBody
) {
}
