package com.z7design.secured_guard.service;

import com.itextpdf.io.image.ImageData;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.geom.Rectangle;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.layout.Canvas;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.properties.TextAlignment;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.util.CompanyDataFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;


import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;

/**
 * Serviço para criar layout padrão de relatórios com cabeçalho e rodapé dinâmicos
 * baseados na empresa selecionada.
 * 
 * Inclui cache de templates e logos para melhor performance.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StandardReportLayoutService {
    
    private final CompanyRepository companyRepository;
    
    @Value("${app.upload.dir:uploads}")
    private String uploadDir;
    
    @Value("${app.url:http://localhost:3000}")
    private String appUrl;
    
    // Cores padrão do gradiente (amarelo → laranja → vermelho) conforme modelo
    private static final DeviceRgb COLOR_YELLOW_DEFAULT = new DeviceRgb(255, 204, 0);      // #FFCC00 - Amarelo brilhante
    private static final DeviceRgb COLOR_ORANGE_DEFAULT = new DeviceRgb(255, 153, 0);      // #FF9900 - Laranja
    private static final DeviceRgb COLOR_RED_DEFAULT = new DeviceRgb(255, 51, 51);         // #FF3333 - Vermelho vibrante
    
    /**
     * Obtém cores do gradiente para uma empresa (suporta personalização futura)
     */
    private DeviceRgb[] getGradientColors(Company company) {
        // Por enquanto, sempre usa cores padrão
        // Futuro: buscar cores personalizadas da empresa se disponíveis
        return new DeviceRgb[]{
            COLOR_YELLOW_DEFAULT,
            COLOR_ORANGE_DEFAULT,
            COLOR_RED_DEFAULT
        };
    }
    
    private static final DeviceRgb DARK_CURVE = new DeviceRgb(30, 30, 30);          // Forma curva escura
    
    // Caminho do template de fundo do relatório
    private static final String REPORT_BACKGROUND_TEMPLATE = "templates/reports/report-background-template.png";
    
    // Cache de ImageData (não Image) para evitar problemas de reutilização entre documentos PDF
    // Cada documento precisa de suas próprias instâncias de Image
    private static final Map<String, ImageData> templateDataCache = new ConcurrentHashMap<>();
    private static final Map<String, ImageData> logoDataCache = new ConcurrentHashMap<>();
    
    // Configuração de cache (pode ser externalizada para properties)
    private static final long CACHE_MAX_SIZE = 50; // Máximo de itens em cache
    
    // Dimensões do logo em pixels (297x217px) - reduzido para caber dentro da forma escura
    // Conversão para pontos: 1pt = 1/72 inch
    // Para conversão precisa: 1px = 0.264583mm = 0.75pt (em 96 DPI)
    // Logo original: 297px × 0.75 = 222.75pt, 217px × 0.75 = 162.75pt
    // Reduzindo para ~35% do tamanho original para caber dentro da forma escura
    private static final float LOGO_WIDTH_PT = 78f;   // ~104px (35% de 297px) = 78pt
    private static final float LOGO_HEIGHT_PT = 57f;  // ~76px (35% de 217px) = 57pt
    
    /**
     * Cria um novo documento PDF com layout padrão
     * Retorna o Document e o PdfDocument para permitir adicionar header/footer após o conteúdo
     */
    public DocumentWithPdf createDocumentWithLayout(PdfWriter writer, ReportLayoutConfig config) throws IOException {
        PdfDocument pdfDoc = new PdfDocument(writer);
        Document document = new Document(pdfDoc, PageSize.A4);
        
        // Configurar margens baseadas na configuração
        document.setMargins(
            config.getTopMargin(),    // Margem superior (espaço para cabeçalho)
            config.getRightMargin(),  // Margem direita
            config.getBottomMargin(), // Margem inferior (espaço para rodapé)
            config.getLeftMargin()    // Margem esquerda
        );
        
        // Buscar empresa
        Company company = companyRepository.findById(config.getCompanyId())
            .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada com ID: " + config.getCompanyId()));
        
        // Retornar Document e PdfDocument para adicionar header/footer após o conteúdo
        return new DocumentWithPdf(document, pdfDoc, company, config);
    }
    
    /**
     * Adiciona header e footer em todas as páginas do documento após o conteúdo ser inserido
     * Deve ser chamado ANTES de fechar o documento
     */
    public void finalizeDocumentLayout(DocumentWithPdf docWithPdf) throws IOException {
        PdfDocument pdfDoc = docWithPdf.getPdfDoc();
        Company company = docWithPdf.getCompany();
        ReportLayoutConfig config = docWithPdf.getConfig();
        
        log.info("🎨 Iniciando finalização do layout padrão - Empresa: {}, Título: {}, Páginas: {}", 
                company.getName(), config.getReportTitle(), pdfDoc.getNumberOfPages());
        
        // Adicionar cabeçalho e rodapé em todas as páginas (marca d'água é adicionada dentro deste método se necessário)
        addHeaderFooterToAllPages(pdfDoc, company, config);
        
        log.info("✅ Layout padrão finalizado com sucesso");
    }
    
    /**
     * Classe auxiliar para manter referências necessárias
     */
    public static class DocumentWithPdf {
        private final Document document;
        private final PdfDocument pdfDoc;
        private final Company company;
        private final ReportLayoutConfig config;
        
        public DocumentWithPdf(Document document, PdfDocument pdfDoc, Company company, ReportLayoutConfig config) {
            this.document = document;
            this.pdfDoc = pdfDoc;
            this.company = company;
            this.config = config;
        }
        
        public Document getDocument() { return document; }
        public PdfDocument getPdfDoc() { return pdfDoc; }
        public Company getCompany() { return company; }
        public ReportLayoutConfig getConfig() { return config; }
    }
    
    /**
     * Adiciona cabeçalho e rodapé em todas as páginas do documento
     * Esta método deve ser chamado após o conteúdo ser adicionado ao documento
     */
    private void addHeaderFooterToAllPages(PdfDocument pdfDoc, Company company, ReportLayoutConfig config) {
        int totalPages = pdfDoc.getNumberOfPages();
        
        if (totalPages == 0) {
            log.warn("Documento não tem páginas ainda. Header/footer não serão adicionados.");
            return;
        }
        
        for (int i = 1; i <= totalPages; i++) {
            PdfPage page = pdfDoc.getPage(i);
            Rectangle pageSize = page.getPageSize();
            
            try {
                float pageWidth = pageSize.getWidth();
                float pageHeight = pageSize.getHeight();
                
                // Tentar carregar template de fundo (se existir)
                ImageData backgroundTemplateData = loadReportBackgroundTemplateData();
                
                PdfCanvas backgroundCanvas = new PdfCanvas(page.newContentStreamBefore(), page.getResources(), pdfDoc);
                
                if (backgroundTemplateData != null) {
                    // Usar template de fundo (imagem)
                    try {
                        Image backgroundImage = new Image(backgroundTemplateData);
                        backgroundImage.setFixedPosition(0, 0);
                        backgroundImage.setWidth(pageWidth);
                        backgroundImage.setHeight(pageHeight);
                        
                        Canvas backgroundCanvasLayout = new Canvas(backgroundCanvas, pageSize);
                        backgroundCanvasLayout.add(backgroundImage);
                        backgroundCanvasLayout.close();
                        
                        log.debug("✅ Template de fundo aplicado na página {}/{}", i, totalPages);
                    } catch (Exception e) {
                        log.warn("Erro ao aplicar template de fundo, usando fallback: {}", e.getMessage());
                        // Fallback para desenho programático
                        drawBackgroundElements(backgroundCanvas, pdfDoc, pageWidth, pageHeight, company);
                    }
                } else {
                    // Fallback: desenhar elementos programaticamente
                    log.debug("Template de fundo não encontrado, usando fallback programático para página {}/{}", i, totalPages);
                    drawBackgroundElements(backgroundCanvas, pdfDoc, pageWidth, pageHeight, company);
                }
                
                backgroundCanvas.release();
                
                // Desenhar elementos dinâmicos (logo, texto) - camada sobre o fundo
                // Usar newContentStreamAfter() para garantir que apareça sobre o conteúdo do relatório
                PdfCanvas headerFooterCanvas = new PdfCanvas(page.newContentStreamAfter(), page.getResources(), pdfDoc);
                Canvas canvasLayout = new Canvas(headerFooterCanvas, pageSize);
                
                try {
                    // Cabeçalho (logo, título, nome da empresa, CNPJ)
                    addHeader(canvasLayout, pageSize, company, config, pdfDoc);
                    
                    // Rodapé (informações da empresa e data de geração)
                    addFooter(canvasLayout, pageSize, company);
                } finally {
                    canvasLayout.close();
                    headerFooterCanvas.release();
                }
                
                log.debug("Elementos dinâmicos adicionados na página {}/{}", i, totalPages);
                
            } catch (Exception e) {
                log.error("Erro ao adicionar cabeçalho/rodapé na página {}: {}", i, e.getMessage(), e);
            }
        }
        
        log.info("Layout padrão aplicado em {} página(s) usando template de fundo", totalPages);
    }
    
    /**
     * Adiciona cabeçalho ao documento
     */
    private void addHeader(Canvas canvas, Rectangle pageSize, Company company, ReportLayoutConfig config, PdfDocument pdfDoc) throws IOException {
        float pageWidth = pageSize.getWidth();
        float pageHeight = pageSize.getHeight();
        float headerTop = pageHeight; // Topo do cabeçalho (topo da página)
        
        // Logo da empresa - centralizado dentro da forma escura no canto superior esquerdo
        // O logo deve ficar centralizado dentro da forma curva escura, mais próximo do topo
        // Com padding bottom de 20pt (espaço abaixo do logo)
        try {
            Image logoImage = loadCompanyLogo(company, pdfDoc);
            if (logoImage != null) {
                // A forma escura está no canto superior esquerdo
                // Centralizar o logo horizontalmente dentro da forma escura, mas mais próximo do topo
                float formAreaWidth = 120f;  // Largura estimada da forma escura
                float logoX = (formAreaWidth - LOGO_WIDTH_PT) / 2f; // Centralizar horizontalmente
                // Subir o logo mais: posicionar bem próximo do topo da forma escura
                // Com padding bottom de 20pt (espaço abaixo do logo)
                float logoY = headerTop - 10f - LOGO_HEIGHT_PT; // Mais próximo do topo (10pt do topo)
                
                logoImage.setFixedPosition(logoX, logoY);
                logoImage.setWidth(LOGO_WIDTH_PT);
                logoImage.setHeight(LOGO_HEIGHT_PT);
                canvas.add(logoImage);
                
                log.debug("✅ Logo da empresa {} centralizado dentro da forma escura em ({}, {}) com padding bottom de 20pt", company.getName(), logoX, logoY);
            } else {
                log.debug("⚠️ Logo da empresa {} não disponível", company.getName());
            }
        } catch (Exception e) {
            log.error("❌ Erro ao carregar logo da empresa {}: {}", company.getName(), e.getMessage());
        }
        
        // Título do relatório (centralizado, FORA da barra gradiente)
        // O título deve ficar abaixo da barra gradiente com margin top de 55pt e margin bottom de 45pt
        if (config.getReportTitle() != null && !config.getReportTitle().isEmpty()) {
            // Barra gradiente tem ~30pt de altura
            // Título fica FORA da barra, abaixo dela, com margin top de 55pt
            float titleY = headerTop - 30f - 55f; // Fora da barra gradiente, 55pt abaixo da base
            Paragraph title = new Paragraph(config.getReportTitle())
                .setFontSize(14) // Fonte reduzida
                .setBold()
                .setTextAlignment(TextAlignment.CENTER)
                .setFontColor(new DeviceRgb(0, 0, 0)) // Texto preto (fora da barra gradiente)
                .setMarginTop(55f) // Margin top de 55pt
                .setMarginBottom(45f); // Margin bottom de 45pt
            canvas.add(title.setFixedPosition(0, titleY, pageWidth));
        }
    }
    
    /**
     * Adiciona rodapé ao documento
     * Nota: O fundo já foi desenhado no método addHeaderFooterToAllPages
     */
    private void addFooter(Canvas canvas, Rectangle pageSize, Company company) {
        float pageWidth = pageSize.getWidth();
        float yPosition = 0;
        
        // Informações da empresa no rodapé (acima da linha gradiente)
        // O rodapé deve ficar acima da linha gradiente (4pt de altura)
        
        // Primeira linha: Nome da empresa (centralizado)
        if (company.getName() != null && !company.getName().isEmpty()) {
            Paragraph companyNameFooter = new Paragraph(company.getName())
                .setFontSize(9)
                .setBold()
                .setTextAlignment(TextAlignment.CENTER)
                .setFontColor(DeviceRgb.BLACK)
                .setMarginBottom(0f);
            canvas.add(companyNameFooter.setFixedPosition(0, yPosition + 30f, pageWidth));
        }
        
        // Segunda linha: Endereço completo
        String address = CompanyDataFormatter.formatFullAddress(company);
        if (!address.isEmpty()) {
            Paragraph addressFooter = new Paragraph(address)
                .setFontSize(8)
                .setTextAlignment(TextAlignment.CENTER)
                .setFontColor(DeviceRgb.BLACK)
                .setMarginBottom(0f);
            canvas.add(addressFooter.setFixedPosition(0, yPosition + 20f, pageWidth));
        }
        
        // Terceira linha: CNPJ
        String cnpjText = CompanyDataFormatter.formatCnpjForHeader(company);
        if (!cnpjText.isEmpty()) {
            Paragraph cnpjFooter = new Paragraph(cnpjText)
                .setFontSize(8)
                .setTextAlignment(TextAlignment.CENTER)
                .setFontColor(DeviceRgb.BLACK)
                .setMarginBottom(0f);
            canvas.add(cnpjFooter.setFixedPosition(0, yPosition + 10f, pageWidth));
        }
    }
    
    /**
     * Adiciona gradiente horizontal (amarelo → laranja → vermelho) conforme modelo
     * Implementa gradiente linear horizontal usando simulação com múltiplos retângulos
     * Suporta cores personalizadas por empresa
     */
    private void addHorizontalGradient(PdfCanvas pdfCanvas, PdfDocument pdfDoc, Rectangle rect, Company company) {
        pdfCanvas.saveState();
        
        float x = rect.getX();
        float y = rect.getY();
        float width = rect.getWidth();
        float height = rect.getHeight();
        
        // Número de segmentos para criar transição suave (mais segmentos = gradiente mais suave)
        int segments = 200;
        float segmentWidth = width / segments;
        
        // Obter cores do gradiente (personalizadas ou padrão)
        DeviceRgb[] colors = getGradientColors(company);
        
        // Criar gradiente simulando com múltiplos retângulos
        for (int i = 0; i < segments; i++) {
            float segmentX = x + (i * segmentWidth);
            float progress = (float) i / (segments - 1); // 0.0 a 1.0
            
            // Interpolar cor baseada no progresso
            DeviceRgb color = interpolateColor(colors[0], colors[1], colors[2], progress);
            
            pdfCanvas.setFillColor(color);
            pdfCanvas.rectangle(segmentX, y, segmentWidth + 1, height); // +1 para evitar gaps
            pdfCanvas.fill();
        }
        
        pdfCanvas.restoreState();
    }
    
    /**
     * Interpola entre três cores (amarelo → laranja → vermelho)
     */
    private DeviceRgb interpolateColor(DeviceRgb color1, DeviceRgb color2, DeviceRgb color3, float progress) {
        if (progress <= 0.5f) {
            // Primeira metade: amarelo → laranja
            float t = progress * 2.0f; // 0.0 a 1.0
            int r = (int) (color1.getColorValue()[0] * (1 - t) + color2.getColorValue()[0] * t);
            int g = (int) (color1.getColorValue()[1] * (1 - t) + color2.getColorValue()[1] * t);
            int b = (int) (color1.getColorValue()[2] * (1 - t) + color2.getColorValue()[2] * t);
            return new DeviceRgb(r, g, b);
        } else {
            // Segunda metade: laranja → vermelho
            float t = (progress - 0.5f) * 2.0f; // 0.0 a 1.0
            int r = (int) (color2.getColorValue()[0] * (1 - t) + color3.getColorValue()[0] * t);
            int g = (int) (color2.getColorValue()[1] * (1 - t) + color3.getColorValue()[1] * t);
            int b = (int) (color2.getColorValue()[2] * (1 - t) + color3.getColorValue()[2] * t);
            return new DeviceRgb(r, g, b);
        }
    }
    
    /**
     * Desenha elementos de fundo programaticamente (fallback quando template não está disponível)
     */
    private void drawBackgroundElements(PdfCanvas pdfCanvas, PdfDocument pdfDoc, float pageWidth, float pageHeight, Company company) {
        // Barra gradiente horizontal no topo (amarelo → laranja → vermelho)
        float gradientBarHeight = 30f; // Altura da barra gradiente no topo
        addHorizontalGradient(pdfCanvas, pdfDoc, new Rectangle(0, pageHeight - gradientBarHeight, pageWidth, gradientBarHeight), company);
        
        // Forma curva escura no canto superior esquerdo
        addDarkCurveShape(pdfCanvas, pageWidth, pageHeight);
        
        // Linha gradiente fina na parte inferior (amarelo → laranja → vermelho)
        float footerLineHeight = 4f;
        addHorizontalGradient(pdfCanvas, pdfDoc, new Rectangle(0, 0, pageWidth, footerLineHeight), company);
    }
    
    /**
     * Carrega ImageData do template de fundo (com cache)
     * Retorna null se o template não existir
     */
    private ImageData loadReportBackgroundTemplateData() {
        // Verificar cache primeiro
        String cacheKey = REPORT_BACKGROUND_TEMPLATE;
        if (templateDataCache.containsKey(cacheKey)) {
            log.debug("Template de fundo carregado do cache (ImageData): {}", cacheKey);
            return templateDataCache.get(cacheKey);
        }
        
        try {
            ClassPathResource resource = new ClassPathResource(REPORT_BACKGROUND_TEMPLATE);
            if (!resource.exists()) {
                log.debug("Template de fundo não encontrado em: {}", REPORT_BACKGROUND_TEMPLATE);
                return null;
            }
            
            ImageData imageData = ImageDataFactory.create(resource.getInputStream().readAllBytes());
            
            // Adicionar ImageData ao cache (com limite de tamanho)
            if (templateDataCache.size() < CACHE_MAX_SIZE) {
                templateDataCache.put(cacheKey, imageData);
                log.info("✅ Template de fundo carregado e adicionado ao cache: {}", REPORT_BACKGROUND_TEMPLATE);
            }
            
            return imageData;
        } catch (Exception e) {
            log.warn("Erro ao carregar template de fundo de {}: {}", REPORT_BACKGROUND_TEMPLATE, e.getMessage());
            return null;
        }
    }
    
    /**
     * Adiciona forma curva escura no canto superior esquerdo conforme modelo
     */
    private void addDarkCurveShape(PdfCanvas pdfCanvas, float pageWidth, float pageHeight) {
        pdfCanvas.saveState();
        pdfCanvas.setFillColor(DARK_CURVE);
        
        // Desenhar forma curva orgânica no canto superior esquerdo
        // Usando Bézier curves para criar a forma curva conforme modelo
        float startX = 0;
        float startY = pageHeight;
        float curveX1 = pageWidth * 0.25f; // ~25% da largura para curva mais suave
        float curveY1 = pageHeight;
        float curveX2 = pageWidth * 0.18f;
        float curveY2 = pageHeight - 80f; // Curvar mais para baixo
        float endX = 0;
        float endY = pageHeight - 120f; // Estender mais para baixo
        
        // Usar path para desenhar a forma curva (curva de Bézier cúbica)
        pdfCanvas.moveTo(startX, startY);
        pdfCanvas.curveTo(curveX1, curveY1, curveX2, curveY2, endX, endY);
        pdfCanvas.lineTo(startX, startY); // Fechar o path voltando ao início
        pdfCanvas.fill();
        
        pdfCanvas.restoreState();
    }
    
    
    /**
     * Carrega e redimensiona o logo da empresa para exatamente 297x217px (222.75x162.75pt)
     * Cria uma nova instância de Image para cada documento PDF (evita erro de reutilização)
     */
    private Image loadCompanyLogo(Company company, PdfDocument pdfDoc) throws IOException {
        if (company.getLogoUrl() == null || company.getLogoUrl().isEmpty()) {
            log.debug("Empresa {} não possui logo cadastrado", company.getName());
            return null;
        }
        
        try {
            String logoUrl = company.getLogoUrl();
            ImageData imageData;
            
            // Verificar cache de ImageData primeiro (não Image)
            String cacheKey = company.getLogoUrl() + "_" + company.getId();
            if (logoDataCache.containsKey(cacheKey)) {
                log.debug("Logo da empresa {} carregado do cache (ImageData)", company.getName());
                imageData = logoDataCache.get(cacheKey);
            } else {
                // Se for URL HTTP/HTTPS, tentar resolver para arquivo local quando apontar para /uploads
                if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
                    String pathFromUrl = extractUploadPathFromUrl(logoUrl);
                    if (pathFromUrl != null) {
                        logoUrl = pathFromUrl;
                    }
                }

                if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
                    log.debug("Carregando logo de URL: {}", logoUrl);
                    imageData = ImageDataFactory.create(logoUrl);
                } else {
                    String logoPath = resolveLogoPath(logoUrl);

                    if (logoPath == null || !Files.exists(Paths.get(logoPath))) {
                        log.warn("Logo não encontrado no caminho: {}. Tentando URL pública...", logoPath);
                        String publicLogoUrl = buildPublicLogoUrl(logoUrl);
                        if (publicLogoUrl != null) {
                            log.info("🔗 Carregando logo via URL pública: {}", publicLogoUrl);
                            imageData = ImageDataFactory.create(publicLogoUrl);
                        } else {
                            return null;
                        }
                    } else {
                        imageData = ImageDataFactory.create(logoPath);
                    }
                }
                
                // Adicionar ImageData ao cache (com limite de tamanho)
                if (logoDataCache.size() < CACHE_MAX_SIZE) {
                    logoDataCache.put(cacheKey, imageData);
                    log.debug("Logo da empresa {} adicionado ao cache (ImageData)", company.getName());
                }
            }
            
            // Criar NOVA instância de Image para este documento PDF específico
            Image image = new Image(imageData);
            
            // Redimensionar para caber dentro da forma escura (reduzido para ~80% do tamanho original)
            image.setWidth(LOGO_WIDTH_PT);
            image.setHeight(LOGO_HEIGHT_PT);
            
            log.debug("Logo da empresa {} criado para documento PDF ({}x{}pt) - tamanho reduzido para caber na forma escura", 
                    company.getName(), LOGO_WIDTH_PT, LOGO_HEIGHT_PT);
            
            return image;
        } catch (MalformedURLException e) {
            log.error("Erro ao criar URL da imagem do logo: {}", e.getMessage(), e);
            return null;
        } catch (Exception e) {
            log.error("Erro ao carregar logo da empresa {}: {}", company.getName(), e.getMessage(), e);
            return null;
        }
    }
    
    /**
     * Limpa o cache de templates e logos
     * Útil para forçar recarregamento após atualizações
     */
    public void clearCache() {
        templateDataCache.clear();
        logoDataCache.clear();
        log.info("Cache de templates e logos limpo");
    }
    
    /**
     * Resolve o caminho completo do logo da empresa
     */
    private String resolveLogoPath(String logoUrl) {
        if (logoUrl == null || logoUrl.isEmpty()) {
            return null;
        }
        
        // Se já é um caminho absoluto com file:// ou http://, retornar como está
        if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
            return logoUrl;
        }
        
        // Se começa com /api/uploads/companies/logos/, remover o prefixo
        if (logoUrl.startsWith("/api/uploads/companies/logos/")) {
            String filename = logoUrl.replace("/api/uploads/companies/logos/", "");
            Path logoDir = Paths.get(uploadDir, "companies", "logos");
            return logoDir.resolve(filename).toAbsolutePath().toString();
        }

        // Se começa com api/uploads/companies/logos/ sem barra inicial
        if (logoUrl.startsWith("api/uploads/companies/logos/")) {
            String filename = logoUrl.replace("api/uploads/companies/logos/", "");
            Path logoDir = Paths.get(uploadDir, "companies", "logos");
            return logoDir.resolve(filename).toAbsolutePath().toString();
        }

        // Se começa com /uploads/companies/logos/, remover o prefixo
        if (logoUrl.startsWith("/uploads/companies/logos/")) {
            String filename = logoUrl.replace("/uploads/companies/logos/", "");
            Path logoDir = Paths.get(uploadDir, "companies", "logos");
            return logoDir.resolve(filename).toAbsolutePath().toString();
        }

        // Se começa com uploads/companies/logos/ sem barra inicial
        if (logoUrl.startsWith("uploads/companies/logos/")) {
            String filename = logoUrl.replace("uploads/companies/logos/", "");
            Path logoDir = Paths.get(uploadDir, "companies", "logos");
            return logoDir.resolve(filename).toAbsolutePath().toString();
        }

        // Se começa com /uploads/, remover o prefixo
        if (logoUrl.startsWith("/uploads/")) {
            String relativePath = logoUrl.replace("/uploads/", "");
            Path logoPath = Paths.get(uploadDir, relativePath);
            return logoPath.toAbsolutePath().toString();
        }
        
        // Se começa com uploads/ sem barra inicial
        if (logoUrl.startsWith("uploads/")) {
            String relativePath = logoUrl.replace("uploads/", "");
            Path logoPath = Paths.get(uploadDir, relativePath);
            return logoPath.toAbsolutePath().toString();
        }

        // Se é apenas o nome do arquivo, construir caminho completo
        if (!logoUrl.contains("/")) {
            Path logoDir = Paths.get(uploadDir, "companies", "logos");
            return logoDir.resolve(logoUrl).toAbsolutePath().toString();
        }
        
        // Caso contrário, assumir que é um caminho relativo
        Path logoPath = Paths.get(uploadDir, logoUrl);
        return logoPath.toAbsolutePath().toString();
    }

    /**
     * Extrai caminho local de URLs que apontam para /uploads.
     */
    private String extractUploadPathFromUrl(String logoUrl) {
        try {
            java.net.URI uri = new java.net.URI(logoUrl);
            String path = uri.getPath();
            if (path == null) {
                return null;
            }
            if (path.startsWith("/api/uploads/companies/logos/") ||
                path.startsWith("/uploads/companies/logos/") ||
                path.startsWith("/uploads/")) {
                return path;
            }
        } catch (Exception e) {
            log.debug("Não foi possível extrair path de logo URL {}: {}", logoUrl, e.getMessage());
        }
        return null;
    }
    
    private String buildPublicLogoUrl(String logoUrl) {
        if (logoUrl == null || logoUrl.isEmpty()) {
            return null;
        }
        if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
            return logoUrl;
        }
        String base = appUrl == null ? "" : appUrl.trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        if (logoUrl.startsWith("/")) {
            return base + logoUrl;
        }
        return base + "/" + logoUrl;
    }
    
}
