package com.z7design.secured_guard.model.enums;

/**
 * Status dos registros de acidentes
 */
public enum AccidentStatus {
    REGISTRADO("Registrado"),
    INVESTIGADO("Investigado"),
    ENCERRADO("Encerrado");

    private final String description;

    AccidentStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
