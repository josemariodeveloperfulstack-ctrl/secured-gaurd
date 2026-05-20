package com.z7design.secured_guard.dto.sendgrid;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.util.Map;
import java.util.UUID;

/**
 * Entrada de destinatário em uma campanha.
 *
 * <ul>
 *   <li>{@code email}: obrigatório.</li>
 *   <li>{@code name}: nome do contato.</li>
 *   <li>{@code metadata}: pares chave/valor adicionais para renderização do template
 *       (ex.: {@code company}, {@code position}).</li>
 *   <li>{@code sourceType}: LEAD, IMPORT ou MANUAL (default: MANUAL).</li>
 *   <li>{@code leadId}: opcional — quando o destinatário já é um Lead do CRM.</li>
 * </ul>
 */
public record EmailCampaignRecipientDto(
        @NotBlank @Email String email,
        String name,
        Map<String, Object> metadata,
        String sourceType,
        UUID leadId
) {
}
