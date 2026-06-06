package com.z7design.secured_guard.model.enums;

/**
 * Vínculo de um funcionário com o posto de trabalho no momento da visita do supervisor.
 *
 * <ul>
 *   <li>{@link #EFETIVO} — funcionário é o titular (posto efetivo) daquele posto.</li>
 *   <li>{@link #REMANEJADO} — funcionário foi remanejado para o posto (atribuição temporária).</li>
 *   <li>{@link #COBERTURA_FERIAS} — funcionário está cobrindo férias de outro funcionário no posto.</li>
 *   <li>{@link #NAO_ALOCADO} — não há vínculo registrado do funcionário com o posto na data.</li>
 * </ul>
 */
public enum PostAllocationType {
    EFETIVO("Efetivo do posto"),
    REMANEJADO("Remanejado"),
    COBERTURA_FERIAS("Cobertura de férias"),
    NAO_ALOCADO("Sem alocação registrada");

    private final String description;

    PostAllocationType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
