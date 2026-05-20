package com.z7design.secured_guard.model.enums;

public enum EquipmentType {
    ARMA("Arma"),
    COLETE("Colete"),
    MUNICAO("Munição");

    private final String description;

    EquipmentType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
