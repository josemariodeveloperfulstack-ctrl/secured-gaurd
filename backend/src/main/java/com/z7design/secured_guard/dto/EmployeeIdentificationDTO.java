package com.z7design.secured_guard.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.z7design.secured_guard.model.Employee;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Identificação do funcionário retornada após escaneamento de QR Code OU
 * fallback manual (CPF/Matrícula) pelo Supervisor durante uma visita.
 *
 * Carrega apenas os campos necessários para o supervisor confirmar visualmente
 * que tem o funcionário certo na frente dele. Não expõe dados sensíveis (salário,
 * dependentes, contratos).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeIdentificationDTO {

    private UUID id;
    private String name;
    private String cpf;
    private String registrationNumber;
    private String email;
    private String phone;

    private String positionName;
    private String departmentName;
    private String workPostName;
    private UUID workPostId;
    private String unitName;
    private String companySigla;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate hireDate;

    private String status;

    /** Indica se o funcionário tem algum treinamento pendente (calculado por outro service quando necessário). */
    private Boolean hasPendingTraining;

    /** Origem da identificação: QR_TOKEN, CPF, MATRICULA. Auxilia auditoria. */
    private String matchedBy;

    public static EmployeeIdentificationDTO from(Employee employee, String matchedBy) {
        if (employee == null) {
            return null;
        }
        return EmployeeIdentificationDTO.builder()
            .id(employee.getId())
            .name(employee.getName())
            .cpf(employee.getCpf())
            .registrationNumber(employee.getRegistrationNumber())
            .email(employee.getEmail())
            .phone(employee.getPhone())
            .positionName(employee.getPosition() != null ? employee.getPosition().getName() : null)
            .departmentName(employee.getDepartment() != null ? employee.getDepartment().getName() : null)
            .workPostName(employee.getWorkPost() != null ? employee.getWorkPost().getName() : null)
            .workPostId(employee.getWorkPost() != null ? employee.getWorkPost().getId() : null)
            .unitName(employee.getUnit() != null ? employee.getUnit().getName() : null)
            .companySigla(employee.getCompany() != null ? employee.getCompany().getSigla() : null)
            .hireDate(employee.getHireDate())
            .status(employee.getStatus() != null ? employee.getStatus().name() : null)
            .matchedBy(matchedBy)
            .build();
    }
}
