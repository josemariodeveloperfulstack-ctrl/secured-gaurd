package com.z7design.secured_guard.dto.sendgrid;

import java.util.List;

/**
 * Resposta do parse de arquivo de destinatários.
 *
 * @param recipients destinatários encontrados (já com email/name/metadata preenchidos)
 * @param totalRows  total de linhas lidas no arquivo (excluindo o cabeçalho)
 * @param invalidRows linhas inválidas (sem e-mail ou com e-mail inválido) — não vêm em recipients
 * @param detectedColumns nomes das colunas detectadas no cabeçalho (na ordem original)
 */
public record ImportRecipientsResponse(
        List<EmailCampaignRecipientDto> recipients,
        int totalRows,
        int invalidRows,
        List<String> detectedColumns
) {}
