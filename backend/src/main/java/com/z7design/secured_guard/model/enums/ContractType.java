package com.z7design.secured_guard.model.enums;

public enum ContractType {
    VIGILANCIA_PATRIMONIAL("Vigilância patrimonial"),
    PORTARIA("Portaria"),
    FACILITIES("Facilities");

    private final String description;

    ContractType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
