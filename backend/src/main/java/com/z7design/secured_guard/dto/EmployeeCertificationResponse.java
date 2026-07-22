package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.EmployeeCertification;
import com.z7design.secured_guard.model.enums.CertificationStatus;
import lombok.Builder;

import java.time.LocalDate;
import java.util.UUID;

@Builder
public record EmployeeCertificationResponse(
        UUID id,
        UUID employeeId,
        String employeeName,
        String employeeDocument,
        String employeePosition,
        String employeeDepartment,
        LocalDate employeeHireDate,
        UUID trainingId,
        String trainingName,
        Integer renewalPeriodMonths,
        UUID workPostId,
        String workPostName,
        String certificationNumber,
        LocalDate issueDate,
        LocalDate expirationDate,
        CertificationStatus status,
        String documentUrl) {
    public static EmployeeCertificationResponse fromEntity(EmployeeCertification certification) {
        if (certification == null) {
            return null;
        }

        String employeeName = null;
        String employeeDocument = null;
        String positionName = null;
        String departmentName = null;
        LocalDate employeeHireDate = null;

        var employee = certification.getEmployee();
        if (employee != null) {
            employeeName = employee.getName();
            employeeDocument = employee.getDocument() != null && !employee.getDocument().isBlank()
                    ? employee.getDocument()
                    : employee.getCpf();
            employeeHireDate = employee.getHireDate();

            // Tentar obter o cargo (Position)
            var position = employee.getPosition();
            if (position != null) {
                try {
                    positionName = position.getName();
                } catch (Exception e) {
                    System.err.println("⚠️ Erro ao acessar nome do cargo para: " + employeeName);
                }
            }

            // Tentar obter o setor (WorkPost/Unit)
            // 1. Prioridade para o WorkPost da certificação (onde o treinamento ocorreu ou se aplica)
            if (certification.getWorkPost() != null) {
                try {
                    departmentName = certification.getWorkPost().getName();
                } catch (Exception e) {
                }
            }

            // 2. Fallback para o WorkPost atual do funcionário
            if (departmentName == null || departmentName.isEmpty()) {
                if (employee.getWorkPost() != null) {
                    try {
                        departmentName = employee.getWorkPost().getName();
                    } catch (Exception e) {
                    }
                }
            }

            // 3. Fallback para a Unidade do funcionário
            if (departmentName == null || departmentName.isEmpty()) {
                if (employee.getUnit() != null) {
                    try {
                        departmentName = employee.getUnit().getName();
                    } catch (Exception e) {
                    }
                }
            }
        }

        UUID trainingId = null;
        String trainingName = null;
        Integer renewalPeriodMonths = null;
        try {
            var training = certification.getTraining();
            if (training != null) {
                trainingId = training.getId();
                trainingName = training.getName();
                renewalPeriodMonths = training.getRenewalPeriodMonths();
            }
        } catch (Exception e) {
            System.err.println("⚠️ Erro ao acessar dados do treinamento para certificação: " + certification.getId());
        }

        UUID workPostId = null;
        String workPostName = null;
        try {
            var workPost = certification.getWorkPost();
            if (workPost != null) {
                workPostId = workPost.getId();
                workPostName = workPost.getName();
            }
        } catch (Exception e) {
            System.err.println("⚠️ Erro ao acessar dados do posto para certificação: " + certification.getId());
        }

        return EmployeeCertificationResponse.builder()
                .id(certification.getId())
                .employeeId(employee != null ? employee.getId() : null)
                .employeeName(employeeName)
                .employeeDocument(employeeDocument)
                .employeePosition(positionName)
                .employeeDepartment(departmentName)
                .employeeHireDate(employeeHireDate)
                .trainingId(trainingId)
                .trainingName(trainingName)
                .renewalPeriodMonths(renewalPeriodMonths)
                .workPostId(workPostId)
                .workPostName(workPostName)
                .certificationNumber(certification.getCertificationNumber())
                .issueDate(certification.getIssueDate())
                .expirationDate(certification.getExpirationDate())
                .status(certification.getStatus())
                .documentUrl(certification.getDocumentUrl())
                .build();
    }
}
