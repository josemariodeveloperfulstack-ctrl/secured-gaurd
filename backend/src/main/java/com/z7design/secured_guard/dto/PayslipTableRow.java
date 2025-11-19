package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Representa uma linha da tabela de vencimentos/descontos do holerite
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayslipTableRow {
    private String codigo;           // Cód. (ex: "001", "599", "903")
    private String descricao;        // Descrição (ex: "Salário Base", "INSS Folha")
    private String referencia;       // Referência (ex: "30,00", "7,62 %")
    private BigDecimal vencimentos;  // Vencimentos (ex: 1649.12)
    private BigDecimal descontos;    // Descontos (ex: 125.65)
}

