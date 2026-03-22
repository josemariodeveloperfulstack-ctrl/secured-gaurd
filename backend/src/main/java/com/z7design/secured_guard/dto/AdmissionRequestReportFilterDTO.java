package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdmissionRequestReportFilterDTO {
    private String employeeName;
    private String type;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
}
