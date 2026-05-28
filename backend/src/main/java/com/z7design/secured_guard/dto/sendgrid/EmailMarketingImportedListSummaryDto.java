package com.z7design.secured_guard.dto.sendgrid;

import java.time.Instant;
import java.util.UUID;

public record EmailMarketingImportedListSummaryDto(
        UUID id,
        String name,
        String description,
        String sourceType,
        int recipientCount,
        Instant createdAt,
        Instant updatedAt
) {
}
