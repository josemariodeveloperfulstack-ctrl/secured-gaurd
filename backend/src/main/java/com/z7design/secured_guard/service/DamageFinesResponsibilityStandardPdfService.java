package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.DamageFinesResponsibilityRequest;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
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
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DamageFinesResponsibilityStandardPdfService {

    private static final String REPORT_TITLE = "TERMO DE RESPONSABILIDADE POR DANOS E MULTAS";
    /** Margem superior quando o título fica apenas no corpo (sem título fixo no cabeçalho do layout). */
    private static final float TERM_TOP_MARGIN_PT = 68f;

    private final StandardReportLayoutService pdfLayoutService;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeDocumentDateResolver documentDateResolver;

    public byte[] generatePdf(DamageFinesResponsibilityRequest request) {
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
            log.error("Erro ao gerar PDF do Termo de Responsabilidade por Danos e Multas", e);
            throw new RuntimeException("Erro ao gerar PDF do Termo de Responsabilidade por Danos e Multas", e);
        }
    }

    private DocumentContext buildDocumentContext(DamageFinesResponsibilityRequest request) {
        Employee employee = request.getEmployeeId() == null
                ? null
                : employeeRepository.findWithOrgContextById(request.getEmployeeId()).orElse(null);

        if (request.getEmployeeId() != null && employee == null) {
            log.warn("Funcionário não encontrado para termo de danos e multas: {}", request.getEmployeeId());
        }

        applyEmployeeToRequest(request, employee);

        UUID companyId = request.getCompanyId();
        if (companyId == null && employee != null && employee.getCompany() != null) {
            companyId = employee.getCompany().getId();
            request.setCompanyId(companyId);
        }
        if (companyId == null) {
            throw new ResourceNotFoundException("Empresa não informada para o termo de danos e multas");
        }

        Company company = companyRepository.findById(companyId).orElse(null);
        if (company == null && employee != null) {
            company = employee.getCompany();
        }
        if (company == null) {
            throw new ResourceNotFoundException("Empresa não encontrada com ID: " + companyId);
        }

        String employeeName = firstNonBlank(request.getEmployeeName(), employee != null ? employee.getName() : null);
        String employeeCpf = firstNonBlank(
                request.getEmployeeCpf(),
                employee != null ? employee.getCpf() : null,
                employee != null ? employee.getDocument() : null);
        String companyName = firstNonBlank(
                company.getName(),
                employee != null ? employee.getEmpresaNome() : null);
        String city = firstNonBlank(
                request.getCity(),
                company.getCity(),
                "Contagem");
        LocalDate documentDate = documentDateResolver.resolveDocumentDateOrToday(
                request.getEmployeeId(), request.getDocumentDate());

        request.setEmployeeName(employeeName);
        request.setEmployeeCpf(employeeCpf);
        request.setCity(city);
        request.setDocumentDate(documentDate);

        return new DocumentContext(companyId, companyName, employeeName, employeeCpf, city, documentDate);
    }

    private void applyEmployeeToRequest(DamageFinesResponsibilityRequest request, Employee employee) {
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
        if (employee.getHireDate() != null) {
            request.setDocumentDate(employee.getHireDate());
        }
        if (request.getCompanyId() == null && employee.getCompany() != null) {
            request.setCompanyId(employee.getCompany().getId());
        }
    }

    private void addContent(Document document, DocumentContext ctx) {
        String employeeName = safe(ctx.employeeName());
        String employeeCpf = CompanyDataFormatter.formatCpf(ctx.employeeCpf());
        String companyName = safe(ctx.companyName()).toUpperCase();

        Paragraph title = new Paragraph(REPORT_TITLE)
                .setBold()
                .setFontSize(12f)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(0f)
                .setMarginBottom(14f);
        document.add(title);

        Paragraph intro = new Paragraph()
                .setFontSize(10f)
                .setTextAlignment(TextAlignment.JUSTIFIED)
                .setMultipliedLeading(1.4f)
                .setMarginBottom(12f);
        intro.add("Eu, ");
        intro.add(new Text(employeeName).setBold());
        intro.add(", portador(a) do CPF nº ");
        intro.add(new Text(employeeCpf).setBold());
        intro.add(", funcionário da empresa ");
        intro.add(new Text(companyName).setBold());
        intro.add(" admito ter pleno conhecimento de que, durante o exercício de minhas funções na empresa ");
        intro.add(new Text(companyName).setBold());
        intro.add(" poderei utilizar veículos de propriedade ou sob responsabilidade da mesma para a execução de atividades laborais.");
        document.add(intro);

        document.add(new Paragraph("Declaro estar ciente e de acordo que:")
                .setFontSize(10f)
                .setTextAlignment(TextAlignment.JUSTIFIED)
                .setMarginBottom(6f));

        String[] clauses = {
                "Sou responsável por zelar pela correta utilização e conservação do veículo que me for disponibilizado, seguindo as normas de trânsito e orientações internas da empresa.",
                "Caso sejam constatados danos materiais ao veículo ou multas de trânsito decorrentes de uso indevido, imprudência, negligência, imperícia ou descumprimento das leis de trânsito, os valores correspondentes poderão ser descontados do meu salário, conforme previsto em contrato de trabalho e de acordo com o artigo 462 da CLT.",
                "Comprometo-me a comunicar imediatamente à empresa qualquer ocorrência, acidente, infração ou irregularidade envolvendo o veículo utilizado.",
                "Reconheço que este termo não exclui a possibilidade de aplicação de outras medidas disciplinares cabíveis, conforme a legislação vigente e as normas internas da empresa.",
                "Por estar de acordo com todas as condições acima, assino o presente termo em duas vias de igual teor, para que produza seus devidos efeitos legais."
        };

        for (String clause : clauses) {
            document.add(new Paragraph("• " + clause)
                    .setFontSize(10f)
                    .setTextAlignment(TextAlignment.JUSTIFIED)
                    .setMultipliedLeading(1.35f)
                    .setMarginBottom(4f)
                    .setMarginLeft(10f));
        }

        addSignatures(document, ctx);
    }

    private void addSignatures(Document document, DocumentContext ctx) {
        String date = formatDateExtended(ctx.documentDate());

        Paragraph dateLoc = new Paragraph(ctx.city() + ", " + date + ".")
                .setTextAlignment(TextAlignment.LEFT)
                .setMarginTop(30f)
                .setMarginBottom(50f)
                .setFontSize(10f);
        document.add(dateLoc);

        Table sigTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                .useAllAvailableWidth();

        sigTable.addCell(signatureCell(
                ctx.employeeName(),
                "Assinatura do(a) Funcionário(a)"));

        sigTable.addCell(new com.itextpdf.layout.element.Cell()
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .setMinHeight(30f));

        sigTable.addCell(signatureCell(
                ctx.companyName(),
                "Assinatura da Empresa"));

        document.add(sigTable);
    }

    private com.itextpdf.layout.element.Cell signatureCell(String name, String label) {
        return new com.itextpdf.layout.element.Cell()
                .add(new Paragraph("______________________________________________________")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setMarginBottom(4f))
                .add(new Paragraph(safe(name).toUpperCase())
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(9f)
                        .setBold()
                        .setMarginBottom(2f))
                .add(new Paragraph(label)
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(9f))
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .setPaddingTop(10f);
    }

    private String formatDateExtended(LocalDate date) {
        return date.format(DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy", new Locale("pt", "BR")));
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
            String companyName,
            String employeeName,
            String employeeCpf,
            String city,
            LocalDate documentDate) {
    }
}
