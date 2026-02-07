package com.z7design.secured_guard.model.enums;

public enum TerminationReason {
    VIGENCY_END("Fim da Vigência"),
    DEFAULT_INADIMPLENCIA("Inadimplência"),
    CLIENT_REQUEST("Pedido do Cliente"),
    BREACH("Descumprimento");

    private final String description;

    TerminationReason(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
