package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.BodyCamResponsibilityRequest;
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
public class BodyCamResponsibilityStandardPdfService {

    private static final String REPORT_TITLE_LINE1 = "TERMO DE RESPONSABILIDADE E USO DE CÂMERA CORPORAL";
    private static final String REPORT_TITLE_LINE2 = "– BODY CAM";
    /** Margem superior quando o título fica apenas no corpo (sem título fixo no cabeçalho do layout). */
    private static final float TERM_TOP_MARGIN_PT = 108f;
    private static final float BODY_FONT_SIZE = 9f;
    private static final float BODY_LEADING = 1.15f;

    private final StandardReportLayoutService pdfLayoutService;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeDocumentDateResolver documentDateResolver;

    public byte[] generatePdf(BodyCamResponsibilityRequest request) {
        DocumentContext ctx = buildDocumentContext(request);
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(outputStream);

            var configBuilder = ReportLayoutConfig.builder()
                    .companyId(ctx.companyId())
                    .reportTitle(null)
                    .topMargin(TERM_TOP_MARGIN_PT)
                    .bottomMargin(52f)
                    .leftMargin(42f)
                    .rightMargin(42f)
                    .includeEmailInFooter(true);
            documentDateResolver.applyAdmissionDateFooter(configBuilder, request.getEmployeeId());
            ReportLayoutConfig config = configBuilder.build();

            DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();

            addContent(document, ctx);

            document.close();
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF do Termo de Body Cam", e);
            throw new RuntimeException("Erro ao gerar PDF do Termo de Body Cam", e);
        }
    }

    private DocumentContext buildDocumentContext(BodyCamResponsibilityRequest request) {
        Employee employee = request.getEmployeeId() == null
                ? null
                : employeeRepository.findWithOrgContextById(request.getEmployeeId()).orElse(null);

        if (request.getEmployeeId() != null && employee == null) {
            log.warn("Funcionário não encontrado para termo Body Cam: {}", request.getEmployeeId());
        }

        applyEmployeeToRequest(request, employee);

        UUID companyId = request.getCompanyId();
        if (companyId == null && employee != null && employee.getCompany() != null) {
            companyId = employee.getCompany().getId();
            request.setCompanyId(companyId);
        }
        if (companyId == null) {
            throw new ResourceNotFoundException("Empresa não informada para o termo de Body Cam");
        }

        Company company = companyRepository.findById(companyId).orElse(null);
        if (company == null && employee != null) {
            company = employee.getCompany();
        }
        if (company == null) {
            throw new ResourceNotFoundException("Empresa não encontrada com ID: " + companyId);
        }

        String employeeName = firstNonBlank(request.getEmployeeName(), employee != null ? employee.getName() : null);
        String companyName = firstNonBlank(company.getName(), employee != null ? employee.getEmpresaNome() : null);
        String companyAddress = CompanyDataFormatter.formatFullAddress(company);
        String companyCnpj = CompanyDataFormatter.formatCnpj(company.getCnpj());
        String workLocation = firstNonBlank(
                request.getWorkLocation(),
                employee != null && employee.getWorkPost() != null ? employee.getWorkPost().getName() : null);
        String city = firstNonBlank(request.getCity(), resolveCityWithState(company), "Contagem, MG");
        LocalDate documentDate = documentDateResolver.resolveDocumentDateOrToday(
                request.getEmployeeId(), request.getDocumentDate());

        request.setEmployeeName(employeeName);
        request.setWorkLocation(workLocation);
        request.setCity(city);
        request.setDocumentDate(documentDate);

        return new DocumentContext(
                companyId, companyName, companyAddress, companyCnpj,
                employeeName, workLocation, city, documentDate);
    }

    private void applyEmployeeToRequest(BodyCamResponsibilityRequest request, Employee employee) {
        if (employee == null) {
            return;
        }
        if (isBlank(request.getEmployeeName())) {
            request.setEmployeeName(employee.getName());
        }
        if (isBlank(request.getWorkLocation()) && employee.getWorkPost() != null
                && !isBlank(employee.getWorkPost().getName())) {
            request.setWorkLocation(employee.getWorkPost().getName());
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
            return city + ", " + state;
        }
        return city;
    }

    private void addContent(Document document, DocumentContext ctx) {
        Paragraph title = new Paragraph()
                .add(new Text(REPORT_TITLE_LINE1 + "\n").setBold())
                .add(new Text(REPORT_TITLE_LINE2).setBold())
                .setFontSize(10f)
                .setTextAlignment(TextAlignment.CENTER)
                .setMultipliedLeading(1.1f)
                .setMarginTop(0f)
                .setMarginBottom(6f);
        document.add(title);

        Paragraph intro = new Paragraph()
                .setFontSize(BODY_FONT_SIZE)
                .setTextAlignment(TextAlignment.JUSTIFIED)
                .setMultipliedLeading(BODY_LEADING)
                .setMarginBottom(6f);
        intro.add(new Text(safe(ctx.companyName())).setBold());
        intro.add(", pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ");
        intro.add(new Text(safe(ctx.companyCnpj())).setBold());
        intro.add(", sediada na ");
        intro.add(new Text(safe(ctx.companyAddress())).setBold());
        intro.add(", estabelece por meio deste Termo as diretrizes para o uso correto, contínuo e responsável das câmeras corporais (Body Cam) por seus colaboradores durante a execução de suas atividades nas dependências do ");
        intro.add(new Text(safe(ctx.workLocation())).setBold());
        intro.add(".");
        document.add(intro);

        addSection(document, "1. DA UTILIZAÇÃO OBRIGATÓRIA",
                "1.1. Todos os colaboradores deverão utilizar a Body Cam durante todo o período de trabalho, sem exceções.",
                "1.2. O equipamento deverá permanecer ligado e gravando de forma contínua, do início ao fim do turno, garantindo a captação ininterrupta de áudio e imagem.",
                "1.3. A câmera somente poderá ser desligada ao término do turno ou mediante autorização expressa da gerência.");

        addSection(document, "2. DO POSICIONAMENTO E FUNCIONAMENTO",
                "2.1. A Body Cam deverá ser posicionada de forma visível e adequada, garantindo a captação frontal das ações do colaborador, sem obstruções.",
                "2.2. Antes do início do turno, o colaborador deverá assegurar que a bateria esteja carregada, o equipamento esteja funcionando e a gravação esteja ativada.");

        addSection(document, "3. DO ARMAZENAMENTO E CONFIDENCIALIDADE",
                "3.1. As gravações serão armazenadas de forma segura, conforme as diretrizes da empresa e do contratante.",
                "3.2. As imagens e áudios captados deverão ser tratados com absoluto sigilo e confidencialidade, respeitando a privacidade de clientes, lojistas, colaboradores e demais frequentadores do local.",
                "3.3. O acesso às gravações é restrito aos setores autorizados da empresa e/ou do contratante. É expressamente proibido ao colaborador copiar, reproduzir, compartilhar ou divulgar as gravações, bem como utilizá-las para fins pessoais.");

        addSection(document, "4. DA RESPONSABILIDADE PELO EQUIPAMENTO",
                "4.1. O colaborador é responsável pela integridade física da Body Cam durante seu turno de trabalho.",
                "4.2. Em caso de falha, dano, perda ou irregularidade, o colaborador deverá comunicar imediatamente a gerência ou supervisão.",
                "4.3. O uso inadequado ou negligente poderá ensejar medidas disciplinares previstas na legislação trabalhista e nas normas internas.");

        document.add(new Paragraph("5. DISPOSIÇÕES FINAIS")
                .setBold()
                .setFontSize(BODY_FONT_SIZE)
                .setMarginTop(3f)
                .setMarginBottom(2f));

        document.add(new Paragraph(
                "Declaro que recebi orientação sobre o uso da Body Cam, estou ciente da obrigatoriedade de sua utilização "
                        + "e concordo com todas as responsabilidades acima descritas quanto à guarda, operação e sigilo das gravações.")
                .setFontSize(BODY_FONT_SIZE)
                .setTextAlignment(TextAlignment.JUSTIFIED)
                .setMultipliedLeading(BODY_LEADING)
                .setMarginBottom(6f));

        addSignatures(document, ctx);
    }

    private void addSection(Document document, String sectionTitle, String... items) {
        document.add(new Paragraph(sectionTitle)
                .setBold()
                .setFontSize(BODY_FONT_SIZE)
                .setMarginTop(3f)
                .setMarginBottom(1f));

        for (String item : items) {
            document.add(new Paragraph(item)
                    .setFontSize(BODY_FONT_SIZE)
                    .setTextAlignment(TextAlignment.JUSTIFIED)
                    .setMultipliedLeading(BODY_LEADING)
                    .setMarginBottom(1f)
                    .setMarginLeft(6f));
        }
    }

    private void addSignatures(Document document, DocumentContext ctx) {
        String date = formatDateShort(ctx.documentDate());

        Paragraph dateLoc = new Paragraph(safe(ctx.city()) + ", " + date + ".")
                .setTextAlignment(TextAlignment.LEFT)
                .setMarginTop(6f)
                .setMarginBottom(12f)
                .setFontSize(BODY_FONT_SIZE);
        document.add(dateLoc);

        Table sigTable = new Table(UnitValue.createPercentArray(new float[] { 50f, 50f }))
                .useAllAvailableWidth()
                .setMarginTop(0f);

        sigTable.addCell(signatureCell(ctx.companyName(), ""));

        com.itextpdf.layout.element.Cell employeeCell = new com.itextpdf.layout.element.Cell()
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .setPadding(5f);
        employeeCell.add(new Paragraph("De Acordo:")
                .setTextAlignment(TextAlignment.CENTER)
                .setFontSize(9f)
                .setMarginBottom(6f));
        employeeCell.add(new Paragraph("________________________________________")
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(4f));
        employeeCell.add(new Paragraph(safe(ctx.employeeName()).toUpperCase())
                .setTextAlignment(TextAlignment.CENTER)
                .setFontSize(9f)
                .setBold());
        sigTable.addCell(employeeCell);

        document.add(sigTable);
    }

    private com.itextpdf.layout.element.Cell signatureCell(String name, String label) {
        com.itextpdf.layout.element.Cell cell = new com.itextpdf.layout.element.Cell()
                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                .setPadding(3f)
                .add(new Paragraph("________________________________________")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setMarginBottom(2f))
                .add(new Paragraph(safe(name).toUpperCase())
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(8f)
                        .setBold()
                        .setMarginBottom(0f));

        if (!isBlank(label)) {
            cell.add(new Paragraph(label)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(9f));
        }
        return cell;
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
            String companyName,
            String companyAddress,
            String companyCnpj,
            String employeeName,
            String workLocation,
            String city,
            LocalDate documentDate) {
    }
}
