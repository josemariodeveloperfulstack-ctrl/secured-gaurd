package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.PostAllocationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Resultado do cálculo do vínculo de um funcionário com um posto de trabalho numa data.
 * Usado na confirmação da visita do supervisor para informar se o funcionário é efetivo,
 * remanejado ou está em cobertura de férias no posto.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostAllocationDTO {

    private PostAllocationType type;
    private String typeDescription;

    /** Mensagem amigável pronta para exibir ao supervisor. */
    private String message;

    /** Nome do posto efetivo (titular) do funcionário, quando aplicável. */
    private String effectiveWorkPostName;

    /** Nome do funcionário cujas férias estão sendo cobertas (quando COBERTURA_FERIAS). */
    private String coveredEmployeeName;

    /** Período da cobertura de férias (quando COBERTURA_FERIAS). */
    private LocalDate coverageStartDate;
    private LocalDate coverageEndDate;
}
