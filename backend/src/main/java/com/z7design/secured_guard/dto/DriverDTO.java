package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.Driver;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class DriverDTO {
    private UUID id;
    private String name;
    private String licenseNumber;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static DriverDTO fromEntity(Driver driver) {
        try {
            DriverDTO dto = new DriverDTO();
            dto.setId(driver.getId());
            dto.setName(driver.getName());
            dto.setLicenseNumber(driver.getLicenseNumber());
            dto.setStatus(driver.getStatus());
            dto.setCreatedAt(driver.getCreatedAt());
            dto.setUpdatedAt(driver.getUpdatedAt());
            return dto;
        } catch (Exception e) {
            System.err.println("Erro ao converter Driver para DTO: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }
} 