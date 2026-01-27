package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VehicleMaintenanceRequest {
    private UUID companyId;

    // Filtros
    private LocalDate startDate;
    private LocalDate endDate;

    // Lista de Manutenções
    private List<MaintenanceItem> maintenances;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MaintenanceItem {
        private String vehicleModel;
        private String licensePlate; // Placa
        private LocalDate date;
        private String serviceType; // Ex: Troca de óleo
        private String description;
        private String mechanicOrShop; // Oficina/Mecânico
        private BigDecimal cost;
        private Long currentMileage; // Quilometragem
    }
}
