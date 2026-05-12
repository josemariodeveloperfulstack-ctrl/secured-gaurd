package com.z7design.secured_guard.dto.sendgrid;

import java.util.UUID;

/**
 * Envia uma campanha de e-mail. Há dois modos:
 *  - <b>Template</b>: informe {@code templateId} (e opcionalmente {@code extraVariables}
 *    com pares chave/valor adicionais que serão mesclados com os metadados de cada
 *    destinatário antes da renderização).
 *  - <b>Manual</b>: informe diretamente {@code subject} e {@code htmlBody}.
 *
 * Se {@code templateId} for informado, ele tem precedência sobre os campos manuais.
 */
public record SendEmailCampaignRequest(
        UUID templateId,
        String subject,
        String htmlBody,
        java.util.Map<String, String> extraVariables
) {
}
