package com.z7design.secured_guard.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhatsAppConsentRequest {
    
    @NotNull(message = "User ID é obrigatório")
    private UUID userId;
    
    @Pattern(regexp = "^\\d{9,20}$", message = "Número do WhatsApp deve conter apenas dígitos (9-20 caracteres)")
    private String whatsappNumber; // Opcional - pode atualizar número ao dar consentimento
}

