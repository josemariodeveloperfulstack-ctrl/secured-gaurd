package com.z7design.secured_guard.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO para atualização de usuários
 * Não inclui validação obrigatória de senha (pode ser null)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {
    
    @NotBlank(message = "Nome é obrigatório")
    @Size(min = 3, max = 100, message = "Nome deve ter entre 3 e 100 caracteres")
    private String name;
    
    @NotBlank(message = "Email é obrigatório")
    @Email(message = "Email inválido")
    private String email;
    
    @NotBlank(message = "Username é obrigatório")
    @Size(min = 3, max = 50, message = "Username deve ter entre 3 e 50 caracteres")
    private String username;
    
    /**
     * Senha opcional - só validada se fornecida
     */
    @Size(min = 6, message = "Senha deve ter no mínimo 6 caracteres")
    @Pattern(
        regexp = "^(?:(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[^a-zA-Z0-9\\s]).*|\\d{11}@2025)?$",
        message = "Senha deve ser forte (maiúscula, minúscula, dígito, especial) ou no formato CPF@2025"
    )
    private String password;
    
    @Pattern(
        regexp = "^\\d{9,20}$|^$", 
        message = "WhatsApp deve conter apenas dígitos (9-20 caracteres)"
    )
    private String whatsapp;
    
    private List<RoleDTO> roles;
    
    private Boolean active;
    
    private String status;
}

