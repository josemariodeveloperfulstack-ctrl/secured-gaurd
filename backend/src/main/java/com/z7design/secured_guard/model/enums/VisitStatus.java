package com.z7design.secured_guard.model.enums;

public enum VisitStatus {
    SCHEDULED("Agendada"),
    IN_PROGRESS("Em Andamento"),
    COMPLETED("Concluída"),
    CANCELLED("Cancelada"),
    PENDING("Pendente"), // Mantido para compatibilidade
    NOT_COMPLETED("Não Realizada"); // Mantido para compatibilidade
    
    private final String description;
    
    VisitStatus(String description) {
        this.description = description;
    }
    
    public String getDescription() {
        return description;
    }
}
