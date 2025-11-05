// src/main/java/com/z7design/secured_guard/model/Visit.java
package com.z7design.secured_guard.model;

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
import java.util.List;
import java.util.UUID;

/**
 * Entidade para controle de visitas dos supervisores aos setores/unidades
 * Mapeia a tabela 'visits' criada pela V200
 */
@Entity
@Table(name = "visits")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Visit {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "visit_date", nullable = false)
    private LocalDate visitDate;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supervisor_id", nullable = false)
    private Employee supervisor;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_id")
    private Unit unit;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_post_id")
    private WorkPost workPost;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id")
    private Client client;
    
    @Column(name = "visit_time")
    private java.time.LocalTime visitTime;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VisitStatus status;
    
    @Column(columnDefinition = "TEXT")
    private String observations;
    
    @Column(name = "arrival_time")
    private LocalDateTime arrivalTime;
    
    @Column(name = "departure_time")
    private LocalDateTime departureTime;
    
    @Column(name = "security_check")
    @Builder.Default
    private Boolean securityCheck = false;
    
    @Column(name = "equipment_check")
    @Builder.Default
    private Boolean equipmentCheck = false;
    
    @Column(name = "staff_check")
    @Builder.Default
    private Boolean staffCheck = false;
    
    @Column(name = "procedure_check")
    @Builder.Default
    private Boolean procedureCheck = false;
    
    @Column(name = "present_employees", columnDefinition = "TEXT")
    private String presentEmployeesJson;
    
    @Column(name = "attached_files", columnDefinition = "TEXT")
    private String attachedFilesJson;
    
    @Column(name = "photos", columnDefinition = "TEXT")
    private String photosJson;
    
    @Transient
    private List<UUID> presentEmployees;
    
    @Transient
    private List<String> attachedFiles;
    
    @Transient
    private List<String> photos;
    
    @Column(name = "latitude")
    private Double latitude;
    
    @Column(name = "longitude")
    private Double longitude;
    
    @Column(name = "location_address")
    private String locationAddress;
    
    @Column(name = "qr_code_scanned")
    private String qrCodeScanned;
    
    @Column(name = "qr_code_verified")
    @Builder.Default
    private Boolean qrCodeVerified = false;
    
    @Column(name = "route_order")
    private Integer routeOrder;
    
    @Column(name = "estimated_duration_minutes")
    private Integer estimatedDurationMinutes;
    
    @Column(name = "travel_time_to_next_minutes")
    private Integer travelTimeToNextMinutes;
    
    @Column(name = "travel_distance_to_next_km")
    private Double travelDistanceToNextKm;
    
    @Column(name = "priority_level")
    private Integer priorityLevel;
    
    @Column(name = "preferred_time_start")
    private java.time.LocalTime preferredTimeStart;
    
    @Column(name = "preferred_time_end")
    private java.time.LocalTime preferredTimeEnd;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "visit_schedule_id")
    private VisitSchedule visitSchedule;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
