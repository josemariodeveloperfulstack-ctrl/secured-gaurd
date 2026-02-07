package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractDashboardStatsDTO {

    private long activeCount;
    private long expiringCount;
    private long suspendedCount;
    private BigDecimal mrr;
    private Map<String, Long> byType;
    private Map<String, Long> byClient;
    private long amendmentsThisMonth;
}
