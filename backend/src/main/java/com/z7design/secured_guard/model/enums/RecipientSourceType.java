package com.z7design.secured_guard.model.enums;

/**
 * Origem do destinatário em uma campanha.
 *  - {@link #LEAD}: vinculado a um Lead existente do CRM.
 *  - {@link #IMPORT}: vindo de upload CSV/Excel.
 *  - {@link #MANUAL}: digitado/colado pelo usuário.
 */
public enum RecipientSourceType {
    LEAD,
    IMPORT,
    MANUAL
}
