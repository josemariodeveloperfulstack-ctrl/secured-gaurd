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
import com.itextpdf.kernel.pdf.extgstate.PdfExtGState;
import com.itextpdf.layout.Canvas;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.properties.TextAlignment;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Serviço para criar layout padrão de relatórios com cabeçalho e rodapé dinâmicos
 * baseados na empresa selecionada.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StandardReportLayoutService {
    
    private final CompanyRepository companyRepository;
    
    @Value("${app.upload.dir:uploads}")
    private String uploadDir;
    
    // Cores do gradiente (amarelo → laranja → vermelho) conforme modelo
    private static final DeviceRgb COLOR_YELLOW = new DeviceRgb(255, 204, 0);      // #FFCC00 - Amarelo brilhante
    private static final DeviceRgb COLOR_ORANGE = new DeviceRgb(255, 153, 0);      // #FF9900 - Laranja
    private static final DeviceRgb COLOR_RED = new DeviceRgb(255, 51, 51);         // #FF3333 - Vermelho vibrante
    
    // Cores para marca d'água (formas abstratas)
    private static final DeviceRgb WATERMARK_YELLOW = new DeviceRgb(255, 240, 200); // Amarelo pêssego claro
    private static final DeviceRgb WATERMARK_PINK = new DeviceRgb(255, 200, 180);   // Rosa pêssego claro
    private static final DeviceRgb DARK_CURVE = new DeviceRgb(30, 30, 30);          // Forma curva escura
    
    // Caminho do template de fundo do relatório
    private static final String REPORT_BACKGROUND_TEMPLATE = "templates/reports/report-background-template.png";
    
    // Dimensões do logo em pixels (297x217px)
    // Conversão para pontos: 1pt = 1/72 inch
    // Para conversão precisa: 1px = 0.264583mm = 0.75pt (em 96 DPI)
    // Logo: 297px × 0.75 = 222.75pt ≈ 223pt, 217px × 0.75 = 162.75pt ≈ 163pt
    // Mas vamos usar conversão mais precisa: 1px = 0.75pt (padrão web)
    // Logo: 297px × 0.75 = 222.75pt, 217px × 0.75 = 162.75pt
    // Para garantir exatamente 297x217px na renderização, vamos usar:
    private static final float LOGO_WIDTH_PT = 222.75f;   // 297px × 0.75 = 222.75pt
    private static final float LOGO_HEIGHT_PT = 162.75f; // 217px × 0.75 = 162.75pt
    
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
        
        // Adicionar cabeçalho e rodapé em todas as páginas (marca d'água é adicionada dentro deste método se necessário)
        addHeaderFooterToAllPages(pdfDoc, company, config);
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
                // Carregar e aplicar template de fundo (imagem com gradiente, forma curva, marca d'água)
                PdfCanvas backgroundCanvas = new PdfCanvas(page.newContentStreamBefore(), page.getResources(), pdfDoc);
                
                float pageWidth = pageSize.getWidth();
                float pageHeight = pageSize.getHeight();
                
                // Carregar imagem de template de fundo
                Image backgroundImage = loadReportBackgroundTemplate();
                if (backgroundImage != null) {
                    // Aplicar imagem de fundo cobrindo toda a página
                    backgroundImage.setFixedPosition(0, 0);
                    backgroundImage.setWidth(pageWidth);
                    backgroundImage.setHeight(pageHeight);
                    
                    Canvas backgroundCanvasLayout = new Canvas(backgroundCanvas, pageSize);
                    backgroundCanvasLayout.add(backgroundImage);
                    backgroundCanvasLayout.close();
                    
                    log.debug("Template de fundo aplicado na página {}/{}", i, totalPages);
                } else {
                    log.warn("Template de fundo não encontrado. Usando fallback programático.");
                    // Fallback: desenhar elementos programaticamente se template não estiver disponível
                    addHorizontalGradient(backgroundCanvas, pdfDoc, new Rectangle(0, pageHeight - 27.5f, pageWidth, 27.5f));
                    addDarkCurveShape(backgroundCanvas, pageWidth, pageHeight);
                    addHorizontalGradient(backgroundCanvas, pdfDoc, new Rectangle(0, 0, pageWidth, 3f));
                }
                
                backgroundCanvas.release();
                
                // Desenhar elementos dinâmicos (logo, texto) - camada sobre o fundo
                // Usar newContentStreamAfter() para garantir que apareça sobre o conteúdo do relatório
                PdfCanvas headerFooterCanvas = new PdfCanvas(page.newContentStreamAfter(), page.getResources(), pdfDoc);
                Canvas canvasLayout = new Canvas(headerFooterCanvas, pageSize);
                
                try {
                    // Cabeçalho (logo, título, nome da empresa, CNPJ)
                    addHeader(canvasLayout, pageSize, company, config);
                    
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
        
        // Marca d'água já está incluída no template de fundo, não precisa adicionar programaticamente
        log.info("Layout padrão aplicado em {} página(s) usando template de fundo", totalPages);
    }
    
    /**
     * Adiciona cabeçalho ao documento
     */
    private void addHeader(Canvas canvas, Rectangle pageSize, Company company, ReportLayoutConfig config) throws IOException {
        float pageWidth = pageSize.getWidth();
        float pageHeight = pageSize.getHeight();
        float headerTop = pageHeight; // Topo do cabeçalho (topo da página)
        
        // Logo da empresa (297x217px = 222.75x162.75pt)
        try {
            Image logoImage = loadCompanyLogo(company);
            if (logoImage != null) {
                // Posicionar logo no canto superior esquerdo, dentro da área do cabeçalho
                // Logo deve começar um pouco abaixo do topo para não sobrepor o gradiente
                float logoX = 15f; // Margem esquerda
                float logoY = headerTop - LOGO_HEIGHT_PT - 5f; // Alinhar no topo com pequena margem (5pt)
                
                logoImage.setFixedPosition(logoX, logoY);
                logoImage.setWidth(LOGO_WIDTH_PT);
                logoImage.setHeight(LOGO_HEIGHT_PT);
                canvas.add(logoImage);
                
                log.debug("Logo posicionado em ({}, {}) com dimensões {}x{}pt", 
                        logoX, logoY, LOGO_WIDTH_PT, LOGO_HEIGHT_PT);
            }
        } catch (Exception e) {
            log.warn("Não foi possível carregar logo da empresa {}: {}", company.getName(), e.getMessage());
        }
        
        // Título do relatório (centralizado no topo, abaixo do gradiente)
        if (config.getReportTitle() != null && !config.getReportTitle().isEmpty()) {
            // Título deve estar abaixo do gradiente (que tem ~27.5pt de altura)
            float titleY = headerTop - 40f; // ~40pt do topo
            Paragraph title = new Paragraph(config.getReportTitle())
                .setFontSize(18)
                .setBold()
                .setTextAlignment(TextAlignment.CENTER)
                .setFontColor(DeviceRgb.BLACK)
                .setMarginBottom(5f);
            canvas.add(title.setFixedPosition(0, titleY, pageWidth));
        }
        
        // Informações da empresa (centro do cabeçalho, abaixo do título)
        float infoY = headerTop - 65f; // ~65pt do topo
        
        Paragraph companyName = new Paragraph(company.getName())
            .setFontSize(14)
            .setBold()
            .setTextAlignment(TextAlignment.CENTER)
            .setFontColor(DeviceRgb.BLACK)
            .setMarginBottom(3f);
        canvas.add(companyName.setFixedPosition(0, infoY, pageWidth));
        
        if (company.getCnpj() != null && !company.getCnpj().isEmpty()) {
            Paragraph cnpj = new Paragraph("CNPJ: " + formatCnpj(company.getCnpj()))
                .setFontSize(9)
                .setTextAlignment(TextAlignment.CENTER)
                .setFontColor(new DeviceRgb(80, 80, 80))
                .setMarginBottom(2f);
            canvas.add(cnpj.setFixedPosition(0, infoY - 18f, pageWidth));
        }
    }
    
    /**
     * Adiciona rodapé ao documento
     * Nota: O fundo já foi desenhado no método addHeaderFooterToAllPages
     */
    private void addFooter(Canvas canvas, Rectangle pageSize, Company company) {
        float pageWidth = pageSize.getWidth();
        float yPosition = 0;
        
        // Informações da empresa no rodapé
        String footerText = company.getName();
        if (company.getAddress() != null && !company.getAddress().isEmpty()) {
            footerText += " | " + company.getAddress();
        }
        if (company.getCity() != null && !company.getCity().isEmpty()) {
            footerText += " - " + company.getCity();
            if (company.getState() != null && !company.getState().isEmpty()) {
                footerText += "/" + company.getState();
            }
        }
        if (company.getPhone() != null && !company.getPhone().isEmpty()) {
            footerText += " | Tel: " + company.getPhone();
        }
        
        Paragraph footer = new Paragraph(footerText)
            .setFontSize(8)
            .setTextAlignment(TextAlignment.CENTER)
            .setFontColor(DeviceRgb.BLACK)
            .setMarginTop(10f);
        canvas.add(footer.setFixedPosition(0, yPosition + 20f, pageWidth));
        
        // Data de geração
        String generatedAt = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        Paragraph dateFooter = new Paragraph("Gerado em: " + generatedAt)
            .setFontSize(7)
            .setTextAlignment(TextAlignment.CENTER)
            .setFontColor(new DeviceRgb(100, 100, 100));
        canvas.add(dateFooter.setFixedPosition(0, yPosition + 5f, pageWidth));
    }
    
    /**
     * Adiciona gradiente horizontal (amarelo → laranja → vermelho) conforme modelo
     * Implementa gradiente linear horizontal usando simulação com múltiplos retângulos
     */
    private void addHorizontalGradient(PdfCanvas pdfCanvas, PdfDocument pdfDoc, Rectangle rect) {
        pdfCanvas.saveState();
        
        float x = rect.getX();
        float y = rect.getY();
        float width = rect.getWidth();
        float height = rect.getHeight();
        
        // Número de segmentos para criar transição suave (mais segmentos = gradiente mais suave)
        int segments = 200;
        float segmentWidth = width / segments;
        
        // Criar gradiente simulando com múltiplos retângulos
        for (int i = 0; i < segments; i++) {
            float segmentX = x + (i * segmentWidth);
            float progress = (float) i / (segments - 1); // 0.0 a 1.0
            
            // Interpolar cor baseada no progresso
            DeviceRgb color = interpolateColor(COLOR_YELLOW, COLOR_ORANGE, COLOR_RED, progress);
            
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
     * Adiciona forma curva escura no canto superior esquerdo conforme modelo
     */
    private void addDarkCurveShape(PdfCanvas pdfCanvas, float pageWidth, float pageHeight) {
        pdfCanvas.saveState();
        pdfCanvas.setFillColor(DARK_CURVE);
        
        // Desenhar forma curva orgânica no canto superior esquerdo
        // Usando Bézier curves para criar a forma curva conforme modelo
        float startX = 0;
        float startY = pageHeight;
        float curveX1 = pageWidth * 0.15f; // ~15% da largura
        float curveY1 = pageHeight;
        float curveX2 = pageWidth * 0.10f;
        float curveY2 = pageHeight - 40f; // Curvar para baixo
        float endX = 0;
        float endY = pageHeight - 60f;
        
        // Usar path para desenhar a forma curva (curva de Bézier cúbica)
        pdfCanvas.moveTo(startX, startY);
        pdfCanvas.curveTo(curveX1, curveY1, curveX2, curveY2, endX, endY);
        pdfCanvas.lineTo(startX, startY); // Fechar o path voltando ao início
        pdfCanvas.fill();
        
        pdfCanvas.restoreState();
    }
    
    /**
     * Carrega a imagem de template de fundo do relatório
     * Esta imagem contém: gradiente, forma curva escura, marca d'água e linha do rodapé
     */
    private Image loadReportBackgroundTemplate() {
        try {
            ClassPathResource resource = new ClassPathResource(REPORT_BACKGROUND_TEMPLATE);
            if (!resource.exists()) {
                log.warn("Template de fundo não encontrado em: {}", REPORT_BACKGROUND_TEMPLATE);
                return null;
            }
            
            ImageData imageData = ImageDataFactory.create(resource.getInputStream().readAllBytes());
            Image image = new Image(imageData);
            
            log.debug("Template de fundo carregado com sucesso: {}", REPORT_BACKGROUND_TEMPLATE);
            return image;
        } catch (Exception e) {
            log.error("Erro ao carregar template de fundo de {}: {}", REPORT_BACKGROUND_TEMPLATE, e.getMessage(), e);
            return null;
        }
    }
    
    /**
     * Carrega e redimensiona o logo da empresa para exatamente 297x217px (222.75x162.75pt)
     */
    private Image loadCompanyLogo(Company company) throws IOException {
        if (company.getLogoUrl() == null || company.getLogoUrl().isEmpty()) {
            log.debug("Empresa {} não possui logo cadastrado", company.getName());
            return null;
        }
        
        try {
            String logoPath = resolveLogoPath(company.getLogoUrl());
            
            if (!Files.exists(Paths.get(logoPath))) {
                log.warn("Logo não encontrado no caminho: {}", logoPath);
                return null;
            }
            
            ImageData imageData = ImageDataFactory.create(logoPath);
            Image image = new Image(imageData);
            
            // Redimensionar para exatamente 297x217px (222.75x162.75pt)
            // Manter proporção original e ajustar para caber no espaço definido
            float originalWidth = image.getImageWidth();
            float originalHeight = image.getImageHeight();
            
            log.debug("Logo original: {}x{}pt, redimensionando para {}x{}pt (297x217px)", 
                    originalWidth, originalHeight, LOGO_WIDTH_PT, LOGO_HEIGHT_PT);
            
            // Definir dimensões fixas (297x217px)
            image.setWidth(LOGO_WIDTH_PT);
            image.setHeight(LOGO_HEIGHT_PT);
            
            log.info("Logo da empresa {} carregado e redimensionado para {}x{}pt (297x217px)", 
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
     * Formata CNPJ com máscara
     */
    private String formatCnpj(String cnpj) {
        if (cnpj == null || cnpj.isEmpty()) {
            return "";
        }
        
        // Remover caracteres não numéricos
        String digits = cnpj.replaceAll("[^0-9]", "");
        
        // Formatar: XX.XXX.XXX/XXXX-XX
        if (digits.length() == 14) {
            return String.format("%s.%s.%s/%s-%s",
                digits.substring(0, 2),
                digits.substring(2, 5),
                digits.substring(5, 8),
                digits.substring(8, 12),
                digits.substring(12, 14));
        }
        
        return cnpj; // Retornar original se não tiver 14 dígitos
    }
    
    /**
     * Adiciona marca d'água em todas as páginas (formas abstratas tipo "p" ou crescentes)
     * Conforme modelo: duas formas abstratas - uma amarelo/pêssego (esquerda) e outra rosa/pêssego (direita)
     */
    private void addWatermarkToAllPages(PdfDocument pdfDoc) {
        int totalPages = pdfDoc.getNumberOfPages();
        
        for (int i = 1; i <= totalPages; i++) {
            PdfPage page = pdfDoc.getPage(i);
            Rectangle pageSize = page.getPageSize();
            
            try {
                // Canvas para marca d'água (em camada separada, atrás do conteúdo)
                PdfCanvas pdfCanvas = new PdfCanvas(page.newContentStreamBefore(), page.getResources(), pdfDoc);
                
                float pageWidth = pageSize.getWidth();
                float pageHeight = pageSize.getHeight();
                float centerX = pageWidth / 2;
                float centerY = pageHeight / 2;
                
                // Forma abstrata tipo "p" amarelo/pêssego (esquerda)
                // Forma vertical com "bowl" (curva) virado para direita e "stem" (haste) para baixo
                drawAbstractPShape(pdfCanvas, centerX - 150f, centerY, 120f, WATERMARK_YELLOW, false);
                
                // Forma abstrata tipo "p" rosa/pêssego (direita)
                // Forma vertical com "bowl" (curva) virado para esquerda e "stem" (haste) para cima
                drawAbstractPShape(pdfCanvas, centerX + 50f, centerY, 120f, WATERMARK_PINK, true);
                
            } catch (Exception e) {
                log.error("Erro ao adicionar marca d'água na página {}: {}", i, e.getMessage(), e);
            }
        }
        
        log.info("Marca d'água adicionada em {} página(s) do documento", totalPages);
    }
    
    /**
     * Desenha forma abstrata tipo "p" (crescente) para marca d'água
     * Conforme modelo: formas tipo crescente com cores suaves
     * @param pdfCanvas Canvas para desenhar
     * @param x Posição X central da forma
     * @param y Posição Y central da forma
     * @param size Tamanho da forma
     * @param color Cor da forma
     * @param mirrored Se true, espelha a forma (inverte orientação)
     */
    private void drawAbstractPShape(PdfCanvas pdfCanvas, float x, float y, float size, DeviceRgb color, boolean mirrored) {
        pdfCanvas.saveState();
        
        // Criar estado gráfico com transparência para marca d'água
        PdfExtGState gs = new PdfExtGState();
        gs.setFillOpacity(0.15f); // Transparência suave para marca d'água (15% opacidade)
        pdfCanvas.setExtGState(gs);
        
        pdfCanvas.setFillColor(color);
        pdfCanvas.setStrokeColor(color);
        pdfCanvas.setLineWidth(0.5f);
        
        // Criar forma crescente abstrata usando paths
        // Baseado no modelo: formas tipo "p" com parte curva (crescente) e haste
        float width = size * 0.8f;
        float height = size * 0.7f;
        float stemWidth = size * 0.15f;
        float stemLength = size * 0.4f;
        
        if (!mirrored) {
            // Forma normal: crescente à direita, haste para baixo
            // Desenhar crescente usando path com curvas
            float centerX = x;
            float centerY = y;
            
            // Criar path para forma crescente (parte curva externa)
            pdfCanvas.moveTo(centerX + width * 0.1f, centerY - height * 0.4f);
            
            // Arco superior da crescente
            pdfCanvas.curveTo(centerX + width * 0.3f, centerY - height * 0.5f,
                            centerX + width * 0.6f, centerY - height * 0.3f,
                            centerX + width * 0.7f, centerY);
            
            // Arco inferior da crescente
            pdfCanvas.curveTo(centerX + width * 0.6f, centerY + height * 0.3f,
                            centerX + width * 0.3f, centerY + height * 0.5f,
                            centerX + width * 0.1f, centerY + height * 0.4f);
            
            // Parte interna da crescente (fechar o path)
            pdfCanvas.curveTo(centerX - width * 0.1f, centerY + height * 0.2f,
                            centerX - width * 0.15f, centerY,
                            centerX - width * 0.1f, centerY - height * 0.2f);
            pdfCanvas.curveTo(centerX, centerY - height * 0.3f,
                            centerX + width * 0.05f, centerY - height * 0.35f,
                            centerX + width * 0.1f, centerY - height * 0.4f);
            
            pdfCanvas.fill();
            
            // Desenhar haste (stem) - retângulo arredondado vertical
            float stemX = centerX - stemWidth / 2;
            float stemY = centerY - stemLength;
            pdfCanvas.roundRectangle(stemX, stemY, stemWidth, stemLength, 3f);
            pdfCanvas.fill();
            
        } else {
            // Forma espelhada: crescente à esquerda, haste para cima
            float centerX = x;
            float centerY = y;
            
            // Criar path para forma crescente invertida
            pdfCanvas.moveTo(centerX - width * 0.1f, centerY + height * 0.4f);
            
            // Arco inferior da crescente (invertido)
            pdfCanvas.curveTo(centerX - width * 0.3f, centerY + height * 0.5f,
                            centerX - width * 0.6f, centerY + height * 0.3f,
                            centerX - width * 0.7f, centerY);
            
            // Arco superior da crescente (invertido)
            pdfCanvas.curveTo(centerX - width * 0.6f, centerY - height * 0.3f,
                            centerX - width * 0.3f, centerY - height * 0.5f,
                            centerX - width * 0.1f, centerY - height * 0.4f);
            
            // Parte interna da crescente (fechar o path)
            pdfCanvas.curveTo(centerX + width * 0.1f, centerY - height * 0.2f,
                            centerX + width * 0.15f, centerY,
                            centerX + width * 0.1f, centerY + height * 0.2f);
            pdfCanvas.curveTo(centerX, centerY + height * 0.3f,
                            centerX - width * 0.05f, centerY + height * 0.35f,
                            centerX - width * 0.1f, centerY + height * 0.4f);
            
            pdfCanvas.fill();
            
            // Desenhar haste (stem) para cima
            float stemX = centerX - stemWidth / 2;
            float stemY = centerY;
            pdfCanvas.roundRectangle(stemX, stemY, stemWidth, stemLength, 3f);
            pdfCanvas.fill();
        }
        
        pdfCanvas.restoreState();
    }
}
