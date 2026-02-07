package com.z7design.secured_guard.model.enums;

public enum ContractOrigin {
    PROPOSAL("Proposta comercial"),
    RENEWAL("Renovação"),
    MANUAL("Manual");

    private final String description;

    ContractOrigin(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
