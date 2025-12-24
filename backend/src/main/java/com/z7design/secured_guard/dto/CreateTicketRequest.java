package com.z7design.secured_guard.dto;

import java.util.UUID;

import com.z7design.secured_guard.model.enums.TicketPriority;
import com.z7design.secured_guard.model.enums.TicketCategory;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateTicketRequest {
    
    @NotBlank(message = "Título é obrigatório")
    private String title;
    
    @NotBlank(message = "Descrição é obrigatória")
    private String description;
    
    @NotNull(message = "Prioridade é obrigatória")
    private TicketPriority priority;
    
    @NotNull(message = "Categoria é obrigatória")
    private TicketCategory category;
    
    private String customerName; // Opcional se customerUserId for fornecido
    
    @Email(message = "Email inválido")
    private String customerEmail; // Opcional se customerUserId for fornecido
    
    private String customerPhone;
    
    private UUID customerUserId; // ID do usuário/funcionário (opcional)
    
    private UUID assignedToAgentId;
    
    private UUID companyId;
}

