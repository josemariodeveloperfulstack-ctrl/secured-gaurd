package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.TerminationReason;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TerminateContractRequest {

    @NotNull(message = "Motivo de encerramento é obrigatório")
    private TerminationReason terminationReason;

    @NotNull(message = "Data de encerramento é obrigatória")
    private LocalDate terminationDate;

    private boolean avisoPrevio;
    private boolean desmobilizacaoEquipe;
    private boolean encerramentoFinanceiro;

    private String notes;
}
