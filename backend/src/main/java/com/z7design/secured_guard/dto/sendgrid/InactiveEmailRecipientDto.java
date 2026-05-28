package com.z7design.secured_guard.dto.sendgrid;

import java.time.Instant;
import java.util.UUID;

public record InactiveEmailRecipientDto(
        UUID recipientId,
        String email,
        String name,
        String reason,
        Instant inactivatedAt
) {
}

