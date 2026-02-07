package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractExpiringAlertDTO {

    private UUID contractId;
    private String contractNumber;
    private String clientName;
    private LocalDate endDate;
    private long daysRemaining;
    private String urgencyLevel; // CRITICAL (<=30), WARNING (31-60), INFO (61-90), NORMAL (91-120)
    private BigDecimal value;
}
