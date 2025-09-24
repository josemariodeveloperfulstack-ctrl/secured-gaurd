package com.z7design.secured_guard.model.enums;

/**
 * Motivos de entrega de EPIs
 */
public enum EPIDeliveryReason {
    ADMISSAO("Admissão"),
    REPOSICAO("Reposição"),
    TROCA("Troca"),
    PERDA("Perda"),
    DANO("Dano");

    private final String description;

    EPIDeliveryReason(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
