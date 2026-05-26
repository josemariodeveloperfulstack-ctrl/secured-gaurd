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
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.util.CompanyDataFormatter;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransportVoucherStandardPdfService {

    private final StandardReportLayoutService pdfLayoutService;
    private final ExcelReportLayoutService excelLayoutService;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;

    private static final String REPORT_TITLE = "DECLARAÇÃO E TERMO DE COMPROMISSO\nPARA ADQUIRIR OU NÃO O VALE-TRANSPORTE";
    private static final DateTimeFormatter BR_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy", new Locale("pt", "BR"));

    public byte[] generatePdf(TransportVoucherRequest request) {
        VoucherDocumentContext ctx = buildDocumentContext(request);
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(outputStream);

            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .companyId(ctx.companyId())
                    .reportTitle(REPORT_TITLE)
                    .includeEmailInFooter(true)
                    .topMargin(110f)
                    .build();

            DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();

            addContent(document, request, ctx);

            document.close();
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF do Vale-Transporte", e);
            throw new RuntimeException("Erro ao gerar PDF do Vale-Transporte", e);
        }
    }

    public byte[] generateExcel(TransportVoucherRequest request) {
        VoucherDocumentContext ctx = buildDocumentContext(request);
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Vale-Transporte");
            Company company = companyRepository.findById(ctx.companyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

            int startRow = excelLayoutService.addHeader(sheet, workbook, company, REPORT_TITLE);

            Row row = sheet.createRow(startRow);
            row.createCell(0).setCellValue("Funcionário:");
            row.createCell(1).setCellValue(ctx.employeeName());

            row = sheet.createRow(startRow + 1);
            row.createCell(0).setCellValue("CPF:");
            row.createCell(1).setCellValue(request.getEmployeeCpf() != null ? request.getEmployeeCpf() : "");

            row = sheet.createRow(startRow + 2);
            row.createCell(0).setCellValue("Opção:");
            row.createCell(1).setCellValue(Boolean.TRUE.equals(request.getOptingVoucher()) ? "OPTANTE" : "NÃO OPTANTE");

            int currentRow = startRow + 4;
            if (Boolean.TRUE.equals(request.getOptingVoucher())) {
                Row headerRow = sheet.createRow(currentRow++);
                headerRow.createCell(0).setCellValue("Trajeto");
                headerRow.createCell(1).setCellValue("Linha");
                headerRow.createCell(2).setCellValue("Tarifa");

                Row ida = sheet.createRow(currentRow++);
                ida.createCell(0).setCellValue("Ida");
                ida.createCell(1).setCellValue(request.getIdaLinha());
                ida.createCell(2).setCellValue(request.getIdaTarifa());

                Row volta = sheet.createRow(currentRow++);
                volta.createCell(0).setCellValue("Volta");
                volta.createCell(1).setCellValue(request.getVoltaLinha());
                volta.createCell(2).setCellValue(request.getVoltaTarifa());
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

    private VoucherDocumentContext buildDocumentContext(TransportVoucherRequest request) {
        Employee employee = null;
        if (request.getEmployeeId() != null) {
            employee = employeeRepository.findWithOrgContextById(request.getEmployeeId()).orElse(null);
            if (employee == null) {
                log.warn("Funcionário não encontrado para termo VT: {}", request.getEmployeeId());
            }
        }

        applyEmployeeToRequest(request, employee);

        UUID companyId = request.getCompanyId();
        if (companyId == null && employee != null && employee.getCompany() != null) {
            companyId = employee.getCompany().getId();
            request.setCompanyId(companyId);
        }
        if (companyId == null) {
            throw new ResourceNotFoundException("Empresa não informada para o termo de vale-transporte");
        }

        Company company = companyRepository.findById(companyId)
                .orElseGet(() -> employee != null ? employee.getCompany() : null);
        if (company == null) {
            throw new ResourceNotFoundException("Empresa não encontrada com ID: " + companyId);
        }

        String employeeName = firstNonBlank(
                request.getEmployeeName(),
                employee != null ? employee.getName() : null);
        String companyName = firstNonBlank(
                request.getCompanyName(),
                company.getName(),
                employee != null ? employee.getEmpresaNome() : null,
                employee != null && employee.getCompany() != null ? employee.getCompany().getName() : null);
        String address = firstNonBlank(
                request.getEmployeeAddress(),
                employee != null ? buildEmployeeAddress(employee) : null);
        LocalDate signatureDate = resolveSignatureDate(request, employee);
        String city = resolveCity(request, company, employee);

        if (!isBlank(employeeName)) {
            request.setEmployeeName(employeeName);
        }
        if (!isBlank(companyName)) {
            request.setCompanyName(companyName);
        }
        if (!isBlank(address)) {
            request.setEmployeeAddress(address);
        }
        if (signatureDate != null) {
            request.setDocumentDate(signatureDate);
        }
        if (!isBlank(city)) {
            request.setCity(city);
        }

        return new VoucherDocumentContext(companyId, company, employeeName, companyName, address, signatureDate, city);
    }

    private void applyEmployeeToRequest(TransportVoucherRequest request, Employee employee) {
        if (employee == null) {
            return;
        }
        if (isBlank(request.getEmployeeName())) {
            request.setEmployeeName(employee.getName());
        }
        if (isBlank(request.getEmployeeCpf())) {
            String cpf = employee.getCpf();
            request.setEmployeeCpf(cpf != null && !cpf.isBlank() ? cpf : employee.getDocument());
        }
        if (isBlank(request.getEmployeeAddress())) {
            request.setEmployeeAddress(buildEmployeeAddress(employee));
        }
        if (employee.getHireDate() != null) {
            if (request.getDocumentDate() == null) {
                request.setDocumentDate(employee.getHireDate());
            }
            if (isBlank(request.getHireDate())) {
                request.setHireDate(employee.getHireDate().toString());
            }
        }
        if (request.getCompanyId() == null && employee.getCompany() != null) {
            request.setCompanyId(employee.getCompany().getId());
        }
        if (isBlank(request.getCompanyName())) {
            if (employee.getCompany() != null && !isBlank(employee.getCompany().getName())) {
                request.setCompanyName(employee.getCompany().getName());
            } else if (!isBlank(employee.getEmpresaNome())) {
                request.setCompanyName(employee.getEmpresaNome());
            }
        }
    }

    private void addContent(Document document, TransportVoucherRequest request, VoucherDocumentContext ctx) {
        boolean manual = Boolean.TRUE.equals(request.getManualFill());

        document.add(new Paragraph("O vale-transporte é um direito do trabalhador, faça sua opção se quer adquiri-lo ou não, assinalando com um X.")
                .setFontSize(11f)
                .setMarginTop(10f)
                .setMarginBottom(10f));

        if (manual) {
            document.add(new Paragraph("(   ) SIM  (   ) NÃO;")
                    .setFontSize(11f)
                    .setBold()
                    .setMarginBottom(15f));
            addDeclarationBody(document, ctx);
            addManualRouteSection(document);
        } else {
            String simX = Boolean.TRUE.equals(request.getOptingVoucher()) ? "X" : " ";
            String naoX = Boolean.FALSE.equals(request.getOptingVoucher()) ? "X" : " ";
            document.add(new Paragraph("( " + simX + " ) SIM  ( " + naoX + " ) NÃO;")
                    .setFontSize(11f)
                    .setBold()
                    .setMarginBottom(15f));
            addDeclarationBody(document, ctx);
            addCompleteRouteSection(document, request);
        }

        addLegalTerms(document);
        addSignatures(document, ctx);
    }

    private void addDeclarationBody(Document document, VoucherDocumentContext ctx) {
        Paragraph body = new Paragraph()
                .setFontSize(11f)
                .setTextAlignment(TextAlignment.JUSTIFIED)
                .setMultipliedLeading(1.5f);

        body.add("Eu, ");
        appendField(body, ctx.employeeName());
        body.add(", empregado(a) da ");
        appendField(body, ctx.companyName());
        body.add(" desejo adquirir vale-transporte, declaro que estou morando na ");
        appendField(body, ctx.employeeAddress());
        body.add(", e uso __________ vales transportes para o meu deslocamento residência-trabalho e vice-versa.");
        document.add(body);
    }

    private void appendField(Paragraph body, String value) {
        if (isBlank(value)) {
            body.add(new Text("________________________________________________________").setUnderline());
        } else {
            body.add(new Text(value.toUpperCase()).setBold().setUnderline());
        }
    }

    private void addManualRouteSection(Document document) {
        document.add(new Paragraph("Ida")
                .setFontSize(10.5f)
                .setBold()
                .setMarginTop(12f)
                .setMarginBottom(4f));
        document.add(new Paragraph("Linha: ________________________________ Tarifa R$: ________________________")
                .setFontSize(10.5f)
                .setMarginBottom(8f));

        document.add(new Paragraph("Volta")
                .setFontSize(10.5f)
                .setBold()
                .setMarginBottom(4f));
        document.add(new Paragraph("Linha: ________________________________ Tarifa R$: ________________________")
                .setFontSize(10.5f)
                .setMarginBottom(10f));
    }

    private void addCompleteRouteSection(Document document, TransportVoucherRequest request) {
        Table routeTable = new Table(UnitValue.createPercentArray(new float[]{20, 60, 20}))
                .useAllAvailableWidth()
                .setMarginTop(10f)
                .setMarginBottom(10f);

        routeTable.addHeaderCell(new Cell().add(new Paragraph("Trajeto").setBold().setFontSize(9f)));
        routeTable.addHeaderCell(new Cell().add(new Paragraph("Linha").setBold().setFontSize(9f)));
        routeTable.addHeaderCell(new Cell().add(new Paragraph("Tarifa (R$)").setBold().setFontSize(9f)));

        routeTable.addCell(new Cell().add(new Paragraph("Ida").setFontSize(9f)));
        routeTable.addCell(new Cell().add(new Paragraph(request.getIdaLinha() != null && !request.getIdaLinha().isEmpty() ? request.getIdaLinha() : " ").setFontSize(9f)));
        routeTable.addCell(new Cell().add(new Paragraph(request.getIdaTarifa() != null && !request.getIdaTarifa().isEmpty() ? request.getIdaTarifa() : " ").setFontSize(9f)));

        routeTable.addCell(new Cell().add(new Paragraph("Volta").setFontSize(9f)));
        routeTable.addCell(new Cell().add(new Paragraph(request.getVoltaLinha() != null && !request.getVoltaLinha().isEmpty() ? request.getVoltaLinha() : " ").setFontSize(9f)));
        routeTable.addCell(new Cell().add(new Paragraph(request.getVoltaTarifa() != null && !request.getVoltaTarifa().isEmpty() ? request.getVoltaTarifa() : " ").setFontSize(9f)));

        document.add(routeTable);
    }

    private void addLegalTerms(Document document) {
        document.add(new Paragraph("\nAssumo o compromisso de utilizar o vale-transporte exclusivamente para o meu efetivo deslocamento residência-trabalho e vice-versa; e afirmo ter conhecimento do artigo 7°, § 3° do Decreto n° 95.247/87, de que constitui falta grave o seu uso indevido ou que essa declaração seja falsa.")
                .setFontSize(10.5f)
                .setTextAlignment(TextAlignment.JUSTIFIED)
                .setMarginTop(15f));

        document.add(new Paragraph("Comprometo-me a atualizar anualmente as informações, ou a qualquer tempo quando ocorrer mudança residencial ou meio(s) de transporte(s).")
                .setFontSize(10.5f)
                .setMarginTop(10f));

        document.add(new Paragraph("Autorizo a empresa a descontar mensalmente, até 6% de meu salário-base, o valor destinado a cobrir o fornecimento de vale-transporte por mim utilizado.")
                .setFontSize(10.5f)
                .setMarginTop(10f));

        document.add(new Paragraph("Por ser a expressão da verdade, firmo a presente declaração e termo de compromisso.")
                .setFontSize(10.5f)
                .setMarginTop(15f));
    }

    private void addSignatures(Document document, VoucherDocumentContext ctx) {
        String city = ctx.city();
        if (isBlank(city)) {
            city = "Contagem";
        }

        LocalDate docDate = ctx.signatureDate() != null ? ctx.signatureDate() : LocalDate.now();
        String dateStr = docDate.format(BR_DATE);

        document.add(new Paragraph("\n" + city + ", " + dateStr)
                .setFontSize(11f)
                .setMarginTop(25f)
                .setMarginBottom(40f));

        document.add(new Paragraph("______________________________________________________")
                .setTextAlignment(TextAlignment.LEFT));

        String employeeName = ctx.employeeName();
        if (!isBlank(employeeName)) {
            document.add(new Paragraph(employeeName.toUpperCase())
                    .setBold()
                    .setFontSize(10f)
                    .setMarginTop(-5f));
        }
    }

    private LocalDate resolveSignatureDate(TransportVoucherRequest request, Employee employee) {
        if (request.getDocumentDate() != null) {
            return request.getDocumentDate();
        }
        LocalDate fromHire = parseFlexibleDate(request.getHireDate());
        if (fromHire != null) {
            return fromHire;
        }
        if (employee != null && employee.getHireDate() != null) {
            return employee.getHireDate();
        }
        return LocalDate.now();
    }

    private String resolveCity(TransportVoucherRequest request, Company company, Employee employee) {
        String city = request.getCity();
        if (!isBlank(city) && !city.toLowerCase().contains("rua") && !city.contains(",")) {
            return city.trim();
        }
        if (employee != null && !isBlank(employee.getEnderecoCidade())) {
            return employee.getEnderecoCidade().trim();
        }
        return CompanyDataFormatter.resolveContractSigningCity(company);
    }

    private static LocalDate parseFlexibleDate(String raw) {
        if (isBlank(raw)) {
            return null;
        }
        String value = raw.trim();
        if (value.length() >= 10 && value.charAt(4) == '-') {
            try {
                return LocalDate.parse(value.substring(0, 10));
            } catch (DateTimeParseException ignored) {
                // tenta outros formatos
            }
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ignored) {
            // continua
        }
        try {
            return LocalDate.parse(value, BR_DATE);
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    @SafeVarargs
    private static String firstNonBlank(String... values) {
        if (values == null) {
            return "";
        }
        for (String value : values) {
            if (!isBlank(value)) {
                return value.trim();
            }
        }
        return "";
    }

    private static String buildEmployeeAddress(Employee employee) {
        StringBuilder address = new StringBuilder();

        if (!isBlank(employee.getEnderecoRua())) {
            address.append(employee.getEnderecoRua().trim());
        }
        if (!isBlank(employee.getEnderecoNumero())) {
            if (address.length() > 0) {
                address.append(", ");
            }
            address.append(employee.getEnderecoNumero().trim());
        }
        if (!isBlank(employee.getEnderecoComplemento())) {
            if (address.length() > 0) {
                address.append(" - ");
            }
            address.append(employee.getEnderecoComplemento().trim());
        }
        if (!isBlank(employee.getEnderecoBairro())) {
            if (address.length() > 0) {
                address.append(", ");
            }
            address.append(employee.getEnderecoBairro().trim());
        }
        if (!isBlank(employee.getEnderecoCidade())) {
            if (address.length() > 0) {
                address.append(" - ");
            }
            address.append(employee.getEnderecoCidade().trim());
        }
        if (!isBlank(employee.getEnderecoEstado())) {
            if (address.length() > 0) {
                address.append("/");
            }
            address.append(employee.getEnderecoEstado().trim());
        }
        if (!isBlank(employee.getEnderecoCep())) {
            if (address.length() > 0) {
                address.append(" - CEP: ");
            }
            address.append(CompanyDataFormatter.formatZipCode(employee.getEnderecoCep().trim()));
        }

        if (address.length() == 0 && !isBlank(employee.getAddress())) {
            address.append(employee.getAddress().trim());
        }

        return address.toString();
    }

    private record VoucherDocumentContext(
            UUID companyId,
            Company company,
            String employeeName,
            String companyName,
            String employeeAddress,
            LocalDate signatureDate,
            String city) {
    }
}
