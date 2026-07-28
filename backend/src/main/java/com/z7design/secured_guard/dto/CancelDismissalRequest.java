package com.z7design.secured_guard.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CancelDismissalRequest {

    /** Justificativa obrigatória da reversão (auditoria). */
    @NotBlank(message = "A justificativa do cancelamento da demissão é obrigatória")
    private String justification;

    /** Opcional: vínculo empregatício a reabrir. Se omitido, usa o mais recente. */
    private UUID periodId;
}
