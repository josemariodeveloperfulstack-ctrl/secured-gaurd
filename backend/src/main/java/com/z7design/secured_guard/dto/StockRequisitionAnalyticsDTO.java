package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockRequisitionAnalyticsDTO {

    private SummaryDTO summary;
    private List<PeriodMetricDTO> periodBreakdown;
    private List<TopItemDTO> topConsumedItems;
    private List<SectorConsumptionDTO> consumptionBySector;
    private List<CompanyConsumptionDTO> consumptionByCompany;
    private List<DetailedRequisitionRowDTO> detailedRows;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SummaryDTO {
        private int totalRequisitions;
        private int totalItemsDelivered;
        private int pendingCount;
        private int approvedCount;
        private int deliveredCount;
        private int distinctEmployeesCount;
        private int distinctItemsCount;
        private Double averageEpiLifespanDays;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PeriodMetricDTO {
        private String periodLabel; // ex: "20/11", "Semana 47", "Nov/2026"
        private String dateSortKey;
        private int requisitionsCount;
        private int itemsCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopItemDTO {
        private UUID stockItemId;
        private String code;
        private String name;
        private String category;
        private String ca;
        private boolean isEpi;
        private int totalQuantity;
        private Integer currentStock;
        private Integer minimumStock;
        private boolean isLowStock;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SectorConsumptionDTO {
        private String sectorName;
        private int requisitionsCount;
        private int totalQuantity;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompanyConsumptionDTO {
        private String companyName;
        private String unitName;
        private int requisitionsCount;
        private int totalQuantity;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DetailedRequisitionRowDTO {
        private UUID id;
        private String requisitionNumber;
        private LocalDateTime date;
        private String status;
        private String statusLabel;
        private String employeeName; // Quem pegou / Beneficiário
        private String employeeCpf;
        private UUID employeeId;
        private String companyName; // Empresa
        private String unitName; // Unidade / Filial
        private String workSector; // Setor / Posto de trabalho
        private String requestedByName; // Quem solicitou
        private String deliveredByName; // Quem entregou
        private String movementReason;
        private int totalQuantity;
        private List<LineItemDetailDTO> items;
        private String summaryItemsText;
        private String epiUsageEstimate; // Ex: "94 dias de uso (~3 meses) desde entrega anterior"
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LineItemDetailDTO {
        private UUID stockItemId;
        private String code;
        private String name;
        private String ca;
        private boolean isEpi;
        private int quantity;
        private Integer daysSincePreviousDelivery; // Tempo que usufruiu do EPI anterior
        private LocalDateTime previousDeliveryDate;
        private String usageText; // Ex: "94 dias de uso" ou "Primeira entrega"
    }
}
