package com.z7design.secured_guard.model.enums;

public enum MedicalDocumentType {
    ATESTADO,                           // Atestado de Afastamento / Doença
    DECLARACAO_COMPARECIMENTO,          // Declaração de Comparecimento
    ATESTADO_ACOMPANHAMENTO,            // Atestado de Acompanhamento
    ATESTADO_APTIDAO_SANIDADE,          // Atestado de Aptidão Física ou Sanidade
    AFASTAMENTO_DOENCA_ACIDENTE,        // Afastamento por Doença ou Acidente
    AFASTAMENTO_INSS,                   // Afastamento pelo INSS
    ACIDENTE_TRABALHO,                  // Acidente de Trabalho
    LICENCA_MATERNIDADE_PATERNIDADE,    // Licença-Maternidade e Paternidade
    LICENCA_GALA_MATRIMONIAL,           // Licença Gala ou Matrimonial
    TESTEMUNHA_JUDICIAL,                // Afastamento como Testemunha Judicial
    PROCESSO_TRABALHISTA,               // Processo Trabalhista
    DECLARACAO_MEDICA,                  // Declaração Médica (legado/compatibilidade)
    CAT,                                // CAT (legado/compatibilidade)
    AFASTAMENTO;                        // Afastamento (legado/compatibilidade)

    public boolean isDeclaration() {
        return this == DECLARACAO_COMPARECIMENTO || this == DECLARACAO_MEDICA;
    }

    public boolean countsTowardsInssAlert() {
        return this == ATESTADO
                || this == AFASTAMENTO
                || this == AFASTAMENTO_DOENCA_ACIDENTE
                || this == AFASTAMENTO_INSS
                || this == ACIDENTE_TRABALHO;
    }
}

