package com.z7design.secured_guard.model.enums;

public enum VacancyStatus {
    OPEN("Aberta"),
    CLOSED("Fechada"),
    CANCELLED("Cancelada");
    
    private final String displayName;
    
    VacancyStatus(String displayName) {
        this.displayName = displayName;
    }
    
    public String getDisplayName() {
        return displayName;
    }
} 