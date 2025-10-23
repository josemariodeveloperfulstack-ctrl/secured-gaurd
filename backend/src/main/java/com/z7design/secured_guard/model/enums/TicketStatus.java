package com.z7design.secured_guard.model.enums;

/**
 * Enum para status de tickets de atendimento
 */
public enum TicketStatus {
    OPEN,           // Ticket aberto, aguardando atendimento
    IN_PROGRESS,    // Ticket em atendimento
    RESOLVED,       // Ticket resolvido
    CLOSED,         // Ticket fechado
    CANCELLED       // Ticket cancelado
}

