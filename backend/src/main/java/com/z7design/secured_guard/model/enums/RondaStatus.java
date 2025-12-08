package com.z7design.secured_guard.model.enums;

public enum RondaStatus {
    AGENDADA("Agendada"),
    EM_ANDAMENTO("Em Andamento"),
    CONCLUIDA("Concluída"),
    CANCELADA("Cancelada"),
    ATRASADA("Atrasada");
    
    private final String description;
    
    RondaStatus(String description) {
        this.description = description;
    }
    
    public String getDescription() {
        return description;
    }
}

