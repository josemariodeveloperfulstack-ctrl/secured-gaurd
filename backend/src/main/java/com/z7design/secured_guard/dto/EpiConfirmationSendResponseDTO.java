package com.z7design.secured_guard.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class EpiConfirmationSendResponseDTO {
    private UUID formId;
    private UUID confirmationToken;
    private String confirmationCode;
    private String confirmUrl;
    private String whatsappUrl;
    private String phoneMasked;
    private boolean sent;
    private String mode;
    private LocalDateTime expiresAt;
    private String message;
}
