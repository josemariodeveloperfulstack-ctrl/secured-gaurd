package com.z7design.secured_guard.dto.sendgrid;

import java.time.Instant;
import java.util.UUID;

public record EmailCampaignSummaryDto(
        UUID id,
        String title,
        String description,
        String templateId,
        UUID defaultTemplateId,
        String defaultTemplateName,
        String providerType,
        String status,
        Integer totalLimit,
        Integer dailyLimit,
        Integer hourlyLimit,
        Integer minIntervalSeconds,
        Instant scheduledAt,
        Instant createdAt,
        long recipientCount
) {
}
