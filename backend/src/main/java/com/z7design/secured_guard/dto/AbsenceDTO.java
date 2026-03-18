package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.Absence;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AbsenceDTO {
    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private Absence.AbsenceType absenceType;
    private LocalDate absenceDate;
    private Absence.AbsenceStatus status;
    private String reason;
    private String documentUrl;
    private Integer medicalCertificateDays;
    private Boolean isJustified;
    private UUID approvedById;
    private String approvedByName;
    private LocalDateTime approvalDate;
    private UUID coverageEmployeeId;
    private String coverageEmployeeName;
    private UUID coverageWorkPostId;
    private String coverageWorkPostName;
    private Boolean coverageIsOvertime;
    private String coverageNotes;
    private BigDecimal justifiedHours;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static AbsenceDTO fromEntity(Absence absence) {
        return AbsenceDTO.builder()
                .id(absence.getId())
                .employeeId(absence.getEmployee().getId())
                .employeeName(absence.getEmployee().getName())
                .absenceType(absence.getAbsenceType())
                .absenceDate(absence.getAbsenceDate())
                .status(absence.getStatus())
                .reason(absence.getReason())
                .documentUrl(absence.getDocumentUrl())
                .medicalCertificateDays(absence.getMedicalCertificateDays())
                .isJustified(absence.getIsJustified())
                .approvedById(absence.getApprovedBy() != null ? absence.getApprovedBy().getId() : null)
                .approvedByName(absence.getApprovedBy() != null ? absence.getApprovedBy().getName() : null)
                .approvalDate(absence.getApprovalDate())
                .coverageEmployeeId(absence.getCoverageEmployee() != null ? absence.getCoverageEmployee().getId() : null)
                .coverageEmployeeName(absence.getCoverageEmployee() != null ? absence.getCoverageEmployee().getName() : null)
                .coverageWorkPostId(absence.getCoverageWorkPost() != null ? absence.getCoverageWorkPost().getId() : null)
                .coverageWorkPostName(absence.getCoverageWorkPost() != null ? absence.getCoverageWorkPost().getName() : null)
                .coverageIsOvertime(absence.getCoverageIsOvertime())
                .coverageNotes(absence.getCoverageNotes())
                .justifiedHours(absence.getJustifiedHours())
                .createdAt(absence.getCreatedAt())
                .updatedAt(absence.getUpdatedAt())
                .build();
    }

    public Absence toEntity() {
        return Absence.builder()
                .id(this.id)
                .absenceType(this.absenceType)
                .absenceDate(this.absenceDate)
                .status(this.status != null ? this.status : Absence.AbsenceStatus.PENDING)
                .reason(this.reason)
                .documentUrl(this.documentUrl)
                .medicalCertificateDays(this.medicalCertificateDays)
                .isJustified(this.isJustified != null ? this.isJustified : false)
                .approvalDate(this.approvalDate)
                .coverageIsOvertime(this.coverageIsOvertime != null ? this.coverageIsOvertime : false)
                .coverageNotes(this.coverageNotes)
                .justifiedHours(this.justifiedHours)
                .build();
    }
}
