package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.MovementType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateEquipmentMovementDTO {
    
    @NotNull(message = "ID do equipamento é obrigatório")
    private UUID equipmentId;
    
    @NotNull(message = "ID do funcionário é obrigatório")
    private UUID employeeId;
    
    private UUID workPostId;
    
    @NotNull(message = "Quem autorizou é obrigatório")
    private UUID authorizedById;
    
    @NotNull(message = "Tipo de movimentação é obrigatório")
    private MovementType movementType;
    
    @NotNull(message = "Data da movimentação é obrigatória")
    private LocalDateTime movementDate;
    
    private LocalDateTime expectedReturnDate;
    
    private String reason;
    
    private String notes;
    
    private String conditionOnWithdrawal;
} 