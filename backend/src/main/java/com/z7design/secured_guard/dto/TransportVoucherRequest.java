package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransportVoucherRequest {
    private UUID companyId;

    // Dados do Funcionário
    private String employeeName;
    private String employeeCpf;
    private String employeeAddress;

    // Opção (true = Optante, false = Não Optante)
    private boolean optIn;

    // Detalhes do Transporte (apenas se optIn = true)
    private List<TransportRoute> routes;

    // Dados Gerais
    private String city;
    private LocalDate documentDate;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TransportRoute {
        private String type; // Ônibus, Metrô, Trem
        private String line; // Ex: 123 - Centro
        private String company; // Ex: Viação X
        private Double value; // Valor da tarifa
        private Integer quantityDaily; // Quantidade diária
    }
}
