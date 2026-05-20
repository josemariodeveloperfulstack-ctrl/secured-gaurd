package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockMovementChartDTO {
    private String label; // ex: "01/05" ou "Maio"
    private Long entries;
    private Long exits;
}
