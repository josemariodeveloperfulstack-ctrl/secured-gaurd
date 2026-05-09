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
public class StockDashboardDTO {
    private Long totalItems;
    private Long lowStockCount;
    private Long outOfStockCount;
    private Long normalStockCount;
    private BigDecimal totalValue;
    
    private List<StockMovementChartDTO> movementsChart;
    private Map<String, Long> categoryDistribution;
    private List<StockRequisitionListItemDTO> recentRequisitions;
    
    // Novas métricas solicitadas
    private Long generatedRequisitionsCount;
    private Long consolidatedRequisitionsCount;
    private Map<String, Long> stockStatusDistribution;
}
