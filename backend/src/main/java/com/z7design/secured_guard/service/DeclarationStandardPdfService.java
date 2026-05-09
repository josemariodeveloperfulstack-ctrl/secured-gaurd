package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.DeclarationRequest;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeclarationStandardPdfService {

    private final StandardReportLayoutService pdfLayoutService;
    private final ExcelReportLayoutService excelLayoutService;
    private final CompanyRepository companyRepository;

    public byte[] generatePdf(DeclarationRequest request) {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(outputStream);

            String title = request.getTitle() != null && !request.getTitle().isEmpty()
                    ? request.getTitle()
                    : "DECLARAÇÃO";

            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .companyId(request.getCompanyId())
                    .reportTitle(title)
                    .includeEmailInFooter(true)
                    .marginExtraTop(-35f)
                    .build();

            DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();
            Company company = docWithPdf.getCompany();

            addContent(document, request, company);

            document.close();
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF da Declaração", e);
            throw new RuntimeException("Erro ao gerar PDF da Declaração", e);
        }
    }

    public byte[] generateExcel(DeclarationRequest request) {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Declaração");
            Company company = companyRepository.findById(request.getCompanyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

            String title = request.getTitle() != null ? request.getTitle() : "Declaração";
            int startRow = excelLayoutService.addHeader(sheet, workbook, company, title);

            Row row = sheet.createRow(startRow);
            row.createCell(0).setCellValue("Para:");
            row.createCell(1).setCellValue(request.getPersonName());

            row = sheet.createRow(startRow + 1);
            row.createCell(0).setCellValue("CPF:");
            row.createCell(1).setCellValue(request.getPersonCpf());

            row = sheet.createRow(startRow + 3);
            row.createCell(0).setCellValue("Conteúdo:");
            row.createCell(1).setCellValue(request.getContent());

            sheet.autoSizeColumn(0);
            sheet.autoSizeColumn(1);

            excelLayoutService.addFooter(sheet, workbook, company);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar Excel da Declaração", e);
            throw new RuntimeException("Erro ao gerar Excel da Declaração", e);
        }
    }

    private void addContent(Document document, DeclarationRequest request, Company company) {
        // Seção: Identificação
        document.add(createSectionHeader("IDENTIFICAÇÃO"));
        Table personTable = new Table(UnitValue.createPercentArray(new float[] { 60, 40 }))
                .useAllAvailableWidth();
        personTable.addCell(createLabelValueCell("NOME:", request.getPersonName()));
        personTable.addCell(createLabelValueCell("CPF:", request.getPersonCpf()));
        personTable.addCell(createLabelValueCell("CARGO:", request.getPersonPosition()));
        personTable.addCell(createLabelValueCell("SETOR:", request.getSector()));
        document.add(personTable);

        // Seção: Conteúdo da Declaração
        document.add(createSectionHeader("CONTEÚDO DA DECLARAÇÃO"));
        Paragraph content = new Paragraph()
                .setFontSize(10f)
                .setTextAlignment(TextAlignment.JUSTIFIED)
                .setMarginBottom(15f);

        if (request.getContent() != null && !request.getContent().isEmpty()) {
            content.add(request.getContent());
        } else {
            content.add("Declaramos para os devidos fins que o Sr(a). ");
            content.add(new Text(request.getPersonName().toUpperCase()).setBold());
            content.add(", portador(a) do CPF nº ");
            content.add(new Text(request.getPersonCpf()).setBold());
            content.add(", é funcionário desta empresa");
            if (request.getPersonPosition() != null && !request.getPersonPosition().isEmpty()) {
                content.add(", exercendo o cargo de ");
                content.add(new Text(request.getPersonPosition()).setBold());
            }
            content.add(".");
        }
        document.add(content);

        Paragraph conclusion = new Paragraph("Por ser verdade, firmamos o presente.")
                .setFontSize(10f)
                .setMarginTop(10f);
        document.add(conclusion);

        // Assinaturas
        addSignatures(document, request, company);
    }

    private Cell createLabelValueCell(String label, String value) {
        Paragraph p = new Paragraph();
        p.add(new Text(label).setBold().setFontSize(9f));
        p.add(new Text(" " + (value != null && !value.isEmpty() ? value : "-")).setFontSize(10f));
        return new Cell().add(p).setPadding(5f);
    }

    private Paragraph createSectionHeader(String title) {
        return new Paragraph(title)
                .setBold()
                .setFontSize(11f)
                .setFontColor(com.itextpdf.kernel.colors.DeviceRgb.RED)
                .setMarginTop(15f)
                .setMarginBottom(5f)
                .setBorderLeft(
                        new com.itextpdf.layout.borders.SolidBorder(
                                com.itextpdf.kernel.colors.DeviceRgb.RED, 3f))
                .setPaddingLeft(5f);
    }

    private void addSignatures(Document document, DeclarationRequest request, Company company) {
        String city = request.getCity() != null ? request.getCity()
                : (company.getCity() != null ? company.getCity() : "_______________");
        String date = formatDateExtended(
                request.getDocumentDate() != null ? request.getDocumentDate() : LocalDate.now());

        Paragraph dateLoc = new Paragraph(city + ", " + date)
                .setTextAlignment(TextAlignment.RIGHT)
                .setMarginTop(30f)
                .setMarginBottom(40f)
                .setFontSize(10f);
        document.add(dateLoc);

        Table sigTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                .useAllAvailableWidth();

        Cell cell = new Cell()
                .add(new Paragraph("_________________________________")
                        .setTextAlignment(TextAlignment.CENTER))
                .add(new Paragraph(company.getName().toUpperCase())
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(8f).setBold())
                .add(new Paragraph("Emitente").setTextAlignment(TextAlignment.CENTER).setFontSize(8f))
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);

        sigTable.addCell(cell);
        document.add(sigTable);
    }

    private String formatDateExtended(LocalDate date) {
        return date.format(DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy", new Locale("pt", "BR")));
    }
}
