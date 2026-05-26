package com.z7design.secured_guard.model.enums;

/**
 * Categoria de documento gerado pelo sistema a partir de templates fixos
 * (sem ModeloDocumento dinâmico). Usado pela coluna `tipo` da tabela
 * {@code documentos_gerados} para que RH e Colaborador possam filtrar /
 * baixar documentos posteriormente.
 *
 * Os slugs estão alinhados com {@code DOCUMENT_TYPES} do frontend
 * ({@code frontend/src/hooks/useDocumentGeneration.ts}).
 */
public enum TipoDocumentoGerado {

    // RH / Admissionais
    EMPLOYMENT_CONTRACT("Contrato de Trabalho"),
    DECLARATION("Declaração"),
    LGPD_CONSENT("Termo de Consentimento LGPD"),
    TRANSPORT_VOUCHER("Termo de Compromisso de Vale-Transporte"),
    DISCIPLINARY_WARNING("Advertência Disciplinar"),
    EQUIPMENT_RESPONSIBILITY("Termo de Responsabilidade de Equipamento"),
    EQUIPMENT_RESPONSIBILITY_SPECIFIC("Termo de Responsabilidade Específico"),
    SERVICE_PROVIDER_AWARENESS("Termo de Ciência do Prestador de Serviços"),

    // Operacional
    SERVICE_ORDER("Ordem de Serviço"),
    NPPS("Norma e Procedimento do Posto de Serviço"),
    EPI_DELIVERY("Ficha de Entrega de EPI"),

    // Relatórios / Fichas RH
    ACTIVITY_REPORT("Relatório de Atividades"),
    ACCOUNTING_FORM("Ficha de Contabilidade"),
    EMPLOYEE_RECORD("Ficha de Registro do Funcionário"),
    EMPLOYEE_HISTORY("Histórico do Funcionário"),
    VISIT_CONTROL_REPORT("Relatório de Controle de Visitas"),
    VEHICLE_MAINTENANCE_REPORT("Relatório de Manutenção de Veículos"),
    TRANSPORT_GUIDE("Guia de Transporte"),
    SCHEDULE_REPORT("Relatório de Escala"),
    RELOCATION_REPORT("Relatório de Remanejamento"),
    OPERATIONAL_OCCURRENCE_REPORT("Relatório de Ocorrência Operacional"),
    FUEL_RECORD_REPORT("Relatório de Abastecimento"),
    FINE_REPORT("Relatório de Multas"),
    ADMISSION_REQUEST("Requisição de Admissão"),

    // Outros
    OTHER("Outro Documento Gerado");

    private final String displayName;

    TipoDocumentoGerado(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
