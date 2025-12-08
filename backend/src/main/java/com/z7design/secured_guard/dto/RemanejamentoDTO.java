package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.RemanejamentoTipo;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RemanejamentoDTO {
    
    private UUID id;
    
    @NotNull(message = "ID do funcionário é obrigatório")
    private UUID employeeId;
    
    private String employeeName;
    
    @NotNull(message = "Tipo de remanejamento é obrigatório")
    private RemanejamentoTipo tipo;
    
    private String origem;
    
    private String destino;
    
    // Campos adicionais para compatibilidade com frontend
    private UUID originWorkstationId;
    
    private UUID destinationWorkstationId;
    
    private LocalDate remanejamentoDate;
    
    private String notes;
    
    @NotNull(message = "Data do remanejamento é obrigatória")
    private LocalDate dataRemanejamento;
    
    private String observacao;
}

