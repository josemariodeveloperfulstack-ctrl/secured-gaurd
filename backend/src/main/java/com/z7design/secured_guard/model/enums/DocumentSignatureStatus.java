package com.z7design.secured_guard.model.enums;

public enum DocumentSignatureStatus {
    PENDING("Pendente"),
    SIGNED("Assinado"),
    REJECTED("Rejeitado");

    private final String description;

    DocumentSignatureStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
