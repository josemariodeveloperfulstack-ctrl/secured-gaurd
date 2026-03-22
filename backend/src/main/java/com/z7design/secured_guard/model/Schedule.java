package com.z7design.secured_guard.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.z7design.secured_guard.model.enums.ScheduleStatus;
import com.z7design.secured_guard.model.enums.Shift;

@Entity
@Table(name = "schedules")
public class Schedule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * Funcionário da escala. {@link NotFoundAction#IGNORE}: se o funcionário foi excluído
     * mas a linha em {@code schedules} permaneceu (órfã), o campo fica null em vez de
     * falhar o {@code JOIN FETCH} / {@code findAll}.
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    @NotFound(action = NotFoundAction.IGNORE)
    @JsonIgnoreProperties({
            "schedules", "hibernateLazyInitializer", "handler",
            "documents", "benefits", "dependents", "timeRecords",
            "bankHours", "payrollItems", "payrolls", "epis",
            "occurrences", "user", "position", "unit", "company"
    })
    private Employee employee;

    @NotNull(message = "Schedule date is required")
    @Column(nullable = false)
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate scheduleDate;

    @NotNull(message = "Shift is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Shift shift;

    @NotNull(message = "Location is required")
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "location_id", nullable = false)
    @NotFound(action = NotFoundAction.IGNORE)
    @JsonIgnoreProperties({ "schedules", "hibernateLazyInitializer", "handler", "unit", "employees", "routes",
            "client" })
    private Location location;

    @ManyToOne
    @JoinColumn(name = "work_post_id")
    @NotFound(action = NotFoundAction.IGNORE)
    @JsonIgnoreProperties({ "schedules", "hibernateLazyInitializer", "handler" })
    private WorkPost workPost;

    @NotNull(message = "Schedule status is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ScheduleStatus status;

    @ManyToOne
    @JoinColumn(name = "route_id")
    private Route route;

    @ManyToOne
    @JoinColumn(name = "patrol_id")
    private Patrol patrol;

    @Size(max = 500, message = "Observations cannot exceed 500 characters")
    @Column(length = 500)
    private String observations;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public Schedule() {
    }

    // Manual Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Employee getEmployee() {
        return employee;
    }

    public void setEmployee(Employee employee) {
        this.employee = employee;
    }

    public LocalDate getScheduleDate() {
        return scheduleDate;
    }

    public void setScheduleDate(LocalDate scheduleDate) {
        this.scheduleDate = scheduleDate;
    }

    public Shift getShift() {
        return shift;
    }

    public void setShift(Shift shift) {
        this.shift = shift;
    }

    public Location getLocation() {
        return location;
    }

    public void setLocation(Location location) {
        this.location = location;
    }

    public WorkPost getWorkPost() {
        return workPost;
    }

    public void setWorkPost(WorkPost workPost) {
        this.workPost = workPost;
    }

    public ScheduleStatus getStatus() {
        return status;
    }

    public void setStatus(ScheduleStatus status) {
        this.status = status;
    }

    public Route getRoute() {
        return route;
    }

    public void setRoute(Route route) {
        this.route = route;
    }

    public Patrol getPatrol() {
        return patrol;
    }

    public void setPatrol(Patrol patrol) {
        this.patrol = patrol;
    }

    public String getObservations() {
        return observations;
    }

    public void setObservations(String observations) {
        this.observations = observations;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    // Manual Builder Pattern
    public static ScheduleBuilder builder() {
        return new ScheduleBuilder();
    }

    public static class ScheduleBuilder {
        private final Schedule schedule = new Schedule();

        public ScheduleBuilder id(UUID id) {
            schedule.setId(id);
            return this;
        }

        public ScheduleBuilder employee(Employee employee) {
            schedule.setEmployee(employee);
            return this;
        }

        public ScheduleBuilder scheduleDate(LocalDate scheduleDate) {
            schedule.setScheduleDate(scheduleDate);
            return this;
        }

        public ScheduleBuilder shift(Shift shift) {
            schedule.setShift(shift);
            return this;
        }

        public ScheduleBuilder location(Location location) {
            schedule.setLocation(location);
            return this;
        }

        public ScheduleBuilder workPost(WorkPost workPost) {
            schedule.setWorkPost(workPost);
            return this;
        }

        public ScheduleBuilder status(ScheduleStatus status) {
            schedule.setStatus(status);
            return this;
        }

        public ScheduleBuilder route(Route route) {
            schedule.setRoute(route);
            return this;
        }

        public ScheduleBuilder patrol(Patrol patrol) {
            schedule.setPatrol(patrol);
            return this;
        }

        public ScheduleBuilder observations(String observations) {
            schedule.setObservations(observations);
            return this;
        }

        public ScheduleBuilder createdAt(LocalDateTime createdAt) {
            schedule.setCreatedAt(createdAt);
            return this;
        }

        public ScheduleBuilder updatedAt(LocalDateTime updatedAt) {
            schedule.setUpdatedAt(updatedAt);
            return this;
        }

        public Schedule build() {
            return schedule;
        }
    }
}