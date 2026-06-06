package com.z7design.secured_guard.model;

import com.z7design.secured_guard.model.enums.PostAllocationType;
import com.z7design.secured_guard.model.enums.VisitStatus;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "supervisor_visits")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupervisorVisit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supervisor_id")
    private Employee supervisor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_post_id", nullable = false)
    private WorkPost workPost;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id")
    private Client client;

    /** Funcionário verificado no posto durante a visita (efetivo, remanejado ou cobertura). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checked_employee_id")
    private Employee checkedEmployee;

    /** Vínculo do funcionário verificado com o posto no momento do check-in. */
    @Enumerated(EnumType.STRING)
    @Column(name = "allocation_type")
    private PostAllocationType allocationType;

    @Column(name = "allocation_description")
    private String allocationDescription;

    @Column(nullable = false)
    private LocalDate visitDate;

    @Column(nullable = false)
    private LocalTime visitTime;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String observations;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VisitStatus status;

    @ElementCollection
    @CollectionTable(name = "supervisor_visit_employees", joinColumns = @JoinColumn(name = "visit_id"))
    @Column(name = "employee_id")
    @Builder.Default
    private List<UUID> presentEmployees = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "supervisor_visit_files", joinColumns = @JoinColumn(name = "visit_id"))
    @Column(name = "file_path")
    @Builder.Default
    private List<String> attachedFiles = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "supervisor_visit_photos", joinColumns = @JoinColumn(name = "visit_id"))
    @Column(name = "photo_path")
    @Builder.Default
    private List<String> photos = new ArrayList<>();

    // Geolocalização
    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "location_address")
    private String locationAddress;

    // QR Code
    @Column(name = "qr_code_scanned")
    private String qrCodeScanned;

    @Column(name = "qr_code_verified")
    @Builder.Default
    private Boolean qrCodeVerified = false;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;
}

