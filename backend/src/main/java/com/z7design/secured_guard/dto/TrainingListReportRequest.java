package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainingListReportRequest {
    private UUID companyId;
    private List<TrainingRowDTO> rows;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrainingRowDTO {
        private String employeeName;
        private String employeeCpf;
        private String employeePosition;
        private String sector;
        private String trainingName;
        private String expirationDate;
        private String status;
    }
}
