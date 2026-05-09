package com.z7design.secured_guard.dto.sendgrid;

import java.time.Instant;
import java.util.UUID;

public record EmailLogRowDto(
        UUID id,
        String recipientEmail,
        String recipientName,
        String status,
        String providerMessageId,
        Instant sentAt,
        Instant deliveredAt,
        Instant readAt,
        Instant clickedAt,
        Instant repliedAt,
        String bounceReason
) {
}
