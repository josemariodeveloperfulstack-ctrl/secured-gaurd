package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.AmendmentStatus;
import com.z7design.secured_guard.model.enums.AmendmentType;
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
@Schema(description = "DTO para Aditivo de Contrato")
public class ContractAmendmentDTO {

    private UUID id;

    @Schema(description = "ID do contrato")
    private UUID contractId;

    @Schema(description = "Tipo do aditivo")
    private AmendmentType type;

    @Schema(description = "Descrição do aditivo")
    private String description;

    @Schema(description = "Data efetiva")
    private LocalDate effectiveDate;

    @Schema(description = "Impacto financeiro")
    private BigDecimal financialImpact;

    @Schema(description = "ID do usuário que aprovou")
    private UUID approvedById;

    @Schema(description = "Nome do usuário que aprovou")
    private String approvedByName;

    @Schema(description = "Data de aprovação")
    private LocalDateTime approvedAt;

    @Schema(description = "Status do aditivo")
    private AmendmentStatus status;

    @Schema(description = "Data de criação")
    private LocalDateTime createdAt;

    @Schema(description = "Data de atualização")
    private LocalDateTime updatedAt;
}
