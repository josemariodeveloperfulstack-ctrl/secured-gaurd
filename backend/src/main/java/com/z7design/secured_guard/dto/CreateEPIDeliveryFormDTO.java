package com.z7design.secured_guard.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
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
public class CreateEPIDeliveryFormDTO {
    
    @NotNull(message = "Funcionário é obrigatório")
    private UUID employeeId;
    
    @NotNull(message = "Empresa é obrigatória")
    private UUID companyId;
    
    @NotNull(message = "Data de entrega é obrigatória")
    private LocalDate deliveryDate;
    
    private UUID responsibleEmployeeId;
    
    private String observations;
    
    private String pdfUrl;
    
    @NotEmpty(message = "É necessário pelo menos um item de EPI")
    private List<EPIDeliveryFormItemDTO> items;
}


