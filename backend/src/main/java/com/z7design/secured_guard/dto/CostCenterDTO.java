package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.CostCenter;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "DTO para Centro de Custo")
public class CostCenterDTO {

    private java.util.UUID id;

    @Size(max = 10)
    @Schema(example = "CC001")
    private String code;

    @NotBlank
    @Size(max = 100)
    @Schema(example = "Administrativo")
    private String name;

    @Size(max = 1000)
    private String description;

    @Size(max = 100)
    private String owner;

    private CostCenter.Status status = CostCenter.Status.ACTIVE;
}


