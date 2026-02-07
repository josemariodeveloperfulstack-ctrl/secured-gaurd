package com.z7design.secured_guard.model.enums;

public enum AmendmentStatus {
    PENDING("Pendente"),
    APPROVED("Aprovado"),
    REJECTED("Rejeitado");

    private final String description;

    AmendmentStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
