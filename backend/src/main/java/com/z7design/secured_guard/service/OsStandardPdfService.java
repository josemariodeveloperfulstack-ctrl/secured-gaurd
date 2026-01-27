package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.OperationalServiceOrderRequest;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import com.z7design.secured_guard.util.CompanyDataFormatter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
@Slf4j
public class OsStandardPdfService {

        private final StandardReportLayoutService pdfLayoutService;

        public OsStandardPdfService(StandardReportLayoutService pdfLayoutService) {
                this.pdfLayoutService = pdfLayoutService;
        }

        private static final String REPORT_TITLE = "ORDEM DE SERVIÇO OPERACIONAL";

        public byte[] generatePdf(OperationalServiceOrderRequest request) {
                try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                        PdfWriter writer = new PdfWriter(outputStream);

                        ReportLayoutConfig config = ReportLayoutConfig.builder()
                                        .companyId(request.getCompanyId())
                                        .reportTitle(REPORT_TITLE)
                                        .includeEmailInFooter(true)
                                        .marginExtraTop(20f)
                                        .build();

                        DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
                        Document document = docWithPdf.getDocument();
                        Company company = docWithPdf.getCompany();

                        addContent(document, request, company);

                        document.close();
                        return outputStream.toByteArray();
                } catch (Exception e) {
                        log.error("Erro ao gerar PDF da OS Operacional", e);
                        throw new RuntimeException("Erro ao gerar PDF da OS Operacional", e);
                }
        }

        private void addContent(Document document, OperationalServiceOrderRequest request, Company company) {
                // Status e Prioridade (Tabela superior)
                Table statusTable = new Table(UnitValue.createPercentArray(new float[] { 50, 50 }))
                                .useAllAvailableWidth();
                statusTable.setMarginBottom(20f);

                statusTable.addCell(createLabelValueCell("STATUS:", request.getStatus()));
                statusTable.addCell(createLabelValueCell("PRIORIDADE:", request.getPriority()));

                document.add(statusTable);

                // Empresa Prestadora
                document.add(createSectionHeader("EMPRESA PRESTADORA DO SERVIÇO"));
                Table companyTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                                .useAllAvailableWidth();
                companyTable.addCell(createLabelValueCell("RAZÃO SOCIAL:", company.getName()));
                companyTable.addCell(createLabelValueCell("CNPJ:", CompanyDataFormatter.formatCnpj(company.getCnpj())));
                companyTable.addCell(
                                createLabelValueCell("ENDEREÇO:", CompanyDataFormatter.formatFullAddress(company)));
                document.add(companyTable);

                // Cliente
                document.add(createSectionHeader("CLIENTE"));
                Table clientTable = new Table(UnitValue.createPercentArray(new float[] { 100 })).useAllAvailableWidth();
                clientTable.addCell(createLabelValueCell("NOME/RAZÃO SOCIAL:", request.getClientName()));
                clientTable.addCell(createLabelValueCell("ENDEREÇO DO CLIENTE:", request.getClientAddress()));
                document.add(clientTable);

                // Responsável pela Execução
                document.add(createSectionHeader("RESPONSÁVEL PELA EXECUÇÃO"));
                Table execTable = new Table(UnitValue.createPercentArray(new float[] { 50, 50 }))
                                .useAllAvailableWidth();
                execTable.addCell(createLabelValueCell("NOME:", request.getEmployeeName()));
                execTable.addCell(createLabelValueCell("CPF:", request.getEmployeeCpf()));
                execTable.addCell(createLabelValueCell("CARGO:", request.getEmployeePosition()));
                execTable.addCell(createLabelValueCell("SETOR:", request.getSector()));
                document.add(execTable);

                // Detalhes do Serviço
                document.add(createSectionHeader("DETALHES DO SERVIÇO"));
                Table serviceTable = new Table(UnitValue.createPercentArray(new float[] { 50, 50 }))
                                .useAllAvailableWidth();
                serviceTable.addCell(createLabelValueCell("TIPO DE SERVIÇO:", request.getServiceType()));
                serviceTable.addCell(createLabelValueCell("LOCAL DO SERVIÇO:", request.getLocation()));

                String periodo = String.format("%s a %s",
                                formatDate(request.getStartDate()),
                                request.getEndDate() != null ? formatDate(request.getEndDate()) : "Indeterminado");
                serviceTable.addCell(createLabelValueCell("PERÍODO:", periodo));

                String horario = String.format("%s às %s",
                                request.getStartTime() != null ? request.getStartTime() : "--:--",
                                request.getEndTime() != null ? request.getEndTime() : "--:--");
                serviceTable.addCell(createLabelValueCell("HORÁRIO:", horario));
                document.add(serviceTable);

                // Descrição
                if (request.getDescription() != null && !request.getDescription().isEmpty()) {
                        document.add(new Paragraph(new Text("DESCRIÇÃO DO SERVIÇO:").setBold()).setFontSize(10f)
                                        .setMarginTop(10f));
                        document.add(
                                        new Paragraph(request.getDescription()).setFontSize(10f)
                                                        .setTextAlignment(TextAlignment.JUSTIFIED));
                }

                // Observações
                if (request.getObservations() != null && !request.getObservations().isEmpty()) {
                        document.add(new Paragraph(new Text("OBSERVAÇÕES:").setBold()).setFontSize(10f)
                                        .setMarginTop(10f));
                        document.add(new Paragraph(request.getObservations()).setFontSize(10f)
                                        .setTextAlignment(TextAlignment.JUSTIFIED));
                }

                // Assinaturas
                addSignatures(document, request, company);
        }

        private Cell createLabelValueCell(String label, String value) {
                Paragraph p = new Paragraph();
                p.add(new Text(label).setBold().setFontSize(9f));
                p.add(new Text(" " + (value != null ? value : "-")).setFontSize(10f));
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

        private void addSignatures(Document document, OperationalServiceOrderRequest request, Company company) {
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
                                .add(new Paragraph("Emitente").setTextAlignment(TextAlignment.CENTER).setFontSize(8f))
                                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);

                Cell spacer = new Cell().setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);

                Cell cell2 = new Cell()
                                .add(new Paragraph("_________________________________")
                                                .setTextAlignment(TextAlignment.CENTER))
                                .add(new Paragraph(request.getEmployeeName().toUpperCase())
                                                .setTextAlignment(TextAlignment.CENTER)
                                                .setFontSize(8f).setBold())
                                .add(new Paragraph("Executante").setTextAlignment(TextAlignment.CENTER).setFontSize(8f))
                                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);

                sigTable.addCell(cell1);
                sigTable.addCell(spacer);
                sigTable.addCell(cell2);

                document.add(sigTable);
        }

        private String formatDate(LocalDate date) {
                if (date == null)
                        return "__/__/____";
                return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }

        private String formatDateExtended(LocalDate date) {
                return date.format(DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy", new Locale("pt", "BR")));
        }
}
