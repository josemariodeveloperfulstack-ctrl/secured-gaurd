package com.z7design.secured_guard.factory;

import com.z7design.secured_guard.service.ExcelReportLayoutService;
import com.z7design.secured_guard.service.StandardReportLayoutService;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Factory para gerenciar o layout de documentos.
 * Controla quais documentos usam o novo layout padronizado.
 * Served as the single source of truth for document migration status.
 */
@org.springframework.stereotype.Service
public class DocumentLayoutFactory {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(DocumentLayoutFactory.class);

    private final StandardReportLayoutService standardReportLayoutService;
    private final ExcelReportLayoutService excelReportLayoutService;

    public DocumentLayoutFactory(StandardReportLayoutService standardReportLayoutService,
            ExcelReportLayoutService excelReportLayoutService) {
        this.standardReportLayoutService = standardReportLayoutService;
        this.excelReportLayoutService = excelReportLayoutService;
    }

    /**
     * Tipos de documentos suportados pelo sistema (Inner Enum com Metadados)
     */
    public enum LayoutDocumentType {
        // ✅ Onda 0: Já migrados
        EMPLOYEE_RECORD("Ficha de Registro de Funcionário", "employee-record", MigrationWave.WAVE_0),
        ACCOUNTING_FORM("Ficha de Cadastro de Funcionário", "accounting-form", MigrationWave.WAVE_0),
        EPI_DELIVERY("Ficha de Entrega de EPI", "epi-delivery", MigrationWave.WAVE_0),

        // 🔄 Onda 1: Documentos de RH (Prioridade Alta)
        LGPD_CONSENT_TERM("Termo de Consentimento LGPD", "lgpd-consent", MigrationWave.WAVE_1),
        EMPLOYMENT_CONTRACT("Contrato de Trabalho", "employment-contract", MigrationWave.WAVE_1),
        DISCIPLINARY_WARNING("Advertência Disciplinar", "disciplinary-warning", MigrationWave.WAVE_1),
        TRANSPORT_VOUCHER_TERM("Termo de Compromisso de Vale-Transporte", "transport-voucher", MigrationWave.WAVE_1),
        EQUIPMENT_RESPONSIBILITY_TERM("Termo de Responsabilidade de Equipamento", "equipment-responsibility",
                MigrationWave.WAVE_1),
        SERVICE_PROVIDER_AWARENESS_TERM("Termo de Ciência do Prestador de Serviços", "service-provider-awareness",
                MigrationWave.WAVE_1),
        DECLARATION("Declaração", "declaration", MigrationWave.WAVE_1),

        // 🔄 Onda 2: Ordens de Serviço (Prioridade Média)
        SERVICE_ORDER_STANDARD("Ordem de Serviço Padrão", "service-order-standard", MigrationWave.WAVE_2),
        SERVICE_ORDER_CSN("Ordem de Serviço CSN", "service-order-csn", MigrationWave.WAVE_2),
        SERVICE_ORDER_ATERPA("Ordem de Serviço ATERPA", "service-order-aterpa", MigrationWave.WAVE_2),
        SERVICE_ORDER_TRANSPES("Ordem de Serviço Transpes", "service-order-transpes", MigrationWave.WAVE_2),
        SERVICE_ORDER_ASG_ATERPA("ASG Ordem de Serviço ATERPA", "service-order-asg-aterpa", MigrationWave.WAVE_2),
        SERVICE_ORDER_ASG_TRANSPES("ASG Ordem de Serviço TRANSPES", "service-order-asg-transpes", MigrationWave.WAVE_2),
        SERVICE_ORDER_RECEPTIONIST("Ordem de Serviço Recepcionista", "service-order-receptionist",
                MigrationWave.WAVE_2),
        SERVICE_ORDER_CRUD("Ordem de Serviço Completa", "service-order-crud", MigrationWave.WAVE_2),

        // 🔄 Onda 3: Relatórios Operacionais (Prioridade Baixa)
        VISIT_CONTROL_REPORT("Relatório de Controle de Visitas", "visit-control-report", MigrationWave.WAVE_3),
        VEHICLE_MAINTENANCE_REPORT("Relatório de Manutenção de Veículos", "vehicle-maintenance-report",
                MigrationWave.WAVE_3),
        TRANSPORT_GUIDE_REPORT("Guia de Transporte", "transport-guide", MigrationWave.WAVE_3),
        SCHEDULE_REPORT("Relatório de Escalas", "schedule-report", MigrationWave.WAVE_3),
        RELOCATION_REPORT("Relatório de Remanejamento", "relocation-report", MigrationWave.WAVE_3),
        OPERATIONAL_OCCURRENCE_REPORT("Relatório de Ocorrências Operacionais", "operational-occurrence-report",
                MigrationWave.WAVE_3),
        FUEL_RECORD_REPORT("Relatório de Abastecimento", "fuel-record-report", MigrationWave.WAVE_3),
        FINE_REPORT("Relatório de Multas", "fine-report", MigrationWave.WAVE_3),
        ACTIVITY_REPORT("Relatório de Atividades", "activity-report", MigrationWave.WAVE_3),
        ADMISSION_REQUEST_REPORT("Solicitação de Admissão", "admission-request", MigrationWave.WAVE_3);

        private final String displayName;
        private final String slug;
        private final MigrationWave wave;

        LayoutDocumentType(String displayName, String slug, MigrationWave wave) {
            this.displayName = displayName;
            this.slug = slug;
            this.wave = wave;
        }

        public String getDisplayName() {
            return displayName;
        }

        public String getSlug() {
            return slug;
        }

        public MigrationWave getWave() {
            return wave;
        }

        /**
         * Encontra um LayoutDocumentType pelo slug
         */
        public static LayoutDocumentType fromSlug(String slug) {
            for (LayoutDocumentType type : values()) {
                if (type.slug.equals(slug)) {
                    return type;
                }
            }
            throw new IllegalArgumentException("Tipo de documento não encontrado: " + slug);
        }
    }

    /**
     * Ondas de migração para priorização
     */
    public enum MigrationWave {
        WAVE_0("Já Migrados", 0),
        WAVE_1("Documentos RH", 1),
        WAVE_2("Ordens de Serviço", 2),
        WAVE_3("Relatórios", 3);

        private final String description;
        private final int order;

        MigrationWave(String description, int order) {
            this.description = description;
            this.order = order;
        }

        public String getDescription() {
            return description;
        }

        public int getOrder() {
            return order;
        }
    }

    /**
     * Documentos que já foram migrados para o novo layout
     */
    private static final Set<LayoutDocumentType> MIGRATED_TYPES = Set.of(
            LayoutDocumentType.EMPLOYEE_RECORD,
            LayoutDocumentType.ACCOUNTING_FORM,
            LayoutDocumentType.EPI_DELIVERY,

            // Onda 1
            LayoutDocumentType.LGPD_CONSENT_TERM,
            LayoutDocumentType.EMPLOYMENT_CONTRACT,
            LayoutDocumentType.DISCIPLINARY_WARNING,
            LayoutDocumentType.TRANSPORT_VOUCHER_TERM,
            LayoutDocumentType.EQUIPMENT_RESPONSIBILITY_TERM,
            LayoutDocumentType.SERVICE_PROVIDER_AWARENESS_TERM,
            LayoutDocumentType.DECLARATION,

            // Onda 2
            LayoutDocumentType.SERVICE_ORDER_STANDARD,
            LayoutDocumentType.SERVICE_ORDER_CSN,
            LayoutDocumentType.SERVICE_ORDER_ATERPA,
            LayoutDocumentType.SERVICE_ORDER_TRANSPES,

            // Onda 3
            LayoutDocumentType.VISIT_CONTROL_REPORT,
            LayoutDocumentType.VEHICLE_MAINTENANCE_REPORT,
            LayoutDocumentType.TRANSPORT_GUIDE_REPORT);

    /**
     * Verifica se um tipo de documento usa o novo layout (Inner Enum)
     */
    public boolean useNewLayout(LayoutDocumentType type) {
        boolean usesNew = MIGRATED_TYPES.contains(type);
        return usesNew;
    }

    /**
     * COMPATIBILITY BRIDGE: Aceita o Enum externo e converte para o Enum interno.
     */
    public boolean useNewLayout(com.z7design.secured_guard.enums.DocumentType externalType) {
        try {
            LayoutDocumentType innerType = LayoutDocumentType.valueOf(externalType.name());
            return useNewLayout(innerType);
        } catch (IllegalArgumentException e) {
            log.warn("Tipo de documento externo '{}' não possui correspondente interno na Factory.",
                    externalType.name());
            return false;
        }
    }

    /**
     * Verifica se um tipo de documento usa o novo layout pelo slug
     */
    public boolean useNewLayout(String slug) {
        try {
            LayoutDocumentType type = LayoutDocumentType.fromSlug(slug);
            return useNewLayout(type);
        } catch (IllegalArgumentException e) {
            log.warn("Slug de documento não reconhecido: {}", slug);
            return false;
        }
    }

    public StandardReportLayoutService getStandardReportLayoutService() {
        return standardReportLayoutService;
    }

    public ExcelReportLayoutService getExcelReportLayoutService() {
        return excelReportLayoutService;
    }

    public MigrationStatus getMigrationStatus() {
        int total = LayoutDocumentType.values().length;
        int migrated = MIGRATED_TYPES.size();
        int pending = total - migrated;

        return new MigrationStatus(total, migrated, pending);
    }

    public List<WaveStatus> getWaveStatuses() {
        return Arrays.stream(MigrationWave.values())
                .map(wave -> {
                    List<LayoutDocumentType> waveDocuments = Arrays.stream(LayoutDocumentType.values())
                            .filter(type -> type.getWave() == wave)
                            .collect(Collectors.toList());

                    long migratedCount = waveDocuments.stream()
                            .filter(MIGRATED_TYPES::contains)
                            .count();

                    return new WaveStatus(
                            wave,
                            waveDocuments.size(),
                            (int) migratedCount,
                            waveDocuments.size() - (int) migratedCount);
                })
                .collect(Collectors.toList());
    }

    public List<DocumentInfo> getMigratedDocuments() {
        return MIGRATED_TYPES.stream()
                .map(type -> new DocumentInfo(type.name(), type.getDisplayName(), type.getSlug(), true))
                .collect(Collectors.toList());
    }

    public List<DocumentInfo> getPendingDocuments() {
        return Arrays.stream(LayoutDocumentType.values())
                .filter(type -> !MIGRATED_TYPES.contains(type))
                .map(type -> new DocumentInfo(type.name(), type.getDisplayName(), type.getSlug(), false))
                .collect(Collectors.toList());
    }

    public record MigrationStatus(int total, int migrated, int pending) {
        public double getPercentage() {
            return total > 0 ? (migrated * 100.0) / total : 0.0;
        }
    }

    public record WaveStatus(MigrationWave wave, int total, int migrated, int pending) {
        public double getPercentage() {
            return total > 0 ? (migrated * 100.0) / total : 0.0;
        }

        public String getDescription() {
            return wave.getDescription();
        }
    }

    public record DocumentInfo(String type, String displayName, String slug, boolean migrated) {
    }
}
