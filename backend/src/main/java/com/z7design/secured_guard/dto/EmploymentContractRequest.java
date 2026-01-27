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
public class EmploymentContractRequest {
    private UUID companyId;

    // Dados do Funcionário
    private String employeeName;
    private String employeeCpf;
    private String employeeRg;
    private String employeeAddress;
    private String employeeCtps; // Carteira de Trabalho
    private String employeeCtpsSeries;

    // Dados do Contrato
    private String position; // Cargo
    private String department; // Setor
    private BigDecimal salary;
    private LocalDate admissionDate;
    private String workHoursDescription; // Ex: "44 horas semanais"
    private String workSchedule; // Ex: "08:00 às 18:00 com 1h de intervalo"

    private String city; // Cidade para data
    private LocalDate contractDate; // Data do contrato
}
