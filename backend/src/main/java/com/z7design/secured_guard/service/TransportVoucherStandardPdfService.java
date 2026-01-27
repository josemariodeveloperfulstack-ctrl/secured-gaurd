package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.TransportVoucherRequest;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransportVoucherStandardPdfService {

        private final StandardReportLayoutService pdfLayoutService;
        private final ExcelReportLayoutService excelLayoutService;
        private final CompanyRepository companyRepository;

        private static final String REPORT_TITLE = "Termo de Opção de Vale-Transporte";

        public byte[] generatePdf(TransportVoucherRequest request) {
                try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                        PdfWriter writer = new PdfWriter(outputStream);

                        ReportLayoutConfig config = ReportLayoutConfig.builder()
                                        .companyId(request.getCompanyId())
                                        .reportTitle(REPORT_TITLE)
                                        .includeEmailInFooter(true)
                                        .build();

                        DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
                        Document document = docWithPdf.getDocument();
                        Company company = docWithPdf.getCompany();

                        addContent(document, request, company);

                        document.close();
                        return outputStream.toByteArray();
                } catch (Exception e) {
                        log.error("Erro ao gerar PDF do Vale-Transporte", e);
                        throw new RuntimeException("Erro ao gerar PDF do Vale-Transporte", e);
                }
        }

        public byte[] generateExcel(TransportVoucherRequest request) {
                try (Workbook workbook = new XSSFWorkbook()) {
                        Sheet sheet = workbook.createSheet("Vale-Transporte");
                        Company company = companyRepository.findById(request.getCompanyId())
                                        .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

                        int startRow = excelLayoutService.addHeader(sheet, workbook, company, REPORT_TITLE);

                        // Adicionar dados principais
                        Row row = sheet.createRow(startRow);
                        row.createCell(0).setCellValue("Funcionário:");
                        row.createCell(1).setCellValue(request.getEmployeeName());

                        row = sheet.createRow(startRow + 1);
                        row.createCell(0).setCellValue("CPF:");
                        row.createCell(1).setCellValue(request.getEmployeeCpf());

                        row = sheet.createRow(startRow + 2);
                        row.createCell(0).setCellValue("Opção:");
                        row.createCell(1).setCellValue(request.isOptIn() ? "OPTANTE" : "NÃO OPTANTE");

                        // Se optante, listar rotas
                        int currentRow = startRow + 4;
                        if (request.isOptIn() && request.getRoutes() != null && !request.getRoutes().isEmpty()) {
                                Row headerRow = sheet.createRow(currentRow++);
                                headerRow.createCell(0).setCellValue("Tipo");
                                headerRow.createCell(1).setCellValue("Linha");
                                headerRow.createCell(2).setCellValue("Valor");
                                headerRow.createCell(3).setCellValue("Qtd");

                                for (TransportVoucherRequest.TransportRoute route : request.getRoutes()) {
                                        Row r = sheet.createRow(currentRow++);
                                        r.createCell(0).setCellValue(route.getType());
                                        r.createCell(1).setCellValue(route.getLine());
                                        r.createCell(2).setCellValue(route.getValue());
                                        r.createCell(3).setCellValue(route.getQuantityDaily());
                                }
                        }

                        sheet.autoSizeColumn(0);
                        sheet.autoSizeColumn(1);

                        excelLayoutService.addFooter(sheet, workbook, company);

                        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                        workbook.write(outputStream);
                        return outputStream.toByteArray();
                } catch (Exception e) {
                        log.error("Erro ao gerar Excel do Vale-Transporte", e);
                        throw new RuntimeException("Erro ao gerar Excel do Vale-Transporte", e);
                }
        }

        private void addContent(Document document, TransportVoucherRequest request, Company company) {
                // Seção: Identificação do Funcionário
                document.add(createSectionHeader("IDENTIFICAÇÃO DO FUNCIONÁRIO"));
                Table employeeTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                                .useAllAvailableWidth();
                employeeTable.addCell(createLabelValueCell("NOME:", request.getEmployeeName()));
                employeeTable.addCell(createLabelValueCell("CPF:", request.getEmployeeCpf()));
                employeeTable.addCell(createLabelValueCell("ENDEREÇO:", request.getEmployeeAddress()));
                document.add(employeeTable);

                // Seção: Opção pelo Benefício
                document.add(createSectionHeader("OPÇÃO PELO BENEFÍCIO"));
                if (request.isOptIn()) {
                        addOptInContent(document, request);
                } else {
                        addOptOutContent(document);
                }

                // Seção: Termos e Compromissos
                document.add(createSectionHeader("TERMOS E COMPROMISSOS"));
                Paragraph terms = new Paragraph()
                                .setFontSize(10f)
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(10f);

                terms.add(new Text(
                                "Eu, acima identificado, declaro ter recebido as informações sobre o benefício do Vale-Transporte (Lei nº 7.418/85) e comprometo-me a:\n\n")
                                .setFontSize(10f));
                terms.add("1. Utilizar o Vale-Transporte exclusivamente para o meu efetivo deslocamento residência-trabalho e vice-versa.\n");
                terms.add("2. Renovar anualmente ou sempre que houver alteração de endereço ou meio de transporte, minhas informações cadastrais.\n");
                terms.add("3. Autorizar o desconto em folha de pagamento de até 6% do meu salário básico, conforme legislação vigente.\n\n");
                terms.add(new Text(
                                "A falsa declaração ou o uso indevido do Vale-Transporte constituem falta grave, passível de demissão por justa causa.")
                                .setBold());
                document.add(terms);

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

        private void addSignatures(Document document, TransportVoucherRequest request, Company company) {
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
                                .add(new Paragraph(request.getEmployeeName().toUpperCase())
                                                .setTextAlignment(TextAlignment.CENTER)
                                                .setFontSize(8f).setBold())
                                .add(new Paragraph("Assinatura do Funcionário").setTextAlignment(TextAlignment.CENTER)
                                                .setFontSize(8f))
                                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);

                sigTable.addCell(cell);
                document.add(sigTable);
        }

        private void addOptInContent(Document document, TransportVoucherRequest request) {
                document.add(new Paragraph(
                                "( X ) OPTAR pelo recebimento do Vale-Transporte, informando abaixo os meios de transporte que utilizarei:")
                                .setFontSize(10f)
                                .setMarginBottom(10f));

                if (request.getRoutes() != null && !request.getRoutes().isEmpty()) {
                        Table table = new Table(UnitValue.createPercentArray(new float[] { 20, 40, 20, 20 }))
                                        .useAllAvailableWidth();

                        table.addHeaderCell(new Cell().add(new Paragraph("Tipo").setBold().setFontSize(9f)));
                        table.addHeaderCell(new Cell().add(new Paragraph("Linha / Empresa").setBold().setFontSize(9f)));
                        table.addHeaderCell(new Cell().add(new Paragraph("Tarifa (R$)").setBold().setFontSize(9f)));
                        table.addHeaderCell(new Cell().add(new Paragraph("Qtd/Dia").setBold().setFontSize(9f)));

                        for (TransportVoucherRequest.TransportRoute route : request.getRoutes()) {
                                table.addCell(new Cell()
                                                .add(new Paragraph(route.getType() != null ? route.getType() : "-")
                                                                .setFontSize(9f)));
                                table.addCell(new Cell().add(new Paragraph((route.getLine() != null ? route.getLine()
                                                : "") + " / " + (route.getCompany() != null ? route.getCompany() : ""))
                                                .setFontSize(9f)));
                                table.addCell(new Cell().add(new Paragraph(String.format("%.2f",
                                                route.getValue() != null ? route.getValue() : 0.0)).setFontSize(9f)));
                                table.addCell(new Cell().add(new Paragraph(String.valueOf(route.getQuantityDaily()))
                                                .setFontSize(9f)));
                        }
                        document.add(table);
                } else {
                        document.add(new Paragraph("(Nenhuma rota informada)")
                                        .setItalic()
                                        .setFontSize(10f)
                                        .setMarginBottom(10f));
                }
        }

        private void addOptOutContent(Document document) {
                document.add(new Paragraph("( X ) NÃO OPTAR pelo recebimento do Vale-Transporte, declarando que:")
                                .setFontSize(10f)
                                .setMarginBottom(10f));

                com.itextpdf.layout.element.List list = new com.itextpdf.layout.element.List()
                                .setSymbolIndent(12)
                                .setListSymbol("•")
                                .setFontSize(10f);
                list.add("Utilizo meios próprios de locomoção para o trabalho; ou");
                list.add("Resido próximo ao local de trabalho, não necessitando de transporte público.");
                document.add(list);
        }

        private String formatDateExtended(LocalDate date) {
                return date.format(DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy", new Locale("pt", "BR")));
        }
}
