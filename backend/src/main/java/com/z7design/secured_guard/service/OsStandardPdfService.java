package com.z7design.secured_guard.service;

import com.itextpdf.io.image.ImageData;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.List;
import com.itextpdf.layout.element.ListItem;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import com.z7design.secured_guard.dto.OperationalServiceOrderRequest;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.SafetyEngineer;
import com.z7design.secured_guard.repository.SafetyEngineerRepository;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import com.z7design.secured_guard.util.EmployeeDocumentDateResolver;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
@Slf4j
public class OsStandardPdfService {

        private final EmployeeDocumentDateResolver documentDateResolver;
        private final StandardReportLayoutService pdfLayoutService;
        private final SafetyEngineerRepository safetyEngineerRepository;

        @Value("${app.upload.base-dir:uploads}")
        private String uploadBaseDir;

        private static final String ASSET_CARIMBO = "static/certificates/os/carimbo-engenheiro-sst.png";
        private static final String ASSET_PROMOVER = "static/certificates/nr06/promover-logo.png";
        private static final DeviceRgb NAVY = new DeviceRgb(15, 59, 115);

        public OsStandardPdfService(EmployeeDocumentDateResolver documentDateResolver,
                        StandardReportLayoutService pdfLayoutService,
                        SafetyEngineerRepository safetyEngineerRepository) {
                this.documentDateResolver = documentDateResolver;
                this.pdfLayoutService = pdfLayoutService;
                this.safetyEngineerRepository = safetyEngineerRepository;
        }

        public byte[] generatePdf(OperationalServiceOrderRequest request) {
                LocalDate documentDate = documentDateResolver.resolveDocumentDateOrToday(
                                request.getEmployeeId(), request.getDocumentDate());
                request.setDocumentDate(documentDate);
                try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                        PdfWriter writer = new PdfWriter(outputStream);
                        var configBuilder = ReportLayoutConfig.builder()
                                        .companyId(request.getCompanyId())
                                        // Título/cabeçalho padrão removidos: a OS tem cabeçalho próprio (logo | título | carimbo)
                                        .reportTitle(null)
                                        .showHeader(false)
                                        .showFooterContentSeparator(true)
                                        .includeEmailInFooter(true)
                                        .topMargin(20f)
                                        .marginExtraTop(0f)
                                        .bottomMargin(52f)
                                        .leftMargin(24f)
                                        .rightMargin(24f);
                        documentDateResolver.applyAdmissionDateFooter(configBuilder, request.getEmployeeId());
                        ReportLayoutConfig config = configBuilder.build();

                        DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
                        Document document = docWithPdf.getDocument();
                        Company company = docWithPdf.getCompany();

                        addContent(document, request, company);

                        return docWithPdf.closeAndGetPdfBytes(outputStream, pdfLayoutService);
                } catch (Exception e) {
                        log.error("Erro ao gerar PDF da OS Operacional", e);
                        throw new RuntimeException("Erro ao gerar PDF da OS Operacional", e);
                }
        }

        private void addContent(Document document, OperationalServiceOrderRequest request, Company company) {
                // Coluna obrigatória do carimbo SST (modelo OS 01) — usa profissional/carimbo selecionado quando houver
                addOs01HeaderWithStamp(document, company, request);

                String introText = "Conforme estabelecido no item 1.7, letra \"b\", NR-01 da Portaria 3214/MTE, cabe ao empregador elaborar Ordem de Serviço (OS) sobre Segurança e Medicina do Trabalho, dando ciência aos empregados.";
                document.add(new Paragraph(introText)
                                .setFontSize(8f)
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setFontColor(ColorConstants.BLACK)
                                .setMultipliedLeading(1.05f)
                                .setMarginBottom(4f));

                String companyName = company != null && company.getName() != null
                                ? company.getName().toUpperCase()
                                : "PROMOVER VIGILANCIA PATRIMONIAL LTDA";

                if (isVigilante(request)) {
                        addVigilanteOs01AdminBlock(document, request, companyName);
                } else {
                        addCompactIdentificationBlock(document, request, companyName);
                }

                addSectionHeader(document, "OBRIGAÇÕES DO EMPREGADO");
                document.add(buildEmployeeObligationsList(request).setMarginBottom(4f));

                addSection(document, "ATIVIDADES HABITUAIS", safeStr(request.getActivities()));
                addSection(document, "RISCOS", safeStr(request.getRisks()));
                addSection(document, "MEDIDAS PREVENTIVAS PARA REALIZAÇÃO DAS ATIVIDADES",
                                safeStr(request.getPreventiveMeasures()));

                String uniformSectionTitle = request.getUniformSectionTitle();
                if (uniformSectionTitle == null || uniformSectionTitle.isBlank()) {
                        uniformSectionTitle = "EPI DE USO OBRIGATÓRIO";
                }
                addSection(document, uniformSectionTitle.toUpperCase(), safeStr(request.getUniform()));
                addSection(document, "TREINAMENTOS OBRIGATÓRIOS", safeStr(request.getMandatoryTrainings()));

                String warningText1 = "O descumprimento desta Ordem de Serviço caracteriza ato de indisciplina do empregado. Permitindo aplicar as penalidades que a critério da empresa poderá ser advertência verbal por escrito e até rescisão de contrato de trabalho por justa causa, independentemente de outras medidas de ordem jurídicas aplicáveis no art. 158 da CLT, norma regulamentadora nº 01 da portaria 3214/78 (subitens 1.8 e 1.8.1).";
                String warningText2 = "Declara o empregado que recebeu cópia da presente Ordem de Serviço, que fica em seu poder passando o original a fazer parte do seu contrato de trabalho, para todos os fins previstos em lei.";

                document.add(new Paragraph(warningText1).setFontSize(7f).setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(2f).setMultipliedLeading(1.05f));
                document.add(new Paragraph(warningText2).setFontSize(7f).setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(4f).setMultipliedLeading(1.05f));

                addSignatures(document, request, company);
        }

        /**
         * Identificação do empregado em layout compacto (2 colunas) para caber em uma página.
         */
        private void addCompactIdentificationBlock(Document document, OperationalServiceOrderRequest request,
                        String companyName) {
                Table identificationTable = new Table(UnitValue.createPercentArray(new float[] { 50, 50 }))
                                .useAllAvailableWidth()
                                .setMarginBottom(6f);

                // Empresa em largura total (rowspan=1, colspan=2)
                Cell empresaCell = new Cell(1, 2)
                                .add(boldParagraph("EMPRESA: " + companyName))
                                .setPadding(3f)
                                .setBorder(new SolidBorder(ColorConstants.BLACK, 0.5f));
                identificationTable.addCell(empresaCell);

                identificationTable.addCell(contentCell(
                                "NOME DO EMPREGADO: " + safeStr(request.getEmployeeName()).toUpperCase(), true)
                                .setBorder(new SolidBorder(ColorConstants.BLACK, 0.5f)));
                identificationTable.addCell(contentCell(
                                "CARGO: " + safeStr(request.getEmployeePosition()).toUpperCase(), true)
                                .setBorder(new SolidBorder(ColorConstants.BLACK, 0.5f)));
                identificationTable.addCell(contentCell(
                                "SETOR: " + safeStr(request.getSector()).toUpperCase(), true)
                                .setBorder(new SolidBorder(ColorConstants.BLACK, 0.5f)));
                identificationTable.addCell(contentCell(
                                "DATA DE ADMISSÃO: " + formatDate(resolveHireDate(request)), true)
                                .setBorder(new SolidBorder(ColorConstants.BLACK, 0.5f)));

                document.add(identificationTable);
        }

        private Paragraph boldParagraph(String text) {
                return new Paragraph(text).setFontSize(7.5f).setBold().setMultipliedLeading(1.05f);
        }

        /**
         * Cabeçalho OS 01 em 3 colunas: logo/NR-01 | ORDEM DE SERVIÇO | carimbo SST (obrigatório).
         * Preferência: safetyEngineerId / stampImageUrl do request; depois padrão da empresa; fallback asset.
         */
        private void addOs01HeaderWithStamp(Document document, Company company,
                        OperationalServiceOrderRequest request) {
                Table header = new Table(UnitValue.createPercentArray(new float[] { 28, 36, 36 }))
                                .useAllAvailableWidth()
                                .setMarginBottom(4f);

                // Coluna 1: Logo Promover + NR 01
                Cell left = new Cell()
                                .setBorder(new SolidBorder(NAVY, 0.8f))
                                .setPadding(4f)
                                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                                .setTextAlignment(TextAlignment.CENTER);
                ImageData promover = loadImage(ASSET_PROMOVER);
                if (promover != null) {
                        left.add(new Image(promover).setMaxHeight(36).setMaxWidth(100)
                                        .setHorizontalAlignment(HorizontalAlignment.CENTER));
                } else {
                        left.add(new Paragraph("PROMOVER")
                                        .setBold().setFontSize(11f).setFontColor(new DeviceRgb(200, 30, 30))
                                        .setTextAlignment(TextAlignment.CENTER));
                }
                left.add(new Paragraph("NR 01 Disposições Gerais")
                                .setFontSize(7.5f).setBold().setFontColor(NAVY)
                                .setTextAlignment(TextAlignment.CENTER)
                                .setMarginTop(2f));
                header.addCell(left);

                // Coluna 2: título
                Cell center = new Cell()
                                .setBorder(new SolidBorder(NAVY, 0.8f))
                                .setPadding(4f)
                                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                                .add(new Paragraph("ORDEM DE SERVIÇO")
                                                .setBold()
                                                .setFontSize(14f)
                                                .setFontColor(NAVY)
                                                .setTextAlignment(TextAlignment.CENTER));
                header.addCell(center);

                // Coluna 3: carimbo obrigatório (sem contorno na imagem)
                Cell stampCell = new Cell()
                                .setBorder(new SolidBorder(NAVY, 0.8f))
                                .setPadding(3f)
                                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                                .setTextAlignment(TextAlignment.CENTER);
                stampCell.add(new Paragraph("Saúde e Segurança do trabalho")
                                .setBold()
                                .setFontSize(7.5f)
                                .setFontColor(NAVY)
                                .setTextAlignment(TextAlignment.CENTER)
                                .setMarginBottom(1f));

                SafetyEngineer engineer = resolveSafetyEngineer(company, request);
                ImageData carimbo = null;
                if (request != null && request.getStampImageUrl() != null && !request.getStampImageUrl().isBlank()) {
                        carimbo = loadStampFromUrl(request.getStampImageUrl().trim());
                }
                if (carimbo == null) {
                        carimbo = loadEngineerStamp(engineer);
                }

                if (carimbo != null) {
                        stampCell.add(new Image(carimbo)
                                        .setBorder(Border.NO_BORDER)
                                        .setMaxHeight(58)
                                        .setMaxWidth(160)
                                        .setHorizontalAlignment(HorizontalAlignment.CENTER));
                } else if (engineer != null) {
                        stampCell.add(new Paragraph(engineer.getName() != null ? engineer.getName() : "Profissional SST")
                                        .setBold().setFontSize(8f).setTextAlignment(TextAlignment.CENTER));
                        stampCell.add(new Paragraph(professionalTypeLabel(engineer))
                                        .setFontSize(7f).setTextAlignment(TextAlignment.CENTER));
                        if (engineer.getCreaNumber() != null) {
                                stampCell.add(new Paragraph(engineer.getCreaNumber())
                                                .setFontSize(7f).setTextAlignment(TextAlignment.CENTER));
                        }
                }
                header.addCell(stampCell);

                document.add(header);
        }

        private SafetyEngineer resolveSafetyEngineer(Company company, OperationalServiceOrderRequest request) {
                try {
                        if (request != null) {
                                if (request.getSafetyEngineerId() != null) {
                                        return safetyEngineerRepository.findById(request.getSafetyEngineerId()).orElse(null);
                                }
                                // Quando não selecionado na requisição, respeita a escolha do usuário e não busca engenheiro padrão
                                return null;
                        }
                        if (company != null && company.getSafetyEngineerId() != null) {
                                return safetyEngineerRepository.findById(company.getSafetyEngineerId()).orElse(null);
                        }
                        return null;
                } catch (Exception e) {
                        log.warn("Não foi possível resolver profissional de SST: {}", e.getMessage());
                        return null;
                }
        }

        private ImageData loadEngineerStamp(SafetyEngineer engineer) {
                if (engineer == null || engineer.getStampImageUrl() == null || engineer.getStampImageUrl().isBlank()) {
                        return null;
                }
                return loadStampFromUrl(engineer.getStampImageUrl().trim());
        }

        private ImageData loadStampFromUrl(String url) {
                if (url == null || url.isBlank()) {
                        return null;
                }
                try {
                        String relative = url;
                        int idx = url.indexOf("/uploads/");
                        if (idx >= 0) {
                                relative = url.substring(idx + "/uploads/".length());
                        } else if (url.startsWith("/api/uploads/")) {
                                relative = url.substring("/api/uploads/".length());
                        }
                        Path path = Paths.get(uploadBaseDir).resolve(relative).normalize();
                        if (Files.exists(path)) {
                                return createStampImageData(Files.readAllBytes(path));
                        }
                        log.warn("Arquivo de carimbo não encontrado em disco: {}", path);
                } catch (Exception e) {
                        log.warn("Falha ao carregar carimbo {}: {}", url, e.getMessage());
                }
                return null;
        }

        private String professionalTypeLabel(SafetyEngineer engineer) {
                if (engineer.getProfessionalType() == null) {
                        return "Profissional de SST";
                }
                return switch (engineer.getProfessionalType()) {
                        case ENGENHEIRO_SEGURANCA -> "Engenheiro de Segurança do Trabalho";
                        case TECNICO_SEGURANCA -> "Técnico de Segurança do Trabalho";
                        case MEDICO_TRABALHO -> "Médico do Trabalho";
                        default -> "Profissional de SST";
                };
        }

        private ImageData loadImage(String classpath) {
                try {
                        ClassPathResource resource = new ClassPathResource(classpath);
                        if (!resource.exists()) {
                                return null;
                        }
                        try (InputStream in = resource.getInputStream()) {
                                byte[] bytes = in.readAllBytes();
                                if (classpath.contains("carimbo")) {
                                        return createStampImageData(bytes);
                                }
                                return ImageDataFactory.create(bytes);
                        }
                } catch (Exception e) {
                        log.warn("Falha ao carregar imagem {}: {}", classpath, e.getMessage());
                        return null;
                }
        }

        /**
         * Cria ImageData do carimbo removendo contorno/moldura preta retangular, se houver.
         */
        private ImageData createStampImageData(byte[] bytes) {
                try {
                        BufferedImage src = ImageIO.read(new ByteArrayInputStream(bytes));
                        if (src == null) {
                                return ImageDataFactory.create(bytes);
                        }
                        BufferedImage stripped = stripRectangularBlackBorder(src);
                        ByteArrayOutputStream baos = new ByteArrayOutputStream();
                        ImageIO.write(stripped, "png", baos);
                        return ImageDataFactory.create(baos.toByteArray());
                } catch (Exception e) {
                        log.debug("Não foi possível remover contorno do carimbo, usando original: {}", e.getMessage());
                        try {
                                return ImageDataFactory.create(bytes);
                        } catch (Exception ex) {
                                return null;
                        }
                }
        }

        /**
         * Remove moldura preta nas bordas da imagem (comum em carimbos digitalizados),
         * inclusive quando há margem branca antes do contorno.
         */
        private BufferedImage stripRectangularBlackBorder(BufferedImage src) {
                int w = src.getWidth();
                int h = src.getHeight();
                if (w < 20 || h < 20) {
                        return src;
                }

                int maxScan = Math.min(40, Math.min(w, h) / 4);

                int top = findBorderInsetFromTop(src, w, h, maxScan);
                int bottom = findBorderInsetFromBottom(src, w, h, maxScan);
                int left = findBorderInsetFromLeft(src, w, h, maxScan);
                int right = findBorderInsetFromRight(src, w, h, maxScan);

                // Só considera moldura se detectar contorno em pelo menos 3 lados
                int sidesFound = 0;
                if (top > 0 || isMostlyDarkBorderRow(src, top, w)) {
                        // top==0 e linha 0 escura também conta
                        if (isMostlyDarkBorderRow(src, top, w)) {
                                sidesFound++;
                        } else {
                                top = 0;
                        }
                }
                if (isMostlyDarkBorderRow(src, h - 1 - bottom, w)) {
                        sidesFound++;
                } else {
                        bottom = 0;
                }
                if (isMostlyDarkBorderCol(src, left, h)) {
                        sidesFound++;
                } else {
                        left = 0;
                }
                if (isMostlyDarkBorderCol(src, w - 1 - right, h)) {
                        sidesFound++;
                } else {
                        right = 0;
                }

                if (sidesFound < 3) {
                        return src;
                }

                // Inclui a espessura da linha do contorno (até 4px) no recorte
                top = Math.min(h / 3, top + borderThicknessDown(src, top, w));
                bottom = Math.min(h / 3, bottom + borderThicknessUp(src, h - 1 - bottom, w));
                left = Math.min(w / 3, left + borderThicknessRight(src, left, h));
                right = Math.min(w / 3, right + borderThicknessLeft(src, w - 1 - right, h));

                int newW = w - left - right;
                int newH = h - top - bottom;
                if (newW < 10 || newH < 10) {
                        return src;
                }

                BufferedImage cropped = new BufferedImage(newW, newH, BufferedImage.TYPE_INT_ARGB);
                Graphics2D g = cropped.createGraphics();
                g.drawImage(src, 0, 0, newW, newH, left, top, left + newW, top + newH, null);
                g.dispose();
                return cropped;
        }

        private int findBorderInsetFromTop(BufferedImage img, int w, int h, int maxScan) {
                for (int y = 0; y < maxScan; y++) {
                        if (isMostlyDarkBorderRow(img, y, w)) {
                                return y;
                        }
                }
                return 0;
        }

        private int findBorderInsetFromBottom(BufferedImage img, int w, int h, int maxScan) {
                for (int i = 0; i < maxScan; i++) {
                        if (isMostlyDarkBorderRow(img, h - 1 - i, w)) {
                                return i;
                        }
                }
                return 0;
        }

        private int findBorderInsetFromLeft(BufferedImage img, int w, int h, int maxScan) {
                for (int x = 0; x < maxScan; x++) {
                        if (isMostlyDarkBorderCol(img, x, h)) {
                                return x;
                        }
                }
                return 0;
        }

        private int findBorderInsetFromRight(BufferedImage img, int w, int h, int maxScan) {
                for (int i = 0; i < maxScan; i++) {
                        if (isMostlyDarkBorderCol(img, w - 1 - i, h)) {
                                return i;
                        }
                }
                return 0;
        }

        private int borderThicknessDown(BufferedImage img, int startY, int w) {
                int t = 0;
                while (t < 5 && startY + t < img.getHeight() && isMostlyDarkBorderRow(img, startY + t, w)) {
                        t++;
                }
                return t;
        }

        private int borderThicknessUp(BufferedImage img, int startY, int w) {
                int t = 0;
                while (t < 5 && startY - t >= 0 && isMostlyDarkBorderRow(img, startY - t, w)) {
                        t++;
                }
                return t;
        }

        private int borderThicknessRight(BufferedImage img, int startX, int h) {
                int t = 0;
                while (t < 5 && startX + t < img.getWidth() && isMostlyDarkBorderCol(img, startX + t, h)) {
                        t++;
                }
                return t;
        }

        private int borderThicknessLeft(BufferedImage img, int startX, int h) {
                int t = 0;
                while (t < 5 && startX - t >= 0 && isMostlyDarkBorderCol(img, startX - t, h)) {
                        t++;
                }
                return t;
        }

        private boolean isMostlyDarkBorderRow(BufferedImage img, int y, int w) {
                int dark = 0;
                int sampleStep = Math.max(1, w / 80);
                int samples = 0;
                for (int x = 0; x < w; x += sampleStep) {
                        samples++;
                        if (isDarkBorderPixel(img.getRGB(x, y))) {
                                dark++;
                        }
                }
                return samples > 0 && (dark * 1.0 / samples) >= 0.55;
        }

        private boolean isMostlyDarkBorderCol(BufferedImage img, int x, int h) {
                int dark = 0;
                int sampleStep = Math.max(1, h / 40);
                int samples = 0;
                for (int y = 0; y < h; y += sampleStep) {
                        samples++;
                        if (isDarkBorderPixel(img.getRGB(x, y))) {
                                dark++;
                        }
                }
                return samples > 0 && (dark * 1.0 / samples) >= 0.55;
        }

        private boolean isDarkBorderPixel(int argb) {
                int a = (argb >>> 24) & 0xFF;
                if (a < 40) {
                        return false;
                }
                int r = (argb >>> 16) & 0xFF;
                int g = (argb >>> 8) & 0xFF;
                int b = argb & 0xFF;
                return r < 70 && g < 70 && b < 70;
        }

        /** Bloco administrativo fixo do modelo OS 01 Vigilante — só nome/cargo/setor/admissão variam. */
        private void addVigilanteOs01AdminBlock(Document document, OperationalServiceOrderRequest request,
                        String companyName) {
                Table adminTable = new Table(UnitValue.createPercentArray(new float[] { 100 })).useAllAvailableWidth();
                adminTable.addCell(contentCell("Empresa: " + companyName, true));
                adminTable.addCell(contentCell(
                                "Área de atuação: Atividades de vigilância e segurança privada.    CNAE: 80.11-1-01.    Grau de risco: 01 (Um).",
                                false));
                adminTable.addCell(contentCell(
                                "Serviço a ser executado: Prestação de serviços de vigilância patrimonial.",
                                false));
                document.add(adminTable.setMarginBottom(0f));

                Table adminRow = new Table(UnitValue.createPercentArray(new float[] { 34, 33, 33 }))
                                .useAllAvailableWidth();
                adminRow.addCell(contentCell("Número de empregados contratados: 03 (TRES)", false));
                adminRow.addCell(contentCell(
                                "Data de Admissão: " + formatDate(resolveHireDate(request)), true));
                adminRow.addCell(contentCell("Setor: " + safeStr(request.getSector()).toUpperCase(), true));
                document.add(adminRow.setMarginBottom(6f));

                Table identificationTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                                .useAllAvailableWidth();
                identificationTable.addCell(contentCell(
                                "NOME DO EMPREGADO: " + safeStr(request.getEmployeeName()).toUpperCase(), true));
                identificationTable.addCell(contentCell(
                                "CARGO: " + safeStr(request.getEmployeePosition()).toUpperCase(), true));
                document.add(identificationTable.setMarginBottom(10f));
        }

        private boolean isVigilante(OperationalServiceOrderRequest request) {
                String haystack = (safeStr(request.getEmployeePosition()) + " "
                                + safeStr(request.getResponsibility()) + " "
                                + safeStr(request.getServiceType()))
                                .toUpperCase()
                                .replace('Á', 'A').replace('Ã', 'A').replace('Â', 'A')
                                .replace('É', 'E').replace('Ê', 'E')
                                .replace('Í', 'I')
                                .replace('Ó', 'O').replace('Ô', 'O').replace('Õ', 'O')
                                .replace('Ú', 'U').replace('Ç', 'C');
                return haystack.contains("VIGILANTE") || haystack.contains("VIGILANCIA");
        }

        /** Data de admissão do funcionário (fallback: data do documento). */
        private LocalDate resolveHireDate(OperationalServiceOrderRequest request) {
                if (request.getHireDate() != null) {
                        return request.getHireDate();
                }
                return request.getDocumentDate();
        }

        private List buildEmployeeObligationsList(OperationalServiceOrderRequest request) {
                List list = new List()
                        .setSymbolIndent(6)
                        .setListSymbol("•")
                        .setFontSize(7.5f)
                        .setMarginTop(0f)
                        .setMarginBottom(0f);

                String custom = request.getEmployeeObligations();
                if (custom != null && !custom.isBlank()) {
                        for (String rawLine : custom.split("\\r?\\n")) {
                                String line = rawLine.trim();
                                if (line.isEmpty()) {
                                        continue;
                                }
                                if (line.startsWith("•")) {
                                        line = line.substring(1).trim();
                                }
                                if (line.startsWith("-")) {
                                        line = line.substring(1).trim();
                                }
                                if (!line.endsWith(";") && !line.endsWith(".")) {
                                        line = line + ";";
                                }
                                list.add(new ListItem(line));
                        }
                        return list;
                }

                list.add(new ListItem("Cumprir todas as normas expedidas pelo Empregador, inclusive esta ordem de serviço;"));
                list.add(new ListItem("Executar as tarefas que lhe forem delegadas após treinamento específico para execução da mesma;"));
                list.add(new ListItem("Manter a ordem, disciplina, higiene e segurança no trabalho;"));
                list.add(new ListItem("Participar de treinamentos relacionados à segurança e saúde ocupacional;"));
                list.add(new ListItem("Usar obrigatoriamente os Equipamentos de Proteção Individual indicado para a função;"));
                list.add(new ListItem("Colaborar com a empresa na aplicação das Normas Regulamentadoras – NR's. (PPRA – PCMSO);"));
                list.add(new ListItem("É responsabilidade do empregado usar, guardar, conservar e comunicar ao empregador qualquer alteração que torne impróprio o uso do Equipamento de Proteção Individual."));
                return list;
        }

        private void addSection(Document document, String title, String body) {
                addSectionHeader(document, title);
                document.add(buildParagraphOrList(body));
        }

        private void addSectionHeader(Document document, String title) {
                document.add(new Paragraph(title)
                                .setBold()
                                .setFontSize(8.5f)
                                .setTextAlignment(TextAlignment.CENTER)
                                .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY)
                                .setPadding(2f)
                                .setMarginTop(2f)
                                .setMarginBottom(2f));
        }

        private com.itextpdf.layout.element.IBlockElement buildParagraphOrList(String rawText) {
                String value = safeStr(rawText);
                String[] lines = value.split("\\r?\\n");
                boolean looksLikeList = false;
                for (String rawLine : lines) {
                        String line = rawLine.trim();
                        if (line.startsWith("-") || line.startsWith("•")) {
                                looksLikeList = true;
                                break;
                        }
                }

                if (!looksLikeList) {
                        return new Paragraph(value)
                                        .setFontSize(7.5f)
                                        .setTextAlignment(TextAlignment.JUSTIFIED)
                                        .setMultipliedLeading(1.05f)
                                        .setMarginBottom(4f);
                }

                List list = new List().setSymbolIndent(6).setListSymbol("•").setFontSize(7.5f).setMarginBottom(4f);
                for (String rawLine : lines) {
                        String line = rawLine.trim();
                        if (line.isEmpty()) {
                                continue;
                        }
                        if (line.startsWith("-") || line.startsWith("•")) {
                                line = line.substring(1).trim();
                        }
                        list.add(new ListItem(line));
                }
                return list;
        }

        private Cell contentCell(String text, boolean bold) {
                Paragraph paragraph = new Paragraph(text).setFontSize(7.5f).setMultipliedLeading(1.05f);
                if (bold) {
                        paragraph.setBold();
                }
                return new Cell().add(paragraph).setPadding(3f);
        }

        private String safeStr(String str) {
                return str != null && !str.trim().isEmpty() ? str : "-";
        }

        private void addSignatures(Document document, OperationalServiceOrderRequest request, Company company) {
                String city = request.getCity() != null ? request.getCity()
                                : (company != null && company.getCity() != null ? company.getCity() : "Contagem");
                // Rodapé do modelo: data de admissão do funcionário
                String date = formatDate(resolveHireDate(request));

                document.add(new Paragraph("De acordo: ____________________________________________________")
                                .setMarginTop(4f)
                                .setMarginBottom(6f)
                                .setFontSize(8.5f));

                Paragraph dateLoc = new Paragraph(city + ", " + date)
                                .setTextAlignment(TextAlignment.LEFT)
                                .setMarginTop(0f)
                                .setMarginBottom(2f)
                                .setFontSize(8.5f)
                                .setBold();
                document.add(dateLoc);
        }

        private String formatDate(LocalDate date) {
                if (date == null)
                        return "__/__/____";
                return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
}
