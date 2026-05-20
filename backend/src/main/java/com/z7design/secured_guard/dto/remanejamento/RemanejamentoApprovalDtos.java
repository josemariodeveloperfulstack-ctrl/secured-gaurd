package com.z7design.secured_guard.dto.remanejamento;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.z7design.secured_guard.model.Remanejamento;
import com.z7design.secured_guard.model.RemanejamentoTipo;
import com.z7design.secured_guard.model.enums.RemanejamentoMotivo;
import com.z7design.secured_guard.model.enums.RemanejamentoStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/** DTOs do fluxo de aprovação de remanejamento. */
public class RemanejamentoApprovalDtos {

    private RemanejamentoApprovalDtos() {
    }

    /** Payload do supervisor para solicitar remanejamento. */
    @Data @NoArgsConstructor
    public static class RequestDTO {
        @NotNull
        private UUID employeeId;
        private UUID coverageEmployeeId;
        private UUID originWorkstationId;
        private UUID destinationWorkstationId;
        @NotNull
        private RemanejamentoTipo tipo;
        private RemanejamentoMotivo motivo;
        @NotNull
        private LocalDate dataRemanejamento;
        private String observacao;
        /** Visita que originou o pedido (opcional). */
        private UUID visitControlId;
    }

    @Data @NoArgsConstructor
    public static class RejectDTO {
        @NotNull
        private String reason;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RemanejamentoSummaryDTO {
        private UUID id;
        private RemanejamentoStatus status;
        private RemanejamentoMotivo motivo;
        private RemanejamentoTipo tipo;

        private UUID employeeId;
        private String employeeName;
        private UUID coverageEmployeeId;
        private String coverageEmployeeName;
        private UUID originWorkstationId;
        private String originWorkstationName;
        private UUID destinationWorkstationId;
        private String destinationWorkstationName;

        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate dataRemanejamento;
        private String observacao;

        private UUID requestedById;
        private String requestedByName;
        @JsonFormat(shape = JsonFormat.Shape.STRING)
        private LocalDateTime requestedAt;

        private UUID approvedById;
        private String approvedByName;
        @JsonFormat(shape = JsonFormat.Shape.STRING)
        private LocalDateTime approvedAt;
        @JsonFormat(shape = JsonFormat.Shape.STRING)
        private LocalDateTime rejectedAt;
        private String rejectionReason;

        private UUID visitControlId;

        public static RemanejamentoSummaryDTO from(Remanejamento r) {
            return RemanejamentoSummaryDTO.builder()
                .id(r.getId())
                .status(r.getStatus())
                .motivo(r.getMotivo())
                .tipo(r.getTipo())
                .employeeId(r.getEmployee() != null ? r.getEmployee().getId() : null)
                .employeeName(r.getEmployee() != null ? r.getEmployee().getName() : null)
                .coverageEmployeeId(r.getCoverageEmployee() != null ? r.getCoverageEmployee().getId() : null)
                .coverageEmployeeName(r.getCoverageEmployee() != null ? r.getCoverageEmployee().getName() : null)
                .originWorkstationId(r.getOriginWorkstation() != null ? r.getOriginWorkstation().getId() : null)
                .originWorkstationName(r.getOriginWorkstation() != null ? r.getOriginWorkstation().getName() : null)
                .destinationWorkstationId(r.getDestinationWorkstation() != null ? r.getDestinationWorkstation().getId() : null)
                .destinationWorkstationName(r.getDestinationWorkstation() != null ? r.getDestinationWorkstation().getName() : null)
                .dataRemanejamento(r.getDataRemanejamento())
                .observacao(r.getObservacao())
                .requestedById(r.getRequestedBy() != null ? r.getRequestedBy().getId() : null)
                .requestedByName(r.getRequestedBy() != null ? r.getRequestedBy().getName() : null)
                .requestedAt(r.getRequestedAt())
                .approvedById(r.getApprovedBy() != null ? r.getApprovedBy().getId() : null)
                .approvedByName(r.getApprovedBy() != null ? r.getApprovedBy().getName() : null)
                .approvedAt(r.getApprovedAt())
                .rejectedAt(r.getRejectedAt())
                .rejectionReason(r.getRejectionReason())
                .visitControlId(r.getVisitControl() != null ? r.getVisitControl().getId() : null)
                .build();
        }
    }
}
