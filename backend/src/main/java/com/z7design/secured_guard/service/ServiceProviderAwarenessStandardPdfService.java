package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.dto.ServiceProviderAwarenessRequest;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import com.z7design.secured_guard.util.CompanyDataFormatter;
import com.z7design.secured_guard.util.EmployeeDocumentDateResolver;
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
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServiceProviderAwarenessStandardPdfService {

    private static final String REPORT_TITLE = "TERMO DE CIÊNCIA DO PRESTADOR DE SERVIÇOS";
    /** Margem superior quando o título fica apenas no corpo (sem título fixo no cabeçalho do layout). */
    private static final float TERM_TOP_MARGIN_PT = 78f;

    private final StandardReportLayoutService pdfLayoutService;
    private final ExcelReportLayoutService excelLayoutService;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeDocumentDateResolver documentDateResolver;

    public byte[] generatePdf(ServiceProviderAwarenessRequest request) {
        DocumentContext ctx = buildDocumentContext(request);
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(outputStream);

            var configBuilder = ReportLayoutConfig.builder()
                    .companyId(ctx.companyId())
                    .reportTitle(null)
                    .topMargin(TERM_TOP_MARGIN_PT)
                    .includeEmailInFooter(true);
            documentDateResolver.applyAdmissionDateFooter(configBuilder, request.getEmployeeId());
            ReportLayoutConfig config = configBuilder.build();

            DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();

            addContent(document, ctx);

            document.close();
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF do Termo de Ciência do Prestador", e);
            throw new RuntimeException("Erro ao gerar PDF do Termo de Ciência do Prestador", e);
        }
    }

    public byte[] generateExcel(ServiceProviderAwarenessRequest request) {
        DocumentContext ctx = buildDocumentContext(request);
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Termo Ciência");
            Company company = companyRepository.findById(ctx.companyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

            int startRow = excelLayoutService.addHeader(sheet, workbook, company, REPORT_TITLE);

            Row row = sheet.createRow(startRow);
            row.createCell(0).setCellValue("Prestador:");
            row.createCell(1).setCellValue(ctx.providerName());

            row = sheet.createRow(startRow + 1);
            row.createCell(0).setCellValue("CPF:");
            row.createCell(1).setCellValue(ctx.providerCpf());

            row = sheet.createRow(startRow + 2);
            row.createCell(0).setCellValue("Empresa:");
            row.createCell(1).setCellValue(ctx.companyName());

            row = sheet.createRow(startRow + 3);
            row.createCell(0).setCellValue("Data:");
            row.createCell(1).setCellValue(formatDateShort(ctx.documentDate()));

            sheet.autoSizeColumn(0);
            sheet.autoSizeColumn(1);

            excelLayoutService.addFooter(sheet, workbook, company);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar Excel do Termo de Ciência do Prestador", e);
            throw new RuntimeException("Erro ao gerar Excel do Termo de Ciência do Prestador", e);
        }
    }

    private DocumentContext buildDocumentContext(ServiceProviderAwarenessRequest request) {
        Employee employee = request.getEmployeeId() == null
                ? null
                : employeeRepository.findWithOrgContextById(request.getEmployeeId()).orElse(null);

        if (request.getEmployeeId() != null && employee == null) {
            log.warn("Funcionário não encontrado para termo de ciência: {}", request.getEmployeeId());
        }

        applyEmployeeToRequest(request, employee);

        UUID companyId = request.getCompanyId();
        if (companyId == null && employee != null && employee.getCompany() != null) {
            companyId = employee.getCompany().getId();
            request.setCompanyId(companyId);
        }
        if (companyId == null) {
            throw new ResourceNotFoundException("Empresa não informada para o termo de ciência");
        }

        Company company = companyRepository.findById(companyId).orElse(null);
        if (company == null && employee != null) {
            company = employee.getCompany();
        }
        if (company == null) {
            throw new ResourceNotFoundException("Empresa não encontrada com ID: " + companyId);
        }

        String providerName = firstNonBlank(request.getProviderName(), employee != null ? employee.getName() : null);
        String providerCpf = firstNonBlank(
                request.getProviderCnpjCpf(),
                employee != null ? employee.getCpf() : null,
                employee != null ? employee.getDocument() : null);
        String companyName = firstNonBlank(company.getName(), employee != null ? employee.getEmpresaNome() : null);
        String companyCnpj = CompanyDataFormatter.formatCnpj(company.getCnpj());
        String city = firstNonBlank(request.getCity(), resolveCityWithState(company), "Contagem/MG");
        LocalDate documentDate = documentDateResolver.resolveDocumentDateOrToday(
                request.getEmployeeId(), request.getDocumentDate());

        request.setProviderName(providerName);
        request.setProviderCnpjCpf(providerCpf);
        request.setCity(city);
        request.setDocumentDate(documentDate);

        return new DocumentContext(companyId, providerName, providerCpf, companyName, companyCnpj, city, documentDate);
    }

    private void applyEmployeeToRequest(ServiceProviderAwarenessRequest request, Employee employee) {
        if (employee == null) {
            return;
        }
        if (isBlank(request.getProviderName())) {
            request.setProviderName(employee.getName());
        }
        if (isBlank(request.getProviderCnpjCpf())) {
            String cpf = employee.getCpf();
            request.setProviderCnpjCpf(cpf != null && !cpf.isBlank() ? cpf : employee.getDocument());
        }
        if (employee.getHireDate() != null) {
            request.setDocumentDate(employee.getHireDate());
        }
        if (request.getCompanyId() == null && employee.getCompany() != null) {
            request.setCompanyId(employee.getCompany().getId());
        }
    }

    private static String resolveCityWithState(Company company) {
        if (company == null) {
            return "";
        }
        String city = company.getCity() != null ? company.getCity().trim() : "";
        String state = company.getState() != null ? company.getState().trim() : "";
        if (!city.isEmpty() && !state.isEmpty()) {
            return city + "/" + state;
        }
        return city;
    }

    private void addContent(Document document, DocumentContext ctx) {
        Paragraph title = new Paragraph(REPORT_TITLE)
                .setBold()
                .setItalic()
                .setUnderline()
                .setFontSize(12f)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(0f)
                .setMarginBottom(18f);
        document.add(title);

        Paragraph intro = new Paragraph()
                .setFontSize(10f)
                .setTextAlignment(TextAlignment.JUSTIFIED)
                .setMultipliedLeading(1.45f)
                .setMarginBottom(16f);
        intro.add("Eu, ");
        intro.add(new Text(safe(ctx.providerName()).toUpperCase()).setBold().setUnderline());
        intro.add(", inscrito no CPF sob o nº ");
        intro.add(new Text(CompanyDataFormatter.formatCpf(ctx.providerCpf())).setBold().setUnderline());
        intro.add(", prestador de serviços e funcionário da empresa ");
        intro.add(new Text(safe(ctx.companyName()).toUpperCase()).setBold().setUnderline());
        intro.add(", inscrita no CNPJ sob o nº ");
        intro.add(new Text(safe(ctx.companyCnpj())).setBold().setUnderline());
        intro.add(".");
        document.add(intro);

        document.add(new Paragraph(
                "DECLARO estar ciente da Diretriz de Prevenção e Controle do Uso Indevido de Álcool e/ou de Outras Drogas, "
                        + "cuja finalidade é a preservação da saúde e segurança de todos os colaboradores e prestadores de serviços, "
                        + "e que recebi e li o material explicativo sobre o referido programa.")
                .setFontSize(10f)
                .setTextAlignment(TextAlignment.JUSTIFIED)
                .setMultipliedLeading(1.45f)
                .setMarginBottom(28f));

        document.add(new Paragraph("Local: " + safe(ctx.city()))
                .setFontSize(10f)
                .setMarginBottom(4f));

        document.add(new Paragraph("Data: " + formatDateShort(ctx.documentDate()))
                .setFontSize(10f)
                .setMarginBottom(22f));

        document.add(new Paragraph("Assinatura do prestador de serviços:")
                .setFontSize(10f)
                .setMarginBottom(18f));

        document.add(new Paragraph("______________________________________________________________")
                .setTextAlignment(TextAlignment.CENTER)
                .setFontSize(10f)
                .setMarginBottom(6f));

        document.add(new Paragraph(safe(ctx.providerName()).toUpperCase())
                .setTextAlignment(TextAlignment.CENTER)
                .setFontSize(10f)
                .setBold());
    }

    private String formatDateShort(LocalDate date) {
        return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy", new Locale("pt", "BR")));
    }

    private String safe(String value) {
        return value != null ? value.trim() : "";
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (!isBlank(value)) {
                return value.trim();
            }
        }
        return "";
    }

    private record DocumentContext(
            UUID companyId,
            String providerName,
            String providerCpf,
            String companyName,
            String companyCnpj,
            String city,
            LocalDate documentDate) {
    }
}
