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

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getEmployeeId() { return employeeId; }
    public void setEmployeeId(UUID employeeId) { this.employeeId = employeeId; }

    public String getEmployeeName() { return employeeName; }
    public void setEmployeeName(String employeeName) { this.employeeName = employeeName; }

    public Absence.AbsenceType getAbsenceType() { return absenceType; }
    public void setAbsenceType(Absence.AbsenceType absenceType) { this.absenceType = absenceType; }

    public LocalDate getAbsenceDate() { return absenceDate; }
    public void setAbsenceDate(LocalDate absenceDate) { this.absenceDate = absenceDate; }

    public Absence.AbsenceStatus getStatus() { return status; }
    public void setStatus(Absence.AbsenceStatus status) { this.status = status; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getDocumentUrl() { return documentUrl; }
    public void setDocumentUrl(String documentUrl) { this.documentUrl = documentUrl; }

    public Integer getMedicalCertificateDays() { return medicalCertificateDays; }
    public void setMedicalCertificateDays(Integer medicalCertificateDays) { this.medicalCertificateDays = medicalCertificateDays; }

    public Boolean getIsJustified() { return isJustified; }
    public void setIsJustified(Boolean isJustified) { this.isJustified = isJustified; }

    public UUID getApprovedById() { return approvedById; }
    public void setApprovedById(UUID approvedById) { this.approvedById = approvedById; }

    public String getApprovedByName() { return approvedByName; }
    public void setApprovedByName(String approvedByName) { this.approvedByName = approvedByName; }

    public LocalDateTime getApprovalDate() { return approvalDate; }
    public void setApprovalDate(LocalDateTime approvalDate) { this.approvalDate = approvalDate; }

    public UUID getCoverageEmployeeId() { return coverageEmployeeId; }
    public void setCoverageEmployeeId(UUID coverageEmployeeId) { this.coverageEmployeeId = coverageEmployeeId; }

    public String getCoverageEmployeeName() { return coverageEmployeeName; }
    public void setCoverageEmployeeName(String coverageEmployeeName) { this.coverageEmployeeName = coverageEmployeeName; }

    public UUID getCoverageWorkPostId() { return coverageWorkPostId; }
    public void setCoverageWorkPostId(UUID coverageWorkPostId) { this.coverageWorkPostId = coverageWorkPostId; }

    public String getCoverageWorkPostName() { return coverageWorkPostName; }
    public void setCoverageWorkPostName(String coverageWorkPostName) { this.coverageWorkPostName = coverageWorkPostName; }

    public Boolean getCoverageIsOvertime() { return coverageIsOvertime; }
    public void setCoverageIsOvertime(Boolean coverageIsOvertime) { this.coverageIsOvertime = coverageIsOvertime; }

    public String getCoverageNotes() { return coverageNotes; }
    public void setCoverageNotes(String coverageNotes) { this.coverageNotes = coverageNotes; }

    public BigDecimal getJustifiedHours() { return justifiedHours; }
    public void setJustifiedHours(BigDecimal justifiedHours) { this.justifiedHours = justifiedHours; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
