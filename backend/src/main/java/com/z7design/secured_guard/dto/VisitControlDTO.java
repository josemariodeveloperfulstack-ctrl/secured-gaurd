package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.VisitControlStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VisitControlDTO {

    private UUID id;

    @NotBlank(message = "Local é obrigatório")
    private String location;

    @NotBlank(message = "Responsável é obrigatório")
    private String assignedTo;

    private UUID supervisorId;

    private UUID workPostId;

    @NotNull(message = "Data da visita é obrigatória")
    private LocalDate visitDate;

    @NotNull(message = "Horário agendado é obrigatório")
    private LocalTime scheduledAt;

    private LocalDateTime startedAt;

    private LocalDateTime completedAt;

    @NotNull(message = "Status é obrigatório")
    private VisitControlStatus status;

    private String observations;

    private String findings;

    private String reportUrl;

    private Boolean isSuccessful;

    private UUID createdBy;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    // Response fields
    private String supervisorName;
    private String workPostName;
    private String createdByName;
}







