package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeReportPdfRequest {
    /** ID da empresa para cabeçalho/rodapé (logo, nome, endereço, CNPJ) */
    private UUID companyId;
    /** IDs dos funcionários a incluir no relatório (lista vazia/null = todos) */
    private List<UUID> employeeIds;
}
