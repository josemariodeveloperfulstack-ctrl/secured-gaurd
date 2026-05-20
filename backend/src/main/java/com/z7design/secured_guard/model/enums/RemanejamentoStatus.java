package com.z7design.secured_guard.model.enums;

/**
 * Estado do ciclo de aprovação de um {@code Remanejamento} quando solicitado
 * pelo Supervisor durante a visita ao posto.
 *
 * <p>Para remanejamentos registrados diretamente pelo RH/Operacional (sem fluxo
 * de aprovação) o campo fica {@code null} no banco — mantemos compatibilidade com
 * o histórico legado.
 */
public enum RemanejamentoStatus {
    /** Solicitado pelo Supervisor, aguardando análise do Gestor Operacional. */
    PENDING,
    /** Aprovado pelo Gestor Operacional. Pode ser executado. */
    APPROVED,
    /** Rejeitado pelo Gestor Operacional (com motivo). */
    REJECTED,
    /** Cancelado pelo próprio solicitante antes da decisão do gestor. */
    CANCELLED
}
