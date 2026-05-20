package com.z7design.secured_guard.model.enums;

public enum EPIDeliveryType {
    PRIMEIRA_ENTREGA("Primeira Entrega"),
    SUBSTITUICAO("Substituição"),
    DEVOLUCAO("Devolução"),
    TROCA("Troca");

    private final String description;

    EPIDeliveryType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
