package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockRequisitionAnalyticsFilterDTO {
    private UUID companyId;
    private UUID unitId;
    private UUID departmentId;
    private UUID employeeId; // Quem pegou / Beneficiário
    private UUID requestedByUserId; // Quem solicitou
    private String periodType; // "DAILY", "WEEKLY", "MONTHLY", "CUSTOM"

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate startDate;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate endDate;

    private Boolean onlyEpi;
    private String search;
}
