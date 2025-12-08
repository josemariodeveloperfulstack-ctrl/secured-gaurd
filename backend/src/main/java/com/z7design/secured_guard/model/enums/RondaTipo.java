package com.z7design.secured_guard.model.enums;

public enum RondaTipo {
    PREVENTIVA("Preventiva"),
    PATRULHAMENTO("Patrulhamento"),
    VIGILANCIA("Vigilância"),
    EMERGENCIA("Emergência"),
    ESPECIAL("Especial");
    
    private final String description;
    
    RondaTipo(String description) {
        this.description = description;
    }
    
    public String getDescription() {
        return description;
    }
}

