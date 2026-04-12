package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryRequisitionSummaryDTO {
    private String requisitionNumber;
    private LocalDateTime firstMovementAt;
    private long movementCount;
}
