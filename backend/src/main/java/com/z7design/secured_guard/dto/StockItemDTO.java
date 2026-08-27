package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.StockItem;
import com.z7design.secured_guard.model.enums.StockCategory;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class StockItemDTO {
    private UUID id;
    private String code;
    private String name;
    private StockCategory category;
    private String sizeVariation;
    private String description;
    private Integer currentQuantity;
    private Integer minimumQuantity;
    private BigDecimal unitCost;
    private BigDecimal previousUnitCost;
    private String supplier;
    private String barcode;
    private String caNumber;
    private Boolean requiresCa;
    private String qrCode;
    private Boolean active;
    private UUID unitId;
    private String unitName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String notes;
    private Boolean isLowStock;
    private String fullName;
    private java.util.List<StockItemLocationDTO> locations;
    private UUID initialShelfId;
    private String initialFloor;

    public static StockItemDTO fromEntity(StockItem entity) {
        StockItemDTO dto = new StockItemDTO();
        dto.setId(entity.getId());
        dto.setCode(entity.getCode());
        dto.setName(entity.getName());
        dto.setCategory(entity.getCategory());
        dto.setSizeVariation(entity.getSizeVariation());
        dto.setDescription(entity.getDescription());
        dto.setCurrentQuantity(entity.getCurrentQuantity());
        dto.setMinimumQuantity(entity.getMinimumQuantity());
        dto.setUnitCost(entity.getUnitCost());
        dto.setPreviousUnitCost(entity.getPreviousUnitCost());
        dto.setSupplier(entity.getSupplier());
        dto.setBarcode(entity.getBarcode());
        dto.setCaNumber(entity.getCaNumber());
        dto.setRequiresCa(entity.getRequiresCa());
        dto.setQrCode(entity.getQrCode());
        dto.setActive(entity.getActive());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        dto.setNotes(entity.getNotes());
        dto.setIsLowStock(entity.isLowStock());
        dto.setFullName(entity.getFullName());

        if (entity.getUnit() != null) {
            dto.setUnitId(entity.getUnit().getId());
            dto.setUnitName(entity.getUnit().getName());
        }
        
        // As localizações serão preenchidas no service se necessário
        
        return dto;
    }

    public static StockItem toEntity(StockItemDTO dto) {
        StockItem entity = new StockItem();
        if (dto.getId() != null) {
            entity.setId(dto.getId());
        }
        entity.setCode(dto.getCode());
        entity.setName(dto.getName());
        entity.setCategory(dto.getCategory());
        entity.setSizeVariation(dto.getSizeVariation());
        entity.setDescription(dto.getDescription());
        entity.setCurrentQuantity(dto.getCurrentQuantity() != null ? dto.getCurrentQuantity() : 0);
        entity.setMinimumQuantity(dto.getMinimumQuantity() != null ? dto.getMinimumQuantity() : 0);
        entity.setUnitCost(dto.getUnitCost());
        entity.setPreviousUnitCost(dto.getPreviousUnitCost());
        entity.setSupplier(dto.getSupplier());
        entity.setBarcode(dto.getBarcode());
        entity.setCaNumber(dto.getCaNumber());
        entity.setRequiresCa(dto.getRequiresCa() != null ? dto.getRequiresCa() : Boolean.FALSE);
        entity.setQrCode(dto.getQrCode());
        entity.setNotes(dto.getNotes());
        return entity;
    }

    public Boolean getRequiresCa() {
        return requiresCa != null ? requiresCa : Boolean.FALSE;
    }

    public void setRequiresCa(Boolean requiresCa) {
        this.requiresCa = requiresCa;
    }
}