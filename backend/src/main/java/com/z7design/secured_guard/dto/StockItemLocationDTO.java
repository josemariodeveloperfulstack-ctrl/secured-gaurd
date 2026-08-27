package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.StockItemLocation;
import lombok.Data;

import java.util.UUID;

@Data
public class StockItemLocationDTO {
    private UUID id;
    private UUID stockItemId;
    private String stockItemName;
    private UUID shelfId;
    private String shelfIdentification;
    private String floor;
    private Integer quantity;
    private String fullLocationDisplay;

    public static StockItemLocationDTO fromEntity(StockItemLocation entity) {
        StockItemLocationDTO dto = new StockItemLocationDTO();
        dto.setId(entity.getId());
        dto.setFloor(entity.getFloor());
        dto.setQuantity(entity.getQuantity());

        if (entity.getStockItem() != null) {
            dto.setStockItemId(entity.getStockItem().getId());
            dto.setStockItemName(entity.getStockItem().getName());
        }

        if (entity.getShelf() != null) {
            dto.setShelfId(entity.getShelf().getId());
            dto.setShelfIdentification(entity.getShelf().getIdentification());
            String fullDisplay = entity.getShelf().getFullLocationDisplay();
            dto.setFullLocationDisplay((fullDisplay != null ? fullDisplay : "") + 
                (entity.getFloor() != null ? " | Andar: " + entity.getFloor() : ""));
        }

        return dto;
    }
}
