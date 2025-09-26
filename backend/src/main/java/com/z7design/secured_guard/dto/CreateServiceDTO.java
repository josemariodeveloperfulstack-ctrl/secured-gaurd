package com.z7design.secured_guard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateServiceDTO {
    
    @NotBlank(message = "Nome do serviço é obrigatório")
    @Size(max = 255, message = "Nome deve ter no máximo 255 caracteres")
    private String name;
    
    @Size(max = 1000, message = "Descrição deve ter no máximo 1000 caracteres")
    private String description;
    
    @Size(max = 100, message = "Categoria deve ter no máximo 100 caracteres")
    private String category;
    
    @Size(max = 50, message = "Código deve ter no máximo 50 caracteres")
    private String code;
    
    private BigDecimal unitPrice;
    
    @Size(max = 20, message = "Unidade deve ter no máximo 20 caracteres")
    private String unit;
    
    private Boolean isBillable;
    
    private Boolean requiresEquipment;
    
    private Boolean requiresCertification;
    
    private Integer estimatedDurationHours;
    
    private Integer minEmployeesRequired;
    
    private Integer maxEmployeesAllowed;
    
    @Size(max = 500, message = "Observações devem ter no máximo 500 caracteres")
    private String notes;
    
    private UUID createdBy;
}
