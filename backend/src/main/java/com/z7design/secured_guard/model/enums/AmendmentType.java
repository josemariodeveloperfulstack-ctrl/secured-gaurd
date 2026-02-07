package com.z7design.secured_guard.model.enums;

public enum AmendmentType {
    INCLUSAO_POSTO("Inclusão de Posto"),
    ALTERACAO_ESCALA("Alteração de Escala"),
    REAJUSTE_EXTRAORDINARIO("Reajuste Extraordinário"),
    REDUCAO_POSTO("Redução de Posto"),
    MUDANCA_LOCAL("Mudança de Local");

    private final String description;

    AmendmentType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
