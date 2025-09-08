package com.z7design.secured_guard.model.enums;

public enum ActivityReportStatus {
    DRAFT,          // Rascunho
    SUBMITTED,      // Submetido para revisão
    APPROVED,       // Aprovado pelo supervisor
    REJECTED,       // Rejeitado pelo supervisor
    FINALIZED       // Finalizado (após aprovação, se houver etapas adicionais)
}
