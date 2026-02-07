package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.AmendmentType;
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
@Schema(description = "Request para criar aditivo de contrato")
public class CreateContractAmendmentRequest {

    @NotNull(message = "Tipo do aditivo é obrigatório")
    @Schema(description = "Tipo do aditivo")
    private AmendmentType type;

    @Schema(description = "Descrição do aditivo")
    private String description;

    @Schema(description = "Data efetiva")
    private LocalDate effectiveDate;

    @Schema(description = "Impacto financeiro")
    private BigDecimal financialImpact;
}
