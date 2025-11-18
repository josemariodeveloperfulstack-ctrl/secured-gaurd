package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayslipComparisonResult {
    
    @Builder.Default
    private boolean hasChanges = false;
    
    @Builder.Default
    private List<String> differences = new ArrayList<>();
    
    /**
     * Adiciona uma diferença encontrada na comparação
     */
    public void addDifference(String field, String oldValue, String newValue) {
        this.hasChanges = true;
        this.differences.add(String.format("%s: '%s' -> '%s'", field, 
            oldValue != null ? oldValue : "null", 
            newValue != null ? newValue : "null"));
    }
    
    /**
     * Adiciona uma diferença encontrada na comparação (formato customizado)
     */
    public void addDifference(String description) {
        this.hasChanges = true;
        this.differences.add(description);
    }
    
    /**
     * Verifica se há mudanças detectadas
     */
    public boolean hasChanges() {
        return hasChanges;
    }
    
    /**
     * Retorna a lista de diferenças encontradas
     */
    public List<String> getDifferences() {
        return differences != null ? differences : new ArrayList<>();
    }
}

