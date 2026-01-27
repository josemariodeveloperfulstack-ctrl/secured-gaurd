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

    // Dados do Funcionário/Pessoa
    private String personName;
    private String personCpf;
    private String personPosition; // Cargo (opcional)

    // Conteúdo da Declaração
    private String title; // Título da Declaração (Ex: Declaração de Matrícula, Declaração de
                          // Comparecimento)
    private String content; // Texto livre

    // Dados Gerais
    private String city;
    private LocalDate documentDate;
}
