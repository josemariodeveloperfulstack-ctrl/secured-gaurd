package com.z7design.secured_guard.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeEmploymentPeriodDTO {
    private UUID id;
    private UUID employeeId;
    private UUID companyId;
    private String companyName;
    private UUID unitId;
    private String unitName;
    private UUID positionId;
    private String positionName;
    private UUID departmentId;
    private String departmentName;
    private UUID workPostId;
    private String workPostName;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate hireDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate terminationDate;

    private String terminationReason;
    private String admissionType;
    private String admissionTypeLabel;
    private String status;
    private BigDecimal salario;
    private String registrationNumber;
    private String notes;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
}
