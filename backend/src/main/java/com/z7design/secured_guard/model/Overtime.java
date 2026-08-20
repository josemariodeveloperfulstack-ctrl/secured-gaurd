package com.z7design.secured_guard.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.z7design.secured_guard.model.enums.OvertimeStatus;
import com.z7design.secured_guard.model.enums.OvertimeType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "overtime")
public class Overtime {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @NotNull(message = "Employee is required")
    @ManyToOne
    @JoinColumn(name = "employee_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Employee employee;
    
    @NotNull(message = "Overtime date is required")
    @Column(name = "overtime_date", nullable = false)
    private LocalDate overtimeDate;
    
    @NotNull(message = "Start time is required")
    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;
    
    @NotNull(message = "End time is required")
    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;
    
    @PositiveOrZero(message = "Total hours must be a positive value or zero")
    @Column(name = "total_hours")
    private Double totalHours;
    
    @NotNull(message = "Overtime type is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OvertimeType type;
    
    @NotBlank(message = "Reason is required")
    @Size(min = 10, max = 500, message = "Reason must be between 10 and 500 characters")
    @Column(nullable = false)
    private String reason;
    
    @Size(max = 1000, message = "Justification cannot exceed 1000 characters")
    @Column
    private String justification;
    
    @NotNull(message = "Overtime status is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OvertimeStatus status;
    
    @ManyToOne
    @JoinColumn(name = "approved_by")
    private User approvedBy;
    
    @Column(name = "approval_date")
    private LocalDateTime approvalDate;

    @ManyToOne(fetch = jakarta.persistence.FetchType.LAZY)
    @JoinColumn(name = "work_post_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private WorkPost workPost;

    @ManyToOne(fetch = jakarta.persistence.FetchType.LAZY)
    @JoinColumn(name = "absence_id")
    @JsonIgnore
    private Absence absence;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Employee getEmployee() { return employee; }
    public void setEmployee(Employee employee) { this.employee = employee; }

    public LocalDate getOvertimeDate() { return overtimeDate; }
    public void setOvertimeDate(LocalDate overtimeDate) { this.overtimeDate = overtimeDate; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public Double getTotalHours() { return totalHours; }
    public void setTotalHours(Double totalHours) { this.totalHours = totalHours; }

    public OvertimeType getType() { return type; }
    public void setType(OvertimeType type) { this.type = type; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getJustification() { return justification; }
    public void setJustification(String justification) { this.justification = justification; }

    public OvertimeStatus getStatus() { return status; }
    public void setStatus(OvertimeStatus status) { this.status = status; }

    public User getApprovedBy() { return approvedBy; }
    public void setApprovedBy(User approvedBy) { this.approvedBy = approvedBy; }

    public LocalDateTime getApprovalDate() { return approvalDate; }
    public void setApprovalDate(LocalDateTime approvalDate) { this.approvalDate = approvalDate; }

    public WorkPost getWorkPost() { return workPost; }
    public void setWorkPost(WorkPost workPost) { this.workPost = workPost; }

    public Absence getAbsence() { return absence; }
    public void setAbsence(Absence absence) { this.absence = absence; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
} 