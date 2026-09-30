package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClientContractRequest {
    private UUID companyId;
    private UUID companyConfigId; // Config escolhida para cabeçalho, rodapé e cláusulas

    // Dados do Cliente
    private String clientName;
    private String clientDocument; // CNPJ/CPF
    private String clientAddress;
    private String clientPhone;
    private String clientEmail;

    // Representante Legal do Cliente
    private String representativeName;
    private String representativeCpf;

    // Dados do Contrato
    private String contractNumber;
    private String description;
    private BigDecimal value;
    private LocalDate startDate;
    private LocalDate endDate;

    // Termos e Observações
    private String paymentTerms;
    private String additionalTerms;
    private String observations;

    private String city; // Cidade para data
    private LocalDate contractDate; // Data do contrato

    // Campos das Minutas Comerciais
    private String contractTemplate; // ADMINISTRATIVO, VIGILANCIA_PATRIMONIAL, COMBINADO ou ARMADA/DESARMADA/PORTARIA (minutas de 14 cláusulas)
    private String contractedCompanyCnpj; // CNPJ da empresa promotora
    private Integer replacementTimeHours; // Tempo de reposição de efetivo
    private Integer maxAbsenceMinutes; // Ausência máxima permitida
    private String patrolFrequency; // Frequência de rondas
    private String obligationsContractor; // Obrigações do contratado
    private String obligationsContracted; // Obrigações do contratante
    private String penalties; // Penalidades
    private List<UUID> workPostIds; // IDs dos postos de trabalho a vincular
    private BigDecimal monthlyValue; // Valor mensal do contrato

    /**
     * Minuta de contrato com 14 cláusulas (ARMADA, DESARMADA ou PORTARIA).
     * Quando informada, o PDF usa o texto integral das cláusulas do template
     * (resolvido pela empresa) em vez do layout resumido antigo.
     */
    private String contractTemplateKey; // ARMADA, DESARMADA, PORTARIA
}

