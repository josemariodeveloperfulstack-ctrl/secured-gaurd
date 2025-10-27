package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response com resultado da validação de contatos
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContactValidationResponse {
    
    /**
     * Lista de detalhes de validação para cada funcionário
     */
    private List<ContactValidationDetail> details;
    
    /**
     * Estatísticas
     */
    private int totalEmployees;
    private long readyToSend;
    private long needingAction;
    private long withErrors;
    
    /**
     * Status geral
     */
    private boolean allReady;
    private String message;
}

