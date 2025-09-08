package com.z7design.secured_guard.model.enums;

public enum ExpenseType {
    FIXA("Fixa"),
    VARIAVEL("Variável");
    
    private final String displayName;
    
    ExpenseType(String displayName) {
        this.displayName = displayName;
    }
    
    public String getDisplayName() {
        return displayName;
    }
} 