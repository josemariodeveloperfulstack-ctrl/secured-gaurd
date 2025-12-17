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
        UUID trainingId,
        String trainingName,
        Integer renewalPeriodMonths,
        UUID workPostId,
        String workPostName,
        String certificationNumber,
        LocalDate issueDate,
        LocalDate expirationDate,
        CertificationStatus status,
        String documentUrl
) {
    public static EmployeeCertificationResponse fromEntity(EmployeeCertification certification) {
        if (certification == null) {
            return null;
        }
        
        try {
            return EmployeeCertificationResponse.builder()
                    .id(certification.getId())
                    .employeeId(certification.getEmployee() != null ? certification.getEmployee().getId() : null)
                    .employeeName(certification.getEmployee() != null ? certification.getEmployee().getName() : null)
                    .employeeDocument(certification.getEmployee() != null ? certification.getEmployee().getDocument() : null)
                    .trainingId(certification.getTraining() != null ? certification.getTraining().getId() : null)
                    .trainingName(certification.getTraining() != null ? certification.getTraining().getName() : null)
                    .renewalPeriodMonths(certification.getTraining() != null ? certification.getTraining().getRenewalPeriodMonths() : null)
                    .workPostId(certification.getWorkPost() != null ? certification.getWorkPost().getId() : null)
                    .workPostName(certification.getWorkPost() != null ? certification.getWorkPost().getName() : null)
                    .certificationNumber(certification.getCertificationNumber())
                    .issueDate(certification.getIssueDate())
                    .expirationDate(certification.getExpirationDate())
                    .status(certification.getStatus())
                    .documentUrl(certification.getDocumentUrl())
                    .build();
        } catch (Exception e) {
            // Log do erro e retornar null será filtrado no controller
            throw new RuntimeException("Erro ao converter EmployeeCertification para DTO: " + e.getMessage(), e);
        }
    }
}

