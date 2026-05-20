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
public class EquipmentResponsibilityRequest {
    private UUID companyId;

    /** ID do funcionário (opcional). Quando informado, persiste o PDF gerado. */
    private UUID employeeId;

    private String reportTitle; // Título customizado (ex: TERMO DE RESPONSABILIDADE APARELHO CELULAR)

    // Dados do Funcionário
    private String employeeName;
    private String employeeCpf;
    private String employeePosition; // Cargo

    // Equipamentos
    private List<EquipmentItem> equipments;

    // Dados Gerais
    private String city;
    private LocalDate documentDate;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EquipmentItem {
        private String name; // Ex: Notebook
        private String description; // Ex: Dell Latitude 5420
        private String identifier; // Ex: Serial Number
        private String state; // Ex: Novo, Usado, Bom estado
        private Double value; // Valor estimado
    }
}
