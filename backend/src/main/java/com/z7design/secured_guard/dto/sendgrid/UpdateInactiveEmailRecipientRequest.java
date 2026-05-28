package com.z7design.secured_guard.dto.sendgrid;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateInactiveEmailRecipientRequest(
        @NotBlank
        @Email
        @Size(max = 320)
        String email,

        @Size(max = 500)
        String name,

        Boolean reactivate
) {
}

