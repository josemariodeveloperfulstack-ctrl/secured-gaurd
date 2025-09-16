package com.z7design.secured_guard.model;

public enum AcaoHistorico {
    CRIACAO("Criação"),
    EDICAO("Edição"),
    EXCLUSAO("Exclusão"),
    ATIVACAO("Ativação"),
    DESATIVACAO("Desativação"),
    APROVACAO("Aprovação"),
    REJEICAO("Rejeição"),
    CANCELAMENTO("Cancelamento");

    private final String descricao;

    AcaoHistorico(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }
} 