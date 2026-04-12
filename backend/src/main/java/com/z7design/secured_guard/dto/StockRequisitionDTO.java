package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.StockRequisition;
import com.z7design.secured_guard.model.StockRequisitionLine;
import com.z7design.secured_guard.model.enums.MovementReason;
import com.z7design.secured_guard.model.enums.StockRequisitionStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@Builder
public class StockRequisitionDTO {

    private UUID id;
    private String requisitionNumber;
    private UUID employeeId;
    private String employeeName;
    private String employeeDocument;
    /** Snapshot: departamento, posto, cargo na criação */
    private String employeeWorkSector;
    private UUID requestedByUserId;
    private String requestedByName;
    private MovementReason movementReason;
    private String movementReasonLabel;
    private String notes;
    private StockRequisitionStatus status;
    private UUID approvedByUserId;
    private String approvedByName;
    private LocalDateTime approvedAt;
    private LocalDateTime deliveredAt;
    private UUID deliveredByUserId;
    private String deliveredByName;
    private String signatureType;
    private LocalDateTime signatureAt;
    private String physicalSignatureAck;
    private boolean hasDigitalSignature;
    private LocalDateTime createdAt;
    private List<LineDTO> lines;

    @Data
    @Builder
    public static class LineDTO {
        private UUID id;
        private UUID stockItemId;
        private String stockItemCode;
        private String stockItemName;
        private String stockItemFullName;
        private Integer quantity;
    }

    public static StockRequisitionDTO fromEntity(StockRequisition r) {
        List<LineDTO> lineDtos = r.getLines() == null ? List.of() : r.getLines().stream()
                .map(StockRequisitionDTO::lineFromEntity)
                .collect(Collectors.toList());

        return StockRequisitionDTO.builder()
                .id(r.getId())
                .requisitionNumber(r.getRequisitionNumber())
                .employeeId(r.getEmployee() != null ? r.getEmployee().getId() : null)
                .employeeName(r.getEmployee() != null ? r.getEmployee().getName() : null)
                .employeeDocument(r.getEmployee() != null ? r.getEmployee().getDocument() : null)
                .employeeWorkSector(r.getEmployeeWorkSector())
                .requestedByUserId(r.getRequestedByUser() != null ? r.getRequestedByUser().getId() : null)
                .requestedByName(r.getRequestedByUser() != null ? r.getRequestedByUser().getName() : null)
                .movementReason(r.getMovementReason())
                .movementReasonLabel(r.getMovementReason() != null ? r.getMovementReason().getDescription() : null)
                .notes(r.getNotes())
                .status(r.getStatus())
                .approvedByUserId(r.getApprovedByUser() != null ? r.getApprovedByUser().getId() : null)
                .approvedByName(r.getApprovedByUser() != null ? r.getApprovedByUser().getName() : null)
                .approvedAt(r.getApprovedAt())
                .deliveredAt(r.getDeliveredAt())
                .deliveredByUserId(r.getDeliveredByUser() != null ? r.getDeliveredByUser().getId() : null)
                .deliveredByName(r.getDeliveredByUser() != null ? r.getDeliveredByUser().getName() : null)
                .signatureType(r.getSignatureType() != null ? r.getSignatureType().name() : null)
                .signatureAt(r.getSignatureAt())
                .physicalSignatureAck(r.getPhysicalSignatureAck())
                .hasDigitalSignature(r.getDigitalSignature() != null && !r.getDigitalSignature().isBlank())
                .createdAt(r.getCreatedAt())
                .lines(lineDtos)
                .build();
    }

    private static LineDTO lineFromEntity(StockRequisitionLine l) {
        return LineDTO.builder()
                .id(l.getId())
                .stockItemId(l.getStockItem() != null ? l.getStockItem().getId() : null)
                .stockItemCode(l.getStockItem() != null ? l.getStockItem().getCode() : null)
                .stockItemName(l.getStockItem() != null ? l.getStockItem().getName() : null)
                .stockItemFullName(l.getStockItem() != null ? l.getStockItem().getFullName() : null)
                .quantity(l.getQuantity())
                .build();
    }
}
