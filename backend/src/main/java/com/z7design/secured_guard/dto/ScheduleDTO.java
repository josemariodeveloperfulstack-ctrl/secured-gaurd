package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.ScheduleStatus;
import com.z7design.secured_guard.model.enums.Shift;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleDTO {
    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private String employeeDocument;
    private LocalDate scheduleDate;
    private Shift shift;
    private UUID locationId;
    private String locationName;
    private UUID workPostId;
    private String workPostName;
    private String workPostCode;
    private UUID clientId;
    private String clientName;
    private ScheduleStatus status;
    private UUID routeId;
    private UUID patrolId;
    private String observations;
    private boolean isMonitoria;
    private boolean isHoraExtra;
    private String sigla;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}