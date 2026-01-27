package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.EmploymentContractRequest;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import com.z7design.secured_guard.util.CompanyDataFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmploymentContractStandardPdfService {

        private final StandardReportLayoutService pdfLayoutService;
        private final ExcelReportLayoutService excelLayoutService;
        private final CompanyRepository companyRepository;

        private static final String REPORT_TITLE = "Contrato Individual de Trabalho";

        public byte[] generatePdf(EmploymentContractRequest request) {
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
                        log.error("Erro ao gerar PDF do Contrato de Trabalho", e);
                        throw new RuntimeException("Erro ao gerar PDF do Contrato de Trabalho", e);
                }
        }

        public byte[] generateExcel(EmploymentContractRequest request) {
                try (Workbook workbook = new XSSFWorkbook()) {
                        Sheet sheet = workbook.createSheet("Contrato de Trabalho");
                        Company company = companyRepository.findById(request.getCompanyId())
                                        .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

                        int startRow = excelLayoutService.addHeader(sheet, workbook, company, REPORT_TITLE);

                        // Adicionar dados principais
                        Row row = sheet.createRow(startRow);
                        row.createCell(0).setCellValue("Empregado:");
                        row.createCell(1).setCellValue(request.getEmployeeName());

                        row = sheet.createRow(startRow + 1);
                        row.createCell(0).setCellValue("CPF:");
                        row.createCell(1).setCellValue(request.getEmployeeCpf());

                        row = sheet.createRow(startRow + 2);
                        row.createCell(0).setCellValue("Cargo:");
                        row.createCell(1).setCellValue(request.getPosition());

                        row = sheet.createRow(startRow + 3);
                        row.createCell(0).setCellValue("Salário:");
                        row.createCell(1).setCellValue("R$ " + formatMoney(request.getSalary()));

                        row = sheet.createRow(startRow + 4);
                        row.createCell(0).setCellValue("Data Admissão:");
                        if (request.getAdmissionDate() != null) {
                                row.createCell(1).setCellValue(request.getAdmissionDate().toString());
                        }

                        sheet.autoSizeColumn(0);
                        sheet.autoSizeColumn(1);

                        excelLayoutService.addFooter(sheet, workbook, company);

                        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                        workbook.write(outputStream);
                        return outputStream.toByteArray();
                } catch (Exception e) {
                        log.error("Erro ao gerar Excel do Contrato de Trabalho", e);
                        throw new RuntimeException("Erro ao gerar Excel do Contrato de Trabalho", e);
                }
        }

        private void addContent(Document document, EmploymentContractRequest request, Company company) {
                // Seção: Identificação da Empregadora
                document.add(createSectionHeader("IDENTIFICAÇÃO DA EMPREGADORA"));
                Table employerTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                                .useAllAvailableWidth();
                employerTable.addCell(createLabelValueCell("NOME / RAZÃO SOCIAL:", company.getName()));
                employerTable.addCell(
                                createLabelValueCell("CNPJ:", CompanyDataFormatter.formatCnpj(company.getCnpj())));
                employerTable.addCell(
                                createLabelValueCell("ENDEREÇO:", CompanyDataFormatter.formatFullAddress(company)));
                document.add(employerTable);

                // Seção: Identificação do Empregado
                document.add(createSectionHeader("IDENTIFICAÇÃO DO EMPREGADO"));
                Table employeeTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                                .useAllAvailableWidth();
                employeeTable.addCell(createLabelValueCell("NOME:", request.getEmployeeName()));
                employeeTable.addCell(createLabelValueCell("CPF:", request.getEmployeeCpf()));
                employeeTable.addCell(createLabelValueCell("RG:", request.getEmployeeRg()));
                employeeTable.addCell(createLabelValueCell("CTPS / SÉRIE:",
                                (request.getEmployeeCtps() != null ? request.getEmployeeCtps() : "") + " / "
                                                + (request.getEmployeeCtpsSeries() != null
                                                                ? request.getEmployeeCtpsSeries()
                                                                : "")));
                employeeTable.addCell(createLabelValueCell("ENDEREÇO:", request.getEmployeeAddress()));
                document.add(employeeTable);

                // Texto Introdutório
                Paragraph intro = new Paragraph("Têm entre si justo e contratado o seguinte:")
                                .setFontSize(10f)
                                .setMarginTop(10f)
                                .setMarginBottom(10f);
                document.add(intro);

                // Cláusulas
                addClauseAsSection(document, "CLÁUSULA 1ª - DA FUNÇÃO",
                                "O EMPREGADO é contratado para exercer a função de "
                                                + request.getPosition().toUpperCase() +
                                                ", comprometendo-se a executá-la com zelo e dedicação, bem como outras tarefas compatíveis.");

                addClauseAsSection(document, "CLÁUSULA 2ª - DA REMUNERAÇÃO",
                                "A EMPREGADORA pagará ao EMPREGADO a remuneração mensal de R$ "
                                                + formatMoney(request.getSalary()) +
                                                " (" + request.getSalary()
                                                + "), a ser efetuada até o 5º dia útil do mês subsequente ao vencido.");

                addClauseAsSection(document, "CLÁUSULA 3ª - DA JORNADA",
                                "O horário de trabalho será de "
                                                + (request.getWorkHoursDescription() != null
                                                                ? request.getWorkHoursDescription()
                                                                : "44 horas semanais")
                                                + ", cumprindo a seguinte escala: "
                                                + (request.getWorkSchedule() != null ? request.getWorkSchedule()
                                                                : "a definir")
                                                + ".");

                addClauseAsSection(document, "CLÁUSULA 4ª - DO PRAZO",
                                "O presente contrato é celebrado por prazo indeterminado, tendo início em " +
                                                (request.getAdmissionDate() != null
                                                                ? formatDate(request.getAdmissionDate())
                                                                : "___/___/____")
                                                + ".");

                addClauseAsSection(document, "CLÁUSULA 5ª - DISPOSIÇÕES GERAIS",
                                "E por estarem assim justos e contratados, assinam o presente em 02 (duas) vias de igual teor e forma.");

                // Assinaturas
                addSignatures(document, request, company);
        }

        private void addClauseAsSection(Document document, String title, String content) {
                document.add(new Paragraph(title).setBold().setFontSize(10f).setMarginTop(8f).setMarginBottom(2f));
                document.add(new Paragraph(content).setFontSize(10f).setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(5f));
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

        private void addSignatures(Document document, EmploymentContractRequest request, Company company) {
                String city = request.getCity() != null ? request.getCity()
                                : (company.getCity() != null ? company.getCity() : "_______________");
                String date = formatDateExtended(
                                request.getContractDate() != null ? request.getContractDate() : LocalDate.now());

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

        private String formatMoney(BigDecimal value) {
                if (value == null)
                        return "0,00";
                return NumberFormat.getCurrencyInstance(new Locale("pt", "BR"))
                                .format(value)
                                .replace("R$", "")
                                .trim();
        }

        private String formatDate(LocalDate date) {
                return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }

        private String formatDateExtended(LocalDate date) {
                return date.format(DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy", new Locale("pt", "BR")));
        }
}
