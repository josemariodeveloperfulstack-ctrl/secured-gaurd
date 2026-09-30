package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO do template (minuta) de contrato com as 14 cláusulas editáveis.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanyContractTemplateDTO {

    private UUID id;

    /** ID da empresa (NULL = template global oficial). */
    private UUID companyId;

    /** Chave do modelo: ARMADA, DESARMADA ou PORTARIA. */
    private String templateKey;

    private String title;

    private String clause1;
    private String clause2;
    private String clause3;
    private String clause4;
    private String clause5;
    private String clause6;
    private String clause7;
    private String clause8;
    private String clause9;
    private String clause10;
    private String clause11;
    private String clause12;
    private String clause13;
    private String clause14;

    private Boolean active;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
