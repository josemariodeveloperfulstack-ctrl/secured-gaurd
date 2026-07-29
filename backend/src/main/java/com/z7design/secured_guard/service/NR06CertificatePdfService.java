package com.z7design.secured_guard.service;

import com.itextpdf.io.image.ImageData;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.AreaBreak;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.AreaBreakType;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;

import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.repository.EmployeeRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Certificado NR-06 (2 páginas) alinhado ao modelo visual Clinimed/Promover.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NR06CertificatePdfService {

    private final EmployeeRepository employeeRepository;

    private static final DeviceRgb SAGE_GREEN = new DeviceRgb(142, 180, 150);
    private static final DeviceRgb NAVY_BLUE = new DeviceRgb(15, 59, 115);
    private static final DeviceRgb DARK_BLUE = new DeviceRgb(5, 55, 112);
    private static final DeviceRgb TITLE_ORANGE = new DeviceRgb(211, 84, 39);
    private static final DeviceRgb TEXT_DARK = new DeviceRgb(25, 45, 90);

    private static final float PAGE_W = PageSize.A4.rotate().getWidth();  // 842
    private static final float PAGE_H = PageSize.A4.rotate().getHeight(); // 595
    private static final float SIDEBAR_W = 155f;
    private static final float CONTENT_LEFT = 185f;
    private static final float CONTENT_RIGHT = 40f;

    private static final String ASSET_PROMOVER = "static/certificates/nr06/promover-logo.png";
    private static final String ASSET_CLINIMED = "static/certificates/nr06/clinimed-logo.png";
    private static final String ASSET_ASSINATURA = "static/certificates/nr06/assinatura-instrutor.png";

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public byte[] generateCertificatePdf(UUID employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Funcionário com ID " + employeeId + " não encontrado."));
        return generateCertificatePdf(employee);
    }

    public byte[] generateCertificatePdf(Employee employee) {
        String employeeName = employee.getName() != null ? employee.getName().trim().toUpperCase() : "FUNCIONÁRIO";

        String cargo = "vigilante";
        if (employee.getPosition() != null && employee.getPosition().getName() != null
                && !employee.getPosition().getName().isBlank()) {
            cargo = employee.getPosition().getName().trim().toLowerCase();
        }

        String empresa = "Promover Vigilância Patrimonial Ltda";
        if (employee.getCompany() != null && employee.getCompany().getName() != null
                && !employee.getCompany().getName().isBlank()) {
            empresa = employee.getCompany().getName().trim();
        }

        LocalDate hireDate = employee.getHireDate() != null ? employee.getHireDate() : LocalDate.now();
        String dataFormatada = hireDate.format(DATE_FORMATTER);

        log.info("📜 Gerando Certificado NR-06 em PDF (layout-modelo) para: {} (Admissão: {})",
                employeeName, dataFormatada);

        ImageData promoverLogo = loadImage(ASSET_PROMOVER);
        ImageData clinimedLogo = loadImage(ASSET_CLINIMED);
        ImageData assinaturaImg = loadImage(ASSET_ASSINATURA);

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);
            PageSize pageSize = PageSize.A4.rotate();
            pdfDoc.setDefaultPageSize(pageSize);

            Document document = new Document(pdfDoc, pageSize);
            document.setMargins(0, 0, 0, 0);

            // ================= PAGE 1 =================
            PdfPage page1 = pdfDoc.addNewPage(pageSize);
            renderCommonBackground(page1, 470f);
            renderPage1Content(document, employeeName, cargo, empresa, dataFormatada,
                    promoverLogo, clinimedLogo, assinaturaImg);

            // ================= PAGE 2 =================
            document.add(new AreaBreak(AreaBreakType.NEXT_PAGE));
            while (pdfDoc.getNumberOfPages() < 2) {
                pdfDoc.addNewPage(pageSize);
            }
            renderCommonBackground(pdfDoc.getPage(2), 470f);
            renderPage2Content(document, clinimedLogo);

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("❌ Erro ao gerar Certificado NR-06 PDF para funcionário {}", employeeName, e);
            throw new RuntimeException("Erro ao gerar certificado PDF: " + e.getMessage(), e);
        }
    }

    private void renderCommonBackground(PdfPage page, float blueBarY) {
        PdfCanvas canvas = new PdfCanvas(page);

        canvas.saveState()
                .setFillColor(SAGE_GREEN)
                .rectangle(0, 0, SIDEBAR_W, PAGE_H)
                .fill()
                .restoreState();

        canvas.saveState()
                .setFillColor(DeviceRgb.WHITE)
                .rectangle(SIDEBAR_W, 0, PAGE_W - SIDEBAR_W, PAGE_H)
                .fill()
                .restoreState();

        float barX = CONTENT_LEFT;
        float barW = PAGE_W - CONTENT_LEFT - CONTENT_RIGHT;
        canvas.saveState()
                .setFillColor(DARK_BLUE)
                .roundRectangle(barX, blueBarY, barW, 16, 8)
                .fill()
                .restoreState();
    }

    private void renderPage1Content(Document document, String employeeName, String cargo, String empresa,
                                    String dataAdmissao, ImageData promoverLogo, ImageData clinimedLogo,
                                    ImageData assinaturaImg) {
        // Cabeçalho: CERTIFICADO centralizado + logo Promover à direita
        Table header = new Table(UnitValue.createPercentArray(new float[]{22, 56, 22}))
                .useAllAvailableWidth()
                .setMarginLeft(CONTENT_LEFT)
                .setMarginRight(CONTENT_RIGHT)
                .setMarginTop(28);

        header.addCell(new Cell().setBorder(null));

        header.addCell(new Cell()
                .add(new Paragraph("CERTIFICADO")
                        .setFontSize(30)
                        .setBold()
                        .setFontColor(NAVY_BLUE)
                        .setCharacterSpacing(3.5f)
                        .setTextAlignment(TextAlignment.CENTER))
                .setBorder(null)
                .setVerticalAlignment(VerticalAlignment.MIDDLE));

        Cell logoCell = new Cell().setBorder(null).setTextAlignment(TextAlignment.RIGHT);
        if (promoverLogo != null) {
            Image logo = new Image(promoverLogo).setMaxHeight(58).setMaxWidth(155)
                    .setHorizontalAlignment(HorizontalAlignment.RIGHT);
            logoCell.add(logo);
        } else {
            logoCell.add(new Paragraph()
                    .add(new Text("Promover").setBold().setFontSize(16).setFontColor(new DeviceRgb(210, 30, 30)))
                    .add(new Text("\nVigilância Patrimonial - LTDA").setFontSize(8).setFontColor(new DeviceRgb(200, 150, 0)))
                    .setTextAlignment(TextAlignment.RIGHT));
        }
        header.addCell(logoCell);
        document.add(header);

        // Espaço após a barra azul (barra desenhada em y=470 ≈ ~95pt abaixo do topo)
        document.add(new Paragraph("\n").setMarginTop(42));

        Paragraph p1 = new Paragraph()
                .setMarginLeft(CONTENT_LEFT)
                .setMarginRight(55)
                .setFontSize(13f)
                .setFontColor(TEXT_DARK)
                .setFixedLeading(21f)
                .add("Certificamos que ")
                .add(new Text(employeeName).setBold().setFontSize(13.5f))
                .add(" empregado da empresa ")
                .add(new Text(empresa).setBold())
                .add(", cargo " + cargo + ", participou do treinamento ")
                .add(new Text("NR 06 Equipamentos de Proteção Individual e Riscos Ocupacionais").setBold())
                .add(", conforme estabelecido na Portaria 3214/78, da Secretaria de Segurança e Saúde do Trabalho do MTE, com carga horária de 03 horas.");
        document.add(p1);

        Paragraph p2 = new Paragraph()
                .setMarginLeft(CONTENT_LEFT + 30)
                .setMarginRight(55)
                .setMarginTop(18)
                .setFontSize(12.5f)
                .setFontColor(TEXT_DARK)
                .setFixedLeading(20f)
                .add("O treinamento foi realizado no endereço, Rua Gilda Maria da Silva, 972, Bairro Eldorado – Contagem/MG, em ")
                .add(new Text(dataAdmissao).setBold())
                .add(" pela Moraes e Quintão Clinica Medica Ltda.");
        document.add(p2);

        // Assinaturas: carimbo (imagem) + rótulo em texto PDF (nunca corta)
        Table sigTable = new Table(UnitValue.createPercentArray(new float[]{58, 42}))
                .useAllAvailableWidth()
                .setMarginLeft(CONTENT_LEFT)
                .setMarginRight(45)
                .setMarginTop(42);

        Cell instrutorCell = new Cell().setBorder(null).setPadding(0)
                .setPaddingRight(6)
                .setVerticalAlignment(VerticalAlignment.BOTTOM);
        if (assinaturaImg != null) {
            instrutorCell.add(new Image(assinaturaImg)
                    .setMaxHeight(58)
                    .setMaxWidth(320)
                    .setHorizontalAlignment(HorizontalAlignment.LEFT));
        } else {
            instrutorCell
                    .add(new Paragraph("Alexsandro Cirino Taveira")
                            .setItalic().setFontSize(9.5f).setFontColor(TEXT_DARK).setMarginBottom(0))
                    .add(new Paragraph("Eng.º de Segurança do Trabalho\nCREA-MG 119986-D")
                            .setFontSize(8f).setFontColor(TEXT_DARK))
                    .add(new Paragraph("")
                            .setBorderBottom(new SolidBorder(DARK_BLUE, 1.4f))
                            .setMarginTop(2).setMarginBottom(2)
                            .setWidth(UnitValue.createPercentValue(95)));
        }
        instrutorCell.add(new Paragraph("Instrutor/Responsável Técnico")
                .setBold()
                .setFontSize(10f)
                .setFontColor(NAVY_BLUE)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(4));

        Cell funcCell = new Cell().setBorder(null).setPaddingBottom(4)
                .setVerticalAlignment(VerticalAlignment.BOTTOM);
        funcCell.add(new Paragraph(employeeName)
                .setBold()
                .setFontSize(11f)
                .setFontColor(NAVY_BLUE)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(2));
        funcCell.add(new Paragraph("")
                .setBorderBottom(new SolidBorder(DARK_BLUE, 1.6f))
                .setMarginTop(36)
                .setWidth(UnitValue.createPercentValue(90))
                .setHorizontalAlignment(HorizontalAlignment.CENTER));

        sigTable.addCell(instrutorCell);
        sigTable.addCell(funcCell);
        document.add(sigTable);

        addFooter(document, clinimedLogo, 22);
    }

    private void renderPage2Content(Document document, ImageData clinimedLogo) {
        // Título laranja (acima da barra)
        document.add(new Paragraph("Conteúdo Programático")
                .setFontSize(28)
                .setBold()
                .setFontColor(TITLE_ORANGE)
                .setMarginLeft(CONTENT_LEFT)
                .setMarginTop(30)
                .setMarginBottom(0));

        // Espaço para a barra azul desenhada no canvas (~y=470)
        document.add(new Paragraph("\n").setMarginTop(18));

        // Subtítulo azul sublinhado (abaixo da barra)
        document.add(new Paragraph("Conteúdo Programático")
                .setFontSize(16)
                .setBold()
                .setUnderline()
                .setFontColor(NAVY_BLUE)
                .setMarginLeft(CONTENT_LEFT)
                .setMarginTop(8)
                .setMarginBottom(8));

        Table contentTable = new Table(UnitValue.createPercentArray(new float[]{48, 52}))
                .useAllAvailableWidth()
                .setMarginLeft(CONTENT_LEFT)
                .setMarginRight(CONTENT_RIGHT)
                .setMarginTop(6);

        Cell leftCol = new Cell().setBorder(null);
        String[] itemsLeft = {
                "Definições da norma Regulamentadora (NR6);",
                "Uso adequado, guarda e conservação do EPI;",
                "Obrigatoriedade do uso;",
                "Responsabilidades do empregador;",
                "Responsabilidades do empregado;",
                "Responsabilidades do fabricante;",
                "Ficha de controle e distribuição do EPI;",
                "Certificado de Aprovação (CA);",
                "Tipos de EPI e sua aplicação;",
                "Higienização do EPI;",
                "Proteção dos olhos;",
                "Proteção da pele;",
                "Utilização do protetor solar;",
                "Proteção dos membros superiores e tórax;",
                "Proteção dos membros inferiores;",
                "Proteção contra quedas com diferença de nível;",
                "Proteção respiratória;"
        };
        for (String item : itemsLeft) {
            leftCol.add(new Paragraph("➢  " + item)
                    .setFontSize(8.5f)
                    .setFontColor(TEXT_DARK)
                    .setMarginBottom(1.2f)
                    .setFixedLeading(11f));
        }

        Cell rightCol = new Cell().setBorder(null);
        String[] itemsRight = {
                "Tipos de respiradores;",
                "Proteção auditiva;",
                "Tipos de protetores auditivos;",
                "Limite de tolerância ao ruído;",
                "Durabilidade dos EPI's;",
                "Periodicidade da troca dos EPI's;",
                "Definição de risco e perigo, orientação e conscientização dos riscos ocupacionais, tipos de riscos ocupacionais, formas de controle e mitigação dos riscos, uso de EPI conforme cargo e função."
        };
        for (String item : itemsRight) {
            rightCol.add(new Paragraph("➢  " + item)
                    .setFontSize(8.5f)
                    .setFontColor(TEXT_DARK)
                    .setMarginBottom(2f)
                    .setFixedLeading(11f));
        }

        contentTable.addCell(leftCol);
        contentTable.addCell(rightCol);
        document.add(contentTable);

        addFooter(document, clinimedLogo, 18);
    }

    private void addFooter(Document document, ImageData clinimedLogo, float marginTop) {
        Table footer = new Table(UnitValue.createPercentArray(new float[]{68, 32}))
                .useAllAvailableWidth()
                .setMarginLeft(CONTENT_LEFT)
                .setMarginRight(CONTENT_RIGHT)
                .setMarginTop(marginTop);

        footer.addCell(new Cell()
                .add(new Paragraph("Rua Gilda Maria da Silva (antiga Flamboyant), 972, Bairro Eldorado, Contagem/MG (31) 2567 – 1077")
                        .setFontSize(8f)
                        .setFontColor(NAVY_BLUE))
                .setBorder(null)
                .setVerticalAlignment(VerticalAlignment.MIDDLE));

        Cell right = new Cell().setBorder(null).setTextAlignment(TextAlignment.RIGHT)
                .setVerticalAlignment(VerticalAlignment.MIDDLE);
        if (clinimedLogo != null) {
            right.add(new Image(clinimedLogo).setMaxHeight(36).setMaxWidth(130)
                    .setHorizontalAlignment(HorizontalAlignment.RIGHT));
        } else {
            right.add(new Paragraph()
                    .add(new Text("CLINIMED ").setBold().setFontSize(12).setFontColor(new DeviceRgb(0, 150, 120)))
                    .add(new Text("CONTAGEM").setFontSize(8).setFontColor(new DeviceRgb(100, 100, 100)))
                    .setTextAlignment(TextAlignment.RIGHT));
        }
        footer.addCell(right);
        document.add(footer);
    }

    private ImageData loadImage(String classpath) {
        try {
            ClassPathResource resource = new ClassPathResource(classpath);
            if (!resource.exists()) {
                log.warn("Asset NR-06 não encontrado: {}", classpath);
                return null;
            }
            try (InputStream in = resource.getInputStream()) {
                return ImageDataFactory.create(in.readAllBytes());
            }
        } catch (Exception e) {
            log.warn("Falha ao carregar asset NR-06 {}: {}", classpath, e.getMessage());
            return null;
        }
    }
}
