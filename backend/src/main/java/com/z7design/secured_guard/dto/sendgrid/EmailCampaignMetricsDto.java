package com.z7design.secured_guard.dto.sendgrid;

import java.util.Map;
import java.util.UUID;

public record EmailCampaignMetricsDto(
        UUID campaignId,
        Map<String, Long> countsByStatus
) {
}
