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
public class DeclarationRequest {
    private UUID companyId;

    /** ID do funcionário (opcional). Quando informado, persiste o PDF gerado. */
    private UUID employeeId;

    // Dados do Funcionário/Pessoa
    private String personName;
    private String personCpf;
    private String personPosition; // Cargo (opcional)
    private String sector; // Setor / Posto de Trabalho

    // Conteúdo da Declaração
    private String title; // Título da Declaração (Ex: Declaração de Matrícula, Declaração de
                          // Comparecimento)
    private String content; // Texto livre

    // Dados Gerais
    private String city;
    private LocalDate documentDate;
}
