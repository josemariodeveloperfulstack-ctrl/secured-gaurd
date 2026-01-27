package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DisciplinaryWarningRequest {
    private UUID companyId;

    // Dados do Funcionário
    private String employeeName;
    private String employeeCpf;
    private String employeePosition; // Cargo

    // Dados da Infração
    private String reason; // Motivo da advertência
    private String description; // Descrição detalhada do ocorrido
    private LocalDateTime infractionDate; // Data e hora da infração
    private String infractionLocation; // Local da infração

    // Dados Gerais
    private String city; // Cidade para data
    private LocalDate documentDate; // Data do documento

    // Testemunhas (Opcional)
    private String witness1Name;
    private String witness1Cpf;
    private String witness2Name;
    private String witness2Cpf;
}
