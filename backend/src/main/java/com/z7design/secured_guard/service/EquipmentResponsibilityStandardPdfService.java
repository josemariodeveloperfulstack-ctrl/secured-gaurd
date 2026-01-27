package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.EquipmentResponsibilityRequest;
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
public class EquipmentResponsibilityStandardPdfService {

        private final StandardReportLayoutService pdfLayoutService;
        private final ExcelReportLayoutService excelLayoutService;
        private final CompanyRepository companyRepository;

        private static final String REPORT_TITLE = "Termo de Responsabilidade - Equipamentos";

        public byte[] generatePdf(EquipmentResponsibilityRequest request) {
                try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                        PdfWriter writer = new PdfWriter(outputStream);

                        String title = request.getReportTitle() != null && !request.getReportTitle().isEmpty()
                                        ? request.getReportTitle()
                                        : REPORT_TITLE;

                        ReportLayoutConfig config = ReportLayoutConfig.builder()
                                        .companyId(request.getCompanyId())
                                        .reportTitle(title)
                                        .includeEmailInFooter(true)
                                        .build();

                        DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
                        Document document = docWithPdf.getDocument();
                        Company company = docWithPdf.getCompany();

                        addContent(document, request, company);

                        document.close();
                        return outputStream.toByteArray();
                } catch (Exception e) {
                        log.error("Erro ao gerar PDF do Termo de Equipamento", e);
                        throw new RuntimeException("Erro ao gerar PDF do Termo de Equipamento", e);
                }
        }

        public byte[] generateExcel(EquipmentResponsibilityRequest request) {
                try (Workbook workbook = new XSSFWorkbook()) {
                        Sheet sheet = workbook.createSheet("Equipamentos");
                        Company company = companyRepository.findById(request.getCompanyId())
                                        .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

                        int startRow = excelLayoutService.addHeader(sheet, workbook, company, REPORT_TITLE);

                        // Dados Principais
                        Row row = sheet.createRow(startRow);
                        row.createCell(0).setCellValue("Funcionário:");
                        row.createCell(1).setCellValue(request.getEmployeeName());

                        row = sheet.createRow(startRow + 1);
                        row.createCell(0).setCellValue("CPF:");
                        row.createCell(1).setCellValue(request.getEmployeeCpf());

                        // Equipamentos
                        int currentRow = startRow + 3;
                        if (request.getEquipments() != null && !request.getEquipments().isEmpty()) {
                                Row headerRow = sheet.createRow(currentRow++);
                                headerRow.createCell(0).setCellValue("Item");
                                headerRow.createCell(1).setCellValue("Descrição");
                                headerRow.createCell(2).setCellValue("Identificador");
                                headerRow.createCell(3).setCellValue("Estado");
                                headerRow.createCell(4).setCellValue("Valor");

                                for (EquipmentResponsibilityRequest.EquipmentItem item : request.getEquipments()) {
                                        Row r = sheet.createRow(currentRow++);
                                        r.createCell(0).setCellValue(item.getName());
                                        r.createCell(1).setCellValue(item.getDescription());
                                        r.createCell(2).setCellValue(item.getIdentifier());
                                        r.createCell(3).setCellValue(item.getState());
                                        r.createCell(4).setCellValue(item.getValue() != null ? item.getValue() : 0.0);
                                }
                        }

                        sheet.autoSizeColumn(0);
                        sheet.autoSizeColumn(1);

                        excelLayoutService.addFooter(sheet, workbook, company);

                        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                        workbook.write(outputStream);
                        return outputStream.toByteArray();
                } catch (Exception e) {
                        log.error("Erro ao gerar Excel do Termo de Equipamento", e);
                        throw new RuntimeException("Erro ao gerar Excel do Termo de Equipamento", e);
                }
        }

        private void addContent(Document document, EquipmentResponsibilityRequest request, Company company) {
                // Seção: Identificação do Funcionário
                document.add(createSectionHeader("IDENTIFICAÇÃO DO FUNCIONÁRIO"));
                Table employeeTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                                .useAllAvailableWidth();
                employeeTable.addCell(createLabelValueCell("NOME:", request.getEmployeeName()));
                employeeTable.addCell(createLabelValueCell("CPF:", request.getEmployeeCpf()));
                document.add(employeeTable);

                // Seção: Equipamentos Entregues
                document.add(createSectionHeader("EQUIPAMENTOS ENTREGUES"));
                if (request.getEquipments() != null && !request.getEquipments().isEmpty()) {
                        Table table = new Table(UnitValue.createPercentArray(new float[] { 20, 30, 20, 15, 15 }))
                                        .useAllAvailableWidth()
                                        .setMarginBottom(15f);

                        table.addHeaderCell(new Cell().add(new Paragraph("Item").setBold().setFontSize(9f)));
                        table.addHeaderCell(new Cell().add(new Paragraph("Descrição").setBold().setFontSize(9f)));
                        table.addHeaderCell(new Cell().add(new Paragraph("Identificador").setBold().setFontSize(9f)));
                        table.addHeaderCell(new Cell().add(new Paragraph("Estado").setBold().setFontSize(9f)));
                        table.addHeaderCell(new Cell().add(new Paragraph("Valor (Est.)").setBold().setFontSize(9f)));

                        for (EquipmentResponsibilityRequest.EquipmentItem item : request.getEquipments()) {
                                table.addCell(new Cell()
                                                .add(new Paragraph(item.getName() != null ? item.getName() : "-")
                                                                .setFontSize(9f)));
                                table.addCell(new Cell().add(new Paragraph(
                                                item.getDescription() != null ? item.getDescription() : "-")
                                                .setFontSize(9f)));
                                table.addCell(new Cell().add(
                                                new Paragraph(item.getIdentifier() != null ? item.getIdentifier() : "-")
                                                                .setFontSize(9f)));
                                table.addCell(new Cell()
                                                .add(new Paragraph(item.getState() != null ? item.getState() : "-")
                                                                .setFontSize(9f)));
                                table.addCell(new Cell().add(new Paragraph(
                                                item.getValue() != null ? String.format("R$ %.2f", item.getValue())
                                                                : "-")
                                                .setFontSize(9f)));
                        }
                        document.add(table);
                } else {
                        document.add(new Paragraph("(Nenhum equipamento listado)").setItalic()
                                        .setTextAlignment(TextAlignment.CENTER).setFontSize(10f).setMarginBottom(15f));
                }

                // Seção: Termos e Compromissos
                document.add(createSectionHeader("TERMOS E COMPROMISSOS"));
                Paragraph terms = new Paragraph()
                                .setFontSize(10f)
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(10f);

                terms.add(new Text(
                                "Eu, acima identificado, declaro ter recebido os itens descritos, para uso exclusivo no desempenho de minhas funções. Declaro estar ciente de que:\n\n")
                                .setFontSize(10f));

                if (request.getReportTitle() != null
                                && request.getReportTitle().toUpperCase().contains("VALE-TRANSPORTE")) {
                        terms.add("1. O cartão é de uso pessoal e intransferível, destinado exclusivamente para o deslocamento residência-trabalho e vice-versa.\n");
                        terms.add("2. A guarda e conservação do cartão são de minha inteira responsabilidade, devendo informar imediatamente qualquer perda ou extravio para bloqueio.\n");
                        terms.add("3. O uso indevido do benefício ou a comercialização do saldo constitui falta grave, passível de rescisão por justa causa (Art. 482 da CLT).");
                } else {
                        terms.add("1. Os itens são de propriedade da empresa e deverão ser devolvidos imediatamente quando solicitados ou no término do contrato de trabalho.\n");
                        terms.add("2. Sou responsável pela guarda e conservação dos mesmos, devendo comunicar imediatamente qualquer defeito ou perda.\n");
                        terms.add("3. Em caso de dano, extravio ou furto por dolo ou culpa, autorizo o desconto correspondente em minha folha de pagamento (Art. 462 §1º da CLT).");
                }
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

        private void addSignatures(Document document, EquipmentResponsibilityRequest request, Company company) {
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

                Table sigTable = new Table(UnitValue.createPercentArray(new float[] { 45, 10, 45 }))
                                .useAllAvailableWidth();

                Cell cell1 = new Cell()
                                .add(new Paragraph("_________________________________")
                                                .setTextAlignment(TextAlignment.CENTER))
                                .add(new Paragraph(company.getName().toUpperCase())
                                                .setTextAlignment(TextAlignment.CENTER)
                                                .setFontSize(8f).setBold())
                                .add(new Paragraph("Empregador").setTextAlignment(TextAlignment.CENTER).setFontSize(8f))
                                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);

                Cell spacer = new Cell().setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);

                Cell cell2 = new Cell()
                                .add(new Paragraph("_________________________________")
                                                .setTextAlignment(TextAlignment.CENTER))
                                .add(new Paragraph(request.getEmployeeName().toUpperCase())
                                                .setTextAlignment(TextAlignment.CENTER)
                                                .setFontSize(8f).setBold())
                                .add(new Paragraph("Empregado").setTextAlignment(TextAlignment.CENTER).setFontSize(8f))
                                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);

                sigTable.addCell(cell1);
                sigTable.addCell(spacer);
                sigTable.addCell(cell2);

                document.add(sigTable);
        }

        private String formatDateExtended(LocalDate date) {
                return date.format(DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy", new Locale("pt", "BR")));
        }
}
