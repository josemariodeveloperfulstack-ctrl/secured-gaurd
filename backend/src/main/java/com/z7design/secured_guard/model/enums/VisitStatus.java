package com.z7design.secured_guard.model.enums;

public enum VisitStatus {
    PENDING("Pendente"),
    COMPLETED("Realizada"),
    NOT_COMPLETED("Não Realizada"),
    CANCELLED("Cancelada");
    
    private final String description;
    
    VisitStatus(String description) {
        this.description = description;
    }
    
    public String getDescription() {
        return description;
    }
}
