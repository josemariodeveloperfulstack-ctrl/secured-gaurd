package com.z7design.secured_guard.dto.sendgrid;

import java.time.Instant;

/** Linha da lista de contactos que cancelaram o recebimento de e-mails de marketing. */
public record EmailMarketingUnsubscribeRowDto(
        String email,
        String source,
        String reason,
        Instant confirmedAt
) {}
