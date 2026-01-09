package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO para treinamentos SST com informações agregadas
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SSTTrainingDTO {
    private UUID id;
    private String name;
    private String description;
    private String trainingType;
    private Integer durationHours;
    private Integer validityMonths;
    private Boolean isMandatory;
    private String provider;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Campos agregados
    private Long totalParticipants;
    private Long scheduledParticipants;
    private Long completedParticipants;
    private Long certificatesExpiring; // Certificados próximos do vencimento (30 dias)
    private LocalDateTime nextScheduledDate; // Próxima data agendada
}




