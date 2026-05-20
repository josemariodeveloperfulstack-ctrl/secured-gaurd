package com.z7design.secured_guard.dto.sendgrid;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UnsubscribeCheckRequest(
        @NotNull
        @Size(min = 1, max = 500)
        List<@Email String> emails
) {
}
