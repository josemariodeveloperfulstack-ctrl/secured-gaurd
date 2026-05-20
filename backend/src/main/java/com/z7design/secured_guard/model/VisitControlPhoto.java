package com.z7design.secured_guard.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.z7design.secured_guard.model.enums.VisitPhotoType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Foto anexada a uma visita de supervisor — múltiplas fotos por visita.
 * Categorizadas por {@link VisitPhotoType} para facilitar UI e auditoria.
 */
@Entity
@Table(name = "visit_control_photos")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VisitControlPhoto {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visit_control_id", nullable = false)
    @JsonIgnore
    private VisitControl visitControl;

    @Column(name = "file_url", nullable = false, length = 500)
    private String fileUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "photo_type", nullable = false, length = 32)
    private VisitPhotoType photoType = VisitPhotoType.GENERAL;

    @Column(length = 500)
    private String caption;

    @Column(name = "taken_at", nullable = false)
    private LocalDateTime takenAt = LocalDateTime.now();

    @Column(name = "uploaded_by")
    private UUID uploadedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
