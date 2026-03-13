package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.EmployeeChangeCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeChangeHistoryDTO {
    private UUID id;
    private UUID employeeId;
    private Instant changedAt;
    private UUID changedByUserId;
    private String changedByUserName;
    private String category;
    private String categoryLabel;
    private String fieldName;
    private String fieldLabel;
    private String oldValue;
    private String newValue;
    private String reason;
}
