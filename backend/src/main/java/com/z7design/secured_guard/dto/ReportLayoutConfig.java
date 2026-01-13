package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Configuração para o layout padrão de relatórios
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportLayoutConfig {
    
    /**
     * ID da empresa para buscar informações (nome, CNPJ, logo, etc.)
     */
    private UUID companyId;
    
    /**
     * Título do relatório
     */
    private String reportTitle;
    
    /**
     * Cores personalizadas do gradiente (opcional, usa padrão se null)
     * Estrutura preparada para futura personalização por empresa
     */
    private GradientColors gradientColors;
    
    /**
     * Cores do gradiente
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GradientColors {
        private String yellow; // Padrão: #FFCC00
        private String orange; // Padrão: #FF9900
        private String red;    // Padrão: #FF3333
    }
    
    /**
     * Margem superior do conteúdo (para acomodar o cabeçalho)
     * Padrão: 120px
     */
    @Builder.Default
    private float topMargin = 120f;
    
    /**
     * Margem inferior do conteúdo (para acomodar o rodapé)
     * Padrão: 80px
     */
    @Builder.Default
    private float bottomMargin = 80f;
    
    /**
     * Margem esquerda do conteúdo
     * Padrão: 50px
     */
    @Builder.Default
    private float leftMargin = 50f;
    
    /**
     * Margem direita do conteúdo
     * Padrão: 50px
     */
    @Builder.Default
    private float rightMargin = 50f;
}
