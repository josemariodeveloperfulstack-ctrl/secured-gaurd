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
     * Subtítulo do relatório (ex: Período)
     */
    private String reportSubTitle;

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
        private String red; // Padrão: #FF3333
    }

    /**
     * Margem superior do conteúdo (para acomodar o cabeçalho)
     * Padrão: 120px
     */
    @Builder.Default
    private float topMargin = 120f;

    /**
     * Margem superior extra do conteúdo (além da margem fixa do cabeçalho)
     * Padrão: 0px
     */
    @Builder.Default
    private float marginExtraTop = 0f;

    /**
     * Margem inferior do conteúdo (para acomodar o rodapé a 1cm da borda inferior)
     * Padrão: 85px
     */
    @Builder.Default
    private float bottomMargin = 85f;

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

    /**
     * Se deve incluir o email da empresa no rodapé
     * Padrão: true
     */
    @Builder.Default
    private boolean includeEmailInFooter = true;

    /**
     * Se deve desenhar o cabeçalho padrão (logo, barra gradiente, título).
     * Use false em documentos com cabeçalho próprio (ex.: Ordem de Serviço).
     * Padrão: true
     */
    @Builder.Default
    private boolean showHeader = true;

    /**
     * Se deve exibir engenheiro SST + carimbo no cabeçalho padrão.
     * O carimbo da OS é desenhado no cabeçalho próprio da Ordem de Serviço;
     * contratos e demais PDFs comerciais não devem mostrar o carimbo.
     * Padrão: false
     */
    @Builder.Default
    private boolean showSafetyEngineerStamp = false;

    /**
     * Orientação da página: true = paisagem (landscape), false = retrato (portrait)
     * Padrão: false (retrato)
     */
    @Builder.Default
    private boolean landscape = false;

    /**
     * Usar layout programático (gradiente, forma escura) em vez do template PNG.
     * Quando true, ignora report-background-template.png e desenha o layout correto
     * conforme ORIENTACAO_LAYOUT_RELATORIOS.md.
     * Padrão: false (usa template se existir)
     */
    @Builder.Default
    private boolean useProgrammaticLayout = false;

    /**
     * Exibir numeração de páginas no rodapé (ex: "Página 1", "Página 2", ...).
     * Padrão: true
     */
    @Builder.Default
    private boolean showPageNumbers = true;

    /**
     * Texto do usuário que gerou o relatório (nome e login), exibido à direita acima da numeração.
     * Opcional; se null ou vazio, a linha não é desenhada.
     */
    private String footerUserSummary;

    /**
     * Data/hora da geração já formatada (ex.: dd/MM/yyyy HH:mm), à direita entre usuário e numeração.
     * Opcional; se null ou vazio, a linha não é desenhada.
     */
    private String footerReportAt;

    /**
     * Se deve remover o negrito do nome da empresa no rodapé
     */
    @Builder.Default
    private boolean removeBoldFromFooterCompanyName = false;

    /**
     * Se deve usar a fonte Calibri Light no rodapé
     */
    @Builder.Default
    private boolean useCalibriLightFooter = false;

    /**
     * Tamanho da fonte do nome da empresa no rodapé
     */
    @Builder.Default
    private float footerCompanyNameFontSize = 9f;

    /**
     * Desenha uma linha horizontal separando o conteúdo do rodapé (dados da empresa).
     * Útil em documentos com cabeçalho próprio (ex.: Ordem de Serviço).
     * Padrão: false
     */
    @Builder.Default
    private boolean showFooterContentSeparator = false;

    /**
     * Se deve desenhar a barra/linha colorida na base extrema da página (abaixo dos dados da empresa).
     * Padrão: true
     */
    @Builder.Default
    private boolean showFooterBackgroundLine = true;
}
