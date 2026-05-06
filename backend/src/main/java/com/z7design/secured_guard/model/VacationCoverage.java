package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Modelo para gerenciar coberturas de férias
 * Implementa o que está sendo feito manualmente nos quadros
 */
@Entity
@Table(name = "vacation_coverages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VacationCoverage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "vacation_id", nullable = false)
    private Vacation vacation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "substitute_employee_id", nullable = false)
    @NotFound(action = NotFoundAction.IGNORE)
    private Employee substituteEmployee;

    @Column(name = "coverage_start_date", nullable = false)
    private LocalDate coverageStartDate;

    @Column(name = "coverage_end_date", nullable = false)
    private LocalDate coverageEndDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "location_id")
    private WorkPost location;

    @Enumerated(EnumType.STRING)
    @Column(name = "shift", nullable = false)
    private ShiftType shift;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private CoverageStatus status;

    @Column(name = "observations", columnDefinition = "TEXT")
    private String observations;

    @Column(name = "is_confirmed", nullable = false)
    @Builder.Default
    private Boolean isConfirmed = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "confirmed_by")
    private User confirmedBy;

    @Column(name = "confirmation_date")
    private LocalDateTime confirmationDate;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum ShiftType {
        DAY, NIGHT, MIXED, NOTURNO
    }

    public enum CoverageStatus {
        PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_COVERAGE
    }
}
