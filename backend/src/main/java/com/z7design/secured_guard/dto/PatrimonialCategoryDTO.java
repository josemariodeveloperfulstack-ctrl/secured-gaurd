package com.z7design.secured_guard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Schema(description = "DTO para categoria patrimonial")
public class PatrimonialCategoryDTO {

    private UUID id;

    @Size(max = 255)
    @Schema(description = "Nome da categoria")
    private String name;

    @Schema(description = "Descrição")
    private String description;

    @Schema(description = "Vida útil padrão em anos")
    private Integer defaultUsefulLifeYears;

    @Schema(description = "Taxa de depreciação padrão (%)")
    private BigDecimal defaultDepreciationRatePct;
}
