package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.CertificationStatus;
import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class CertificationStatsResponse {
    private long total;
    private long active;
    private long expired;
    private long pending;
    private long cancelled;
    private long expiringSoon;
    private double totalCost;
    private Map<String, Long> byType;
    private Map<String, Long> byOrganization;
}
