package com.z7design.secured_guard.model.enums;

public enum RondaPrioridade {
    BAIXA("Baixa"),
    MEDIA("Média"),
    ALTA("Alta"),
    CRITICA("Crítica");
    
    private final String description;
    
    RondaPrioridade(String description) {
        this.description = description;
    }
    
    public String getDescription() {
        return description;
    }
}

