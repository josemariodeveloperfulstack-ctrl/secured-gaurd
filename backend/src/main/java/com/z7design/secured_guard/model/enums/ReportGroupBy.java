package com.z7design.secured_guard.model.enums;

/**
 * Opções de agrupamento para o relatório de funcionários.
 */
public enum ReportGroupBy {
    /** Agrupar por funcionário (cada funcionário com todos os postos que já passou) */
    FUNCIONARIO,
    /** Agrupar por posto de trabalho (cada posto com os funcionários que ocuparam) */
    POSTO_TRABALHO
}
