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

    /**
     * ID do funcionário ao qual o contrato se refere. Quando informado, o PDF
     * gerado é persistido em {@code documentos_gerados} e fica disponível para
     * download posterior pelo RH e pelo próprio colaborador.
     */
    private UUID employeeId;

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

    /** Opcional; no PDF o local de assinatura prioriza a cidade cadastrada na empresa (não use rua aqui). */
    private String city;
    private LocalDate contractDate; // Data do contrato

    /**
     * Tipo de contrato no PDF: {@code STANDARD} (cláusulas resumidas CLT), {@code EXPERIENCE}
     * (texto integral + LGPD + termo de prorrogação) ou {@code INDEFINITE} (texto integral por prazo
     * indeterminado, sem termo de experiência/prorrogação — várias páginas).
     */
    private String contractKind;

    /** Dias do período de experiência: 30, 45, 60 ou 90 (usado quando contractKind = EXPERIENCE). */
    private Integer experienceDurationDays;

    /** Salário por extenso (ex.: cadastro do funcionário). Opcional; se vazio, usa texto orientativo no PDF. */
    private String salaryInWords;

    // Novos campos para enriquecer o PDF
    private String nationality;
    private String maritalStatus;
    private String pis;
}
