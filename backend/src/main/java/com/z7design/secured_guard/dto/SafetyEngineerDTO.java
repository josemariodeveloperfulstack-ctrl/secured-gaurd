package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.SafetyEngineer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SafetyEngineerDTO {
    private UUID id;

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 200, message = "Nome deve ter até 200 caracteres")
    private String name;

    @NotBlank(message = "CREA é obrigatório")
    @Size(max = 50, message = "CREA deve ter até 50 caracteres")
    private String creaNumber;

    @Size(max = 500, message = "URL do carimbo deve ter até 500 caracteres")
    private String stampImageUrl;

    private UUID companyId;
    private String companyName;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static SafetyEngineerDTO fromEntity(SafetyEngineer entity) {
        if (entity == null) {
            return null;
        }

        return SafetyEngineerDTO.builder()
                .id(entity.getId())
                .name(entity.getName())
                .creaNumber(entity.getCreaNumber())
                .stampImageUrl(entity.getStampImageUrl())
                .companyId(entity.getCompany() != null ? entity.getCompany().getId() : null)
                .companyName(entity.getCompany() != null ? entity.getCompany().getName() : null)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public SafetyEngineer toEntity(Company company) {
        SafetyEngineer entity = new SafetyEngineer();
        entity.setId(this.id);
        entity.setName(this.name);
        entity.setCreaNumber(this.creaNumber);
        entity.setStampImageUrl(this.stampImageUrl);
        entity.setCompany(company);
        return entity;
    }
}
