package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.StorageShelf;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class StorageShelfDTO {
    private UUID id;
    private String identification;
    private String block;
    private String section;
    private String aisle;
    private String room;
    private String compartmentInfo;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String fullLocationDisplay;

    public static StorageShelfDTO fromEntity(StorageShelf entity) {
        StorageShelfDTO dto = new StorageShelfDTO();
        dto.setId(entity.getId());
        dto.setIdentification(entity.getIdentification());
        dto.setBlock(entity.getBlock());
        dto.setSection(entity.getSection());
        dto.setAisle(entity.getAisle());
        dto.setRoom(entity.getRoom());
        dto.setCompartmentInfo(entity.getCompartmentInfo());
        dto.setActive(entity.getActive());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        dto.setFullLocationDisplay(entity.getFullLocationDisplay());
        return dto;
    }

    public static StorageShelf toEntity(StorageShelfDTO dto) {
        StorageShelf entity = new StorageShelf();
        if (dto.getId() != null) {
            entity.setId(dto.getId());
        }
        entity.setIdentification(dto.getIdentification());
        entity.setBlock(dto.getBlock());
        entity.setSection(dto.getSection());
        entity.setAisle(dto.getAisle());
        entity.setRoom(dto.getRoom());
        entity.setCompartmentInfo(dto.getCompartmentInfo());
        entity.setActive(dto.getActive() != null ? dto.getActive() : Boolean.TRUE);
        return entity;
    }
}
