package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.MovementReason;
import com.z7design.secured_guard.model.enums.StockRequisitionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockRequisitionListItemDTO {

    private UUID id;
    private String requisitionNumber;
    private StockRequisitionStatus status;
    private String employeeName;
    private String movementReasonLabel;
    private LocalDateTime createdAt;
    private String requestedByName;
    private int linesCount;

    /**
     * Projeção JPQL (contagem de linhas por subquery).
     */
    public StockRequisitionListItemDTO(
            UUID id,
            String requisitionNumber,
            StockRequisitionStatus status,
            String employeeName,
            MovementReason movementReason,
            LocalDateTime createdAt,
            String requestedByName,
            long linesCount) {
        this.id = id;
        this.requisitionNumber = requisitionNumber;
        this.status = status;
        this.employeeName = employeeName;
        this.movementReasonLabel = movementReason != null ? movementReason.getDescription() : null;
        this.createdAt = createdAt;
        this.requestedByName = requestedByName;
        this.linesCount = (int) linesCount;
    }
}
