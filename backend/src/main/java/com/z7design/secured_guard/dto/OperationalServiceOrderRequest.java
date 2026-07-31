package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OperationalServiceOrderRequest {
    private UUID companyId;

    /** ID do funcionário (opcional). Quando informado, persiste o PDF gerado. */
    private UUID employeeId;

    // Dados do Funcionário (Executante)
    private String employeeName;
    private String employeeCpf;
    private String employeePosition;
    private String sector;

    // Dados do Cliente
    private String clientName;
    private String clientAddress;

    // Detalhes do Serviço
    private String serviceType;
    private String location;
    private LocalDate startDate;
    private LocalDate endDate;
    private String startTime;
    private String endTime;
    private String priority;
    private String status;
    private String description;
    private String observations;

    // Dados Gerais
    private String city;
    private LocalDate documentDate;
    private String responsibility;
    private String revision;
    private LocalDate hireDate;

    /** STANDARD_NR01 (padrão) ou BOMBEIRO_CIVIL (frente + verso) */
    private String layoutType;

    // Segurança e Medicina do Trabalho (NR-01)
    /** Uma obrigação por linha; quando informado, substitui a lista padrão no PDF */
    private String employeeObligations;
    private String activities;
    private String risks;
    private String preventiveMeasures;
    private String uniform;
    /** Título da seção de EPI/uniforme no PDF (padrão: UNIFORME DE USO OBRIGATÓRIO) */
    private String uniformSectionTitle;
    private String mandatoryTrainings;

    /** Procedimento em caso de acidentes (layout Bombeiro Civil) */
    private String accidentProcedure;

    /**
     * Profissional de SST cujo carimbo vai no 3º quadro do cabeçalho da OS.
     * Se nulo, usa o padrão da empresa.
     */
    private UUID safetyEngineerId;

    /**
     * URL do carimbo a usar no 3º quadro (opcional).
     * Quando informado, tem prioridade sobre o carimbo do profissional.
     */
    private String stampImageUrl;
}
