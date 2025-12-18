package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateVacationCoverageRequest {
    
    private UUID vacationId;
    private UUID employeeId; // ID do funcionário em férias (para criar vacation se não existir)
    private UUID substituteEmployeeId;
    private LocalDate startDate;
    private LocalDate endDate;
    private UUID locationId;
    private String shift; // DAY, NIGHT, MIXED
    private String observations;
}























