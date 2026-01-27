package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.DisciplinaryWarningRequest;
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
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class DisciplinaryWarningStandardPdfService {

        private final StandardReportLayoutService pdfLayoutService;
        private final ExcelReportLayoutService excelLayoutService;
        private final CompanyRepository companyRepository;

        private static final String REPORT_TITLE = "Advertência Disciplinar";

        public byte[] generatePdf(DisciplinaryWarningRequest request) {
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
                        log.error("Erro ao gerar PDF da Advertência Disciplinar", e);
                        throw new RuntimeException("Erro ao gerar PDF da Advertência Disciplinar", e);
                }
        }

        public byte[] generateExcel(DisciplinaryWarningRequest request) {
                try (Workbook workbook = new XSSFWorkbook()) {
                        Sheet sheet = workbook.createSheet("Advertência");
                        Company company = companyRepository.findById(request.getCompanyId())
                                        .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

                        int startRow = excelLayoutService.addHeader(sheet, workbook, company, REPORT_TITLE);

                        // Adicionar dados principais
                        Row row = sheet.createRow(startRow);
                        row.createCell(0).setCellValue("Funcionário:");
                        row.createCell(1).setCellValue(request.getEmployeeName());

                        row = sheet.createRow(startRow + 1);
                        row.createCell(0).setCellValue("Cargo:");
                        row.createCell(1).setCellValue(request.getEmployeePosition());

                        row = sheet.createRow(startRow + 2);
                        row.createCell(0).setCellValue("Motivo:");
                        row.createCell(1).setCellValue(request.getReason());

                        row = sheet.createRow(startRow + 3);
                        row.createCell(0).setCellValue("Data Ocorrência:");
                        if (request.getInfractionDate() != null) {
                                row.createCell(1).setCellValue(formatDateTime(request.getInfractionDate()));
                        }

                        sheet.autoSizeColumn(0);
                        sheet.autoSizeColumn(1);

                        excelLayoutService.addFooter(sheet, workbook, company);

                        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                        workbook.write(outputStream);
                        return outputStream.toByteArray();
                } catch (Exception e) {
                        log.error("Erro ao gerar Excel da Advertência Disciplinar", e);
                        throw new RuntimeException("Erro ao gerar Excel da Advertência Disciplinar", e);
                }
        }

        private void addContent(Document document, DisciplinaryWarningRequest request, Company company) {
                // Seção: Identificação do Funcionário
                document.add(createSectionHeader("IDENTIFICAÇÃO DO FUNCIONÁRIO"));
                Table employeeTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                                .useAllAvailableWidth();
                employeeTable.addCell(createLabelValueCell("NOME:", request.getEmployeeName()));
                employeeTable.addCell(createLabelValueCell("CPF:", request.getEmployeeCpf()));
                employeeTable.addCell(createLabelValueCell("CARGO:", request.getEmployeePosition()));
                document.add(employeeTable);

                // Seção: Detalhes da Ocorrência
                document.add(createSectionHeader("DETALHES DA OCORRÊNCIA"));
                Table infractionTable = new Table(UnitValue.createPercentArray(new float[] { 50, 50 }))
                                .useAllAvailableWidth();
                infractionTable.addCell(createLabelValueCell("DATA/HORA:",
                                request.getInfractionDate() != null ? formatDateTime(request.getInfractionDate())
                                                : "___/___/____ às __:__"));
                infractionTable.addCell(createLabelValueCell("LOCAL:", request.getInfractionLocation()));
                document.add(infractionTable);

                Table reasonTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                                .useAllAvailableWidth();
                reasonTable.addCell(createLabelValueCell("MOTIVO:", request.getReason()));
                document.add(reasonTable);

                // Descrição e Termos
                document.add(createSectionHeader("DESCRIÇÃO E MEDIDA DISCIPLINAR"));

                if (request.getDescription() != null && !request.getDescription().isEmpty()) {
                        document.add(new Paragraph(new Text("DESCRIÇÃO DO FATO: ").setBold().setFontSize(9f))
                                        .add(new Text(request.getDescription()).setFontSize(10f))
                                        .setTextAlignment(TextAlignment.JUSTIFIED));
                }

                Paragraph warningText = new Paragraph()
                                .setFontSize(10f)
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginTop(10f);
                warningText.add("Pela presente, aplicamos-lhe a pena de ");
                warningText.add(new Text("ADVERTÊNCIA DISCIPLINAR").setBold());
                warningText.add(" em razão da ocorrência acima descrita. Esclarecemos que a reincidência em falta desta natureza ou o cometimento de outras infrações poderá ensejar medidas disciplinares mais severas, inclusive a suspensão ou rescisão do contrato de trabalho por justa causa, conforme previsto no artigo 482 da Consolidação das Leis do Trabalho (CLT).");
                document.add(warningText);

                document.add(new Paragraph("Solicitamos que V.S.a aponha seu ciente na cópia deste documento.")
                                .setFontSize(10f)
                                .setMarginTop(10f));

                // Assinaturas
                addSignatures(document, request, company);

                // Recusa de Assinatura
                document.add(createSectionHeader("EM CASO DE RECUSA"));
                document.add(new Paragraph("Testemunhas da recusa de assinatura pelo empregado:")
                                .setFontSize(9f));

                Table witnessTable = new Table(UnitValue.createPercentArray(new float[] { 45, 10, 45 }))
                                .useAllAvailableWidth()
                                .setMarginTop(10f);

                witnessTable.addCell(createWitnessCell("Testemunha 1"));
                witnessTable.addCell(new Cell().setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
                witnessTable.addCell(createWitnessCell("Testemunha 2"));

                document.add(witnessTable);
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

        private void addSignatures(Document document, DisciplinaryWarningRequest request, Company company) {
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

        private Cell createWitnessCell(String label) {
                return new Cell()
                                .add(new Paragraph("_________________________________")
                                                .setTextAlignment(TextAlignment.CENTER))
                                .add(new Paragraph(label)
                                                .setTextAlignment(TextAlignment.CENTER)
                                                .setFontSize(8f))
                                .add(new Paragraph("CPF: __________________")
                                                .setTextAlignment(TextAlignment.CENTER)
                                                .setFontSize(8f))
                                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);
        }

        private String formatDateTime(LocalDateTime dateTime) {
                return dateTime.format(DateTimeFormatter.ofPattern("dd/MM/yyyy 'às' HH:mm"));
        }

        private String formatDateExtended(LocalDate date) {
                return date.format(DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy", new Locale("pt", "BR")));
        }
}
