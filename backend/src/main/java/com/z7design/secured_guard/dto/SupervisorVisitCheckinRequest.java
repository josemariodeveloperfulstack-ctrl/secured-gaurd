package com.z7design.secured_guard.dto;

import lombok.Data;

/**
 * Requisição de check-in da visita do supervisor a um posto de trabalho.
 *
 * <p>O posto pode ser informado via {@link #qrCode} (lido do QR Code do posto) OU
 * diretamente por {@link #workPostId}. O funcionário é identificado por {@link #employeeValue}
 * (token do QR do crachá, CPF ou matrícula).
 */
@Data
public class SupervisorVisitCheckinRequest {

    /** Conteúdo lido do QR Code do posto de trabalho. */
    private String qrCode;

    /** Alternativa ao QR Code: id do posto selecionado manualmente. */
    private String workPostId;

    /** Valor lido do crachá (token QR), ou CPF / matrícula digitados. */
    private String employeeValue;

    /** Geolocalização capturada no momento do check-in. */
    private Double latitude;
    private Double longitude;

    /** Nome do endereço onde o QR foi lido (reverse geocoding feito no cliente). */
    private String locationAddress;

    private String description;
    private String observations;

    /** Opcional: força o supervisor (quando o usuário logado não tem vínculo de funcionário). */
    private String supervisorId;
}
