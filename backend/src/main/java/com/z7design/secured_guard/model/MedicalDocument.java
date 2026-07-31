package com.z7design.secured_guard.model;

import com.z7design.secured_guard.model.enums.MedicalDocumentType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "medical_documents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicalDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false, length = 40)
    private MedicalDocumentType documentType;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "days")
    private Integer days;

    @Column(name = "hours", precision = 6, scale = 2)
    private BigDecimal hours;

    @Column(name = "cid_code", length = 20)
    private String cidCode;

    @Column(name = "cid_description", length = 500)
    private String cidDescription;

    @Column(name = "specialty", length = 120)
    private String specialty;

    @Column(name = "crm", length = 40)
    private String crm;

    @Column(name = "doctor_name")
    private String doctorName;

    @Column(name = "document_url", length = 1000)
    private String documentUrl;

    @Column(name = "observations", columnDefinition = "TEXT")
    private String observations;

    @Column(name = "inss_alert", nullable = false)
    @Builder.Default
    private Boolean inssAlert = false;

    @Column(name = "inss_alert_message", length = 1000)
    private String inssAlertMessage;

    @Column(name = "related_days_in_window")
    private Integer relatedDaysInWindow;

    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "ACTIVE";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
