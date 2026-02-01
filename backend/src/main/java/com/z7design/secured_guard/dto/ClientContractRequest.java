package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClientContractRequest {
    private UUID companyId;

    // Dados do Cliente
    private String clientName;
    private String clientDocument; // CNPJ/CPF
    private String clientAddress;
    private String clientPhone;
    private String clientEmail;

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
}
