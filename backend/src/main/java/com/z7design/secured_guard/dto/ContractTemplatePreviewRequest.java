package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Request para gerar PDF de preview do template de contrato com placeholders.
 * Permite overrides de headerText, footerText e contractTerms quando o usuário
 * está editando mas ainda não salvou.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractTemplatePreviewRequest {

    private UUID companyId;
    private UUID companyConfigId; // Opcional: se enviado, usa config salva

    // Overrides para preview com alterações não salvas
    private String headerText;
    private String footerText;
    private String contractTerms;
}
