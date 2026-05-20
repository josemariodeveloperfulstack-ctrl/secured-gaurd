package com.z7design.secured_guard.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class DeletionRequestDTO {
    @NotBlank(message = "O motivo da exclusão é obrigatório")
    private String reason;
    
    private List<UUID> ids; // Opcional, para exclusão em massa
}
