package com.z7design.secured_guard.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequestDTO {
    
    @Email(message = "Email inválido")
    private String email;
    
    private String name;
    
    @Pattern(regexp = "^\\d{9,20}$", message = "O número do WhatsApp deve conter apenas dígitos e ter entre 9 e 20 caracteres")
    private String whatsapp;
}

