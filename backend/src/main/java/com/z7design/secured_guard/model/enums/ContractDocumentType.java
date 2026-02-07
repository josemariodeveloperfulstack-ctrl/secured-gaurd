package com.z7design.secured_guard.model.enums;

public enum ContractDocumentType {
    CONTRACT("Contrato"),
    AMENDMENT("Aditivo"),
    LEGAL_ATTACHMENT("Anexo Legal");

    private final String description;

    ContractDocumentType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
