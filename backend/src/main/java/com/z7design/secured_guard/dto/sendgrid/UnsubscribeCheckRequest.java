package com.z7design.secured_guard.dto.sendgrid;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UnsubscribeCheckRequest(
        @NotNull
        @Size(max = 500)
        List<String> emails
) {
}
