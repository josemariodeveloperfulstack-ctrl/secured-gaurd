package com.z7design.secured_guard.service;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Div;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.LGPDConsentRequest;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import com.z7design.secured_guard.util.CompanyDataFormatter;
import com.z7design.secured_guard.util.EmployeeDocumentDateResolver;
import com.z7design.secured_guard.util.EmployeeDataFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LGPDConsentStandardPdfService {

        private final StandardReportLayoutService pdfLayoutService;
        private final ExcelReportLayoutService excelLayoutService;
        private final CompanyRepository companyRepository;
        private final EmployeeRepository employeeRepository;
        private final EmployeeDocumentDateResolver documentDateResolver;

        private static final String REPORT_TITLE = "";
        private static final String VARIANT_VIGILANCIA = "VIGILANCIA";
        /** Margem superior quando o título fica apenas no corpo (sem título fixo no cabeçalho do layout). */
        private static final float TERM_TOP_MARGIN_PT = 54f;
        private static final float VIG_TOP_MARGIN_PT = 68f;
        private static final float VIG_BOTTOM_MARGIN_PT = 48f;
        private static final float VIG_TARGET_FONT_PT = 12f;
        private static final float VIG_MIN_FONT_PT = 9f;
        private static final float VIG_FONT_STEP_PT = 0.5f;
        private static final float VIG_DEFAULT_LEADING = 1.06f;
        private static final float VIG_COMPACT_LEADING = 1.02f;
        private static final int VIG_MAX_FIT_ATTEMPTS = 8;
        /** ~20px: sobe data + assinaturas em relação ao rodapé. */
        private static final float VIG_SIGNATURES_LIFT_PT = 15f;

        private static final float DEF_TARGET_FONT_PT = 8.5f;
        private static final float DEF_MIN_FONT_PT = 7.0f;
        private static final float DEF_FONT_STEP_PT = 0.3f;
        private static final float DEF_DEFAULT_LEADING = 1.08f;
        private static final float DEF_COMPACT_LEADING = 1.02f;
        private static final float DEF_TOP_MARGIN_PT = 54f;
        private static final float DEF_BOTTOM_MARGIN_PT = 40f;
        private static final int DEF_MAX_FIT_ATTEMPTS = 10;

        private record VigilanciaPdfLayout(
                        float bodyFont,
                        float headerFont,
                        float leading,
                        float signaturesSpacer) {
                static VigilanciaPdfLayout of(float bodyFont, float leading, float signaturesSpacer) {
                        float headerFont = Math.max(bodyFont - 1f, 8f);
                        return new VigilanciaPdfLayout(bodyFont, headerFont, leading, signaturesSpacer);
                }
        }

        private record DefaultPdfLayout(
                        float bodyFont,
                        float leading,
                        float signaturesSpacer) {
        }

        public byte[] generatePdf(LGPDConsentRequest request) {
                enrichFromEmployee(request);
                LocalDate documentDate = documentDateResolver.resolveDocumentDateOrToday(
                                request.getEmployeeId(), request.getConsentDate());
                request.setConsentDate(documentDate);
                Company companyForLayout = request.getCompanyId() != null
                                ? companyRepository.findById(request.getCompanyId()).orElse(null)
                                : null;
                boolean vigilanciaLayout = isVigilanciaTerm(request, companyForLayout);
                try {
                        if (vigilanciaLayout) {
                                return generateVigilanciaPdfSinglePage(request, companyForLayout);
                        }
                        return generateDefaultPdfSinglePage(request, companyForLayout);
                } catch (Exception e) {
                        log.error("Erro ao gerar PDF do Termo LGPD", e);
                        throw new RuntimeException("Erro ao gerar PDF do Termo LGPD", e);
                }
        }

        private byte[] generateDefaultPdfSinglePage(LGPDConsentRequest request, Company company) throws IOException {
                float font = DEF_TARGET_FONT_PT;
                float leading = DEF_DEFAULT_LEADING;
                byte[] pdf = renderDefaultPdf(request, company, new DefaultPdfLayout(font, leading, 0f));
                int attempts = 1;

                while (countPages(pdf) > 1 && attempts < DEF_MAX_FIT_ATTEMPTS) {
                        if (leading > DEF_COMPACT_LEADING) {
                                leading = DEF_COMPACT_LEADING;
                        } else {
                                font = Math.max(DEF_MIN_FONT_PT, font - DEF_FONT_STEP_PT);
                        }
                        pdf = renderDefaultPdf(request, company, new DefaultPdfLayout(font, leading, 0f));
                        attempts++;
                }

                if (countPages(pdf) > 1) {
                        log.warn("Termo LGPD Padrão: usando layout mínimo (font={}pt, leading={})", DEF_MIN_FONT_PT,
                                        DEF_COMPACT_LEADING);
                        font = DEF_MIN_FONT_PT;
                        leading = DEF_COMPACT_LEADING;
                        pdf = renderDefaultPdf(request, company, new DefaultPdfLayout(font, leading, 0f));
                }

                float spacer = 0f;
                float maxSpacer = 40f;
                for (float trialSpacer = 0f; trialSpacer <= maxSpacer; trialSpacer += 6f) {
                        byte[] trial = renderDefaultPdf(request, company, new DefaultPdfLayout(font, leading, trialSpacer));
                        if (countPages(trial) > 1) {
                                break;
                        }
                        spacer = trialSpacer;
                        pdf = trial;
                }

                log.debug("Termo LGPD Padrão em 1 página: font={}pt, leading={}, spacer={}pt, tentativas={}",
                                font, leading, spacer, attempts);
                return pdf;
        }

        private byte[] renderDefaultPdf(LGPDConsentRequest request, Company companyForLayout,
                        DefaultPdfLayout defLayout) throws IOException {
                try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                        PdfWriter writer = new PdfWriter(outputStream);

                        var configBuilder = ReportLayoutConfig.builder()
                                        .companyId(request.getCompanyId())
                                        .reportTitle(null)
                                        .topMargin(DEF_TOP_MARGIN_PT)
                                        .bottomMargin(DEF_BOTTOM_MARGIN_PT)
                                        .leftMargin(40f)
                                        .rightMargin(40f)
                                        .includeEmailInFooter(true);
                        documentDateResolver.applyAdmissionDateFooter(configBuilder, request.getEmployeeId());
                        ReportLayoutConfig config = configBuilder.build();

                        DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
                        Document document = docWithPdf.getDocument();

                        addDefaultContent(document, request, docWithPdf.getCompany(), defLayout);

                        document.close();
                        return outputStream.toByteArray();
                }
        }

        private byte[] generateVigilanciaPdfSinglePage(LGPDConsentRequest request, Company company) throws IOException {
                float font = VIG_TARGET_FONT_PT;
                float leading = VIG_DEFAULT_LEADING;
                byte[] pdf = renderPdf(request, company, true, VigilanciaPdfLayout.of(font, leading, 0f));
                int attempts = 1;

                while (countPages(pdf) > 1 && attempts < VIG_MAX_FIT_ATTEMPTS) {
                        if (leading > VIG_COMPACT_LEADING) {
                                leading = VIG_COMPACT_LEADING;
                        } else {
                                font = Math.max(VIG_MIN_FONT_PT, font - VIG_FONT_STEP_PT);
                        }
                        pdf = renderPdf(request, company, true, VigilanciaPdfLayout.of(font, leading, 0f));
                        attempts++;
                }

                if (countPages(pdf) > 1) {
                        log.warn("Termo LGPD VIG: usando layout mínimo (font={}pt, leading={})", VIG_MIN_FONT_PT,
                                        VIG_COMPACT_LEADING);
                        font = VIG_MIN_FONT_PT;
                        leading = VIG_COMPACT_LEADING;
                        pdf = renderPdf(request, company, true, VigilanciaPdfLayout.of(font, leading, 0f));
                }

                float spacer = 0f;
                float maxSpacer = Math.max(0f, 48f - VIG_SIGNATURES_LIFT_PT);
                for (float trialSpacer = 0f; trialSpacer <= maxSpacer; trialSpacer += 8f) {
                        byte[] trial = renderPdf(request, company, true,
                                        VigilanciaPdfLayout.of(font, leading, trialSpacer));
                        if (countPages(trial) > 1) {
                                break;
                        }
                        spacer = trialSpacer;
                        pdf = trial;
                }

                log.debug("Termo LGPD VIG em 1 página: font={}pt, leading={}, spacer={}pt, tentativas={}",
                                font, leading, spacer, attempts);
                return pdf;
        }

        private byte[] renderPdf(LGPDConsentRequest request, Company companyForLayout, boolean vigilanciaLayout,
                        VigilanciaPdfLayout vigLayout) throws IOException {
                try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                        PdfWriter writer = new PdfWriter(outputStream);

                        var configBuilder = ReportLayoutConfig.builder()
                                        .companyId(request.getCompanyId())
                                        .reportTitle(null)
                                        .topMargin(vigilanciaLayout ? VIG_TOP_MARGIN_PT : TERM_TOP_MARGIN_PT)
                                        .includeEmailInFooter(true);
                        if (vigilanciaLayout) {
                                configBuilder
                                                .bottomMargin(VIG_BOTTOM_MARGIN_PT)
                                                .leftMargin(42f)
                                                .rightMargin(42f);
                        }
                        documentDateResolver.applyAdmissionDateFooter(configBuilder, request.getEmployeeId());
                        ReportLayoutConfig config = configBuilder.build();

                        DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
                        Document document = docWithPdf.getDocument();

                        addContent(document, request, docWithPdf.getCompany(), vigLayout);

                        document.close();
                        return outputStream.toByteArray();
                }
        }

        private int countPages(byte[] pdfBytes) throws IOException {
                try (PdfReader reader = new PdfReader(new ByteArrayInputStream(pdfBytes));
                                PdfDocument pdf = new PdfDocument(reader)) {
                        return pdf.getNumberOfPages();
                }
        }

        public byte[] generateExcel(LGPDConsentRequest request) {
                try (Workbook workbook = new XSSFWorkbook()) {
                        Sheet sheet = workbook.createSheet("Termo LGPD");
                        Company company = companyRepository.findById(request.getCompanyId())
                                        .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

                        int startRow = excelLayoutService.addHeader(sheet, workbook, company, REPORT_TITLE);

                        Row row = sheet.createRow(startRow);
                        row.createCell(0).setCellValue("Nome do Funcionário:");
                        row.createCell(1).setCellValue(request.getEmployeeName());

                        row = sheet.createRow(startRow + 1);
                        row.createCell(0).setCellValue("CPF:");
                        row.createCell(1).setCellValue(request.getEmployeeCpf());

                        if (!isVigilanciaTerm(request, company)) {
                                row = sheet.createRow(startRow + 2);
                                row.createCell(0).setCellValue("RG:");
                                row.createCell(1).setCellValue(request.getEmployeeRg());
                        }

                        row = sheet.createRow(startRow + 3);
                        row.createCell(0).setCellValue("Cargo:");
                        row.createCell(1).setCellValue(request.getEmployeePosition());

                        row = sheet.createRow(startRow + 5);
                        row.createCell(0).setCellValue(
                                        "Termo de proteção de dados e confidencialidade conforme LGPD.");

                        sheet.autoSizeColumn(0);
                        sheet.autoSizeColumn(1);

                        excelLayoutService.addFooter(sheet, workbook, company);

                        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                        workbook.write(outputStream);
                        return outputStream.toByteArray();
                } catch (Exception e) {
                        log.error("Erro ao gerar Excel do Termo LGPD", e);
                        throw new RuntimeException("Erro ao gerar Excel do Termo LGPD", e);
                }
        }

        private void enrichFromEmployee(LGPDConsentRequest request) {
                UUID employeeId = request.getEmployeeId();
                if (employeeId == null) {
                        return;
                }
                Optional<Employee> employeeOpt = employeeRepository.findWithOrgContextById(employeeId);
                if (employeeOpt.isEmpty()) {
                        return;
                }
                Employee employee = employeeOpt.get();

                if (request.getEmployeeName() == null || request.getEmployeeName().isBlank()) {
                        request.setEmployeeName(employee.getName());
                }
                if (request.getEmployeeCpf() == null || request.getEmployeeCpf().isBlank()) {
                        String cpf = employee.getCpf();
                        request.setEmployeeCpf(cpf != null && !cpf.isBlank() ? cpf : employee.getDocument());
                }
                if (request.getEmployeeRg() == null || request.getEmployeeRg().isBlank()) {
                        request.setEmployeeRg(employee.getRg());
                }
                if (request.getEmployeeFullAddress() == null || request.getEmployeeFullAddress().isBlank()) {
                        request.setEmployeeFullAddress(EmployeeDataFormatter.formatAddressForLgpdVig(employee));
                }
                if (employee.getHireDate() != null) {
                        request.setConsentDate(employee.getHireDate());
                }
                if (request.getCompanyId() == null && employee.getCompany() != null) {
                        request.setCompanyId(employee.getCompany().getId());
                }
        }

        private void addContent(Document document, LGPDConsentRequest request, Company company,
                        VigilanciaPdfLayout vigLayout) {
                boolean vigilancia = isVigilanciaTerm(request, company);
                String documentTitle = vigilancia
                                ? "TERMO DE PROTEÇÃO DE DADOS – LGPD"
                                : "TERMO DE CONSENTIMENTO LGPD";
                float vigBodyFont = vigLayout != null ? vigLayout.bodyFont() : VIG_TARGET_FONT_PT;

                document.add(new Paragraph(documentTitle)
                                .setBold()
                                .setFontSize(vigilancia ? vigBodyFont : 10.5f)
                                .setTextAlignment(TextAlignment.CENTER)
                                .setMarginTop(15f)
                                .setMarginBottom(vigilancia ? 4f : 4f));

                if (vigilancia) {
                        addVigilanciaIntro(document, request, company, vigLayout);
                        addClauses(document, true, vigLayout, null);
                } else {
                        addDefaultIntro(document, request, company, null);
                        addClauses(document, false, null, null);
                }

                addSignatures(document, request, company, vigLayout);
        }

        private void addDefaultContent(Document document, LGPDConsentRequest request, Company company,
                        DefaultPdfLayout defLayout) {
                float font = defLayout != null ? defLayout.bodyFont() : DEF_TARGET_FONT_PT;

                document.add(new Paragraph("TERMO DE CONSENTIMENTO LGPD")
                                .setBold()
                                .setFontSize(Math.max(font + 1.5f, 9.5f))
                                .setTextAlignment(TextAlignment.CENTER)
                                .setMarginTop(15f)
                                .setMarginBottom(4f));

                addDefaultIntro(document, request, company, defLayout);
                addClauses(document, false, null, defLayout);
                addDefaultSignatures(document, request, company, defLayout);
        }

        private boolean isVigilanciaTerm(LGPDConsentRequest request, Company company) {
                if (VARIANT_VIGILANCIA.equalsIgnoreCase(request.getTermVariant())) {
                        return true;
                }
                return company != null
                                && company.getSigla() != null
                                && "VIG".equalsIgnoreCase(company.getSigla().trim());
        }

        private void addVigilanciaIntro(Document document, LGPDConsentRequest request, Company company,
                        VigilanciaPdfLayout layout) {
                String employeeAddress = resolveEmployeeAddressForVig(request);

                Paragraph intro = new Paragraph()
                                .setFontSize(layout.bodyFont())
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(4f)
                                .setMultipliedLeading(layout.leading());

                intro.add(new Text(safeUpper(request.getEmployeeName())).setBold());
                intro.add(", inscrito no CPF sob o nº ");
                intro.add(new Text(
                                request.getEmployeeCpf() != null
                                                ? CompanyDataFormatter.formatCpf(request.getEmployeeCpf())
                                                : "________________")
                                .setBold());
                intro.add(", com endereço ");
                intro.add(new Text(
                                employeeAddress != null && !employeeAddress.isBlank()
                                                ? employeeAddress
                                                : "________________")
                                .setBold());
                intro.add(".\n");

                if (company != null) {
                        intro.add(new Text(safeUpper(company.getName())).setBold());
                        intro.add(", inscrita no CNPJ sob o nº ");
                        intro.add(new Text(
                                        company.getCnpj() != null
                                                        ? CompanyDataFormatter.formatCnpj(company.getCnpj())
                                                        : "________________")
                                        .setBold());
                        intro.add(", com sede na ");
                        intro.add(new Text(CompanyDataFormatter.formatAddressForLgpdVig(company)).setBold());
                        intro.add(".");
                }

                document.add(intro);
        }

        private String resolveEmployeeAddressForVig(LGPDConsentRequest request) {
                if (request.getEmployeeFullAddress() != null && !request.getEmployeeFullAddress().isBlank()) {
                        return request.getEmployeeFullAddress();
                }
                return EmployeeDataFormatter.formatAddressForLgpdVigFromRequest(
                                request.getEmployeeAddress(),
                                request.getEmployeeNumber(),
                                request.getEmployeeComplement(),
                                request.getEmployeeNeighborhood(),
                                request.getEmployeeCity(),
                                request.getEmployeeState(),
                                request.getEmployeeCep());
        }

        private void addDefaultIntro(Document document, LGPDConsentRequest request, Company company, DefaultPdfLayout defLayout) {
                float font = defLayout != null ? defLayout.bodyFont() : DEF_TARGET_FONT_PT;
                float leading = defLayout != null ? defLayout.leading() : DEF_DEFAULT_LEADING;

                Paragraph intro = new Paragraph()
                                .setFontSize(font)
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(4f)
                                .setMultipliedLeading(leading);

                intro.add(new Text(request.getEmployeeName().toUpperCase()).setBold());
                intro.add(", inscrito(a) no CPF nº ");
                intro.add(new Text(request.getEmployeeCpf() != null ? CompanyDataFormatter.formatCpf(request.getEmployeeCpf()) : "________________")
                                .setBold());
                intro.add(" e portador(a) do RG nº ");
                String rgFull = (request.getEmployeeRg() != null ? request.getEmployeeRg() : "________________")
                                + (request.getEmployeeRgOrgao() != null ? " " + request.getEmployeeRgOrgao() : "");
                intro.add(new Text(rgFull).setBold());
                intro.add(", com endereço na ");
                String address = (request.getEmployeeAddress() != null ? request.getEmployeeAddress()
                                : "________________")
                                + (request.getEmployeeNumber() != null ? ", " + request.getEmployeeNumber() : "")
                                + (request.getEmployeeComplement() != null ? ", " + request.getEmployeeComplement()
                                                : "")
                                + (request.getEmployeeNeighborhood() != null
                                                ? ", bairro " + request.getEmployeeNeighborhood()
                                                : "");
                intro.add(new Text(address).setBold());
                intro.add(", na cidade de ");
                intro.add(new Text(
                                request.getEmployeeCity() != null ? request.getEmployeeCity() : "________________")
                                .setBold());
                intro.add(", Estado de ");
                intro.add(new Text(request.getEmployeeState() != null ? request.getEmployeeState() : "____").setBold());
                intro.add(", doravante denominado ");
                intro.add(new Text("'COLABORADOR(A)'").setBold());
                intro.add(".\n");

                if (company != null) {
                        intro.add(new Text(company.getName().toUpperCase()).setBold());
                        intro.add(", inscrito no CNPJ sob o nº ");
                        intro.add(new Text(company.getCnpj() != null ? CompanyDataFormatter.formatCnpj(company.getCnpj()) : "________________")
                                        .setBold());
                        intro.add(", com sede na ");
                        String compAddr = (company.getAddress() != null ? company.getAddress() : "________________")
                                        + (company.getZipCode() != null ? ", CEP: " + company.getZipCode() : "")
                                        + (company.getEnderecoNumero() != null ? " nº " + company.getEnderecoNumero()
                                                        : "")
                                        + (company.getEnderecoBairro() != null
                                                        ? ", bairro " + company.getEnderecoBairro()
                                                        : "");
                        intro.add(new Text(compAddr).setBold());
                        intro.add(", na cidade de ");
                        intro.add(new Text(company.getCity() != null ? company.getCity() : "________________")
                                        .setBold());
                        intro.add(", Estado de ");
                        intro.add(new Text(company.getState() != null ? company.getState() : "____").setBold());
                        intro.add(", doravante denominado ");
                        intro.add(new Text("'EMPRESA'").setBold());
                        intro.add(".");
                } else {
                        intro.add("PROMOVER TERCEIRIZAÇÃO & SERVIÇOS LTDA, inscrito no CNPJ sob o nº 36.698.521/0001-01, doravante denominada 'EMPRESA'.");
                }
                document.add(intro);
        }

        private void addClauses(Document document, boolean vigilanciaStyle, VigilanciaPdfLayout vigLayout, DefaultPdfLayout defLayout) {
                addClause(document, vigilanciaStyle, vigLayout, defLayout, "CLÁUSULA PRIMEIRA – DO OBJETO",
                                "Em razão do exercício da minha função, reconheço o acesso a informações de propriedade da EMPRESA e de seus Clientes e me comprometo a:\n\n"
                                                +
                                                "a) manter sigilo absoluto, tanto escrito como verbal, de todos os dados, informações e materiais com que tiver contato no desempenho do trabalho para o qual fui contratado;\n"
                                                +
                                                "b) não revelar, reproduzir, utilizar ou dar conhecimento, em hipótese alguma, a terceiros, de dados, informações ou materiais revelados pela EMPRESA ou elaborados por mim ou com a minha participação;\n"
                                                +
                                                "c) não utilizar qualquer dado, informação ou material revelado pela EMPRESA ou elaborado por mim ou com a minha participação, em redes privadas ou sociais;\n"
                                                +
                                                "d) reconhecer que todos os materiais, sejam modelos de documentos, contratos, regulamentos, formulários etc, pertencem à EMPRESA, ainda que elaborados por mim ou com a minha participação.");

                addClause(document, vigilanciaStyle, vigLayout, defLayout, "CLÁUSULA SEGUNDA – DAS INFORMAÇÕES CONFIDENCIAIS",
                                "Para os fins deste Termo, serão consideradas confidenciais todas as informações transmitidas por meio escrito, eletrônico, verbal ou quaisquer outros e de qualquer natureza, incluindo, mas não se limitando a: cadastro de clientes, empresas prestadoras e tomadoras de serviços, informações de crédito, certidões e documentos pessoais, contratos e documentos de crédito e débito, softwares, mídias, planos de negócios, propostas comerciais, processos, tabelas, projetos, dentre outros.");

                float bodyFont = vigilanciaStyle ? (vigLayout != null ? vigLayout.bodyFont() : VIG_TARGET_FONT_PT)
                                : (defLayout != null ? defLayout.bodyFont() : DEF_TARGET_FONT_PT);
                float leading = vigilanciaStyle ? (vigLayout != null ? vigLayout.leading() : VIG_DEFAULT_LEADING)
                                : (defLayout != null ? defLayout.leading() : DEF_DEFAULT_LEADING);

                Paragraph parUnico = new Paragraph()
                                .setFontSize(bodyFont)
                                .setBold()
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMultipliedLeading(leading)
                                .setMarginBottom(2.5f);
                parUnico.add("PARÁGRAFO ÚNICO: ");
                parUnico.add(new Text(
                                "Em caso de dúvida sobre a confidencialidade do dado, informação ou documento, o COLABORADOR deverá mantê-lo em absoluto sigilo, até que a EMPRESA se manifeste expressamente a respeito.")
                                .setBold());
                document.add(parUnico);

                addClause(document, vigilanciaStyle, vigLayout, defLayout, "CLÁUSULA TERCEIRA – DO USO DAS INFORMAÇÕES CONFIDENCIAIS",
                                "O COLABORADOR(A) se compromete a utilizar as informações confidenciais apenas no âmbito da execução e desenvolvimento dos serviços e produtos de sua responsabilidade, sendo vedado o acesso e tratamento para fins estranhos à sua função.");

                addParagraph(document, vigilanciaStyle, vigLayout, defLayout, "PARÁGRAFO PRIMEIRO",
                                "O COLABORADOR(A) deverá dispensar às informações confidenciais da EMPRESA o mesmo zelo e cuidado com que trata os seus próprios dados pessoais, e deverá mantê-las em local seguro, com acesso limitado apenas a pessoas envolvidas ou autorizadas.");

                addParagraph(document, vigilanciaStyle, vigLayout, defLayout, "PARÁGRAFO SEGUNDO",
                                "Em caso de qualquer falha na segurança das informações confidenciais, o COLABORADOR(A) deverá comunicar imediatamente a EMPRESA. A pronta comunicação não exclui sua responsabilidade pela proteção dos dados sigilosos.");

                addClause(document, vigilanciaStyle, vigLayout, defLayout, "CLÁUSULA QUARTA – DAS EXCEÇÕES À CONFIDENCIALIDADE",
                                "Não serão consideradas confidenciais as informações que:\n\n"
                                                +
                                                "a) Sejam ou venham a se tornar públicas, desde que tal publicidade não tenha sido, de qualquer forma, ocasionada pelo(a) COLABORADOR(A);\n"
                                                +
                                                "b) Tenham sido legitimamente recebidas de terceiros, desde que não derivadas de violação de dever de confidencialidade;\n"
                                                +
                                                "c) Sejam expressas ou tacitamente identificadas pela EMPRESA como não sendo sigilosas.");

                addClause(document, vigilanciaStyle, vigLayout, defLayout, "CLÁUSULA QUINTA – DA QUEBRA DA CONFIDENCIALIDADE",
                                "A PARTE que violar as obrigações previstas neste Termo deverá indenizar e ressarcir a outra PARTE pelas perdas, lucros cessantes, danos diretos e indiretos, inclusive emergentes, e quaisquer prejuízos patrimoniais e/ou morais que surjam em decorrência deste descumprimento.");

                addParagraph(document, vigilanciaStyle, vigLayout, defLayout, "PARÁGRAFO PRIMEIRO",
                                "O descumprimento de quaisquer das cláusulas do presente termo importará em falha gravíssima ao contrato de prestação de serviços celebrado entre as PARTES e poderá acarretar a sua imediata rescisão, além da responsabilização administrativa, civil e criminal dos que, comprovadamente, estiverem envolvidos no descumprimento ou violação.");

                String vigenciaText = vigilanciaStyle
                                ? "O termo é válido enquanto houver vínculo entre as partes e se estenderá por um período de 5 (cinco) anos após o término do vínculo."
                                : "Mantido entre as PARTES, e se estenderá por um período de 5 (cinco) anos após o término do vínculo entre as PARTES.";
                addClause(document, vigilanciaStyle, vigLayout, defLayout, "CLÁUSULA SEXTA – DA VIGÊNCIA", vigenciaText);
        }

        private void addClause(Document document, boolean blackHeader, VigilanciaPdfLayout vigLayout, DefaultPdfLayout defLayout, String title,
                        String content) {
                String body = blackHeader ? compactVigilanciaClauseBody(content) : content;
                float bodyFont = blackHeader ? (vigLayout != null ? vigLayout.bodyFont() : VIG_TARGET_FONT_PT)
                                : (defLayout != null ? defLayout.bodyFont() : DEF_TARGET_FONT_PT);
                float bodyLeading = blackHeader ? (vigLayout != null ? vigLayout.leading() : VIG_DEFAULT_LEADING)
                                : (defLayout != null ? defLayout.leading() : DEF_DEFAULT_LEADING);
                float bodyMargin = blackHeader ? 2f : 2.5f;

                if (blackHeader) {
                        document.add(buildBlackClauseHeader(title, vigLayout));
                } else {
                        document.add(new Paragraph(title)
                                        .setBold()
                                        .setFontSize(Math.max(bodyFont + 0.5f, 8.5f))
                                        .setMarginTop(2f)
                                        .setMarginBottom(1f));
                }
                document.add(new Paragraph(body).setFontSize(bodyFont).setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(bodyMargin).setMultipliedLeading(bodyLeading));
        }

        private String compactVigilanciaClauseBody(String content) {
                return content.replace("\n\n", "\n");
        }

        private void addBlackClauseHeader(Document document, String title, VigilanciaPdfLayout layout) {
                document.add(buildBlackClauseHeader(title, layout));
        }

        private Table buildBlackClauseHeader(String title, VigilanciaPdfLayout layout) {
                float headerFont = layout != null ? layout.headerFont() : VIG_TARGET_FONT_PT;
                Table table = new Table(UnitValue.createPercentArray(1)).useAllAvailableWidth();
                table.addCell(new Cell()
                                .add(new Paragraph(title)
                                                .setBold()
                                                .setFontSize(headerFont)
                                                .setFontColor(ColorConstants.WHITE)
                                                .setMargin(0))
                                .setBackgroundColor(new DeviceRgb(0, 0, 0))
                                .setPadding(2)
                                .setBorder(Border.NO_BORDER));
                return table.setMarginTop(2f).setMarginBottom(1f);
        }

        private void addParagraph(Document document, boolean compact, VigilanciaPdfLayout vigLayout, DefaultPdfLayout defLayout, String title,
                        String content) {
                float fontSize = compact ? (vigLayout != null ? vigLayout.bodyFont() : VIG_TARGET_FONT_PT)
                                : (defLayout != null ? defLayout.bodyFont() : DEF_TARGET_FONT_PT);
                float leading = compact ? (vigLayout != null ? vigLayout.leading() : VIG_DEFAULT_LEADING)
                                : (defLayout != null ? defLayout.leading() : DEF_DEFAULT_LEADING);
                float margin = compact ? 2f : 2.5f;
                Paragraph p = new Paragraph().setFontSize(fontSize).setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(margin).setMultipliedLeading(leading);
                p.add(new Text(title + ": ").setBold());
                p.add(content);
                document.add(p);
        }

        private void addSignatures(Document document, LGPDConsentRequest request, Company company,
                        VigilanciaPdfLayout vigLayout) {
                String city = request.getCity() != null && !request.getCity().isEmpty() ? request.getCity()
                                : (company != null && company.getCity() != null ? company.getCity()
                                                : "Contagem");

                LocalDate dateObj = documentDateResolver.resolveDocumentDateOrToday(
                                request.getEmployeeId(), request.getDate());
                String dateStr = dateObj.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

                boolean vigilancia = isVigilanciaTerm(request, company);
                float vigBodyFont = vigLayout != null ? vigLayout.bodyFont() : VIG_TARGET_FONT_PT;
                if (vigilancia && vigLayout != null) {
                        float effectiveSpacer = Math.max(0f, vigLayout.signaturesSpacer() - VIG_SIGNATURES_LIFT_PT);
                        if (effectiveSpacer > 0f) {
                                document.add(new Div().setMinHeight(effectiveSpacer));
                        }
                }
                document.add(new Paragraph(city + ", " + dateStr)
                                .setTextAlignment(TextAlignment.LEFT)
                                .setMarginTop(vigilancia ? 0f : 10f)
                                .setMarginBottom(vigilancia ? 4f : 10f)
                                .setFontSize(vigilancia ? vigBodyFont : 8.5f));

                if (vigilancia) {
                        addVigilanciaSignatures(document, request, company, vigLayout);
                } else {
                        addDefaultSignatures(document, request, company, null);
                }
        }

        private void addDefaultSignatures(Document document, LGPDConsentRequest request, Company company,
                        DefaultPdfLayout defLayout) {
                String city = request.getCity() != null && !request.getCity().isEmpty() ? request.getCity()
                                : (company != null && company.getCity() != null ? company.getCity()
                                                : "Contagem");

                LocalDate dateObj = documentDateResolver.resolveDocumentDateOrToday(
                                request.getEmployeeId(), request.getDate());
                String dateStr = dateObj.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

                float font = defLayout != null ? defLayout.bodyFont() : DEF_TARGET_FONT_PT;

                if (defLayout != null && defLayout.signaturesSpacer() > 0f) {
                        document.add(new Div().setMinHeight(defLayout.signaturesSpacer()));
                }

                document.add(new Paragraph(city + ", " + dateStr)
                                .setTextAlignment(TextAlignment.LEFT)
                                .setMarginTop(4f)
                                .setMarginBottom(8f)
                                .setFontSize(font));

                Table table = new Table(UnitValue.createPercentArray(new float[] { 50f, 50f }))
                                .useAllAvailableWidth()
                                .setMarginTop(4f);

                Cell companyCell = new Cell().setBorder(Border.NO_BORDER).setPadding(1);
                companyCell.add(new Paragraph("________________________________________")
                                .setFontSize(font)
                                .setTextAlignment(TextAlignment.CENTER)
                                .setMarginBottom(2f));
                companyCell.add(new Paragraph(company != null ? safeUpper(company.getName()) : "EMPRESA")
                                .setFontSize(font)
                                .setBold()
                                .setTextAlignment(TextAlignment.CENTER));

                Cell employeeCell = new Cell().setBorder(Border.NO_BORDER).setPadding(1);
                employeeCell.add(new Paragraph("________________________________________")
                                .setFontSize(font)
                                .setTextAlignment(TextAlignment.CENTER)
                                .setMarginBottom(2f));
                employeeCell.add(new Paragraph(safeUpper(request.getEmployeeName()))
                                .setFontSize(font)
                                .setBold()
                                .setTextAlignment(TextAlignment.CENTER));

                table.addCell(companyCell);
                table.addCell(employeeCell);
                document.add(table);
        }

        private void addVigilanciaSignatures(Document document, LGPDConsentRequest request, Company company,
                        VigilanciaPdfLayout vigLayout) {
                float vigBodyFont = vigLayout != null ? vigLayout.bodyFont() : VIG_TARGET_FONT_PT;
                Table table = new Table(UnitValue.createPercentArray(new float[] { 50f, 50f }))
                                .useAllAvailableWidth()
                                .setMarginTop(0f);

                Cell companyCell = new Cell().setBorder(Border.NO_BORDER).setPadding(1);
                companyCell.add(new Paragraph("________________________________________")
                                .setFontSize(vigBodyFont)
                                .setTextAlignment(TextAlignment.CENTER)
                                .setMarginBottom(2f));
                companyCell.add(new Paragraph(company != null ? safeUpper(company.getName()) : "EMPRESA")
                                .setFontSize(vigBodyFont)
                                .setBold()
                                .setTextAlignment(TextAlignment.CENTER));

                Cell employeeCell = new Cell().setBorder(Border.NO_BORDER).setPadding(1);
                employeeCell.add(new Paragraph("________________________________________")
                                .setFontSize(vigBodyFont)
                                .setTextAlignment(TextAlignment.CENTER)
                                .setMarginBottom(2f));
                employeeCell.add(new Paragraph(safeUpper(request.getEmployeeName()))
                                .setFontSize(vigBodyFont)
                                .setBold()
                                .setTextAlignment(TextAlignment.CENTER));

                table.addCell(companyCell);
                table.addCell(employeeCell);
                document.add(table);
        }

        private String safeUpper(String value) {
                return value != null ? value.trim().toUpperCase() : "";
        }
}
