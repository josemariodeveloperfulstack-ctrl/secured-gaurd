package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.StockMovement;
import com.z7design.secured_guard.model.enums.MovementType;
import com.z7design.secured_guard.model.enums.MovementReason;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class StockMovementDTO {
    private UUID id;
    private UUID stockItemId;
    private String stockItemName;
    private String stockItemCode;
    private String stockItemFullName;
    private MovementType movementType;
    private MovementReason reason;
    private Integer quantity;
    private Integer previousQuantity;
    private Integer newQuantity;
    private UUID employeeId;
    private String employeeName;
    private UUID userId;
    private String userName;
    private String documentNumber;
    private String supplier;
    private BigDecimal unitCost;
    private BigDecimal totalCost;
    private LocalDateTime movementDate;
    private String notes;
    private String qrCodeUsed;
    private UUID unitId;
    private String unitName;
    private UUID itemLocationId;
    private String itemLocationDisplay;
    private String digitalSignature;
    private LocalDateTime signatureDate;
    private StockMovement.SignatureType signatureType;
    private String requisitionUrl;
    private StockMovement.RequisitionSentType requisitionSentType;
    /** Mesmo número em todas as linhas geradas por um import de inventário físico */
    private String requisitionNumber;

    /**
     * Quando true, não cria ficha de EPI automática em {@link com.z7design.secured_guard.service.StockService#createMovement}
     * (ex.: saídas geradas pela aprovação de requisição de almoxarifado, onde a ficha é criada em lote).
     */
    private Boolean skipEpiDeliveryFormAutoRecord;

    public static StockMovementDTO fromEntity(StockMovement entity) {
        StockMovementDTO dto = new StockMovementDTO();
        dto.setId(entity.getId());
        dto.setMovementType(entity.getMovementType());
        dto.setReason(entity.getReason());
        dto.setQuantity(entity.getQuantity());
        dto.setPreviousQuantity(entity.getPreviousQuantity());
        dto.setNewQuantity(entity.getNewQuantity());
        dto.setEmployeeName(entity.getEmployeeName());
        dto.setUserName(entity.getUserName());
        dto.setDocumentNumber(entity.getDocumentNumber());
        dto.setSupplier(entity.getSupplier());
        dto.setUnitCost(entity.getUnitCost());
        dto.setTotalCost(entity.getTotalCost());
        dto.setMovementDate(entity.getMovementDate());
        dto.setNotes(entity.getNotes());
        dto.setQrCodeUsed(entity.getQrCodeUsed());
        dto.setDigitalSignature(entity.getDigitalSignature());
        dto.setSignatureDate(entity.getSignatureDate());
        dto.setSignatureType(entity.getSignatureType());
        dto.setRequisitionUrl(entity.getRequisitionUrl());
        dto.setRequisitionSentType(entity.getRequisitionSentType());
        dto.setRequisitionNumber(entity.getRequisitionNumber());

        if (entity.getStockItem() != null) {
            dto.setStockItemId(entity.getStockItem().getId());
            dto.setStockItemName(entity.getStockItem().getName());
            dto.setStockItemCode(entity.getStockItem().getCode());
            dto.setStockItemFullName(entity.getStockItem().getFullName());
        }

        if (entity.getEmployee() != null) {
            dto.setEmployeeId(entity.getEmployee().getId());
        }

        if (entity.getUser() != null) {
            dto.setUserId(entity.getUser().getId());
        }

        if (entity.getUnit() != null) {
            dto.setUnitId(entity.getUnit().getId());
            dto.setUnitName(entity.getUnit().getName());
        }

        if (entity.getItemLocation() != null) {
            dto.setItemLocationId(entity.getItemLocation().getId());
            if (entity.getItemLocation().getShelf() != null) {
                dto.setItemLocationDisplay(entity.getItemLocation().getShelf().getIdentification() + 
                    (entity.getItemLocation().getFloor() != null ? " - " + entity.getItemLocation().getFloor() : ""));
            } else {
                dto.setItemLocationDisplay("Prateleira não identificada" + 
                    (entity.getItemLocation().getFloor() != null ? " - " + entity.getItemLocation().getFloor() : ""));
            }
        }

        return dto;
    }

    public static StockMovement toEntity(StockMovementDTO dto) {
        StockMovement entity = new StockMovement();
        entity.setId(dto.getId());
        entity.setMovementType(dto.getMovementType());
        entity.setReason(dto.getReason());
        entity.setQuantity(dto.getQuantity());
        entity.setPreviousQuantity(dto.getPreviousQuantity());
        entity.setNewQuantity(dto.getNewQuantity());
        entity.setEmployeeName(dto.getEmployeeName());
        entity.setUserName(dto.getUserName());
        entity.setDocumentNumber(dto.getDocumentNumber());
        entity.setSupplier(dto.getSupplier());
        entity.setUnitCost(dto.getUnitCost());
        entity.setTotalCost(dto.getTotalCost());
        entity.setNotes(dto.getNotes());
        entity.setQrCodeUsed(dto.getQrCodeUsed());
        entity.setDigitalSignature(dto.getDigitalSignature());
        entity.setSignatureDate(dto.getSignatureDate());
        entity.setSignatureType(dto.getSignatureType());
        entity.setRequisitionUrl(dto.getRequisitionUrl());
        entity.setRequisitionSentType(dto.getRequisitionSentType());
        entity.setRequisitionNumber(dto.getRequisitionNumber());
        return entity;
    }
}