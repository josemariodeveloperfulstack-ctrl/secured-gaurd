package com.z7design.secured_guard.dto.sendgrid;

import com.z7design.secured_guard.model.EmailTemplate;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record EmailTemplateDto(
        UUID id,
        String code,
        String name,
        String subject,
        String htmlBody,
        String description,
        List<String> variables,
        Boolean isDefault,
        Boolean isActive,
        Instant createdAt,
        Instant updatedAt
) {
    public static EmailTemplateDto from(EmailTemplate t) {
        return new EmailTemplateDto(
                t.getId(),
                t.getCode(),
                t.getName(),
                t.getSubject(),
                t.getHtmlBody(),
                t.getDescription(),
                t.getVariables(),
                t.getIsDefault(),
                t.getIsActive(),
                t.getCreatedAt(),
                t.getUpdatedAt());
    }
}
