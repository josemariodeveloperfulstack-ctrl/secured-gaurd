package com.z7design.secured_guard.model.enums;

public enum GoalPeriod {
    MONTHLY("Mensal"),
    QUARTERLY("Trimestral"),
    YEARLY("Anual");

    private final String displayName;

    GoalPeriod(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
