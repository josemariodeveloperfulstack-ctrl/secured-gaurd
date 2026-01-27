package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransportGuideRequest {
    private UUID companyId;

    // Dados da Guia
    private LocalDate date;
    private String driverName; // Motorista
    private String vehiclePlate; // Placa
    private String route; // Rota/Destino principal

    // Lista de Passageiros/Itinerário
    private List<TransportItem> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TransportItem {
        private String passengerName; // Passageiro
        private String destination; // Local de destino específico
        private LocalTime departureTime; // Saída
        private LocalTime returnTime; // Retorno
        private String observation;
    }
}
