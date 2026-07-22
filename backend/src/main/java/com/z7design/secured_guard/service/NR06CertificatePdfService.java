package com.z7design.secured_guard.service;

import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.AreaBreak;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.AreaBreakType;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;

import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.repository.EmployeeRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Serviço responsável por gerar o Certificado de Treinamento NR-06
 * em formato PDF com 2 páginas conforme especificação visual.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NR06CertificatePdfService {

    private final EmployeeRepository employeeRepository;

    private static final DeviceRgb SAGE_GREEN = new DeviceRgb(142, 180, 150); // #8eb896
    private static final DeviceRgb NAVY_BLUE = new DeviceRgb(15, 59, 115);   // #0f3b73
    private static final DeviceRgb DARK_BLUE = new DeviceRgb(5, 55, 112);    // #053770
    private static final DeviceRgb TITLE_ORANGE = new DeviceRgb(211, 84, 39); // #d35427
    private static final DeviceRgb TEXT_DARK = new DeviceRgb(40, 40, 40);

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /**
     * Gera o PDF do certificado NR-06 para um determinado funcionário.
     */
    public byte[] generateCertificatePdf(UUID employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Funcionário com ID " + employeeId + " não encontrado."));
        return generateCertificatePdf(employee);
    }

    /**
     * Gera o PDF do certificado NR-06 a partir da entidade Employee.
     */
    public byte[] generateCertificatePdf(Employee employee) {
        String employeeName = employee.getName() != null ? employee.getName().trim().toUpperCase() : "FUNCIONÁRIO";
        
        String cargo = "vigilante";
        if (employee.getPosition() != null && employee.getPosition().getName() != null && !employee.getPosition().getName().isBlank()) {
            cargo = employee.getPosition().getName().trim().toLowerCase();
        }

        String empresa = "Promover Vigilância Patrimonial Ltda";
        if (employee.getCompany() != null && employee.getCompany().getName() != null && !employee.getCompany().getName().isBlank()) {
            empresa = employee.getCompany().getName().trim();
        }

        LocalDate hireDate = employee.getHireDate() != null ? employee.getHireDate() : LocalDate.now();
        String dataFormatada = hireDate.format(DATE_FORMATTER);

        log.info("📜 Gerando Certificado NR-06 em PDF para: {} (Admissão: {})", employeeName, dataFormatada);

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);
            pdfDoc.setDefaultPageSize(PageSize.A4.rotate()); // 842 x 595 pt

            Document document = new Document(pdfDoc, PageSize.A4.rotate());
            document.setMargins(0, 0, 0, 0);

            // ================= PAGE 1: CERTIFICADO =================
            renderPage1Background(pdfDoc, 1);
            renderPage1Content(document, employeeName, cargo, empresa, dataFormatada);

            // ================= PAGE 2: CONTEÚDO PROGRAMÁTICO =================
            document.add(new AreaBreak(AreaBreakType.NEXT_PAGE));
            renderPage2Background(pdfDoc, 2);
            renderPage2Content(document);

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("❌ Erro ao gerar Certificado NR-06 PDF para funcionário {}", employeeName, e);
            throw new RuntimeException("Erro ao gerar certificado PDF: " + e.getMessage(), e);
        }
    }

    // ------------------------------------------------------------------------
    // PAGE 1 HELPERS
    // ------------------------------------------------------------------------

    private void renderPage1Background(PdfDocument pdfDoc, int pageNum) {
        PdfCanvas canvas = new PdfCanvas(pdfDoc.getPage(pageNum));

        // Faixa verde lateral esquerda (0 a 160pt)
        canvas.saveState()
              .setFillColor(SAGE_GREEN)
              .rectangle(0, 0, 165, 595)
              .fill()
              .restoreState();

        // Fundo branco do corpo do documento (165 a 842pt)
        canvas.saveState()
              .setFillColor(DeviceRgb.WHITE)
              .rectangle(165, 0, 677, 595)
              .fill()
              .restoreState();

        // Barra divisória azul arredondada
        canvas.saveState()
              .setFillColor(DARK_BLUE)
              .roundRectangle(190, 465, 530, 18, 9)
              .fill()
              .restoreState();

        // Linha da assinatura esquerda
        canvas.saveState()
              .setStrokeColor(DARK_BLUE)
              .setLineWidth(1.2f)
              .moveTo(210, 175)
              .lineTo(440, 175)
              .stroke()
              .restoreState();

        // Linha da assinatura direita (Funcionário)
        canvas.saveState()
              .setStrokeColor(DARK_BLUE)
              .setLineWidth(1.5f)
              .moveTo(510, 175)
              .lineTo(760, 175)
              .stroke()
              .restoreState();
    }

    private void renderPage1Content(Document document, String employeeName, String cargo, String empresa, String dataAdmissao) {
        // Tabela do Cabeçalho: Título Certificado à esquerda, Logo Promover à direita
        Table headerTable = new Table(UnitValue.createPercentArray(new float[]{65, 35}))
                .useAllAvailableWidth()
                .setMarginLeft(190)
                .setMarginRight(40)
                .setMarginTop(35);

        Cell titleCell = new Cell()
                .add(new Paragraph("C E R T I F I C A D O")
                        .setFontSize(28)
                        .setBold()
                        .setFontColor(NAVY_BLUE))
                .setBorder(null);

        // Logo text/simulado Promover Vigilância Patrimonial
        Cell logoCell = new Cell()
                .add(new Paragraph()
                        .add(new Text("P").setFontSize(26).setBold().setFontColor(new DeviceRgb(210, 30, 30)))
                        .add(new Text("romover\n").setFontSize(22).setBold().setFontColor(new DeviceRgb(210, 30, 30)))
                        .add(new Text("Vigilância Patrimonial - LTDA").setFontSize(9).setBold().setFontColor(new DeviceRgb(220, 160, 0)))
                        .setTextAlignment(TextAlignment.RIGHT))
                .setBorder(null);

        headerTable.addCell(titleCell);
        headerTable.addCell(logoCell);
        document.add(headerTable);

        // Espaçamento até o texto principal
        Paragraph spaceBefore = new Paragraph("").setMarginTop(50);
        document.add(spaceBefore);

        // Parágrafo Principal 1
        Paragraph p1 = new Paragraph()
                .setMarginLeft(190)
                .setMarginRight(55)
                .setFontSize(13.5f)
                .setFontColor(TEXT_DARK)
                .setFixedLeading(22f)
                .add("Certificamos que ")
                .add(new Text(employeeName).setBold().setFontSize(14.5f))
                .add(" empregado da empresa ")
                .add(new Text(empresa).setBold())
                .add(", cargo " + cargo + ", participou do treinamento ")
                .add(new Text("NR 06 Equipamentos de Proteção Individual e Riscos Ocupacionais").setBold())
                .add(", conforme estabelecido na Portaria 3214/78, da Secretaria de Segurança e Saúde do Trabalho do MTE, com carga horária de 03 horas.");

        document.add(p1);

        // Parágrafo Principal 2
        Paragraph p2 = new Paragraph()
                .setMarginLeft(250)
                .setMarginRight(55)
                .setMarginTop(25)
                .setFontSize(13f)
                .setFontColor(TEXT_DARK)
                .setFixedLeading(20f)
                .add("O treinamento foi realizado no endereço, Rua Gilda Maria da Silva, 972, Bairro Eldorado – Contagem/MG, em ")
                .add(new Text(dataAdmissao).setBold())
                .add(" pela Moraes e Quintão Clinica Medica Ltda.");

        document.add(p2);

        // Bloco de Assinaturas
        Table sigTable = new Table(UnitValue.createPercentArray(new float[]{50, 50}))
                .useAllAvailableWidth()
                .setMarginLeft(190)
                .setMarginRight(50)
                .setMarginTop(70);

        // Assinatura Instrutor (Esquerda)
        Cell instrutorCell = new Cell()
                .add(new Paragraph("Alexsandro Cirino Taveira\n").setBold().setFontSize(10f).setItalic().setFontColor(TEXT_DARK))
                .add(new Paragraph("Eng.º de Segurança do Trabalho\nCREA-MG 119986-D").setFontSize(8.5f).setFontColor(TEXT_DARK))
                .add(new Paragraph("Instrutor/Responsável Técnico").setBold().setFontSize(10f).setFontColor(NAVY_BLUE))
                .setBorder(null)
                .setTextAlignment(TextAlignment.CENTER);

        // Assinatura Funcionário (Direita)
        Cell funcCell = new Cell()
                .add(new Paragraph("\n\n"))
                .add(new Paragraph(employeeName).setBold().setFontSize(11f).setFontColor(NAVY_BLUE))
                .setBorder(null)
                .setTextAlignment(TextAlignment.CENTER);

        sigTable.addCell(instrutorCell);
        sigTable.addCell(funcCell);
        document.add(sigTable);

        // Rodapé da Página 1
        Table footerTable = new Table(UnitValue.createPercentArray(new float[]{70, 30}))
                .useAllAvailableWidth()
                .setMarginLeft(190)
                .setMarginRight(40)
                .setMarginTop(30);

        Cell footerLeft = new Cell()
                .add(new Paragraph("Rua Gilda Maria da Silva (antiga Flamboyant),972,Bairro Eldorado,Contagem/MG (31) 2567 – 1077")
                        .setFontSize(8.5f)
                        .setFontColor(NAVY_BLUE))
                .setBorder(null);

        Cell footerRight = new Cell()
                .add(new Paragraph()
                        .add(new Text("CLINIMED ").setFontSize(12).setBold().setFontColor(new DeviceRgb(0, 130, 130)))
                        .add(new Text("CONTAGEM").setFontSize(8).setFontColor(new DeviceRgb(100, 100, 100)))
                        .setTextAlignment(TextAlignment.RIGHT))
                .setBorder(null);

        footerTable.addCell(footerLeft);
        footerTable.addCell(footerRight);
        document.add(footerTable);
    }

    // ------------------------------------------------------------------------
    // PAGE 2 HELPERS
    // ------------------------------------------------------------------------

    private void renderPage2Background(PdfDocument pdfDoc, int pageNum) {
        PdfCanvas canvas = new PdfCanvas(pdfDoc.getPage(pageNum));

        // Faixa verde lateral esquerda
        canvas.saveState()
              .setFillColor(SAGE_GREEN)
              .rectangle(0, 0, 165, 595)
              .fill()
              .restoreState();

        // Fundo branco
        canvas.saveState()
              .setFillColor(DeviceRgb.WHITE)
              .rectangle(165, 0, 677, 595)
              .fill()
              .restoreState();

        // Barra divisória azul arredondada
        canvas.saveState()
              .setFillColor(DARK_BLUE)
              .roundRectangle(190, 465, 530, 18, 9)
              .fill()
              .restoreState();
    }

    private void renderPage2Content(Document document) {
        // Cabeçalho da Página 2: "Conteúdo Programático" em Laranja Terracota
        Paragraph h1 = new Paragraph("Conteúdo Programático")
                .setFontSize(28)
                .setBold()
                .setFontColor(TITLE_ORANGE)
                .setMarginLeft(190)
                .setMarginTop(35);
        document.add(h1);

        // Subtítulo em Azul Sublinhado
        Paragraph h2 = new Paragraph("Conteúdo Programático")
                .setFontSize(18)
                .setBold()
                .setUnderline()
                .setFontColor(NAVY_BLUE)
                .setMarginLeft(190)
                .setMarginTop(35);
        document.add(h2);

        // Tabela de 2 Colunas com os itens do Conteúdo Programático
        Table contentTable = new Table(UnitValue.createPercentArray(new float[]{48, 52}))
                .useAllAvailableWidth()
                .setMarginLeft(190)
                .setMarginRight(40)
                .setMarginTop(12);

        // Coluna Esquerda
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
                    .setMarginBottom(1.5f));
        }

        // Coluna Direita
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
                    .setMarginBottom(2.5f));
        }

        contentTable.addCell(leftCol);
        contentTable.addCell(rightCol);
        document.add(contentTable);

        // Rodapé da Página 2
        Table footerTable = new Table(UnitValue.createPercentArray(new float[]{70, 30}))
                .useAllAvailableWidth()
                .setMarginLeft(190)
                .setMarginRight(40)
                .setMarginTop(30);

        Cell footerLeft = new Cell()
                .add(new Paragraph("Rua Gilda Maria da Silva (antiga Flamboyant),972,Bairro Eldorado,Contagem/MG (31) 2567 – 1077")
                        .setFontSize(8.5f)
                        .setFontColor(NAVY_BLUE))
                .setBorder(null);

        Cell footerRight = new Cell()
                .add(new Paragraph()
                        .add(new Text("CLINIMED ").setFontSize(12).setBold().setFontColor(new DeviceRgb(0, 130, 130)))
                        .add(new Text("CONTAGEM").setFontSize(8).setFontColor(new DeviceRgb(100, 100, 100)))
                        .setTextAlignment(TextAlignment.RIGHT))
                .setBorder(null);

        footerTable.addCell(footerLeft);
        footerTable.addCell(footerRight);
        document.add(footerTable);
    }
}
