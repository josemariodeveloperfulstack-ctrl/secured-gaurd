package com.z7design.secured_guard.model.enums;

public enum GoalType {
    REVENUE("Receita"),
    CONTRACTS("Contratos");

    private final String displayName;

    GoalType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
