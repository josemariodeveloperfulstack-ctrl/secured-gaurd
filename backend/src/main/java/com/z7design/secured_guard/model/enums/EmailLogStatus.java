package com.z7design.secured_guard.model.enums;

/**
 * Status agregado do envio (RF02). Ordem aproximada para comparação em
 * {@link com.z7design.secured_guard.service.SendGridEmailEventProcessor}.
 */
public enum EmailLogStatus {
    PENDING,
    SENT,
    DELIVERED,
    OPENED,
    CLICKED,
    REPLIED,
    BOUNCED,
    DROPPED,
    DEFERRED
}
