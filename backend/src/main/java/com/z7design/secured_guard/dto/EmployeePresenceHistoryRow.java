package com.z7design.secured_guard.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.z7design.secured_guard.model.enums.PostAllocationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

/**
 * Linha do histórico de confirmações de presença de um funcionário.
 *
 * <p>Cada registro representa uma visita em que o supervisor leu o QR Code (ou identificou por
 * CPF/matrícula) o funcionário no posto de trabalho, confirmando a presença dele.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeePresenceHistoryRow {

    private UUID visitId;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate visitDate;

    @JsonFormat(pattern = "HH:mm:ss")
    private LocalTime visitTime;

    private String supervisorName;
    private String workPostName;
    private String clientName;

    private PostAllocationType allocationType;
    private String allocationDescription;

    private Double latitude;
    private Double longitude;
    private String locationAddress;

    /** Verdadeiro quando a presença foi confirmada pela leitura do QR Code do posto. */
    private Boolean qrCodeVerified;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
}
