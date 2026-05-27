package com.z7design.secured_guard.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SendWhatsAppHumanMessageRequest {
    @NotBlank
    private String body;
}
