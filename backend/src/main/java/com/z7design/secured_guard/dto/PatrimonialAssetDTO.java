package com.z7design.secured_guard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Schema(description = "DTO para bem patrimonial")
public class PatrimonialAssetDTO {

    private UUID id;

    @Schema(description = "Código (gerado no create, read-only no update)")
    private String code;

    @Size(max = 255)
    @Schema(description = "Nome do bem")
    private String name;

    @Schema(description = "Descrição")
    private String description;

    @NotNull
    @Schema(description = "ID da categoria")
    private UUID categoryId;

    @Schema(description = "ID da localização")
    private UUID locationId;

    @NotNull
    @Schema(description = "Data de aquisição")
    private LocalDate acquisitionDate;

    @NotNull
    @Schema(description = "Valor de aquisição")
    private BigDecimal acquisitionValue;

    @NotNull
    @Schema(description = "Vida útil em anos")
    private Integer usefulLifeYears;

    @Schema(description = "Valor residual (%)")
    private BigDecimal residualValuePct = BigDecimal.ZERO;

    @Schema(description = "Status: EM_USO, EM_MANUTENCAO, BAIXADO, EM_DEPRECIACAO_TOTAL")
    private String status = "EM_USO";

    @Size(max = 100)
    @Schema(description = "Número de série")
    private String serialNumber;

    @Size(max = 100)
    @Schema(description = "Número da nota fiscal")
    private String invoiceNumber;

    @Schema(description = "ID do funcionário responsável")
    private UUID responsibleEmployeeId;

    @Schema(description = "Observações")
    private String notes;
}
