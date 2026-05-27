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
        private final ExperienceEmploymentContractTemplateLoader experienceTemplateLoader;

        private static final String REPORT_TITLE = "Contrato Individual de Trabalho";
        private static final String EXPERIENCE_TITLE = "CONTRATO DE TRABALHO A TÍTULO DE EXPERIÊNCIA";
        private static final String INDEFINITE_TITLE = "CONTRATO DE TRABALHO POR PRAZO INDETERMINADO";
        /** Margens do corpo do contrato em pontos (iText): 1 cm = 72/2,54 pt. */
        private static final float CONTRACT_LEFT_MARGIN_PT = cmToPt(3f);
        private static final float CONTRACT_RIGHT_MARGIN_PT = cmToPt(2f);

        private static float cmToPt(float cm) {
                return cm * 72f / 2.54f;
        }

        public byte[] generatePdf(EmploymentContractRequest request) {
                try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                        PdfWriter writer = new PdfWriter(outputStream);

                        String reportTitle = resolveReportTitle(request);

                        ReportLayoutConfig config = ReportLayoutConfig.builder()
                                        .companyId(request.getCompanyId())
                                        .reportTitle(reportTitle)
                                        .topMargin(100f)
                                        .bottomMargin(60f)
                                        .leftMargin(CONTRACT_LEFT_MARGIN_PT)
                                        .rightMargin(CONTRACT_RIGHT_MARGIN_PT)
                                        .includeEmailInFooter(true)
                                        .removeBoldFromFooterCompanyName(true)
                                        .useCalibriLightFooter(true)
                                        .footerCompanyNameFontSize(11f)
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
                // Espaço inicial para o conteúdo não ficar em cima da imagem do cabeçalho
                document.add(new Paragraph("").setMarginBottom(14f));

                if (isExperienceContract(request)) {
                        String raw = experienceTemplateLoader.loadRawTemplate();
                        String filled = fillExperiencePlaceholders(raw, request, company);
                        appendMultipagePlainText(document, filled, request, company);
                        return;
                }
                if (isIndefiniteContract(request)) {
                        String raw = experienceTemplateLoader.loadIndefiniteRawTemplate();
                        String filled = fillIndefinitePlaceholders(raw, request, company);
                        appendMultipagePlainText(document, filled, request, company);
                        return;
                }

                // Texto Introdutório (contrato padrão / resumido)
                Paragraph intro = new Paragraph("Têm entre si justo e contratado o seguinte:")
                                .setFontSize(10f)
                                .setMarginTop(10f)
                                .setMarginBottom(10f);
                document.add(intro);

                // Cláusulas (setor de trabalho não é exibido no contrato — alocação pode mudar de posto)
                SalaryContractText salaryText = resolveSalaryContractText(request);

                java.util.List<String> clause1Bolds = new java.util.ArrayList<>();
                if (request.getPosition() != null) {
                        clause1Bolds.add(request.getPosition().toUpperCase());
                }

                addClauseAsSection(document, "CLÁUSULA 1ª - DA FUNÇÃO",
                                "O EMPREGADO é contratado para exercer a função de "
                                                + request.getPosition().toUpperCase()
                                                + ", comprometendo-se a executá-la com zelo e dedicação, bem como outras tarefas compatíveis.",
                                clause1Bolds);

                addClauseAsSection(document, "CLÁUSULA 2ª - DA REMUNERAÇÃO",
                                "A EMPREGADORA pagará ao EMPREGADO a remuneração " + salaryText.tipoAdjetivo() + " de R$ "
                                                + formatMoney(request.getSalary())
                                                + " (" + convertToWords(request.getSalary()) + ")" +
                                                ", " + salaryText.periodicidade() +
                                                ", a ser efetuada até o 5º dia útil do mês subsequente ao vencido.");

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

        private static String resolveReportTitle(EmploymentContractRequest request) {
                if (isExperienceContract(request)) {
                        return EXPERIENCE_TITLE;
                }
                if (isIndefiniteContract(request)) {
                        return INDEFINITE_TITLE;
                }
                return REPORT_TITLE;
        }

        private static boolean isExperienceContract(EmploymentContractRequest request) {
                return request.getContractKind() != null
                                && "EXPERIENCE".equalsIgnoreCase(request.getContractKind().trim());
        }

        private static boolean isIndefiniteContract(EmploymentContractRequest request) {
                return request.getContractKind() != null
                                && "INDEFINITE".equalsIgnoreCase(request.getContractKind().trim());
        }

        /** Placeholders comuns aos templates longos (experiência e indeterminado). */
        private String applyCommonLongFormPlaceholders(String template, EmploymentContractRequest request,
                        Company company) {
                String salarioValor = "R$ " + formatMoney(request.getSalary());
                String salarioExtenso;
                if (request.getSalaryInWords() != null && !request.getSalaryInWords().isBlank()) {
                        salarioExtenso = request.getSalaryInWords().trim();
                } else if (request.getSalary() != null) {
                        salarioExtenso = convertToWords(request.getSalary());
                } else {
                        salarioExtenso = "(informe o valor por extenso no cadastro do funcionário — campo salário por extenso)";
                }
                // A data exibida em "CIDADE, DD/MM/AAAA" no fim do contrato deve refletir
                // a data de ADMISSÃO do funcionário (e não a data em que o PDF foi gerado).
                // Mantemos fallback para contractDate e, em último caso, LocalDate.now().
                LocalDate dataContrato;
                if (request.getAdmissionDate() != null) {
                        dataContrato = request.getAdmissionDate();
                } else if (request.getContractDate() != null) {
                        dataContrato = request.getContractDate();
                } else {
                        dataContrato = LocalDate.now();
                }
                String cidade = resolveSigningCity(company, request);
                String dataAssinatura = formatDate(dataContrato);
                String cidadeDataExtenso = (cidade.isEmpty() ? "_______________" : cidade.toUpperCase()) + ", "
                                + dataAssinatura + ".";

                String empregadorNome = company.getName() != null ? company.getName() : "";
                String funcao = request.getPosition() != null ? request.getPosition().trim().toUpperCase() : "";
                String ctpsCompleta = (request.getEmployeeCtps() != null ? request.getEmployeeCtps() : "")
                                + (request.getEmployeeCtpsSeries() != null && !request.getEmployeeCtpsSeries().isBlank()
                                                ? " série " + request.getEmployeeCtpsSeries()
                                                : "");

                SalaryContractText salaryText = resolveSalaryContractText(request);

                return template
                                .replace("{{EMPREGADOR_NOME}}", empregadorNome)
                                .replace("{{EMPREGADOR_ENDERECO}}", CompanyDataFormatter.formatFullAddress(company))
                                .replace("{{EMPREGADOR_CNPJ}}", CompanyDataFormatter.formatCnpj(company.getCnpj()))
                                .replace("{{EMPREGADO_NOME}}", nullToEmpty(request.getEmployeeName()))
                                .replace("{{EMPREGADO_RG}}", nullToEmpty(request.getEmployeeRg()))
                                .replace("{{EMPREGADO_CPF}}", CompanyDataFormatter.formatCpf(request.getEmployeeCpf()))
                                .replace("{{EMPREGADO_ENDERECO}}", nullToEmpty(request.getEmployeeAddress()))
                                .replace("{{EMPREGADO_NACIONALIDADE}}", nullToEmpty(request.getNationality()))
                                .replace("{{EMPREGADO_ESTADO_CIVIL}}", translateMaritalStatus(request.getMaritalStatus()))
                                .replace("{{EMPREGADO_CTPS}}", ctpsCompleta)
                                .replace("{{EMPREGADO_PIS}}", nullToEmpty(request.getPis()))
                                .replace("{{FUNCAO}}", funcao)
                                .replace("{{SETOR_ALOCACAO}}", "")
                                .replace("{{SALARIO_TIPO}}", salaryText.tipoSubstantivo())
                                .replace("{{SALARIO_PERIODICIDADE}}", salaryText.periodicidade())
                                .replace("{{SALARIO_VALOR}}", salarioValor)
                                .replace("{{SALARIO_EXTENSO}}", salarioExtenso)
                                .replace("{{CIDADE_DATA_EXTENSO}}", cidadeDataExtenso);
        }

        /**
         * Textos da remuneração conforme {@code tipoSalarioContratual} do cadastro (MENSAL, HORISTA, DIARISTA).
         */
        private static SalaryContractText resolveSalaryContractText(EmploymentContractRequest request) {
                String tipo = request.getTipoSalarioContratual();
                if (tipo != null) {
                        tipo = tipo.trim().toUpperCase(Locale.ROOT);
                }
                if ("HORISTA".equals(tipo)) {
                        return new SalaryContractText("horário", "horário", "por hora");
                }
                if ("DIARISTA".equals(tipo)) {
                        return new SalaryContractText("diário", "diário", "por dia");
                }
                // MENSAL ou não informado
                return new SalaryContractText("mensal", "mensal", "por mês");
        }

        private record SalaryContractText(String tipoSubstantivo, String tipoAdjetivo, String periodicidade) {
        }

        /**
         * Preenche placeholders do template de experiência (inclui dias de experiência,
         * datas de início/fim do período e data do termo).
         */
        private String fillExperiencePlaceholders(String template, EmploymentContractRequest request, Company company) {
                int dias = request.getExperienceDurationDays() != null ? request.getExperienceDurationDays() : 45;
                String diasExperienciaTexto = experienceDaysPhrase(dias);
                String cidade = resolveSigningCity(company, request);
                String cidadeDataTermo = (cidade.isEmpty() ? "_______________" : cidade.toUpperCase())
                                + ", ___/___/______.";

                // Datas de início e fim do período de experiência: usadas no cabeçalho
                // do contrato (".. vigorando a partir de DATA_INICIO até DATA_FIM ..").
                LocalDate inicio = request.getAdmissionDate();
                String dataInicioStr = inicio != null ? formatDate(inicio) : "__/__/____";
                String dataFimStr = inicio != null ? formatDate(inicio.plusDays(dias)) : "__/__/____";

                return applyCommonLongFormPlaceholders(template, request, company)
                                .replace("{{DIAS_EXPERIENCIA_TEXTO}}", diasExperienciaTexto)
                                .replace("{{DATA_INICIO}}", dataInicioStr)
                                .replace("{{DATA_FIM}}", dataFimStr)
                                .replace("{{CIDADE_DATA_TERMO}}", cidadeDataTermo);
        }

        /** Prazo indeterminado: data de início da prestação (cláusula 9). */
        private String fillIndefinitePlaceholders(String template, EmploymentContractRequest request, Company company) {
                String dataInicio = request.getAdmissionDate() != null
                                ? formatDate(request.getAdmissionDate())
                                : "__/__/____";
                return applyCommonLongFormPlaceholders(template, request, company)
                                .replace("{{DATA_INICIO}}", dataInicio);
        }

        private static String nullToEmpty(String s) {
                return s != null ? s : "";
        }

        /**
         * Local de assinatura dos contratos: cidade da empresa (cadastro), não rua nem endereço do payload.
         */
        private static String resolveSigningCity(Company company, EmploymentContractRequest request) {
                String fromCompany = CompanyDataFormatter.resolveContractSigningCity(company);
                if (!fromCompany.isBlank()) {
                        return fromCompany.trim();
                }
                if (request.getCity() != null && !request.getCity().isBlank()) {
                        return request.getCity().trim();
                }
                return "";
        }

        /**
         * Texto da cláusula 9 (ex.: "45 (QUARENTA E CINCO) dias").
         */
        private static String experienceDaysPhrase(int days) {
                return switch (days) {
                        case 30 -> "30 (TRINTA) dias";
                        case 60 -> "60 (SESSENTA) dias";
                        case 90 -> "90 (NOVENTA) dias";
                        default -> "45 (QUARENTA E CINCO) dias";
                };
        }

        /**
         * Quebra o texto em blocos (parágrafos) para o iText fluir em várias páginas com alinhamento justificado.
         * Detecta o marcador {{ASSINATURAS_DUAS_COLUNAS}} e renderiza assinaturas em duas colunas.
         * Destaca em negrito: nome da empresa, nome do funcionário e cargo.
         */
        private void appendMultipagePlainText(Document document, String text,
                        EmploymentContractRequest request, Company company) {
                String normalized = text.replace("\r\n", "\n");
                document.add(new Paragraph("").setMarginBottom(8f));

                // Termos que devem aparecer em negrito no corpo do contrato
                java.util.List<String> boldTerms = new java.util.ArrayList<>();
                if (company != null && company.getName() != null && !company.getName().isBlank()) {
                        boldTerms.add(company.getName());
                }
                if (request.getEmployeeName() != null && !request.getEmployeeName().isBlank()) {
                        boldTerms.add(request.getEmployeeName());
                }
                if (request.getPosition() != null && !request.getPosition().isBlank()) {
                        boldTerms.add(request.getPosition().trim().toUpperCase());
                }

                String[] blocks = normalized.split("\n\n+");
                for (String block : blocks) {
                        String b = block.trim();
                        if (b.isEmpty()) {
                                continue;
                        }
                        if (b.contains("{{ASSINATURAS_DUAS_COLUNAS}}")) {
                                addTwoColumnSignatures(document, request, company);
                                continue;
                        }
                        document.add(buildParagraphWithBoldTerms(b, boldTerms, 9f));
                }
        }

        /**
         * Constrói um Paragraph onde cada ocorrência dos termos indicados fica em negrito.
         */
        private Paragraph buildParagraphWithBoldTerms(String text, java.util.List<String> boldTerms, float fontSize) {
                if (boldTerms.isEmpty()) {
                        return new Paragraph(text)
                                        .setFontSize(fontSize)
                                        .setTextAlignment(TextAlignment.JUSTIFIED)
                                        .setMarginBottom(6f);
                }

                Paragraph p = new Paragraph()
                                .setFontSize(fontSize)
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(6f);

                // Percorre o texto procurando os termos para destacar
                String remaining = text;
                while (!remaining.isEmpty()) {
                        int earliestIdx = -1;
                        String matchedTerm = null;

                        for (String term : boldTerms) {
                                int idx = remaining.indexOf(term);
                                if (idx >= 0 && (earliestIdx < 0 || idx < earliestIdx)) {
                                        earliestIdx = idx;
                                        matchedTerm = term;
                                }
                        }

                        if (earliestIdx < 0) {
                                // Nenhum termo encontrado no restante — adiciona tudo como texto normal
                                p.add(new Text(remaining).setFontSize(fontSize));
                                break;
                        }

                        // Texto antes do termo
                        if (earliestIdx > 0) {
                                p.add(new Text(remaining.substring(0, earliestIdx)).setFontSize(fontSize));
                        }
                        // O termo em negrito
                        p.add(new Text(matchedTerm).setBold().setFontSize(fontSize));
                        remaining = remaining.substring(earliestIdx + matchedTerm.length());
                }

                return p;
        }

        private void addTwoColumnSignatures(Document document, EmploymentContractRequest request, Company company) {
                String line = "________________________________________";
                float fontSize = 8f;

                Table sigTable = new Table(UnitValue.createPercentArray(new float[] { 48, 4, 48 }))
                                .useAllAvailableWidth()
                                .setMarginTop(15f);

                // Linha 1: Empregador | espaço | Responsável Legal
                sigTable.addCell(new Cell()
                                .add(new Paragraph(line).setFontSize(fontSize).setMarginBottom(0f))
                                .add(new Paragraph(company != null ? company.getName() : "Empregador")
                                                .setFontSize(fontSize).setBold())
                                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                                .setPaddingBottom(12f));
                sigTable.addCell(new Cell()
                                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
                sigTable.addCell(new Cell()
                                .add(new Paragraph(line).setFontSize(fontSize).setMarginBottom(0f))
                                .add(new Paragraph("Responsável Legal (Caso menor de idade)")
                                                .setFontSize(fontSize))
                                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                                .setPaddingBottom(12f));

                // Linha 2: Empregado | espaço | Testemunha
                sigTable.addCell(new Cell()
                                .add(new Paragraph(line).setFontSize(fontSize).setMarginBottom(0f))
                                .add(new Paragraph(request.getEmployeeName() != null
                                                ? request.getEmployeeName().toUpperCase() : "Empregado")
                                                .setFontSize(fontSize).setBold())
                                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                                .setPaddingBottom(12f));
                sigTable.addCell(new Cell()
                                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
                sigTable.addCell(new Cell()
                                .add(new Paragraph(line).setFontSize(fontSize).setMarginBottom(0f))
                                .add(new Paragraph("Testemunha")
                                                .setFontSize(fontSize))
                                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER)
                                .setPaddingBottom(12f));

                // Linha 3: vazio | espaço | Testemunha
                sigTable.addCell(new Cell()
                                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
                sigTable.addCell(new Cell()
                                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));
                sigTable.addCell(new Cell()
                                .add(new Paragraph(line).setFontSize(fontSize).setMarginBottom(0f))
                                .add(new Paragraph("Testemunha")
                                                .setFontSize(fontSize))
                                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER));

                document.add(sigTable);
        }

        private void addClauseAsSection(Document document, String title, String content) {
                addClauseAsSection(document, title, content, java.util.Collections.emptyList());
        }

        private void addClauseAsSection(Document document, String title, String content, java.util.List<String> boldTerms) {
                document.add(new Paragraph(title).setBold().setFontSize(10f).setMarginTop(5f).setMarginBottom(2f));
                document.add(buildParagraphWithBoldTerms(content, boldTerms, 10f));
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
                String resolved = resolveSigningCity(company, request);
                String city = resolved.isEmpty() ? "_______________" : resolved;
                String date = formatDateExtended(
                                request.getContractDate() != null ? request.getContractDate() : LocalDate.now());

                Paragraph dateLoc = new Paragraph(city + ", " + date)
                                .setTextAlignment(TextAlignment.RIGHT)
                                .setMarginTop(12f)
                                .setMarginBottom(8f)
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

        private String translateMaritalStatus(String status) {
                if (status == null || status.trim().isEmpty())
                        return "";
                return switch (status.toUpperCase()) {
                        case "SINGLE", "SOLTEIRO", "SOLTEIRA" -> "Solteiro(a)";
                        case "MARRIED", "CASADO", "CASADA" -> "Casado(a)";
                        case "DIVORCED", "DIVORCIADO", "DIVORCIADA" -> "Divorciado(a)";
                        case "WIDOWED", "VIUVO", "VIUVA" -> "Viúvo(a)";
                        case "SEPARATED", "SEPARADO", "SEPARADA" -> "Separado(a)";
                        case "STABLE_UNION", "UNIAO_ESTAVEL" -> "União Estável";
                        default -> status;
                };
        }

        private static final String[] UNIDADES = {
                "", "Um", "Dois", "Três", "Quatro", "Cinco", "Seis", "Sete", "Oito", "Nove", "Dez",
                "Onze", "Doze", "Treze", "Quatorze", "Quinze", "Dezesseis", "Dezessete", "Dezoito", "Dezenove"
        };
        private static final String[] DEZENAS = {
                "", "", "Vinte", "Trinta", "Quarenta", "Cinquenta", "Sessenta", "Setenta", "Oitenta", "Noventa"
        };
        private static final String[] CENTENAS = {
                "", "Cento", "Duzentos", "Trezentos", "Quatrocentos", "Quinhentos", "Seiscentos", "Setecentos", "Oitocentos", "Novecentos"
        };

        public static String convertToWords(BigDecimal value) {
                if (value == null || value.compareTo(BigDecimal.ZERO) == 0) {
                        return "Zero Reais";
                }

                BigDecimal rounded = value.setScale(2, java.math.RoundingMode.HALF_UP);
                long totalCents = rounded.multiply(new BigDecimal(100)).longValue();
                long integerPart = totalCents / 100;
                int centsPart = (int) (totalCents % 100);

                StringBuilder sb = new StringBuilder();

                if (integerPart > 0) {
                        sb.append(integerPartToWords(integerPart));
                        sb.append(integerPart == 1 ? " Real" : " Reais");
                }

                if (centsPart > 0) {
                        if (integerPart > 0) {
                                sb.append(" e ");
                        }
                        sb.append(convertGroupToWords(centsPart));
                        sb.append(centsPart == 1 ? " Centavo" : " Centavos");
                }

                return sb.toString().trim();
        }

        private static String integerPartToWords(long number) {
                if (number == 0) return "";

                long milhoes = number / 1000000;
                long restoMilhoes = number % 1000000;

                long milhares = restoMilhoes / 1000;
                int unidades = (int) (restoMilhoes % 1000);

                StringBuilder sb = new StringBuilder();

                if (milhoes > 0) {
                        if (milhoes == 1) {
                                sb.append("Um Milhão");
                        } else {
                                sb.append(convertGroupToWords((int) milhoes)).append(" Milhões");
                        }
                }

                if (milhares > 0) {
                        if (sb.length() > 0) {
                                if (milhares < 100 || milhares % 100 == 0) {
                                        sb.append(" e ");
                                } else {
                                        sb.append(" ");
                                }
                        }
                        if (milhares == 1) {
                                sb.append("Hum Mil");
                        } else {
                                sb.append(convertGroupToWords((int) milhares)).append(" Mil");
                        }
                }

                if (unidades > 0) {
                        if (sb.length() > 0) {
                                if (unidades < 100 || unidades % 100 == 0) {
                                        sb.append(" e ");
                                } else {
                                        sb.append(" ");
                                }
                        }
                        sb.append(convertGroupToWords(unidades));
                }

                return sb.toString();
        }

        private static String convertGroupToWords(int number) {
                if (number == 0) return "";
                if (number < 20) return UNIDADES[number];
                if (number < 100) {
                        int dezena = number / 10;
                        int resto = number % 10;
                        return resto == 0 ? DEZENAS[dezena] : DEZENAS[dezena] + " e " + UNIDADES[resto];
                }
                if (number == 100) return "Cem";
                int centena = number / 100;
                int resto = number % 100;
                return resto == 0 ? CENTENAS[centena] : CENTENAS[centena] + " e " + convertGroupToWords(resto);
        }
}
