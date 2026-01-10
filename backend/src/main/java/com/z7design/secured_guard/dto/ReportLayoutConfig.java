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
     * Se deve incluir marca d'água (usado em contratos e documentos importantes)
     */
    @Builder.Default
    private boolean withWatermark = false;
    
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
