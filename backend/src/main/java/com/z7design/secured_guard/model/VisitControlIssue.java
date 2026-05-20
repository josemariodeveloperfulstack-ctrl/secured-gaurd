package com.z7design.secured_guard.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.z7design.secured_guard.model.enums.VisitIssueCategory;
import com.z7design.secured_guard.model.enums.VisitIssueSeverity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Problema / dificuldade relatado pelo funcionário alocado durante a visita.
 * Permite ao Gestor Operacional identificar gargalos recorrentes por posto.
 */
@Entity
@Table(name = "visit_control_issues")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VisitControlIssue {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visit_control_id", nullable = false)
    @JsonIgnore
    private VisitControl visitControl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private VisitIssueCategory category = VisitIssueCategory.OTHER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private VisitIssueSeverity severity = VisitIssueSeverity.MEDIUM;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "reported_at", nullable = false)
    private LocalDateTime reportedAt = LocalDateTime.now();

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
