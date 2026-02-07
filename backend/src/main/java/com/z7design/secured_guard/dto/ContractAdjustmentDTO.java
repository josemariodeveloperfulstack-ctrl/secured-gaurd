package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.AdjustmentType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "DTO para Histórico de Reajuste de Contrato")
public class ContractAdjustmentDTO {

    private UUID id;

    @Schema(description = "ID do contrato")
    private UUID contractId;

    @Schema(description = "Tipo de reajuste")
    private AdjustmentType adjustmentType;

    @Schema(description = "Valor anterior")
    private BigDecimal previousValue;

    @Schema(description = "Novo valor")
    private BigDecimal newValue;

    @Schema(description = "Data do reajuste")
    private LocalDate adjustmentDate;

    @Schema(description = "Data de criação")
    private LocalDateTime createdAt;
}
