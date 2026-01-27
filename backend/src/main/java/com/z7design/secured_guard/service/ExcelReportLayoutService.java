package com.z7design.secured_guard.service;

import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.util.CompanyDataFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.PageMargin;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URL;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Serviço para criar layout padrão de relatórios Excel com cabeçalho e rodapé
 * dinâmicos
 * baseados na empresa selecionada.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExcelReportLayoutService {

    private final CompanyRepository companyRepository;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    // Cores do gradiente (amarelo → laranja → vermelho)
    private static final String COLOR_YELLOW_HEX = "FFCC00";
    private static final String COLOR_ORANGE_HEX = "FF9900";
    private static final String COLOR_RED_HEX = "FF3333";

    // Dimensões do logo em pixels (297x217px)
    private static final int LOGO_WIDTH_PX = 297;
    private static final int LOGO_HEIGHT_PX = 217;

    /**
     * Adiciona cabeçalho padronizado ao Excel
     * Estrutura:
     * - Linha 1: Logo (altura 120px)
     * - Linha 2: Barra gradiente (altura 20px)
     * - Linha 3: Título do relatório (altura 30px)
     * - Linha 4: Nome da empresa (altura 20px)
     * - Linha 5: CNPJ (altura 15px)
     * - Linha 6: Linha em branco (altura 10px)
     * 
     * @param sheet       Planilha Excel
     * @param workbook    Workbook Excel
     * @param companyId   ID da empresa
     * @param reportTitle Título do relatório
     * @return Número da linha onde começam os dados (7)
     */
    public int addHeader(Sheet sheet, Workbook workbook, java.util.UUID companyId, String reportTitle) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada com ID: " + companyId));

        return addHeader(sheet, workbook, company, reportTitle, 5);
    }

    public int addHeader(Sheet sheet, Workbook workbook, java.util.UUID companyId, String reportTitle, int lastColumn) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada com ID: " + companyId));

        return addHeader(sheet, workbook, company, reportTitle, lastColumn);
    }

    /**
     * Adiciona cabeçalho padronizado ao Excel
     */
    public int addHeader(Sheet sheet, Workbook workbook, Company company, String reportTitle) {
        return addHeader(sheet, workbook, company, reportTitle, 5);
    }

    public int addHeader(Sheet sheet, Workbook workbook, Company company, String reportTitle, int lastColumn) {
        log.info("Adicionando cabeçalho Excel - Empresa: {}, Título: {}", company.getName(), reportTitle);

        int currentRow = 0;
        int safeLastColumn = Math.max(0, lastColumn);

        // Linha 1: Logo (altura 120px)
        Row logoRow = sheet.createRow(currentRow++);
        logoRow.setHeightInPoints(120);
        addLogo(sheet, workbook, logoRow, company);

        // Linha 2: Barra gradiente (altura 20px)
        Row gradientRow = sheet.createRow(currentRow++);
        gradientRow.setHeightInPoints(20);
        addGradientBar(workbook, gradientRow, safeLastColumn);

        // Linha 3: Título do relatório (altura 30px)
        Row titleRow = sheet.createRow(currentRow++);
        titleRow.setHeightInPoints(30);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue(reportTitle != null ? reportTitle : "Relatório");
        CellStyle titleStyle = createTitleStyle(workbook);
        titleCell.setCellStyle(titleStyle);
        sheet.addMergedRegion(new CellRangeAddress(currentRow - 1, currentRow - 1, 0, safeLastColumn));

        // Linha 4: Nome da empresa (altura 20px)
        Row companyRow = sheet.createRow(currentRow++);
        companyRow.setHeightInPoints(20);
        Cell companyCell = companyRow.createCell(0);
        companyCell.setCellValue(company.getName());
        CellStyle companyStyle = createCompanyNameStyle(workbook);
        companyCell.setCellStyle(companyStyle);
        sheet.addMergedRegion(new CellRangeAddress(currentRow - 1, currentRow - 1, 0, safeLastColumn));

        // Linha 5: CNPJ (altura 15px)
        String cnpjText = CompanyDataFormatter.formatCnpjForHeader(company);
        if (!cnpjText.isEmpty()) {
            Row cnpjRow = sheet.createRow(currentRow++);
            cnpjRow.setHeightInPoints(15);
            Cell cnpjCell = cnpjRow.createCell(0);
            cnpjCell.setCellValue(cnpjText);
            CellStyle cnpjStyle = createCnpjStyle(workbook);
            cnpjCell.setCellStyle(cnpjStyle);
            sheet.addMergedRegion(new CellRangeAddress(currentRow - 1, currentRow - 1, 0, safeLastColumn));
        }

        // Linha 6: Linha em branco (altura 10px)
        Row blankRow = sheet.createRow(currentRow++);
        blankRow.setHeightInPoints(10);

        log.info("Cabeçalho Excel adicionado. Dados começam na linha {}", currentRow);
        return currentRow; // Retorna linha onde começam os dados
    }

    /**
     * Adiciona rodapé padronizado ao Excel
     * Estrutura:
     * - Antepenúltima linha: Linha em branco
     * - Penúltima linha: Informações da empresa
     * - Última linha: Data de geração + linha gradiente
     */
    public void addFooter(Sheet sheet, Workbook workbook, Company company) {
        addFooter(sheet, workbook, company, 5);
    }

    public void addFooter(Sheet sheet, Workbook workbook, Company company, int lastColumn) {
        log.info("Adicionando rodapé Excel - Empresa: {}", company.getName());

        int lastRowNum = sheet.getLastRowNum();
        int footerStartRow = lastRowNum + 1;
        int safeLastColumn = Math.max(0, lastColumn);

        // Antepenúltima linha: Linha em branco
        Row blankRow = sheet.createRow(footerStartRow++);
        blankRow.setHeightInPoints(10);

        // Penúltima linha: Informações da empresa
        Row infoRow = sheet.createRow(footerStartRow++);
        infoRow.setHeightInPoints(20);
        Cell infoCell = infoRow.createCell(0);
        String footerText = CompanyDataFormatter.formatCompanyFooter(company, true);
        infoCell.setCellValue(footerText);
        CellStyle footerStyle = createFooterStyle(workbook);
        infoCell.setCellStyle(footerStyle);
        sheet.addMergedRegion(new CellRangeAddress(footerStartRow - 1, footerStartRow - 1, 0, safeLastColumn));

        // Última linha: Data de geração + linha gradiente
        Row dateRow = sheet.createRow(footerStartRow);
        dateRow.setHeightInPoints(20);
        Cell dateCell = dateRow.createCell(0);
        String generatedAt = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        dateCell.setCellValue("Gerado em: " + generatedAt);
        CellStyle dateStyle = createDateStyle(workbook);
        dateCell.setCellStyle(dateStyle);
        sheet.addMergedRegion(new CellRangeAddress(footerStartRow, footerStartRow, 0, safeLastColumn));

        // Adicionar linha gradiente na parte inferior (3px)
        addGradientBarAtBottom(workbook, dateRow, safeLastColumn);

        log.info("Rodapé Excel adicionado");
    }

    /**
     * Adiciona logo da empresa na primeira linha
     */
    private void addLogo(Sheet sheet, Workbook workbook, Row row, Company company) {
        if (company.getLogoUrl() == null || company.getLogoUrl().isEmpty()) {
            log.debug("Empresa {} não possui logo, pulando adição de logo", company.getName());
            return;
        }

        try {
            byte[] imageBytes = loadLogoImage(company.getLogoUrl());
            if (imageBytes == null || imageBytes.length == 0) {
                log.warn("Não foi possível carregar logo da empresa {}", company.getName());
                return;
            }

            // Criar drawing patriarch para adicionar imagem
            XSSFDrawing drawing = (XSSFDrawing) sheet.createDrawingPatriarch();

            // Criar anchor para posicionar imagem
            XSSFClientAnchor anchor = new XSSFClientAnchor(
                    0, 0, 0, 0,
                    0, row.getRowNum(), 2, row.getRowNum() + 1);
            anchor.setAnchorType(ClientAnchor.AnchorType.MOVE_AND_RESIZE);

            // Adicionar imagem
            int pictureIndex = workbook.addPicture(imageBytes, Workbook.PICTURE_TYPE_PNG);
            XSSFPicture picture = drawing.createPicture(anchor, pictureIndex);

            // Redimensionar para 297x217px mantendo proporção
            picture.resize(LOGO_WIDTH_PX, LOGO_HEIGHT_PX);

            log.info("Logo da empresa {} adicionado ao Excel", company.getName());
        } catch (Exception e) {
            log.error("Erro ao adicionar logo da empresa {}: {}", company.getName(), e.getMessage(), e);
        }
    }

    /**
     * Carrega imagem do logo
     */
    private byte[] loadLogoImage(String logoUrl) {
        try {
            if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
                // Carregar de URL
                URL url = new URL(logoUrl);
                return url.openStream().readAllBytes();
            } else {
                // Carregar de arquivo local
                java.nio.file.Path logoPath = resolveLogoPath(logoUrl);
                if (java.nio.file.Files.exists(logoPath)) {
                    return java.nio.file.Files.readAllBytes(logoPath);
                }
            }
        } catch (Exception e) {
            log.error("Erro ao carregar logo de {}: {}", logoUrl, e.getMessage());
        }
        return new byte[0];
    }

    /**
     * Resolve caminho do logo
     */
    private java.nio.file.Path resolveLogoPath(String logoUrl) {
        if (logoUrl.startsWith("/api/uploads/companies/logos/")) {
            String filename = logoUrl.replace("/api/uploads/companies/logos/", "");
            return java.nio.file.Paths.get(uploadDir, "companies", "logos", filename);
        }
        if (!logoUrl.contains("/")) {
            return java.nio.file.Paths.get(uploadDir, "companies", "logos", logoUrl);
        }
        return java.nio.file.Paths.get(uploadDir, logoUrl);
    }

    /**
     * Adiciona barra gradiente (simulada com cores sólidas)
     */
    private void addGradientBar(Workbook workbook, Row row, int lastColumn) {
        int numCells = Math.max(1, lastColumn + 1);

        for (int i = 0; i < numCells; i++) {
            Cell cell = row.createCell(i);
            CellStyle style = workbook.createCellStyle();

            String colorHex;
            if (numCells == 1) {
                colorHex = COLOR_ORANGE_HEX;
            } else {
                double progress = (double) i / (double) (numCells - 1);
                if (progress <= 0.33) {
                    colorHex = COLOR_YELLOW_HEX;
                } else if (progress <= 0.66) {
                    colorHex = COLOR_ORANGE_HEX;
                } else {
                    colorHex = COLOR_RED_HEX;
                }
            }

            XSSFCellStyle xssfStyle = (XSSFCellStyle) style;
            xssfStyle.setFillForegroundColor(new XSSFColor(hexToRgb(colorHex), null));
            xssfStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            cell.setCellStyle(style);
        }
    }

    /**
     * Adiciona linha gradiente na parte inferior do rodapé
     */
    private void addGradientBarAtBottom(Workbook workbook, Row row, int lastColumn) {
        addGradientBar(workbook, row, lastColumn);
    }

    /**
     * Converte hex para RGB
     */
    private byte[] hexToRgb(String hex) {
        int r = Integer.parseInt(hex.substring(0, 2), 16);
        int g = Integer.parseInt(hex.substring(2, 4), 16);
        int b = Integer.parseInt(hex.substring(4, 6), 16);
        return new byte[] { (byte) r, (byte) g, (byte) b };
    }

    /**
     * Cria estilo para título
     */
    private CellStyle createTitleStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 18);
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    /**
     * Cria estilo para nome da empresa
     */
    private CellStyle createCompanyNameStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 14);
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    /**
     * Cria estilo para CNPJ
     */
    private CellStyle createCnpjStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setFontHeightInPoints((short) 9);
        font.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    /**
     * Cria estilo para rodapé
     */
    private CellStyle createFooterStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setFontHeightInPoints((short) 8);
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    /**
     * Cria estilo para data
     */
    private CellStyle createDateStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setFontHeightInPoints((short) 7);
        font.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    /**
     * Configura layout de impressão com headers/footers nativos do Excel
     * Este método adiciona:
     * - Header nativo que aparece em todas as páginas impressas
     * - Footer nativo com numeração de páginas e data
     * - Repetição das linhas de cabeçalho em todas as páginas
     * - Margens de impressão adequadas
     * 
     * @param sheet       Planilha Excel
     * @param company     Empresa para exibir no header/footer
     * @param reportTitle Título do relatório
     */
    public void setupPrintLayout(Sheet sheet, Company company, String reportTitle) {
        setupPrintLayout(sheet, company, reportTitle, 6);
    }

    /**
     * Configura layout de impressão com headers/footers nativos do Excel
     * 
     * @param sheet          Planilha Excel
     * @param company        Empresa para exibir no header/footer
     * @param reportTitle    Título do relatório
     * @param headerRowCount Número de linhas do cabeçalho visual a repetir (padrão:
     *                       6)
     */
    public void setupPrintLayout(Sheet sheet, Company company, String reportTitle, int headerRowCount) {
        log.info("Configurando layout de impressão - Empresa: {}, Título: {}", company.getName(), reportTitle);

        try {
            // 1. Configurar header nativo (aparece no topo de cada página impressa)
            Header header = sheet.getHeader();

            // Formato: Título (negrito, tamanho 16) + Nome da empresa (negrito, tamanho 12)
            // + CNPJ (tamanho 10)
            String cnpjFormatted = CompanyDataFormatter.formatCnpj(company.getCnpj());
            header.setCenter(
                    "&B&16" + (reportTitle != null ? reportTitle : "Relatório") + "\n" +
                            "&B&12" + company.getName() + "\n" +
                            "&10CNPJ: " + cnpjFormatted);

            // 2. Configurar footer nativo (aparece no rodapé de cada página impressa)
            Footer footer = sheet.getFooter();

            // Esquerda: Nome da empresa em negrito
            footer.setLeft("&B" + company.getName());

            // Centro: Informações completas da empresa
            String footerInfo = CompanyDataFormatter.formatCompanyFooter(company, true);
            footer.setCenter(footerInfo);

            // Direita: Numeração de páginas e data
            footer.setRight("Página &P de &N\n&D");

            // 3. Repetir linhas de cabeçalho visual em todas as páginas impressas
            if (headerRowCount > 0) {
                sheet.setRepeatingRows(CellRangeAddress.valueOf("1:" + headerRowCount));
                log.debug("Configurado para repetir linhas 1-{} em todas as páginas", headerRowCount);
            }

            // 4. Configurar margens de impressão (em polegadas)
            sheet.setMargin(PageMargin.TOP, 0.75); // 1.9 cm
            sheet.setMargin(PageMargin.BOTTOM, 0.75); // 1.9 cm
            sheet.setMargin(PageMargin.LEFT, 0.5); // 1.27 cm
            sheet.setMargin(PageMargin.RIGHT, 0.5); // 1.27 cm
            sheet.setMargin(PageMargin.HEADER, 0.3); // 0.76 cm
            sheet.setMargin(PageMargin.FOOTER, 0.3); // 0.76 cm

            // 5. Configurar para ajustar à largura da página
            sheet.setFitToPage(true);
            PrintSetup printSetup = sheet.getPrintSetup();
            printSetup.setFitWidth((short) 1); // Ajustar à largura de 1 página
            printSetup.setFitHeight((short) 0); // Altura automática (quantas páginas forem necessárias)

            // 6. Configurar orientação (paisagem para relatórios com muitas colunas)
            // printSetup.setLandscape(true); // Descomente se necessário

            // 7. Configurar qualidade de impressão
            printSetup.setPaperSize(PrintSetup.A4_PAPERSIZE);

            log.info("Layout de impressão configurado com sucesso");

        } catch (Exception e) {
            log.error("Erro ao configurar layout de impressão: {}", e.getMessage(), e);
            // Não lançar exceção para não quebrar a geração do Excel
        }
    }

    /**
     * Configura layout de impressão usando UUID da empresa
     * 
     * @param sheet       Planilha Excel
     * @param companyId   ID da empresa
     * @param reportTitle Título do relatório
     */
    public void setupPrintLayout(Sheet sheet, java.util.UUID companyId, String reportTitle) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada com ID: " + companyId));

        setupPrintLayout(sheet, company, reportTitle);
    }
}
