package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.GoalPeriod;
import com.z7design.secured_guard.model.enums.GoalType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalesGoalDTO {

    private UUID id;
    private UUID userId;
    private String userName;
    private GoalType type;
    private BigDecimal targetValue;
    private BigDecimal currentValue;
    private double progressPercent;
    private GoalPeriod period;
    private int referenceMonth;
    private int referenceYear;
    private String description;
    private UUID createdById;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
