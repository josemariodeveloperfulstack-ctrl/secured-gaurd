package com.z7design.secured_guard.dto.sendgrid;

import java.util.Map;

public record EmailCampaignRecipientDto(
        String email,
        String name,
        Map<String, Object> metadata
) {
}
