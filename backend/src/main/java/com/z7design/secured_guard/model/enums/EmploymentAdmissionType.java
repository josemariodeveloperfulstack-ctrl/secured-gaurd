package com.z7design.secured_guard.model.enums;

public enum EmploymentAdmissionType {
    PRIMEIRA_ADMISSAO("Primeira Admissão"),
    READMISSAO("Readmissão"),
    PROMOCAO("Promoção");

    private final String label;

    EmploymentAdmissionType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
