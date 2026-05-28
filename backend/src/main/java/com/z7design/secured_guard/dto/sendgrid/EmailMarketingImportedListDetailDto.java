package com.z7design.secured_guard.dto.sendgrid;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record EmailMarketingImportedListDetailDto(
        UUID id,
        String name,
        String description,
        String sourceType,
        List<EmailCampaignRecipientDto> recipients,
        int recipientCount,
        Instant createdAt,
        Instant updatedAt
) {
}
