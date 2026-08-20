package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Modelo para gerenciar faltas dos funcionários
 * Implementa o controle manual que está sendo feito nos quadros
 */
@Entity
@Table(name = "absences")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Absence {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;
    
    @Column(name = "absence_date", nullable = false)
    private LocalDate absenceDate;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "absence_type", nullable = false)
    private AbsenceType absenceType;
    
    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;
    
    @Column(name = "medical_certificate_days")
    private Integer medicalCertificateDays;
    
    @Column(name = "document_url")
    private String documentUrl;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private AbsenceStatus status;
    
    @Column(name = "is_justified", nullable = false)
    @Builder.Default
    private Boolean isJustified = false;

    @Column(name = "justified_hours", precision = 4, scale = 2)
    private BigDecimal justifiedHours;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;
    
    @Column(name = "approval_date")
    private LocalDateTime approvalDate;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "coverage_employee_id")
    private Employee coverageEmployee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "coverage_work_post_id")
    private WorkPost coverageWorkPost;

    @Column(name = "coverage_is_overtime", nullable = false)
    @Builder.Default
    private Boolean coverageIsOvertime = false;
    
    @Column(name = "coverage_notes", columnDefinition = "TEXT")
    private String coverageNotes;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    public enum AbsenceType {
        SICK_LEAVE,        // Atestado médico
        PERSONAL_LEAVE,    // Falta pessoal
        UNAUTHORIZED,      // Falta não autorizada
        MEDICAL_APPOINTMENT, // Consulta médica
        FAMILY_EMERGENCY,  // Emergência familiar
        WEDDING,          // Casamento
        OTHER             // Outros
    }
    
    public enum AbsenceStatus {
        PENDING,    // Pendente
        APPROVED,   // Aprovada
        REJECTED,   // Rejeitada
        CANCELLED   // Cancelada
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Employee getEmployee() { return employee; }
    public void setEmployee(Employee employee) { this.employee = employee; }

    public AbsenceType getAbsenceType() { return absenceType; }
    public void setAbsenceType(AbsenceType absenceType) { this.absenceType = absenceType; }

    public LocalDate getAbsenceDate() { return absenceDate; }
    public void setAbsenceDate(LocalDate absenceDate) { this.absenceDate = absenceDate; }

    public AbsenceStatus getStatus() { return status; }
    public void setStatus(AbsenceStatus status) { this.status = status; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getDocumentUrl() { return documentUrl; }
    public void setDocumentUrl(String documentUrl) { this.documentUrl = documentUrl; }

    public Integer getMedicalCertificateDays() { return medicalCertificateDays; }
    public void setMedicalCertificateDays(Integer medicalCertificateDays) { this.medicalCertificateDays = medicalCertificateDays; }

    public Boolean getIsJustified() { return isJustified; }
    public void setIsJustified(Boolean isJustified) { this.isJustified = isJustified; }

    public BigDecimal getJustifiedHours() { return justifiedHours; }
    public void setJustifiedHours(BigDecimal justifiedHours) { this.justifiedHours = justifiedHours; }

    public User getApprovedBy() { return approvedBy; }
    public void setApprovedBy(User approvedBy) { this.approvedBy = approvedBy; }

    public LocalDateTime getApprovalDate() { return approvalDate; }
    public void setApprovalDate(LocalDateTime approvalDate) { this.approvalDate = approvalDate; }

    public Employee getCoverageEmployee() { return coverageEmployee; }
    public void setCoverageEmployee(Employee coverageEmployee) { this.coverageEmployee = coverageEmployee; }

    public WorkPost getCoverageWorkPost() { return coverageWorkPost; }
    public void setCoverageWorkPost(WorkPost coverageWorkPost) { this.coverageWorkPost = coverageWorkPost; }

    public Boolean getCoverageIsOvertime() { return coverageIsOvertime; }
    public void setCoverageIsOvertime(Boolean coverageIsOvertime) { this.coverageIsOvertime = coverageIsOvertime; }

    public String getCoverageNotes() { return coverageNotes; }
    public void setCoverageNotes(String coverageNotes) { this.coverageNotes = coverageNotes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
