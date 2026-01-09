package com.z7design.secured_guard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

/**
 * DTO para criação de ações corretivas
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCorrectiveActionDTO {
    
    @NotBlank(message = "Título é obrigatório")
    private String title;
    
    @NotBlank(message = "Descrição é obrigatória")
    private String description;
    
    @NotNull(message = "Origem é obrigatória")
    private String origin; // INSPECAO, ACIDENTE, AUDITORIA, NAO_CONFORMIDADE, OUTROS
    
    @NotNull(message = "Prioridade é obrigatória")
    private String priority; // BAIXA, MEDIA, ALTA, CRITICA
    
    private String status; // PENDENTE, EM_ANDAMENTO, CONCLUIDA, CANCELADA
    
    private UUID responsibleUserId;
    
    private String responsibleName; // Nome do responsável (alternativa ao userId)
    
    @NotNull(message = "Data de vencimento é obrigatória")
    private LocalDate dueDate;
    
    private String department;
    
    private String notes;
    
    private UUID relatedInspectionId;
    
    private UUID relatedAccidentId;
    
    private UUID relatedNonConformityId;
}




