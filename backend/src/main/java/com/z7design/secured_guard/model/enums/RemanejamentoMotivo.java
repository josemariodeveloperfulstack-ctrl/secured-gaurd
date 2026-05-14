package com.z7design.secured_guard.model.enums;

/**
 * Motivo de negócio que originou a solicitação de remanejamento.
 * Diferente de {@code RemanejamentoTipo}, que classifica a OPERAÇÃO (transferência,
 * cobertura, troca de função, etc.), o motivo descreve o CONTEXTO de campo que
 * levou o supervisor a abrir a solicitação.
 */
public enum RemanejamentoMotivo {
    /** Funcionário tem treinamento obrigatório pendente. */
    TRAINING_PENDING,
    /** Falta sem cobertura no posto. */
    UNCOVERED_ABSENCE,
    /** Identificado problema de saúde / aptidão. */
    HEALTH_ISSUE,
    /** Problema disciplinar. */
    DISCIPLINARY,
    /** Outro. */
    OTHER
}
