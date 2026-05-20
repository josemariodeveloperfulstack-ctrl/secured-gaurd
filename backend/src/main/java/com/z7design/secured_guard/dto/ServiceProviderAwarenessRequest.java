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
public class ServiceProviderAwarenessRequest {
    private UUID companyId;

    /** ID do funcionário (opcional). Quando informado, persiste o PDF gerado. */
    private UUID employeeId;

    // Dados do Prestador
    private String providerName; // Nome da empresa ou pessoa
    private String providerCnpjCpf;
    private String representativeName; // Se for empresa

    // Dados do Serviço
    private String serviceDescription;
    private String contractNumber;

    // Dados Gerais
    private String city;
    private LocalDate documentDate;
}
