package com.z7design.secured_guard.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateAgentRequest {
    
    @NotNull(message = "ID do usuário é obrigatório")
    private UUID userId;
    
    private String department;
    
    private Boolean active = true;
}

