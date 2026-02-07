package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.AdjustmentType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request para registrar reajuste de contrato")
public class CreateContractAdjustmentRequest {

    @NotNull(message = "Tipo de reajuste é obrigatório")
    @Schema(description = "Tipo de reajuste")
    private AdjustmentType adjustmentType;

    @NotNull(message = "Valor anterior é obrigatório")
    @Schema(description = "Valor anterior")
    private BigDecimal previousValue;

    @NotNull(message = "Novo valor é obrigatório")
    @Schema(description = "Novo valor")
    private BigDecimal newValue;

    @Schema(description = "Data do reajuste (default: hoje)")
    private LocalDate adjustmentDate;
}
