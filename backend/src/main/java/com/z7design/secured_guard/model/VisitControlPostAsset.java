package com.z7design.secured_guard.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.z7design.secured_guard.model.enums.VisitAssetStatus;
import com.z7design.secured_guard.model.enums.VisitAssetType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Inventário rápido de equipamentos / veículos / outros ativos
 * disponíveis no posto durante a visita.
 *
 * Não é FK rígida com {@code equipments} / {@code vehicles} (pode ser ad-hoc).
 * Quando rastreável, {@link #referenceId} aponta para o registro original.
 */
@Entity
@Table(name = "visit_control_post_assets")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VisitControlPostAsset {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visit_control_id", nullable = false)
    @JsonIgnore
    private VisitControl visitControl;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_type", nullable = false, length = 16)
    private VisitAssetType assetType;

    @Column(name = "reference_id")
    private UUID referenceId;

    @Column(nullable = false, length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private VisitAssetStatus status = VisitAssetStatus.PRESENT;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
