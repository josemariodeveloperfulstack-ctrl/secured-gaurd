package com.z7design.secured_guard.model.enums;

/**
 * Categorias do histórico de mudanças do funcionário (PRD).
 */
public enum EmployeeChangeCategory {
    CARGO("Cargo"),
    SETOR("Setor/Departamento"),
    REMANEJAMENTO("Remanejamento"),
    SALARIO("Salário"),
    HORARIO("Horário de trabalho"),
    ESCALA("Escala de trabalho"),
    BENEFICIOS("Benefícios"),
    EXAME_ASO("Exame ASO / Saúde"),
    OCORRENCIA("Ocorrência"),
    FERIAS("Férias"),
    STATUS("Status"),
    DADOS_CADASTRAIS("Dados cadastrais"),
    EMPRESA("Empresa"),
    UNIDADE("Unidade"),
    POSTO_TRABALHO("Posto de trabalho"),
    FALTA("Falta"),
    ADVERTENCIA("Advertência"),
    ATIVIDADE("Atividade"),
    OUTROS("Outros");

    private final String label;

    EmployeeChangeCategory(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
