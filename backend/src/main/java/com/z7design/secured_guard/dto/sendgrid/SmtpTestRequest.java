package com.z7design.secured_guard.dto.sendgrid;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Pedido para testar a configuração SMTP. Pode fornecer um endereço
 * destinatário customizado; se ausente, usa o {@code fromEmail} configurado.
 */
public record SmtpTestRequest(
        @NotBlank @Email String to,
        String subject,
        String body
) {}
