package com.z7design.secured_guard.dto;

import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchUnificationRequest {
    
    /**
     * Mês para filtrar (opcional - se null, processa todos)
     */
    private Integer month;
    
    /**
     * Ano para filtrar (opcional - se null, processa todos)
     */
    private Integer year;
    
    /**
     * Se true, cria documento mesmo com nomes não coincidentes (apenas aviso)
     * Se false, rejeita se nomes não coincidirem
     */
    private Boolean forceUnification;
}

