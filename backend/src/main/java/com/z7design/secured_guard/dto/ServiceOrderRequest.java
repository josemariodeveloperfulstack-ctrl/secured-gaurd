package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceOrderRequest {
    private UUID companyId;

    /** ID do funcionário (opcional). Quando informado, persiste o PDF gerado. */
    private UUID employeeId;

    // Dados do Funcionário
    private String employeeName;
    private String employeeCpf;
    private String employeeRg;
    private String employeePosition; // Função
    private String employeeCtps;
    private LocalDate admissionDate;

    // Dados da OS
    private String revision; // Revisão do documento
    private LocalDate elaborationDate;
    private String sector; // Setor de trabalho
    private String descriptionOfActivities; // Descrição sumária das atividades

    // Listas
    private List<String> risks; // Agentes de Risco (Ex: Ruído, Poeira)
    private List<String> epiList; // EPIs Recomendados/Obrigatórios
    private List<String> norms; // Normas a serem observadas
    private List<String> internalProcedures; // Procedimentos internos

    // Dados Gerais
    private String city;
    private LocalDate documentDate; // Data da assinatura
}
