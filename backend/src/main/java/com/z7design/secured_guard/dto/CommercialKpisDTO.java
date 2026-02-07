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
public class CommercialKpisDTO {

    // KPIs individuais
    private long leadsRecebidos;
    private long leadsQualificados;
    private long propostasEnviadas;
    private long propostasAprovadas;
    private double taxaConversao;
    private BigDecimal ticketMedio;
    private BigDecimal receitaContratada;
    private double tempoMedioFechamentoDias;
    private long contratosAtivos;

    // Dados para gráficos
    private Map<String, Long> leadsPorMes;
    private Map<String, BigDecimal> receitaPorMes;
    private Map<String, Double> conversaoPorMes;
    private Map<String, Long> funilVendas; // etapa -> quantidade

    // Informações do filtro aplicado
    private String userId;
    private String userName;
    private String periodo;
}
