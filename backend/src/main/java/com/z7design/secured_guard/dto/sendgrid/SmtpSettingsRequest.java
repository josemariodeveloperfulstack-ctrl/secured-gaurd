package com.z7design.secured_guard.dto.sendgrid;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Payload para criar/atualizar a configuração SMTP global. Quando
 * {@code password} é nulo ou em branco, a senha atualmente armazenada é
 * mantida — permitindo edições que não tocam o segredo.
 */
public record SmtpSettingsRequest(
        @NotBlank(message = "host é obrigatório") String host,
        @NotNull(message = "port é obrigatório") @Min(1) @Max(65535) Integer port,
        String username,
        String password,
        Boolean useTls,
        @NotBlank(message = "fromEmail é obrigatório") @Email(message = "fromEmail inválido") String fromEmail,
        String fromName,
        Boolean isActive
) {}
