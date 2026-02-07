package com.z7design.secured_guard.model.enums;

public enum AdjustmentType {
    INPC("INPC"),
    IPCA("IPCA"),
    MANUAL("Manual");

    private final String description;

    AdjustmentType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
