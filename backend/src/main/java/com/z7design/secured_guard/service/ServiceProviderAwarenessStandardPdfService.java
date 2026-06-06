package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.ServiceProviderAwarenessRequest;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.util.EmployeeDocumentDateResolver;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import com.z7design.secured_guard.util.CompanyDataFormatter;
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
public class ServiceProviderAwarenessStandardPdfService {

        private final StandardReportLayoutService pdfLayoutService;
        private final ExcelReportLayoutService excelLayoutService;
        private final CompanyRepository companyRepository;
        private final EmployeeDocumentDateResolver documentDateResolver;

        private static final String REPORT_TITLE = "Termo de Ciência - Prestador de Serviços";

        public byte[] generatePdf(ServiceProviderAwarenessRequest request) {
                LocalDate documentDate = documentDateResolver.resolveDocumentDateOrToday(
                                request.getEmployeeId(), request.getDocumentDate());
                request.setDocumentDate(documentDate);
                try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                        PdfWriter writer = new PdfWriter(outputStream);

                        var configBuilder = ReportLayoutConfig.builder()
                                        .companyId(request.getCompanyId())
                                        .reportTitle(REPORT_TITLE)
                                        .includeEmailInFooter(true);
                        documentDateResolver.applyAdmissionDateFooter(configBuilder, request.getEmployeeId());
                        ReportLayoutConfig config = configBuilder.build();

                        DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
                        Document document = docWithPdf.getDocument();
                        Company company = docWithPdf.getCompany();

                        addContent(document, request, company);

                        document.close();
                        return outputStream.toByteArray();
                } catch (Exception e) {
                        log.error("Erro ao gerar PDF do Termo de Prestador", e);
                        throw new RuntimeException("Erro ao gerar PDF do Termo de Prestador", e);
                }
        }

        public byte[] generateExcel(ServiceProviderAwarenessRequest request) {
                try (Workbook workbook = new XSSFWorkbook()) {
                        Sheet sheet = workbook.createSheet("Termo Prestador");
                        Company company = companyRepository.findById(request.getCompanyId())
                                        .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

                        int startRow = excelLayoutService.addHeader(sheet, workbook, company, REPORT_TITLE);

                        Row row = sheet.createRow(startRow);
                        row.createCell(0).setCellValue("Prestador:");
                        row.createCell(1).setCellValue(request.getProviderName());

                        row = sheet.createRow(startRow + 1);
                        row.createCell(0).setCellValue("CNPJ/CPF:");
                        row.createCell(1).setCellValue(request.getProviderCnpjCpf());

                        row = sheet.createRow(startRow + 2);
                        row.createCell(0).setCellValue("Contrato:");
                        row.createCell(1).setCellValue(request.getContractNumber());

                        sheet.autoSizeColumn(0);
                        sheet.autoSizeColumn(1);

                        excelLayoutService.addFooter(sheet, workbook, company);

                        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                        workbook.write(outputStream);
                        return outputStream.toByteArray();
                } catch (Exception e) {
                        log.error("Erro ao gerar Excel do Termo de Prestador", e);
                        throw new RuntimeException("Erro ao gerar Excel do Termo de Prestador", e);
                }
        }

        private void addContent(Document document, ServiceProviderAwarenessRequest request, Company company) {
                // Seção: Empresa Prestadora
                document.add(createSectionHeader("EMPRESA / PROFISSIONAL PRESTADOR"));
                Table providerTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                                .useAllAvailableWidth();
                providerTable.addCell(createLabelValueCell("NOME / RAZÃO SOCIAL:", request.getProviderName()));
                providerTable.addCell(createLabelValueCell("CNPJ / CPF:", request.getProviderCnpjCpf()));
                if (request.getRepresentativeName() != null && !request.getRepresentativeName().isEmpty()) {
                        providerTable.addCell(
                                        createLabelValueCell("REPRESENTANTE LEGAL:", request.getRepresentativeName()));
                }
                document.add(providerTable);

                // Seção: Detalhes do Serviço e Contrato
                document.add(createSectionHeader("DETALHES DO SERVIÇO E CONTRATO"));
                Table serviceTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                                .useAllAvailableWidth();
                serviceTable.addCell(createLabelValueCell("DESCRIÇÃO DOS SERVIÇOS:", request.getServiceDescription()));
                serviceTable.addCell(createLabelValueCell("NÚMERO DO CONTRATO:", request.getContractNumber()));
                serviceTable.addCell(createLabelValueCell("CONTRATANTE:", company.getName()));
                document.add(serviceTable);

                // Termos e Ciência
                document.add(createSectionHeader("TERMOS DE CIÊNCIA E COMPROMISSO"));
                Paragraph terms = new Paragraph()
                                .setFontSize(10f)
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(10f);

                terms.add(new Text(
                                "O PRESTADOR acima identificado declara ter ciência e concordar com as normas e procedimentos de segurança, saúde ocupacional e meio ambiente da contratante ")
                                .setFontSize(10f));
                terms.add(new Text(company.getName()).setBold());
                terms.add(". Declara ainda que:\n\n");

                terms.add("1. Recebeu as instruções de segurança aplicáveis às atividades a serem desenvolvidas.\n");
                terms.add("2. Seus funcionários utilizarão todos os EPIs (Equipamentos de Proteção Individual) obrigatórios.\n");
                terms.add("3. Cumprirá rigorosamente a legislação trabalhista e previdenciária vigente em relação aos seus empregados.\n");
                terms.add("4. É responsável por quaisquer danos causados à contratante ou a terceiros na execução dos serviços.");
                document.add(terms);

                // Assinaturas
                addSignatures(document, request, company);
        }

        private Cell createLabelValueCell(String label, String value) {
                Paragraph p = new Paragraph();
                p.add(new Text(label).setBold().setFontSize(9f));
                p.add(new Text(" " + (value != null && !value.isEmpty() ? value : "______________________"))
                                .setFontSize(10f));
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

        private void addSignatures(Document document, ServiceProviderAwarenessRequest request, Company company) {
                String city = request.getCity() != null ? request.getCity()
                                : (company.getCity() != null ? company.getCity() : "_______________");
                String date = formatDateExtended(
                                documentDateResolver.resolveDocumentDateOrToday(
                                                request.getEmployeeId(), request.getDocumentDate()));

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
                                .add(new Paragraph("Contratante").setTextAlignment(TextAlignment.CENTER)
                                                .setFontSize(8f))
                                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);

                Cell spacer = new Cell().setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);

                Cell cell2 = new Cell()
                                .add(new Paragraph("_________________________________")
                                                .setTextAlignment(TextAlignment.CENTER))
                                .add(new Paragraph(request.getProviderName().toUpperCase())
                                                .setTextAlignment(TextAlignment.CENTER)
                                                .setFontSize(8f).setBold())
                                .add(new Paragraph("Prestador").setTextAlignment(TextAlignment.CENTER).setFontSize(8f))
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
