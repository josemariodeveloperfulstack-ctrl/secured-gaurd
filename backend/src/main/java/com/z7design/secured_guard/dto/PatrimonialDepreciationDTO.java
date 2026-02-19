package com.z7design.secured_guard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Schema(description = "Resultado do cálculo de depreciação em uma data")
public class PatrimonialDepreciationDTO {

    @Schema(description = "Data de referência do cálculo")
    private LocalDate asOfDate;

    @Schema(description = "Valor de aquisição")
    private BigDecimal acquisitionValue;

    @Schema(description = "Valor depreciado acumulado até a data")
    private BigDecimal accumulatedDepreciation;

    @Schema(description = "Valor contábil na data")
    private BigDecimal bookValue;

    @Schema(description = "Meses já depreciados")
    private Integer monthsDepreciated;

    @Schema(description = "Vida útil total em meses")
    private Integer usefulLifeMonths;
}
