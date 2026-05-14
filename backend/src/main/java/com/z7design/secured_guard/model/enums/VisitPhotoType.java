package com.z7design.secured_guard.model.enums;

/**
 * Categoria de foto anexada a uma visita do supervisor.
 */
public enum VisitPhotoType {
    /** Foto genérica do posto / visita. */
    GENERAL,
    /** Foto específica do posto de trabalho (área, condições). */
    POST,
    /** Foto de equipamento do posto. */
    EQUIPMENT,
    /** Foto comprobatória de entrega de EPI. */
    EPI,
    /** Foto de incidente / não conformidade. */
    INCIDENT,
    /** Foto da ata assinada / ficha de visita. */
    REPORT_SHEET
}
