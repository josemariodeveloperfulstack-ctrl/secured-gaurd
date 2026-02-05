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
    // @Email(message = "Email inválido") - Relaxing validation for legacy data
    private String email;

    @NotBlank(message = "Username é obrigatório")
    @Size(min = 3, max = 50, message = "Username deve ter entre 3 e 50 caracteres")
    private String username;

    /**
     * Senha opcional - só validada se fornecida
     */
    @Size(min = 6, message = "Senha deve ter no mínimo 6 caracteres")
    @Pattern(regexp = "^(?:(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[^a-zA-Z0-9\\s]).*|\\d{11}@2025)?$", message = "Senha deve ser forte (maiúscula, minúscula, dígito, especial) ou no formato CPF@2025")
    private String password;

    @Pattern(regexp = "^\\d{9,20}$|^$", message = "WhatsApp deve conter apenas dígitos (9-20 caracteres)")
    private String whatsapp;

    private List<String> roles; // Array de Strings com nomes dos roles

    private Boolean active;

    private String status;

    // Campos de informações adicionais (opcionais)
    @Size(max = 500, message = "Avatar deve ter no máximo 500 caracteres")
    private String avatar;

    @Size(max = 100, message = "Departamento deve ter no máximo 100 caracteres")
    private String department;

    @Size(max = 100, message = "Posição deve ter no máximo 100 caracteres")
    private String position;

    @Size(max = 50, message = "Código do funcionário deve ter no máximo 50 caracteres")
    private String employeeCode;

    @Pattern(regexp = "^\\d{9,20}$|^$", message = "Telefone deve conter apenas dígitos (9-20 caracteres)")
    private String phone;

    @Size(max = 500, message = "Endereço deve ter no máximo 500 caracteres")
    private String address;
}
