package com.z7design.secured_guard.dto;

import lombok.Data;
import java.util.Map;

@Data
public class ActivityStatsDTO {
    private Long totalActivities;
    private Long uniqueUsers;
    private Long successCount;
    private Long errorCount;
    private Long warningCount;
    private Map<String, Long> activitiesByModule;
    private Map<String, Long> activitiesByAction;
    private Map<String, Long> activitiesByUser;
    private Double averageExecutionTime;
}
