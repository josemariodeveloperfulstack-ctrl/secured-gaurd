package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendedorRankingDTO {

    private UUID userId;
    private String userName;
    private long leadsRecebidos;
    private long leadsQualificados;
    private long propostasEnviadas;
    private long propostasAprovadas;
    private double taxaConversao;
    private BigDecimal receita;
    private BigDecimal ticketMedio;
    private int posicao;
}
