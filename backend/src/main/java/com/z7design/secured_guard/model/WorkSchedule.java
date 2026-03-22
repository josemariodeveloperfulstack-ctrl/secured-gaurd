package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "work_schedules")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkSchedule {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id", nullable = false)
    private WorkPost location;
    
    @Column(name = "schedule_date", nullable = false)
    private LocalDate scheduleDate;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "shift", nullable = false)
    private ShiftType shift;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ScheduleStatus status;
    
    @Column(name = "observations", columnDefinition = "TEXT")
    private String observations;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    @Column(name = "sigla", length = 5)
    private String sigla; // PL, MT, HE, FT, AT, FE, CF, RM
    
    @Column(name = "remanejamento_id")
    private UUID remanejamentoId;
    
    @Column(name = "is_monitoria")
    @Builder.Default
    private Boolean isMonitoria = false;
    
    @Column(name = "is_hora_extra")
    @Builder.Default
    private Boolean isHoraExtra = false;
    
    @Column(name = "coverage_schedule_id")
    private UUID coverageScheduleId;
    
    @Column(name = "start_time", length = 5)
    private String startTime; // HH:mm
    
    @Column(name = "end_time", length = 5)
    private String endTime; // HH:mm
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    public enum ShiftType {
        DAY, NIGHT, MIXED
    }
    
    public enum ScheduleStatus {
        PENDING, CONFIRMED, CANCELLED, COMPLETED
    }
}
