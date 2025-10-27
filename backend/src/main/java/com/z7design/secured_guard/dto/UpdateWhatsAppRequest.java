package com.z7design.secured_guard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request para atualizar número de WhatsApp de um usuário
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateWhatsAppRequest {
    
    /**
     * Número de WhatsApp (9-20 dígitos, apenas números)
     */
    @NotBlank(message = "WhatsApp number is required")
    @Pattern(regexp = "^\\d{9,20}$", message = "WhatsApp deve conter apenas dígitos (9-20 caracteres)")
    private String whatsapp;
}

