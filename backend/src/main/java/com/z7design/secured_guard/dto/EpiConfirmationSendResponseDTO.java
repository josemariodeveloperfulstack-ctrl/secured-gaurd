package com.z7design.secured_guard.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
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
    /** Confirmações individuais por item (modo por item). Vazio/null quando a confirmação é por ficha. */
    private List<ItemConfirmation> items;

    @Data
    @Builder
    public static class ItemConfirmation {
        private UUID itemId;
        private String epiName;
        private String confirmationCode;
        private String confirmUrl;
        private LocalDateTime expiresAt;
        private boolean confirmed;
    }
}
