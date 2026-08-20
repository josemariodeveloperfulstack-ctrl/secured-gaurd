package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.List;
import com.itextpdf.layout.element.ListItem;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.z7design.secured_guard.dto.ImageVoiceNameAuthRequest;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import com.z7design.secured_guard.util.CompanyDataFormatter;
import com.z7design.secured_guard.util.EmployeeDataFormatter;
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
public class ImageVoiceNameAuthStandardPdfService {

    private static final String REPORT_TITLE = "TERMO DE AUTORIZAÇÃO PARA USO DE IMAGEM, VOZ E NOME";
    private static final float TERM_TOP_MARGIN_PT = 108f;
    private static final float BODY_FONT_SIZE = 9f;
    private static final float BODY_LEADING = 1.15f;

    private final StandardReportLayoutService pdfLayoutService;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeDocumentDateResolver documentDateResolver;

    public byte[] generatePdf(ImageVoiceNameAuthRequest request) {
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
            log.error("Erro ao gerar PDF do Termo de Uso de Imagem, Voz e Nome", e);
            throw new RuntimeException("Erro ao gerar PDF do Termo de Uso de Imagem, Voz e Nome", e);
        }
    }

    private DocumentContext buildDocumentContext(ImageVoiceNameAuthRequest request) {
        Employee employee = request.getEmployeeId() == null
                ? null
                : employeeRepository.findWithOrgContextById(request.getEmployeeId()).orElse(null);

        if (request.getEmployeeId() != null && employee == null) {
            log.warn("Funcionário não encontrado para termo de Imagem/Voz/Nome: {}", request.getEmployeeId());
        }

        applyEmployeeToRequest(request, employee);

        UUID companyId = request.getCompanyId();
        if (companyId == null && employee != null && employee.getCompany() != null) {
            companyId = employee.getCompany().getId();
            request.setCompanyId(companyId);
        }

        Company company = null;
        if (companyId != null) {
            company = companyRepository.findById(companyId).orElse(null);
        }
        if (company == null && employee != null) {
            company = employee.getCompany();
        }
        if (company == null) {
            company = companyRepository.findAll().stream().findFirst().orElse(null);
        }
        if (company != null) {
            companyId = company.getId();
            request.setCompanyId(companyId);
        }

        String employeeName = firstNonBlank(request.getEmployeeName(), employee != null ? employee.getName() : null, "____________________________________");
        String cpf = employee != null && employee.getCpf() != null ? formatCpf(employee.getCpf()) : "_______________________";
        String rg = employee != null && employee.getRg() != null && !employee.getRg().isBlank() ? employee.getRg() : (employee != null && employee.getRegistrationNumber() != null ? employee.getRegistrationNumber() : "_______________________");
        String formattedAddress = employee != null ? EmployeeDataFormatter.formatFullAddress(employee) : "";
        String address = firstNonBlank(formattedAddress, employee != null ? employee.getAddress() : null, "____________________________________________________________");

        String companyName = company != null ? firstNonBlank(company.getName(), "PROMOVER TERCEIRIZAÇÃO & SERVIÇOS LTDA") : "PROMOVER TERCEIRIZAÇÃO & SERVIÇOS LTDA";
        String companyShortName = company != null ? firstNonBlank(company.getSigla(), company.getName(), "Promover") : "Promover";
        String companyCnpj = CompanyDataFormatter.formatCnpj(company.getCnpj());

        String city = firstNonBlank(request.getCity(), resolveCityWithState(company), "Contagem, MG");
        LocalDate documentDate = documentDateResolver.resolveDocumentDateOrToday(
                request.getEmployeeId(), request.getDocumentDate());

        request.setEmployeeName(employeeName);
        request.setCity(city);
        request.setDocumentDate(documentDate);

        return new DocumentContext(
                companyId,
                employeeName,
                cpf,
                rg,
                address,
                companyName,
                companyShortName,
                companyCnpj,
                city,
                documentDate
        );
    }

    private void applyEmployeeToRequest(ImageVoiceNameAuthRequest request, Employee employee) {
        if (employee == null) return;
        if (request.getCompanyId() == null && employee.getCompany() != null) {
            request.setCompanyId(employee.getCompany().getId());
        }
        if (blank(request.getEmployeeName())) {
            request.setEmployeeName(employee.getName());
        }
    }

    private void addContent(Document document, DocumentContext ctx) {
        // Título centralizado em negrito
        Paragraph title = new Paragraph(REPORT_TITLE)
                .setFontSize(11f)
                .setBold()
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(14f);
        document.add(title);

        // Preâmbulo
        Paragraph preambulo = new Paragraph()
                .setFontSize(BODY_FONT_SIZE)
                .setMultipliedLeading(BODY_LEADING)
                .setTextAlignment(TextAlignment.JUSTIFIED)
                .setMarginBottom(12f);
        preambulo.add(new Text("Pelo presente instrumento, eu, "));
        preambulo.add(new Text(ctx.employeeName()).setBold());
        preambulo.add(new Text(", inscrito(a) no CPF sob nº "));
        preambulo.add(new Text(ctx.cpf()).setBold());
        preambulo.add(new Text(", portador(a) do RG nº "));
        preambulo.add(new Text(ctx.rg()).setBold());
        preambulo.add(new Text(", residente e domiciliado(a) à "));
        preambulo.add(new Text(ctx.address()).setBold());
        preambulo.add(new Text(", doravante denominado(a) "));
        preambulo.add(new Text("AUTORIZANTE").setBold());
        preambulo.add(new Text(", autorizo, de forma livre, informada e gratuita, a empresa "));
        preambulo.add(new Text(ctx.companyName() + ", inscrita no CNPJ sob nº " + ctx.companyCnpj()).setBold());
        preambulo.add(new Text(", doravante denominada "));
        preambulo.add(new Text("AUTORIZADA").setBold());
        preambulo.add(new Text(", a utilizar minha imagem, voz, nome e demais registros audiovisuais realizados com minha participação, nos termos deste documento."));
        document.add(preambulo);

        // 1. DA AUTORIZAÇÃO
        addSectionHeader(document, "1. DA AUTORIZAÇÃO");
        addParagraph(document, "Autorizo a " + ctx.companyShortName() + " a captar, registrar, reproduzir, editar, adaptar, publicar e divulgar minha imagem, voz e nome, por meio de fotografias, vídeos, gravações, entrevistas, depoimentos, eventos, demonstrações de produtos e demais conteúdos produzidos pela empresa.", true, "imagem, voz e nome");
        addParagraph(document, "A autorização compreende a utilização dos conteúdos para fins institucionais, comerciais, publicitários e de divulgação da marca, produtos e serviços da " + ctx.companyShortName() + ".", true, "institucionais, comerciais, publicitários e de divulgação da marca, produtos e serviços da " + ctx.companyShortName());

        // 2. DOS MEIOS DE DIVULGAÇÃO
        addSectionHeader(document, "2. DOS MEIOS DE DIVULGAÇÃO");
        addParagraph(document, "Os materiais poderão ser utilizados, entre outros, nos seguintes canais e formatos:", false, null);

        List list = new List().setSymbolIndent(12f).setListSymbol("- ").setFontSize(BODY_FONT_SIZE).setMarginBottom(10f);
        list.add(new ListItem("Site e páginas oficiais da " + ctx.companyShortName() + ";"));
        list.add(new ListItem("Instagram, Facebook, LinkedIn, YouTube, TikTok e demais redes sociais oficiais;"));
        list.add(new ListItem("Anúncios e campanhas de mídia paga;"));
        list.add(new ListItem("Materiais gráficos e digitais;"));
        list.add(new ListItem("Catálogos, apresentações e materiais comerciais;"));
        list.add(new ListItem("E-mail marketing e demais canais de comunicação da empresa;"));
        list.add(new ListItem("Feiras, eventos, palestras e apresentações institucionais;"));
        list.add(new ListItem("Vídeos institucionais e comerciais;"));
        list.add(new ListItem("Materiais de divulgação de produtos e serviços;"));
        list.add(new ListItem("Materiais destinados à imprensa ou divulgação institucional da empresa."));
        document.add(list);

        // 3. DA EDIÇÃO E ADAPTAÇÃO
        addSectionHeader(document, "3. DA EDIÇÃO E ADAPTAÇÃO");
        addParagraph(document, "A " + ctx.companyShortName() + " fica autorizada a realizar cortes, ajustes de duração, edição de áudio e vídeo, adequação de formato, inserção de textos, logotipos, trilhas sonoras e outros elementos gráficos necessários à utilização do material.", false, null);
        addParagraph(document, "A edição deverá preservar o contexto e a finalidade original do conteúdo, não podendo ser utilizada de maneira que prejudique a honra, a reputação ou a dignidade do(a) AUTORIZANTE.", false, null);

        // 4. DA GRATUIDADE
        addSectionHeader(document, "4. DA GRATUIDADE");
        addParagraph(document, "A presente autorização é concedida de forma gratuita, não sendo devido ao(à) AUTORIZANTE qualquer pagamento, remuneração, indenização ou participação financeira pela utilização da imagem, voz ou nome nos termos deste documento.", true, "gratuita");

        // 5. DO PRAZO E ABRANGÊNCIA
        addSectionHeader(document, "5. DO PRAZO E ABRANGÊNCIA");
        addParagraph(document, "A presente autorização é concedida para utilização dos materiais em território nacional e internacional, inclusive por meio da internet e redes sociais, por prazo indeterminado, a partir da data de assinatura deste termo.", true, "nacional e internacional");
        addParagraph(document, "Os conteúdos publicados durante o período de autorização poderão permanecer disponíveis nos canais da " + ctx.companyShortName() + ", observadas as limitações técnicas e operacionais de cada plataforma.", false, null);

        // 6. DA PROTEÇÃO DE DADOS PESSOAIS
        addSectionHeader(document, "6. DA PROTEÇÃO DE DADOS PESSOAIS");
        addParagraph(document, "O(A) AUTORIZANTE declara estar ciente de que seus dados pessoais constantes neste documento poderão ser tratados pela " + ctx.companyShortName() + " exclusivamente para fins de identificação, registro e comprovação da presente autorização, observada a legislação aplicável de proteção de dados pessoais.", false, null);
        addParagraph(document, "O(A) AUTORIZANTE poderá exercer os direitos previstos na legislação aplicável, inclusive solicitar informações sobre o tratamento de seus dados e, quando cabível, revogar o consentimento mediante solicitação expressa.", false, null);

        // 7. DA REVOGAÇÃO
        addSectionHeader(document, "7. DA REVOGAÇÃO");
        addParagraph(document, "O(A) AUTORIZANTE poderá solicitar a revogação desta autorização mediante comunicação expressa à " + ctx.companyShortName() + ".", false, null);
        addParagraph(document, "A revogação produzirá efeitos para utilizações futuras, não implicando, automaticamente, na obrigação de retirada de materiais que tenham sido anteriormente produzidos, publicados ou distribuídos, especialmente quando houver limitações técnicas, operacionais ou legais para sua remoção.", false, null);

        // 8. DA RESPONSABILIDADE
        addSectionHeader(document, "8. DA RESPONSABILIDADE");
        addParagraph(document, "O(A) AUTORIZANTE declara que possui plena capacidade para conceder a presente autorização e que as informações fornecidas neste documento são verdadeiras.", false, null);
        addParagraph(document, "A " + ctx.companyShortName() + " compromete-se a utilizar os materiais exclusivamente para as finalidades previstas neste termo.", false, null);

        // 9. DA CIÊNCIA E CONCORDÂNCIA
        addSectionHeader(document, "9. DA CIÊNCIA E CONCORDÂNCIA");
        Paragraph ciencia = new Paragraph()
                .setFontSize(BODY_FONT_SIZE)
                .setMultipliedLeading(BODY_LEADING)
                .setTextAlignment(TextAlignment.JUSTIFIED)
                .setMarginBottom(10f);
        ciencia.add(new Text("Declaro que li integralmente este Termo de Autorização, compreendi sua finalidade e condições e, de forma livre e consciente, "));
        ciencia.add(new Text("AUTORIZO").setBold());
        ciencia.add(new Text(" a " + ctx.companyShortName() + " a utilizar minha imagem, voz e nome nos termos aqui estabelecidos."));
        document.add(ciencia);

        addParagraph(document, "Por estar de acordo, firmo o presente documento.", false, null);

        // Data de Assinatura
        String dataExtenso = formatDataExtenso(ctx.documentDate());
        Paragraph dataParagraph = new Paragraph(ctx.city() + ", " + dataExtenso + ".")
                .setFontSize(BODY_FONT_SIZE)
                .setMarginTop(12f)
                .setMarginBottom(20f);
        document.add(dataParagraph);

        // Bloco de Assinatura do Autorizante
        Paragraph autorizanteTitle = new Paragraph("AUTORIZANTE")
                .setFontSize(BODY_FONT_SIZE)
                .setBold()
                .setMarginBottom(6f);
        document.add(autorizanteTitle);

        Paragraph nomeLine = new Paragraph("Nome: " + ctx.employeeName())
                .setFontSize(BODY_FONT_SIZE)
                .setMarginBottom(4f);
        document.add(nomeLine);

        Paragraph cpfLine = new Paragraph("CPF: " + ctx.cpf())
                .setFontSize(BODY_FONT_SIZE)
                .setMarginBottom(12f);
        document.add(cpfLine);

        Paragraph assLine = new Paragraph("Assinatura: ____________________________________________________")
                .setFontSize(BODY_FONT_SIZE)
                .setMarginBottom(10f);
        document.add(assLine);
    }

    private void addSectionHeader(Document document, String title) {
        Paragraph p = new Paragraph(title)
                .setFontSize(BODY_FONT_SIZE + 0.5f)
                .setBold()
                .setMarginTop(8f)
                .setMarginBottom(4f);
        document.add(p);
    }

    private void addParagraph(Document document, String fullText, boolean hasBoldPart, String boldSubstring) {
        Paragraph p = new Paragraph()
                .setFontSize(BODY_FONT_SIZE)
                .setMultipliedLeading(BODY_LEADING)
                .setTextAlignment(TextAlignment.JUSTIFIED)
                .setMarginBottom(6f);

        if (hasBoldPart && boldSubstring != null && fullText.contains(boldSubstring)) {
            int idx = fullText.indexOf(boldSubstring);
            String before = fullText.substring(0, idx);
            String after = fullText.substring(idx + boldSubstring.length());
            p.add(new Text(before));
            p.add(new Text(boldSubstring).setBold());
            p.add(new Text(after));
        } else {
            p.add(new Text(fullText));
        }

        document.add(p);
    }

    private static String formatCpf(String cpfRaw) {
        if (cpfRaw == null) return "_______________________";
        String digits = cpfRaw.replaceAll("\\D", "");
        if (digits.length() == 11) {
            return String.format("%s.%s.%s-%s",
                    digits.substring(0, 3),
                    digits.substring(3, 6),
                    digits.substring(6, 9),
                    digits.substring(9, 11));
        }
        return cpfRaw;
    }

    private static String formatDataExtenso(LocalDate date) {
        if (date == null) date = LocalDate.now();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy", new Locale("pt", "BR"));
        return date.format(fmt);
    }

    private static String resolveCityWithState(Company company) {
        if (company == null) return "Contagem, MG";
        String city = company.getCity();
        String state = company.getState();
        if (city != null && !city.isBlank() && state != null && !state.isBlank()) {
            return city.trim() + ", " + state.trim();
        }
        if (city != null && !city.isBlank()) return city.trim();
        return "Contagem, MG";
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v.trim();
        }
        return "";
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private record DocumentContext(
            UUID companyId,
            String employeeName,
            String cpf,
            String rg,
            String address,
            String companyName,
            String companyShortName,
            String companyCnpj,
            String city,
            LocalDate documentDate
    ) {}
}
