package com.z7design.secured_guard.dto.sendgrid;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record EmailTemplateRequest(
        @Size(max = 100) String code,
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 500) String subject,
        @NotBlank String htmlBody,
        String description,
        List<String> variables,
        Boolean isActive
) {}
