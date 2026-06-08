package com.z7design.secured_guard.enums;

public enum DocumentType {
    // Onda 0: Já Migrados
    EMPLOYEE_RECORD("Ficha de Registro de Funcionário"),
    ACCOUNTING_FORM("Ficha de Cadastro"),
    EPI_DELIVERY("Ficha de Entrega de EPI"),

    // Onda 1: Documentos de RH
    LGPD_CONSENT_TERM("Termo de Consentimento LGPD"),
    EMPLOYMENT_CONTRACT("Contrato de Trabalho"),
    DISCIPLINARY_WARNING("Advertência Disciplinar"),
    TRANSPORT_VOUCHER_TERM("Termo de Vale-Transporte"),
    EQUIPMENT_RESPONSIBILITY_TERM("Termo de Responsabilidade de Equipamento"),
    DAMAGE_FINES_RESPONSIBILITY_TERM("Termo de Responsabilidade por Danos e Multas"),
    BODY_CAM_RESPONSIBILITY_TERM("Termo de Responsabilidade e Uso de Body Cam"),
    SERVICE_PROVIDER_AWARENESS_TERM("Termo de Ciência do Prestador"),
    DECLARATION("Declaração"),

    // Onda 2: Ordens de Serviço
    SERVICE_ORDER_STANDARD("Ordem de Serviço Padrão"),
    SERVICE_ORDER_CSN("Ordem de Serviço CSN"),
    SERVICE_ORDER_ATERPA("Ordem de Serviço ATERPA"),
    SERVICE_ORDER_TRANSPES("Ordem de Serviço Transpes"),
    SERVICE_ORDER_ASG_ATERPA("ASG Ordem de Serviço ATERPA"),
    SERVICE_ORDER_ASG_TRANSPES("ASG Ordem de Serviço TRANSPES"),
    SERVICE_ORDER_RECEPTIONIST("Ordem de Serviço Recepcionista"),
    SERVICE_ORDER_COMPLETE("Ordem de Serviço Completa"),

    // Onda 3: Relatórios Operacionais
    VISIT_CONTROL_REPORT("Relatório de Controle de Visitas"),
    VEHICLE_MAINTENANCE_REPORT("Relatório de Manutenção de Veículos"),
    TRANSPORT_GUIDE_REPORT("Guia de Transporte"),
    SCHEDULE_REPORT("Relatório de Escala"),
    RELOCATION_REPORT("Relatório de Remanejamento"),

    // Onda 3: Relatórios Administrativos
    OPERATIONAL_OCCURRENCE_REPORT("Relatório de Ocorrência Operacional"),
    FUEL_RECORD_REPORT("Relatório de Abastecimento"),
    FINE_REPORT("Relatório de Multas"),
    ACTIVITY_REPORT("Relatório de Atividades"),
    ADMISSION_REQUEST_REPORT("Solicitação de Admissão"),

    // Outros
    GENERIC_REPORT("Relatório Genérico");

    private final String description;

    DocumentType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
