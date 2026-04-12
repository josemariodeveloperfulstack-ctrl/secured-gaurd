package com.z7design.secured_guard.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Contexto para a lista de funcionários: últimas movimentações e processos de admissão/demissão em aberto.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdmissionEmployeeIntegrationDTO {

    private EmployeeMovementSnapshot lastHire;
    private EmployeeMovementSnapshot lastTermination;

    @Builder.Default
    private List<UUID> pendingAdmissionEmployeeIds = new ArrayList<>();

    @Builder.Default
    private List<UUID> pendingDismissalEmployeeIds = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EmployeeMovementSnapshot {
        @JsonFormat(shape = JsonFormat.Shape.STRING)
        private UUID employeeId;
        private String name;
        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate date;
    }
}
