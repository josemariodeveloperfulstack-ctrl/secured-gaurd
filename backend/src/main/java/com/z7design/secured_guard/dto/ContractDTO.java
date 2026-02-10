package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.AdjustmentType;
import com.z7design.secured_guard.model.enums.ContractOrigin;
import com.z7design.secured_guard.model.enums.ContractStatus;
import com.z7design.secured_guard.model.enums.ContractType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "DTO para Contrato")
public class ContractDTO {
    
    private java.util.UUID id;
    
    @Schema(description = "Número do contrato", example = "CON-2024-001")
    @NotBlank(message = "Número do contrato é obrigatório")
    @Size(max = 50, message = "Número do contrato deve ter no máximo 50 caracteres")
    private String contractNumber;
    
    @Schema(description = "Descrição do contrato", example = "Contrato de prestação de serviços de segurança")
    @NotBlank(message = "Descrição é obrigatória")
    @Size(max = 500, message = "Descrição deve ter no máximo 500 caracteres")
    private String description;
    
    @Schema(description = "Data de início do contrato", example = "2024-01-01")
    @NotNull(message = "Data de início é obrigatória")
    private LocalDate startDate;
    
    @Schema(description = "Data de término do contrato", example = "2024-12-31")
    private LocalDate endDate;
    
    @Schema(description = "Valor do contrato", example = "50000.00")
    @NotNull(message = "Valor é obrigatório")
    private BigDecimal value;
    
    @Schema(description = "Status do contrato", example = "ACTIVE")
    private ContractStatus status;
    
    @Schema(description = "Observações sobre o contrato")
    @Size(max = 1000, message = "Observações deve ter no máximo 1000 caracteres")
    private String notes;
    
    @Schema(description = "ID do cliente (obrigatório na criação; na atualização pode ser omitido e será mantido o existente)", example = "1")
    private java.util.UUID clientId;
    
    // Campos adicionais para resposta
    @Schema(description = "Nome do cliente")
    private String clientName;
    
    @Schema(description = "CNPJ do cliente")
    private String clientCnpj;
    
    @Schema(description = "Data de criação")
    private LocalDateTime createdAt;
    
    @Schema(description = "Data de atualização")
    private LocalDateTime updatedAt;

    // Campos do PRD - Gestão de Contratos
    @Schema(description = "Origem do contrato")
    private ContractOrigin contractOrigin;

    @Schema(description = "Tipo do contrato")
    private ContractType contractType;

    @Schema(description = "ID do responsável comercial")
    private java.util.UUID responsibleCommercialId;

    @Schema(description = "Nome do responsável comercial")
    private String responsibleCommercialName;

    @Schema(description = "ID do gestor do contrato")
    private java.util.UUID responsibleManagerId;

    @Schema(description = "Nome do gestor do contrato")
    private String responsibleManagerName;

    @Schema(description = "ID da proposta originária")
    private java.util.UUID proposalId;

    @Schema(description = "Valor mensal")
    private BigDecimal monthlyValue;

    @Schema(description = "Valor anual")
    private BigDecimal annualValue;

    @Schema(description = "Tipo de reajuste")
    private AdjustmentType adjustmentType;

    @Schema(description = "Data do próximo reajuste")
    private LocalDate nextAdjustmentDate;

    @Schema(description = "Renovação automática")
    private Boolean autoRenewal;

    @Schema(description = "Tempo de substituição (horas)")
    private Integer replacementTimeHours;

    @Schema(description = "Ausência máxima (minutos)")
    private Integer maxAbsenceMinutes;

    @Schema(description = "Frequência de rondas")
    private String patrolFrequency;

    @Schema(description = "Relatórios obrigatórios")
    private String reportsRequired;

    @Schema(description = "Obrigações do contratado")
    private String obligationsContractor;

    @Schema(description = "Obrigações do contratante")
    private String obligationsContracted;

    @Schema(description = "Penalidades")
    private String penalties;

    @Schema(description = "Motivo de encerramento")
    private com.z7design.secured_guard.model.enums.TerminationReason terminationReason;

    @Schema(description = "Data de encerramento")
    private LocalDate terminationDate;

    @Schema(description = "Checklist de encerramento (JSON)")
    private String terminationChecklist;
} 