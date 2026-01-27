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
public class VisitControlRequest {
    private UUID companyId;

    // Filtros do Relatório
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String unitName; // Unidade/Portaria

    // Lista de Visitas
    private List<VisitItem> visits;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VisitItem {
        private String visitorName;
        private String document; // CPF/RG
        private String company; // Empresa do visitante
        private String reason; // Motivo da visita
        private String personVisited; // Quem foi visitar
        private LocalDateTime entryTime;
        private LocalDateTime exitTime;
        private String badgeNumber; // Crachá
    }
}
