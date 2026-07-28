package com.z7design.secured_guard.dto;

import lombok.Data;

@Data
public class SendEpiConfirmationRequestDTO {
    /** AUTO = envia via WhatsApp do sistema; MANUAL = retorna link wa.me */
    private String mode = "AUTO";
    /** Origem do frontend para montar o link público (ex.: https://app.exemplo.com) */
    private String frontendBaseUrl;
}
