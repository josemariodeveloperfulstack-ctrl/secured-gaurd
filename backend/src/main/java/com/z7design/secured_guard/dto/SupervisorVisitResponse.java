package com.z7design.secured_guard.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

/**
 * Resposta do preview/check-in da visita: identifica o posto, o funcionário e o
 * vínculo (efetivo/remanejado/cobertura de férias). No check-in inclui o id da visita gravada.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupervisorVisitResponse {

    /** Preenchido apenas após o check-in ser gravado. */
    private UUID visitId;

    // Posto de trabalho
    private UUID workPostId;
    private String workPostName;
    private String workPostCode;
    private String workPostAddress;
    private String clientName;

    // Funcionário identificado no posto
    private EmployeeIdentificationDTO employee;

    // Vínculo do funcionário com o posto
    private PostAllocationDTO allocation;

    // Dados do check-in
    private Double latitude;
    private Double longitude;
    private String locationAddress;
    private Boolean qrCodeVerified;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate visitDate;

    @JsonFormat(pattern = "HH:mm:ss")
    private LocalTime visitTime;

    @JsonFormat(pattern = "HH:mm:ss")
    private LocalTime checkoutTime;

    private Integer durationMinutes;
    private String signatureData;
    private Boolean epiDelivered;
    private String epiDescription;
    private String epiSignatureData;
    private java.util.List<String> photos;

    private LocalDateTime createdAt;
}
