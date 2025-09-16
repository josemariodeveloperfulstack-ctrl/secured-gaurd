package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.ScheduleStatus;
import com.z7design.secured_guard.model.enums.Shift;
import lombok.Data;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class ScheduleDTO {
    private UUID id;
    @NotNull(message = "Schedule date is required")
    private LocalDate scheduleDate;
    @NotNull(message = "Shift is required")
    private Shift shift;
    @NotNull(message = "Location ID is required")
    private UUID locationId;
    private ScheduleStatus status;
    private UUID routeId;
    private UUID patrolId;
    private String observations;
} 