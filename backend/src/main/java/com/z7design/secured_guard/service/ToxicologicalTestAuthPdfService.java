package com.z7design.secured_guard.service;

import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.dto.ValeSafetyTermRequest;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import com.z7design.secured_guard.util.EmployeeDocumentDateResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Autorização para teste toxicológico – Termo de Conhecimento (funcionários VIG).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ToxicologicalTestAuthPdfService {

    private static final DeviceRgb TITLE_GREEN = new DeviceRgb(46, 125, 50);
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd");
    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("MMMM", new Locale("pt", "BR"));
    private static final DateTimeFormatter YEAR = DateTimeFormatter.ofPattern("yyyy");

    private final StandardReportLayoutService pdfLayoutService;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeDocumentDateResolver documentDateResolver;

    public byte[] generatePdf(ValeSafetyTermRequest request) {
        ResolvedData data = resolve(request);
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            var configBuilder = ReportLayoutConfig.builder()
                    .companyId(data.companyId())
                    .reportTitle(null)
                    .topMargin(100f)
                    .includeEmailInFooter(true);
            documentDateResolver.applyAdmissionDateFooter(configBuilder, request.getEmployeeId());
            ReportLayoutConfig config = configBuilder.build();

            DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();
            addContent(document, data);
            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF Autorização Toxicológica", e);
            throw new RuntimeException("Erro ao gerar PDF Autorização Toxicológica: " + e.getMessage(), e);
        }
    }

    private void addContent(Document document, ResolvedData data) {
        document.add(new Paragraph("Autorização para teste toxicológico")
                .setBold().setFontSize(18f).setFontColor(TITLE_GREEN)
                .setTextAlignment(TextAlignment.CENTER).setMarginBottom(4f));
        document.add(new Paragraph("Termo de Conhecimento")
                .setFontSize(12f).setFontColor(new DeviceRgb(80, 100, 80))
                .setTextAlignment(TextAlignment.CENTER).setMarginBottom(28f));

        Paragraph body = new Paragraph()
                .setFontSize(11f)
                .setTextAlignment(TextAlignment.JUSTIFIED)
                .setFixedLeading(18f)
                .setMarginBottom(28f);
        body.add(new Text("Eu, "));
        body.add(new Text(data.employeeName().toUpperCase()).setBold());
        body.add(new Text(", RG "));
        body.add(new Text(data.employeeRg().isBlank() ? "____________" : data.employeeRg()).setBold());
        body.add(new Text(", empregado(a) da empresa "));
        body.add(new Text(data.companyName()).setBold());
        body.add(new Text(", declaro, nesta data, estar ciente da Política de Prevenção do Uso Indevido de Álcool "
                + "e Outras Drogas adotada nos projetos e concordo com todos os procedimentos e medidas previstos nesta cartilha."));
        document.add(body);

        String month = data.documentDate().format(MONTH);
        month = month.substring(0, 1).toUpperCase() + month.substring(1);
        document.add(new Paragraph(
                data.city() + ", " + data.documentDate().format(DAY) + " de " + month + " de "
                        + data.documentDate().format(YEAR) + ".")
                .setFontSize(11f)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(40f));

        document.add(new Paragraph("_______________________________________________")
                .setTextAlignment(TextAlignment.CENTER)
                .setFontColor(TITLE_GREEN)
                .setMarginBottom(4f));
        document.add(new Paragraph("Assinatura do(a) empregado(a)")
                .setFontSize(10f)
                .setTextAlignment(TextAlignment.CENTER)
                .setFontColor(new DeviceRgb(90, 90, 90)));
    }

    private ResolvedData resolve(ValeSafetyTermRequest request) {
        Employee employee = null;
        if (request.getEmployeeId() != null) {
            employee = employeeRepository.findById(request.getEmployeeId()).orElse(null);
        }
        Company company = null;
        if (request.getCompanyId() != null) {
            company = companyRepository.findById(request.getCompanyId()).orElse(null);
        } else if (employee != null && employee.getCompany() != null) {
            company = employee.getCompany();
        }
        if (company == null) {
            throw new IllegalArgumentException("Empresa é obrigatória para gerar o termo.");
        }

        LocalDate date = documentDateResolver.resolveDocumentDateOrToday(
                request.getEmployeeId(), request.getDocumentDate());

        String name = firstNonBlank(request.getEmployeeName(),
                employee != null ? employee.getName() : null, "FUNCIONÁRIO");
        String rg = firstNonBlank(request.getEmployeeRg(),
                employee != null ? employee.getRg() : null, "");
        String companyName = firstNonBlank(request.getCompanyName(), company.getName(), "EMPRESA");
        String city = firstNonBlank(request.getCity(), company.getCity(), "Contagem");

        return new ResolvedData(company.getId(), name, rg, companyName, city, date);
    }

    private static String firstNonBlank(String... values) {
        if (values == null) return "";
        for (String v : values) {
            if (v != null && !v.isBlank()) return v.trim();
        }
        return "";
    }

    private record ResolvedData(
            java.util.UUID companyId,
            String employeeName,
            String employeeRg,
            String companyName,
            String city,
            LocalDate documentDate) {}
}
