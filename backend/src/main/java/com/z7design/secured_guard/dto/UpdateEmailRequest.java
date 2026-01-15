package com.z7design.secured_guard.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request para atualizar email de um usuário
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateEmailRequest {

    /**
     * Email corporativo ou pessoal válido
     */
    @NotBlank(message = "Email é obrigatório")
    @Email(message = "Email em formato inválido")
    private String email;
}

