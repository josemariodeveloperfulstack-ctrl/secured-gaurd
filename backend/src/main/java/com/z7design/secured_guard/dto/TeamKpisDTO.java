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
public class TeamKpisDTO {

    private BigDecimal receitaTotal;
    private long totalLeads;
    private long totalPropostas;
    private long propostasAprovadas;
    private long contratosGanhos;
    private long contratosAtivos;
    private double taxaConversaoGeral;
    private BigDecimal ticketMedioGeral;

    // Por vendedor
    private Map<String, Long> leadsPorVendedor;
    private Map<String, Double> conversaoPorVendedor;
    private Map<String, BigDecimal> receitaPorVendedor;

    // Pipeline
    private Map<String, Long> pipelinePorEtapa;

    // Temporal
    private Map<String, BigDecimal> receitaPorMes;

    private String periodo;
}
