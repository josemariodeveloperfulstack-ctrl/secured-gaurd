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
}
