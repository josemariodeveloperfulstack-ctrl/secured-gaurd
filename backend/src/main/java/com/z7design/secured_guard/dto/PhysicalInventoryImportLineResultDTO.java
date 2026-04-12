package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhysicalInventoryImportLineResultDTO {
    private String categoryLabel;
    private String stockItemCode;
    private Integer previousQuantity;
    private Integer targetQuantity;
    private Integer delta;
    private UUID movementId;
    private boolean skipped;
    private String message;
}
