package com.z7design.secured_guard.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.z7design.secured_guard.model.enums.PostAllocationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

/**
 * Linha do relatório de visitas do supervisor (Gestão Operacional).
 *
 * <p>{@link #visitedAsScheduled} indica que a data da visita coincide com uma escala de
 * visita planejada para o mesmo supervisor — o frontend usa esse flag para pintar a linha
 * de azul, confirmando que o supervisor visitou o posto conforme a escala.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupervisorVisitReportRow {

    private UUID id;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate visitDate;

    @JsonFormat(pattern = "HH:mm:ss")
    private LocalTime visitTime;

    private String supervisorName;
    private String employeeName;
    private String workPostName;
    private String clientName;

    private PostAllocationType allocationType;
    private String allocationDescription;

    private Double latitude;
    private Double longitude;
    private String locationAddress;

    private Boolean qrCodeVerified;

    /** Verdadeiro quando há escala de visita do supervisor na mesma data (confirmação azul). */
    private Boolean visitedAsScheduled;
    private UUID matchedScheduleId;
}
