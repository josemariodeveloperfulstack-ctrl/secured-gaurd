package com.z7design.secured_guard.service;

import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.List;
import com.itextpdf.layout.element.ListItem;
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

/**
 * Regras de Ouro da Vale – Termo de ciência e compromisso (funcionários VIG).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ValeGoldenRulesPdfService {

    private static final DeviceRgb TITLE_BLUE = new DeviceRgb(0, 51, 102);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private static final String[] RULES = {
            "Nunca trabalhar sob efeito de álcool e drogas.",
            "Nunca trabalhar em altura (≥ 1,8m) sem treinamento e cinto de segurança tipo paraquedista.",
            "Nunca operar veículos e equipamentos móveis sem treinamento e dispositivos de segurança.",
            "Nunca realizar manutenção em equipamentos sem garantir energia zero (bloqueio e etiquetagem).",
            "Nunca se posicionar em áreas isoladas ou sob cargas suspensas.",
            "Nunca trabalhar sozinho em espaço confinado sem treinamento e EPIs adequados.",
            "Nunca entrar em áreas de produção, barragens ou subestações sem autorização.",
            "Nunca utilizar ferramentas ou máquinas improvisadas ou defeituosas.",
            "Nunca executar atividade sem conhecer os riscos e as medidas de controle.",
            "Nunca utilizar celular ou equipamentos que gerem distração em áreas operacionais não autorizadas."
    };

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
                    .topMargin(90f)
                    .includeEmailInFooter(true);
            documentDateResolver.applyAdmissionDateFooter(configBuilder, request.getEmployeeId());
            ReportLayoutConfig config = configBuilder.build();

            DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();
            addContent(document, data);
            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF Regras de Ouro da Vale", e);
            throw new RuntimeException("Erro ao gerar PDF Regras de Ouro da Vale: " + e.getMessage(), e);
        }
    }

    private void addContent(Document document, ResolvedData data) {
        document.add(new Paragraph("Regras de Ouro da Vale")
                .setBold().setFontSize(18f).setFontColor(TITLE_BLUE)
                .setTextAlignment(TextAlignment.CENTER).setMarginBottom(2f));
        document.add(new Paragraph("Termo de ciência e compromisso")
                .setBold().setFontSize(12f).setFontColor(TITLE_BLUE)
                .setTextAlignment(TextAlignment.CENTER).setMarginBottom(12f));

        document.add(new Paragraph(
                "Na Vale, a segurança é um pacto inegociável com a vida. As Regras de Ouro orientam o comportamento "
                        + "seguro de todos os empregados próprios e contratados.")
                .setFontSize(9.5f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(6f));
        document.add(new Paragraph(
                "Preencha seus dados abaixo e assine este termo, declarando ciência e compromisso com as 10 Regras de Ouro.")
                .setFontSize(9.5f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(10f));

        document.add(new Paragraph("As 10 Regras de Ouro")
                .setBold().setFontSize(11f).setFontColor(TITLE_BLUE)
                .setMarginBottom(6f));

        List list = new List().setSymbolIndent(10).setListSymbol("").setFontSize(9f).setMarginBottom(14f);
        for (int i = 0; i < RULES.length; i++) {
            list.add(new ListItem((i + 1) + ". " + RULES[i]));
        }
        document.add(list);

        String dateStr = data.documentDate().format(DATE_FMT);
        String year = String.valueOf(data.documentDate().getYear());

        document.add(fieldLine("Data: ", dateStr + "  (ano " + year + ")"));
        document.add(fieldLine("Local: ", data.location()));
        document.add(fieldLine("Nome do(a) empregado(a) (letra de forma): ", data.employeeName().toUpperCase()));
        document.add(new Paragraph()
                .add(new Text("Você trabalha:  (  ) Vale   ( X ) Contratada.  Nome da empresa contratada: ").setFontSize(9.5f))
                .add(new Text(data.companyName()).setBold().setFontSize(9.5f))
                .setMarginBottom(8f));
        document.add(fieldLine("Matrícula Vale ou Nº de identificação da contratada: ",
                data.registrationNumber().isBlank() ? "_______________________________" : data.registrationNumber()));

        document.add(new Paragraph("\nAssinatura do(a) empregado(a) _______________________________________________")
                .setFontSize(9.5f).setMarginTop(16f).setMarginBottom(20f));

        document.add(new Paragraph(
                "Os setores de RH e Segurança são responsáveis pela guarda deste termo assinado.")
                .setItalic().setFontSize(8f).setTextAlignment(TextAlignment.CENTER).setFontColor(new DeviceRgb(80, 80, 80)));
    }

    private Paragraph fieldLine(String label, String value) {
        return new Paragraph()
                .add(new Text(label).setFontSize(9.5f))
                .add(new Text(value).setBold().setFontSize(9.5f))
                .setMarginBottom(8f);
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
        String reg = firstNonBlank(request.getRegistrationNumber(),
                employee != null ? employee.getRegistrationNumber() : null, "");
        String companyName = firstNonBlank(request.getCompanyName(), company.getName(), "EMPRESA");
        String city = firstNonBlank(request.getCity(), company.getCity(), "Contagem");
        String location = firstNonBlank(request.getLocation(), city);

        return new ResolvedData(company.getId(), name, rg, reg, companyName, city, location, date);
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
            String registrationNumber,
            String companyName,
            String city,
            String location,
            LocalDate documentDate) {}
}
