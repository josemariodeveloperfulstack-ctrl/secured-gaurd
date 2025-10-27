package com.z7design.secured_guard.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Request para criação rápida de usuário para funcionário
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuickUserCreateRequest {
    
    /**
     * ID do funcionário para vincular
     */
    @NotBlank(message = "Employee ID is required")
    private UUID employeeId;
    
    /**
     * Email do usuário (opcional, usa do employee se não fornecido)
     */
    @Email(message = "Invalid email format")
    private String email;
    
    /**
     * Número de WhatsApp (9-20 dígitos, apenas números)
     */
    @Pattern(regexp = "^\\d{9,20}$", message = "WhatsApp deve conter apenas dígitos (9-20 caracteres)")
    private String whatsapp;
    
    /**
     * Se deve enviar email de boas-vindas com credenciais
     */
    private boolean sendWelcomeEmail;
}

