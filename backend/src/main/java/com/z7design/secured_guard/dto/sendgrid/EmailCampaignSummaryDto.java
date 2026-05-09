package com.z7design.secured_guard.dto.sendgrid;

import java.time.Instant;
import java.util.UUID;

public record EmailCampaignSummaryDto(
        UUID id,
        String title,
        String templateId,
        Instant createdAt,
        long recipientCount
) {
}
