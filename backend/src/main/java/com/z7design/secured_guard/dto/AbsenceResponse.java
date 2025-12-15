package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.Absence;
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
public class AbsenceResponse {
    private UUID id;
    private SimpleEmployee employee;
    private LocalDate absenceDate;
    private Absence.AbsenceType absenceType;
    private String reason;
    private Integer medicalCertificateDays;
    private String documentUrl;
    private Absence.AbsenceStatus status;
    private Boolean isJustified;
    private SimpleUser approvedBy;
    private LocalDateTime approvalDate;
    private SimpleEmployee coverageEmployee;
    private String coverageNotes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimpleEmployee {
        private UUID id;
        private String name;
        private String registrationNumber;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimpleUser {
        private UUID id;
        private String name;
    }

    public static AbsenceResponse fromEntity(Absence absence) {
        return AbsenceResponse.builder()
                .id(absence.getId())
                .employee(absence.getEmployee() != null ? SimpleEmployee.builder()
                        .id(absence.getEmployee().getId())
                        .name(absence.getEmployee().getName())
                        .registrationNumber(absence.getEmployee().getRegistrationNumber())
                        .build() : null)
                .absenceDate(absence.getAbsenceDate())
                .absenceType(absence.getAbsenceType())
                .reason(absence.getReason())
                .medicalCertificateDays(absence.getMedicalCertificateDays())
                .documentUrl(absence.getDocumentUrl())
                .status(absence.getStatus())
                .isJustified(absence.getIsJustified())
                .approvedBy(absence.getApprovedBy() != null ? SimpleUser.builder()
                        .id(absence.getApprovedBy().getId())
                        .name(absence.getApprovedBy().getName())
                        .build() : null)
                .approvalDate(absence.getApprovalDate())
                .coverageEmployee(absence.getCoverageEmployee() != null ? SimpleEmployee.builder()
                        .id(absence.getCoverageEmployee().getId())
                        .name(absence.getCoverageEmployee().getName())
                        .registrationNumber(absence.getCoverageEmployee().getRegistrationNumber())
                        .build() : null)
                .coverageNotes(absence.getCoverageNotes())
                .createdAt(absence.getCreatedAt())
                .updatedAt(absence.getUpdatedAt())
                .build();
    }
}


















