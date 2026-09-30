package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeriasReportDTO {
    private UUID employeeId;
    private String status;
    private String tipo;
    private LocalDate dataInicio;
    private LocalDate dataFim;
    private String periodoAquisitivo;
    /** Sigla da empresa: VIG, ADM ou TERC */
    private String empresa;
    private Boolean incluirDetalhes;
    private Boolean incluirEstatisticas;
    private String formato; // EXCEL, PDF
}
