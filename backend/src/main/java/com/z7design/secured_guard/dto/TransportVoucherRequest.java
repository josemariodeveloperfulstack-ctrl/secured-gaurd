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

    /** ID do funcionário (opcional). Quando informado, persiste o PDF gerado. */
    private UUID employeeId;

    // Dados do Funcionário
    private String employeeName;
    private String employeeCpf;
    private String employeeAddress;
    private String employeePosition;
    private String hireDate;
    private String employeeUnit;
    private String employeeWorkSector;


    // Opção (true = Optante, false = Não Optante)
    private boolean optIn;
    
    // Novos campos para layout específico
    private Boolean optingVoucher; // true para SIM, false para NÃO
    private String idaLinha;
    private String idaTarifa;
    private String voltaLinha;
    private String voltaTarifa;

    // Detalhes do Transporte (mantido para compatibilidade se necessário)
    private List<TransportRoute> routes;

    // Dados Gerais
    private String city;
    private String startDate; // Data de Início informada no form
    private LocalDate documentDate;
    private String observations;

    /** Quando true, gera PDF com campos em branco para preenchimento manual. */
    private Boolean manualFill;

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
